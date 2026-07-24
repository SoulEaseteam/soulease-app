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
 * 🆕 Round 28x.115 (founder, same session as the new moto rate below) —
 * back to 15: restated explicitly while recalibrating the fare curve.
 */
export let ADMIN_QUOTE_KM = 15;

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
 *
 * ⚠️ Round 28x.112 (founder: "คิดจากตัวพนักงานที่เลือกจริง") — DISPATCH_BASE is
 *    NO LONGER the routing origin. It flat-rated every practitioner from one
 *    point, so a guest in Silom picking a Silom practitioner was still charged
 *    the ~18 km Din Daeng distance — and the /near-me dropdown (which used each
 *    practitioner's real home) disagreed with the fare box, which used this.
 *    The travel fare now routes from the SELECTED practitioner's own coords via
 *    `resolveFareOrigin()` below. DISPATCH_BASE survives ONLY as the fallback
 *    when a practitioner has no lat/lng, so a fare never goes blank.
 */
export const DISPATCH_BASE = { lat: 13.7548, lng: 100.5656 } as const;

/**
 * 🆕 Round 28x.112 — the single source of truth for "where does the travel
 * fare start from". The selected practitioner's own coordinates when valid,
 * else DISPATCH_BASE. Every fare/route call site (near-me estimate, booking
 * flow, admin booking) MUST route from this so the estimate, the booking
 * charge and the stored booking origin can never disagree again.
 */
export function resolveFareOrigin(
  t: { lat?: number | null; lng?: number | null } | null | undefined
): { lat: number; lng: number } {
  return typeof t?.lat === "number" && typeof t?.lng === "number"
    ? { lat: t.lat, lng: t.lng }
    : { lat: DISPATCH_BASE.lat, lng: DISPATCH_BASE.lng };
}

/** Legacy alias — kept at 0 so any old caller that gated on "within free
 *  distance" never triggers; every trip is a paid trip. */
export const FREE_DISTANCE_KM = 0;

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

// ─── Motorcycle taxi (GrabBike) round-trip fare curve ─────────────────
//
// 🆕 Round 28x.99m (founder: "นับตามจริงของมอไซต์ ยกเว้น ฝนตก เป็นรถยน") —
//   the dispatch fare defaults to a MOTORCYCLE taxi, not a car — this is
//   how a therapist actually gets sent out for most trips (cheaper,
//   faster through Bangkok traffic). Car (the GrabCar meter above) only
//   applies when it's raining (getCachedRainStatus().tier !== "none") —
//   a motorcycle isn't a safe or practical dispatch in the rain.
//
// 🆕 Round 28x.115 (founder: "ปรับขาไป 30 ขากลับ 20 · กม.ที่ 0-3 เริ่มที่ 100")
//   — replaces the 28x.99n Grab-spot-check checkpoints with the founder's own
//   flat per-leg rate: a ฿100 floor for 0–3 km, then every km beyond 3 adds
//   ฿30 for the outbound leg + ฿20 for the return leg (฿50/km combined — the
//   full round trip, same "both legs, no discount" principle as 28s308).
//   Still expressed as CHECKPOINTS (not a closed-form formula in
//   motoRoundTripFare) so the admin Settings editor and the linear-
//   interpolation/round-to-฿10 machinery below keep working unchanged — the
//   checkpoints below are just points ON that ฿50/km line:
//     3 km → ฿100 · 6 km → ฿250 · 10 km → ฿450 · 15 km → ฿700
//   (ADMIN_QUOTE_KM = 15, so nothing prices automatically past this last
//   point — nice, since it's also the cutoff.)
//
//   If founder re-tunes the per-km rate again later, update these
//   checkpoints — they're a live rate card, not a permanent formula.
let MOTO_FARE_CHECKPOINTS: [km: number, roundTripTHB: number][] = [
  [0, 100],
  [3, 100],
  [6, 250],
  [10, 450],
  [15, 700],
];

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
  motoFareCheckpoints?: [number, number][];
}): void {
  // 🆕 28x.99u — was `travelBands` (TravelBand[] flat-band shape), which fed
  //   the dead `travelBudgetForKm()`/`calcTravelBudgetResult()` pair: nothing
  //   in the live fare path (calcTaxiFare → motoRoundTripFare) had called
  //   those since the 28x.99n checkpoint-interpolation rewrite, so admin's
  //   edits here silently stopped affecting any real fare. Reconnected to
  //   the checkpoint model that's actually live now — setMotoFareCheckpoints
  //   already validates/sorts/no-ops on bad input, same guarantee as before.
  if (Array.isArray(cfg.motoFareCheckpoints)) setMotoFareCheckpoints(cfg.motoFareCheckpoints);
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
 * Round-trip GrabBike fare for any distance (km) — linear interpolation
 * between MOTO_FARE_CHECKPOINTS (points on the founder's flat ฿30/km-outbound
 * + ฿20/km-return rate; see the comment on the checkpoints table above).
 * Distances at or beyond the last checkpoint hold at that checkpoint's fare —
 * in practice this never matters, since ADMIN_QUOTE_KM (15) routes anything
 * past the last checkpoint to a manual admin quote before this function
 * would need to extrapolate.
 */
export function motoRoundTripFare(distanceKm: number): number {
  const pts = MOTO_FARE_CHECKPOINTS;
  if (!Number.isFinite(distanceKm) || distanceKm <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) {
    const [x1, y1] = pts[i];
    if (distanceKm <= x1) {
      const [x0, y0] = pts[i - 1];
      const raw = y0 + ((y1 - y0) * (distanceKm - x0)) / (x1 - x0);
      // 🆕 Round 28x.99o (founder: "ถ้าอยู่ในราคากลาง...ก็ขยับทีละ 10 20
      // ตามสมควร") — a real Grab quote is always a round number; smooth
      // interpolation between checkpoints was landing on odd figures like
      // ฿133/฿157/฿203 for the in-between km values. Round to the nearest
      // ฿10 so every distance quotes a clean number, same granularity as
      // the checkpoints themselves (all multiples of 10).
      return Math.round(raw / 10) * 10;
    }
  }
  return pts[pts.length - 1][1];
}

/** Apply a new set of real spot-checked checkpoints (see
 *  MOTO_FARE_CHECKPOINTS comment) — sorted + validated so a bad write
 *  can't invert the curve or leave it unpriced. */
export function setMotoFareCheckpoints(points: [number, number][]): void {
  const clean = points
    .filter((p) => Array.isArray(p) && p.length === 2 && Number.isFinite(p[0]) && Number.isFinite(p[1]) && p[0] >= 0 && p[1] > 0)
    .sort((a, b) => a[0] - b[0]);
  if (clean.length >= 2) MOTO_FARE_CHECKPOINTS = clean;
}

/** The live checkpoint table — what admin has configured, or the
 *  spot-checked defaults. For the Advanced Settings editor (28x.99u). */
export function motoFareCheckpoints(): [number, number][] {
  return MOTO_FARE_CHECKPOINTS;
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
 * 🆕 Round 28x.99m/n (founder: "นับตามจริงของมอไซต์ ยกเว้น ฝนตก เป็นรถยน" +
 *   real spot-checked GrabBike quotes) — dispatch defaults to a
 *   MOTORCYCLE taxi; switches to the GrabCar meter only when it's
 *   actually raining (rain.tier !== "none") — a motorcycle isn't a
 *   safe/practical dispatch in the rain, so the fare (and the vehicle
 *   it's based on) both flip together.
 *
 *   Car:  base = round-trip GrabCar meter (one-way × 2.0) + Grab
 *         booking fee × 2 legs — a real metered formula, so the
 *         booking-fee add-on is legitimate.
 *   Moto: base = motoRoundTripFare(distanceKm) directly — this is
 *         already the real, all-in round-trip figure founder spot-
 *         checked in the Grab app, so NO separate booking fee is added
 *         on top (that would double-count whatever Grab already bakes
 *         into its own quote).
 *   fare (both) = base × (1 + surge% + rain%)
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
  const surgePct = surgePctForHour(bkkHour);

  if (tier === "admin") {
    return {
      fare: null,
      tier,
      label,
      distanceKm,
      baseFareBeforeRain: 0,
      rain,
      oneWayFare: 0,
      bookingFee: 0,
      surgePct,
      vehicle,
    };
  }

  let base: number;
  let oneWayFare: number;
  let bookingFee: number;
  if (vehicle === "car") {
    oneWayFare = grabCarOneWayFare(distanceKm);
    bookingFee = Math.round(GRAB_BOOKING_FEE * 2); // one call fee per leg, 2 legs
    base = grabCarRoundTripFare(distanceKm) + bookingFee;
  } else {
    const roundTrip = motoRoundTripFare(distanceKm);
    oneWayFare = Math.round(roundTrip / 2); // display/analytics only — the real number is the round-trip quote, not a doubled one-way meter
    bookingFee = 0; // already baked into the spot-checked round-trip figure
    base = roundTrip;
  }
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

