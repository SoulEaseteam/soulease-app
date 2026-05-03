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
    const apply = (lng: string | undefined) => {
      const code = (lng ?? "en").split("-")[0].toLowerCase();
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
