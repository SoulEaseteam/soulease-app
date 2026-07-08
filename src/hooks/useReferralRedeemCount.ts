// src/hooks/useReferralRedeemCount.ts
//
// 🆕 Round 28r63 (r59 follow-up) — Referral tier customer-flow wiring.
//
// Round 28r59 built the tier system in discount.ts (`pickReferralTier`,
// `ReferralTier`, `builtinCodeOverrides.REFERRAL.tiers`) and the
// /admin/promotions tier repeater UI, but BookingFlowPage wasn't yet
// populating `ctx.referralRedeemCount` in its validateDiscount call — so
// customer checkout always paid the BASE referral amount and no tier
// ever activated in production. r59's subagent flagged this: an async
// count query inside the discount useMemo needed architectural work
// outside the r59 MVP.
//
// This hook is that piece: given a referral-shaped code (SUN-XXXX),
// runs a bounded `getCountFromServer` aggregation on
// `bookings.discountCode == code` filtered to non-cancelled statuses.
// The count is cached per-code in a module-level Map so BookingFlowPage's
// ~30 re-renders per total-tween don't re-hit Firestore.
//
// Fail-open rule: any error → return 0 → validateDiscount picks the
// base tier → guest still gets a real referral discount. This mirrors
// r59's FIRST10 first-time enforcement (BookingFlowPage:1006-1010),
// which also fails open on permission/index blips because an anonymous
// customer's phone lookup fails firestore.rules `list` gate (which
// requires rating>=1 for un-signed callers). Signed-in admins/therapists
// self-booking hit isAdmin()/isTherapist() and get the real count.
//
// Aggregation query note: `getCountFromServer` returns only a count
// (no doc reads), so we can't filter status client-side after the fact
// — the status filter has to be in the query. That needs a composite
// index `(discountCode ASC, status ASC)` on `bookings` — see
// firestore.indexes.json.

import { useEffect, useState } from "react";
import {
  collection,
  getCountFromServer,
  query,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

/**
 * Statuses that count as a real redemption for tier progression.
 * Mirrors the inverse of commission.ts's PAYROLL_EXCLUDED_STATUSES set
 * (cancelled/canceled/refunded/failed/rejected/no_show don't count as
 * a redemption). Pending is included: a code the referring guest just
 * booked with should still count toward the referrer's tier — no one
 * else can un-book it retroactively without becoming cancelled.
 */
const NON_CANCELLED_STATUSES = [
  "pending",
  "confirmed",
  "in_progress",
  "completed",
  "done",
];

// Match discount.ts REFERRAL_CODE_RE exactly. Kept local so this file
// doesn't force an extra import from discount.ts (which is on the hot
// booking path — this hook already imports Firestore).
const REFERRAL_CODE_RE = /^SUN-[A-Z0-9]{4,8}$/;

/** Per-code redemption count cache. BookingFlowPage re-renders many
 *  times per keystroke / tween frame / distance recompute; an
 *  unbounded Firestore aggregation on every render would drain quota
 *  fast. Cache is module-scoped so a code look-up once per SPA session
 *  survives navigation between the discount field and the confirm bar.
 *  Not cleared on route change on purpose — an active referral code's
 *  count doesn't meaningfully change during one visitor session; if it
 *  did (concurrent bookings by different guests), the fail-open path
 *  keeps them at the base tier, worst case. */
const countCache = new Map<string, number>();

export interface ReferralRedeemCount {
  /** Non-cancelled prior-booking count for the referral code (0 when
   *  code is empty, non-referral-shaped, still loading, or on error). */
  count: number;
  /** True while the aggregation query is in flight. */
  loading: boolean;
  /** True when count > 0 — the guest's referral code has been used at
   *  least once before, so a tier configured with minRedeems<=count
   *  could unlock. Callers use this to conditionally show tier UI. */
  isTierEligible: boolean;
}

const EMPTY: ReferralRedeemCount = {
  count: 0,
  loading: false,
  isTierEligible: false,
};

/**
 * Live count of prior non-cancelled redemptions for a referral code.
 * Returns EMPTY (count 0) for non-referral or empty codes.
 *
 * @param code — the code the guest typed (any case; canonicalised
 *   inside). Only SUN-XXXX shape triggers the lookup.
 */
export function useReferralRedeemCount(
  code: string | null | undefined,
): ReferralRedeemCount {
  const [state, setState] = useState<ReferralRedeemCount>(EMPTY);

  useEffect(() => {
    if (!code) {
      setState(EMPTY);
      return;
    }
    const norm = code.trim().toUpperCase();
    if (!REFERRAL_CODE_RE.test(norm)) {
      setState(EMPTY);
      return;
    }
    // Cache hit — synchronous.
    const cached = countCache.get(norm);
    if (typeof cached === "number") {
      setState({ count: cached, loading: false, isTierEligible: cached > 0 });
      return;
    }
    let cancelled = false;
    setState({ count: 0, loading: true, isTierEligible: false });
    (async () => {
      try {
        const snap = await getCountFromServer(
          query(
            collection(db, "bookings"),
            where("discountCode", "==", norm),
            where("status", "in", NON_CANCELLED_STATUSES),
          ),
        );
        const c = snap.data().count;
        countCache.set(norm, c);
        if (!cancelled) {
          setState({ count: c, loading: false, isTierEligible: c > 0 });
        }
      } catch (err) {
        // Fail OPEN — don't cache, so a signed-in admin who hits the
        // same code later (with real permissions) still gets the real
        // count on the next mount. Never blocks a legitimate referral.
        // eslint-disable-next-line no-console
        console.warn("[useReferralRedeemCount] count failed:", err);
        if (!cancelled) setState(EMPTY);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [code]);

  return state;
}

/** Test seam — exposed for the admin Promotions sandbox if it ever wants
 *  to invalidate a cached count after admin changes the tier config.
 *  Not called from the customer flow. */
export function clearReferralRedeemCache(): void {
  countCache.clear();
}
