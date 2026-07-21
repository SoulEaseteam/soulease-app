// src/components/common/HtmlLangSync.tsx
//
// 🌐 Mirrors the active i18n language onto the `<html lang>` attribute.
// Mounted once at the app root so every page benefits.
//
// Why this matters:
//   • SEO — Google uses `<html lang>` for hreflang signals
//   • Accessibility — screen readers switch their voice/pronunciation
//     based on `<html lang>`
//   • Browser features — date pickers, hyphenation, quotation marks
//     all read this attribute
//
// The i18next-browser-languagedetector handles INITIAL detection from
// the user's device (navigator.language) — see app/i18n.ts. This
// component only keeps the DOM attribute reactive after manual changes.

import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";

const HtmlLangSync: React.FC = () => {
  const { i18n } = useTranslation();

  useEffect(() => {
    // 🆕 Round 28x.99f — same zh-TW fix as main.tsx's setLang: check the
    // full code before stripping the region, or Traditional-Chinese pages
    // report <html lang="zh"> (Simplified) instead of "zh-TW".
    const apply = (lng: string | undefined) => {
      const full = (lng ?? "en").toLowerCase();
      const code = full === "zh-tw" ? "zh-TW" : full.split("-")[0];
      if (document.documentElement.lang !== code) {
        document.documentElement.lang = code;
      }
    };

    // Apply current language immediately on mount.
    apply(i18n.language);

    // Subscribe to subsequent changes.
    i18n.on("languageChanged", apply);
    return () => {
      i18n.off("languageChanged", apply);
    };
  }, [i18n]);

  return null;
};

export default HtmlLangSync;
