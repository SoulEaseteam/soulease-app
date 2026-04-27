/// <reference types="vite/client" />

// ──────────────────────────────────────────────
// Vite env vars ที่ใช้ใน client
// ทุกตัวต้องขึ้นต้นด้วย VITE_ ถึงจะถูก expose
// ⚠️ secret ที่ไม่ควรหลุด → ใช้ Cloud Functions secrets แทน
// ──────────────────────────────────────────────
interface ImportMetaEnv {
  // 🔥 Firebase web config (public-safe)
  readonly VITE_FIREBASE_API_KEY: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN: string;
  readonly VITE_FIREBASE_PROJECT_ID: string;
  readonly VITE_FIREBASE_STORAGE_BUCKET: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string;
  readonly VITE_FIREBASE_APP_ID: string;
  readonly VITE_FIREBASE_MEASUREMENT_ID?: string;

  // 🌍 Google Maps (browser key — restrict by HTTP referrer)
  readonly VITE_GOOGLE_MAPS_API_KEY: string;

  // 🌦️ OpenWeather
  readonly VITE_OPENWEATHER_KEY?: string;

  // 🧪 Mock mode (ใช้ใน dev เท่านั้น)
  readonly VITE_USE_MOCK_DIST?: string;

  // 🖼️  Cloudinary (image enhancement) — set ที่ Vercel env
  readonly VITE_CLOUDINARY_CLOUD_NAME?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// ให้ TypeScript รู้ว่าไฟล์เหล่านี้ถูก import มาเป็น string
declare module "*.svg?raw" {
  const src: string;
  export default src;
}
declare module "*.html?raw" {
  const src: string;
  export default src;
}
declare module "*.txt?raw" {
  const src: string;
  export default src;
}
