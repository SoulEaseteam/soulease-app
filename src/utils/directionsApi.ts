// src/utils/directionsApi.ts
//
// 🆕 Round 28b25 (founder 2026-05-04) — Real road distance + duration
//   via Google Distance Matrix API (cheaper than Directions API and
//   built-in traffic-aware ETAs). Falls back to haversine × 1.45 +
//   time-of-day speed when API is unavailable.
//
// Round 28b32 (founder 2026-05-04) — Switched from Directions API to
//   Distance Matrix API (per founder direction). Reasons:
//   • $5 / 1,000 calls (basic) — same price as Directions Basic, but
//     the response is leaner (no encoded polyline, no waypoints).
//   • `drivingOptions.departureTime: now` returns
//     `duration_in_traffic` — traffic-aware ETAs without extra cost.
//   • One API call can resolve multiple origin × destination pairs
//     simultaneously — useful future-proofing for "show ETA on every
//     therapist card" feature.
//
// Time-of-day fallback (when API errors / SDK absent):
//   • 07:00 – 10:59 (Bangkok morning rush)  → 18 km/h
//   • 17:00 – 20:59 (Bangkok evening rush)  → 16 km/h
//   • All other hours                        → 25 km/h
//   • ETA floored at 3 min so "instant arrival" never displays
//     unrealistically.
//
// Cost-control (carried over from Round 28b25):
//   • Cache by quantized lat/lng pair (3 decimals ≈ 100 m grid) in
//     sessionStorage. Same pickup/dropoff = 1 API call ever.
//   • Skip API when distance < 0.5 km haversine.
//   • Single in-flight request per cache key.

import { haversineKm } from "@/utils/taxiFare";

const CACHE_PREFIX = "sunred_dirCache:";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 h
const SHORT_TRIP_KM = 0.5; // skip API for trips this short

// 🆕 Round 28b25 — empirical BKK road factor when API is unavailable.
//   Calibrated from Google Maps screenshots: 8.5 km haversine ≈
//   13.5 km road → ratio 1.59. Use 1.45 as a conservative fallback.
const BKK_ROAD_FACTOR = 1.45;

/**
 * 🆕 Round 28b32 — Time-of-day-aware speed estimate for Bangkok
 * driving. Returns km/h. Use to convert km → minutes when no live
 * Google traffic data is available.
 */
export const estimateBkkSpeedKmh = (hourOfDay: number): number => {
  // Morning rush
  if (hourOfDay >= 7 && hourOfDay <= 10) return 18;
  // Evening rush
  if (hourOfDay >= 17 && hourOfDay <= 20) return 16;
  // Off-peak (covers late-night, midday, early morning)
  return 25;
};

/**
 * 🆕 Round 28b32 — Convert km to minutes using Bangkok time-of-day
 * speed. Floored at 3 min so we never claim sub-minute deliveries.
 *
 * Use this on the BOOKING CONFIRM page where time-of-day matters
 * (rush-hour bookings need a longer ETA than midday).
 */
export const estimateEtaMin = (kmRoad: number, now: Date = new Date()): number => {
  const hour = now.getHours();
  const speed = estimateBkkSpeedKmh(hour);
  const minutes = (kmRoad / speed) * 60;
  return Math.max(3, Math.round(minutes));
};

/**
 * 🆕 Round 28b33 (founder 2026-05-04) — "Bangkok realistic" ETA.
 *
 * Round 28b38 (founder follow-up) — Now includes a default 15-minute
 * prep buffer (therapist getting ready + waiting for taxi). Customer
 * card showing "6 min • 2.4 km" was misleading — pure driving time
 * 6 min, but therapist actually arrived ~21 min later. The label
 * should answer "how long until therapist is at my door", not "how
 * long is the car ride".
 *
 * Formula:
 *   driving min = km / 25 × 60      (Bangkok 25 km/h average)
 *   + prep buffer (default 15 min)  (configurable for callers that
 *                                    add prep elsewhere)
 *
 * @param km          Distance in km. null/non-finite → returns null.
 * @param prepMin     Prep buffer to add (minutes). Default 15.
 *                    Pass 0 if the caller already adds prep separately
 *                    (e.g. BookingFlowPage uses estimateEtaMin + its
 *                    own STAFF_PREP_MIN).
 *
 * @returns total minutes (driving + prep), or null on bad input.
 *          Raw fractional minutes — caller (formatDistanceEta) does
 *          the rounding so display layer owns rounding policy.
 */
export function estimateEtaFromKm(
  km?: number | null,
  prepMin = 15
): number | null {
  if (km == null || !Number.isFinite(km)) return null;
  const avgSpeed = 25; // km/h — Bangkok realistic, traffic-included
  const drivingMin = (km / avgSpeed) * 60;
  return drivingMin + prepMin;
}

export interface LatLng {
  lat: number;
  lng: number;
}

export interface RouteResult {
  /** Real driving distance in km (or haversine × factor on fallback). */
  kmRoad: number;
  /** Driving duration in minutes (without therapist prep buffer). */
  durationMin: number;
  /** Where the number came from — UI can show "≈" hint when haversine. */
  source: "google" | "haversine" | "cache";
  /** Original haversine — kept for analytics + audit. */
  kmHaversine: number;
}

/** Quantize coords to 3 decimals (≈ 100 m grid) so nearby pings hit cache. */
const cacheKeyFor = (a: LatLng, b: LatLng): string => {
  const q = (n: number) => n.toFixed(3);
  return `${CACHE_PREFIX}${q(a.lat)},${q(a.lng)}_${q(b.lat)},${q(b.lng)}`;
};

interface CacheEntry {
  kmRoad: number;
  durationMin: number;
  kmHaversine: number;
  ts: number;
}

const readCache = (key: string): CacheEntry | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEntry;
    if (Date.now() - parsed.ts > CACHE_TTL_MS) {
      window.sessionStorage.removeItem(key);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};

const writeCache = (key: string, entry: CacheEntry) => {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(key, JSON.stringify(entry));
  } catch {
    // sessionStorage full — best-effort, ignore
  }
};

/** Build a haversine-based fallback when the API can't or shouldn't run. */
const haversineFallback = (a: LatLng, b: LatLng): RouteResult => {
  const km = haversineKm(a.lat, a.lng, b.lat, b.lng);
  const kmRoad = km * BKK_ROAD_FACTOR;
  const durationMin = estimateEtaMin(kmRoad);
  return {
    kmRoad,
    kmHaversine: km,
    durationMin,
    source: "haversine",
  };
};

// In-flight de-dup so two concurrent callers for the same trip = 1 API call.
const inFlight = new Map<string, Promise<RouteResult>>();

/**
 * Fetch real driving distance + duration via Google Distance Matrix API.
 * Falls back to haversine × BKK road factor on any error.
 *
 * @param origin therapist's current location
 * @param destination customer's address
 */
export async function fetchDrivingDistance(
  origin: LatLng,
  destination: LatLng
): Promise<RouteResult> {
  const haversine = haversineKm(origin.lat, origin.lng, destination.lat, destination.lng);

  // Tiny trips — skip the network round-trip
  if (haversine < SHORT_TRIP_KM) {
    const kmRoad = haversine * BKK_ROAD_FACTOR;
    return {
      kmRoad,
      kmHaversine: haversine,
      durationMin: estimateEtaMin(kmRoad),
      source: "haversine",
    };
  }

  const cacheKey = cacheKeyFor(origin, destination);
  const cached = readCache(cacheKey);
  if (cached) {
    return {
      kmRoad: cached.kmRoad,
      kmHaversine: cached.kmHaversine,
      durationMin: cached.durationMin,
      source: "cache",
    };
  }

  const pending = inFlight.get(cacheKey);
  if (pending) return pending;

  const promise = (async (): Promise<RouteResult> => {
    try {
      const w = window as Window & {
        google?: {
          maps?: {
            DistanceMatrixService?: new () => google.maps.DistanceMatrixService;
            TravelMode?: { DRIVING: google.maps.TravelMode };
            TrafficModel?: {
              BEST_GUESS: google.maps.TrafficModel;
            };
          };
        };
      };
      if (!w.google?.maps.DistanceMatrixService) {
        // Maps SDK not loaded yet — caller should ensure
        // GoogleMapsContext.loadIfNeeded() ran first.
        return haversineFallback(origin, destination);
      }
      const service = new w.google.maps.DistanceMatrixService();
      // 🆕 Round 28b32 — `drivingOptions.departureTime: new Date()`
      //   tells Google to use real-time traffic data. Returns
      //   `duration_in_traffic` field which we prefer over the
      //   non-traffic `duration` for accurate ETAs.
      const result = await service.getDistanceMatrix({
        origins: [{ lat: origin.lat, lng: origin.lng }],
        destinations: [{ lat: destination.lat, lng: destination.lng }],
        travelMode: w.google.maps.TravelMode.DRIVING,
        drivingOptions: {
          departureTime: new Date(),
          trafficModel: w.google.maps.TrafficModel.BEST_GUESS,
        },
      });
      const row = result.rows[0]?.elements?.[0];
      if (!row || row.status !== "OK") {
        return haversineFallback(origin, destination);
      }
      const meters = row.distance.value;
      // Prefer traffic-aware duration when available
      const seconds =
        row.duration_in_traffic.value ?? row.duration.value;
      if (!meters || !seconds) {
        return haversineFallback(origin, destination);
      }
      const kmRoad = meters / 1000;
      const durationMin = seconds / 60;
      writeCache(cacheKey, {
        kmRoad,
        durationMin,
        kmHaversine: haversine,
        ts: Date.now(),
      });
      return {
        kmRoad,
        kmHaversine: haversine,
        durationMin,
        source: "google",
      };
    } catch (err) {
      console.warn("[distanceMatrix] api failed, falling back to haversine:", err);
      return haversineFallback(origin, destination);
    } finally {
      inFlight.delete(cacheKey);
    }
  })();

  inFlight.set(cacheKey, promise);
  return promise;
}
