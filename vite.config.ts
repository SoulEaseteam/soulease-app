// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * แยก vendor libraries ออกเป็น chunks ต่างกัน
 *
 * ⚠️ บทเรียนสำคัญ — circular chunk → TDZ runtime error:
 *   ก่อนหน้านี้แยก emotion, vendor, react-vendor เป็น 3 chunks
 *   → rollup เตือน "Circular chunk: vendor → react-vendor → emotion → vendor"
 *   → ใน production บราว์เซอร์ throw "Cannot access 'H' before initialization" → จอขาว
 *
 * วิธีกัน TDZ:
 * 1) อย่าให้ chunk ที่ "นำเข้ากันและกัน" ถูกแยก
 * 2) emotion = peer dep ของ MUI → รวม emotion เข้ากับ mui chunk
 * 3) "vendor" catch-all ตัดออก → ปล่อย rollup จัดการเอง (ปลอดภัยกว่า)
 */
function manualChunks(id: string): string | undefined {
  if (!id.includes("node_modules")) return undefined;

  // React core — โหลดทุกหน้า
  if (
    id.includes("/react/") ||
    id.includes("/react-dom/") ||
    id.includes("/scheduler/") ||
    id.includes("/react-router")
  ) {
    return "react-vendor";
  }

  // MUI X — หนักมาก ใช้แค่ admin
  if (id.includes("/@mui/x-data-grid")) return "mui-x-data-grid";
  if (id.includes("/@mui/x-date-pickers")) return "mui-x-date-pickers";

  // MUI core + Emotion (peer dep) อยู่ chunk เดียวกัน
  // → ป้องกัน circular: mui imports emotion, emotion imports react
  if (
    id.includes("/@mui/material") ||
    id.includes("/@mui/system") ||
    id.includes("/@mui/lab") ||
    id.includes("/@mui/utils") ||
    id.includes("/@mui/private-theming") ||
    id.includes("/@mui/styled-engine") ||
    id.includes("/@emotion/")
  ) {
    return "mui";
  }
  if (id.includes("/@mui/icons-material")) return "mui-icons";

  // Firebase — หนัก ใช้หลายหน้า
  if (
    id.includes("/firebase/") ||
    id.includes("/@firebase/") ||
    id.includes("/firebase-functions/")
  ) {
    return "firebase";
  }

  // Charts — recharts หนัก ใช้แค่ admin dashboard
  if (id.includes("/recharts/") || id.includes("/d3-")) return "charts";

  // Export libs — หนักมาก lazy load บ่อย
  if (
    id.includes("/exceljs/") ||
    id.includes("/jspdf/") ||
    id.includes("/html2canvas/") ||
    id.includes("/file-saver/")
  ) {
    return "export-libs";
  }

  // Maps
  if (id.includes("/@react-google-maps/")) return "maps";

  // i18n
  if (id.includes("/i18next") || id.includes("/react-i18next/")) {
    return "i18n";
  }

  // Animation
  if (id.includes("/framer-motion/") || id.includes("/motion/")) {
    return "motion";
  }

  // Date utils
  if (id.includes("/dayjs/")) return "date-utils";

  // Icons (non-MUI)
  if (id.includes("/phosphor-react/") || id.includes("/react-icons/")) {
    return "icons";
  }

  // Swiper
  if (id.includes("/swiper/")) return "swiper";

  // Form / phone
  if (id.includes("/react-phone-number-input/")) return "forms";

  // Toast
  if (id.includes("/react-toastify/")) return "toast";

  // HTTP / network
  if (id.includes("/axios/")) return "http";

  // ที่เหลือ = ปล่อย rollup จัดการเอง (return undefined)
  // เลี่ยง catch-all "vendor" ที่ทำให้เกิด circular chunk → TDZ error
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
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks,
      },
    },
  },
  // ⚠️ /telegram dev proxy ถูกถอดออกแล้ว
});
