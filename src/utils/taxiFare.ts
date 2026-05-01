// src/utils/taxiFare.ts
//
// 🚖 Taxi fare — Grab-aligned tiered model + rain surcharge.
//
// Confirmed strategy 2026-05-01 (founder): "Grab-aligned tiers with
// free zone subsidy + rain surcharge from real weather":
//
//   0–4 km    →  FREE (acquisition subsidy)
//   4–8 km    →  ฿200 flat        (≈ Grab round-trip)
//   8–12 km   →  ฿350 flat        (≈ Grab round-trip)
//   12–20 km  →  ฿350 + ฿20/km × (km - 12)
//   > 20 km   →  Admin quote required (deposit policy)
//
// Rain surcharge stacks on top:
//   Light rain  +15%
//   Heavy rain  +30%
//
// Customer is always charged LESS than what they'd pay calling Grab
// themselves — savings are surfaced in the pricing UI as "You save ฿X
// vs Grab" so the value prop reads instantly.
//
// 🔁 Cost model documented in code comments here so any future
//    rate-card change is one edit + a push.

import { getCachedRainStatus, type RainStatus } from "@/utils/weather";

/** Free travel within this distance from the therapist's standby. */
export const FREE_DISTANCE_KM = 4;
/** Beyond this requires admin quote + deposit confirm. */
export const ADMIN_QUOTE_KM = 20;

const TIER_1_MAX_KM = 8;
const TIER_1_FARE = 200;
const TIER_2_MAX_KM = 12;
const TIER_2_FARE = 350;
const PER_KM_BEYOND_TIER_2 = 20;

/** Grab estimate constants (used to compute "you save vs Grab" chip). */
const GRAB_BASE = 35;
const GRAB_PER_KM = 10;
const GRAB_WAIT_FEE = 25; // ~10 min × ฿2.5 typical street wait

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
// Fare calculation
// ─────────────────────────────────────────────────────────────────────

export type TaxiTier = "free" | "tier1" | "tier2" | "tier3" | "admin";

export interface TaxiFareResult {
  /** Customer-facing fare. `null` means the booking needs an admin quote. */
  fare: number | null;
  /** Tier id for analytics + UI styling. */
  tier: TaxiTier;
  /** Human label shown next to the price ("Tier 2 · 8-12 km"). */
  label: string;
  /** Distance used for the calculation (km, after Haversine). */
  distanceKm: number;
  /** Fare BEFORE rain surcharge — surfaces in the breakdown when rain. */
  baseFareBeforeRain: number;
  /** Active rain status pulled from `weather.ts` cache. */
  rain: RainStatus;
  /** Estimated round-trip Grab fare for this distance — drives savings chip. */
  grabEstimate: number;
  /** `grabEstimate - fare` (clamped 0). 0 when in Free zone or admin quote. */
  savingsVsGrab: number;
}

/**
 * Compute the round-trip Grab estimate (passenger ride only — no driver
 * wait). Used for the "you save vs Grab" comparison only; never billed.
 */
export function grabRoundTripEstimate(distanceKm: number): number {
  return Math.round((GRAB_BASE + distanceKm * GRAB_PER_KM) * 2 + GRAB_WAIT_FEE);
}

/**
 * Resolve the tier + base fare (pre-rain) for a given distance.
 */
function tierAndBase(distanceKm: number): {
  tier: TaxiTier;
  base: number | null;
  label: string;
} {
  if (distanceKm <= FREE_DISTANCE_KM) {
    return { tier: "free", base: 0, label: "Free zone (≤ 4 km)" };
  }
  if (distanceKm <= TIER_1_MAX_KM) {
    return { tier: "tier1", base: TIER_1_FARE, label: "Tier 1 · 4-8 km" };
  }
  if (distanceKm <= TIER_2_MAX_KM) {
    return { tier: "tier2", base: TIER_2_FARE, label: "Tier 2 · 8-12 km" };
  }
  if (distanceKm <= ADMIN_QUOTE_KM) {
    const extra = Math.ceil((distanceKm - TIER_2_MAX_KM) * PER_KM_BEYOND_TIER_2);
    return {
      tier: "tier3",
      base: TIER_2_FARE + extra,
      label: `Tier 3 · ${distanceKm.toFixed(1)} km`,
    };
  }
  return { tier: "admin", base: null, label: "Long-distance · admin quote" };
}

/**
 * Compute the customer-facing taxi fare for a distance.
 * Pulls rain status synchronously from the cache (populated on app boot).
 */
export function calcTaxiFare(
  distanceKm: number,
  rainOverride?: RainStatus
): TaxiFareResult {
  const { tier, base, label } = tierAndBase(distanceKm);
  const rain = rainOverride ?? getCachedRainStatus();
  const grabEstimate = grabRoundTripEstimate(distanceKm);

  if (base == null) {
    // Admin-quote case
    return {
      fare: null,
      tier,
      label,
      distanceKm,
      baseFareBeforeRain: 0,
      rain,
      grabEstimate,
      savingsVsGrab: 0,
    };
  }

  const withRain = Math.round(base * (1 + rain.surchargePct));
  const savings = Math.max(0, grabEstimate - withRain);

  return {
    fare: withRain,
    tier,
    label,
    distanceKm,
    baseFareBeforeRain: base,
    rain,
    grabEstimate,
    savingsVsGrab: savings,
  };
}

/**
 * Convenience wrapper for the booking page — computes Haversine
 * distance + fare in one call. Returns 0/free when coordinates are
 * missing (caller's UI usually shows "set address" hint instead).
 */
export function estimateTaxiFare(args: {
  therapistLat: number | null | undefined;
  therapistLng: number | null | undefined;
  customerLat: number | null | undefined;
  customerLng: number | null | undefined;
  durationMin: number | null | undefined; // kept in signature for back-compat
}): { distanceKm: number; fare: number; result?: TaxiFareResult } {
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
  const distanceKm = haversineKm(
    therapistLat,
    therapistLng,
    customerLat,
    customerLng
  );
  const result = calcTaxiFare(distanceKm);
  return {
    distanceKm,
    // Caller treats `null` (admin quote) as 0 for total math; UI separately
    // checks the result.tier to render the admin-quote chip.
    fare: result.fare ?? 0,
    result,
  };
}
