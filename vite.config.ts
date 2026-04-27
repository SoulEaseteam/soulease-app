// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * ⚠️ บทเรียน TDZ (Temporal Dead Zone) crashes ใน production:
 *
 *   manualChunks ที่แยกละเอียดเกินไป → rollup สร้าง chunks ที่มี circular import
 *   → เบราว์เซอร์โหลด init order ผิด → "Cannot access 'X' before initialization" → จอขาว
 *
 *   เคสที่เคยเจอ: emotion ↔ mui ↔ react-vendor circular
 *
 * แนวทางใหม่ (safe):
 * - แยกเฉพาะ libs ที่ "lazy-load อยู่แล้ว" (admin-only / export tools / charts)
 * - core stack (react / mui / emotion / firebase) → ปล่อย rollup auto-split
 *   = ไม่มีโอกาส circular เพราะ rollup เห็น dep graph ทั้งหมดและตัดสินใจเอง
 * - bundle ใหญ่ขึ้นนิด แต่ stable 100%
 */
function manualChunks(id: string): string | undefined {
  if (!id.includes("node_modules")) return undefined;

  // 🟦 Heavy ADMIN-ONLY libs — ตัวจริง lazy-load (admin pages เท่านั้น)
  if (id.includes("/@mui/x-data-grid")) return "mui-x-data-grid";
  if (id.includes("/@mui/x-date-pickers")) return "mui-x-date-pickers";
  if (id.includes("/recharts/") || id.includes("/d3-")) return "charts";

  // 🟧 Export libs — หนักมาก ใช้แค่ admin export Excel/PDF
  if (
    id.includes("/exceljs/") ||
    id.includes("/jspdf/") ||
    id.includes("/html2canvas/") ||
    id.includes("/file-saver/")
  ) {
    return "export-libs";
  }

  // ที่เหลือ → ปล่อย rollup auto-split
  // (react, react-dom, mui-core, emotion, firebase, framer-motion ฯลฯ)
  return undefined;
}

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
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks,
      },
    },
  },
});
