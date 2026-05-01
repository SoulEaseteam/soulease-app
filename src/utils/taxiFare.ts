// src/utils/taxiFare.ts
//
// 🚖 Taxi fare estimation — ported from legacy BookingPage to keep the
// same pricing users saw before the Phase 3 rewrite.
//
// Formula (Bangkok Grab approximation, round-trip):
//   one-way = BASE_FARE + (distanceKm × PER_KM) + (sessionMin × PER_MIN)
//   total   = round(oneWay × 2)
//
// Why session-min and not drive-min? Legacy used session duration as a
// rough proxy for therapist wait/standby time (the driver effectively
// waits the full session). Keep parity to avoid surprising existing users.

const BASE_FARE = 25;       // baht — flag drop
const PER_KM = 7;           // baht per km
const PER_MIN = 2;          // baht per session-min (proxy for driver wait)

/**
 * Haversine distance in kilometers between two lat/lng pairs.
 */
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

/**
 * Round-trip taxi fare (baht). Matches legacy `calculateGrabFare(...) × 2`.
 */
export function calcTaxiFare(distanceKm: number, sessionMin: number): number {
  const oneWay = BASE_FARE + distanceKm * PER_KM + sessionMin * PER_MIN;
  return Math.max(0, Math.round(oneWay * 2));
}

/**
 * Compute fare from therapist coords + customer coords + service duration.
 * Returns 0 when either coordinate is missing (no surprise charges).
 */
export function estimateTaxiFare(args: {
  therapistLat: number | null | undefined;
  therapistLng: number | null | undefined;
  customerLat: number | null | undefined;
  customerLng: number | null | undefined;
  durationMin: number | null | undefined;
}): { distanceKm: number; fare: number } {
  const {
    therapistLat,
    therapistLng,
    customerLat,
    customerLng,
    durationMin,
  } = args;
  if (
    therapistLat == null ||
    therapistLng == null ||
    customerLat == null ||
    customerLng == null ||
    !durationMin
  ) {
    return { distanceKm: 0, fare: 0 };
  }
  const distanceKm = haversineKm(
    therapistLat,
    therapistLng,
    customerLat,
    customerLng
  );
  return {
    distanceKm,
    fare: calcTaxiFare(distanceKm, durationMin),
  };
}
