// src/utils/taxiFare.ts
//
// 🚖 Taxi fare — GrabCar Bangkok rate card · round-trip with
//                40 % discount on the return leg.
//
// Founder-confirmed rate model (Round 28b23 · 2026-05-04):
//
//   GrabCar Bangkok tiers (per official Grab rate card):
//     • First km   (≤ 1 km) :  ฿45 base flag-fall
//     • km 1 → 6           :  +฿8/km
//     • km 6 → 40          :  +฿7/km
//     • km 40+             :  +฿10/km
//
//   Round-trip pricing for SunRed outcall:
//     • Outbound (therapist → customer):  100 % GrabCar fare (full)
//     • Return   (customer → therapist):   60 % GrabCar fare ← founder spec
//                                          (= 40 % off the meter on the way back)
//     • Total = oneWay × 1.6
//
//   Why this framing
//     The earlier model was oneWay × 1.5 ("half-price return"). Founder
//     bumped the return leg to 60 % of the meter (Round 28b23) so it can
//     be SOLD as a "40 % off return discount" — same dollar amount in
//     either model, but the customer-facing tooltip now reads as a
//     promotion rather than just a math identity.
//
//   Rain surcharge stacks on top of the round-trip total:
//     Light rain  +15%
//     Heavy rain  +30%
//
//   Beyond ADMIN_QUOTE_KM (40 km) → admin quote required (deposit policy).
//
//   Customer savings vs. calling Grab themselves both ways:
//     If the customer used Grab for outbound AND therapist used Grab
//     for the return, they'd pay oneWay × 2. SunRed charges oneWay × 1.6,
//     so the customer saves oneWay × 0.4 (≈ 20 % of the full round-trip).
//     This is what the "Save ฿X vs Grab" chip surfaces.
//
// Reference: https://www.grab.com/th/blog/pha-pi-du-withi-kar-reiyk-grab/
//
// Round 28b8 (founder 2026-05-03) — replaced flat-tier subsidy model
// with continuous GrabCar tiered pricing × 1.5.
// Round 28b23 (founder 2026-05-04) — bumped multiplier 1.5 → 1.6
// (return leg 60 % of meter) so the discount framing reads cleanly:
// "40 % off the return".

import { getCachedRainStatus, type RainStatus } from "@/utils/weather";

/** Beyond this requires admin quote + deposit confirm. */
export const ADMIN_QUOTE_KM = 40;

/**
 * 🆕 Round 28s231 (FIX — taxi fare was too cheap) — Bangkok road-circuity
 * factor. Straight-line (haversine) distance underestimates real driving
 * distance; BKK roads (canals, one-ways, no grid) run ~1.4–1.6× the crow-flies
 * distance. `directionsApi.ts` already applies 1.45 to ITS haversine fallback,
 * but `estimateTaxiFare` below was charging on RAW straight-line distance —
 * ~31% short. Apply the same factor so every fallback path matches the road
 * estimate and the live Distance-Matrix road distance. Keep in sync with
 * `BKK_ROAD_FACTOR` in directionsApi.ts.
 */
export const BKK_ROAD_FACTOR = 1.45;

/**
 * 🆕 Round 28s233 (founder: "พิกัดเดียวกัน") — single dispatch base for the
 * taxi estimate. Founder wants the SAME destination to always quote the SAME
 * taxi fare, regardless of which practitioner is assigned (their stored
 * coordinates were duplicated/placeholder, so per-therapist distance was
 * meaningless and produced different fares for the same hotel). We now measure
 * every trip from one operational base (the Huai Khwang / Ratchada cluster
 * centre, where most of the roster is based). Tunable — set it to wherever the
 * night's dispatch actually originates.
 */
export const DISPATCH_BASE = { lat: 13.7548, lng: 100.5656 } as const;

/** Legacy alias — kept at 0 so existing chips/logic that gate on
 *  "within free distance" never trigger after the migration. Old
 *  callers that imported this constant won't crash; the UI just
 *  treats every distance as a paid trip now. */
export const FREE_DISTANCE_KM = 0;

// ─── GrabCar Bangkok rate card ───────────────────────────────────────
const BASE_FARE = 45;        // first km (≤ 1 km flag-fall)
const TIER_2_PER_KM = 8;     // applies to km 1 → 6
const TIER_2_END_KM = 6;
const TIER_3_PER_KM = 7;     // applies to km 6 → 40
const TIER_3_END_KM = 40;
const TIER_4_PER_KM = 10;    // applies to km 40+

/**
 * Outbound 100 % + return 60 % = 1.6× one-way.
 *
 * 🆕 Round 28b23 (founder 2026-05-04) — bumped from 1.5 → 1.6 so the
 * customer-facing copy can frame the return leg as "40 % off" rather
 * than "half price". The founder's logic: same fare, better story.
 *
 * Pricing breakdown for any one-way fare F:
 *   • Outbound:  F                   (full meter, 100 %)
 *   • Return:    F × 0.6             (40 % discount, 60 % of meter)
 *   • Total:     F × 1.6
 *   • Grab DIY:  F × 2.0             (the customer would pay full both ways)
 *   • Saves:     F × 0.4             (20 % of full Grab round-trip)
 */
const ROUND_TRIP_MULTIPLIER = 1.6;
/** Return-leg discount (40 % off the meter) — kept as a separate
 *  constant so UI copy can reference the "40 %" number directly. */
export const RETURN_LEG_DISCOUNT_PCT = 0.4;
/** Return-leg charge as a fraction of the one-way meter (60 %). */
export const RETURN_LEG_CHARGE_PCT = 1 - RETURN_LEG_DISCOUNT_PCT;

// ─────────────────────────────────────────────────────────────────────
// Distance utility — Haversine fallback when Directions API not wired.
// ─────────────────────────────────────────────────────────────────────

export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

// ─────────────────────────────────────────────────────────────────────
// GrabCar fare calculation
// ─────────────────────────────────────────────────────────────────────

/**
 * Compute the GrabCar one-way fare for any distance (km), using the
 * official Bangkok rate card tiers above. Rounded to the nearest baht.
 * Returns the BASE_FARE (฿45) for any distance ≤ 1 km.
 */
export function grabCarOneWayFare(distanceKm: number): number {
  if (!Number.isFinite(distanceKm) || distanceKm <= 0) return BASE_FARE;
  let fare = BASE_FARE;
  if (distanceKm <= 1) return Math.round(fare);

  let remaining = distanceKm - 1;

  // Tier 2 — km 1 → 6 (max 5 paid km in this band)
  const tier2Km = Math.min(remaining, TIER_2_END_KM - 1);
  fare += tier2Km * TIER_2_PER_KM;
  remaining -= tier2Km;
  if (remaining <= 0) return Math.round(fare);

  // Tier 3 — km 6 → 40 (max 34 paid km in this band)
  const tier3Km = Math.min(remaining, TIER_3_END_KM - TIER_2_END_KM);
  fare += tier3Km * TIER_3_PER_KM;
  remaining -= tier3Km;
  if (remaining <= 0) return Math.round(fare);

  // Tier 4 — km 40+ (open-ended)
  fare += remaining * TIER_4_PER_KM;
  return Math.round(fare);
}

/**
 * Round-trip fare (outbound 100 % + return 60 %) per founder spec.
 * Equals `grabCarOneWayFare(distanceKm) × 1.6`, rounded.
 *
 * 🆕 Round 28b23 — bumped from ×1.5 to ×1.6 so the return leg reads
 * as a "40 % discount" instead of "half price" in customer copy.
 */
export function grabCarRoundTripFare(distanceKm: number): number {
  return Math.round(grabCarOneWayFare(distanceKm) * ROUND_TRIP_MULTIPLIER);
}

/**
 * 🆕 Round 28b24 (founder 2026-05-04) — "List price" reference for the
 * strike-through promo display.
 *
 * Background: previously this was named `grabRoundTripEstimate` and
 * the chip read "Save ฿X vs Grab". Founder pivoted away from Grab as
 * the comparison anchor — the new framing is a SunRed-OWNED promo:
 * we set our own "list price" and show our own discount.
 *
 * Math is unchanged (still oneWay × 2.0). We're just renaming the
 * concept so the customer-facing copy reads:
 *   ~~฿180 (Standard rate)~~  ฿140  · SunRed Smart Routing 20 % off
 *
 * Why oneWay × 2: it's the natural ceiling — what a round-trip would
 * cost at full meter, both legs, no SunRed optimisation. Our actual
 * fare (oneWay × 1.6) sits 20 % below this ceiling, which makes the
 * promo land cleanly: "SunRed 20 % off the standard round-trip rate."
 *
 * Backwards compatibility: the legacy export `grabRoundTripEstimate`
 * is kept as a thin alias so any caller still importing it doesn't
 * break — but new code should prefer `listPriceRoundTrip`.
 */
export function listPriceRoundTrip(distanceKm: number): number {
  return grabCarOneWayFare(distanceKm) * 2;
}

/** @deprecated Round 28b24 — use `listPriceRoundTrip` instead. Same math. */
export function grabRoundTripEstimate(distanceKm: number): number {
  return listPriceRoundTrip(distanceKm);
}

// ─────────────────────────────────────────────────────────────────────
// TaxiFareResult — UI-facing shape
// ─────────────────────────────────────────────────────────────────────

/** Tier label kept stable across the codebase even though the
 *  underlying calculation no longer uses flat tiers. Drives chip
 *  styling in BookingFlowPage / DistanceDepositDialog. */
export type TaxiTier = "free" | "base" | "short" | "standard" | "long" | "admin";

export interface TaxiFareResult {
  /** Customer-facing fare. `null` means the booking needs an admin quote. */
  fare: number | null;
  /** Tier id for analytics + UI styling. */
  tier: TaxiTier;
  /** Human label shown next to the price. */
  label: string;
  /** Distance used for the calculation (km, after Haversine). */
  distanceKm: number;
  /** Fare BEFORE rain surcharge (= round-trip GrabCar × 1.6). */
  baseFareBeforeRain: number;
  /** Active rain status pulled from `weather.ts` cache. */
  rain: RainStatus;
  /** GrabCar one-way fare (for breakdown / analytics). */
  oneWayFare: number;
  /**
   * 🆕 Round 28b24 — SunRed "list price" reference (= oneWay × 2).
   * The strike-through anchor for the promo display. Same math as the
   * legacy `grabEstimate`, just rebranded as our own.
   */
  listPriceTravel: number;
  /**
   * 🆕 Round 28b24 — SunRed Smart Routing promo discount
   * (= listPriceTravel - fare, clamped 0). Drives the "20 % off" chip.
   */
  sunredPromoDiscount: number;
  /**
   * @deprecated Round 28b24 — use `listPriceTravel` instead.
   * Kept for backwards-compat with Firestore docs + telegram payload.
   */
  grabEstimate: number;
  /**
   * @deprecated Round 28b24 — use `sunredPromoDiscount` instead.
   * Kept for backwards-compat with Firestore docs + telegram payload.
   */
  savingsVsGrab: number;
}

/** Resolve tier label band from distance (UI-only, doesn't affect price). */
function resolveTier(distanceKm: number): { tier: TaxiTier; label: string } {
  if (distanceKm > ADMIN_QUOTE_KM) {
    return {
      tier: "admin",
      label: `Long distance · admin quote (${distanceKm.toFixed(1)} km)`,
    };
  }
  if (distanceKm <= 1) {
    return { tier: "base", label: `Base fare · ${distanceKm.toFixed(1)} km` };
  }
  if (distanceKm <= TIER_2_END_KM) {
    return { tier: "short", label: `Short trip · ${distanceKm.toFixed(1)} km` };
  }
  return { tier: "standard", label: `Standard · ${distanceKm.toFixed(1)} km` };
}

/**
 * Compute the customer-facing taxi fare for a distance.
 * GrabCar one-way × 1.5 (return at half price), then rain surcharge.
 */
export function calcTaxiFare(
  distanceKm: number,
  rainOverride?: RainStatus
): TaxiFareResult {
  const { tier, label } = resolveTier(distanceKm);
  const rain = rainOverride ?? getCachedRainStatus();
  const oneWayFare = grabCarOneWayFare(distanceKm);
  // 🆕 Round 28b24 — `listPriceTravel` is our "standard rate" anchor
  //   used for the strike-through display. Same math as the legacy
  //   `grabEstimate` (= oneWay × 2) but rebranded as a SunRed-owned
  //   reference, no longer pegged to a competitor's rate card.
  const listPriceTravel = listPriceRoundTrip(distanceKm);

  if (tier === "admin") {
    return {
      fare: null,
      tier,
      label,
      distanceKm,
      baseFareBeforeRain: 0,
      rain,
      oneWayFare,
      listPriceTravel,
      sunredPromoDiscount: 0,
      grabEstimate: listPriceTravel, // legacy alias
      savingsVsGrab: 0,
    };
  }

  const roundTripBase = grabCarRoundTripFare(distanceKm); // oneWay × 1.6
  const withRain = Math.round(roundTripBase * (1 + rain.surchargePct));
  // SunRed Smart Routing discount = list price - what we actually charge.
  const sunredPromoDiscount = Math.max(0, listPriceTravel - withRain);

  return {
    fare: withRain,
    tier,
    label,
    distanceKm,
    baseFareBeforeRain: roundTripBase,
    rain,
    oneWayFare,
    listPriceTravel,
    sunredPromoDiscount,
    grabEstimate: listPriceTravel, // legacy alias
    savingsVsGrab: sunredPromoDiscount, // legacy alias
  };
}

/**
 * Convenience wrapper for the booking page — computes Haversine
 * distance + fare in one call. Returns 0/free when coordinates are
 * missing (caller's UI usually shows "set address" hint instead).
 *
 * 🆕 Round 28r33 (founder 2026-05-07) — `rainOverride` added so the
 *   booking page can pass its rain state (resolved from the async
 *   `getRainStatus()` fetch) and trigger a recalc when weather flips
 *   from cached "Clear" → "Light rain" mid-session. Without this the
 *   surcharge silently no-oped because `calcTaxiFare` reads the
 *   sync cache, which was empty on first render.
 */
export function estimateTaxiFare(
  args: {
    therapistLat: number | null | undefined;
    therapistLng: number | null | undefined;
    customerLat: number | null | undefined;
    customerLng: number | null | undefined;
    durationMin: number | null | undefined; // kept in signature for back-compat
  },
  rainOverride?: RainStatus
): { distanceKm: number; fare: number; result?: TaxiFareResult } {
  const {
    therapistLat,
    therapistLng,
    customerLat,
    customerLng,
  } = args;
  if (
    therapistLat == null ||
    therapistLng == null ||
    customerLat == null ||
    customerLng == null
  ) {
    return { distanceKm: 0, fare: 0 };
  }
  // 🆕 Round 28s231 — apply the BKK road-circuity factor so this fallback
  //   path matches the road-distance estimate (directionsApi) instead of
  //   charging on the too-short straight-line distance.
  const distanceKm =
    haversineKm(therapistLat, therapistLng, customerLat, customerLng) *
    BKK_ROAD_FACTOR;
  const result = calcTaxiFare(distanceKm, rainOverride);
  return {
    distanceKm,
    // Caller treats `null` (admin quote) as 0 for total math; UI separately
    // checks the result.tier to render the admin-quote chip.
    fare: result.fare ?? 0,
    result,
  };
}
