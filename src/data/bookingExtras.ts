// src/data/bookingExtras.ts
//
// 🎨 Phase 4 — Static reference data for the Reservation Order page:
//   • Optional add-ons (Hot stone, Premium oil, Pair booking)
//   • Preferred-language chips (中文, English, 日本語, 한국어)
//
// Lifted out of BookingFlowPage so they're easy to localise / extend
// when Task 7 wires real Firestore-backed catalogues.

export interface AddOn {
  id: string;
  name: string;
  description: string;
  price: number; // THB
  icon: string;
}

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
  { code: "zh", flag: "🇨🇳", label: "中文" },
  { code: "en", flag: "🇬🇧", label: "English" },
  { code: "ja", flag: "🇯🇵", label: "日本語" },
  { code: "ko", flag: "🇰🇷", label: "한국어" },
];
