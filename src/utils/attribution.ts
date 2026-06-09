// src/utils/attribution.ts
//
// 🆕 Round 28s229 (founder: "ให้บอทบอกว่าลูกค้ามาจากการค้นหาอะไร + ประเทศไหน")
//   First-touch marketing attribution. Captured ONCE on app boot — before the
//   SPA router navigates and strips the URL query — then persisted in
//   sessionStorage so it survives the whole visit through to the booking write.
//
//   NOTE on "what keyword did they search": the exact Google search term is
//   NOT available to any website (Google strips it from the referrer since
//   2011, "not provided"). What we CAN capture — and what actually drives
//   marketing decisions — is the SOURCE/CHANNEL (Google vs Telegram vs
//   Xiaohongshu vs WhatsApp vs direct), any UTM campaign tag on the link, and
//   the landing page. Country is derived from the phone dial code at send time
//   (see functions/src/index.ts).

const KEY = "sr_attribution_v1";

export interface Attribution {
  /** Classified channel: google | bing | baidu | naver | duckduckgo |
   *  telegram | xiaohongshu | wechat | whatsapp | line | facebook |
   *  instagram | tiktok | direct | other | <utm_source verbatim>. */
  source: string;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  /** First path the visitor landed on, e.g. "/zh/services". */
  landingPath: string;
  /** Referring hostname (null if direct / same-origin). */
  referrerHost: string | null;
  capturedAt: string;
}

function classifyReferrer(host: string): string {
  const h = host.toLowerCase();
  if (h.includes("google")) return "google";
  if (h.includes("bing")) return "bing";
  if (h.includes("baidu")) return "baidu";
  if (h.includes("naver")) return "naver";
  if (h.includes("duckduckgo")) return "duckduckgo";
  if (h.includes("yandex")) return "yandex";
  if (h.includes("t.me") || h.includes("telegram")) return "telegram";
  if (h.includes("xiaohongshu") || h.includes("xhslink") || h.includes("xhs"))
    return "xiaohongshu";
  if (h.includes("weixin") || h.includes("wechat")) return "wechat";
  if (h.includes("whatsapp") || h.includes("wa.me")) return "whatsapp";
  if (h.includes("line.me") || h.includes("lin.ee")) return "line";
  if (h.includes("facebook") || h.startsWith("fb.") || h.includes("fb.com"))
    return "facebook";
  if (h.includes("instagram")) return "instagram";
  if (h.includes("tiktok") || h.includes("douyin")) return "tiktok";
  if (h.includes("mafengwo") || h.includes("ctrip") || h.includes("trip.com"))
    return "travel-cn";
  return "other";
}

/** Capture first-touch attribution. Idempotent (first-touch only), never
 *  throws — analytics must never break the app. Call once at app boot. */
export function captureAttribution(): void {
  if (typeof window === "undefined") return;
  try {
    if (sessionStorage.getItem(KEY)) return; // first-touch wins

    const params = new URLSearchParams(window.location.search);
    const utmSource = params.get("utm_source");

    const ref = document.referrer || "";
    let referrerHost: string | null = null;
    if (ref) {
      try {
        referrerHost = new URL(ref).hostname;
      } catch {
        referrerHost = null;
      }
    }
    const sameOrigin =
      !!referrerHost && referrerHost === window.location.hostname;

    const source = utmSource
      ? utmSource.toLowerCase()
      : sameOrigin || !referrerHost
        ? "direct"
        : classifyReferrer(referrerHost);

    const attr: Attribution = {
      source,
      utmSource,
      utmMedium: params.get("utm_medium"),
      utmCampaign: params.get("utm_campaign"),
      landingPath: window.location.pathname || "/",
      referrerHost: sameOrigin ? null : referrerHost,
      capturedAt: new Date().toISOString(),
    };
    sessionStorage.setItem(KEY, JSON.stringify(attr));
  } catch {
    /* never break the app for analytics */
  }
}

/** Read the stored attribution (null if none / unavailable). */
export function getAttribution(): Attribution | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Attribution) : null;
  } catch {
    return null;
  }
}
