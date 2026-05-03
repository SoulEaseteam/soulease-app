// src/utils/taxiFare.ts
//
// 🚖 Taxi fare — GrabCar Bangkok rate card · round-trip with
//                half-price return.
//
// Founder-confirmed rate model (2026-05-03):
//
//   GrabCar Bangkok tiers (per official Grab rate card):
//     • First km   (≤ 1 km) :  ฿45 base flag-fall
//     • km 1 → 6           :  +฿8/km
//     • km 6 → 40          :  +฿7/km
//     • km 40+             :  +฿10/km
//
//   Round-trip pricing for SunRed outcall:
//     • Outbound (therapist → customer):  full GrabCar fare
//     • Return   (customer → therapist):  HALF GrabCar fare  ← founder spec
//     • Total = oneWay × 1.5
//
//   Rain surcharge stacks on top of the round-trip total:
//     Light rain  +15%
//     Heavy rain  +30%
//
//   Beyond ADMIN_QUOTE_KM (40 km) → admin quote required (deposit policy).
//
//   Customer savings vs. calling Grab themselves both ways:
//     If the customer used Grab for outbound AND therapist used Grab
//     for the return, they'd pay oneWay × 2. SunRed charges oneWay × 1.5,
//     so the customer saves oneWay × 0.5 (≈ 25% of the full round-trip).
//     This is what the "Save ฿X vs Grab" chip surfaces.
//
// Reference: https://www.grab.com/th/blog/pha-pi-du-withi-kar-reiyk-grab/
//
// Round 28b8 (founder 2026-05-03) — replaces the previous flat-tier
// subsidy model (free 0-4km / ฿200 4-8km / ฿350 8-12km / ฿20/km
// thereafter) with continuous GrabCar tiered pricing × 1.5. The
// `free` tier label is retired; nearby trips now have a small but
// non-zero fare equal to GrabCar's first-km flag-fall × 1.5.

import { getCachedRainStatus, type RainStatus } from "@/utils/weather";

/** Beyond this requires admin quote + deposit confirm. */
export const ADMIN_QUOTE_KM = 40;

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

/** Outbound full + return half = 1.5× one-way. */
const ROUND_TRIP_MULTIPLIER = 1.5;

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
 * Round-trip fare (outbound full + return half) per founder spec.
 * Equals `grabCarOneWayFare(distanceKm) × 1.5`, rounded.
 */
export function grabCarRoundTripFare(distanceKm: number): number {
  return Math.round(grabCarOneWayFare(distanceKm) * ROUND_TRIP_MULTIPLIER);
}

/**
 * Reference Grab round-trip estimate — what the customer would pay
 * calling Grab themselves both ways (outbound + return at full price).
 * Used purely for the "you save ฿X vs Grab" comparison chip.
 */
export function grabRoundTripEstimate(distanceKm: number): number {
  return grabCarOneWayFare(distanceKm) * 2;
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
  /** Fare BEFORE rain surcharge (= round-trip GrabCar × 1.5). */
  baseFareBeforeRain: number;
  /** Active rain status pulled from `weather.ts` cache. */
  rain: RainStatus;
  /** GrabCar one-way fare (for breakdown / analytics). */
  oneWayFare: number;
  /** Reference Grab round-trip — drives savings chip. */
  grabEstimate: number;
  /** `grabEstimate - fare` (clamped 0). 0 when admin quote. */
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
  const grabEstimate = grabRoundTripEstimate(distanceKm); // oneWay × 2

  if (tier === "admin") {
    return {
      fare: null,
      tier,
      label,
      distanceKm,
      baseFareBeforeRain: 0,
      rain,
      oneWayFare,
      grabEstimate,
      savingsVsGrab: 0,
    };
  }

  const roundTripBase = grabCarRoundTripFare(distanceKm); // oneWay × 1.5
  const withRain = Math.round(roundTripBase * (1 + rain.surchargePct));
  const savings = Math.max(0, grabEstimate - withRain);

  return {
    fare: withRain,
    tier,
    label,
    distanceKm,
    baseFareBeforeRain: roundTripBase,
    rain,
    oneWayFare,
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
