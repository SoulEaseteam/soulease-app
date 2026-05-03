// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 🆕 Round 28b13 (perf) — Safe manualChunks for HTTP-cache reuse.
 *
 * Previous attempts crashed with TDZ ("Cannot access X before
 * initialization") because they tried to split too aggressively.
 * Safe boundaries this time:
 *   • react / react-dom / react-router  → `vendor-react`
 *   • firebase                           → `vendor-firebase`
 *   • @mui/material + @emotion           → `vendor-mui`
 *   • @mui/icons-material                → `vendor-mui-icons`
 *
 * Each is self-contained (no circular deps with app code) and the
 * standard pattern Vite docs recommend. The remaining app code +
 * smaller libs stay in the main entry chunk per Rollup defaults.
 *
 * Wins on PSI:
 *   - Initial main shrinks (fewer bytes to parse)
 *   - Shared chunks cached across deploys (only changed code re-fetches)
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
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (!id.includes("node_modules")) return undefined;
          if (
            id.includes("/react/") ||
            id.includes("/react-dom/") ||
            id.includes("/react-router") ||
            id.includes("/scheduler/")
          ) {
            return "vendor-react";
          }
          if (id.includes("/firebase/") || id.includes("/@firebase/")) {
            return "vendor-firebase";
          }
          if (id.includes("/@mui/icons-material/")) {
            return "vendor-mui-icons";
          }
          if (id.includes("/@mui/") || id.includes("/@emotion/")) {
            return "vendor-mui";
          }
          return undefined;
        },
      },
    },
  },
});
