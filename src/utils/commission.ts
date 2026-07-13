// src/utils/commission.ts
//
// 🆕 Round 28s247 (audit of /admin/reports) — SINGLE SOURCE OF TRUTH for the
//   therapist commission split, shared by AdminEarningsPage AND
//   AdminReportPage.
//
//   Why this file exists: round 28r27 moved Earnings to a tier-aware split
//   (65% Gentleman's, 70% B2B) applied on the POST-DISCOUNT service price,
//   but AdminReportPage was never updated and stayed on a flat 60/40 over
//   FULL price. So the two payroll surfaces silently disagreed — Reports
//   (the page View actually uses to pay staff) under-paid premium-tier
//   therapists and over-paid on discounted bookings. Both pages now import
//   from here so they can never drift again.
//
//   🆕 Round 28s248 (founder: "แก้ที่ commission.ts") — the split is now a
//   FLAT 60/40 for every service. Founder confirmed the real deal is a
//   straight 60% therapist · 40% shop across all tiers; the per-tier premium
//   (65% Gentleman's / 70% B2B) trialled in 28r27 is OFF. Because both
//   Earnings and Reports read this one map, changing it here updates both
//   payroll surfaces at once. To bring tiers back later, just set
//   "SR-HJ2200": 0.65 and "SR-B2B3200": 0.7 again — nothing else to touch.
//
//   Still true (separate 28r27 rule, NOT changed): commission is charged on
//   (servicePrice − discount), so therapist + shop share any promo cost
//   proportionally instead of the shop absorbing 100%.

export const TIER_THERAPIST_PCT: Record<string, number> = {
  "xSR-Thai": 0.6,
  "SR-Aroma": 0.6,
  "SR-HJ2200": 0.6, // was 0.65 (tier premium off — flat 60/40, 28s248)
  "SR-B2B3200": 0.6, // was 0.70 (tier premium off — flat 60/40, 28s248)
};

export const DEFAULT_THERAPIST_PCT = 0.6;

export const therapistPctFor = (serviceId: string | null | undefined): number => {
  if (!serviceId) return DEFAULT_THERAPIST_PCT;
  return TIER_THERAPIST_PCT[serviceId] ?? DEFAULT_THERAPIST_PCT;
};

// ─────────────────────────────────────────────────────────────────────
// 🆕 Round 28w.39 (founder 2026-07-14 "โครงสร้างการคิดเงินทั้งหมด …
//   ตารางส่วนแบ่ง เอาไว้หน้ารีพอต") — FIXED per-(service, duration)
//   therapist split, in baht. When an entry exists it WINS over the tier %.
//   The shop's cut is derived (service revenue − therapist), so the Report
//   totals always reconcile.
//
//   Source of truth = the therapist amount (that's the payout View pays).
//   The shop share = (servicePrice − discount) − therapistAmount, so a
//   promo is absorbed by the shop and the therapist keeps their rate.
//
//   These are the code DEFAULTS; the admin split tool on the Report page
//   overrides them live via adminSettings/earnings.serviceSplits (loaded
//   by applyServiceSplitConfig). Durations with no entry (e.g. legacy
//   80-min bookings) fall back to the tier % below — so history never
//   breaks.
//
//   NOTE on the founder's raw numbers: for Aromatherapy 90 min the split
//   she gave (shop 800 + therapist 1,100 = 1,900) didn't match the price
//   (1,800), so the therapist figure (1,100) is used and shop derives to
//   700 — adjust in the tool if a different split was intended.
export const SERVICE_SPLIT_DEFAULTS: Record<string, Record<number, number>> = {
  "xSR-Thai":   { 60: 700,  90: 900,  120: 1200 },
  "SR-Aroma":   { 60: 800,  90: 1100, 120: 1500 },
  "SR-HJ2200":  { 70: 1300, 120: 1800 },
  "SR-B2B3200": { 70: 2000, 120: 2500 },
};

// Live admin overrides merged over the defaults (per service+duration).
let serviceSplitOverrides: Record<string, Record<number, number>> = {};

/** Apply the admin-edited split table (from adminSettings/earnings). Merges
 *  per-entry over SERVICE_SPLIT_DEFAULTS; pass null/undefined to clear. */
export function applyServiceSplitConfig(
  cfg: Record<string, Record<number, number>> | null | undefined,
): void {
  serviceSplitOverrides = cfg ?? {};
}

/** The effective split table (defaults + admin overrides), for the editor. */
export function effectiveServiceSplits(): Record<string, Record<number, number>> {
  const out: Record<string, Record<number, number>> = {};
  for (const [sid, tiers] of Object.entries(SERVICE_SPLIT_DEFAULTS)) {
    out[sid] = { ...tiers };
  }
  for (const [sid, tiers] of Object.entries(serviceSplitOverrides)) {
    out[sid] = { ...(out[sid] ?? {}), ...tiers };
  }
  return out;
}

/** Fixed therapist amount for a (service, duration), or null if none set. */
export function therapistFixedFor(
  serviceId: string | null | undefined,
  duration: number | null | undefined,
): number | null {
  if (!serviceId || duration == null) return null;
  const amt = serviceSplitOverrides[serviceId]?.[duration] ??
    SERVICE_SPLIT_DEFAULTS[serviceId]?.[duration];
  return typeof amt === "number" && amt >= 0 ? amt : null;
}

/**
 * Statuses that must NOT earn payroll — cancelled/refunded/no-show/etc.
 * Includes both British and American spellings of "cancel(l)ed". A booking
 * outside this set is a real, payable job.
 */
export const PAYROLL_EXCLUDED_STATUSES = new Set([
  "cancelled",
  "canceled",
  "refunded",
  "failed",
  "rejected",
  "no_show",
]);

export const isPayrollExcluded = (status: string | null | undefined): boolean =>
  !!status && PAYROLL_EXCLUDED_STATUSES.has(status);

/**
 * 🆕 28w.52 (founder policy 2026-07-14) — a NO-SHOW (customer didn't come,
 * but the therapist already travelled) is treated as CANCELLED for the SHOP —
 * ฿0 service revenue, ฿0 shop cut — yet the therapist is still owed a flat
 * ฿200 taxi compensation. Every other excluded status (cancelled / refunded /
 * failed / rejected) pays ฿0 to everyone.
 *
 * This ฿200 is a therapist-PAY line only; per the founder's "ร้านนับเป็น
 * cancelled" it is NOT netted against shop revenue (the shop figure stays ฿0).
 * Add noShowCompFor(status) to payroll totals for excluded bookings so a
 * no-show still pays the taxi.
 */
export const NO_SHOW_TAXI_COMP = 200;

export const isNoShow = (status: string | null | undefined): boolean =>
  status === "no_show";

export const noShowCompFor = (status: string | null | undefined): number =>
  isNoShow(status) ? NO_SHOW_TAXI_COMP : 0;

/**
 * The commission base = service price after promo discount, floored at 0.
 * (Taxi is a pass-through and never part of the commission split.)
 */
export function commissionBaseFor(b: {
  servicePrice?: number | null;
  discountAmount?: number | null;
}): number {
  return Math.max(0, (b.servicePrice ?? 0) - (b.discountAmount ?? 0));
}

/**
 * Therapist payout for ONE booking — tier % applied on the post-discount
 * base. This is THE payroll figure; Earnings and Reports must both use it so
 * the amount owed to each therapist is identical on both screens.
 */
export function therapistPayoutFor(b: {
  serviceId?: string | null;
  servicePrice?: number | null;
  discountAmount?: number | null;
  duration?: number | null;
  therapistShare?: number | null;
}): number {
  // 🆕 28w.43 — a split FROZEN on the booking at confirm-time (see stampSplit)
  //   always wins, so a later split-table edit never moves a confirmed job.
  if (typeof b.therapistShare === "number" && b.therapistShare >= 0) {
    return Math.round(b.therapistShare);
  }
  // 🆕 28w.46 (founder chose "ก": Thai 60 = พนักงาน 700) — un-stamped bookings
  //   (existing ones from before the split table) use the CURRENT split table
  //   so the table applies to them too. Only durations with NO fixed entry
  //   (odd/legacy) fall back to the tier %.
  const fixed = therapistFixedFor(b.serviceId, b.duration);
  if (fixed != null) return fixed;
  return Math.round(commissionBaseFor(b) * therapistPctFor(b.serviceId));
}

/** The shop's cut of ONE booking's service revenue (taxi excluded) =
 *  (servicePrice − discount) − therapist payout, floored at 0. Prefers the
 *  frozen shopShare; otherwise reconciles with therapistPayoutFor. */
export function shopShareFor(b: {
  serviceId?: string | null;
  servicePrice?: number | null;
  discountAmount?: number | null;
  duration?: number | null;
  therapistShare?: number | null;
  shopShare?: number | null;
}): number {
  if (typeof b.shopShare === "number" && b.shopShare >= 0) return Math.round(b.shopShare);
  return Math.max(0, commissionBaseFor(b) - therapistPayoutFor(b));
}

/** 🆕 28w.43 — the split to FREEZE onto a booking at confirm-time, from the
 *  CURRENT split table: the fixed per-(service, duration) therapist amount,
 *  or the tier % as a fallback for durations with no fixed entry. Write both
 *  fields onto the booking doc; the payslip then reads them verbatim forever. */
export function stampSplit(b: {
  serviceId?: string | null;
  servicePrice?: number | null;
  discountAmount?: number | null;
  duration?: number | null;
}): { therapistShare: number; shopShare: number } {
  const fixed = therapistFixedFor(b.serviceId, b.duration);
  const therapistShare =
    fixed != null ? fixed : Math.round(commissionBaseFor(b) * therapistPctFor(b.serviceId));
  const shopShare = Math.max(0, commissionBaseFor(b) - therapistShare);
  return { therapistShare, shopShare };
}
