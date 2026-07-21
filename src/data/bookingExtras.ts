// src/data/bookingExtras.ts
//
// ⚠️ DEPRECATED (Round 28r49, founder 2026-07-08 — "Add-ons · บริการเสริม
// เอาออกจากทุกที่ที่มี"). The add-ons feature (introduced 28s302) is fully
// removed from the customer flow AND the admin editor. The `AddOn`
// interface and `ADDONS` constant are kept ONLY so that historical
// bookings written with `selectedAddons: string[]` (a field the customer
// flow now always writes as `[]`) can still be referenced by id if any
// legacy display code needs to look up an add-on name/price. The live-
// config helpers (`applyLiveAddonConfig` / `getEffectiveAddons`) and
// `AddonOverride` / `CustomAddonInput` types were deleted — they had no
// remaining call sites once the customer picker and admin editor were
// removed.
//
// Do NOT re-introduce a customer add-on picker without founder direction.
// Old kept for reference:
//   • Optional add-ons (Hot stone, Premium oil, Pair booking)
//   • Preferred-language chips (中文, English, 日本語, 한국어)

export interface AddOn {
  id: string;
  name: string;
  description: string;
  price: number; // THB
  icon: string;
}

/** Historical hardcoded add-on catalog. Kept for backward-compat lookup
 *  of legacy booking docs' `selectedAddons: string[]` id arrays. Not
 *  surfaced anywhere in the live UI. */
export const ADDONS: AddOn[] = [
  {
    id: "hot-stone",
    name: "Hot stone therapy",
    description: "Add 15 min · deeply relaxing",
    price: 400,
    icon: "🌶",
  },
  {
    id: "premium-oil",
    name: "Premium oil upgrade",
    description: "Organic Thai herbal blend",
    price: 200,
    icon: "🌿",
  },
  {
    id: "pair-booking",
    name: "Pair booking",
    description: "Book a 2nd therapist for a partner",
    price: 2500,
    icon: "👯",
  },
];

export interface LanguageOption {
  code: string; // "zh", "en", "ja", "ko", "th"
  flag: string;
  label: string;
}

export const LANGUAGE_OPTIONS: LanguageOption[] = [
  { code: "zh", flag: "🇨🇳", label: "中文（简体）" },
  { code: "zh-TW", flag: "🇹🇼", label: "中文（繁體）" },
  { code: "en", flag: "🇬🇧", label: "English" },
  { code: "ja", flag: "🇯🇵", label: "日本語" },
  { code: "ko", flag: "🇰🇷", label: "한국어" },
];
