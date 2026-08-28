// src/components/common/LanguageSwitcher.tsx
//
// 🌐 Reusable language pill + menu — single source of truth for the
// language UX across the whole app.
//
// Used by:
//   • TopNav.tsx          — inline pill on the home top bar
//   • GlobalLanguagePill  — fixed-position wrapper for non-home pages
//
// Behavior (28x.224 — founder: "ตรงแปลภาษา เอาลูกเล่นแบบเว็บ heartitude"):
//   • Pill shows current language flag + short code + a ▾ caret
//   • Tap → the pill EXPANDS IN PLACE, heartitude .fx-lang style — every
//     language as a mini pill in one row (overlaid, anchored right, so a
//     narrow top bar never reflows), active = magenta gradient pill,
//     plus an ✨ Auto chip that re-detects the device language
//   • Picking one plays heartitude's ".picked" flash (gradient + glow +
//     scale) for ~320ms before the switch applies
//   • On select:
//       - i18n.changeLanguage(code) — propagates app-wide
//       - document.documentElement.lang = code — keeps SEO + a11y in sync
//       - "Auto" wipes the localStorage stickiness so the next page load
//         re-detects from `navigator.language`
//
// 🆕 Round 28i (founder 2026-05-02): replaces FloatingLanguageSwitcher.
// "แปลภาษาของ TopNav ใช้ได้ทั้งเว็บ" — same UX, available everywhere,
// not stuck to a floating bottom-left bubble.

import React, { useEffect, useRef, useState } from "react";
import { Box } from "@mui/material";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import { useTranslation } from "react-i18next";
import { fonts } from "@/theme";
// 🆕 (founder: "แปลภาษา ไม่แปลตามสั่งที่กด และเปลี่ยนหน้าแล้วไม่คงที่เลือก") —
//   this switcher predates the 28x.57 langPref mechanism: it changed the live
//   language but never SAVED the choice, and the detection order deliberately
//   puts `navigator` above localStorage (28s223) — so any reload re-detected
//   the device locale and the pick silently reverted. It now persists through
//   the same sunred.lang key ProfilePage's picker uses.
import { getLangPref, setLangPref, LANG_PREF_KEY, type LangCode } from "@/utils/langPref";

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
  /** Flag only (drop the 2-letter code) — a smaller, tidier pill. */
  flagOnly?: boolean;
}

const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({
  size = "md",
  ariaLabel,
  flagOnly = false,
}) => {
  const { i18n, t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  // close on outside tap / Escape while expanded
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

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

  // Whether the current language was auto-detected (no manual choice saved).
  // Reads the REAL explicit-choice key (sunred.lang) — the old check against
  // i18next's own cache was doubly stale: wrong key name since 28s223 bumped
  // it to i18nextLng_v2, and that cache never outranked the device locale
  // anyway.
  const isAuto = !getLangPref();

  const handleSelect = async (code: string) => {
    // Persist FIRST — this is what makes the pick survive reloads/PWA
    // relaunches (i18n.ts applies sunred.lang after init, above navigator).
    setLangPref(code as LangCode);
    if (code !== langCode) {
      await i18n.changeLanguage(code);
      document.documentElement.lang = code;
    }
  };

  /**
   * Reset to device-detected language. Wipes the explicit choice AND
   * i18next's own caches so the detector re-runs against `navigator`.
   */
  const handleAuto = async () => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(LANG_PREF_KEY);
      window.localStorage.removeItem(I18N_LS_KEY);
      window.localStorage.removeItem("i18nextLng_v2");
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

  // heartitude ".picked" flash: light the chosen pill up first, then apply.
  const pickWithFlash = (code: string, apply: () => void) => {
    setPicked(code);
    window.setTimeout(() => {
      setPicked(null);
      setOpen(false);
      apply();
    }, 320);
  };

  const dim = size === "sm" ? 36 : 40;
  const fontSize = size === "sm" ? 10 : 11;
  const flagSize = size === "sm" ? 13 : 14;

  return (
    <Box ref={wrapRef} sx={{ position: "relative", display: "inline-flex" }}>
      <Box
        component="button"
        type="button"
        // 28x.223 fx classes + 28x.224 heartitude-style expander trigger
        className="sr-fx-tap sr-shine"
        aria-label={ariaLabel ?? t("nav.changeLanguage", "Change language")}
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: flagOnly ? 0 : "4px",
          height: dim,
          padding: flagOnly ? "0 9px" : size === "sm" ? "0 11px" : "0 14px",
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
          transition: "background 0.2s ease, border-color 0.25s ease, box-shadow 0.25s ease",
          "&:hover": {
            background: "rgba(255, 255, 255, 0.75)",
            borderColor: "rgba(230, 25, 126, 0.4)",
            boxShadow: "0 0 14px rgba(230, 25, 126, 0.18)",
          },
          "&:focus-visible": {
            outline: "2px solid #2D2D2B",
            outlineOffset: 2,
          },
        }}
      >
        <Box component="span" sx={{ fontSize: `${flagSize}px` }}>
          {cur.flag}
        </Box>
        {!flagOnly && cur.short}
        <Box
          component="i"
          aria-hidden
          sx={{
            fontStyle: "normal",
            fontSize: "8px",
            marginLeft: "2px",
            transition: "transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
            transform: open ? "rotate(180deg)" : "none",
          }}
        >
          ▾
        </Box>
      </Box>

      {open && (
        <Box
          role="group"
          aria-label={t("nav.changeLanguage", "Change language")}
          sx={{
            position: "absolute",
            top: "50%",
            right: 0,
            zIndex: 60,
            display: "flex",
            alignItems: "center",
            gap: "2px",
            height: dim,
            padding: "0 6px",
            borderRadius: "99px",
            background: "rgba(255, 255, 255, 0.94)",
            backdropFilter: "blur(20px) saturate(180%)",
            WebkitBackdropFilter: "blur(20px) saturate(180%)",
            border: "1px solid rgba(230, 25, 126, 0.25)",
            boxShadow: "0 10px 30px rgba(15, 23, 42, 0.16), 0 0 18px rgba(230, 25, 126, 0.12)",
            whiteSpace: "nowrap",
            transformOrigin: "100% 50%",
            animation: "srLangPop 0.34s cubic-bezier(0.34, 1.56, 0.64, 1) both",
            "@keyframes srLangPop": {
              from: { opacity: 0, transform: "translateY(-50%) scale(0.7)" },
              to: { opacity: 1, transform: "translateY(-50%) scale(1)" },
            },
            "@media (prefers-reduced-motion: reduce)": { animation: "none", transform: "translateY(-50%)" },
          }}
        >
          {LANGS.map((l) => {
            const active = l.code === langCode && !isAuto;
            const isPicked = picked === l.code;
            return (
              <Box
                key={l.code}
                component="button"
                type="button"
                aria-label={l.label}
                aria-pressed={active}
                onClick={() => pickWithFlash(l.code, () => void handleSelect(l.code))}
                sx={{
                  border: 0,
                  cursor: "pointer",
                  height: dim - 12,
                  padding: "0 9px",
                  borderRadius: "99px",
                  fontFamily: fonts.body,
                  fontSize: "11px",
                  fontWeight: 700,
                  letterSpacing: "0.04em",
                  lineHeight: 1,
                  color: active || isPicked ? "#FFFFFF" : "#4A5568",
                  background:
                    isPicked
                      ? "linear-gradient(135deg, #F050A0, #E6197E)"
                      : active
                        ? "linear-gradient(135deg, #F050A0, #E6197E)"
                        : "transparent",
                  boxShadow: isPicked ? "0 0 16px rgba(230, 25, 126, 0.55)" : "none",
                  transform: isPicked ? "scale(1.12)" : "none",
                  transition:
                    "background 0.25s ease, color 0.25s ease, transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.25s ease",
                  "&:hover": {
                    background:
                      active || isPicked
                        ? "linear-gradient(135deg, #F050A0, #E6197E)"
                        : "rgba(252, 231, 240, 0.9)",
                    color: active || isPicked ? "#FFFFFF" : "#C2185B",
                  },
                }}
              >
                {l.short}
              </Box>
            );
          })}
          <Box
            component="button"
            type="button"
            aria-label={t("language.auto", "Auto (device)")}
            aria-pressed={isAuto}
            onClick={() => pickWithFlash("auto", () => void handleAuto())}
            sx={{
              border: 0,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: dim - 12,
              width: dim - 12,
              borderRadius: "99px",
              color: isAuto || picked === "auto" ? "#FFFFFF" : "#8A94A2",
              background:
                isAuto || picked === "auto"
                  ? "linear-gradient(135deg, #F050A0, #E6197E)"
                  : "transparent",
              boxShadow: picked === "auto" ? "0 0 16px rgba(230, 25, 126, 0.55)" : "none",
              transform: picked === "auto" ? "scale(1.12)" : "none",
              transition:
                "background 0.25s ease, color 0.25s ease, transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.25s ease",
              "&:hover": { background: isAuto ? undefined : "rgba(252, 231, 240, 0.9)", color: isAuto ? "#FFFFFF" : "#C2185B" },
            }}
          >
            <AutoAwesomeRoundedIcon sx={{ fontSize: 14 }} />
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default LanguageSwitcher;
