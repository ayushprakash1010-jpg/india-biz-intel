import { ImageResponse } from "next/og";
import { put } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

interface InfographicData {
  categoryTag: string;
  headlinePart1: string;
  headlinePart2: string;
  subtitle: string;
  stat1: { label: string; value: string; note: string };
  stat2: { label: string; value: string; note: string };
  shiftTitle: string;
  pillars: Array<{ title: string; subtitle?: string }>;
  quoteTakeaway: string;
  impactItems: Array<{ title: string; desc: string }>;
  ctaTitle: string;
  ctaQuestion: string;
}

// Curated high-resolution corporate skylines and modern architectural visuals
const CITY_BACKGROUNDS = [
  "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1200&q=80", // Modern glass corporate high-rise
  "https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=1200&q=80", // Illuminated skyscrapers dusk
  "https://images.unsplash.com/photo-1444723121867-7a241cacace9?w=1200&q=80", // Modern corporate skyline
  "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1200&q=80", // Tech park commercial towers
];

async function fetchCityBackgroundAsBase64(
  seed: number,
): Promise<string | null> {
  try {
    const chosenUrl = CITY_BACKGROUNDS[seed % CITY_BACKGROUNDS.length];
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);
    const res = await fetch(chosenUrl, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const arrayBuffer = await res.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    return `data:image/jpeg;base64,${base64}`;
  } catch {
    return null;
  }
}

async function extractInfographicDataWithGemini(
  title: string,
  summary: string = "",
): Promise<InfographicData | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const prompt = `You are an elite B2B research analyst (like McKinsey, Gartner, Morgan Stanley, Bain) creating a viral LinkedIn Infographic Slide for India BizIntel (Indian Corporate & Economic Intelligence).
Analyze the article and extract structured data.
Return JSON ONLY matching these exact fields:
- categoryTag: (e.g. "INDIA BUSINESS INTELLIGENCE", "MERGERS & ACQUISITIONS", "VENTURE CAPITAL & FUNDING", "EXECUTIVE LEADERSHIP MANDATE", "MANUFACTURING & INDUSTRIAL", "RETAIL & MARKET ENTRY", "PHARMA & BIOTECH INNOVATION", uppercase, 2-4 words)
- headlinePart1: (First half of main title, in pure white, punchy, e.g. "Tata Motors Expands" or "Reliance Retail Enters")
- headlinePart2: (Second half of main title, highlighted in vibrant gold, e.g. "Global EV Manufacturing" or "Quick Commerce Acceleration")
- subtitle: (2-sentence clear executive summary explaining the strategic milestone, max 26 words)
- stat1: { "label": "KEY METRIC LABEL", "value": "₹2,500 Cr", "note": "(investment scale)" } (Extract a primary financial metric, valuation, or key number from text)
- stat2: { "label": "SECONDARY METRIC", "value": "1st", "note": "(market position)" } (Extract a percentage, location, or milestone metric)
- shiftTitle: (Section header, e.g. "THE SHIFT: SCALING HIGH-VALUE DOMESTIC CAPACITY")
- pillars: (Array of exactly 4 capabilities with title and short subtitle: [
    { "title": "Pillar 1", "subtitle": "Core Focus" },
    { "title": "Pillar 2", "subtitle": "Strategic Goal" },
    { "title": "Pillar 3", "subtitle": "Operational Impact" },
    { "title": "Pillar 4", "subtitle": "Market Scale" }
  ])
- quoteTakeaway: (1 crisp strategic takeaway quote, max 15 words, e.g. "Enterprises are accelerating investments across India's high-growth industrial and consumer corridors.")
- impactItems: (Array of exactly 3 objects with "title" (uppercase 1-2 words) and "desc" (under 9 words), e.g. [
    { "title": "CAPITAL FLOWS", "desc": "Expanding institutional and private equity allocations." },
    { "title": "MARKET REACH", "desc": "Scaling distribution across tier-1 and tier-2 corridors." },
    { "title": "OPERATIONAL SCALE", "desc": "Driving mission-critical manufacturing and technology delivery." }
  ])
- ctaTitle: (e.g. "THE NEXT WAVE OF INDIAN CORPORATE GROWTH IS HERE.")
- ctaQuestion: (A thoughtful question prompting executive discussion, max 18 words, e.g. "How is your leadership team positioning operations to capture emerging high-growth Indian business mandates?")

Article Title: ${title}
Article Summary / Context: ${summary.slice(0, 1500)}`;

  // Try calling Gemini with 1 retry for maximum reliability
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000); // 10s generous timeout

      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.2,
          },
        }),
      });
      clearTimeout(timeout);

      if (res.ok) {
        const json = await res.json();
        const rawText = json.candidates?.[0]?.content?.parts?.[0]?.text;
        if (rawText) {
          const parsed = JSON.parse(rawText) as InfographicData;
          if (
            parsed.headlinePart1 &&
            parsed.stat1 &&
            parsed.pillars?.length === 4
          ) {
            return parsed;
          }
        }
      }
    } catch (err) {
      console.warn(`Gemini infographic attempt ${attempt} failed:`, err);
    }

    if (attempt < 2) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  return null;
}

function buildFallbackData(
  title: string,
  summary: string = "",
): InfographicData {
  // Strip news source suffixes like "- Economic Times", "- Livemint", etc.
  const cleanTitle = title
    .replace(/\s*[-–|]\s*[A-Za-z0-9.]+(?:\.com|\.in|\.org|\.net)?$/i, "")
    .trim();

  // Smart headline split
  const words = cleanTitle.split(/\s+/);
  let headlinePart1 = "";
  let headlinePart2 = "";

  if (words.length <= 4) {
    headlinePart1 = cleanTitle;
    headlinePart2 = "Strategic Growth Mandate";
  } else {
    // Look for natural split words like "to", "in", "with", "as", "for", "eyes", "acquires"
    const splitIndex = words.findIndex(
      (w, idx) =>
        idx >= 3 &&
        [
          "to",
          "in",
          "with",
          "as",
          "for",
          "eyes",
          "acquires",
          "raises",
          "appoints",
        ].includes(w.toLowerCase()),
    );
    if (splitIndex !== -1 && splitIndex < words.length - 1) {
      headlinePart1 = words.slice(0, splitIndex).join(" ");
      headlinePart2 = words.slice(splitIndex).join(" ");
    } else {
      const mid = Math.ceil(words.length / 2);
      headlinePart1 = words.slice(0, mid).join(" ");
      headlinePart2 = words.slice(mid).join(" ");
    }
  }

  const combined = `${cleanTitle} ${summary}`.toLowerCase();

  // Category Tag based on content
  let categoryTag = "INDIA BUSINESS INTELLIGENCE";
  if (
    combined.includes("merger") ||
    combined.includes("acquisition") ||
    combined.includes("acquire") ||
    combined.includes("stake")
  ) {
    categoryTag = "MERGERS & ACQUISITIONS";
  } else if (
    combined.includes("fund") ||
    combined.includes("raise") ||
    combined.includes("venture capital") ||
    combined.includes("valuation") ||
    combined.includes("series")
  ) {
    categoryTag = "VENTURE CAPITAL & FUNDING";
  } else if (
    combined.includes("appoint") ||
    combined.includes("ceo") ||
    combined.includes("cxo") ||
    combined.includes("md") ||
    combined.includes("head")
  ) {
    categoryTag = "EXECUTIVE LEADERSHIP MANDATE";
  } else if (
    combined.includes("manufactur") ||
    combined.includes("plant") ||
    combined.includes("factory") ||
    combined.includes("semiconductor")
  ) {
    categoryTag = "MANUFACTURING & INDUSTRIAL";
  } else if (
    combined.includes("pharma") ||
    combined.includes("biotech") ||
    combined.includes("drug") ||
    combined.includes("clinical")
  ) {
    categoryTag = "PHARMA & HEALTHCARE INNOVATION";
  } else if (
    combined.includes("retail") ||
    combined.includes("store") ||
    combined.includes("ecommerce") ||
    combined.includes("consumer")
  ) {
    categoryTag = "RETAIL & MARKET EXPANSION";
  }

  // Extract key metrics from text (numbers with %, $, ₹, Cr, Bn, Mn, K, or raw numbers > 10)
  const metricMatches =
    `${cleanTitle} ${summary}`.match(
      /(?:₹|\$|€)?\b\d+(?:,\d+)*(?:\.\d+)?(?:%|Cr|B|M|K|\+)?\b/gi,
    ) || [];
  const validMetrics = metricMatches.filter(
    (m) => !["2023", "2024", "2025", "2026", "2027", "2030"].includes(m),
  );

  const stat1Value = validMetrics[0] || "100%";
  const stat1Label = validMetrics[0]?.includes("%")
    ? "GROWTH BENCHMARK"
    : validMetrics[0]?.match(/[₹\$€]|cr|bn|mn/i)
      ? "DEAL VALUE / CAPITAL"
      : validMetrics[0]
        ? "KEY IMPACT METRIC"
        : "ENTERPRISE EXPANSION";
  const stat1Note = "(strategic milestone)";

  // Location or second metric
  let stat2Value = validMetrics[1] || "TIER-1";
  let stat2Label = validMetrics[1]
    ? "INDUSTRY BENCHMARK"
    : "STRATEGIC LOCATION";
  let stat2Note = "(accelerated growth)";

  if (combined.includes("mumbai")) {
    stat2Value = "MUMBAI";
    stat2Label = "FINANCIAL CAPITAL";
    stat2Note = "(commercial headquarters)";
  } else if (combined.includes("bengaluru") || combined.includes("bangalore")) {
    stat2Value = "BENGALURU";
    stat2Label = "TECH CAPITAL";
    stat2Note = "(innovation corridor)";
  } else if (
    combined.includes("delhi") ||
    combined.includes("ncr") ||
    combined.includes("gurugram")
  ) {
    stat2Value = "DELHI NCR";
    stat2Label = "CORPORATE CORRIDOR";
    stat2Note = "(strategic epicenter)";
  } else if (combined.includes("hyderabad")) {
    stat2Value = "HYDERABAD";
    stat2Label = "STRATEGIC HUB";
    stat2Note = "(high-growth corridor)";
  }

  // Dynamic pillars based on context
  let pillars = [
    { title: "Market Expansion", subtitle: "Domestic Reach" },
    { title: "Strategic Capital", subtitle: "Balance Sheet Scale" },
    { title: "Operational Rigor", subtitle: "High-Margin Delivery" },
    { title: "Governance", subtitle: "Leadership Direction" },
  ];

  if (categoryTag === "MERGERS & ACQUISITIONS") {
    pillars = [
      { title: "Portfolio Synergy", subtitle: "Consolidated Scale" },
      { title: "Market Share", subtitle: "Category Dominance" },
      { title: "Valuation Accretion", subtitle: "Shareholder Value" },
      { title: "Integration", subtitle: "Cross-Entity Alignment" },
    ];
  } else if (categoryTag === "VENTURE CAPITAL & FUNDING") {
    pillars = [
      { title: "Product R&D", subtitle: "Tech Moat" },
      { title: "Go-to-Market", subtitle: "Customer Acquisition" },
      { title: "Unit Economics", subtitle: "Path to Profitability" },
      { title: "Talent Density", subtitle: "Executive Scaling" },
    ];
  } else if (categoryTag === "MANUFACTURING & INDUSTRIAL") {
    pillars = [
      { title: "Capacity Addition", subtitle: "High-Volume Output" },
      { title: "Supply Chain", subtitle: "Domestic Localization" },
      { title: "Advanced Automation", subtitle: "Precision Engineering" },
      { title: "Export Mandates", subtitle: "Global Competitiveness" },
    ];
  }

  // Crisp executive subtitle
  const cleanSummary = summary.replace(/\r?\n/g, " ").trim();
  const summarySentences = cleanSummary.split(/(?<=[.!?])\s+/);
  const subtitle =
    summarySentences[0] && summarySentences[0].length > 20
      ? summarySentences[0].slice(0, 180)
      : `${cleanTitle} marks a pivotal milestone as leading enterprises accelerate growth and capital allocation across India.`;

  return {
    categoryTag,
    headlinePart1,
    headlinePart2,
    subtitle,
    stat1: {
      label: stat1Label,
      value: stat1Value,
      note: stat1Note,
    },
    stat2: {
      label: stat2Label,
      value: stat2Value,
      note: stat2Note,
    },
    shiftTitle: "THE SHIFT: FROM TRADITIONAL DELIVERY TO HIGH-VALUE EXPANSION",
    pillars,
    quoteTakeaway:
      "Enterprises are capturing high-growth opportunities across India's dynamic corporate landscape.",
    impactItems: [
      {
        title: "CAPITAL DEPLOYMENT",
        desc: "Aggressive investment in modern capacity and market reach.",
      },
      {
        title: "MARKET DYNAMICS",
        desc: "Expanding modern infrastructure across strategic industrial corridors.",
      },
      {
        title: "ENTERPRISE SCALE",
        desc: "Delivering sustainable margin expansion and market leadership.",
      },
    ],
    ctaTitle: "THE NEXT PHASE OF INDIAN BUSINESS GROWTH IS HERE.",
    ctaQuestion:
      "How is your leadership team positioning operations to capture emerging corporate growth opportunities?",
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, summary, source = "India BizIntel" } = body;

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const seed = Math.abs(
      title
        .split("")
        .reduce(
          (acc: number, char: string) => (acc << 5) - acc + char.charCodeAt(0),
          0,
        ),
    );

    // 1. Extract structured B2B intelligence with Gemini (or dynamic fallback)
    let data = await extractInfographicDataWithGemini(title, summary || "");
    if (!data) {
      data = buildFallbackData(title, summary || "");
    }

    // 2. Fetch curated city background image for right-hand visual window
    const cityBgDataUri = await fetchCityBackgroundAsBase64(seed);

    const {
      categoryTag,
      headlinePart1,
      headlinePart2,
      subtitle,
      stat1,
      stat2,
      shiftTitle,
      pillars,
      quoteTakeaway,
      impactItems,
      ctaTitle,
      ctaQuestion,
    } = data;

    // 3. Render 1200x675 Slide matching the Reference Design with India BizIntel branding
    const imageResponse = new ImageResponse(
      <div
        style={{
          width: "1200px",
          height: "675px",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#060913",
          color: "#ffffff",
          fontFamily: "sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* ── BACKGROUND LAYER: Photorealistic Cityscape on Right Half ── */}
        {cityBgDataUri && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={cityBgDataUri}
            alt=""
            style={{
              position: "absolute",
              right: 0,
              top: 0,
              width: "680px",
              height: "675px",
              objectFit: "cover",
              opacity: 0.38,
            }}
          />
        )}

        {/* ── GRADIENT OVERLAYS ── */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(90deg, #060913 0%, #060913 46%, rgba(6, 9, 19, 0.88) 65%, rgba(6, 9, 19, 0.45) 100%)",
          }}
        />

        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(180deg, rgba(6, 9, 19, 0.2) 0%, rgba(6, 9, 19, 0.75) 75%, #060913 100%)",
          }}
        />

        {/* Ambient Orange & Rose Brand Accents */}
        <div
          style={{
            position: "absolute",
            top: "-100px",
            left: "-100px",
            width: "450px",
            height: "450px",
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(249, 115, 22, 0.12) 0%, transparent 70%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "80px",
            right: "200px",
            width: "500px",
            height: "500px",
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(225, 29, 72, 0.08) 0%, transparent 70%)",
          }}
        />

        {/* ── MAIN CONTENT CONTAINER ── */}
        <div
          style={{
            position: "relative",
            zIndex: 10,
            display: "flex",
            flexDirection: "column",
            height: "100%",
            padding: "36px 48px",
            boxSizing: "border-box",
            justifyContent: "space-between",
          }}
        >
          {/* ═══ TOP SECTION: Header & Key Metrics ═══ */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              width: "100%",
            }}
          >
            {/* Left: Category Pill + 2-Part Headline + Subtitle */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                maxWidth: "680px",
              }}
            >
              <div
                style={{
                  fontSize: "11px",
                  fontWeight: 800,
                  color: "#f97316",
                  letterSpacing: "0.15em",
                  marginBottom: "8px",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <div
                  style={{
                    width: "6px",
                    height: "6px",
                    borderRadius: "50%",
                    backgroundColor: "#f97316",
                    marginRight: "8px",
                  }}
                />
                {categoryTag || "INDIA BUSINESS INTELLIGENCE"}
              </div>

              <div
                style={{
                  fontSize: "32px",
                  fontWeight: 900,
                  lineHeight: 1.15,
                  display: "flex",
                  flexDirection: "column",
                  letterSpacing: "-0.02em",
                }}
              >
                <span style={{ color: "#ffffff" }}>{headlinePart1}</span>
                <span style={{ color: "#fbbf24" }}>{headlinePart2}</span>
              </div>

              <div
                style={{
                  fontSize: "12px",
                  color: "#cbd5e1",
                  marginTop: "10px",
                  lineHeight: 1.45,
                  maxWidth: "580px",
                  display: "flex",
                }}
              >
                {subtitle}
              </div>
            </div>

            {/* Right: 2 High-Impact Metric Cards */}
            <div
              style={{
                display: "flex",
                gap: "16px",
                alignItems: "flex-start",
              }}
            >
              {/* Stat 1 Card */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  backgroundColor: "rgba(15, 23, 42, 0.7)",
                  border: "1px solid rgba(249, 115, 22, 0.35)",
                  borderRadius: "10px",
                  padding: "12px 18px",
                  minWidth: "140px",
                  backdropFilter: "blur(8px)",
                }}
              >
                <span
                  style={{
                    fontSize: "9px",
                    fontWeight: 700,
                    color: "#94a3b8",
                    letterSpacing: "0.08em",
                    marginBottom: "4px",
                  }}
                >
                  {stat1.label}
                </span>
                <span
                  style={{
                    fontSize: "28px",
                    fontWeight: 900,
                    color: "#fbbf24",
                    lineHeight: 1,
                  }}
                >
                  {stat1.value}
                </span>
                <span
                  style={{
                    fontSize: "9px",
                    color: "#64748b",
                    marginTop: "4px",
                  }}
                >
                  {stat1.note}
                </span>
              </div>

              {/* Stat 2 Card */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  backgroundColor: "rgba(15, 23, 42, 0.7)",
                  border: "1px solid rgba(225, 29, 72, 0.35)",
                  borderRadius: "10px",
                  padding: "12px 18px",
                  minWidth: "140px",
                  backdropFilter: "blur(8px)",
                }}
              >
                <span
                  style={{
                    fontSize: "9px",
                    fontWeight: 700,
                    color: "#94a3b8",
                    letterSpacing: "0.08em",
                    marginBottom: "4px",
                  }}
                >
                  {stat2.label}
                </span>
                <span
                  style={{
                    fontSize: "28px",
                    fontWeight: 900,
                    color: "#f97316",
                    lineHeight: 1,
                  }}
                >
                  {stat2.value}
                </span>
                <span
                  style={{
                    fontSize: "9px",
                    color: "#64748b",
                    marginTop: "4px",
                  }}
                >
                  {stat2.note}
                </span>
              </div>
            </div>
          </div>

          {/* ═══ MIDDLE SECTION: 4 Capability Pillars + Quote ═══ */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "10px",
              marginTop: "8px",
            }}
          >
            <div
              style={{
                fontSize: "10px",
                fontWeight: 800,
                color: "#94a3b8",
                letterSpacing: "0.12em",
                display: "flex",
              }}
            >
              {shiftTitle ||
                "THE SHIFT: FROM TRADITIONAL SUPPORT TO HIGH-VALUE EXPANSION"}
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                backgroundColor: "rgba(15, 23, 42, 0.65)",
                border: "1px solid rgba(148, 163, 184, 0.15)",
                borderRadius: "12px",
                padding: "12px 20px",
                backdropFilter: "blur(10px)",
              }}
            >
              {/* 4 Pillars with Circular Badges */}
              <div style={{ display: "flex", gap: "24px" }}>
                {pillars.map((pillar, idx) => {
                  const colors = [
                    {
                      border: "#f97316",
                      bg: "rgba(249, 115, 22, 0.15)",
                      text: "#fed7aa",
                    },
                    {
                      border: "#e11d48",
                      bg: "rgba(225, 29, 72, 0.15)",
                      text: "#fecdd3",
                    },
                    {
                      border: "#38bdf8",
                      bg: "rgba(56, 189, 248, 0.15)",
                      text: "#bae6fd",
                    },
                    {
                      border: "#10b981",
                      bg: "rgba(16, 185, 129, 0.15)",
                      text: "#a7f3d0",
                    },
                  ];
                  const c = colors[idx % colors.length];

                  return (
                    <div
                      key={idx}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                      }}
                    >
                      <div
                        style={{
                          width: "28px",
                          height: "28px",
                          borderRadius: "50%",
                          border: `1.5px solid ${c.border}`,
                          backgroundColor: c.bg,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "11px",
                          fontWeight: 800,
                          color: c.border,
                        }}
                      >
                        {idx + 1}
                      </div>
                      <div style={{ display: "flex", flexDirection: "column" }}>
                        <span
                          style={{
                            fontSize: "12px",
                            fontWeight: 700,
                            color: "#ffffff",
                          }}
                        >
                          {pillar.title}
                        </span>
                        {pillar.subtitle && (
                          <span style={{ fontSize: "9px", color: "#94a3b8" }}>
                            {pillar.subtitle}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Quote Takeaway on Right */}
              {quoteTakeaway && (
                <div
                  style={{
                    maxWidth: "280px",
                    fontSize: "10px",
                    fontStyle: "italic",
                    color: "#f97316",
                    textAlign: "right",
                    lineHeight: 1.35,
                    borderLeft: "2px solid rgba(249, 115, 22, 0.4)",
                    paddingLeft: "14px",
                    display: "flex",
                  }}
                >
                  &quot;{quoteTakeaway}&quot;
                </div>
              )}
            </div>
          </div>

          {/* ═══ LOWER SECTION: 3 Ripple Cards + CTA Box ═══ */}
          <div
            style={{
              display: "flex",
              gap: "14px",
              alignItems: "stretch",
              marginTop: "8px",
            }}
          >
            {/* 3 Impact Cards */}
            {impactItems.slice(0, 3).map((item, idx) => (
              <div
                key={idx}
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  backgroundColor: "rgba(15, 23, 42, 0.7)",
                  border: "1px solid rgba(148, 163, 184, 0.12)",
                  borderRadius: "8px",
                  padding: "12px 14px",
                  backdropFilter: "blur(6px)",
                }}
              >
                <span
                  style={{
                    fontSize: "9px",
                    fontWeight: 800,
                    color: "#f97316",
                    letterSpacing: "0.08em",
                    marginBottom: "4px",
                  }}
                >
                  {item.title}
                </span>
                <span
                  style={{
                    fontSize: "10px",
                    color: "#cbd5e1",
                    lineHeight: 1.35,
                  }}
                >
                  {item.desc}
                </span>
              </div>
            ))}

            {/* CTA Interactive Box */}
            <div
              style={{
                flex: 1.4,
                display: "flex",
                flexDirection: "column",
                backgroundColor: "rgba(24, 24, 27, 0.85)",
                border: "1px solid rgba(251, 191, 36, 0.45)",
                borderRadius: "8px",
                padding: "12px 16px",
                justifyContent: "space-between",
                backdropFilter: "blur(8px)",
              }}
            >
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span
                  style={{
                    fontSize: "9px",
                    fontWeight: 800,
                    color: "#fbbf24",
                    letterSpacing: "0.06em",
                    marginBottom: "4px",
                  }}
                >
                  {ctaTitle || "THE NEXT WAVE OF CORPORATE EXPANSION IS HERE."}
                </span>
                <span
                  style={{
                    fontSize: "10px",
                    color: "#ffffff",
                    lineHeight: 1.35,
                  }}
                >
                  {ctaQuestion ||
                    "How is your organization aligning operational models to capture high-value market opportunities?"}
                </span>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "#fbbf24",
                  color: "#000000",
                  fontWeight: 800,
                  fontSize: "10px",
                  padding: "4px 10px",
                  borderRadius: "5px",
                  marginTop: "6px",
                  width: "fit-content",
                }}
              >
                Share your insights below!
              </div>
            </div>
          </div>

          {/* ═══ FOOTER: Source + India BizIntel Logo + Hashtags ═══ */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              borderTop: "1px solid rgba(148, 163, 184, 0.15)",
              paddingTop: "10px",
              marginTop: "6px",
            }}
          >
            <div
              style={{
                fontSize: "10px",
                color: "#64748b",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <span>Source:</span>
              <span style={{ color: "#94a3b8", fontWeight: 600 }}>
                {source}
              </span>
            </div>

            {/* India BizIntel Brand Logo Badge */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <div
                style={{
                  width: "24px",
                  height: "24px",
                  borderRadius: "6px",
                  background:
                    "linear-gradient(135deg, #f97316 0%, #e11d48 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#ffffff",
                  fontWeight: 900,
                  fontSize: "12px",
                  boxShadow: "0 4px 12px rgba(249, 115, 22, 0.4)",
                }}
              >
                IB
              </div>
              <span
                style={{
                  fontSize: "13px",
                  fontWeight: 900,
                  letterSpacing: "-0.01em",
                  color: "#ffffff",
                }}
              >
                India BizIntel
              </span>
            </div>

            <div
              style={{
                fontSize: "10px",
                color: "#f97316",
                letterSpacing: "0.04em",
                display: "flex",
              }}
            >
              #IndiaBiz #CorporateIndia #BusinessIntelligence
            </div>
          </div>
        </div>
      </div>,
      {
        width: 1200,
        height: 675,
      },
    );

    // 4. Convert ImageResponse to PNG buffer and persist directly to Vercel Blob store
    const imageArrayBuffer = await imageResponse.arrayBuffer();

    const safeSlug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .slice(0, 30);
    const filename = `articles/${Date.now()}-infographic-${safeSlug}.png`;

    const blob = await put(filename, Buffer.from(imageArrayBuffer), {
      access: "public",
      contentType: "image/png",
    });

    return NextResponse.json({
      url: blob.url,
      data,
    });
  } catch (error: unknown) {
    console.error("Infographic generation error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to generate infographic";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
