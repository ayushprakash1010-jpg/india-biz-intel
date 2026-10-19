import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { LlmService } from '../../llm/llm.service';
import { DeduplicationEngine } from './deduplication.engine';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { QUEUES } from '../../../infrastructure/queue/queue.constants';
import * as Parser from 'rss-parser';
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

  // 6 core India corporate event topics x 2 articles = ~12 per daily run
  private readonly targetTopics = [
    // 1. Funding rounds - VC, PE, Series A/B/C, debt funding
    'India startup company funding round investment 2026 Series',

    // 2. Leadership changes - C-suite appointments and exits
    'India CEO CXO MD director appointment resignation leadership change 2026',

    // 3. Global companies entering India for the first time
    'global company entering India market launch first 2026',

    // 4. Business expansion - new offices, headcount growth, new geographies
    'India business expansion new office plant capacity headcount 2026',

    // 5. Mergers & Acquisitions
    'India merger acquisition deal buyout takeover 2026',

    // 6. GCC setup - Global Capability Center announcements in India
    'Global Capability Center GCC India setup announcement new 2026',
  ];

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

            // Generate OG Image Fallback
            const baseUrl =
              process.env.FRONTEND_URL || 'https://india-biz-intel.vercel.app';
            const imageUrl = `${baseUrl}/api/og?title=${encodeURIComponent(extractedArticle.title)}&source=${encodeURIComponent('India BizIntel Hunter')}`;

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
}
