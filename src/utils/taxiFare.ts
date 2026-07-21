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
 * Beyond this (km, road distance) the auto-quote stops and the booking
 * must be confirmed with an admin.
 *
 * 🆕 Round 28s309 (founder: "15 km เก็บค่ามัดจำ" → chose "เกิน 15 กม. =
 * ยืนยันกับแอดมินก่อน") — dropped 40 → 15 so long trips route to a manual
 * concierge confirmation instead of an automatic price. Live-overridable.
 * 🆕 Round 28x.49 (founder: "20 กิโล ต้องติดต่อแอดมิน หรือวางมัดจำ") — raised to
 * 20: the real meter auto-prices trips up to ~20 km; beyond that the fare
 * (and no-show risk) is high enough that it routes to the concierge for a
 * quote / deposit instead.
 */
export let ADMIN_QUOTE_KM = 20;

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

/**
 * 🆕 Round 28w.11 (founder 2026-07-13) — SunRed's fixed dispatch TRAVEL
 * BUDGET by real (road) distance. Founder-set flat bands, deliberately
 * EXCLUDING weather + peak-traffic surcharges (the concierge quotes those
 * live at booking). Used by the near-me taxi estimator instead of the
 * GrabCar meter maths below. Returns null beyond 30 km (out of the standard
 * table → concierge quotes the fare).
 *
 *   ≤5 km → ฿100 · ≤10 km → ฿200 · ≤15 km → ฿350 · ≤20 km → ฿600 · ≤30 km → ฿800
 */
export interface TravelBand {
  /** Upper bound of the band, in km (inclusive). */
  maxKm: number;
  /** What the guest pays for travel inside this band, in THB. */
  fareTHB: number;
}

/**
 * 🆕 Round 28x.6 (founder: "เทคซี่ละ") — the bands are ADMIN-EDITABLE now.
 *
 * They used to be hardcoded here, which meant the ONE number a guest actually
 * pays for travel was the only fare value she could not change: applyLiveFareConfig
 * already exposed the surge %, the booking fee, the round-trip multiplier and the
 * quote cutoff — every knob EXCEPT the fare itself. Same shape of bug as the dead
 * price editor in 28w.79.
 *
 * The values below stay as the DEFAULTS, so an absent or unusable config falls
 * back to the founder's current table rather than leaving travel unpriced.
 */
export const DEFAULT_TRAVEL_BANDS: TravelBand[] = [
  { maxKm: 5,  fareTHB: 100 },
  { maxKm: 10, fareTHB: 200 },
  { maxKm: 15, fareTHB: 350 },
  { maxKm: 20, fareTHB: 600 },
  { maxKm: 30, fareTHB: 800 },
];

let liveTravelBands: TravelBand[] = DEFAULT_TRAVEL_BANDS;

/** The live table — what the admin has configured, or the defaults. */
export function travelBands(): TravelBand[] {
  return liveTravelBands;
}

export function travelBudgetForKm(km: number): number | null {
  if (!Number.isFinite(km) || km < 0) return null;
  // Bands are sorted ascending, so the first one we fit inside is the right one.
  for (const b of liveTravelBands) {
    if (km <= b.maxKm) return b.fareTHB;
  }
  // Beyond the last band the concierge quotes it — returning a number here would
  // invent a fare for a trip nobody has priced.
  return null;
}

// 🆕 Round 28x.47 (founder: "ปัดเศษลง แล้วขึ้นข้อความ ประหยัด ค่าเดินทางแบบแกรปทำ") —
//   an online-booking saving on the travel fee, presented Grab-style: the band
//   fare is the struck "original", and the guest actually pays a slightly lower,
//   rounded-DOWN figure. Tunable in one place; set to 0 to switch the saving off
//   (then youPay === original and no "save" chip shows).
export const WEB_TAXI_SAVING_PCT = 0.05;

export interface TravelFareDisplay {
  /** The full metered round-trip fare (incl. booking fee + surge) — shown
   *  struck-through as the "before" price. */
  original: number | null;
  /** What the guest actually pays: meter − saving, rounded DOWN to ฿10. */
  youPay: number | null;
  /** original − youPay (0 when there's no saving or the trip needs a quote). */
  save: number;
  /** The underlying meter result (tier / rain / surge) for chips + labels. */
  result: TaxiFareResult;
}

// 🆕 Round 28x.48 (founder: "ใช้ราคาจริงแบบเดิม ... มิเตอร์จริง + surge, เก็บส่วนลดไว้")
//   — reverted from the flat bands to the REAL GrabCar meter: round-trip metered
//   distance + booking fee + time/rain surge (calcTaxiFare). The online saving
//   (WEB_TAXI_SAVING_PCT) rides on top of that real price.
export function travelFareDisplay(
  km: number,
  rain?: RainStatus,
  bkkHour?: number | null
): TravelFareDisplay {
  const result = calcTaxiFare(km, rain, bkkHour);
  const original = result.fare;
  if (original == null) return { original: null, youPay: null, save: 0, result };
  const pct = Math.min(0.5, Math.max(0, WEB_TAXI_SAVING_PCT));
  const youPay = Math.max(0, Math.floor((original * (1 - pct)) / 10) * 10);
  return { original, youPay, save: Math.max(0, original - youPay), result };
}

// ─── GrabCar Bangkok rate card ───────────────────────────────────────
const BASE_FARE = 45;        // first km (≤ 1 km flag-fall)
const TIER_2_PER_KM = 8;     // applies to km 1 → 6
const TIER_2_END_KM = 6;
const TIER_3_PER_KM = 7;     // applies to km 6 → 40
const TIER_3_END_KM = 40;
const TIER_4_PER_KM = 10;    // applies to km 40+

// ─── Motorcycle taxi (วินมอเตอร์ไซค์) Bangkok rate card ────────────────
//
// 🆕 Round 28x.99m (founder: "นับตามจริงของมอไซต์ ยกเว้น ฝนตก เป็นรถยน") —
//   the dispatch fare now defaults to a MOTORCYCLE taxi, not a car — this
//   is how a therapist actually gets sent out for most trips (cheaper,
//   faster through Bangkok traffic). Car (the GrabCar meter above) only
//   applies when it's raining (getCachedRainStatus().tier !== "none") —
//   a motorcycle isn't a safe or practical dispatch in the rain.
//
//   Rates are the Department of Land Transport's (กรมการขนส่งทางบก)
//   legally-regulated MAXIMUM motorcycle-taxi fares for Bangkok, not an
//   app estimate (GrabBike's own published range is too wide/informal
//   to price a fixed quote off):
//     • First 2 km  : not exceeding ฿25
//     • km 2 → 5    : not exceeding ฿5/km
//     • km 5 → 15   : not exceeding ฿10/km
//     • km 15+      : negotiable, but capped at ฿10/km throughout if no
//                     agreement is made — so tier 4 continues at ฿10/km.
//   Reference: https://www.mangozero.com/price-rates-for-motorcycle-service/
const MOTO_BASE_FARE = 25;       // first 2 km flag-fall
const MOTO_BASE_KM = 2;
const MOTO_TIER_2_PER_KM = 5;    // applies to km 2 → 5
const MOTO_TIER_2_END_KM = 5;
const MOTO_TIER_3_PER_KM = 10;   // applies to km 5 → 15
const MOTO_TIER_3_END_KM = 15;
const MOTO_TIER_4_PER_KM = 10;   // applies to km 15+ (same capped rate)

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

/**
 * 🆕 Round 28s309 (founder: "มีค่าเรียกรถ Grab 20 บาท" → per leg) — Grab's
 * per-ride booking fee. A round trip is two rides, so it's added twice.
 * Live-overridable.
 */
export let GRAB_BOOKING_FEE = 20;

/**
 * 🆕 Round 28s309 (founder: "รถหยุดนิ่ง +2/นาที ... ช่วงเวลาเร่งด่วน และ
 * แออัด" → chose "surge % ตามช่วงเวลา") — a pre-booking quote can't know
 * the real idle minutes or live demand (Grab computes those from GPS at
 * ride time). We approximate with a time-of-day surge applied to the
 * booking's scheduled hour: a rush-hour band (traffic / idle time) and a
 * late-night peak-demand band. Both percentages are live-overridable so
 * the founder tunes them from Settings; 0 disables a band.
 */
export let RUSH_SURGE_PCT = 25;  // 07:00–09:00 & 17:00–20:00 (traffic/idle)
export let PEAK_SURGE_PCT = 15;  // 21:00–02:00 (late-night peak demand)

/** Surge fraction (e.g. 0.25) for a given BKK hour; 0 outside the bands
 *  or when the hour is unknown. Rain is handled separately (weather.ts). */
export function surgePctForHour(bkkHour?: number | null): number {
  if (bkkHour == null || !Number.isFinite(bkkHour)) return 0;
  const h = ((Math.floor(bkkHour) % 24) + 24) % 24;
  if ((h >= 7 && h < 9) || (h >= 17 && h < 20)) return Math.max(0, RUSH_SURGE_PCT) / 100;
  if (h >= 21 || h < 2) return Math.max(0, PEAK_SURGE_PCT) / 100;
  return 0;
}

/** Apply live Firestore-sourced overrides (called once at boot + on every
 *  live update — see MaintenanceGate.tsx). Ignores out-of-range values so
 *  a bad write can't break pricing. */
export function applyLiveFareConfig(cfg: {
  adminQuoteKm?: number;
  roundTripMultiplier?: number;
  grabBookingFee?: number;
  rushSurgePct?: number;
  peakSurgePct?: number;
  travelBands?: TravelBand[];
}): void {
  // 🆕 28x.6 — the travel table. Guarded hard: a half-typed row, a zero fare, or
  //   an emptied list falls back to the defaults rather than pricing travel at 0
  //   or leaving it unpriced. Sorted, because travelBudgetForKm returns the first
  //   band the distance fits and an out-of-order table would hand out the wrong one.
  if (Array.isArray(cfg.travelBands)) {
    const clean = cfg.travelBands
      .filter((b) => b && typeof b.maxKm === "number" && b.maxKm > 0
                       && typeof b.fareTHB === "number" && b.fareTHB > 0)
      .map((b) => ({ maxKm: b.maxKm, fareTHB: Math.round(b.fareTHB) }))
      .sort((a, b) => a.maxKm - b.maxKm);
    liveTravelBands = clean.length ? clean : DEFAULT_TRAVEL_BANDS;
  }
  if (typeof cfg.adminQuoteKm === "number" && cfg.adminQuoteKm > 0) ADMIN_QUOTE_KM = cfg.adminQuoteKm;
  if (typeof cfg.roundTripMultiplier === "number" && cfg.roundTripMultiplier > 1) ROUND_TRIP_MULTIPLIER = cfg.roundTripMultiplier;
  if (typeof cfg.grabBookingFee === "number" && cfg.grabBookingFee >= 0) GRAB_BOOKING_FEE = cfg.grabBookingFee;
  // Surges clamped 0–200 % so a fat-fingered value can't 10× a fare.
  if (typeof cfg.rushSurgePct === "number" && cfg.rushSurgePct >= 0) RUSH_SURGE_PCT = Math.min(200, cfg.rushSurgePct);
  if (typeof cfg.peakSurgePct === "number" && cfg.peakSurgePct >= 0) PEAK_SURGE_PCT = Math.min(200, cfg.peakSurgePct);
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

/**
 * Compute the motorcycle-taxi (วิน) one-way fare for any distance (km),
 * using the DLT-regulated Bangkok rate tiers above. Rounded to the
 * nearest baht. Returns MOTO_BASE_FARE (฿25) for any distance ≤ 2 km.
 */
export function motoOneWayFare(distanceKm: number): number {
  if (!Number.isFinite(distanceKm) || distanceKm <= 0) return MOTO_BASE_FARE;
  let fare = MOTO_BASE_FARE;
  if (distanceKm <= MOTO_BASE_KM) return Math.round(fare);

  let remaining = distanceKm - MOTO_BASE_KM;

  // Tier 2 — km 2 → 5 (max 3 paid km in this band)
  const tier2Km = Math.min(remaining, MOTO_TIER_2_END_KM - MOTO_BASE_KM);
  fare += tier2Km * MOTO_TIER_2_PER_KM;
  remaining -= tier2Km;
  if (remaining <= 0) return Math.round(fare);

  // Tier 3 — km 5 → 15 (max 10 paid km in this band)
  const tier3Km = Math.min(remaining, MOTO_TIER_3_END_KM - MOTO_TIER_2_END_KM);
  fare += tier3Km * MOTO_TIER_3_PER_KM;
  remaining -= tier3Km;
  if (remaining <= 0) return Math.round(fare);

  // Tier 4 — km 15+ (open-ended, same capped rate)
  fare += remaining * MOTO_TIER_4_PER_KM;
  return Math.round(fare);
}

/**
 * Round-trip motorcycle fare = one-way × ROUND_TRIP_MULTIPLIER (two
 * separate one-way rides — there and back), same round-trip convention
 * as the car meter.
 */
export function motoRoundTripFare(distanceKm: number): number {
  return Math.round(motoOneWayFare(distanceKm) * ROUND_TRIP_MULTIPLIER);
}

// ─────────────────────────────────────────────────────────────────────
// TaxiFareResult — UI-facing shape
// ─────────────────────────────────────────────────────────────────────

/** Tier label kept stable across the codebase even though the
 *  underlying calculation no longer uses flat tiers. Drives chip
 *  styling in BookingFlowPage. */
export type TaxiTier = "free" | "base" | "short" | "standard" | "long" | "admin";

/** Which vehicle the fare was metered on — moto by default, car in the
 *  rain (see calcTaxiFare). Round 28x.99m. */
export type TaxiVehicle = "moto" | "car";

export interface TaxiFareResult {
  /** Customer-facing fare. `null` means the booking needs an admin quote. */
  fare: number | null;
  /** Tier id for analytics + UI styling. */
  tier: TaxiTier;
  /** Human label shown next to the price. */
  label: string;
  /** Distance used for the calculation (km, after road factor). */
  distanceKm: number;
  /** Fare BEFORE rain + surge (= round-trip meter + booking fee). */
  baseFareBeforeRain: number;
  /** Active rain status pulled from `weather.ts` cache. */
  rain: RainStatus;
  /** One-way meter fare for the chosen vehicle (for breakdown / analytics). */
  oneWayFare: number;
  /** 🆕 28s309 — Grab per-ride booking fee × 2 legs (baht). */
  bookingFee: number;
  /** 🆕 28s309 — time-of-day surge fraction applied (0 = none). */
  surgePct: number;
  /** 🆕 28x.99m — "moto" unless it's raining, then "car" (see calcTaxiFare). */
  vehicle: TaxiVehicle;
}

/** Resolve tier label band from distance (UI-only, doesn't affect price). */
function resolveTier(
  distanceKm: number,
  vehicle: TaxiVehicle
): { tier: TaxiTier; label: string } {
  const vLabel = vehicle === "car" ? "Car (rain)" : "Moto";
  if (distanceKm > ADMIN_QUOTE_KM) {
    return {
      tier: "admin",
      label: `Long distance · admin quote (${distanceKm.toFixed(1)} km)`,
    };
  }
  if (distanceKm <= 1) {
    return { tier: "base", label: `${vLabel} · Base fare · ${distanceKm.toFixed(1)} km` };
  }
  if (distanceKm <= TIER_2_END_KM) {
    return { tier: "short", label: `${vLabel} · Short trip · ${distanceKm.toFixed(1)} km` };
  }
  return { tier: "standard", label: `${vLabel} · Standard · ${distanceKm.toFixed(1)} km` };
}

/**
 * Compute the customer-facing travel fare for a distance.
 *
 * 🆕 Round 28x.99m (founder: "นับตามจริงของมอไซต์ ยกเว้น ฝนตก เป็นรถยน") —
 *   dispatch defaults to a MOTORCYCLE taxi meter; switches to the GrabCar
 *   meter only when it's actually raining (rain.tier !== "none") — a
 *   motorcycle isn't a safe/practical dispatch in the rain, so the fare
 *   (and the vehicle it's based on) both flip together.
 *
 *   base   = round-trip meter (one-way × 2.0) + Grab booking fee × 2 legs
 *   fare   = base × (1 + surge% + rain%)
 *
 * `bkkHour` is the booking's scheduled hour (0–23, Bangkok) used for the
 * time-of-day surge; omit it for no surge.
 */
export function calcTaxiFare(
  distanceKm: number,
  rainOverride?: RainStatus,
  bkkHour?: number | null
): TaxiFareResult {
  const rain = rainOverride ?? getCachedRainStatus();
  const vehicle: TaxiVehicle = rain.tier !== "none" ? "car" : "moto";
  const { tier, label } = resolveTier(distanceKm, vehicle);
  const oneWayFare =
    vehicle === "car" ? grabCarOneWayFare(distanceKm) : motoOneWayFare(distanceKm);
  const surgePct = surgePctForHour(bkkHour);

  if (tier === "admin") {
    return {
      fare: null,
      tier,
      label,
      distanceKm,
      baseFareBeforeRain: 0,
      rain,
      oneWayFare,
      bookingFee: 0,
      surgePct,
      vehicle,
    };
  }

  const roundTripMeter =
    vehicle === "car" ? grabCarRoundTripFare(distanceKm) : motoRoundTripFare(distanceKm); // one-way × 2.0
  const bookingFee = Math.round(GRAB_BOOKING_FEE * 2); // one call fee per leg, 2 legs
  const base = roundTripMeter + bookingFee;
  // Surge (traffic/idle + peak demand) and rain stack additively so the
  // combined bump stays predictable and legible.
  const fare = Math.round(base * (1 + surgePct + rain.surchargePct));

  return {
    fare,
    tier,
    label,
    distanceKm,
    baseFareBeforeRain: base,
    rain,
    oneWayFare,
    bookingFee,
    surgePct,
    vehicle,
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
  rainOverride?: RainStatus,
  bkkHour?: number | null
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
  const result = calcTaxiFare(distanceKm, rainOverride, bkkHour);
  return {
    distanceKm,
    // Caller treats `null` (admin quote) as 0 for total math; UI separately
    // checks result.tier to render the admin-quote chip.
    fare: result.fare ?? 0,
    result,
  };
}

/**
 * 🆕 Round 28w.11 (founder 2026-07-13) — booking-flow taxi fee from the SAME
 * fixed travel-budget bands as the near-me estimator (travelBudgetForKm),
 * packaged as a TaxiFareResult so BookingFlowPage's fare summary keeps
 * rendering. Flat by real distance — NO weather / peak-traffic surge (rain is
 * forced to "none"). Beyond 30 km → tier "admin" (fare null → concierge quotes).
 */
export function calcTravelBudgetResult(distanceKm: number): TaxiFareResult {
  const noRain: RainStatus = { tier: "none", surchargePct: 0, label: "Clear", fetchedAt: 0 };
  const budget = travelBudgetForKm(distanceKm);
  if (budget == null) {
    return {
      fare: null,
      tier: "admin",
      label: `Over 30 km · ${distanceKm.toFixed(1)} km`,
      distanceKm,
      baseFareBeforeRain: 0,
      rain: noRain,
      oneWayFare: 0,
      bookingFee: 0,
      surgePct: 0,
      vehicle: "moto",
    };
  }
  return {
    fare: budget,
    tier: "standard",
    label: `Travel budget · ${distanceKm.toFixed(1)} km`,
    distanceKm,
    baseFareBeforeRain: budget,
    rain: noRain,
    oneWayFare: budget,
    bookingFee: 0,
    surgePct: 0,
    vehicle: "moto",
  };
}
