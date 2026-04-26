// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * แยก vendor libraries ออกเป็น chunks ต่างกัน
 * เป้าหมาย: ลดขนาด initial bundle และเปิดให้ browser cache ได้นาน
 * libs ที่หนักและไม่ค่อยอัปจะอยู่คนละ chunk จากโค้ดแอปที่อัปบ่อย
 */
function manualChunks(id: string): string | undefined {
  if (!id.includes("node_modules")) return undefined;

  // React core — โหลดทุกหน้า
  if (
    id.includes("/react/") ||
    id.includes("/react-dom/") ||
    id.includes("/scheduler/") ||
    id.includes("/react-router") ||
    id.includes("/react-error-boundary/") ||
    id.includes("/react-helmet-async/")
  ) {
    return "react-vendor";
  }

  // MUI X (Data Grid + Date Pickers) — หนักมาก ใช้แค่ admin
  if (id.includes("/@mui/x-data-grid")) return "mui-x-data-grid";
  if (id.includes("/@mui/x-date-pickers")) return "mui-x-date-pickers";

  // MUI core — หนักรองลงมา ใช้ทั่วแอป
  if (
    id.includes("/@mui/material") ||
    id.includes("/@mui/system") ||
    id.includes("/@mui/lab") ||
    id.includes("/@mui/utils") ||
    id.includes("/@mui/private-theming") ||
    id.includes("/@mui/styled-engine")
  ) {
    return "mui";
  }
  if (id.includes("/@mui/icons-material")) return "mui-icons";

  // Emotion — peer dep ของ MUI
  if (id.includes("/@emotion/")) return "emotion";

  // Firebase — หนัก ใช้หลายหน้า
  if (
    id.includes("/firebase/") ||
    id.includes("/@firebase/") ||
    id.includes("/firebase-functions/") ||
    id.includes("/react-firebase-hooks/")
  ) {
    return "firebase";
  }

  // Charts — recharts หนัก ใช้แค่ admin dashboard
  if (id.includes("/recharts/") || id.includes("/d3-")) return "charts";

  // Export libs — หนักมาก ควรอยู่ chunk ตัวเองเพื่อให้ browser cache แยกได้
  // (ไฟล์ที่ใช้พวกนี้ส่วนใหญ่ lazy import แล้ว แต่กัน static import เผลอใส่)
  if (
    id.includes("/exceljs/") ||
    id.includes("/jspdf/") ||
    id.includes("/html2canvas/") ||
    id.includes("/file-saver/")
  ) {
    return "export-libs";
  }

  // Maps — ใช้เฉพาะหน้าแผนที่
  if (
    id.includes("/@react-google-maps/") ||
    id.includes("/leaflet/") ||
    id.includes("/react-leaflet/") ||
    id.includes("/use-places-autocomplete/")
  ) {
    return "maps";
  }

  // i18n
  if (
    id.includes("/i18next") ||
    id.includes("/react-i18next/")
  ) {
    return "i18n";
  }

  // Animation
  if (
    id.includes("/framer-motion/") ||
    id.includes("/motion/") ||
    id.includes("/aos/") ||
    id.includes("/lottie-react/")
  ) {
    return "motion";
  }

  // Date / Utility
  if (id.includes("/dayjs/") || id.includes("/date-fns/")) {
    return "date-utils";
  }
  if (id.includes("/lodash")) return "lodash";

  // Icons (อื่นๆ ที่ไม่ใช่ MUI)
  if (
    id.includes("/lucide-react/") ||
    id.includes("/phosphor-react/") ||
    id.includes("/react-icons/")
  ) {
    return "icons";
  }

  // Swiper / Image Gallery
  if (
    id.includes("/swiper/") ||
    id.includes("/react-image-gallery/")
  ) {
    return "swiper";
  }

  // Form / phone / input
  if (
    id.includes("/react-phone-number-input/") ||
    id.includes("/input-format/")
  ) {
    return "forms";
  }

  // Toast
  if (id.includes("/react-toastify/")) return "toast";

  // Animations / loaders / fingerprints
  if (id.includes("/lottie-")) return "lottie";

  // HTTP / network
  if (id.includes("/axios/")) return "http";

  // ที่เหลือใน node_modules → vendor รวม
  return "vendor";
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
  server: {
    proxy: {
      "/telegram": {
        target: "https://api.telegram.org",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/telegram/, ""),
      },
    },
  },
});