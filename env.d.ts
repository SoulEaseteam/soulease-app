/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GOOGLE_MAPS_API_KEY: string;
  readonly VITE_TELEGRAM_BOT_TOKEN: string;
  readonly VITE_TELEGRAM_CHAT_ID: string;
  readonly VITE_USE_MOCK_DIST: string;
}
interface ImportMeta { readonly env: ImportMetaEnv; }

// ให้ TypeScript รู้ว่าไฟล์เหล่านี้ถูก import มาเป็น string
/// <reference types="vite/client" />

// src/env.d.ts
/// <reference types="vite/client" />
declare module "*.svg?raw"  { const src: string; export default src; }
declare module "*.html?raw" { const src: string; export default src; }
declare module "*.txt?raw"  { const src: string; export default src; }