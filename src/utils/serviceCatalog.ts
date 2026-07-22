// src/utils/serviceCatalog.ts
//
// 🆕 Round 28b16 (founder 2026-05-04) — centralized lookup for service /
//   payment / meeting-point / location-type display labels.
//
// Architectural principle:
//   • Bookings store IMMUTABLE codes/ids only:
//       serviceId  · paymentMethodId · meetingPoint · locationType
//   • Prices, amounts, durations are SNAPSHOTTED at booking time
//     (never resolved later — what the customer paid is what's in the doc)
//   • Display labels (UI text) are RESOLVED here at render time
//   • Renaming a service / payment / addon → edit the catalog ONCE,
//     every historical booking auto-renders the new label
//
// Fallback strategy (for graceful migration):
//   • If a booking has a legacy `serviceName` / `payment` field, prefer
//     the LIVE catalog lookup; fall back to the stored value if catalog
//     can't resolve (e.g., service was deleted).
//   • If neither resolves, return a safe placeholder ("Service").

import services from "@/data/services";
import type { MassageService } from "@/data/services";
import { PAYMENT_LABELS } from "@/pages/booking/PaymentMethodsPage";
import type { PaymentMethodId } from "@/pages/booking/PaymentMethodsPage";
import {
  priceForDuration,
  startingPrice,
  formatTHB,
  withLiveServiceOverrides,
  getLiveCustomServices,
} from "@/utils/servicePricing";

// 🆕 Round 28s301 — effective catalog = hardcoded services + admin-created
//   custom services (enabled only). Every lookup below resolves against
//   this so custom services are bookable + labelled everywhere. Empty
//   custom list → identical to the hardcoded catalog.
function allServices(): MassageService[] {
  const custom = getLiveCustomServices();
  return custom.length ? [...services, ...custom] : services;
}

/** Full effective catalog (hardcoded + enabled custom). For list surfaces. */
export function getAllServices(): MassageService[] {
  return allServices();
}

// ─── Service lookup ──────────────────────────────────────────────────

/**
 * 🆕 Round 28b26 (founder 2026-05-04) — Legacy slug → SKU id alias map.
 *
 * Background: Round 28b18 migrated service ids from URL-friendly slugs
 *   ("thai-massage", "aromatherapy", "gentlemans-recovery", "sunred-
 *   signature") to immutable SKU codes ("xSR-Thai", "SR-Aroma",
 *   "SR-HJ2200", "SR-B2B3200").
 *
 * Side-effect: existing customer URLs / bookmarks / Telegram links /
 *   external SEO pages still pointed at the legacy slugs, and
 *   `/services/gentlemans-recovery` started 404'ing with "Service not
 *   found" because `services.find(s => s.id === slug)` no longer matched.
 *
 * Fix: lookup helpers below try the SKU id first, then fall back to
 *   this alias map. Deletes are permanent — never remove a row here
 *   without verifying outbound links (Google, LINE OA, printed cards).
 */
export const LEGACY_SERVICE_SLUG_MAP: Record<string, string> = {
  "thai-massage": "xSR-Thai",
  "aromatherapy": "SR-Aroma",
  "aromatherapy-massage": "SR-Aroma",
  "gentlemans-recovery": "SR-HJ2200",
  "gentlemans-signature": "SR-HJ2200",
  "gentleman-signature": "SR-HJ2200",
  "sunred-signature": "SR-B2B3200",
  "sunred-therapeutic": "SR-B2B3200",
  "therapeutic-experience": "SR-B2B3200",
};

/**
 * 🆕 Round 28x.129 (founder: "Services ... ไม่โชว์หรือซ้อนบนเว็บ") — map a
 * stored `servicesAvailable` array to canonical SKU ids, de-duplicated.
 *
 * Confirmed against production this round: 4 of 14 therapist docs (Hami,
 * Jimmy, Nanny, Richie) still hold ONLY the pre-rename slugs
 * ["thai-massage","aromatherapy","gentlemans-recovery","sunred-signature"].
 *
 * Therapist docs are a mix: some hold current SKUs, some still hold the
 * pre-rename slugs, and a doc that has been edited since can hold BOTH for the
 * same service. Rendering that array verbatim shows the service twice (once
 * mapped, once as a raw unmatched id) — which is the duplication she reported.
 *
 * Every surface that renders or prices a therapist's services should read
 * through here, so an unclean doc looks correct to customers immediately
 * rather than only after that therapist happens to re-save her profile.
 * Unresolvable entries are dropped, not passed through: an id no catalog
 * entry matches can't be priced or labelled, so showing it helps nobody.
 */
export function canonicalServiceIds(
  list: readonly (string | null | undefined)[] | null | undefined
): string[] {
  if (!list?.length) return [];
  const out: string[] = [];
  for (const raw of list) {
    const id = resolveServiceId(raw);
    if (id && !out.includes(id)) out.push(id);
  }
  return out;
}

/**
 * Resolve any user-supplied identifier (URL slug, SKU id, even a name)
 * to a canonical SKU id. Returns `null` if no match.
 */
export function resolveServiceId(
  idOrSlug: string | null | undefined
): string | null {
  if (!idOrSlug) return null;
  const key = idOrSlug.trim().toLowerCase();
  if (!key) return null;

  const catalog = allServices();

  // 1. Direct SKU match (case-insensitive — admins sometimes type SR-Aroma vs sr-aroma)
  const direct = catalog.find((s) => s.id.toLowerCase() === key);
  if (direct) return direct.id;

  // 2. Legacy slug alias
  const aliased = LEGACY_SERVICE_SLUG_MAP[key];
  if (aliased) return aliased;

  // 3. Name match (last resort — handles old URLs encoded with the
  //    display name e.g. /services/Thai%20Massage)
  const byName = catalog.find(
    (s) => s.name.toLowerCase().replace(/[^a-z0-9]/g, "") === key.replace(/[^a-z0-9]/g, "")
  );
  if (byName) return byName.id;

  return null;
}

/** Resolve a service catalog entry by id (or any legacy alias). `null` if not found.
 *  🆕 Round 28s300 — applies live admin name/desc/price overrides so every
 *  label + price lookup that routes through here reflects the current
 *  admin-set values. No override → the raw catalog entry, unchanged. */
export function getServiceById(id: string | null | undefined): MassageService | null {
  const resolved = resolveServiceId(id);
  if (!resolved) return null;
  const base = allServices().find((s) => s.id === resolved);
  return base ? withLiveServiceOverrides(base) : null;
}

/** Display label for a service. Prefers live catalog → falls back to
 *  legacy snapshot (`fallback` arg) → "Service". */
export function getServiceLabel(
  id: string | null | undefined,
  fallback?: string | null
): string {
  const svc = getServiceById(id);
  if (svc?.name) return svc.name;
  if (fallback?.trim()) return fallback.trim();
  return "Service";
}

/** Short label (≤ 20 chars) for compact chips. Falls back to full name. */
export function getServiceLabelShort(
  id: string | null | undefined,
  fallback?: string | null
): string {
  const full = getServiceLabel(id, fallback);
  return full.length > 20 ? `${full.slice(0, 18)}…` : full;
}

export function getServicePrice(
  serviceId: string | null | undefined,
  durationMin: number
): number | null {
  const svc = getServiceById(serviceId);
  if (!svc) return null;
  return priceForDuration(svc, durationMin);
}

/** Live catalog "From ฿X" starting price (cheapest duration tier).
 *  Used by service tiles + "Book now" CTAs. Returns 0 for unknown id. */
export function getServiceStartingPrice(
  serviceId: string | null | undefined
): number {
  const svc = getServiceById(serviceId);
  return svc ? startingPrice(svc) : 0;
}

/** Formatted live "From ฿1,200" string for display. Empty when unknown. */
export function getServiceStartingPriceLabel(
  serviceId: string | null | undefined
): string {
  const p = getServiceStartingPrice(serviceId);
  return p > 0 ? formatTHB(p) : "";
}

/** Returns the difference between what the customer PAID
 *  (`paidPrice` snapshot from the booking) and what the service
 *  CURRENTLY costs. Useful for "price has changed since you booked"
 *  banners or refund/credit calculations. */
export function getPriceDelta(
  serviceId: string | null | undefined,
  durationMin: number,
  paidPrice: number | null | undefined
): { current: number | null; paid: number; delta: number } | null {
  if (typeof paidPrice !== "number") return null;
  const current = getServicePrice(serviceId, durationMin);
  if (current === null) return null;
  return { current, paid: paidPrice, delta: current - paidPrice };
}

// ─── Payment method lookup ───────────────────────────────────────────

const ALL_PAYMENT_IDS: ReadonlySet<PaymentMethodId> = new Set([
  "promptpay",
  "cash",
  "card",
  "truemoney",
  "alipay",
  "wechat",
]);

/** Display label for a payment method id (e.g. "Cash", "PromptPay"). */
export function getPaymentLabel(
  id: string | null | undefined,
  fallback?: string | null
): string {
  if (id && ALL_PAYMENT_IDS.has(id as PaymentMethodId)) {
    return PAYMENT_LABELS[id as PaymentMethodId];
  }
  if (fallback?.trim()) return fallback.trim();
  return "Cash";
}

// ─── Meeting-point + location-type enum labels ───────────────────────
//
// Until we move these to a structured catalog, the labels are inline.
// All callers should use getMeetingPointLabel / getLocationTypeLabel
// instead of reading raw strings — same pattern, future-proof.

export type MeetingPointId =
  | "lobby"
  | "lift"
  | "direct"
  | "front-desk"
  | "other";

const MEETING_POINT_LABELS: Record<MeetingPointId, string> = {
  lobby: "Meet at Lobby",
  lift: "Wait for me at the lift",
  direct: "Come Directly",
  "front-desk": "Front desk pickup",
  other: "Other",
};

export function getMeetingPointLabel(
  id: string | null | undefined,
  fallback?: string | null
): string {
  if (id && id in MEETING_POINT_LABELS) {
    return MEETING_POINT_LABELS[id as MeetingPointId];
  }
  if (fallback?.trim()) return fallback.trim();
  return "—";
}

export type LocationTypeId =
  | "hotel"
  | "condo"
  | "house"
  | "office"
  | "other";

const LOCATION_TYPE_LABELS: Record<LocationTypeId, string> = {
  hotel: "Hotel",
  condo: "Condo",
  house: "House",
  office: "Office",
  other: "Other",
};

export function getLocationTypeLabel(
  id: string | null | undefined,
  fallback?: string | null
): string {
  if (id && id in LOCATION_TYPE_LABELS) {
    return LOCATION_TYPE_LABELS[id as LocationTypeId];
  }
  if (fallback?.trim()) return fallback.trim();
  return "—";
}
