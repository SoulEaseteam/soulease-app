// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * ⚠️ EMERGENCY MODE: ปิด manualChunks ทั้งหมด
 *
 * เคสที่เคยเจอ:
 *   - manualChunks ที่แยกแม้แต่ heavy admin libs ก็เกิด TDZ crash
 *   - "Cannot access 'X' before initialization"
 *   - หน้าจอขาวบน production ทุก browser
 *
 * ไม่ระบุ manualChunks เลย → rollup auto-split ตาม dynamic import boundaries
 * → safest possible config
 *
 * Trade-off: chunk แต่ละตัวอาจใหญ่ขึ้น แต่ stable 100%
 * ค่อย optimize ทีหลังเมื่อหา root cause ของ TDZ ได้
 */
export default defineConfig({
  plugins: [react()],
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
    // ⚠️ ไม่ใช้ manualChunks — ปล่อย rollup auto-split (safe)
  },
});
