import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // 1. Feature Flags & Config
  const settings = [
    {
      key: 'feature.story_clustering',
      value: 'true',
      description: 'Enable/disable story clustering',
    },
    {
      key: 'feature.trend_detection',
      value: 'true',
      description: 'Enable/disable trend detection',
    },
    {
      key: 'feature.feedback_learning',
      value: 'true',
      description: 'Enable/disable feedback learning',
    },
    {
      key: 'feature.semantic_dedup',
      value: 'true',
      description: 'Enable/disable Qdrant semantic deduplication',
    },
    {
      key: 'feature.auto_generation',
      value: 'true',
      description: 'Auto-generate posts for high-impact articles',
    },
    {
      key: 'feature.auto_schedule',
      value: 'false',
      description: 'Auto-assign calendar slots',
    },
    {
      key: 'feature.ai_observability',
      value: 'true',
      description: 'Log all LLM calls to agent_runs table',
    },
    {
      key: 'config.analysis_threshold',
      value: '7',
      description: 'Min businessImpact to trigger generation',
    },
    {
      key: 'config.cluster_similarity',
      value: '0.80',
      description: 'Cosine similarity threshold for clustering',
    },
    {
      key: 'config.cluster_window_hours',
      value: '24',
      description: 'Hours to wait before finalizing a story cluster',
    },
    {
      key: 'config.trend_score_threshold',
      value: '15',
      description: 'Weighted score to classify a trend',
    },
    {
      key: 'config.max_article_tokens',
      value: '8000',
      description: 'Max tokens per article before truncation',
    },
    {
      key: 'config.dedup_ttl_days',
      value: '30',
      description: 'Redis dedup key TTL in days',
    },
  ];

  for (const setting of settings) {
    await prisma.systemSetting.upsert({
      where: { key: setting.key },
      update: {},
      create: setting,
    });
  }
  console.log('System settings seeded.');

  // 2. Admin User
  const adminEmail = 'admin@indiabizintel.com';
  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (!existingAdmin) {
    const crypto = require('crypto');
    const randomPassword = crypto.randomBytes(8).toString('hex');
    const passwordHash = await bcrypt.hash(randomPassword, 10);
    await prisma.user.create({
      data: {
        email: adminEmail,
        name: 'Admin User',
        role: UserRole.ADMIN,
        passwordHash,
      },
    });
    console.log(
      `Admin user seeded (Email: ${adminEmail} / Password: ${randomPassword}). IMPORTANT: Save this password or change it immediately.`,
    );
  } else {
    console.log('Admin user already exists.');
  }

  // 3. High-Signal India Corporate Event Sources
  // Removed GCC-quest/tech-only leftovers:
  //   - Walmart Global Tech (India GCC) — GCC-specific corporate blog
  //   - Economic Times GCC/Corporate — pointed to ET Tech sub-feed, not deals
  //   - Business Standard Tech — tech sub-section RSS
  //   - Moneycontrol Tech — tech sub-section RSS
  //   - Analytics India Magazine — AI/ML tech, not corporate deals
  //   - Economic Times CIO — security/CIO tech, not deal flow
  //   - The Hindu BusinessLine Info-tech — tech sub-RSS, not companies
  // Added high-signal corporate deal sources:
  //   ET Corporate Deals, MC Business, BS Companies, BL Companies,
  //   Entrackr, Inc42, YourStory, Google News targeted leadership/entry queries, NASSCOM
  const initialSources = [
    // --- PRIMARY: Broad India corporate deal & company news ---
    {
      name: 'Economic Times — Corporate Deals',
      url: 'https://economictimes.indiatimes.com/markets/deals/rssfeeds/22915373.cms',
      type: 'RSS',
      category: 'NEWS',
      crawlFrequency: 'HOURLY',
      trustScore: 9.5,
      authorityScore: 9.5,
      compositeScore: 9.5,
      status: 'ACTIVE',
    },
    {
      name: 'Moneycontrol Business',
      url: 'https://www.moneycontrol.com/rss/business.xml',
      type: 'RSS',
      category: 'NEWS',
      crawlFrequency: 'HOURLY',
      trustScore: 9.0,
      authorityScore: 9.0,
      compositeScore: 9.0,
      status: 'ACTIVE',
    },
    {
      name: 'Business Standard — Companies',
      url: 'https://www.business-standard.com/rss/companies-101.rss',
      type: 'RSS',
      category: 'NEWS',
      crawlFrequency: 'HOURLY',
      trustScore: 9.0,
      authorityScore: 9.0,
      compositeScore: 9.0,
      status: 'ACTIVE',
    },
    {
      name: 'Mint (Livemint) Companies',
      url: 'https://www.livemint.com/rss/companies',
      type: 'RSS',
      category: 'NEWS',
      crawlFrequency: 'HOURLY',
      trustScore: 9.0,
      authorityScore: 9.0,
      compositeScore: 9.0,
      status: 'ACTIVE',
    },
    {
      name: 'The Hindu BusinessLine — Companies',
      url: 'https://www.thehindubusinessline.com/companies/?service=rss',
      type: 'RSS',
      category: 'NEWS',
      crawlFrequency: 'HOURLY',
      trustScore: 9.0,
      authorityScore: 9.0,
      compositeScore: 9.0,
      status: 'ACTIVE',
    },
    // --- FUNDING / STARTUP DEALS ---
    {
      name: 'Inc42 — Startup Funding',
      url: 'https://inc42.com/feed/',
      type: 'RSS',
      category: 'NEWS',
      crawlFrequency: 'HOURLY',
      trustScore: 8.5,
      authorityScore: 8.5,
      compositeScore: 8.5,
      status: 'ACTIVE',
    },
    {
      name: 'YourStory',
      url: 'https://yourstory.com/feed',
      type: 'RSS',
      category: 'NEWS',
      crawlFrequency: 'HOURLY',
      trustScore: 8.5,
      authorityScore: 8.0,
      compositeScore: 8.25,
      status: 'ACTIVE',
    },
    {
      name: 'Entrackr — India Startups',
      url: 'https://entrackr.com/feed/',
      type: 'RSS',
      category: 'NEWS',
      crawlFrequency: 'HOURLY',
      trustScore: 8.5,
      authorityScore: 8.5,
      compositeScore: 8.5,
      status: 'ACTIVE',
    },
    // --- LEADERSHIP / MARKET ENTRY via targeted Google News RSS ---
    {
      name: 'India Leadership Changes — GNews',
      url: 'https://news.google.com/rss/search?q=%22appointed+as+CEO%22+OR+%22new+CEO%22+OR+%22MD+appointed%22+OR+%22CXO+joins%22+India+company&hl=en-IN&gl=IN&ceid=IN:en',
      type: 'RSS',
      category: 'NEWS',
      crawlFrequency: 'DAILY',
      trustScore: 8.0,
      authorityScore: 8.0,
      compositeScore: 8.0,
      status: 'ACTIVE',
    },
    {
      name: 'India Market Entry — GNews',
      url: 'https://news.google.com/rss/search?q=%22enters+India%22+OR+%22launches+in+India%22+OR+%22sets+up+India+office%22+global+company&hl=en-IN&gl=IN&ceid=IN:en',
      type: 'RSS',
      category: 'NEWS',
      crawlFrequency: 'DAILY',
      trustScore: 8.0,
      authorityScore: 8.0,
      compositeScore: 8.0,
      status: 'ACTIVE',
    },
    // --- INDUSTRY OUTLOOK: Research firms only ---
    {
      name: 'NASSCOM Insights',
      url: 'https://nasscom.in/knowledge-center/publications/rss',
      type: 'RSS',
      category: 'RESEARCH',
      crawlFrequency: 'DAILY',
      trustScore: 9.5,
      authorityScore: 9.5,
      compositeScore: 9.5,
      status: 'ACTIVE',
    },
    {
      name: 'Women Founders & Funding',
      url: 'https://news.google.com/rss/search?q=%22Women+founder%22+OR+funding+OR+%22women+led+startup%22+OR+%22women+backed+startup%22&hl=en-IN&gl=IN&ceid=IN:en',
      type: 'RSS',
      category: 'NEWS',
      crawlFrequency: 'HOURLY',
      trustScore: 8.5,
      authorityScore: 8.5,
      compositeScore: 8.5,
      status: 'ACTIVE',
    },
  ];

  for (const src of initialSources) {
    const existing = await prisma.source.findFirst({ where: { url: src.url } });
    if (!existing) {
      await prisma.source.create({ data: src as any });
    }
  }
  console.log('Initial sources seeded.');

  // 4. Default Brand Voice
  const existingBrandVoice = await prisma.brandVoice.findFirst({
    where: { isDefault: true },
  });
  if (!existingBrandVoice) {
    await prisma.brandVoice.create({
      data: {
        name: 'India BizIntel Default',
        description:
          'Standard analytical and professional tone for India Business Intelligence',
        tone: 'Professional, analytical, forward-looking, and objective.',
        guidelines: [
          'Use clear business terminology without excessive jargon.',
          'Focus on deal specifics: company names, deal sizes, headcount, geography, and strategic rationale.',
          "Highlight implications for India's business ecosystem — investors, consultants, and corporate strategists.",
          'Maintain an objective, third-person perspective.',
        ],
        isDefault: true,
      },
    });
    console.log('Default brand voice seeded.');
  }

  console.log('Seeding complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
