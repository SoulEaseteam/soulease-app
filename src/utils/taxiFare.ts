// src/utils/taxiFare.ts
//
// 🚖 Travel fare — GrabCar Bangkok rate card · charged round-trip at the
//                  ACTUAL meter both ways (outbound full + return full).
//
// 🆕 Round 28s308 (founder: "ไปเต็มราคา + กลับตามจริง — ลบค่าทั้งหมดที่เคย
//   คำนวน") — the model was deliberately gutted of every "calculated
//   layer" the earlier rounds had stacked on:
//     ✂ the 40 %-off-return discount framing (×1.6)
//     ✂ the 2.5× "standard rate" strike-through anchor + fake Smart-Routing %
//     ✂ the admin-set travel-discount % lever
//     ✂ the informational deposit / free-radius (DistanceDepositDialog, gone)
//   What remains is the honest thing: the customer pays what the round
//   trip actually costs on the meter — outbound + return, both full.
//
//   GrabCar Bangkok one-way meter (per the official rate card):
//     • First km   (≤ 1 km) :  ฿45 base flag-fall
//     • km 1 → 6           :  +฿8/km
//     • km 6 → 40          :  +฿7/km
//     • km 40+             :  +฿10/km
//
//   Round-trip = one-way × ROUND_TRIP_MULTIPLIER (2.0 = both legs full).
//   Rain surcharge stacks on top (light +15 %, heavy +30 %).
//   Beyond ADMIN_QUOTE_KM (40 km) → admin quote required.
//
// Reference: https://www.grab.com/th/blog/pha-pi-du-withi-kar-reiyk-grab/

import { getCachedRainStatus, type RainStatus } from "@/utils/weather";

/**
 * Beyond this requires an admin quote.
 *
 * 🆕 Round 28s296 — `export let` + `applyLiveFareConfig()` so a live
 * Firestore value (read by MaintenanceGate.tsx off the public
 * `adminSettings/publicRules` doc) can override the default without
 * touching any importer — ES module named exports are live bindings.
 */
export let ADMIN_QUOTE_KM = 40;

/**
 * 🆕 Round 28s231 — Bangkok road-circuity factor. Straight-line
 * (haversine) distance underestimates real driving distance; BKK roads
 * run ~1.4–1.6× the crow-flies distance. Keep in sync with
 * `BKK_ROAD_FACTOR` in directionsApi.ts.
 */
export const BKK_ROAD_FACTOR = 1.45;

/**
 * 🆕 Round 28s233 — single dispatch base so the SAME destination always
 * quotes the SAME fare regardless of which practitioner is assigned
 * (Huai Khwang / Ratchada cluster centre). Tunable.
 */
export const DISPATCH_BASE = { lat: 13.7548, lng: 100.5656 } as const;

/** Legacy alias — kept at 0 so any old caller that gated on "within free
 *  distance" never triggers; every trip is a paid trip. */
export const FREE_DISTANCE_KM = 0;

// ─── GrabCar Bangkok rate card ───────────────────────────────────────
const BASE_FARE = 45;        // first km (≤ 1 km flag-fall)
const TIER_2_PER_KM = 8;     // applies to km 1 → 6
const TIER_2_END_KM = 6;
const TIER_3_PER_KM = 7;     // applies to km 6 → 40
const TIER_3_END_KM = 40;
const TIER_4_PER_KM = 10;    // applies to km 40+

/**
 * Round-trip multiplier. 2.0 = outbound full + return full (both legs at
 * the real meter) — the honest cost of the therapist's round trip.
 *
 * 🆕 Round 28s308 — was 1.6 (a 40 %-off-return "discount"). Founder
 * removed the discount: the customer now pays the actual round trip.
 * Still `let` + live-overridable so it can be tuned from Settings, but
 * there is no longer any derived discount/anchor maths hanging off it.
 */
export let ROUND_TRIP_MULTIPLIER = 2.0;

/** Apply live Firestore-sourced overrides (called once at boot + on every
 *  live update — see MaintenanceGate.tsx). Ignores out-of-range values so
 *  a bad write can't break pricing. */
export function applyLiveFareConfig(cfg: {
  adminQuoteKm?: number;
  roundTripMultiplier?: number;
}): void {
  if (typeof cfg.adminQuoteKm === "number" && cfg.adminQuoteKm > 0) ADMIN_QUOTE_KM = cfg.adminQuoteKm;
  if (typeof cfg.roundTripMultiplier === "number" && cfg.roundTripMultiplier > 1) ROUND_TRIP_MULTIPLIER = cfg.roundTripMultiplier;
}

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
 * Round-trip fare = one-way meter × ROUND_TRIP_MULTIPLIER (2.0 = both
 * legs full), rounded.
 */
export function grabCarRoundTripFare(distanceKm: number): number {
  return Math.round(grabCarOneWayFare(distanceKm) * ROUND_TRIP_MULTIPLIER);
}

// ─────────────────────────────────────────────────────────────────────
// TaxiFareResult — UI-facing shape
// ─────────────────────────────────────────────────────────────────────

/** Tier label kept stable across the codebase even though the
 *  underlying calculation no longer uses flat tiers. Drives chip
 *  styling in BookingFlowPage. */
export type TaxiTier = "free" | "base" | "short" | "standard" | "long" | "admin";

export interface TaxiFareResult {
  /** Customer-facing fare. `null` means the booking needs an admin quote. */
  fare: number | null;
  /** Tier id for analytics + UI styling. */
  tier: TaxiTier;
  /** Human label shown next to the price. */
  label: string;
  /** Distance used for the calculation (km, after road factor). */
  distanceKm: number;
  /** Fare BEFORE rain surcharge (= round-trip meter). */
  baseFareBeforeRain: number;
  /** Active rain status pulled from `weather.ts` cache. */
  rain: RainStatus;
  /** GrabCar one-way fare (for breakdown / analytics). */
  oneWayFare: number;
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
 * Compute the customer-facing travel fare for a distance.
 * Round-trip meter (one-way × 2.0), then rain surcharge.
 */
export function calcTaxiFare(
  distanceKm: number,
  rainOverride?: RainStatus
): TaxiFareResult {
  const { tier, label } = resolveTier(distanceKm);
  const rain = rainOverride ?? getCachedRainStatus();
  const oneWayFare = grabCarOneWayFare(distanceKm);

  if (tier === "admin") {
    return {
      fare: null,
      tier,
      label,
      distanceKm,
      baseFareBeforeRain: 0,
      rain,
      oneWayFare,
    };
  }

  const roundTripBase = grabCarRoundTripFare(distanceKm); // one-way × 2.0
  const fare = Math.round(roundTripBase * (1 + rain.surchargePct));

  return {
    fare,
    tier,
    label,
    distanceKm,
    baseFareBeforeRain: roundTripBase,
    rain,
    oneWayFare,
  };
}

/**
 * Convenience wrapper for the booking page — computes Haversine
 * distance + fare in one call. Returns 0/free when coordinates are
 * missing (caller's UI usually shows "set address" hint instead).
 *
 * 🆕 Round 28r33 — `rainOverride` lets the booking page pass its
 *   async-resolved rain state and trigger a recalc when weather flips.
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
  //   path matches the road-distance estimate (directionsApi).
  const distanceKm =
    haversineKm(therapistLat, therapistLng, customerLat, customerLng) *
    BKK_ROAD_FACTOR;
  const result = calcTaxiFare(distanceKm, rainOverride);
  return {
    distanceKm,
    // Caller treats `null` (admin quote) as 0 for total math; UI separately
    // checks result.tier to render the admin-quote chip.
    fare: result.fare ?? 0,
    result,
  };
}
