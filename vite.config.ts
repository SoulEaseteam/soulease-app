// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * ⚠️ CHUNK-SPLITTING HISTORY — read before touching `manualChunks`.
 *
 * Round 28b13 split react/react-dom/react-router · @mui+@emotion · mui-icons
 * into vendor chunks using the OBJECT form of manualChunks. Result: TDZ crash
 * ("Cannot access 'X' before initialization") → white screen on production,
 * every browser. Rolled back in 1711383; splitting was banned outright after.
 *
 * Round 28x.125 (founder asked to retry it carefully, after a staff-app perf
 * audit measured the single entry chunk at 1.2 MB / 389 kB gzip blocking
 * first paint) — retried with a different rule and it holds:
 *
 *   ONLY split dependencies that are true LEAVES — they import nothing from
 *   the app and nothing from React. React and everything entangled with its
 *   module init (MUI, emotion, react-router, framer-motion, react-i18next)
 *   STAY TOGETHER in the entry chunk.
 *
 * Why 28b13 crashed and this doesn't: the object form puts only the named
 * package entry points in a chunk while their transitive deps (scheduler,
 * react-is, the emotion runtime) land elsewhere — that's what creates the
 * cross-chunk import cycles TDZ comes from. Firebase has no such cycle: the
 * app calls into it, it never calls back into React or app code.
 *
 * Measured: entry 1,245 kB → 896 kB (389 → 282 kB gzip, −27%). vendor-firebase
 * gets a modulepreload tag, so it downloads in PARALLEL with the entry chunk,
 * not after it. Verified on a real production build served by `vite preview`:
 * /, /staff, /login, /services and /therapists/:id all render, console clean,
 * and live Firestore reads work (the profile view counter incremented).
 *
 * If you split anything MORE: build, `npm run preview`, and actually load
 * several routes in a browser before deploying. A TDZ crash is invisible at
 * build time — it only appears at runtime, as a blank page.
 */

export default defineConfig({
  plugins: [
    react(),
    // 🆕 Round 28x.192 (founder: "ทำเป็นแอปพลิเคชัน") — service worker, the
    //   missing half of the 28x.166 PWA work. Store distribution is not an
    //   option for this vertical, so installed-PWA IS the app strategy.
    //
    //   Caching posture — chosen for a site that deploys several times a
    //   night (see the 2026-08-14 rollback incident: stale clients are a real
    //   operational hazard here):
    //   • registerType autoUpdate + clientsClaim/skipWaiting (plugin default
    //     for generateSW): a new deploy takes over on the NEXT navigation, no
    //     "refresh to update" prompt for guests to ignore.
    //   • Precache = hashed build assets + prerendered HTML only. Photos are
    //     runtime-cached instead (they're 227+ files — precaching them would
    //     download the whole roster on install).
    //   • Firestore/Auth/Functions traffic is deliberately NOT matched by any
    //     runtimeCaching rule — Workbox passes unmatched requests straight to
    //     the network, so live availability/booking data can never go stale.
    VitePWA({
      registerType: "autoUpdate",
      // public/manifest.json (28x.166) stays the single manifest source —
      // the plugin must not generate a competing one.
      manifest: false,
      workbox: {
        // ⚠️ Precache = FIRST-PAINT SHELL ONLY. The first config globbed
        //   every chunk ("**/*.js") — 224 files, several MB, including the
        //   admin-only exceljs/html2canvas bundles — so every guest paid the
        //   whole admin app in mobile data at first visit and the install
        //   crawled. Lazy route chunks are hashed (immutable), so the
        //   runtime CacheFirst rule below caches them the first time they're
        //   actually loaded instead.
        globPatterns: [
          "*.html",
          "assets/index-*.{js,css}",
          "assets/vendor-firebase-*.js",
          "assets/translation-*.js",
          "assets/workbox-window*.js",
          "assets/virtual_pwa-register-*.js",
          "assets/*.woff2",
        ],
        // Entry chunk is ~900 kB (see manualChunks note below) — default
        // 2 MB cap is fine today, 3 MB keeps a future chunk from silently
        // falling out of precache.
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        cleanupOutdatedCaches: true,
        navigateFallback: "/index.html",
        runtimeCaching: [
          {
            // Lazy route chunks (hashed filenames = immutable) — cached on
            // first real use instead of bloating the install (see the
            // globPatterns note above).
            urlPattern: ({ url, sameOrigin }) =>
              sameOrigin && url.pathname.startsWith("/assets/"),
            handler: "CacheFirst",
            options: {
              cacheName: "sr-lazy-assets",
              expiration: { maxEntries: 250, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
          {
            // Practitioner photos (Firebase Storage) — the heaviest, most
            // static content on the site. Cache-first turns repeat visits
            // into instant photo loads.
            urlPattern: /^https:\/\/firebasestorage\.googleapis\.com\/.*/,
            handler: "CacheFirst",
            options: {
              cacheName: "sr-storage-images",
              expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Same-origin static images (banners, icons, service tiles).
            urlPattern: ({ url, sameOrigin }) =>
              sameOrigin && url.pathname.startsWith("/images/"),
            handler: "CacheFirst",
            options: {
              cacheName: "sr-local-images",
              expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 14 },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/,
            handler: "StaleWhileRevalidate",
            options: { cacheName: "sr-font-css" },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/,
            handler: "CacheFirst",
            options: {
              cacheName: "sr-fonts",
              expiration: { maxEntries: 40, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
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
    rollupOptions: {
      output: {
        // 🆕 Round 28x.125 — see the ROLLBACK note above. Splitting is being
        //   retried, but ONLY for dependencies that are true leaves: they
        //   import nothing from the app and nothing from React, so they can't
        //   participate in the circular module-init that produced the old
        //   "Cannot access 'X' before initialization" white screen.
        //
        //   What 28b13 did and why it crashed: it split react/react-dom/
        //   react-router into one chunk, @mui/material+@emotion into another,
        //   and icons into a third — using the OBJECT form, which places only
        //   those exact package entry points in the chunk while their
        //   transitive deps (scheduler, react-is, the emotion runtime) land
        //   elsewhere. That's what creates cross-chunk cycles and TDZ.
        //
        //   The rule this time: React and everything that touches React's
        //   module init (MUI, emotion, router, framer-motion) STAY TOGETHER in
        //   the entry chunk. Only genuinely independent SDKs move out.
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          // Firebase: a self-contained SDK. The app calls into it; it never
          // imports app or React modules, so it has no cycle back.
          if (id.includes("/firebase/") || id.includes("/@firebase/")) {
            return "vendor-firebase";
          }
          return undefined;
        },
      },
    },
  },
});
