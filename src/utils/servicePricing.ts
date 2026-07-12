// src/utils/servicePricing.ts
//
// 💰 Single source of truth for service pricing across all durations.
//
// Pricing model — confirmed with founder 2026-05-01:
//   60 min  =  base × 1.0   (canonical price in src/data/services.ts)
//   90 min  =  base × 1.5
//   120 min =  base × 2.0
//
// Why a multiplier (not stored prices)? services.ts stays compact —
// one row per service — and price changes propagate everywhere with a
// single edit. If a future service needs a non-linear curve, override
// it via DURATION_PRICE_OVERRIDES below (keeps the simple case simple).
//
// All prices in THB (฿).

import type { MassageService } from "@/data/services";

/** Multiplier applied to a service's base 60-min price for each tier. */
export const DURATION_MULTIPLIERS: Record<number, number> = {
  60: 1.0,
  90: 1.5,
  120: 2.0,
};

/**
 * Per-service per-duration price overrides. Use when a service should NOT
 * follow the standard multiplier. Falls back to multiplier if absent.
 *
 * @example
 *   DURATION_PRICE_OVERRIDES["sunred-signature"] = { 90: 4500 };
 */
export const DURATION_PRICE_OVERRIDES: Record<
  string,
  Partial<Record<number, number>>
> = {};

// 🆕 Round 28s300 (founder: "admin/promotions สามารถจัดการราคาและบริการได้")
// — live, admin-editable price/name/desc/enabled overrides per service,
// pushed in from the public `adminSettings/publicRules` doc by
// MaintenanceGate (same live-binding pattern as the taxiFare / promo
// overrides). Everything customer-facing funnels price through
// priceForDuration/startingPrice, so overriding here reaches every
// surface with no call-site changes. SAFE by construction: an empty
// override map (the default until admin saves anything) makes every
// function below behave EXACTLY as the hardcoded catalog did — the
// override is only ever consulted when a field is explicitly present.
// Bookings snapshot their price at booking time, so editing a price
// never touches a historical order.
export interface LiveServiceOverride {
  enabled?: boolean;
  name?: string;
  desc?: string;
  /** Base 60-min price (feeds the multiplier for un-overridden durations). */
  price?: number;
  /** Explicit per-duration prices (keys are minute counts). Wins over `price`×mult. */
  prices?: Record<number, number>;
  // 🆕 Round 28s302 — full presentation overrides for the 4 standard
  //   services (image + detail page copy), editable from /admin/promotions.
  image?: string;
  detail?: string;
  benefit?: string[];
  // 🆕 Round 28r103 (founder 2026-07-13 · "ป้าย ใช้งานไม่ได้ในหน้าแอดมิน") —
  //   badge lives on the base MassageService but had no override channel;
  //   without this, admin badge edits never reached the customer surface.
  badge?: MassageService["badge"];
  // 🆕 Round 28r50 (feature #2 "Scheduled Pricing / Draft Mode") — epoch
  //   ms. While `scheduledFor > Date.now()`, the entire override is NOT
  //   applied (falls back to the hardcoded catalog price/name/etc.). Once
  //   the picked time arrives, the next MaintenanceGate re-apply tick (up
  //   to ~60s later) filters this entry back in and the customer sees the
  //   new numbers — no code deploy required. Empty/absent = active now.
  scheduledFor?: number | null;
}

// 🆕 Round 28s301 (founder: "ราคา & บริการ เพิ่ม เมนูได้") — admin-created
// services (not in the hardcoded catalog) stored on the same public doc.
export interface CustomServiceInput {
  id: string;
  name: string;
  desc?: string;
  image?: string;
  badge?: MassageService["badge"];
  enabled?: boolean;
  prices: Record<number, number>;
  // 🆕 Round 28r50 (feature #2) — activation schedule for a new custom
  //   service. While in the future, the service is hidden from the
  //   catalog + isServiceEnabled returns false (BookingFlow submit guard
  //   then also rejects any direct-URL attempt). Epoch ms.
  scheduledFor?: number | null;
}

let liveServiceOverrides: Record<string, LiveServiceOverride> = {};
let liveCustomServices: MassageService[] = [];
let liveServiceOrder: string[] = [];

/** Admin-set display order (service ids). Empty = use the caller's own
 *  default order. 🆕 Round 28s302. */
export function getLiveServiceOrder(): string[] {
  return liveServiceOrder;
}

// Fallback image so a custom service with no uploaded photo still renders
// a real card instead of a broken image.
const CUSTOM_SERVICE_FALLBACK_IMAGE = "/images/workphoto/IMG_5096.JPG";

/**
 * 🆕 Round 28s300/28s301 — one entry point (called only by MaintenanceGate)
 * for BOTH per-service overrides AND admin-created custom services. Unified
 * so there's no cross-call ordering fragility on the shared override map.
 * Empty/absent → behaves exactly like the hardcoded catalog.
 */
export function applyLiveServiceConfig(cfg: {
  overrides?: Record<string, LiveServiceOverride> | null;
  customServices?: CustomServiceInput[] | null;
  order?: string[] | null;
}): void {
  liveServiceOrder = Array.isArray(cfg.order) ? cfg.order : [];
  // 🆕 Round 28r50 — filter out any override whose `scheduledFor` hasn't
  //   arrived. Dropping the entry (not zeroing its fields) is critical:
  //   priceForDuration + withLiveServiceOverrides both use "override
  //   present?" as the branch condition, so an absent entry cleanly falls
  //   back to the catalog values — byte-identical to pre-r50 while the
  //   edit sits queued. Re-applied on the ~60s MaintenanceGate cadence.
  const now = Date.now();
  const rawOverrides = cfg.overrides ?? {};
  const filteredOverrides: Record<string, LiveServiceOverride> = {};
  for (const [k, v] of Object.entries(rawOverrides)) {
    if (v?.scheduledFor && v.scheduledFor > now) continue;
    filteredOverrides[k] = v;
  }
  const map: Record<string, LiveServiceOverride> = { ...filteredOverrides };
  const list: MassageService[] = [];
  for (const cs of cfg.customServices ?? []) {
    if (!cs?.id) continue;
    const p60 = cs.prices?.[60] ?? 0;
    // 🆕 Round 28r50 — a custom service scheduled for the future is
    //   dropped completely: not registered in the map (so
    //   isServiceEnabled returns default-true, but withLiveServiceOverrides
    //   also doesn't kick in — it doesn't exist yet) and not surfaced in
    //   the catalog. This keeps the "scheduled = doesn't exist yet"
    //   semantic consistent with the standard-service override path.
    if (cs.scheduledFor && cs.scheduledFor > now) continue;
    // Register enabled state + prices for ALL custom services (even
    // disabled ones) so isServiceEnabled / priceForDuration resolve them.
    map[cs.id] = {
      enabled: cs.enabled !== false,
      name: cs.name,
      desc: cs.desc,
      price: p60,
      prices: cs.prices,
    };
    // Only ENABLED custom services join the catalog the customer sees.
    if (cs.enabled !== false && p60 > 0) {
      list.push({
        id: cs.id,
        name: cs.name || cs.id,
        desc: cs.desc || "",
        price: p60,
        duration: 60,
        availableDurations: [60, 90, 120],
        count: 0,
        image: cs.image || CUSTOM_SERVICE_FALLBACK_IMAGE,
        detail: cs.desc || "",
        benefit: [],
        badge: cs.badge || "POPULAR",
      });
    }
  }
  liveServiceOverrides = map;
  liveCustomServices = list;
}

/** ENABLED admin-created services, in the shape the catalog uses. */
export function getLiveCustomServices(): MassageService[] {
  return liveCustomServices;
}

/** False only when admin has explicitly disabled the service. Default true. */
export function isServiceEnabled(id: string): boolean {
  return liveServiceOverrides[id]?.enabled !== false;
}

/** Live name override, or null to fall back to the catalog name. */
export function liveServiceName(id: string): string | null {
  const n = liveServiceOverrides[id]?.name;
  return typeof n === "string" && n.trim() ? n : null;
}

/** Live description override, or null to fall back to the catalog desc. */
export function liveServiceDesc(id: string): string | null {
  const d = liveServiceOverrides[id]?.desc;
  return typeof d === "string" && d.trim() ? d : null;
}

/** Merge any live name/desc/price/image/detail/benefit override onto a
 *  catalog service. 🆕 Round 28s302 added image/detail/benefit. */
export function withLiveServiceOverrides(s: MassageService): MassageService {
  const ov = liveServiceOverrides[s.id];
  if (!ov) return s;
  return {
    ...s,
    ...(liveServiceName(s.id) ? { name: ov.name as string } : {}),
    ...(liveServiceDesc(s.id) ? { desc: ov.desc as string } : {}),
    ...(typeof ov.price === "number" && ov.price > 0 ? { price: ov.price } : {}),
    ...(typeof ov.image === "string" && ov.image.trim() ? { image: ov.image } : {}),
    ...(typeof ov.detail === "string" && ov.detail.trim() ? { detail: ov.detail } : {}),
    ...(Array.isArray(ov.benefit) && ov.benefit.length ? { benefit: ov.benefit } : {}),
    // 🆕 28r103 — wire the badge override so admin edits reach the customer.
    ...(typeof ov.badge === "string" && ov.badge ? { badge: ov.badge } : {}),
  };
}

/**
 * Default duration tiers offered when a service does not declare its own
 * `availableDurations`. Keep this synced with DURATION_MULTIPLIERS keys.
 */
export const DEFAULT_DURATIONS: number[] = [60, 90, 120];

/**
 * Compute the price (THB) for a given service at a target duration.
 *
 * Resolution order:
 *   1. Per-service override   (DURATION_PRICE_OVERRIDES)
 *   2. Multiplier × base      (DURATION_MULTIPLIERS)
 *   3. Linear scale fallback  (targetMin / 60 × base) — for unknown durations
 */
export function priceForDuration(
  service: Pick<MassageService, "id" | "price">,
  durationMin: number
): number {
  // 🆕 Round 28s300 — live admin overrides take top priority, then the
  //   static override, then multiplier × (live-or-catalog base). All
  //   optional: with no override present this is byte-identical to the
  //   pre-28s300 logic.
  const ov = liveServiceOverrides[service.id];
  const livePer = ov?.prices?.[durationMin];
  if (livePer != null && livePer >= 0) return Math.round(livePer);

  // Round 28c27 — optional chain: most services have NO entry in
  //   DURATION_PRICE_OVERRIDES, so `[service.id]` is undefined and
  //   accessing `[durationMin]` would throw "Cannot read properties
  //   of undefined (reading '60')". Optional chaining returns
  //   undefined cleanly so the multiplier fallback below kicks in.
  const override = DURATION_PRICE_OVERRIDES[service.id]?.[durationMin];
  if (override != null) return override;

  // Live base-price override replaces the catalog base for the multiplier.
  const base =
    typeof ov?.price === "number" && ov.price > 0 ? ov.price : service.price;

  const multiplier = DURATION_MULTIPLIERS[durationMin];
  if (multiplier != null) return Math.round(base * multiplier);

  // Unknown duration → linear scale, round to nearest 100฿
  const raw = base * (durationMin / 60);
  return Math.round(raw / 100) * 100;
}

/**
 * Returns the duration tiers offered by this service, in ascending order.
 * Falls back to DEFAULT_DURATIONS when the service hasn't declared its own.
 */
export function durationsFor(service: MassageService): number[] {
  const list = service.availableDurations ?? DEFAULT_DURATIONS;
  return [...list].sort((a, b) => a - b);
}

/**
 * The starting (cheapest) price shown on browse/preview cards.
 * Equivalent to `priceForDuration(service, durationsFor(service)[0])`.
 */
export function startingPrice(service: MassageService): number {
  const durations = durationsFor(service);
  return priceForDuration(service, durations[0]);
}

/**
 * Format a THB price with the brand currency glyph + thousands separator.
 *
 * @example
 *   formatTHB(1200) === "฿1,200"
 */
export function formatTHB(amount: number): string {
  return `฿${amount.toLocaleString()}`;
}
