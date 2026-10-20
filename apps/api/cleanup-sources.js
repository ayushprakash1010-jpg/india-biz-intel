/**
 * cleanup-polluted-sources.js
 *
 * One-time script to deactivate GCC-quest polluted sources still
 * active in the live Neon Postgres database, and register the new
 * high-signal India BizIntel sources if they are not yet present.
 *
 * Run with:  node cleanup-polluted-sources.js
 * Requires:  DATABASE_URL set in .env (or as env var)
 */

// dotenv loaded via --env-file
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const POLLUTED_SOURCE_URLS = [
  'https://ciso.economictimes.indiatimes.com/rss/topstories', // ET CIO
  'https://economictimes.indiatimes.com/tech/rssfeeds.cms', // ET GCC/Corporate (tech)
  'https://www.business-standard.com/rss/technology-108.rss', // BS Tech
  'https://www.moneycontrol.com/rss/technology.xml', // Moneycontrol Tech
  'https://analyticsindiamag.com/feed/', // Analytics India Magazine
  'https://tech.walmart.com/', // Walmart Global Tech
  'https://www.thehindubusinessline.com/info-tech/?service=rss', // BL Info-tech (wrong sub-feed)
];

const NEW_SOURCES = [
  {
    name: 'Economic Times � Corporate Deals',
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
    name: 'Business Standard � Companies',
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
    name: 'The Hindu BusinessLine � Companies',
    url: 'https://www.thehindubusinessline.com/companies/?service=rss',
    type: 'RSS',
    category: 'NEWS',
    crawlFrequency: 'HOURLY',
    trustScore: 9.0,
    authorityScore: 9.0,
    compositeScore: 9.0,
    status: 'ACTIVE',
  },
  {
    name: 'Entrackr � India Startups',
    url: 'https://entrackr.com/feed/',
    type: 'RSS',
    category: 'NEWS',
    crawlFrequency: 'HOURLY',
    trustScore: 8.5,
    authorityScore: 8.5,
    compositeScore: 8.5,
    status: 'ACTIVE',
  },
  {
    name: 'India Leadership Changes � GNews',
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
    name: 'India Market Entry � GNews',
    url: 'https://news.google.com/rss/search?q=%22enters+India%22+OR+%22launches+in+India%22+OR+%22sets+up+India+office%22+global+company&hl=en-IN&gl=IN&ceid=IN:en',
    type: 'RSS',
    category: 'NEWS',
    crawlFrequency: 'DAILY',
    trustScore: 8.0,
    authorityScore: 8.0,
    compositeScore: 8.0,
    status: 'ACTIVE',
  },
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
];

async function main() {
  console.log('\n??? India BizIntel: DB Source Cleanup ???\n');

  // 1. DEACTIVATE polluted sources
  console.log('Step 1: Deactivating polluted/off-topic sources...');
  for (const url of POLLUTED_SOURCE_URLS) {
    const result = await prisma.source.updateMany({
      where: { url, status: 'ACTIVE' },
      data: { status: 'DISABLED' },
    });
    if (result.count > 0) {
      console.log(`  ? Deactivated: ${url}`);
    } else {
      console.log(`  ??  Not found/already inactive: ${url}`);
    }
  }

  // 2. INSERT new high-signal sources (skip if already exist)
  console.log('\nStep 2: Registering new high-signal sources...');
  for (const src of NEW_SOURCES) {
    const existing = await prisma.source.findFirst({ where: { url: src.url } });
    if (existing) {
      // Ensure it is ACTIVE in case it was somehow deactivated
      if (existing.status !== 'ACTIVE') {
        await prisma.source.update({
          where: { id: existing.id },
          data: { status: 'ACTIVE' },
        });
        console.log(`  ??  Re-activated: ${src.name}`);
      } else {
        console.log(`  ??  Already exists: ${src.name}`);
      }
    } else {
      await prisma.source.create({ data: src });
      console.log(`  ? Added: ${src.name}`);
    }
  }

  // 3. Print current active sources summary
  console.log('\nStep 3: Current ACTIVE sources in DB:');
  const active = await prisma.source.findMany({
    where: { status: 'ACTIVE' },
    select: { name: true, url: true, category: true, crawlFrequency: true },
    orderBy: { compositeScore: 'desc' },
  });
  active.forEach((s, i) => {
    console.log(`  ${i + 1}. [${s.category}] ${s.name}`);
  });

  console.log(`\n? Done! ${active.length} active sources in DB.\n`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
