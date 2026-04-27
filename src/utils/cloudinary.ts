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

const widthByVariant: Record<ImageVariant, number> = {
  thumb: 160,
  card: 500,
  hero: 900,
  full: 1600,
};

/**
 * แปลง image URL ปกติ → Cloudinary fetch URL พร้อม optimization
 *
 * @example
 *   enhanceImage("https://example.com/photo.jpg")
 *   → https://res.cloudinary.com/xxx/image/fetch/e_improve,q_auto,f_auto,w_500,c_limit/...
 *
 *   enhanceImage("/images/local.jpg") // local → return เดิม (Cloudinary fetch ไม่ได้)
 */
export function enhanceImage(
  url: string | undefined | null,
  options: EnhanceOptions = {}
): string {
  if (!url) return "";

  // ถ้าไม่ได้ตั้ง CLOUD_NAME → return เดิม (graceful fallback)
  if (!CLOUD_NAME) return url;

  // local path / data url → Cloudinary fetch ไม่ได้, return เดิม
  if (url.startsWith("/") || url.startsWith("data:") || url.startsWith("blob:")) {
    return url;
  }

  // ถ้าเป็น Cloudinary URL อยู่แล้ว → ไม่ wrap ซ้ำ
  if (url.includes("res.cloudinary.com")) {
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
    url
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
