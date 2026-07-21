// src/components/common/LanguageSwitcher.tsx
//
// 🌐 Reusable language pill + menu — single source of truth for the
// language UX across the whole app.
//
// Used by:
//   • TopNav.tsx          — inline pill on the home top bar
//   • GlobalLanguagePill  — fixed-position wrapper for non-home pages
//
// Behavior:
//   • Pill shows current language flag + 2-letter code (EN / TH / 中 / 日 / 한)
//   • Click → MUI menu with all 5 languages + an "Auto" entry that
//     resets back to the device's preferred language (navigator.language)
//   • On select:
//       - i18n.changeLanguage(code) — propagates app-wide
//       - document.documentElement.lang = code — keeps SEO + a11y in sync
//       - "Auto" wipes the localStorage stickiness so the next page load
//         re-detects from `navigator.language`
//
// 🆕 Round 28i (founder 2026-05-02): replaces FloatingLanguageSwitcher.
// "แปลภาษาของ TopNav ใช้ได้ทั้งเว็บ" — same UX, available everywhere,
// not stuck to a floating bottom-left bubble.

import React, { useState } from "react";
import { Box, Menu, MenuItem } from "@mui/material";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import { useTranslation } from "react-i18next";
import { fonts } from "@/theme";

interface LangOption {
  code: string;
  label: string;
  flag: string;
  short: string;
}

// Single source of truth — mirrored in i18n.ts supportedLngs.
export const LANGS: LangOption[] = [
  { code: "en", label: "English", flag: "🇬🇧", short: "EN" },
  { code: "th", label: "ไทย", flag: "🇹🇭", short: "TH" },
  { code: "zh", label: "中文（简体）", flag: "🇨🇳", short: "中" },
  { code: "zh-TW", label: "中文（繁體）", flag: "🇹🇼", short: "繁" },
  { code: "ja", label: "日本語", flag: "🇯🇵", short: "日" },
  { code: "ko", label: "한국어", flag: "🇰🇷", short: "한" },
];

/** Storage key used by i18next-browser-languagedetector. */
const I18N_LS_KEY = "i18nextLng";

export interface LanguageSwitcherProps {
  /** Visual size — "sm" for fixed/floating, "md" for top-bar inline. */
  size?: "sm" | "md";
  /** Override aria-label for screen readers. */
  ariaLabel?: string;
}

const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({
  size = "md",
  ariaLabel,
}) => {
  const { i18n, t } = useTranslation();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);

  // 🆕 Round 28x.99f — zh-TW is now its own bundle, not an alias of zh.
  // A blind `.split("-")[0]` would turn "zh-TW" into "zh" and show the
  // Simplified pill for a Traditional-Chinese guest. Match the full code
  // against LANGS first; only strip the region for codes we don't carry
  // as their own entry (en-US, ja-JP, ko-KR, …).
  const rawLang = (i18n.language || "en").toLowerCase();
  const langCode =
    LANGS.find((l) => l.code.toLowerCase() === rawLang)?.code ??
    rawLang.split("-")[0];
  const cur = LANGS.find((l) => l.code === langCode) ?? LANGS[0];

  // Whether the current language was auto-detected (no manual choice
  // saved in localStorage). Used to surface the "Auto" badge state.
  const isAuto =
    typeof window !== "undefined" &&
    !window.localStorage.getItem(I18N_LS_KEY);

  const handleSelect = async (code: string) => {
    setAnchor(null);
    if (code !== langCode) {
      await i18n.changeLanguage(code);
      document.documentElement.lang = code;
    }
  };

  /**
   * Reset to device-detected language. Wipes the sticky preference in
   * localStorage so the language detector re-runs against `navigator`.
   */
  const handleAuto = async () => {
    setAnchor(null);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(I18N_LS_KEY);
    }
    // Detect device language inline so the pill flips immediately.
    // Mirrors i18n.ts's convertDetectedLanguage: zh-HK/zh-MO/zh-TW all
    // read Traditional Chinese, so they resolve to the zh-TW bundle
    // instead of falling through to Simplified.
    const navRaw =
      typeof navigator !== "undefined"
        ? (navigator.language || "en").toLowerCase()
        : "en";
    const navLang =
      navRaw === "zh-hk" || navRaw === "zh-mo" || navRaw === "zh-tw"
        ? "zh-TW"
        : navRaw.split("-")[0];
    const supported = LANGS.find((l) => l.code === navLang)?.code ?? "en";
    if (supported !== langCode) {
      await i18n.changeLanguage(supported);
      document.documentElement.lang = supported;
    }
  };

  const dim = size === "sm" ? 36 : 40;
  const fontSize = size === "sm" ? 10 : 11;
  const flagSize = size === "sm" ? 13 : 14;

  return (
    <>
      <Box
        component="button"
        type="button"
        aria-label={ariaLabel ?? t("nav.changeLanguage", "Change language")}
        aria-haspopup="menu"
        aria-expanded={Boolean(anchor)}
        onClick={(e: React.MouseEvent<HTMLButtonElement>) =>
          setAnchor(e.currentTarget)
        }
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "4px",
          height: dim,
          padding: size === "sm" ? "0 11px" : "0 14px",
          borderRadius: "99px",
          background: "rgba(255, 255, 255, 0.55)",
          backdropFilter: "blur(20px) saturate(180%)",
          WebkitBackdropFilter: "blur(20px) saturate(180%)",
          border: "1px solid rgba(255, 255, 255, 0.7)",
          boxShadow: "0 2px 8px rgba(15, 23, 42, 0.06)",
          color: "#1A2B2E",
          fontSize: `${fontSize}px`,
          fontWeight: 700,
          letterSpacing: "0.05em",
          cursor: "pointer",
          fontFamily: fonts.body,
          transition: "background 0.2s ease",
          "&:hover": { background: "rgba(255, 255, 255, 0.75)" },
          "&:focus-visible": {
            outline: "2px solid #2D2D2B",
            outlineOffset: 2,
          },
        }}
      >
        <Box component="span" sx={{ fontSize: `${flagSize}px` }}>
          {cur.flag}
        </Box>
        {cur.short}
      </Box>

      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
        MenuListProps={{ sx: { padding: "6px" } }}
        PaperProps={{
          sx: {
            mt: 1,
            borderRadius: "14px",
            background: "rgba(244, 246, 245, 0.95)",
            backdropFilter: "blur(20px) saturate(180%)",
            WebkitBackdropFilter: "blur(20px) saturate(180%)",
            border: "1px solid rgba(255, 255, 255, 0.7)",
            boxShadow: "0 12px 32px rgba(15, 23, 42, 0.18)",
            minWidth: 180,
          },
        }}
      >
        {/* Auto / device language — resets the sticky preference */}
        <MenuItem
          onClick={() => void handleAuto()}
          selected={isAuto}
          sx={{
            borderRadius: "10px",
            fontFamily: fonts.body,
            fontSize: 13,
            fontWeight: 600,
            color: "#1A2B2E",
            gap: 1,
            "&.Mui-selected": {
              background: "rgba(45, 45, 43, 0.08)",
              "&:hover": { background: "rgba(15, 23, 42, 0.12)" },
            },
          }}
        >
          <AutoAwesomeRoundedIcon
            sx={{ fontSize: 16, color: "#4B4B48" }}
          />
          <Box sx={{ flex: 1 }}>
            {t("language.auto", "Auto (device)")}
          </Box>
          {isAuto && (
            <CheckRoundedIcon
              sx={{ fontSize: 16, color: "#4B4B48" }}
              aria-label="current"
            />
          )}
        </MenuItem>

        {/* Divider line */}
        <Box
          sx={{
            height: 1,
            background: "rgba(184, 92, 60, 0.18)",
            margin: "4px 8px 4px",
          }}
          aria-hidden
        />

        {LANGS.map((l) => {
          const selected = l.code === langCode && !isAuto;
          return (
            <MenuItem
              key={l.code}
              selected={selected}
              onClick={() => void handleSelect(l.code)}
              sx={{
                borderRadius: "10px",
                fontFamily: fonts.body,
                fontSize: 13,
                fontWeight: 600,
                color: "#1A2B2E",
                gap: 1,
                "&.Mui-selected": {
                  background: "rgba(45, 45, 43, 0.08)",
                  "&:hover": { background: "rgba(15, 23, 42, 0.12)" },
                },
              }}
            >
              <Box component="span" sx={{ fontSize: 18, lineHeight: 1 }}>
                {l.flag}
              </Box>
              <Box sx={{ flex: 1 }}>{l.label}</Box>
              {selected && (
                <CheckRoundedIcon
                  sx={{ fontSize: 16, color: "#4B4B48" }}
                  aria-label="current"
                />
              )}
            </MenuItem>
          );
        })}
      </Menu>
    </>
  );
};

export default LanguageSwitcher;
