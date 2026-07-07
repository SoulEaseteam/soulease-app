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

// 🆕 Round 28s302 (founder: "ราคา & บริการ ... เชื่อมไปทุกที่") — add-ons were
// hardcoded above with no admin control AND no customer picker (dead
// feature). Now live-editable from /admin/promotions via the same
// override pattern as services, and surfaced as a real picker in the
// booking flow. Empty config → identical to the hardcoded ADDONS.
export interface AddonOverride {
  enabled?: boolean;
  name?: string;
  description?: string;
  price?: number;
  icon?: string;
}
export interface CustomAddonInput {
  id: string;
  name: string;
  description?: string;
  price: number;
  icon?: string;
  enabled?: boolean;
}

let liveAddonOverrides: Record<string, AddonOverride> = {};
let liveCustomAddons: AddOn[] = [];

export function applyLiveAddonConfig(cfg: {
  overrides?: Record<string, AddonOverride> | null;
  customAddons?: CustomAddonInput[] | null;
}): void {
  liveAddonOverrides = cfg.overrides ?? {};
  liveCustomAddons = (cfg.customAddons ?? [])
    .filter((a) => a?.id && a.enabled !== false && (a.price ?? 0) >= 0)
    .map((a) => ({
      id: a.id,
      name: a.name || a.id,
      description: a.description || "",
      price: a.price ?? 0,
      icon: a.icon || "✨",
    }));
}

/** Effective add-on catalog = hardcoded (with overrides, enabled only) +
 *  admin-created custom add-ons (enabled only). */
export function getEffectiveAddons(): AddOn[] {
  const base = ADDONS.filter((a) => liveAddonOverrides[a.id]?.enabled !== false).map((a) => {
    const ov = liveAddonOverrides[a.id];
    return ov
      ? {
          ...a,
          ...(ov.name?.trim() ? { name: ov.name } : {}),
          ...(ov.description?.trim() ? { description: ov.description } : {}),
          ...(typeof ov.price === "number" && ov.price >= 0 ? { price: ov.price } : {}),
          ...(ov.icon?.trim() ? { icon: ov.icon } : {}),
        }
      : a;
  });
  return [...base, ...liveCustomAddons];
}

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
