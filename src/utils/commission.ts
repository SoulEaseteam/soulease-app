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
//   Founder rule (28r27, "ไม่คุ่มเสี่ยงเกินไป"):
//     Entry (Thai / Aroma)          → 60% therapist · 40% shop
//     Mid   (Gentleman's Signature) → 65% therapist · 35% shop
//     Premium (B2B Therapeutic)     → 70% therapist · 30% shop
//   Commission is charged on (servicePrice − discount), so therapist + shop
//   share any promo cost proportionally rather than the shop absorbing 100%.

export const TIER_THERAPIST_PCT: Record<string, number> = {
  "xSR-Thai": 0.6,
  "SR-Aroma": 0.6,
  "SR-HJ2200": 0.65,
  "SR-B2B3200": 0.7,
};

export const DEFAULT_THERAPIST_PCT = 0.6;

export const therapistPctFor = (serviceId: string | null | undefined): number => {
  if (!serviceId) return DEFAULT_THERAPIST_PCT;
  return TIER_THERAPIST_PCT[serviceId] ?? DEFAULT_THERAPIST_PCT;
};

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
}): number {
  return Math.round(commissionBaseFor(b) * therapistPctFor(b.serviceId));
}
