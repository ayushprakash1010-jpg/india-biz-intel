import { put } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

async function generateSmartPromptWithGemini(
  title: string,
  summary: string = "",
): Promise<{ prompt: string; unsplashQuery: string } | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000); // 4s fast timeout

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${apiKey}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text:
                  "You are a visual director for B2B LinkedIn editorial covers for India BizIntel (Indian Corporate & Economic Intelligence). Analyze this article and return valid JSON with two fields:\n" +
                  '1. "prompt": a 25-word high-impact 3D conceptual illustration prompt capturing the industry and corporate transformation (e.g. semiconductor cleanroom in India, automotive smart factory, digital payments network, pharma biotech lab, renewable energy grid). Must specify "3D corporate render, sleek modern glass architecture, ambient amber and electric blue lighting, 8k". Never include flags, human faces, text, words, or letters.\n' +
                  '2. "unsplashQuery": 3-4 precise keywords for corporate photography.\n\n' +
                  `Article Title: ${title}\n` +
                  `Article Summary: ${summary.slice(0, 300)}`,
              },
            ],
          },
        ],
        generationConfig: { responseMimeType: "application/json" },
      }),
    });
    clearTimeout(timeout);

    if (!res.ok) return null;
    const data = await res.json();
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (parsed.prompt && parsed.unsplashQuery) {
      return {
        prompt: parsed.prompt,
        unsplashQuery: parsed.unsplashQuery,
      };
    }
  } catch (err) {
    console.warn("Gemini smart prompt generation skipped or failed:", err);
  }
  return null;
}

function buildTopicPrompt(
  title: string,
  summary: string = "",
): { prompt: string; unsplashQuery: string } {
  const combined = `${title} ${summary}`.toLowerCase();

  // 1. Pharma, Healthcare & Biotech
  if (
    combined.includes("pharma") ||
    combined.includes("biotech") ||
    combined.includes("vaccine") ||
    combined.includes("drug") ||
    combined.includes("clinical") ||
    combined.includes("healthcare") ||
    combined.includes("hospital")
  ) {
    return {
      prompt:
        "3D render illustration of high-tech pharmaceutical research cleanroom, molecular biotechnology models, sleek glass medical laboratories in India, ambient amber and blue lighting, 8k",
      unsplashQuery: "pharmaceutical laboratory biotechnology research",
    };
  }

  // 2. M&A, Private Equity, Buyouts, Deal Memo
  if (
    combined.includes("merger") ||
    combined.includes("acquisition") ||
    combined.includes("acquire") ||
    combined.includes("buyout") ||
    combined.includes("stake") ||
    combined.includes("deal") ||
    combined.includes("private equity")
  ) {
    return {
      prompt:
        "3D render illustration of futuristic corporate boardroom overlooking illuminated metropolitan financial skyline, sleek glass conference architecture, gold and sapphire ambient lighting, 8k",
      unsplashQuery: "corporate boardroom executive financial district",
    };
  }

  // 3. Startups, Venture Capital, Funding & Unicorns
  if (
    combined.includes("fund") ||
    combined.includes("series a") ||
    combined.includes("series b") ||
    combined.includes("series c") ||
    combined.includes("valuation") ||
    combined.includes("unicorn") ||
    combined.includes("venture capital") ||
    combined.includes("startup") ||
    combined.includes("ipo")
  ) {
    return {
      prompt:
        "3D render illustration of modern venture capital and fintech growth terminal, upward dynamic geometric graphs, high-tech startup innovation campus, ambient amber and blue glow, 8k",
      unsplashQuery: "venture capital startup technology growth",
    };
  }

  // 4. Manufacturing, Semiconductor, Electronics, Automotive & EV
  if (
    combined.includes("manufactur") ||
    combined.includes("semiconductor") ||
    combined.includes("chip") ||
    combined.includes("plant") ||
    combined.includes("factory") ||
    combined.includes("assembly") ||
    combined.includes("electric vehicle") ||
    combined.includes("ev") ||
    combined.includes("battery")
  ) {
    return {
      prompt:
        "3D render illustration of automated precision industrial plant, advanced robotics assembly line, cleanroom semiconductor wafer fabrication in India, ambient orange and blue lighting, 8k",
      unsplashQuery: "advanced industrial manufacturing robotics automation",
    };
  }

  // 5. CXO & Executive Leadership Appointments
  if (
    combined.includes("appoint") ||
    combined.includes("ceo") ||
    combined.includes("cxo") ||
    combined.includes("md") ||
    combined.includes("managing director") ||
    combined.includes("president") ||
    combined.includes("board") ||
    combined.includes("chairperson")
  ) {
    return {
      prompt:
        "3D render illustration of premier executive headquarters, modern architectural glass atrium, dramatic corporate lighting, high-level strategic enterprise boardroom, 8k",
      unsplashQuery: "corporate executive headquarters modern office",
    };
  }

  // 6. Retail, E-Commerce, Quick Commerce & FMCG
  if (
    combined.includes("retail") ||
    combined.includes("ecommerce") ||
    combined.includes("e-commerce") ||
    combined.includes("store") ||
    combined.includes("fmcg") ||
    combined.includes("quick commerce") ||
    combined.includes("blinkit") ||
    combined.includes("zepto") ||
    combined.includes("mall")
  ) {
    return {
      prompt:
        "3D render illustration of modern luxury retail flagship center, automated distribution corridors, futuristic commercial entrance, warm amber and gold lighting, 8k",
      unsplashQuery: "modern retail store flagship interior commerce",
    };
  }

  // 7. FinTech, Banking & Digital Payments
  if (
    combined.includes("fintech") ||
    combined.includes("upi") ||
    combined.includes("bank") ||
    combined.includes("payment") ||
    combined.includes("nbfc") ||
    combined.includes("digital rupee") ||
    combined.includes("rbi")
  ) {
    return {
      prompt:
        "3D render illustration of modern digital banking financial center, holographic blockchain networks, illuminated trading floors, deep sapphire and gold lighting, 8k",
      unsplashQuery: "fintech banking financial district skyscraper",
    };
  }

  // 8. General Indian Corporate & Economic Intelligence (Default)
  return {
    prompt:
      "3D render illustration of premier Indian corporate enterprise towers, illuminated architectural glass skyline at twilight, modern business district, ambient amber and electric blue glow, 8k",
    unsplashQuery: "modern corporate architecture skyscraper business",
  };
}

// Curated high-resolution corporate photography backup pool
const CURATED_BUSINESS_FALLBACKS = [
  "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1080&q=80", // Modern glass skyscraper
  "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=1080&q=80", // Boardroom handshake & deal
  "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=1080&q=80", // Precision manufacturing robotics
  "https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=1080&q=80", // High-tech biotech laboratory
  "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=1080&q=80", // Financial growth analytics
  "https://images.unsplash.com/photo-1517502884422-41eaead166d4?w=1080&q=80", // Executive glass boardroom
  "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1080&q=80", // Modern retail entrance
  "https://images.unsplash.com/photo-1450133064473-71024230f91b?w=1080&q=80", // Corporate contract signing
];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      title = "India Corporate Intelligence",
      summary = "",
      h1,
      h2,
    } = body;

    const seed = Math.abs(
      title
        .split("")
        .reduce(
          (acc: number, char: string) => (acc << 5) - acc + char.charCodeAt(0),
          0,
        ),
    );

    // 1. Try Gemini first to craft a hyper-tailored prompt; fall back to deterministic topic map
    let smartResult = await generateSmartPromptWithGemini(title, summary);
    if (!smartResult) {
      smartResult = buildTopicPrompt(title, summary);
    }
    const { prompt, unsplashQuery } = smartResult;

    let imageBuffer: ArrayBuffer | null = null;
    let engine = "pollinations-ai";

    // 2. Attempt Pollinations AI generation with generous 15s timeout
    try {
      const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(
        prompt,
      )}?width=1080&height=1080&seed=${seed}&nologo=true`;

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      const aiRes = await fetch(pollinationsUrl, {
        signal: controller.signal,
        headers: {
          "User-Agent": "India-BizIntel-ImageGen/1.0",
        },
      });
      clearTimeout(timeout);

      if (aiRes.ok) {
        const buffer = await aiRes.arrayBuffer();
        if (buffer.byteLength > 8000) {
          imageBuffer = buffer;
        }
      }
    } catch (pollinationsErr) {
      console.warn(
        "Pollinations AI generation error or timeout:",
        pollinationsErr,
      );
    }

    // 3. Fallback: Search Unsplash API if key available, or use Curated Photo Pool
    if (!imageBuffer) {
      engine = "curated-stock";
      const unsplashKey = process.env.UNSPLASH_ACCESS_KEY;

      if (unsplashKey) {
        try {
          const unsplashSearchUrl = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(
            unsplashQuery,
          )}&orientation=squarish&per_page=5&client_id=${unsplashKey}`;

          const uRes = await fetch(unsplashSearchUrl);
          if (uRes.ok) {
            const uData = await uRes.json();
            const photo =
              uData.results?.[seed % Math.max(1, uData.results.length)];
            const photoUrl =
              photo?.urls?.regular || photo?.urls?.full || photo?.urls?.raw;

            if (photoUrl) {
              const imgFetch = await fetch(photoUrl);
              if (imgFetch.ok) {
                imageBuffer = await imgFetch.arrayBuffer();
              }
            }
          }
        } catch (uErr) {
          console.warn("Unsplash search fallback error:", uErr);
        }
      }

      // If still no buffer, select deterministically from curated corporate stock pool
      if (!imageBuffer) {
        const fallbackUrl =
          CURATED_BUSINESS_FALLBACKS[seed % CURATED_BUSINESS_FALLBACKS.length];
        try {
          const fallbackRes = await fetch(fallbackUrl);
          if (fallbackRes.ok) {
            imageBuffer = await fallbackRes.arrayBuffer();
          }
        } catch (fErr) {
          console.warn("Curated stock fallback fetch error:", fErr);
        }
      }
    }

    // 4. Save to Vercel Blob store or fall back to /api/og dynamic URL
    if (imageBuffer) {
      const safeSlug = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .slice(0, 30);
      const filename = `articles/${Date.now()}-${engine}-${safeSlug}.jpg`;

      const blob = await put(filename, Buffer.from(imageBuffer), {
        access: "public",
        contentType: "image/jpeg",
      });

      return NextResponse.json({
        url: blob.url,
        prompt,
        engine,
      });
    }

    // 5. Ultimate safe fallback: return dynamic /api/og URL
    const ogUrl = `/api/og?title=${encodeURIComponent(title)}&seed=${seed}${
      h1 ? `&h1=${encodeURIComponent(h1)}` : ""
    }${h2 ? `&h2=${encodeURIComponent(h2)}` : ""}`;

    return NextResponse.json({
      url: ogUrl,
      prompt,
      engine: "og-fallback",
    });
  } catch (error: unknown) {
    console.error("Image generation error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to generate visual";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
