// src/utils/langPref.ts
//
// 🆕 Round 28x.57 (founder: "ตั้งค่าภาษาได้") — an EXPLICIT language override.
//
// Why a separate key instead of relying on i18next's own cache: the detection
// order in i18n.ts is `querystring → navigator → localStorage → …` (Round
// 28s223, so a Chinese phone gets Chinese even if an old "th" was cached).
// That ordering means i18next's own localStorage cache can never beat the
// device locale — so a language the guest picks by hand would silently revert
// on the next visit.
//
// This key sits OUTSIDE that chain: i18n.ts applies it after init, so
//   • no explicit choice  → device locale still wins (28s223 intact)
//   • explicit choice     → it always wins, on every visit
export const LANG_PREF_KEY = "sunred.lang";

export const SUPPORTED_LANGS = [
  { code: "en", label: "English" },
  { code: "th", label: "ไทย" },
  { code: "zh", label: "中文" },
  { code: "ja", label: "日本語" },
  { code: "ko", label: "한국어" },
] as const;

export type LangCode = (typeof SUPPORTED_LANGS)[number]["code"];

function isSupported(v: string): v is LangCode {
  return SUPPORTED_LANGS.some((l) => l.code === v);
}

/** The guest's explicitly-chosen language, or null if they never picked one. */
export function getLangPref(): LangCode | null {
  if (typeof window === "undefined") return null;
  try {
    const v = window.localStorage.getItem(LANG_PREF_KEY);
    return v && isSupported(v) ? v : null;
  } catch {
    return null;
  }
}

/** Persist an explicit choice so it beats the device locale from now on. */
export function setLangPref(code: LangCode): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LANG_PREF_KEY, code);
  } catch {
    /* private mode — the change still applies for this session */
  }
}

/** Human label for a language code (falls back to the code itself). */
export function langLabel(code: string): string {
  return SUPPORTED_LANGS.find((l) => l.code === code)?.label ?? code.toUpperCase();
}
