/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GOOGLE_MAPS_API_KEY: string;
  readonly VITE_USE_MOCK_DIST: string;
  // ⚠️ Telegram secrets ย้ายไป Cloud Functions แล้ว (functions/src/index.ts)
  // อย่าใส่ VITE_TELEGRAM_* ที่นี่ — VITE_ env vars ถูก bundle เข้า client
}
interface ImportMeta { readonly env: ImportMetaEnv; }

// ให้ TypeScript รู้ว่าไฟล์เหล่านี้ถูก import มาเป็น string
/// <reference types="vite/client" />

// src/env.d.ts
/// <reference types="vite/client" />
declare module "*.svg?raw"  { const src: string; export default src; }
declare module "*.html?raw" { const src: string; export default src; }
declare module "*.txt?raw"  { const src: string; export default src; }