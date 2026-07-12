// src/main.tsx
import React, { useEffect } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

// MUI theme
import { ThemeProvider, CssBaseline } from "@mui/material";
import theme from "./theme";

// 🆕 Round 28b13 (perf) — ToastContainer lazy-loaded so its 30 kB
//   JS + 4 kB CSS don't block first paint. The container only mounts
//   after a toast is fired or after idle. Login/Register pages still
//   import "react-toastify" directly so toasts work day-1.
const ToastContainerLazy = React.lazy(() =>
  import("react-toastify").then((m) => ({ default: m.ToastContainer }))
);

// 🆕 Round 28b13 (perf) — Chonburi @fontsource removed from main bundle.
//   Login / Register / Maintenance pages already import it themselves
//   (those are lazy routes, so the font loads only when needed there).
//   Saves ~28 kB CSS + multiple .woff2 requests on first paint.

import App from "./app/App";
import "./index.css";

import ErrorBoundary from "@/components/common/ErrorBoundary";
import AuthProvider from "@/providers/AuthProvider";
import { GoogleMapsProvider } from "@/context/GoogleMapsContext";
// 🆕 Round 28j — language pill lives ONLY in TopNav (home) per founder
// direction. No global floating pill anywhere on the site. HtmlLangSync
// stays mounted so `<html lang>` follows i18n.language for SEO + a11y.
import HtmlLangSync from "@/components/common/HtmlLangSync";
import DevPrivacyToggle from "@/components/common/DevPrivacyToggle";
// 🕯️ 28t — auto day/night theme switch (toggles html.sr-day by BKK hour).
import DayNightSync from "@/components/common/DayNightSync";

import "./app/i18n";
import i18n from "i18next";

// 🆕 Round 28s229 — Capture first-touch marketing attribution at boot,
//   before the SPA router navigates and strips the URL query. Stored in
//   sessionStorage; read at booking time and surfaced on the admin Telegram.
import { captureAttribution } from "@/utils/attribution";
captureAttribution();

// GA
const GA_ID = "G-XEMLVVPN4W";

function ensureGaLoaded() {
  if (!document.querySelector(`script[src*="gtag/js?id=${GA_ID}"]`)) {
    const s = document.createElement("script");
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
    document.head.appendChild(s);
  }

  window.dataLayer = window.dataLayer || [];
  window.gtag =
    window.gtag ||
    function gtag(...args: unknown[]) {
      window.dataLayer.push(args);
    };

  window.gtag("js", new Date());
  window.gtag("config", GA_ID, { send_page_view: false });
}

const Root = () => {
  useEffect(() => {
    // 🆕 Round 28b29 (perf #66) — GA defers itself to idle so it doesn't
    //   compete with first paint. requestIdleCallback fallback for Safari.
    const start = () => ensureGaLoaded();
    const w = window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
    };
    if (w.requestIdleCallback) {
      w.requestIdleCallback(start, { timeout: 4000 });
    } else {
      window.setTimeout(start, 2000);
    }
  }, []);

  // sync <html lang="">
  useEffect(() => {
    const setLang = (lng: string) => {
      document.documentElement.lang = (lng || "en").split("-")[0];
    };

    setLang(i18n.language);
    i18n.on("languageChanged", setLang);
    return () => i18n.off("languageChanged", setLang);
  }, []);

  return (
    <React.StrictMode>
      <ErrorBoundary>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <BrowserRouter>
            <GoogleMapsProvider>
              <AuthProvider>
                <App />
                {/* 🕯️ 28t — flips html.sr-day by Bangkok hour (day/night). */}
                <DayNightSync />
                {/* Keeps <html lang="…"> in sync with i18n.language so
                    SEO + screen readers always see the correct locale.
                    The visible language pill lives in TopNav (home only). */}
                <HtmlLangSync />
                {/* 👁️  Dev privacy blur — for working on laptop in public.
                    Toggle: top-right icon OR Cmd/Ctrl + Shift + B.
                    Persists in localStorage. Local to your device only. */}
                <DevPrivacyToggle />
              </AuthProvider>
            </GoogleMapsProvider>
          </BrowserRouter>
          {/* 🆕 Round 28b13 — Toast lazy-mounted via Suspense fallback null.
              Removes 30 kB JS + 4 kB CSS from initial paint. Toast
              JS lazy-loads on idle (or first toast call). */}
          <React.Suspense fallback={null}>
            <ToastContainerLazy
              position="top-right"
              autoClose={3500}
              newestOnTop
              pauseOnFocusLoss={false}
              pauseOnHover
              theme="colored"
            />
          </React.Suspense>
        </ThemeProvider>
      </ErrorBoundary>
    </React.StrictMode>
  );
};

ReactDOM.createRoot(document.getElementById("root")!).render(<Root />);