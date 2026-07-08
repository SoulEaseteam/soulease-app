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

/** 🆕 Round 28r59 (Phase 4 feature #6 "Referral tier system") — pure
 *  helper: given a tier list + a prior-redemption count, return the
 *  HIGHEST tier whose minRedeems <= count, or null if none match / no
 *  list. Exported so the admin test-code sandbox can reason about which
 *  tier a given `referralRedeemCount` would unlock. */
export function pickReferralTier(
  tiers: ReferralTier[] | undefined | null,
  count: number | undefined,
): ReferralTier | null {
  if (!Array.isArray(tiers) || tiers.length === 0) return null;
  if (typeof count !== "number" || !Number.isFinite(count) || count < 0) return null;
  let best: ReferralTier | null = null;
  for (const t of tiers) {
    if (typeof t?.minRedeems !== "number" || typeof t?.amount !== "number") continue;
    if (t.minRedeems > count) continue;
    if (!best || t.minRedeems > best.minRedeems) best = t;
  }
  return best;
}
const FIRST_TIME_CODE = "FIRST10";
const WELCOME_CODE = "WELCOME20";
const TONIGHT_CODE = "TONIGHT500";
const SAMMY_CODE = "SAMMY200";

// 🆕 Round 28s298 (founder: "เพิ่ม เมนู โปรโมชั่น") — every code above
// was locked in code with no admin UI at all. This stays a pure,
// synchronous function (no async signature change, no call-site churn)
// by keeping a module-level cache that the new /admin/promotions page's
// Firestore data gets pushed into once at boot + on every live update —
// see MaintenanceGate.tsx, same pattern as taxiFare.ts's live pricing
// overrides. `disabledBuiltinCodes` lets admin turn OFF one of the
// hardcoded codes above (e.g. retire SAMMY200 after the forum promo
// ends) without a code change; `customCodes` are brand-new codes admin
// creates entirely from the UI, checked as a fallback after every
// hardcoded name above fails to match.
export interface CustomPromoCode {
  type: "percent" | "fixed";
  amount: number;
  capThb?: number;
  label: string;
  /** Epoch ms; null/undefined = never expires. */
  expiresAt?: number | null;
  // 🆕 Round 28s299 — scheduling + guards the founder asked for.
  /** Epoch ms; null/undefined = active immediately. Before this → invalid. */
  startsAt?: number | null;
  /** Booking subtotal (service+addons) must reach this or code is invalid. */
  minSpendThb?: number | null;
  /** Total redemptions across ALL customers. Enforced at booking submit
   *  (a count query — see BookingFlowPage), NOT here: validateDiscount
   *  stays pure/sync with no DB access. */
  maxRedemptions?: number | null;
  /** Redemptions allowed per phone number. Same submit-time enforcement. */
  perPhoneLimit?: number | null;
  // 🆕 Round 28r50 (founder 2026-07-08 — Promotions Phase 1, feature #2
  //   "Scheduled Pricing / Draft Mode") — schedule the code's ACTIVATION for
  //   a future date without shipping code. Semantics: while `scheduledFor
  //   > Date.now()`, the code behaves as if it doesn't exist yet
  //   (byte-identical to no override — the custom-code map filter drops
  //   the entry entirely at setter time). Distinct from `startsAt` because
  //   the two exist for different reasons:
  //     • startsAt: the code exists but gates guests until the window
  //       opens (quiet-invalid inside validateDiscount).
  //     • scheduledFor: the ADMIN edit is not live yet — the app behaves
  //       as if the row hasn't been created / edited at all.
  //   For a brand-new custom code they're effectively equivalent; kept
  //   separate for consistency with LiveServiceOverride / BuiltinPromoOverride
  //   (where the two ARE meaningfully different) and to keep the UI's
  //   "Activate on" picker semantics uniform across the 3 override kinds.
  scheduledFor?: number | null;
}

// 🆕 Round 28r49 (founder 2026-07-08 — "Built-in Codes · โค้ดมาตรฐาน แก้ไข
// และลบได้") — the 7 built-in codes (FIRST10, WELCOME20, TONIGHT500,
// SAMMY200, VIP100, FREETAXI, and the SUN-XXXX referral pattern under the
// pseudo-key "REFERRAL") are now fully editable AND deletable from the
// admin Promotions page. `disabledBuiltinCodes` (28s298) stays as the
// on/off gate; overrides let admin change amount / percent / cap / spend
// floor / scheduling / label per code, or mark it `deleted: true` (treated
// exactly like NULL_RESULT, same "quiet invalid" stance as every other
// rejected path so a guest probing codes doesn't learn what exists).
//
// The override map key is the canonical UPPERCASE code (or the pseudo-key
// "REFERRAL" for the SUN-XXXX pattern, matching the `disabledBuiltinCodes`
// convention). Empty override → hardcoded defaults, byte-identical to
// pre-28r49 behaviour.
export interface BuiltinPromoOverride {
  /** If true, the code is completely disabled (returns NULL_RESULT, quiet
   *  invalid). Distinct from the older `enabled: false` gate — kept
   *  separate so admin can "delete then restore" without losing the
   *  amount/label edits. */
  deleted?: boolean;
  /** Override the fixed-baht amount for FIXED-type builtin codes
   *  (TONIGHT500, SAMMY200, VIP100, REFERRAL). Ignored on FREETAXI (its
   *  amount = actual taxi fare) and on PERCENT codes. */
  amount?: number;
  /** Override the % for PERCENT-type codes (FIRST10, WELCOME20). */
  percent?: number;
  /** Override the cap (THB) on percent codes. */
  cap?: number;
  /** If set, subtotal (discountable base) must reach this or the code is
   *  quiet-invalid — same as custom-code `minSpendThb`. */
  minSpend?: number;
  /** Epoch ms; before this the code is quiet-invalid. */
  startsAt?: number | null;
  /** Epoch ms; after this the code is quiet-invalid. */
  expiryDate?: number | null;
  /** Optional display label override; empty/absent falls back to the
   *  hardcoded template string. */
  label?: string;
  // 🆕 Round 28r50 (feature #2 "Scheduled Pricing / Draft Mode") —
  //   schedule the OVERRIDE's activation, not the code's own eligibility.
  //   While `scheduledFor > Date.now()`, the override is not consulted at
  //   all (falls back to the hardcoded default in discount.ts) — so the
  //   old price/percent/cap/etc. remain live for guests until the picked
  //   time. Filtered out at setter time (applyLiveBuiltinOverrides), so
  //   validateDiscount stays byte-identical to pre-r50 while a scheduled
  //   edit sits queued.
  scheduledFor?: number | null;
  // 🆕 Round 28r59 (Phase 4 feature #6 "Referral tier system") — only
  //   used on the "REFERRAL" pseudo-key. Each tier says: "if the SAME
  //   SUN-XXXX code has been used ≥ minRedeems times (across all
  //   guests), award this amount." Highest matching tier wins. Empty /
  //   absent = flat REFERRAL_FIXED_THB (or the `amount` override). The
  //   count-lookup itself is done by validateDiscountDebug's caller
  //   (validateDiscount can't be async), so validateDiscount uses this
  //   as a lookup table given a passed-in `referralRedeemCount` in ctx. */
  tiers?: ReferralTier[];
}

export interface ReferralTier {
  /** The minimum number of prior redemptions of the SAME code required
   *  for this tier to unlock. */
  minRedeems: number;
  /** Discount amount awarded, in THB. */
  amount: number;
  /** Optional display label. Empty/absent → generated from amount. */
  label?: string;
}

let disabledBuiltinCodes = new Set<string>();
let customCodes: Record<string, CustomPromoCode> = {};
let builtinOverrides: Record<string, BuiltinPromoOverride> = {};

export function applyLivePromoConfig(cfg: {
  disabledCodes?: string[];
  customCodes?: Record<string, CustomPromoCode>;
}): void {
  if (cfg.disabledCodes) {
    disabledBuiltinCodes = new Set(cfg.disabledCodes.map((c) => c.toUpperCase()));
  }
  if (cfg.customCodes) {
    // 🆕 Round 28r50 — drop any custom code whose `scheduledFor` hasn't
    //   arrived yet, so the code behaves as if it doesn't exist yet
    //   (validateDiscount's `customCodes[code]` lookup will simply miss).
    //   Re-applied every ~60s by MaintenanceGate, so the code snaps live
    //   at (or shortly after) the scheduled minute.
    const now = Date.now();
    const filtered: Record<string, CustomPromoCode> = {};
    for (const [k, v] of Object.entries(cfg.customCodes)) {
      if (v?.scheduledFor && v.scheduledFor > now) continue;
      filtered[k] = v;
    }
    customCodes = filtered;
  }
}

/** 🆕 Round 28r49 — pushed in by MaintenanceGate from
 *  `publicRules.builtinCodeOverrides` (see there for the wiring).
 *  🆕 Round 28r50 — a builtin override with `scheduledFor > now` is
 *  dropped entirely at setter time, so validateDiscount falls back to the
 *  hardcoded default (byte-identical to no override). Re-applied on the
 *  ~60s MaintenanceGate cadence so a scheduled edit activates without any
 *  page refresh. */
export function applyLiveBuiltinOverrides(
  map: Record<string, BuiltinPromoOverride> | null | undefined
): void {
  // Canonicalise every key to UPPERCASE so a lowercase Firestore key can't
  // silently miss a lookup here. Callers use `builtinOverrides[code]` with
  // `code` already normalised by validateDiscount.
  const clean: Record<string, BuiltinPromoOverride> = {};
  const now = Date.now();
  if (map) {
    for (const [k, v] of Object.entries(map)) {
      if (!v || typeof v !== "object") continue;
      if (v.scheduledFor && v.scheduledFor > now) continue;
      clean[k.toUpperCase()] = v;
    }
  }
  builtinOverrides = clean;
}

/** True if a valid override says this built-in code has been deleted. */
function isBuiltinDeleted(code: string): boolean {
  return builtinOverrides[code]?.deleted === true;
}

/** Check the code's own scheduling / min-spend override gates. Returns
 *  true if any gate rejects (caller returns NULL_RESULT). */
function builtinOverrideRejects(code: string, subtotalTHB: number): boolean {
  const ov = builtinOverrides[code];
  if (!ov) return false;
  if (ov.startsAt && Date.now() < ov.startsAt) return true;
  if (ov.expiryDate && Date.now() > ov.expiryDate) return true;
  if (ov.minSpend && subtotalTHB < ov.minSpend) return true;
  return false;
}

/**
 * 🆕 Round 28s299 — redemption caps live on the custom-code definition
 * but are enforced with a booking-count query at submit time (see
 * BookingFlowPage), since validateDiscount is pure/sync. This getter
 * lets the submit guard read a code's caps without re-reading Firestore.
 * Returns null for built-in codes / codes with no caps.
 */
export function getCustomPromoLimits(
  code: string
): { maxRedemptions: number | null; perPhoneLimit: number | null } | null {
  const c = customCodes[code.trim().toUpperCase()];
  if (!c) return null;
  if (!c.maxRedemptions && !c.perPhoneLimit) return null;
  return {
    maxRedemptions: c.maxRedemptions ?? null,
    perPhoneLimit: c.perPhoneLimit ?? null,
  };
}

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
  /** 🆕 Round 28r59 (Phase 4 feature #6 "Referral tier system") — number
   *  of prior redemptions of THIS EXACT SUN-XXXX code across all guests.
   *  Only consulted for referral codes when `builtinOverrides["REFERRAL"]
   *  .tiers` is set. Optional so validateDiscount stays a sync,
   *  no-DB-lookup function; the CALLER (BookingFlowPage submit + admin
   *  test-code sandbox) is responsible for running a bounded count
   *  query on `bookings.discountCode == code` and passing it in. */
  referralRedeemCount?: number;
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

  // 🆕 Round 28s298 — admin turned this hardcoded code off from
  //   /admin/promotions. Quiet invalid, same as every other rejected
  //   code path below.
  if (disabledBuiltinCodes.has(code)) return { ...NULL_RESULT, code };

  // 🆕 Round 28r49 — admin deleted this built-in via /admin/promotions
  //   (`builtinCodeOverrides[code].deleted === true`). Quiet invalid,
  //   same posture as disable. Referral pattern check is separate below
  //   because the exact code varies (SUN-XXXX).
  if (isBuiltinDeleted(code)) return { ...NULL_RESULT, code };

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
    // 🆕 Round 28r49 — admin-set scheduling / min-spend / amount / label.
    if (builtinOverrideRejects(code, subtotalTHB)) return { ...NULL_RESULT, code };
    const ov = builtinOverrides[code];
    const amount = typeof ov?.amount === "number" && ov.amount >= 0 ? ov.amount : VIP100_FIXED_THB;
    return {
      valid: true,
      code,
      amount,
      label: ov?.label?.trim() || `VIP — ฿${amount} off premium`,
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
    // 🆕 Round 28r49 — scheduling / min-spend / label are all overridable;
    //   the discount AMOUNT is not (always equals the real taxi fare — a
    //   fixed override wouldn't make sense here).
    if (builtinOverrideRejects(code, subtotalTHB)) return { ...NULL_RESULT, code };
    const ov = builtinOverrides[code];
    return {
      valid: true,
      code,
      amount: taxi,
      label: ov?.label?.trim() || `Travel comped — saves ฿${taxi}`,
      type: "fixed",
    };
  }

  // ── FIRST10: 10% off, capped at ฿200 (28r28) ──
  if (code === FIRST_TIME_CODE) {
    // 🆕 Round 28r49 — admin-overridable percent + cap + scheduling +
    //   min-spend + label.
    if (builtinOverrideRejects(code, subtotalTHB)) return { ...NULL_RESULT, code };
    const ov = builtinOverrides[code];
    const percent = typeof ov?.percent === "number" && ov.percent >= 0 ? ov.percent : FIRST10_PERCENT;
    const cap = typeof ov?.cap === "number" && ov.cap >= 0 ? ov.cap : FIRST10_CAP_THB;
    const rawPct = Math.round((subtotalTHB * percent) / 100);
    const amount = Math.max(0, Math.min(rawPct, cap));
    return {
      valid: true,
      code,
      amount,
      label: ov?.label?.trim() || `First booking — ${percent}% off`,
      type: "percent",
    };
  }

  // 🆕 Round 28r20 — WELCOME20: 20% off, capped at ฿800.
  // Higher-tier launch promo. Customer chooses one (FIRST10 vs
  // WELCOME20) — no stacking; whichever they type wins.
  if (code === WELCOME_CODE) {
    // 🆕 Round 28r49 — admin-overridable percent + cap + scheduling +
    //   min-spend + label.
    if (builtinOverrideRejects(code, subtotalTHB)) return { ...NULL_RESULT, code };
    const ov = builtinOverrides[code];
    const percent = typeof ov?.percent === "number" && ov.percent >= 0 ? ov.percent : WELCOME20_PERCENT;
    const cap = typeof ov?.cap === "number" && ov.cap >= 0 ? ov.cap : WELCOME20_CAP_THB;
    const rawPct = Math.round((subtotalTHB * percent) / 100);
    const amount = Math.max(0, Math.min(rawPct, cap));
    return {
      valid: true,
      code,
      amount,
      label: ov?.label?.trim() || `Welcome — ${percent}% off`,
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
    // 🆕 Round 28r49 — amount + scheduling + min-spend + label overridable.
    //   The 22:00–04:00 prime-hour window itself is NOT admin-editable —
    //   it's the code's whole point (drive prime-hour conversions).
    if (builtinOverrideRejects(code, subtotalTHB)) return { ...NULL_RESULT, code };
    const ov = builtinOverrides[code];
    const amount = typeof ov?.amount === "number" && ov.amount >= 0 ? ov.amount : TONIGHT500_FIXED_THB;
    return {
      valid: true,
      code,
      amount,
      label: ov?.label?.trim() || `Late-night · ฿${amount} off`,
      type: "fixed",
    };
  }

  // 🆕 Round 28r20 — SAMMY200: ฿200 off. Honors the promo founder
  // ran on Sammyboy Bangkok forum. No conditions; flat applies.
  if (code === SAMMY_CODE) {
    // 🆕 Round 28r49 — amount + scheduling + min-spend + label overridable.
    if (builtinOverrideRejects(code, subtotalTHB)) return { ...NULL_RESULT, code };
    const ov = builtinOverrides[code];
    const amount = typeof ov?.amount === "number" && ov.amount >= 0 ? ov.amount : SAMMY200_FIXED_THB;
    return {
      valid: true,
      code,
      amount,
      label: ov?.label?.trim() || `Sammyboy — ฿${amount} off`,
      type: "fixed",
    };
  }

  // ── SUN-XXXXXX: referral, flat ฿200 off (entry tier only after r33) ──
  // 🆕 Round 28s298 — this matches a PATTERN (any SUN-XXXX), not one
  //   literal code, so the disable check uses the pseudo-key "REFERRAL"
  //   (doesn't match REFERRAL_CODE_RE, so it can never collide with a
  //   real customer-typed code) instead of the top-of-function exact-
  //   code check, which only ever sees ONE specific code per call.
  if (REFERRAL_CODE_RE.test(code)) {
    if (disabledBuiltinCodes.has("REFERRAL")) return { ...NULL_RESULT, code };
    // 🆕 Round 28r49 — same "REFERRAL" pseudo-key for the override lookup
    //   as the disable check above uses. Deleted / scheduled / min-spend
    //   / amount / label all overridable per pattern (all SUN-XXXX codes
    //   share one override — that's the design; individual referral
    //   codes are minted per user, not editable one-by-one).
    if (isBuiltinDeleted("REFERRAL")) return { ...NULL_RESULT, code };
    if (builtinOverrideRejects("REFERRAL", subtotalTHB)) return { ...NULL_RESULT, code };
    const ov = builtinOverrides["REFERRAL"];
    // 🆕 Round 28r59 (Phase 4 feature #6 "Referral tier system") — if the
    //   REFERRAL override carries a `tiers` list, look up the highest tier
    //   the referring code's prior-redemption count qualifies for. Any
    //   validated referral must have `referralRedeemCount` in ctx (caller
    //   duty). Empty/undefined tiers → fall through to flat amount as
    //   before. No tier match (count below every minRedeems) → fall
    //   through to the base amount too, so a new-user referral gets at
    //   least the entry reward.
    const baseAmount = typeof ov?.amount === "number" && ov.amount >= 0 ? ov.amount : REFERRAL_FIXED_THB;
    const tier = pickReferralTier(ov?.tiers, ctx?.referralRedeemCount);
    const amount = tier ? tier.amount : baseAmount;
    const label = tier
      ? (tier.label?.trim() || `Referral tier · ฿${amount} off`)
      : (ov?.label?.trim() || `Referral · ฿${amount} off`);
    return {
      valid: true,
      code,
      amount,
      label,
      type: "fixed",
    };
  }

  // 🆕 Round 28s298 — admin-created custom code from /admin/promotions.
  //   Checked LAST so it can never accidentally shadow a hardcoded name
  //   above (admin can't create "FIRST10" and change its behavior).
  const custom = customCodes[code];
  if (custom) {
    // 🆕 Round 28s299 — scheduling window + min-spend gate. Each is a
    //   quiet invalid (UI shows the generic "code not recognised" hint),
    //   same as every other rejected path — we deliberately don't leak
    //   "this code exists but you don't qualify yet" to a guest probing
    //   codes. (maxRedemptions/perPhoneLimit are NOT checked here — no
    //   usage count available in a pure fn; enforced at booking submit.)
    if (custom.startsAt && Date.now() < custom.startsAt) {
      return { ...NULL_RESULT, code };
    }
    if (custom.expiresAt && Date.now() > custom.expiresAt) {
      return { ...NULL_RESULT, code };
    }
    if (custom.minSpendThb && subtotalTHB < custom.minSpendThb) {
      return { ...NULL_RESULT, code };
    }
    const amount =
      custom.type === "percent"
        ? Math.max(
            0,
            Math.min(
              Math.round((subtotalTHB * custom.amount) / 100),
              custom.capThb ?? Number.POSITIVE_INFINITY
            )
          )
        : Math.max(0, custom.amount);
    return { valid: true, code, amount, label: custom.label, type: custom.type };
  }

  // Unknown code — invalid (UI shows quiet hint, doesn't block booking).
  return { ...NULL_RESULT, code };
}

// 🆕 Round 28s299 (founder: share-link feature on /admin/promotions) —
// a `?promo=CODE` link (or its QR) pre-fills the discount field. Mirrors
// the referral `?ref=` capture: HomePage stashes it into localStorage on
// mount (via capturePromoFromURL) so it survives navigation to the
// booking page, where the URL param is no longer present.
const PROMO_LS_KEY = "sunred.discount.promo";

export function capturePromoFromURL(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = new URLSearchParams(window.location.search).get("promo");
    if (!raw) return null;
    const code = raw.trim().toUpperCase();
    if (!code) return null;
    window.localStorage.setItem(PROMO_LS_KEY, code);
    return code;
  } catch {
    return null;
  }
}

/**
 * Suggest an initial discount code on first render of the booking
 * form. Priority:
 *   1. Referral code captured from a `?ref=SUN-XXXX` URL (Round 28r7).
 *   2. 🆕 Round 28s299 — a `?promo=CODE` share link (live URL param, or
 *      the localStorage copy captured on HomePage mount).
 *   3. FIRST10 code if the guest tapped the FirstBookingBanner —
 *      it stashes the code in sessionStorage on tap (Round 28r14)
 *      so the booking flow can pre-fill it without re-typing.
 *   4. Empty otherwise.
 */
// 🆕 Round 28r59 (Phase 4 feature #5 "Discount validator preview") — a
// debug variant used ONLY by the admin Promotions "Test a Code" sandbox.
// Behaves IDENTICALLY to validateDiscount for the returned DiscountResult
// (so what the sandbox previews is exactly what a real booking would see),
// but also returns a `reason` string explaining which check tripped when
// `.valid === false`. Never called from the customer booking flow, so it
// can't leak "code exists but you don't qualify" hints back to guests —
// the sandbox is behind PrivateRoute admin auth.
export interface DiscountDebugResult extends DiscountResult {
  reason: string;
}

const REJECT_MSG = {
  EMPTY: "empty code",
  DISABLED_BUILTIN: "built-in code is disabled by admin",
  DELETED_BUILTIN: "built-in code is deleted by admin",
  PREMIUM_BLOCKED: "premium-tier service — only VIP100 / FREETAXI allowed",
  VIP_NOT_PREMIUM: "VIP100 only applies to premium (Gentleman / B2B)",
  FREETAXI_NOT_PREMIUM: "FREETAXI only applies to premium (Gentleman / B2B)",
  FREETAXI_NO_FARE: "FREETAXI needs a real taxi fare — set an address",
  TONIGHT_HOURS: "TONIGHT500 only valid 22:00–04:00 BKK",
  BUILTIN_STARTS_AT: "code hasn't started yet (admin override)",
  BUILTIN_EXPIRED: "code has expired (admin override)",
  BUILTIN_MIN_SPEND: "subtotal below minimum spend (admin override)",
  CUSTOM_STARTS_AT: "code hasn't started yet",
  CUSTOM_EXPIRED: "code has expired",
  CUSTOM_MIN_SPEND: "subtotal below minimum spend",
  UNKNOWN: "code not recognised",
} as const;

export function validateDiscountDebug(
  raw: string | null | undefined,
  subtotalTHB: number,
  ctx?: DiscountValidationContext,
): DiscountDebugResult {
  const attach = (r: DiscountResult, reason: string): DiscountDebugResult => ({ ...r, reason });
  if (!raw) return attach(NULL_RESULT, REJECT_MSG.EMPTY);
  const code = raw.trim().toUpperCase();
  if (!code) return attach(NULL_RESULT, REJECT_MSG.EMPTY);

  // Duplicate the reject checks so we can attach a reason. The last step
  // delegates to the real validateDiscount when nothing failed, so the
  // pass-through result is guaranteed to match production behaviour.
  if (disabledBuiltinCodes.has(code)) return attach({ ...NULL_RESULT, code }, REJECT_MSG.DISABLED_BUILTIN);
  if (isBuiltinDeleted(code)) return attach({ ...NULL_RESULT, code }, REJECT_MSG.DELETED_BUILTIN);

  const isPremiumOk = PREMIUM_OK_CODES.has(code);
  if (!isPremiumOk && ctx?.serviceId && PROMO_BLOCKED_SERVICES.has(ctx.serviceId)) {
    return attach({ ...NULL_RESULT, code }, REJECT_MSG.PREMIUM_BLOCKED);
  }

  if (code === "VIP100") {
    if (!ctx?.serviceId || !PROMO_BLOCKED_SERVICES.has(ctx.serviceId)) {
      return attach({ ...NULL_RESULT, code }, REJECT_MSG.VIP_NOT_PREMIUM);
    }
    if (builtinOverrideRejects(code, subtotalTHB)) {
      return attach({ ...NULL_RESULT, code }, builtinRejectReason(code, subtotalTHB));
    }
  } else if (code === "FREETAXI") {
    if (!ctx?.serviceId || !PROMO_BLOCKED_SERVICES.has(ctx.serviceId)) {
      return attach({ ...NULL_RESULT, code }, REJECT_MSG.FREETAXI_NOT_PREMIUM);
    }
    if ((ctx.taxiFareTHB ?? 0) <= 0) {
      return attach({ ...NULL_RESULT, code }, REJECT_MSG.FREETAXI_NO_FARE);
    }
    if (builtinOverrideRejects(code, subtotalTHB)) {
      return attach({ ...NULL_RESULT, code }, builtinRejectReason(code, subtotalTHB));
    }
  } else if (code === TONIGHT_CODE) {
    const hour = ctx?.bookingHourBKK;
    const isPrime =
      typeof hour === "number" && (hour >= TONIGHT_HOUR_START || hour < TONIGHT_HOUR_END);
    if (!isPrime) return attach({ ...NULL_RESULT, code }, REJECT_MSG.TONIGHT_HOURS);
    if (builtinOverrideRejects(code, subtotalTHB)) {
      return attach({ ...NULL_RESULT, code }, builtinRejectReason(code, subtotalTHB));
    }
  } else if (code === FIRST_TIME_CODE || code === WELCOME_CODE || code === SAMMY_CODE) {
    if (builtinOverrideRejects(code, subtotalTHB)) {
      return attach({ ...NULL_RESULT, code }, builtinRejectReason(code, subtotalTHB));
    }
  } else if (REFERRAL_CODE_RE.test(code)) {
    if (disabledBuiltinCodes.has("REFERRAL")) return attach({ ...NULL_RESULT, code }, REJECT_MSG.DISABLED_BUILTIN);
    if (isBuiltinDeleted("REFERRAL")) return attach({ ...NULL_RESULT, code }, REJECT_MSG.DELETED_BUILTIN);
    if (builtinOverrideRejects("REFERRAL", subtotalTHB)) {
      return attach({ ...NULL_RESULT, code }, builtinRejectReason("REFERRAL", subtotalTHB));
    }
  } else {
    const custom = customCodes[code];
    if (custom) {
      if (custom.startsAt && Date.now() < custom.startsAt) {
        return attach({ ...NULL_RESULT, code }, REJECT_MSG.CUSTOM_STARTS_AT);
      }
      if (custom.expiresAt && Date.now() > custom.expiresAt) {
        return attach({ ...NULL_RESULT, code }, REJECT_MSG.CUSTOM_EXPIRED);
      }
      if (custom.minSpendThb && subtotalTHB < custom.minSpendThb) {
        return attach({ ...NULL_RESULT, code }, REJECT_MSG.CUSTOM_MIN_SPEND);
      }
    } else {
      return attach({ ...NULL_RESULT, code }, REJECT_MSG.UNKNOWN);
    }
  }

  // If we're here, no reject fired — the real validateDiscount is
  // authoritative. Reason for a successful code = a positive-toned "ok".
  const real = validateDiscount(raw, subtotalTHB, ctx);
  return attach(real, real.valid ? "valid" : REJECT_MSG.UNKNOWN);
}

function builtinRejectReason(code: string, subtotalTHB: number): string {
  const ov = builtinOverrides[code];
  if (!ov) return REJECT_MSG.UNKNOWN;
  if (ov.startsAt && Date.now() < ov.startsAt) return REJECT_MSG.BUILTIN_STARTS_AT;
  if (ov.expiryDate && Date.now() > ov.expiryDate) return REJECT_MSG.BUILTIN_EXPIRED;
  if (ov.minSpend && subtotalTHB < ov.minSpend) return REJECT_MSG.BUILTIN_MIN_SPEND;
  return REJECT_MSG.UNKNOWN;
}

export function getInitialDiscountCode(): string {
  const ref = getActiveReferralCode();
  if (ref) return ref;
  if (typeof window !== "undefined") {
    try {
      const live = new URLSearchParams(window.location.search).get("promo");
      if (live) return live.trim().toUpperCase();
      const stashed = window.localStorage.getItem(PROMO_LS_KEY);
      if (stashed) return stashed;
    } catch {
      /* ignore */
    }
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
