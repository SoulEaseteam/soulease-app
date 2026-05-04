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

const CLOUD_NAME =
  (import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as string | undefined) ?? "";

/** ขนาดที่ใช้บ่อย */
export type ImageVariant = "card" | "thumb" | "hero" | "full";

interface EnhanceOptions {
  /** ความกว้างสูงสุด (px). default = card 500 */
  variant?: ImageVariant;
  /** เพิ่มเอฟเฟกต์ enhance (auto color/contrast). default true */
  enhance?: boolean;
  /** crop mode: 'limit' = ไม่บังคับขยาย / 'fill' = บังคับสัดส่วน */
  crop?: "limit" | "fill" | "thumb";
}

// 🆕 Round 28b30 (founder 2026-05-04, perf #66) — PageSpeed flagged
//   therapist cards as oversized: native fetched 500w but rendered
//   at 324–349w. Drop card variant to 400w. `dpr_auto` (retina-
//   aware Client-Hints) still upscales to 800w on iPhone Pro/etc.
//   This shaves ~319 KiB off the homepage per audit.
const widthByVariant: Record<ImageVariant, number> = {
  thumb: 160,
  card: 400,
  hero: 900,
  full: 1600,
};

/** Production domain — ใช้สำหรับสร้าง absolute URL จาก local path */
const PROD_DOMAIN = "https://sunred.vip";

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

  // data: / blob: → Cloudinary fetch ไม่ได้, return เดิม
  if (url.startsWith("data:") || url.startsWith("blob:")) {
    return url;
  }

  // ถ้าเป็น Cloudinary URL อยู่แล้ว → ไม่ wrap ซ้ำ
  if (url.includes("res.cloudinary.com")) {
    return url;
  }

  // 🌐 ถ้าเป็น relative path "/images/..." → แปลงเป็น absolute URL ก่อน
  // เพราะ Cloudinary fetch mode ต้องใช้ public absolute URL
  let absoluteUrl = url;
  if (url.startsWith("/")) {
    // Production / local dev → ใช้ window.location.origin (run-time)
    // SSR safe → fallback PROD_DOMAIN
    const origin =
      typeof window !== "undefined" && window.location.origin
        ? window.location.origin
        : PROD_DOMAIN;
    absoluteUrl = `${origin}${url}`;
  }

  // localhost ก็ใช้ Cloudinary fetch ไม่ได้ (Cloudinary CDN เข้าถึง localhost ไม่ได้)
  // → return เดิม สำหรับ dev environment
  if (absoluteUrl.includes("localhost") || absoluteUrl.includes("127.0.0.1")) {
    return url;
  }

  const { variant = "card", enhance = true, crop = "limit" } = options;
  const w = widthByVariant[variant];

  // build transformations chain
  const transforms = [
    enhance ? "e_improve" : null, // auto enhance contrast/color
    "q_auto", // auto quality
    "f_auto", // auto format (WebP/AVIF when supported)
    `w_${w}`,
    `c_${crop}`,
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
  const x2 = base.replace(/w_\d+/, `w_${widthByVariant[variant] * 2}`);
  return `${base} 1x, ${x2} 2x`;
}
