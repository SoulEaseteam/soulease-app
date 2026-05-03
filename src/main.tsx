// src/main.tsx
import React, { useEffect } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

// MUI theme
import { ThemeProvider, CssBaseline } from "@mui/material";
import theme from "./theme";

// Toast notifications
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Web fonts (Chonburi สำหรับ heading; Trebuchet MS เป็น system font)
import "@fontsource/chonburi/400.css";

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

import "./app/i18n";
import i18n from "i18next";

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
    ensureGaLoaded();
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
          <ToastContainer
            position="top-right"
            autoClose={3500}
            newestOnTop
            pauseOnFocusLoss={false}
            pauseOnHover
            theme="colored"
          />
        </ThemeProvider>
      </ErrorBoundary>
    </React.StrictMode>
  );
};

ReactDOM.createRoot(document.getElementById("root")!).render(<Root />);