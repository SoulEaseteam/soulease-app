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
} from "@/utils/servicePricing";

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
 * Resolve any user-supplied identifier (URL slug, SKU id, even a name)
 * to a canonical SKU id. Returns `null` if no match.
 */
export function resolveServiceId(
  idOrSlug: string | null | undefined
): string | null {
  if (!idOrSlug) return null;
  const key = idOrSlug.trim().toLowerCase();
  if (!key) return null;

  // 1. Direct SKU match (case-insensitive — admins sometimes type SR-Aroma vs sr-aroma)
  const direct = services.find((s) => s.id.toLowerCase() === key);
  if (direct) return direct.id;

  // 2. Legacy slug alias
  const aliased = LEGACY_SERVICE_SLUG_MAP[key];
  if (aliased) return aliased;

  // 3. Name match (last resort — handles old URLs encoded with the
  //    display name e.g. /services/Thai%20Massage)
  const byName = services.find(
    (s) => s.name.toLowerCase().replace(/[^a-z0-9]/g, "") === key.replace(/[^a-z0-9]/g, "")
  );
  if (byName) return byName.id;

  return null;
}

/** Resolve a service catalog entry by id (or any legacy alias). `null` if not found. */
export function getServiceById(id: string | null | undefined): MassageService | null {
  const resolved = resolveServiceId(id);
  if (!resolved) return null;
  return services.find((s) => s.id === resolved) ?? null;
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

// ─── Service price lookup ────────────────────────────────────────────
//
// 💰 Three distinct price layers — DO NOT confuse (founder principle
//    2026-05-04: "ราคาไม่มีทางซ้ำ หากมีส่วนลดในอนาคต ก็นับราคาตั้งต้นก่อน"):
//
//   1. BASE PRICE (immutable reference)
//        `basePrice` field on booking + `service.price` in catalog.
//        The catalog 60-min standard rate. Discounts NEVER reduce
//        this — analytics/reports can always reconstruct original
//        revenue from this number alone.
//
//   2. SERVICE PRICE (duration-adjusted, BEFORE discount)
//        `servicePrice` field on booking. Equals
//        `priceForDuration(service, duration)` at booking time. This
//        is the LIST PRICE the customer would pay without any code.
//        Snapshot — never changes after booking.
//
//   3. PAID PRICE (final, AFTER discount + travel fee + addons)
//        `totalPrice` field on booking. The exact amount transferred.
//        When a future discount lands, we'll add a `discountAmount`
//        field and compute `paid = servicePrice - discountAmount +
//        taxiFee + addonsTotal` — basePrice + servicePrice stay
//        untouched as historical reference.
//
// Catalog lookup helpers (LIVE — for tiles, current list pricing):
//
//   getServicePrice(serviceId, duration)   → current per-duration price
//   getServiceStartingPrice(serviceId)     → cheapest tier ("From ฿X")
//
// Booking page lookup (HISTORICAL — never recompute, just read):
//
//   booking.basePrice                      → original 60-min reference
//   booking.servicePrice                   → list price at time of booking
//   booking.totalPrice                     → what they actually paid
//
// Future discount path (no schema migration needed):
//   • Add `discountAmount: number` to booking write
//   • UI subtracts: `final = servicePrice - discountAmount`
//   • Reports still show "list price" via servicePrice column intact

/** Live catalog price (THB) for a service id + duration. Returns
 *  `null` when the id isn't in the catalog or the duration isn't
 *  supported. Use for current/list pricing — NOT historical. */
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
