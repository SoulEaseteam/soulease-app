import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    base: "/",
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "src"),
        "@components": path.resolve(__dirname, "src/components"),
        "@pages": path.resolve(__dirname, "src/pages"),
        "@providers": path.resolve(__dirname, "src/providers"),
        "@layouts": path.resolve(__dirname, "src/layouts"),
        "@hooks": path.resolve(__dirname, "src/hooks"), // ✅ เพิ่มบรรทัดนี้
      },
    },
    build: {
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes("node_modules")) return "vendor";
            if (id.includes("src/pages/BookingPage")) return "booking";
            if (id.includes("src/pages/PaymentPage")) return "booking";
            if (id.includes("src/pages/ServicesPage")) return "services";
            if (id.includes("src/pages/admin")) return "admin";
          },
        },
      },
    },
  };
});