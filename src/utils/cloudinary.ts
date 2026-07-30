// src/utils/cloudinary.ts
//
// 🖼️  Cloudinary URL transformer — auto enhance + WebP + resize
//
// ใช้ "fetch" mode = ไม่ต้อง upload ภาพไป Cloudinary ก่อน
// แค่เปลี่ยน URL ปลายทาง → Cloudinary CDN ดึงต้นฉบับมาแปลงให้สด ๆ
//
// Setup:
//   1. signup ที่ https://cloudinary.com (free 25GB/month)
//   2. copy "Cloud name" จาก Dashboard
//   3. add ที่ Vercel env: VITE_CLOUDINARY_CLOUD_NAME=xxxxx
//
// Fallback ปลอดภัย: ถ้า env ไม่ตั้ง → return URL เดิม (ไม่พัง)

import { isCloudinaryDown } from "@/utils/imageFallback";

// 🆕 28x.24 (founder: "รูปบนเว็บไม่ชัด") — fall back to the public cloud
//   name instead of "" when the env var is absent. Local/CLI builds don't
//   inherit Vercel's VITE_CLOUDINARY_CLOUD_NAME, so a `vercel --prod` from
//   this machine was silently shipping RAW Firebase images (unoptimised, no
//   WebP, no quality control) — Cloudinary would flip on/off between
//   deploys. The cloud name is already public (index.html OG tags), so this
//   is not a secret; the env var still overrides it when present.
const CLOUD_NAME =
  (import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as string | undefined) ||
  "dhzvzvatb";

// 🔴 Round 28x.158 (founder: "ไฟล์ต้นฉบับตรง ๆ deploy") — THE PROXY IS OFF BY
//   DEFAULT. Every image is now served straight from our own origin, and this
//   whole module is dormant unless someone sets `VITE_CLOUDINARY_ENABLED=1`.
//
//   Why the default flipped, after 28x.156 traced a total site-wide image
//   outage to this one metered dependency and 28x.157 measured the files:
//     • The roster photos are 959–1034 × 1280 at 94–168 KB. They are already
//       small AND already sharp — there was never much for an optimiser to win
//       here, and 28x.157 found the proxy was actively LOSING quality by
//       downscaling to 400px (dpr_auto is a no-op on Safari).
//     • Serving them ourselves cannot run out of credits, cannot get an account
//       restricted, and cannot take every photo on the site down at once. That
//       failure already happened in production.
//
//   What is genuinely given up: WebP/AVIF conversion (so slightly heavier
//   transfers), `e_improve`/`e_sharpen` auto-enhancement, and `g_face` avatar
//   framing — the last of which already has a CSS fallback in
//   TherapistIdentityCard. Accepted deliberately: unoptimised-but-visible beats
//   optimised-but-gone on a site whose product IS the photograph.
//
//   Everything below still works — set the env var and it comes back exactly as
//   it was, no code change.
const CLOUDINARY_ENABLED =
  String(import.meta.env.VITE_CLOUDINARY_ENABLED ?? "") === "1";

/** ขนาดที่ใช้บ่อย */
export type ImageVariant = "card" | "thumb" | "hero" | "full";

interface EnhanceOptions {
  /** ความกว้างสูงสุด (px). default = card 500 */
  variant?: ImageVariant;
  /** เพิ่มเอฟเฟกต์ enhance (auto color/contrast). default true */
  enhance?: boolean;
  /** crop mode: 'limit' = ไม่บังคับขยาย / 'fill' = บังคับสัดส่วน */
  crop?: "limit" | "fill" | "thumb";
  /**
   * 🆕 Round 28x.129 (founder: "รูปพนักงานซูมเข้าให้เห็นใบหน้า เพราะหลุดขอบ")
   *
   * Square face-centred crop, for round avatars. The roster photos are
   * full-body studio portraits, so a CSS `object-fit: cover` circle centres on
   * the torso and slices the head off at the top — which is what she's seeing.
   * `c_thumb,g_face` asks Cloudinary to find the face and crop around it, so
   * the framing follows the subject instead of a fixed guess; every photo is
   * already proxied through Cloudinary fetch, so this needs no re-upload.
   *
   * `zoom` is how tight: 0.7 ≈ head and shoulders (default), lower = wider.
   * When Cloudinary detects no face it falls back to a centred thumb crop —
   * no worse than the current behaviour, never a broken URL.
   */
  face?: boolean;
  /** Face-crop tightness (Cloudinary z_). Only read when `face` is true. */
  zoom?: number;
}

// 🆕 Round 28x.157 (founder: "อย่า บีบ รูป ให้คงความชัด") — widths raised so a
//   card is never served a downscaled photo.
//
//   ⚠️ The 28b30 note this replaces relied on `dpr_auto` to restore retina
//   resolution ("still upscales to 800w on iPhone Pro"). It does not: dpr_auto
//   reads the `Sec-CH-DPR` client hint, and SAFARI HAS NEVER SENT IT. On every
//   iPhone — which is what the founder and most guests browse on — dpr_auto
//   silently resolves to 1x, so `w_400` really did mean a 400px file painted
//   into a ~585px retina slot. That is the softness she has reported three
//   times now (28x.24 "รูปบนเว็บไม่ชัด", 28x.25 "รูปทุกที่ไม่ชัด", and this
//   round), and no amount of `e_sharpen` fixes a missing pixel.
//
//   Setting the base width above the source resolution is safe and cheap:
//   `c_limit` NEVER upscales, so these numbers mean "serve the original, don't
//   shrink it", and the roster photos are only 959–1034 × 1280 at 94–168 KB
//   each. Full quality here costs almost nothing — the old 400px cap was
//   trading real sharpness for a saving that was never large.
const widthByVariant: Record<ImageVariant, number> = {
  thumb: 320,
  card: 800,
  hero: 1400,
  full: 2000,
};

/** Production domain — ใช้สำหรับสร้าง absolute URL จาก local path */
const PROD_DOMAIN = "https://sunred.vip";

/**
 * A relative "/images/..." path made absolute.
 *
 * 🆕 28x.156 — extracted from enhanceImage(), which needed it because
 * Cloudinary fetch mode requires a publicly reachable URL. It is now also the
 * bypass path: when the proxy is off or down, this IS the src we hand the
 * browser. A relative path would work fine in the browser, but keeping one
 * shape means the URL the fallback listener recovers and the URL enhanceImage
 * returns are always identical strings.
 */
export function absoluteImageUrl(url: string): string {
  if (!url.startsWith("/")) return url;
  // Runtime origin in the browser; PROD_DOMAIN during the SSR prerender pass.
  const origin =
    typeof window !== "undefined" && window.location.origin
      ? window.location.origin
      : PROD_DOMAIN;
  return `${origin}${url}`;
}

/**
 * แปลง image URL ปกติ → Cloudinary fetch URL พร้อม optimization
 *
 * @example
 *   enhanceImage("https://example.com/photo.jpg")
 *   → https://res.cloudinary.com/xxx/image/fetch/e_improve,q_auto,f_auto,w_500,c_limit/...
 *
 *   enhanceImage("/images/local.jpg")
 *   → https://res.cloudinary.com/xxx/image/fetch/.../https://sunred.vip/images/local.jpg
 */
export function enhanceImage(
  url: string | undefined | null,
  options: EnhanceOptions = {}
): string {
  if (!url) return "";

  // ถ้าไม่ได้ตั้ง CLOUD_NAME → return เดิม (graceful fallback)
  if (!CLOUD_NAME) return url;

  // 🔴 28x.158 — the default path: hand back the origin URL untouched.
  //   Also covers the 28x.156 runtime latch, for the case someone re-enables
  //   the proxy and it fails again mid-session.
  if (!CLOUDINARY_ENABLED || isCloudinaryDown()) {
    return absoluteImageUrl(url);
  }

  // data: / blob: → Cloudinary fetch ไม่ได้, return เดิม
  if (url.startsWith("data:") || url.startsWith("blob:")) {
    return url;
  }

  // ถ้าเป็น Cloudinary URL อยู่แล้ว → ไม่ wrap ซ้ำ
  if (url.includes("res.cloudinary.com")) {
    return url;
  }

  const absoluteUrl = absoluteImageUrl(url);

  // localhost ก็ใช้ Cloudinary fetch ไม่ได้ (Cloudinary CDN เข้าถึง localhost ไม่ได้)
  // → return เดิม สำหรับ dev environment
  if (absoluteUrl.includes("localhost") || absoluteUrl.includes("127.0.0.1")) {
    return url;
  }

  const { variant = "card", enhance = true, crop = "limit", face = false, zoom = 0.7 } = options;
  const w = widthByVariant[variant];

  // build transformations chain
  const transforms = [
    enhance ? "e_improve" : null, // auto enhance contrast/color
    // 🆕 28x.25 (founder: "รูปทุกที่ไม่ชัด") — the stored source photos are
    //   only ~600px (old upload cap), so on larger surfaces they read soft.
    //   `e_sharpen` adds edge crispness so existing photos LOOK noticeably
    //   sharper everywhere without a re-upload. Moderate strength keeps skin
    //   natural (not over-processed).
    "e_sharpen:100",
    // 🆕 Round 28x.157 (founder: "อย่า บีบ รูป ให้คงความชัด") — was
    //   `q_auto:good`, which is still lossy re-compression on top of an
    //   already-compressed JPEG. `q_auto:best` is Cloudinary's highest
    //   automatic tier: visually indistinguishable from the source, and on
    //   these files it barely moves the byte count because they are ~100 KB
    //   originals, not multi-megabyte camera dumps.
    "q_auto:best",
    "f_auto", // auto format (WebP/AVIF when supported)
    `w_${w}`,
    // Face mode forces a SQUARE (h_ = w_) so the circle mask has no spare
    // pixels to crop away on its own — the framing is decided server-side by
    // g_face, not by whatever object-fit happens to do with the aspect ratio.
    face ? `h_${w}` : null,
    face ? `c_thumb,g_face,z_${zoom}` : `c_${crop}`,
    "dpr_auto", // retina-aware
  ]
    .filter(Boolean)
    .join(",");

  return `https://res.cloudinary.com/${CLOUD_NAME}/image/fetch/${transforms}/${encodeURIComponent(
    absoluteUrl
  )}`;
}

/** shortcut สำหรับใช้ใน <img srcSet> ให้ retina ชัด */
export function enhanceImageSrcSet(
  url: string | undefined | null,
  variant: ImageVariant = "card"
): string {
  if (!url || !CLOUD_NAME) return "";
  const base = enhanceImage(url, { variant });
  // 🆕 28x.158 — with the proxy off, `base` is the origin URL and carries no
  //   `w_` to rewrite, so both densities resolve to the same full-resolution
  //   file. That is the correct outcome (one sharp original, no upscale), not
  //   a bug to code around.
  const x2 = base.replace(/w_\d+/, `w_${widthByVariant[variant] * 2}`);
  return `${base} 1x, ${x2} 2x`;
}
