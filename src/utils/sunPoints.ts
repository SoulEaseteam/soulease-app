// src/utils/sunPoints.ts
//
// 🆕 Round 28x.141 (founder: "เขียนระบบแต้มจริง ... ลูกค้าบางคนมีแค่ประวัติ แต่ไม่มี
//   บัญชีกับเรา") — the real SunPoints ledger, keyed on the CUSTOMER'S PHONE, not
//   a uid. Most SunRed guests are concierge-booked with only a phone (no account),
//   so a uid-keyed balance would exclude them — the exact people who accrue the
//   most history. This mirrors how membership tier + lifetime spend are already
//   derived per phone (membership.ts).
//
//   The balance is DERIVED from booking history, never a mutable counter that can
//   drift:
//     earned   = Σ over the customer's DELIVERED bookings of
//                pointsFor(menuSpend, ×2 if the booking falls in the campaign)
//     redeemed = Σ of `pointsRedeemed` stamped on the customer's bookings
//     balance  = max(0, earned − redeemed)
//   So redeeming points on a booking (stamping pointsRedeemed) permanently lowers
//   the balance — a guest can't spend the same points twice, which the old
//   "points = floor(lifetime spend / rate)" display had no defence against.

import { anniversaryConfig, pointsFor, sunPointTHB } from "@/config/anniversary";
import { menuSpendForBooking } from "@/utils/membership";

/** Statuses that represent a delivered session (earn points). Mirrors the
 *  SERVED set used elsewhere. */
const SERVED = new Set(["completed", "done"]);

/** The booking shape this module reads. Kept loose on purpose so any of the
 *  app's booking types satisfy it without coupling. */
export interface PointsBookingLike {
  status?: string | null;
  phone?: string | null;
  userId?: string | null;
  servicePrice?: number;
  totalPrice?: number;
  taxiFee?: number;
  paymentFee?: number;
  /** Points redeemed ON this booking (the debit side of the ledger). */
  pointsRedeemed?: number;
  startAt?: { toMillis?: () => number; toDate?: () => Date; seconds?: number } | Date | string | number | null;
  createdAt?: { toMillis?: () => number; toDate?: () => Date; seconds?: number } | Date | string | number | null;
  date?: string | null;
}

/** Normalise a phone to digits + leading "+" so the same person keyed on the
 *  same number regardless of spacing/dashes — same rule as computeBookingStats. */
export function normalizePhoneKey(p: unknown): string {
  if (typeof p !== "string") return "";
  const cleaned = p.replace(/[^\d+]/g, "");
  return cleaned.length >= 6 ? cleaned : "";
}

function toMs(v: PointsBookingLike["startAt"]): number {
  if (!v) return 0;
  if (typeof v === "object") {
    const o = v as { toMillis?: () => number; toDate?: () => Date; seconds?: number };
    if (typeof o.toMillis === "function") return o.toMillis();
    if (typeof o.toDate === "function") { const d = o.toDate(); return d ? d.getTime() : 0; }
    if (typeof o.seconds === "number") return o.seconds * 1000;
    if (v instanceof Date) return v.getTime();
    return 0;
  }
  if (typeof v === "number") return v;
  if (typeof v === "string") { const t = Date.parse(v); return Number.isFinite(t) ? t : 0; }
  return 0;
}

/** 1× normally, 2× when the booking falls inside the live campaign window.
 *  Anchored to Bangkok wall-clock so a booking on the boundary day counts. */
export function sunPointsMultiplierForDate(ms: number): number {
  if (!ms) return 1;
  const { startISO, endISO } = anniversaryConfig();
  if (!startISO || !endISO) return 1;
  const start = new Date(`${startISO}T00:00:00+07:00`).getTime();
  const end = new Date(`${endISO}T23:59:59+07:00`).getTime();
  return ms >= start && ms <= end ? 2 : 1;
}

export interface SunPointsSummary {
  earned: number;
  redeemed: number;
  balance: number;
  /** Baht the spendable balance is worth at the current redeem rate. */
  valueTHB: number;
}

/** Compute earned / redeemed / spendable balance from a customer's OWN bookings
 *  (already filtered to that person — see filterCustomerBookings). */
export function sunPointsSummary(customerBookings: PointsBookingLike[]): SunPointsSummary {
  let earned = 0;
  let redeemed = 0;
  for (const b of customerBookings) {
    const status = (b.status ?? "").toLowerCase();
    if (SERVED.has(status)) {
      const when = toMs(b.startAt ?? b.createdAt ?? b.date ?? null);
      earned += pointsFor(menuSpendForBooking(b), sunPointsMultiplierForDate(when));
    }
    const used = typeof b.pointsRedeemed === "number" && b.pointsRedeemed > 0
      ? Math.floor(b.pointsRedeemed)
      : 0;
    redeemed += used;
  }
  const balance = Math.max(0, earned - redeemed);
  return { earned, redeemed, balance, valueTHB: Math.round(balance * sunPointTHB()) };
}

/** Pick the bookings that belong to one customer, by uid OR normalised phone —
 *  so a guest with history but no account is matched on phone alone. */
export function filterCustomerBookings<T extends PointsBookingLike>(
  all: T[],
  who: { phone?: string | null; userId?: string | null },
): T[] {
  const np = normalizePhoneKey(who.phone);
  const uid = who.userId ?? null;
  return all.filter(
    (b) => (uid && b.userId === uid) || (np !== "" && normalizePhoneKey(b.phone) === np),
  );
}
