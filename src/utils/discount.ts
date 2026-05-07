// src/utils/discount.ts
//
// 🆕 Round 28r14 (founder 2026-05-07) — Discount validator + apply logic.
//
// Phase 1 of the discount system. Stops the FIRST10 banner +
// ReferralDialog from being vaporware: the codes that customers copy
// or land via `?ref=` URL now actually subtract value at checkout
// instead of just dressing up a banner.
//
// Codes recognised:
//   • FIRST10                — first-booking 10% off, capped at ฿200
//   • SUN-XXXXXX (4-8 chars) — referral code, flat ฿200 off (entry tier only)
//   • (admin-issued codes)   — handled manually via concierge chat;
//                              unknown codes return `valid: false`
//                              so the UI shows a quiet "code not
//                              recognised" hint without blocking
//                              the booking. Admin can still apply
//                              the discount manually after the fact.
//
// Trust model — Phase 1 is INTENTIONALLY client-side only:
//   • View sees the booking notification in Telegram with the
//     discount applied → can override / refuse before confirming.
//   • Bookings are still concierge-confirmed before payment, so
//     a forged code at most causes a "your code didn't apply,
//     here's the real total" friction moment.
//   • Phase 2 (when bookings auto-confirm or take prepayment)
//     will move validation to a Cloud Function with per-code
//     usage limits + customer-uniqueness checks.
//
// Pure functions — no React, no Firestore. Easy to unit-test and
// reuse from BookingFlowPage, the admin panel, or future widgets.

import { getActiveReferralCode } from "@/utils/referral";

// 🆕 Round 28r28 (founder 2026-05-07) — Caps reduced significantly
//   after founder audit: "10% ครั้งแรกมันหนักไป และเขามาแค่ 3-7 วัน
//   โอกาสน้อยมากที่จะกลับมา". Tourists stay 3-7 days = no return
//   visit to recover the discount. Margin protected by aggressive
//   caps that work like fixed amounts on small tickets.
const FIRST10_PERCENT = 10;
const FIRST10_CAP_THB = 200;     // was 500 — heavy on tourist who won't return
const WELCOME20_PERCENT = 10;    // was 20 — too generous
const WELCOME20_CAP_THB = 300;   // was 800
const REFERRAL_FIXED_THB = 200;  // was 500
const TONIGHT500_FIXED_THB = 200; // was 500 — still valuable on prime
const SAMMY200_FIXED_THB = 200;  // unchanged (legacy promise)
// 🆕 Round 28r28 — Premium-tier promos. Designed to be margin-safe
//   on Gentleman/B2B (฿2,400-3,600 tickets) without giving away
//   shop-killing 10% style discounts.
const VIP100_FIXED_THB = 100;    // small flat off for premium

// 🆕 Round 28r20 — TONIGHT500 only valid for bookings starting in
//   prime hours (22:00–04:00 BKK). Booked daytime → "code not
//   recognised" hint, no discount applied.
const TONIGHT_HOUR_START = 22;
const TONIGHT_HOUR_END = 4;

const REFERRAL_CODE_RE = /^SUN-[A-Z0-9]{4,8}$/;
const FIRST_TIME_CODE = "FIRST10";
const WELCOME_CODE = "WELCOME20";
const TONIGHT_CODE = "TONIGHT500";
const SAMMY_CODE = "SAMMY200";

export type DiscountType = "percent" | "fixed" | "none";

export interface DiscountResult {
  /** True when the code matches a known program. */
  valid: boolean;
  /** Canonical (upper-cased, trimmed) code that was evaluated. */
  code: string;
  /** Amount to subtract in THB. Always ≥ 0; pre-rounded to integer. */
  amount: number;
  /** UX label, e.g. "First booking — 10% off". */
  label: string;
  /** "percent" | "fixed" | "none" — for display formatting. */
  type: DiscountType;
}

const NULL_RESULT: DiscountResult = {
  valid: false,
  code: "",
  amount: 0,
  label: "",
  type: "none",
};

export interface DiscountValidationContext {
  /** Bangkok-local hour (0-23) of the booking start time. */
  bookingHourBKK?: number;
  /** 🆕 Round 28r27 — Service id of the booking being priced. */
  serviceId?: string | null;
  /** 🆕 Round 28r28 — Travel fee in THB (for FREETAXI logic). */
  taxiFareTHB?: number;
}

// 🆕 Round 28r27 — Per-tier eligibility. Entry tier accepts all
// promo codes; Mid/Premium need premium-tier-specific codes only.
const PROMO_BLOCKED_SERVICES = new Set(["SR-HJ2200", "SR-B2B3200"]);

// 🆕 Round 28r28 — Premium-only promo codes that BYPASS the
// PROMO_BLOCKED gate. Founder direction: "Gentleman/B2B (premium)
// เอามาทำโปรขั้นต่ำ หรือ ลดค่าแท๊กซี่ หรือ ลด 100 หรือ 10% ครั้งถัดไป".
// Both are designed to be margin-safe on premium tier (small cap or
// affordable taxi waiver) so we can still attract VIP guests without
// the blunt 10% off that would wreck unit economics on ฿3,300 tickets.
const PREMIUM_OK_CODES = new Set(["VIP100", "FREETAXI"]);

/**
 * Validate a discount code against the current subtotal.
 * @param raw         User-entered code (any case, may have whitespace)
 * @param subtotalTHB Booking subtotal BEFORE discount (service + addons + travel).
 *                    The cap on percent discounts is computed against this.
 * @param ctx         Optional context (booking time, etc.) for codes
 *                    that require it. See DiscountValidationContext.
 * @returns           Always-defined result. Inspect `.valid` to decide.
 */
export function validateDiscount(
  raw: string | null | undefined,
  subtotalTHB: number,
  ctx?: DiscountValidationContext
): DiscountResult {
  if (!raw) return NULL_RESULT;
  const code = raw.trim().toUpperCase();
  if (!code) return NULL_RESULT;

  // 🆕 Round 28r27 — Service-tier gate. Promo codes are blocked on
  //   premium-tier services.
  // 🆕 Round 28r28 — PREMIUM_OK_CODES (VIP100, FREETAXI) bypass the
  //   gate — they're designed margin-safe specifically for premium.
  // 🆕 Round 28r33 (founder 2026-05-07) — Bug fix: referral codes
  //   (SUN-XXX) used to bypass this gate. Founder spotted SUN-EGTO12
  //   applying ฿200 off on B2B Therapeutic — that's a ฿200 hit on a
  //   tier where the rule is "premium = VIP100 / FREETAXI only".
  //   Removed the `!isReferral` exception so referrals are now
  //   subject to the same gate. PREMIUM_OK_CODES still bypasses.
  const isPremiumOk = PREMIUM_OK_CODES.has(code);
  if (
    !isPremiumOk &&
    ctx?.serviceId &&
    PROMO_BLOCKED_SERVICES.has(ctx.serviceId)
  ) {
    // Quietly invalid — UI shows hint that's per-tier-aware.
    return { ...NULL_RESULT, code };
  }

  // 🆕 Round 28r28 — VIP100: flat ฿100 off, premium tiers only.
  //   Founder rule: "ลด 100" — small, margin-safe acquisition lever
  //   for the high-ticket Gentleman/B2B services.
  if (code === "VIP100") {
    if (!ctx?.serviceId || !PROMO_BLOCKED_SERVICES.has(ctx.serviceId)) {
      // Only valid on premium tiers — quiet invalid for entry tier
      // (those guests should use FIRST10 / WELCOME20 instead).
      return { ...NULL_RESULT, code };
    }
    return {
      valid: true,
      code,
      amount: VIP100_FIXED_THB,
      label: `VIP — ฿${VIP100_FIXED_THB} off premium`,
      type: "fixed",
    };
  }

  // 🆕 Round 28r28 — FREETAXI: waive the travel fee for premium
  //   tiers. Founder rule: "ลดค่าแท๊กซี่". Discount amount equals
  //   the actual taxi fare (passed via ctx). UI label makes it
  //   crystal-clear that the trip is comped.
  if (code === "FREETAXI") {
    if (!ctx?.serviceId || !PROMO_BLOCKED_SERVICES.has(ctx.serviceId)) {
      return { ...NULL_RESULT, code };
    }
    const taxi = Math.max(0, ctx.taxiFareTHB ?? 0);
    if (taxi <= 0) {
      // Free zone or address not set → code can't apply yet.
      return { ...NULL_RESULT, code };
    }
    return {
      valid: true,
      code,
      amount: taxi,
      label: `Travel comped — saves ฿${taxi}`,
      type: "fixed",
    };
  }

  // ── FIRST10: 10% off, capped at ฿500 ──
  if (code === FIRST_TIME_CODE) {
    const raw10 = Math.round((subtotalTHB * FIRST10_PERCENT) / 100);
    const amount = Math.max(0, Math.min(raw10, FIRST10_CAP_THB));
    return {
      valid: true,
      code,
      amount,
      label: `First booking — ${FIRST10_PERCENT}% off`,
      type: "percent",
    };
  }

  // 🆕 Round 28r20 — WELCOME20: 20% off, capped at ฿800.
  // Higher-tier launch promo. Customer chooses one (FIRST10 vs
  // WELCOME20) — no stacking; whichever they type wins.
  if (code === WELCOME_CODE) {
    const raw20 = Math.round((subtotalTHB * WELCOME20_PERCENT) / 100);
    const amount = Math.max(0, Math.min(raw20, WELCOME20_CAP_THB));
    return {
      valid: true,
      code,
      amount,
      label: `Welcome — ${WELCOME20_PERCENT}% off`,
      type: "percent",
    };
  }

  // 🆕 Round 28r20 — TONIGHT500: ฿500 off late-night bookings only.
  // Restricted to booking start time 22:00–04:00 BKK so it actually
  // drives prime-hour conversions (where SunRed has the supply
  // advantage). Booked outside that window → invalid.
  if (code === TONIGHT_CODE) {
    const hour = ctx?.bookingHourBKK;
    const isPrime =
      typeof hour === "number" &&
      (hour >= TONIGHT_HOUR_START || hour < TONIGHT_HOUR_END);
    if (!isPrime) {
      // Quiet invalid — UI shows "code not recognised" hint.
      return { ...NULL_RESULT, code };
    }
    return {
      valid: true,
      code,
      amount: TONIGHT500_FIXED_THB,
      label: `Late-night · ฿${TONIGHT500_FIXED_THB} off`,
      type: "fixed",
    };
  }

  // 🆕 Round 28r20 — SAMMY200: ฿200 off. Honors the promo founder
  // ran on Sammyboy Bangkok forum. No conditions; flat applies.
  if (code === SAMMY_CODE) {
    return {
      valid: true,
      code,
      amount: SAMMY200_FIXED_THB,
      label: `Sammyboy — ฿${SAMMY200_FIXED_THB} off`,
      type: "fixed",
    };
  }

  // ── SUN-XXXXXX: referral, flat ฿200 off (entry tier only after r33) ──
  if (REFERRAL_CODE_RE.test(code)) {
    return {
      valid: true,
      code,
      amount: REFERRAL_FIXED_THB,
      label: `Referral · ฿${REFERRAL_FIXED_THB} off`,
      type: "fixed",
    };
  }

  // Unknown code — invalid (UI shows quiet hint, doesn't block booking).
  return { ...NULL_RESULT, code };
}

/**
 * Suggest an initial discount code on first render of the booking
 * form. Priority:
 *   1. Referral code captured from a `?ref=SUN-XXXX` URL (Round 28r7).
 *   2. FIRST10 code if the guest tapped the FirstBookingBanner —
 *      it stashes the code in sessionStorage on tap (Round 28r14)
 *      so the booking flow can pre-fill it without re-typing.
 *   3. Empty otherwise.
 */
export function getInitialDiscountCode(): string {
  const ref = getActiveReferralCode();
  if (ref) return ref;
  if (typeof window !== "undefined") {
    try {
      const suggested = window.sessionStorage.getItem(
        "sunred.discount.suggested"
      );
      if (suggested) return suggested;
    } catch {
      /* ignore */
    }
  }
  return "";
}
