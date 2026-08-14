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
 * 🆕 28x.99u (audit) — was defined byte-for-byte identically in both
 * AdminEarningsPage.tsx and AdminTherapistPayoutsPage.tsx (the second file's
 * own comment already admitted it: "same messy `payment` field as the
 * Pay-Therapists page"). Copy-pasted rather than shared, so it was in sync
 * only by luck — same latent-drift shape as the pricing-drift lesson in
 * CLAUDE.md. Cash = collected in hand by the therapist (shop owes nothing);
 * anything else = money with shop. Customer flow writes a LABEL to
 * `payment`, admin-add writes a raw VALUE — check both.
 */
export function isCashPayment(payment?: string | null, methodId?: string | null): boolean {
  const p = (payment ?? "").trim().toLowerCase();
  const m = (methodId ?? "").trim().toLowerCase();
  return m === "cash" || p === "cash" || p.startsWith("เงินสด");
}

/**
 * 🆕 28w.52 (founder policy 2026-07-14) — a NO-SHOW (customer didn't come,
 * but the therapist already travelled) earns ฿0 service revenue but still owes
 * the therapist a taxi compensation. Every other excluded status (cancelled /
 * refunded / failed / rejected) pays ฿0 to everyone.
 *
 * 🆕 28w.53 (founder refinement) — the comp STARTS at ฿200 but uses the
 * booking's actual taxi fare when that is higher (View can edit taxiFee up for
 * a long trip). And the SHOP now BEARS the comp: it is subtracted from shop
 * revenue so the books reconcile — on a no-show nothing is collected, so
 * shop (−comp) + therapist (+comp) = 0.
 */
export const NO_SHOW_TAXI_COMP = 200;

export const isNoShow = (status: string | null | undefined): boolean =>
  status === "no_show";

/** Taxi comp owed to the therapist for a no-show: max(฿200, actual taxi fare).
 *  0 for any non-no-show status. The shop bears this (subtract from shop net). */
export function noShowCompFor(b: { status?: string | null; taxiFee?: number | null }): number {
  if (!isNoShow(b.status)) return 0;
  return Math.max(NO_SHOW_TAXI_COMP, Math.round(b.taxiFee ?? 0));
}

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
 *  (servicePrice − discount) − therapist payout, floored at 0.
 *
 *  🆕 28x.161 — this used to prefer the FROZEN `shopShare` stamped on the
 *  booking, and that was wrong. Unlike `therapistShare` (a real payout, frozen
 *  on purpose by 28w.43 so a later split-table edit can't move a confirmed
 *  job), the shop's cut is a pure RESIDUAL of the booking's own numbers. The
 *  moment any of those numbers is edited after confirm — and a promo keyed on
 *  the slip is exactly that, see AdminBookingListPage's edit drawer, which
 *  writes `discountAmount` and never re-stamps — the frozen residual is stale,
 *  and every baht of the promo lands on the therapist's settlement instead of
 *  the shop's. That contradicts the promo rule stated in this very file
 *  ("promo absorbed by the shop, therapist keeps her full rate").
 *
 *  Deriving it always is also what AdminEarningsPage and SplitTableEditor
 *  already did on their own — Reports was the one surface still trusting the
 *  stamp, so the two payroll screens silently disagreed on discounted jobs.
 *  The field is still WRITTEN (it's in the Excel export and the booking
 *  record); it is simply never trusted over the arithmetic on read. */
export function shopShareFor(b: {
  serviceId?: string | null;
  servicePrice?: number | null;
  discountAmount?: number | null;
  duration?: number | null;
  therapistShare?: number | null;
  shopShare?: number | null;
}): number {
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

// ─────────────────────────────────────────────────────────────────────
// 🆕 Round 28x.114 (founder: full staff wallet / payslip settlement) — the
//   ONE engine that decides, per booking, who owes whom and how much. Every
//   money surface (admin payslip, staff wallet) reads this so they can never
//   disagree. Founder-confirmed model:
//
//   • CASH booking — the therapist collected the whole cash (service + taxi)
//     from the guest. She keeps her share + the taxi; she OWES the shop the
//     shop's share. Taxi cancels out (she collected it and keeps it), so the
//     net is simply −shopShare (therapist owes shop).
//   • TRANSFER booking (guest paid the shop directly) — the shop holds the
//     money. The shop OWES the therapist her share + the taxi; the shop keeps
//     its share (+ any payment service charge). Net = +(therapistShare + taxi).
//   • NO-SHOW — no service, but the therapist travelled: the shop owes her the
//     taxi comp (max ฿200 / actual). Net = +noShowComp.
//   • Promo is absorbed by the SHOP (therapist keeps her full rate) — it's a
//     line on the slip, never subtracted from the therapist.
//   • staffBonus — shop gives it to the therapist → shop owes her (net +bonus).
//   • staffDeduction — a penalty on the therapist → she owes the shop (net −).
//
//   SIGN CONVENTION: net > 0 ⇒ SHOP OWES THERAPIST (เงินโอนค้างรับ / ร้านค้าง
//   จ่าย). net < 0 ⇒ THERAPIST OWES SHOP (ยอดโอนให้ร้าน). Sum net across a
//   therapist's bookings for the period → her settlement balance.
export interface SettlementInput {
  status?: string | null;
  serviceId?: string | null;
  servicePrice?: number | null;
  discountAmount?: number | null;
  duration?: number | null;
  therapistShare?: number | null;
  shopShare?: number | null;
  taxiFee?: number | null;
  payment?: string | null;
  paymentMethodId?: string | null;
  /** shop → therapist, added to net (28x.114). */
  staffBonus?: number | null;
  /** therapist penalty, subtracted from net (28x.114). */
  staffDeduction?: number | null;
}

export interface BookingSettlement {
  /** > 0 shop owes therapist · < 0 therapist owes shop · 0 settled */
  net: number;
  therapistShare: number;
  shopShare: number;
  taxi: number;
  noShowComp: number;
  discount: number;
  bonus: number;
  deduction: number;
  isCash: boolean;
  /** true only for completed/paid service work (not no-show / cancelled) */
  counted: boolean;
  direction: "shop_owes" | "therapist_owes" | "settled";
}

export function bookingSettlement(b: SettlementInput): BookingSettlement {
  const bonus = Math.max(0, Math.round(b.staffBonus ?? 0));
  const deduction = Math.max(0, Math.round(b.staffDeduction ?? 0));
  const taxi = Math.max(0, Math.round(b.taxiFee ?? 0));
  const discount = Math.max(0, Math.round(b.discountAmount ?? 0));
  const isCash = isCashPayment(b.payment, b.paymentMethodId);
  const dir = (n: number): BookingSettlement["direction"] =>
    n > 0 ? "shop_owes" : n < 0 ? "therapist_owes" : "settled";

  // No-show first — it's in PAYROLL_EXCLUDED but earns a taxi comp, so it must
  // be handled before the generic excluded branch below.
  if (isNoShow(b.status)) {
    const comp = noShowCompFor(b);
    const net = comp + bonus - deduction;
    return { net, therapistShare: 0, shopShare: 0, taxi, noShowComp: comp, discount: 0, bonus, deduction, isCash, counted: false, direction: dir(net) };
  }

  // Cancelled / refunded / failed / rejected — no service money moves, but a
  // manual bonus/deduction stamped on the booking still settles.
  if (isPayrollExcluded(b.status)) {
    const net = bonus - deduction;
    return { net, therapistShare: 0, shopShare: 0, taxi: 0, noShowComp: 0, discount: 0, bonus, deduction, isCash, counted: false, direction: dir(net) };
  }

  // Completed / paid / in-progress — real service work.
  const therapistShare = therapistPayoutFor(b);
  const shopShare = shopShareFor(b);
  const serviceNet = isCash ? -shopShare : therapistShare + taxi;
  const net = serviceNet + bonus - deduction;
  return { net, therapistShare, shopShare, taxi, noShowComp: 0, discount, bonus, deduction, isCash, counted: true, direction: dir(net) };
}

/** Aggregate settlement across a therapist's bookings (28x.114). Returns the
 *  running totals a payslip / wallet renders. `balance` > 0 ⇒ shop owes her. */
export function settlementTotals(bookings: SettlementInput[]): {
  balance: number;
  jobs: number;
  therapistEarned: number;   // Σ therapistShare on counted jobs (her gross)
  shopShareTotal: number;    // Σ shopShare on counted jobs
  cashShopShare: number;     // shop share she collected in cash → owes shop
  transferOwedToHer: number; // share+taxi the shop holds on transfer jobs
  noShowComp: number;
  bonus: number;
  deduction: number;
  discount: number;
  taxiTotal: number;
} {
  const t = {
    balance: 0, jobs: 0, therapistEarned: 0, shopShareTotal: 0, cashShopShare: 0,
    transferOwedToHer: 0, noShowComp: 0, bonus: 0, deduction: 0, discount: 0, taxiTotal: 0,
  };
  for (const b of bookings) {
    const s = bookingSettlement(b);
    t.balance += s.net;
    t.noShowComp += s.noShowComp;
    t.bonus += s.bonus;
    t.deduction += s.deduction;
    t.discount += s.discount;
    if (s.counted) {
      t.jobs++;
      t.therapistEarned += s.therapistShare;
      t.shopShareTotal += s.shopShare;
      t.taxiTotal += s.taxi;
      if (s.isCash) t.cashShopShare += s.shopShare;
      else t.transferOwedToHer += s.therapistShare + s.taxi;
    }
  }
  return t;
}
