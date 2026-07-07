// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * ⚠️ ROLLBACK Round 28b13b — manualChunks ทำให้เกิด TDZ crash อีก
 *    "Cannot access 'X' before initialization" → จอขาวบน production
 *    เก็บ comment ไว้เตือนใจว่าเคสนี้แม้ split แบบ "ปลอดภัย" ก็พัง
 *
 * อนาคต ถ้าจะลอง split อีก ต้อง:
 *   - ทดสอบบน production preview ก่อน merge
 *   - ใช้ vite-plugin-bundle-analyzer หา circular deps ก่อน
 *   - อาจต้อง upgrade vite/rollup version ก่อน
 *
 * ตอนนี้ปล่อย rollup auto-split ตาม dynamic-import boundaries (lazy
 * routes ใน App.tsx ก็ทำให้ split ระดับหนึ่งอยู่แล้ว — แค่ initial
 * main bundle ใหญ่กว่าที่ควร แต่ไม่ crash)
 *
 * Round 28b13 perf wins ที่ยังเหลือ (ไม่กระทบจอขาว):
 *   ✅ ToastContainer lazy
 *   ✅ Chonburi font ออกจาก main bundle
 *   ✅ i18n locales lazy (เฉพาะ active lang)
 *   ✅ Google Fonts non-blocking (media print → all)
 */
export default defineConfig({
  plugins: [react()],
  // 🆕 Round 28s290 — honor a harness/env-assigned PORT (Vite doesn't read
  //   PORT on its own). Falls back to 5173 for a plain `npm run dev`.
  //   strictPort:false so it auto-increments if the chosen port is busy.
  server: {
    port: Number(process.env.PORT) || 5173,
    strictPort: false,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@lib": path.resolve(__dirname, "src/lib"),
      "@utils": path.resolve(__dirname, "src/utils"),
      "@pages": path.resolve(__dirname, "src/pages"),
      "@components": path.resolve(__dirname, "src/components"),
      "@providers": path.resolve(__dirname, "src/providers"),
      "@layouts": path.resolve(__dirname, "src/layouts"),
      "@hooks": path.resolve(__dirname, "src/hooks"),
      "@routes": path.resolve(__dirname, "src/routes"),
      "@services": path.resolve(__dirname, "src/services"),
      "@types": path.resolve(__dirname, "src/types"),
      "@assets": path.resolve(__dirname, "src/assets"),
      "@data": path.resolve(__dirname, "src/data"),
    },
  },
  build: {
    chunkSizeWarningLimit: 2000,
    // ⚠️ ห้ามใช้ manualChunks — เคยเกิด TDZ crash + จอขาว
    //    rollup auto-split ผ่าน lazy routes ก็พอแล้ว safest
  },
});
