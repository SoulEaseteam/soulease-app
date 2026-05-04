// src/utils/directionsApi.ts
//
// 🆕 Round 28b25 (founder 2026-05-04) — Google Directions API wrapper.
//
// Replaces haversineKm() for fare/ETA calculations with REAL road
// distance + duration, fetched on-demand from Google's Directions API.
// Falls back to `haversine × 1.45` (BKK road factor) when the API
// isn't available (no key, offline, rate-limited, request error).
//
// Why
//  • Haversine is the "as the crow flies" straight line. In Bangkok,
//    real driving distance is 1.3–1.6× longer because of rivers,
//    expressway loops, and dead-end sois. Founder confirmed the
//    Maps Platform API key (61 APIs enabled) on Google Cloud, paid
//    plan active, so we can switch to real routing.
//
// Cost-control
//  • Each call ≈ ฿0.17. To keep the bill sane:
//    1. Cache by quantized lat/lng pair (3 decimals ≈ 100 m grid)
//       in sessionStorage. Same pickup/dropoff = 1 API call ever.
//    2. Skip API entirely when distance < 0.5 km haversine (we
//       already know it's short, no need to spend a call).
//    3. Single in-flight request per cache key — concurrent callers
//       share the same Promise.
//
// API surface
//  • `fetchDrivingDistance(origin, destination)` → resolves to a
//    `RouteResult` with `kmRoad`, `durationMin`, `source` (`"google"`
//    | `"haversine"`).
//  • Synchronous helpers in taxiFare.ts now have async counterparts
//    that take a RouteResult and return the same TaxiFareResult shape.

import { haversineKm } from "@/utils/taxiFare";

const CACHE_PREFIX = "sunred_dirCache:";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 h
const SHORT_TRIP_KM = 0.5; // skip API for trips this short

// 🆕 Round 28b25 — empirical BKK road factor when Directions API is
//   unavailable. Calibrated from Google Maps screenshots: 8.5 km
//   haversine ≈ 13.5 km road → ratio 1.59. Use 1.45 as a conservative
//   fallback so we don't over-charge when the API's down.
const BKK_ROAD_FACTOR = 1.45;
const BKK_AVG_SPEED_KMH = 22; // urban BKK including traffic

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
  const durationMin = (kmRoad / BKK_AVG_SPEED_KMH) * 60;
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
 * Fetch real driving distance + duration from Google Directions API.
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
    return {
      kmRoad: haversine * BKK_ROAD_FACTOR,
      kmHaversine: haversine,
      durationMin: (haversine / BKK_AVG_SPEED_KMH) * 60,
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

  // De-dup concurrent calls
  const pending = inFlight.get(cacheKey);
  if (pending) return pending;

  const promise = (async (): Promise<RouteResult> => {
    try {
      const w = window as Window & {
        google?: {
          maps?: {
            DirectionsService?: new () => google.maps.DirectionsService;
            TravelMode?: { DRIVING: google.maps.TravelMode };
          };
        };
      };
      if (!w.google?.maps?.DirectionsService) {
        // Maps SDK not loaded yet — caller should ensure
        // GoogleMapsContext.loadIfNeeded() ran first.
        return haversineFallback(origin, destination);
      }
      const service = new w.google.maps.DirectionsService();
      const result = await service.route({
        origin: { lat: origin.lat, lng: origin.lng },
        destination: { lat: destination.lat, lng: destination.lng },
        travelMode: w.google.maps.TravelMode!.DRIVING,
        provideRouteAlternatives: false,
      });
      const leg = result?.routes?.[0]?.legs?.[0];
      const meters = leg?.distance?.value;
      const seconds = leg?.duration?.value;
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
      // Quota exceeded, network error, malformed response — fall back.
      console.warn("[directions] api failed, falling back to haversine:", err);
      return haversineFallback(origin, destination);
    } finally {
      inFlight.delete(cacheKey);
    }
  })();

  inFlight.set(cacheKey, promise);
  return promise;
}
