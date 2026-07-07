// src/hooks/useActivePromos.ts
//
// 🆕 Round 28r51 (founder 2026-07-08) — Phase 2 promo surface: shared
// hook that feeds every future customer-facing promo/bundle surface off
// ONE consistent view of the live promo data.
//
// Data sources:
//   • Custom promo codes → live `promoCodes` collection subscription
//     (same collection MaintenanceGate reads for validateDiscount's cache).
//     A per-consumer listener is deliberate here: the hook is only mounted
//     where a promo surface actually renders (Phase 2 = nowhere yet), and
//     each snapshot is a tiny doc set. Cost is negligible and it keeps
//     this hook self-contained (no leaks from discount.ts internals).
//   • Bundles → `getActiveBundles()` from bundles.ts, which reads the
//     module-level cache that MaintenanceGate already populates from
//     `adminSettings/publicRules.bundles`. Same live-binding pattern as
//     taxiFare.ts + servicePricing.ts. A 60s re-poll keeps
//     `scheduledFor`-style activations visible without a hard refresh.
//
// Filter contract (matches r51 spec):
//   activeCustomCodes = enabled AND !deleted AND startsAt <= now AND
//                       (expiresAt > now OR expiresAt null) AND
//                       (scheduledFor <= now OR scheduledFor null)
//   activeBundles     = getActiveBundles(serviceId) — enabled + not expired.
//
// PROMOS_ENABLED gate: kept OUT of this hook so downstream consumers can
// render differently when promos are admin-off. The PromoStrip returns
// null when both arrays are empty AND when PROMOS_ENABLED is false;
// other consumers can choose differently.

import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getActiveBundles, type Bundle } from "@/utils/bundles";

/** One entry per currently-redeemable custom promo code. */
export interface ActiveCustomPromo {
  /** Canonical UPPERCASE code, e.g. "SUMMER10". */
  code: string;
  /** Human label, e.g. "Summer — 10% off". */
  label: string;
  /** "percent" | "fixed". */
  type: "percent" | "fixed";
  /** For percent codes: the % (e.g. 10). For fixed codes: THB (e.g. 200). */
  amount: number;
  /** Optional THB cap for percent codes. */
  capThb?: number | null;
  /** Optional expiry (epoch ms) for display. */
  expiresAt?: number | null;
}

export interface UseActivePromosResult {
  /** Enabled, in-window custom promo codes. Empty when none configured. */
  activeCustomCodes: ActiveCustomPromo[];
  /** Enabled, in-window bundle packages. Optionally filtered by service. */
  activeBundles: Bundle[];
  /**
   * The single "best" offer for surfacing in a slim strip. Picks the
   * highest-value promo/bundle by rough THB estimate, favouring custom
   * promos over bundles when they tie (a code is lower-friction to apply
   * than a bundle commitment). null when nothing is active.
   */
  bestOffer: ActiveCustomPromo | Bundle | null;
  /** Convenience: `activeCustomCodes.length + activeBundles.length`. */
  totalCount: number;
}

/** Firestore-shape guard for a "custom"-kind promo code doc. */
function readCustomFromDoc(
  id: string,
  data: Record<string, unknown> | undefined
): ActiveCustomPromo | null {
  if (!data) return null;
  if (data.kind !== "custom") return null;
  if (data.enabled === false) return null;
  if (data.deleted === true) return null;

  const now = Date.now();

  // Scheduling gates — same posture as discount.ts filters.
  const startsAt = coerceMs(data.startsAt);
  if (startsAt && startsAt > now) return null;
  const expiresAt = coerceMs(data.expiresAt);
  if (expiresAt && expiresAt < now) return null;
  const scheduledFor = coerceMs(data.scheduledFor);
  if (scheduledFor && scheduledFor > now) return null;

  const type: "percent" | "fixed" = data.type === "percent" ? "percent" : "fixed";
  const amount = typeof data.amount === "number" ? data.amount : 0;
  if (amount <= 0) return null;

  const label = typeof data.label === "string" && data.label.trim() ? data.label : id;
  const capThb = typeof data.capThb === "number" ? data.capThb : null;

  return { code: id, label, type, amount, capThb, expiresAt };
}

/** Firestore Timestamp | number | null | undefined → epoch ms or null. */
function coerceMs(v: unknown): number | null {
  if (v == null) return null;
  if (typeof v === "number") return v;
  if (
    typeof v === "object" &&
    v &&
    "toMillis" in v &&
    typeof (v as { toMillis?: unknown }).toMillis === "function"
  ) {
    try {
      return (v as { toMillis: () => number }).toMillis();
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Read the currently-active promo state (custom codes + bundles).
 *
 * @param serviceId Optional service scoping for bundles (bundle.serviceId
 *   filter). `undefined` = show any-service bundles too. Custom promo
 *   codes are NOT service-scoped by this parameter (they carry their own
 *   per-service eligibility inside validateDiscount).
 */
export function useActivePromos(
  serviceId?: string | null
): UseActivePromosResult {
  // Live-updated map of enabled, in-window custom codes.
  const [customMap, setCustomMap] = useState<Record<string, ActiveCustomPromo>>({});

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "promoCodes"),
      (snap) => {
        const next: Record<string, ActiveCustomPromo> = {};
        snap.forEach((d) => {
          const parsed = readCustomFromDoc(d.id, d.data());
          if (parsed) next[d.id] = parsed;
        });
        setCustomMap(next);
      },
      () => {
        // Fail open: no promos rather than a stuck stale set.
        setCustomMap({});
      }
    );
    return () => unsub();
  }, []);

  // Bundles come from the module-level cache MaintenanceGate populates.
  // Re-poll every 60s so a scheduled-for activation surfaces without a
  // page refresh — matches MaintenanceGate's own reapply cadence (r50).
  const [bundleTick, setBundleTick] = useState(0);
  useEffect(() => {
    const id = setInterval(
      () => setBundleTick((t) => (t + 1) & 0xffff),
      60_000
    );
    return () => clearInterval(id);
  }, []);

  const activeCustomCodes = useMemo<ActiveCustomPromo[]>(() => {
    return Object.values(customMap);
  }, [customMap]);

  const activeBundles = useMemo<Bundle[]>(() => {
    // getActiveBundles() itself filters by enabled + expiresAt.
    return getActiveBundles(serviceId);
    // bundleTick gates the re-poll — read is intentional even though
    // getActiveBundles doesn't take it as an arg.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bundleTick, serviceId]);

  const bestOffer = useMemo<ActiveCustomPromo | Bundle | null>(() => {
    if (activeCustomCodes.length === 0 && activeBundles.length === 0) return null;

    // Rough THB-value estimator so codes and bundles can be compared.
    // For percent codes: use the cap when present (that's the max the
    // guest can save); fall back to a heuristic for uncapped percents.
    // For bundles: apply the discount % against a nominal ฿1,800 baseline
    // (~ Aromatherapy 60m) so bundles land in the same scale.
    const codeValue = (p: ActiveCustomPromo): number => {
      if (p.type === "fixed") return p.amount;
      if (p.capThb && p.capThb > 0) return p.capThb;
      return p.amount * 10; // uncapped percent heuristic
    };
    const bundleValue = (b: Bundle): number =>
      Math.round((b.discountPct / 100) * 1800 * b.sessionCount);

    let bestCode: ActiveCustomPromo | null = null;
    let bestCodeV = -1;
    for (const c of activeCustomCodes) {
      const v = codeValue(c);
      if (v > bestCodeV) {
        bestCodeV = v;
        bestCode = c;
      }
    }

    let bestBundle: Bundle | null = null;
    let bestBundleV = -1;
    for (const b of activeBundles) {
      const v = bundleValue(b);
      if (v > bestBundleV) {
        bestBundleV = v;
        bestBundle = b;
      }
    }

    // Ties → prefer the code (lower friction to apply).
    if (bestCode && bestBundle) {
      return bestCodeV >= bestBundleV ? bestCode : bestBundle;
    }
    return bestCode ?? bestBundle ?? null;
  }, [activeCustomCodes, activeBundles]);

  return {
    activeCustomCodes,
    activeBundles,
    bestOffer,
    totalCount: activeCustomCodes.length + activeBundles.length,
  };
}

/** Type guard: is this offer a custom promo code (as opposed to a bundle)? */
export function isCustomPromo(
  offer: ActiveCustomPromo | Bundle | null | undefined
): offer is ActiveCustomPromo {
  return !!offer && "code" in offer && "type" in offer;
}

/** Type guard: is this offer a bundle? */
export function isBundle(
  offer: ActiveCustomPromo | Bundle | null | undefined
): offer is Bundle {
  return !!offer && "sessionCount" in offer;
}

export type { Bundle };
