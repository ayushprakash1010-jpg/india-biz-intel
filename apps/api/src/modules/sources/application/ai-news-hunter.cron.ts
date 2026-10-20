import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { LlmService } from '../../llm/llm.service';
import { DeduplicationEngine } from './deduplication.engine';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { QUEUES } from '../../../infrastructure/queue/queue.constants';
import * as Parser from 'rss-parser';
import * as cheerio from 'cheerio';
import { z } from 'zod';

const ARTICLE_TOPICS = [
  'FUNDING',
  'LEADERSHIP_CHANGE',
  'ENTRY_IN_INDIA',
  'EXPANSION',
  'MERGERS_AND_ACQUISITION',
  'GCC_SETUP',
  'INDUSTRY_OUTLOOK',
] as const;

const hunterResultSchema = z.object({
  articles: z
    .array(
      z.object({
        url: z.string().describe('The URL of the article'),
        title: z.string().describe('The title of the article'),
        summary: z
          .string()
          .describe(
            'A detailed 2-3 paragraph summary explaining the announcement, company name, deal amount or headcount, people involved, geography, and why it is significant to India business professionals and investors',
          ),
        author: z
          .string()
          .optional()
          .describe('The author if available, or publisher name'),
        topic: z
          .enum(ARTICLE_TOPICS)
          .describe(
            'Classify the article into exactly one topic: FUNDING (investment rounds, VC/PE deals), LEADERSHIP_CHANGE (CEO/CXO/MD appointments or exits), ENTRY_IN_INDIA (global company entering India market for first time), EXPANSION (company expanding existing India operations), MERGERS_AND_ACQUISITION (M&A deals, buyouts, acquisitions), GCC_SETUP (Global Capability Center setup or restructuring in India), INDUSTRY_OUTLOOK (research reports, macro analysis from BCG/Bain/Kearney/NASSCOM)',
          ),
      }),
    )
    .describe(
      'List of the most highly relevant articles extracted from the search results',
    ),
});

@Injectable()
export class AiNewsHunterCron {
  private readonly logger = new Logger(AiNewsHunterCron.name);
  private readonly rssParser = new Parser();
  private lastPollinationsTime = 0;

  // 7 high-signal Google News RSS queries — one per topic — upgraded for specificity
  // Each query is tuned to return named-company, named-deal articles rather than generic headlines
  private readonly targetTopics = [
    // 1. FUNDING — named rounds with investor/amount signals
    'India startup "Series A" OR "Series B" OR "Series C" OR "raised funding" OR "seed round" crore million 2026',

    // 2. LEADERSHIP_CHANGE — C-suite titles, named companies
    '"appointed as CEO" OR "new CEO" OR "MD appointed" OR "CXO joins" OR "Director appointed" India company 2026',

    // 3. ENTRY_IN_INDIA — global companies entering for first time
    '"enters India" OR "launches in India" OR "India entry" OR "sets up India office" OR "forays into India" global company 2026',

    // 4. EXPANSION — concrete geography or headcount expansion
    'India company "opens office" OR "new facility" OR "expands operations" OR "adds headcount" OR "new plant" 2026',

    // 5. MERGERS_AND_ACQUISITION — named deal signals with India focus
    'India company "acquires" OR "merger" OR "acquisition" OR "buyout" OR "stake purchase" crore million deal 2026',

    // 6. GCC_SETUP — Global Capability Center specific
    '"Global Capability Center" OR "GCC" India "sets up" OR "announces" OR "opens" OR "expands" multinational 2026',

    // 7. INDUSTRY_OUTLOOK — research firms only (Gemini prompt caps at 1 per run)
    'BCG OR Bain OR Kearney OR NASSCOM OR Zinnov India report outlook 2026',
  ];
  // Daily per-topic ingestion quota — prevents any single topic from dominating the DB.
  // INDUSTRY_OUTLOOK is capped at 1 to stop it inflating to 24%+ of all articles.
  private readonly topicQuota: Record<string, number> = {
    FUNDING: 3,
    LEADERSHIP_CHANGE: 3,
    ENTRY_IN_INDIA: 3,
    EXPANSION: 2,
    MERGERS_AND_ACQUISITION: 3,
    GCC_SETUP: 3,
    INDUSTRY_OUTLOOK: 1,
  };

  // Runtime counter — reset each hunter run
  private topicCount: Record<string, number> = {};

  constructor(
    private readonly prisma: PrismaService,
    private readonly llmService: LlmService,
    private readonly deduplicationEngine: DeduplicationEngine,
    @InjectQueue(QUEUES.ANALYSIS) private readonly analysisQueue: Queue,
  ) {}

  // Run every day at 8:00 AM IST
  @Cron('0 8 * * *', { timeZone: 'Asia/Kolkata' })
  async runNewsHunter(): Promise<void> {
    this.logger.log('Starting India BizIntel News Hunter...');
    // Reset per-topic counters for this run
    this.topicCount = {};

    // 1. Ensure we have an "India BizIntel Hunter" source in the DB
    let source = await this.prisma.source.findFirst({
      where: { name: 'India BizIntel Hunter' },
    });

    if (!source) {
      source = await this.prisma.source.create({
        data: {
          name: 'India BizIntel Hunter',
          type: 'RSS',
          url: 'https://news.google.com',
          status: 'ACTIVE',
          category: 'NEWS',
        },
      });
    }

    // 2. Loop through our target topics
    for (const topic of this.targetTopics) {
      this.logger.log(`Hunting for news on topic: ${topic}`);

      try {
        // Query Google News RSS
        const query = encodeURIComponent(topic);
        const rssUrl = `https://news.google.com/rss/search?q=${query}&hl=en-IN&gl=IN&ceid=IN:en`;

        const feed = await this.rssParser.parseURL(rssUrl);

        if (!feed.items || feed.items.length === 0) {
          this.logger.log(`No results found for topic: ${topic}`);
          continue;
        }

        // 3. Pre-fetch recent articles from DB (past 7 days) to filter out duplicates in memory
        const recentDate = new Date();
        recentDate.setDate(recentDate.getDate() - 7);
        const recentArticles = await this.prisma.article.findMany({
          where: { discoveredAt: { gte: recentDate } },
          select: { externalUrl: true, title: true, contentHash: true },
        });

        const existingUrls = new Set(
          recentArticles.map((a) => a.externalUrl).filter(Boolean),
        );
        const existingHashes = new Set(
          recentArticles.map((a) => a.contentHash).filter(Boolean),
        );
        const recentTitles = recentArticles.map((a) => a.title).filter(Boolean);

        // Pre-filter feed items so Gemini only sees fresh, unseen articles!
        const freshCandidates: Array<{
          title: string;
          url: string;
          date?: string;
          snippet?: string;
        }> = [];

        for (const item of feed.items) {
          if (!item.title || !item.link) continue;

          // Check direct URL duplicate
          if (existingUrls.has(item.link)) {
            this.logger.debug(
              `Pre-filter skipping existing URL: ${item.title}`,
            );
            continue;
          }

          // Check content hash
          const hash = this.deduplicationEngine.generateHash(
            item.link,
            item.title,
          );
          if (existingHashes.has(hash)) {
            this.logger.debug(
              `Pre-filter skipping duplicate hash: ${item.title}`,
            );
            continue;
          }

          // Check syntactic similarity against recent article titles
          const isSyntacticDup = recentTitles.some((existingTitle) => {
            const similarity = this.calculateSimilarity(
              item.title!,
              existingTitle,
            );
            return similarity >= 0.75;
          });

          if (isSyntacticDup) {
            this.logger.debug(
              `Pre-filter skipping syntactic duplicate: ${item.title}`,
            );
            continue;
          }

          freshCandidates.push({
            title: item.title,
            url: item.link,
            date: item.pubDate,
            snippet: item.contentSnippet || item.content,
          });

          if (freshCandidates.length >= 15) {
            break;
          }
        }

        if (freshCandidates.length === 0) {
          this.logger.log(
            `All ${feed.items.length} articles for topic "${topic}" were already ingested in recent runs.`,
          );
          continue;
        }

        this.logger.log(
          `Found ${freshCandidates.length} fresh, unseen candidate articles for topic: ${topic}`,
        );

        // 4. Ask Gemini to filter and select the top 2-3 from fresh candidates
        const prompt = `
          You are an expert content analyst for India BizIntel - a platform covering
          key corporate events in India: Funding, Leadership Changes, Market Entry,
          Business Expansion, Mergers & Acquisitions, and GCC (Global Capability Center) Setups.

          AUDIENCE: India-focused business professionals, investors, consultants, and strategists
          who read MoneyControl, Economic Times, and Business Standard.

          I searched Google News for "${topic}" and found these FRESH, UNSEEN articles:

          ${JSON.stringify(freshCandidates, null, 2)}

          YOUR TASK - be a strict editorial filter:

          PRIORITY 1 - MUST SELECT if present (high-value corporate event stories):
          - Funding: Named company raising a funding round with deal size or investor name mentioned
          - Leadership Change: Named executive (CEO, CXO, MD, Director) appointed or departing from a named Indian or India-operating company
          - Entry in India: A global company officially launching or entering the Indian market for the first time
          - Expansion: A company expanding India operations - new city, new office, significant headcount addition, new plant or facility
          - M&A: A named merger, acquisition, buyout, or stake purchase involving an Indian company or an India-operating entity
          - GCC Setup: A multinational company setting up or significantly expanding a Global Capability Center in India

          PRIORITY 2 - MAY SELECT a maximum of 1 per run (secondary content):
          - Industry outlook: Research or analysis reports from BCG, Bain, Kearney, McKinsey, NASSCOM, Zinnov, JLL, or CBRE with clear India business relevance

          HARD DISCARD - never select these:
          - Generic global AI product releases with no India corporate action
          - General stock market, mutual fund, or retail investment news (no named deal)
          - Celebrity, sports, lifestyle, or political content
          - Articles without a named company, person, or deal amount
          - Pure opinion pieces with no factual corporate announcement

          Select 2 (up to 3 if multiple high-impact stories exist) articles total.
          If fewer than 2 articles meet the criteria, return only the qualifying ones. Do NOT force-select off-topic articles.
          For each selected article:
          1. Write a detailed 2 to 3 paragraph summary covering: the core announcement, company name, deal amount or headcount, people involved, geography, and why it matters to India business professionals.
          2. Classify it into exactly one topic from: FUNDING, LEADERSHIP_CHANGE, ENTRY_IN_INDIA, EXPANSION, MERGERS_AND_ACQUISITION, GCC_SETUP, INDUSTRY_OUTLOOK.
        `;

        const result = await this.llmService.generateStructured(
          prompt,
          hunterResultSchema,
          {
            model: 'gemini-3.8-flash', // gemini-3.8-flash with automatic gemini-3.5-flash-lite fallback on 503
            temperature: 0.2,
          },
        );

        // Safety check: if Gemini returned an empty list (e.g. rate-limit mock),
        // treat it as a retriable error instead of silently producing zero articles.
        if (!result.articles || result.articles.length === 0) {
          this.logger.warn(
            `Gemini returned 0 articles for topic "${topic}" - skipping topic (possible rate limit or no relevant results).`,
          );
          continue;
        }

        // 4. Save the selected articles into the database
        for (const extractedArticle of result.articles) {
          try {
            // Check deduplication
            const hash = this.deduplicationEngine.generateHash(
              extractedArticle.url,
              extractedArticle.title,
              extractedArticle.summary,
            );
            const isDuplicate =
              await this.deduplicationEngine.isDuplicate(hash);
            const isSyntacticDuplicate =
              await this.deduplicationEngine.isSyntacticDuplicate(
                extractedArticle.title,
              );

            if (isDuplicate || isSyntacticDuplicate) {
              this.logger.debug(
                `Skipping duplicate article: ${extractedArticle.title}`,
              );
              continue;
            }

            // 1. Safely extract real publisher/article image (e.g. CEO headshot or office photo)
            let backgroundImageUrl = await this.extractOgImage(
              extractedArticle.url,
            );
            if (backgroundImageUrl) {
              this.logger.log(
                `Extracted real article photo for "${extractedArticle.title}": ${backgroundImageUrl}`,
              );
            } else {
              // 2. If no real photo was found, generate a tailored 3D conceptual visual in the background ($0 cost)
              this.logger.log(
                `No real photo found for "${extractedArticle.title}". Generating tailored 3D visual in background...`,
              );
              backgroundImageUrl = await this.generate3dVisualUrl(
                extractedArticle.title,
                extractedArticle.summary,
                extractedArticle.topic,
              );
            }

            // Quota guard: skip if this topic has hit its daily limit
            const topicKey = extractedArticle.topic;
            const currentCount = this.topicCount[topicKey] ?? 0;
            const quota = this.topicQuota[topicKey] ?? 2;
            if (currentCount >= quota) {
              this.logger.log(
                `[Quota] Skipping "${extractedArticle.title}" — ${topicKey} quota (${quota}) reached for today.`,
              );
              continue;
            }

            // 3. Generate Branded OG Image URL (composited with real photo or 3D visual as bg)
            const baseUrl =
              process.env.FRONTEND_URL || 'https://india-biz-intel.vercel.app';
            const imageUrl = backgroundImageUrl
              ? `${baseUrl}/api/og?bg=${encodeURIComponent(backgroundImageUrl)}&title=${encodeURIComponent(extractedArticle.title)}&source=${encodeURIComponent('India BizIntel Hunter')}`
              : `${baseUrl}/api/og?title=${encodeURIComponent(extractedArticle.title)}&source=${encodeURIComponent('India BizIntel Hunter')}`;

            // Save to DB
            const savedArticle = await this.prisma.article.create({
              data: {
                sourceId: source.id,
                externalUrl: extractedArticle.url,
                title: extractedArticle.title,
                author: extractedArticle.author || 'India BizIntel Hunter',
                publishedAt: new Date(),
                rawText: extractedArticle.summary,
                contentHash: hash,
                wordCount: extractedArticle.summary.split(/\s+/).length,
                imageUrl,
              },
            });

            this.logger.log(
              `Successfully hunted and saved: ${savedArticle.title} [${extractedArticle.topic}]`,
            );
            // Increment per-topic counter
            this.topicCount[extractedArticle.topic] =
              (this.topicCount[extractedArticle.topic] ?? 0) + 1;

            // Keep in-memory deduplication cache up-to-date for subsequent topics
            existingUrls.add(savedArticle.externalUrl);
            existingHashes.add(hash);
            recentTitles.push(savedArticle.title);

            // 5. Send to Analysis Queue so the rest of the pipeline processes it normally
            await this.analysisQueue.add('analyze-article', {
              articleId: savedArticle.id,
            });
          } catch (e: any) {
            this.logger.error(
              `Error saving hunted article ${extractedArticle.url}: ${e.message}`,
            );
          }
        }
      } catch (e: any) {
        this.logger.error(`Error hunting for topic ${topic}: ${e.message}`);
      }
    }

    this.logger.log('India BizIntel News Hunter run complete!');
  }

  private calculateSimilarity(str1: string, str2: string): number {
    const tokenize = (s: string) =>
      s
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .split(/\s+/)
        .filter((w) => w.length > 2);

    const set1 = new Set(tokenize(str1));
    const set2 = new Set(tokenize(str2));

    if (set1.size === 0 && set2.size === 0) return 1.0;
    if (set1.size === 0 || set2.size === 0) return 0.0;

    let intersectionSize = 0;
    for (const item of set1) {
      if (set2.has(item)) {
        intersectionSize++;
      }
    }

    const unionSize = set1.size + set2.size - intersectionSize;
    return intersectionSize / unionSize;
  }

  /**
   * Safely attempts to extract the publisher's real article image (e.g. executive photo,
   * corporate building, or official press visual) directly from the webpage OpenGraph tags.
   * Fails fast (3.5s timeout) and gracefully returns null if unreachable or blocked.
   */
  private async extractOgImage(url: string): Promise<string | null> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3500);

      const response = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!response.ok) {
        return null;
      }

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('text/html')) {
        return null;
      }

      const html = await response.text();
      const $ = cheerio.load(html);

      let ogImage =
        $('meta[property="og:image"]').attr('content') ||
        $('meta[name="twitter:image"]').attr('content') ||
        $('meta[property="og:image:url"]').attr('content') ||
        $('meta[name="twitter:image:src"]').attr('content');

      if (!ogImage || typeof ogImage !== 'string') {
        return null;
      }

      ogImage = ogImage.trim();

      // Resolve relative URLs to absolute URLs
      if (ogImage.startsWith('/') || !ogImage.startsWith('http')) {
        try {
          ogImage = new URL(ogImage, url).toString();
        } catch {
          return null;
        }
      }

      // Filter out tracking pixels, icons, SVGs, or tiny spacer gifs
      const lower = ogImage.toLowerCase();
      if (
        lower.endsWith('.svg') ||
        lower.includes('favicon') ||
        lower.includes('1x1') ||
        lower.includes('pixel') ||
        lower.includes('spacer') ||
        lower.includes('logo-small')
      ) {
        return null;
      }

      return ogImage;
    } catch {
      // Gracefully swallow network/timeout errors â€” never fail article hunting
      return null;
    }
  }

  /**
   * Generates a tailored 3D conceptual illustration prompt matching India BizIntel business topics,
   * modeled after executive financial & corporate LinkedIn post styles.
   */
  private build3dPrompt(
    title: string,
    summary: string,
    topic?: string,
  ): string {
    const combined = `${title} ${summary}`.toLowerCase();

    // 1. Funding, VC, PE, Seed, Series A/B/C
    if (
      topic === 'FUNDING' ||
      combined.includes('funding') ||
      combined.includes('raised') ||
      combined.includes('series a') ||
      combined.includes('series b') ||
      combined.includes('series c') ||
      combined.includes('venture capital') ||
      combined.includes('valuation')
    ) {
      return '3D render illustration of modern Indian startup investment and venture capital growth, glowing 3D financial charts and coins rising over Mumbai and Bangalore cyber tech hub, clean cinematic lighting, 8k';
    }

    // 2. Mergers, Acquisitions, Buyouts
    if (
      topic === 'MERGERS_AND_ACQUISITION' ||
      combined.includes('merger') ||
      combined.includes('acquisition') ||
      combined.includes('buyout') ||
      combined.includes('takeover') ||
      combined.includes('deal')
    ) {
      return '3D render illustration of corporate merger and strategic partnership, modern glass skyscraper headquarters, glowing handshake and interconnected business networks, clean architectural 3D style, 8k';
    }

    // 3. Bilateral & Global Companies Entering India
    if (
      topic === 'ENTRY_IN_INDIA' ||
      combined.includes('entering india') ||
      combined.includes('market launch') ||
      combined.includes('global company') ||
      combined.includes('foreign investment')
    ) {
      if (combined.includes('german') || combined.includes('germany')) {
        return '3D render illustration of German flag and Indian flag standing outside futuristic corporate glass headquarters, modern enterprise campus, clean cinematic lighting, 8k';
      }
      if (combined.includes('japan') || combined.includes('japanese')) {
        return '3D render illustration of Japanese flag and Indian flag standing outside modern corporate tech park, sleek glass architecture, 8k';
      }
      if (
        combined.includes('us ') ||
        combined.includes('american') ||
        combined.includes('united states')
      ) {
        return '3D render illustration of American flag and Indian flag standing outside modern glass enterprise innovation hub, architectural 3D visualization, 8k';
      }
      return '3D render illustration of international flags alongside the Indian flag standing outside a modern high-tech enterprise campus in India, architectural visualization, 8k';
    }

    // 4. Leadership & C-Suite Appointments
    if (
      topic === 'LEADERSHIP_CHANGE' ||
      combined.includes('ceo') ||
      combined.includes('cxo') ||
      combined.includes('appoint') ||
      combined.includes('managing director') ||
      combined.includes('resignation')
    ) {
      return '3D render illustration of executive high-floor corporate boardroom in glass skyscraper, conference table, panoramic window view of modern metropolis, sleek corporate atmosphere, 8k';
    }

    // 5. Business Expansion, New Plant & Manufacturing
    if (
      topic === 'EXPANSION' ||
      combined.includes('expansion') ||
      combined.includes('plant') ||
      combined.includes('factory') ||
      combined.includes('manufacturing') ||
      combined.includes('capacity') ||
      combined.includes('facility')
    ) {
      return '3D render illustration of modern smart manufacturing plant and corporate enterprise campus in India, high-tech industrial architecture, bright daylight, 8k';
    }

    // 6. GCC Setup & Tech Hubs
    if (
      topic === 'GCC_SETUP' ||
      combined.includes('gcc') ||
      combined.includes('capability center') ||
      combined.includes('hyderabad') ||
      combined.includes('bengaluru')
    ) {
      return '3D render illustration of modern Indian financial cyber district with modern glass towers and glowing upward commercial growth arrow, architectural photography, 8k';
    }

    // Default General Indian Business Visual
    return '3D render illustration of modern multinational enterprise innovation hub in India, sleek glass facade, landscaped corporate park, bright daylight, architectural 3D visualization, 8k';
  }

  /**
   * Generates a unique 3D visual in the background for $0 and pre-caches it on CDN.
   * Enforces a 45s safety delay between calls to respect free tier rate limits.
   */
  private async generate3dVisualUrl(
    title: string,
    summary: string,
    topic?: string,
  ): Promise<string | null> {
    try {
      // Respect Pollinations free rate limit (45 seconds between requests)
      const now = Date.now();
      const elapsed = now - this.lastPollinationsTime;
      if (elapsed < 46000 && this.lastPollinationsTime > 0) {
        const waitMs = 46000 - elapsed;
        this.logger.log(
          `Waiting ${(waitMs / 1000).toFixed(1)}s to respect free 3D visual rate limit...`,
        );
        await new Promise((r) => setTimeout(r, waitMs));
      }

      const promptText = this.build3dPrompt(title, summary, topic);
      const seed =
        Math.abs(
          title
            .split('')
            .reduce((acc, char) => (acc << 5) - acc + char.charCodeAt(0), 0),
        ) % 1000000;

      const encodedPrompt = encodeURIComponent(promptText);
      const url = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1080&height=1080&model=turbo&seed=${seed}&nologo=true`;

      // Pre-warm the cache on the CDN in the background
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 18000);

      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);
      this.lastPollinationsTime = Date.now();

      if (res.ok) {
        this.logger.log(
          `Generated tailored 3D conceptual visual for "${title}"`,
        );
        return url;
      }

      this.logger.warn(
        `3D generation returned status ${res.status} for "${title}".`,
      );
      return null;
    } catch (err: any) {
      this.logger.warn(`Failed to generate 3D visual: ${err.message}`);
      return null;
    }
  }
}
