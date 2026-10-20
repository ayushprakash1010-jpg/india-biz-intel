import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    // Extract query parameters
    const title = searchParams.get("title") || "India Corporate Intelligence";
    const source = searchParams.get("source") || "India BizIntel Insights";
    const customH1 = searchParams.get("h1");
    const customH2 = searchParams.get("h2");
    const customBg = searchParams.get("bg");
    const aspect = searchParams.get("aspect") || "square"; // "square" (1:1) default for LinkedIn

    // Determine headline lines
    let part1 = customH1;
    let part2 = customH2;

    if (!part1 || !part2) {
      // Intelligently split the title into a punchy 2-line headline
      const words = title.trim().split(/\s+/);
      if (words.length <= 4) {
        const mid = Math.ceil(words.length / 2);
        part1 = words.slice(0, mid).join(" ");
        part2 = words.slice(mid).join(" ");
      } else {
        const mid = Math.min(4, Math.ceil(words.length / 2));
        part1 = words.slice(0, mid).join(" ");
        const rest = words.slice(mid, mid + 5).join(" ");
        part2 = rest + (words.length > mid + 5 ? "..." : "");
      }
    }

    // Determine background image (use passed bg, or select a curated, free high-speed visual)
    const lowerTitle = title.toLowerCase();

    // Deterministic seed based on title hash so each article gets a consistent visual
    const seed =
      Math.abs(
        title
          .split("")
          .reduce((acc, char) => (acc << 5) - acc + char.charCodeAt(0), 0),
      ) % 1000000;

    // Curated high-resolution, topic-accurate Indian Business & Corporate imagery (100% verified, 0ms rate limit)
    const topicVisuals = {
      pharma: [
        "https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=1080&q=80", // High-tech biotech laboratory research glassware
        "https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=1080&q=80", // Pharmaceutical clinical cleanroom & analysis
      ],
      ma: [
        "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=1080&q=80", // Executive handshake & corporate agreement in boardroom
        "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1080&q=80", // Skyscraper financial district towers
      ],
      retail_entry: [
        "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1080&q=80", // Luxury modern retail store & commercial entrance
        "https://images.unsplash.com/photo-1497366216548-37526070297c?w=1080&q=80", // Grand corporate glass atrium
      ],
      manufacturing: [
        "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=1080&q=80", // Advanced automated precision engineering plant
        "https://images.unsplash.com/photo-1565043589221-1a6fd9ae45c7?w=1080&q=80", // Modern automotive assembly robotics
      ],
      cxo: [
        "https://images.unsplash.com/photo-1517502884422-41eaead166d4?w=1080&q=80", // Executive glass boardroom overlooking cityscape
        "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=1080&q=80", // Corporate leadership in glass executive office
      ],
      funding: [
        "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=1080&q=80", // Illuminated stock market & financial analytics
        "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=1080&q=80", // Dynamic capital market trading charts
        "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=1080&q=80", // Venture capital growth & investment
      ],
      expansion: [
        "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1080&q=80", // Modern corporate glass towers
        "https://images.unsplash.com/photo-1577495508048-b635879837f1?w=1080&q=80", // Futuristic corporate glass campus
      ],
      tech_gcc: [
        "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=1080&q=80", // Enterprise tech engineering workstation
        "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1080&q=80", // Global engineering capability collaboration
      ],
      general: [
        "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1080&q=80", // Sleek architectural skyscraper
        "https://images.unsplash.com/photo-1497366216548-37526070297c?w=1080&q=80", // Modern glass innovation center
      ],
    };

    let fallbackUrl = "";
    if (
      lowerTitle.includes("pharma") ||
      lowerTitle.includes("biopharma") ||
      lowerTitle.includes("biotech") ||
      lowerTitle.includes("drug") ||
      lowerTitle.includes("health") ||
      lowerTitle.includes("hospital") ||
      lowerTitle.includes("organon") ||
      lowerTitle.includes("sun pharma") ||
      lowerTitle.includes("medicine")
    ) {
      fallbackUrl = topicVisuals.pharma[seed % topicVisuals.pharma.length];
    } else if (
      lowerTitle.includes("acquire") ||
      lowerTitle.includes("acquisition") ||
      lowerTitle.includes("buyout") ||
      lowerTitle.includes("merger") ||
      lowerTitle.includes("m&a") ||
      lowerTitle.includes("bought") ||
      lowerTitle.includes("stake") ||
      lowerTitle.includes("pact") ||
      lowerTitle.includes("deal")
    ) {
      fallbackUrl = topicVisuals.ma[seed % topicVisuals.ma.length];
    } else if (
      lowerTitle.includes("enter") ||
      lowerTitle.includes("enters") ||
      lowerTitle.includes("entry") ||
      lowerTitle.includes("flagship") ||
      lowerTitle.includes("store") ||
      lowerTitle.includes("retail") ||
      lowerTitle.includes("fabletics") ||
      lowerTitle.includes("launch")
    ) {
      fallbackUrl =
        topicVisuals.retail_entry[seed % topicVisuals.retail_entry.length];
    } else if (
      lowerTitle.includes("cement") ||
      lowerTitle.includes("steel") ||
      lowerTitle.includes("plant") ||
      lowerTitle.includes("factory") ||
      lowerTitle.includes("manufacturing") ||
      lowerTitle.includes("automotive") ||
      lowerTitle.includes("car") ||
      lowerTitle.includes("terminal") ||
      lowerTitle.includes("cargo") ||
      lowerTitle.includes("ultratech") ||
      lowerTitle.includes("hyundai") ||
      lowerTitle.includes("jindal")
    ) {
      fallbackUrl =
        topicVisuals.manufacturing[seed % topicVisuals.manufacturing.length];
    } else if (
      lowerTitle.includes("funding") ||
      lowerTitle.includes("raised") ||
      lowerTitle.includes("round") ||
      lowerTitle.includes("series") ||
      lowerTitle.includes("valuation") ||
      lowerTitle.includes("capital") ||
      lowerTitle.includes("invest") ||
      lowerTitle.includes("ipo") ||
      lowerTitle.includes("anchor book") ||
      lowerTitle.includes("bids")
    ) {
      fallbackUrl = topicVisuals.funding[seed % topicVisuals.funding.length];
    } else if (
      lowerTitle.includes("cxo") ||
      lowerTitle.includes("leader") ||
      lowerTitle.includes("ceo") ||
      lowerTitle.includes("appoint") ||
      lowerTitle.includes("md") ||
      lowerTitle.includes("director") ||
      lowerTitle.includes("managing") ||
      lowerTitle.includes("steps down") ||
      lowerTitle.includes("resigns") ||
      lowerTitle.includes("successor") ||
      lowerTitle.includes("tata")
    ) {
      fallbackUrl = topicVisuals.cxo[seed % topicVisuals.cxo.length];
    } else if (
      lowerTitle.includes("gcc") ||
      lowerTitle.includes("capability center") ||
      lowerTitle.includes("jpmorgan") ||
      lowerTitle.includes("r&d") ||
      lowerTitle.includes("hires")
    ) {
      fallbackUrl = topicVisuals.tech_gcc[seed % topicVisuals.tech_gcc.length];
    } else if (
      lowerTitle.includes("expansion") ||
      lowerTitle.includes("expand") ||
      lowerTitle.includes("office") ||
      lowerTitle.includes("facility") ||
      lowerTitle.includes("capacity") ||
      lowerTitle.includes("leasing")
    ) {
      fallbackUrl =
        topicVisuals.expansion[seed % topicVisuals.expansion.length];
    } else {
      fallbackUrl = topicVisuals.general[seed % topicVisuals.general.length];
    }

    // Pre-fetch the background image into base64.
    // We try the custom background first (e.g. real news photo), then fall back to the curated topic visual.
    let bgDataUri: string | null = null;
    const fetchImageAsBase64 = async (url: string, timeoutMs: number) => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), timeoutMs);
        const imgRes = await fetch(url, {
          signal: controller.signal,
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            Accept: "image/*,*/*;q=0.8",
          },
        });
        clearTimeout(timeout);
        if (imgRes.ok) {
          const buffer = await imgRes.arrayBuffer();
          if (buffer.byteLength > 1000) {
            const base64 = Buffer.from(buffer).toString("base64");
            const mime = imgRes.headers.get("content-type") || "image/jpeg";
            return `data:${mime};base64,${base64}`;
          }
        }
      } catch {
        // Fetch failed or timed out
      }
      return null;
    };

    if (customBg) {
      bgDataUri = await fetchImageAsBase64(customBg, 4000);
    }

    // If no custom background was provided or if fetching it failed, use the reliable curated topic image
    if (!bgDataUri && fallbackUrl) {
      bgDataUri = await fetchImageAsBase64(fallbackUrl, 3000);
    }

    const isSquare = aspect !== "landscape";
    const width = isSquare ? 1080 : 1200;
    const height = isSquare ? 1080 : 630;

    return new ImageResponse(
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          position: "relative",
          backgroundColor: "#070b19",
          overflow: "hidden",
          fontFamily: "sans-serif",
        }}
      >
        {/* 1. Photorealistic Background Image or Ambient Tech Slate Gradient */}
        {bgDataUri ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={bgDataUri}
            alt=""
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        ) : (
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              background:
                "radial-gradient(circle at 75% 25%, #1e293b 0%, #0f172a 45%, #020617 100%)",
            }}
          />
        )}

        {/* 2. Top-to-Bottom Multi-Stop Vignette Overlay for Seamless Logo Blending and High Typography Contrast */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: isSquare ? "460px" : "320px",
            background:
              "linear-gradient(180deg, rgba(7, 11, 25, 0.96) 0%, rgba(7, 11, 25, 0.88) 50%, rgba(7, 11, 25, 0.45) 80%, rgba(7, 11, 25, 0) 100%)",
          }}
        />

        {/* 3. Top Header: Official India BizIntel Brand Lockup */}
        <div
          style={{
            position: "absolute",
            top: isSquare ? 48 : 36,
            left: isSquare ? 56 : 48,
            display: "flex",
            alignItems: "center",
            zIndex: 10,
          }}
        >
          {/* Logo Badge: Vibrant Orange-to-Rose gradient with IB */}
          <div
            style={{
              width: isSquare ? 56 : 46,
              height: isSquare ? 56 : 46,
              borderRadius: isSquare ? 12 : 10,
              background: "linear-gradient(135deg, #f97316 0%, #e11d48 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 8px 24px rgba(249, 115, 22, 0.45)",
              border: "1.5px solid rgba(255, 255, 255, 0.25)",
              marginRight: isSquare ? 16 : 14,
            }}
          >
            <span
              style={{
                color: "#ffffff",
                fontWeight: 900,
                fontSize: isSquare ? 28 : 22,
                letterSpacing: -1,
                fontFamily: "sans-serif",
              }}
            >
              IB
            </span>
          </div>

          {/* Brand Wordmark & Tagline */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
            }}
          >
            <span
              style={{
                color: "#ffffff",
                fontWeight: 900,
                fontSize: isSquare ? 32 : 26,
                letterSpacing: -0.5,
                lineHeight: 1.1,
                fontFamily: "sans-serif",
                textShadow: "0 2px 8px rgba(0, 0, 0, 0.8)",
              }}
            >
              India BizIntel
            </span>
            <span
              style={{
                color: "#f97316",
                fontWeight: 700,
                fontSize: isSquare ? 12 : 10,
                letterSpacing: 2,
                textTransform: "uppercase",
                marginTop: 3,
                fontFamily: "sans-serif",
                textShadow: "0 1px 4px rgba(0, 0, 0, 0.8)",
              }}
            >
              Corporate Intelligence
            </span>
          </div>
        </div>

        {/* 4. Dual-Tone Bold Headline in Upper Quadrant */}
        <div
          style={{
            position: "absolute",
            top: isSquare ? 168 : 130,
            left: isSquare ? 56 : 48,
            right: isSquare ? 56 : 48,
            display: "flex",
            flexDirection: "column",
            zIndex: 10,
          }}
        >
          <div
            style={{
              fontSize: isSquare ? 52 : 44,
              fontWeight: 900,
              color: "#ffffff",
              lineHeight: 1.15,
              letterSpacing: "-0.02em",
              textShadow: "0 2px 10px rgba(0, 0, 0, 0.5)",
            }}
          >
            {part1}
          </div>
          <div
            style={{
              fontSize: isSquare ? 52 : 44,
              fontWeight: 900,
              color: "#38bdf8", // Vibrant Sky Cyan / Teal Accent
              lineHeight: 1.15,
              letterSpacing: "-0.02em",
              marginTop: 6,
              textShadow: "0 2px 10px rgba(0, 0, 0, 0.5)",
            }}
          >
            {part2}
          </div>
        </div>

        {/* 5. Sleek Solid Black Bottom Bar (Cleanly Conceals Any Background Watermarks and Grounds the Graphic) */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: isSquare ? "78px" : "64px",
            backgroundColor: "#000000",
            borderTop: "1px solid rgba(255, 255, 255, 0.12)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            paddingLeft: isSquare ? 56 : 48,
            paddingRight: isSquare ? 56 : 48,
            zIndex: 15,
          }}
        >
          <div
            style={{
              backgroundColor: "rgba(56, 189, 248, 0.15)",
              border: "1px solid rgba(56, 189, 248, 0.4)",
              padding: "6px 20px",
              borderRadius: "20px",
              color: "#7dd3fc",
              fontSize: isSquare ? 17 : 14,
              fontWeight: 700,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            {source}
          </div>
          <div
            style={{
              color: "#94a3b8",
              fontSize: isSquare ? 19 : 15,
              fontWeight: 600,
              letterSpacing: "0.04em",
              display: "flex",
              alignItems: "center",
            }}
          >
            indiabizintel.com
          </div>
        </div>
      </div>,
      {
        width,
        height,
        headers: {
          "Cache-Control":
            "public, max-age=604800, s-maxage=604800, stale-while-revalidate=86400",
        },
      },
    );
  } catch (e: unknown) {
    console.error(e);
    return new Response("Failed to generate image", { status: 500 });
  }
}
