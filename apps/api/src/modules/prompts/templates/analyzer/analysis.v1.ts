export const analysisV1 = (vars: {
  title: string;
  articleText: string;
  trustScore: number;
  gccTaxonomy?: string;
}) => `
You are an expert industry analyst specializing in India corporate events for business professionals, investors, and consultants.
Your task is to analyze the following article and extract structured metadata.

STRICT IMPACT SCORING GUIDELINES (1 to 10):
Default to 5.5 - 6.5 for ordinary corporate mentions. Be very selective and conservative with high scores:

Score 8.5 - 10 (CRITICAL TIER 1 - High-Value Corporate Intelligence):
Only assign 8.5 or higher if the article meets at least one of these high-impact conditions:
1. Funding: Significant funding round (> ₹100 Cr / $12M+) with named lead investors (e.g., Peak XV, Tiger Global, SoftBank, Accel, Temasek).
2. Leadership: Top-tier C-suite transition (CEO, MD, Chairperson) at a major enterprise, listed firm, or prominent unicorn.
3. Entry in India: Major global/multinational brand officially entering India with concrete local investment or entity setup.
4. Expansion / GCC: Substantial facility, plant, or GCC setup with 500+ headcount or significant capital expenditure (> ₹100 Cr).
5. M&A: High-value acquisition, controlling stake buyout, or landmark merger with named financial terms.

Score 7.0 - 8.4 (TIER 2 - Notable Business Developments):
- Early-stage / seed funding rounds (< ₹100 Cr).
- Secondary leadership appointments (VP, SVP, Business Unit Head) or appointments at smaller startups.
- Routine office leasing, incremental regional expansion, or mid-sized hiring drives.
- Authoritative industry research reports from BCG, Bain, McKinsey, NASSCOM, or Zinnov.

Score 5.0 - 6.9 (TIER 3 - Incremental or Routine Business Activity):
- Minor business updates, routine quarterly earnings comments without major announcements, product feature rollouts.

MUST score 4.0 or below (DISCARD - Not Actionable Intelligence):
- Generic global AI/tech product announcements without specific India corporate operations.
- General stock market, daily indices movements, mutual fund or retail trading commentary.
- Celebrity, sports, lifestyle, political, or general crime news.
- Articles lacking a specific named company, executive, or verifiable deal figure.
- Pure opinion pieces, editorial commentary, or advertorials.

Title: ${vars.title}
Text: ${vars.articleText}
Trust Score: ${vars.trustScore}/10

Please analyze this article and extract the required fields as specified by the JSON schema.
For the "summary" field, write a rich, substantive 2 to 3 paragraph breakdown (separated by double newlines) explaining:
1. The core event — company name, deal amount, people involved, location, and specific numbers.
2. The strategic context and business rationale behind this move.
3. The specific implications for the India business ecosystem — name comparable events, cite relevant market data, or reference specific industry dynamics.

IMPORTANT: Do NOT use the phrases "broader trend", "broader shift", "broader pattern", "broader implications", "underscores the growing", or any similar vague generalizations. Be concrete and specific in your analysis.

For the "headline" field, provide a punchy 2-part graphic headline for social imagery:
- "h1": 1-3 word subject (e.g., "Zomato", "McKinsey India", "SoftBank")
- "h2": 2-4 word action/milestone (e.g., "raises Rs 2,000 Cr.", "new CEO appointed.", "acquires HealthKart.")

For the "eventCategory" field, classify into one of:
FUNDING | LEADERSHIP_CHANGE | ENTRY_IN_INDIA | EXPANSION | MERGERS_AND_ACQUISITION | GCC_SETUP | INDUSTRY_OUTLOOK
`;
