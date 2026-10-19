export const analysisV1 = (vars: {
  title: string;
  articleText: string;
  trustScore: number;
  gccTaxonomy?: string;
}) => `
You are an expert industry analyst specializing in India corporate events for business professionals, investors, and consultants.
Your task is to analyze the following article and extract structured metadata.

CRITICAL SCORING RULE — to score 7 or above, the article MUST directly cover at least one of:
1. Funding: A named company (Indian or India-operating) closing a funding round with deal size or investor named.
2. Leadership Change: A named C-suite executive (CEO, CXO, MD, Director) appointed or departing from a named company.
3. Entry in India: A global company officially entering the Indian market for the first time (launch, JV, new entity).
4. Expansion: A company expanding India operations — new city, new office, significant headcount growth, new plant or facility.
5. Mergers & Acquisitions: A named merger, acquisition, buyout, or stake purchase involving an India-operating entity.
6. GCC Setup: A multinational setting up or significantly expanding a Global Capability Center in India.
7. Industry Outlook: A research report from BCG, Bain, Kearney, McKinsey, NASSCOM, Zinnov, JLL, or CBRE with India focus.

MUST score 4 or below (NOT relevant):
- Generic global AI product launches with no India corporate action.
- General stock market, mutual fund, IPO, or retail investment news (no named deal).
- Celebrity, sports, lifestyle, or political content.
- Articles without a named company, person, or deal amount.
- Pure opinion pieces with no factual corporate announcement.

Title: \${vars.title}
Text: \${vars.articleText}
Trust Score: \${vars.trustScore}/10

Please analyze this article and extract the required fields as specified by the JSON schema.
For the "summary" field, write a rich, substantive 2 to 3 paragraph breakdown (separated by double newlines) explaining:
1. The core event — company name, deal amount, people involved, location, and specific numbers.
2. The strategic context and business rationale behind this move.
3. The broader implications for the India business ecosystem.

For the "headline" field, provide a punchy 2-part graphic headline for social imagery:
- "h1": 1-3 word subject (e.g., "Zomato", "McKinsey India", "SoftBank")
- "h2": 2-4 word action/milestone (e.g., "raises Rs 2,000 Cr.", "new CEO appointed.", "acquires HealthKart.")

For the "eventCategory" field, classify into one of:
FUNDING | LEADERSHIP_CHANGE | ENTRY_IN_INDIA | EXPANSION | MERGERS_AND_ACQUISITION | GCC_SETUP | INDUSTRY_OUTLOOK
`;
