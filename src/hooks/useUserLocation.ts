// src/hooks/useUserLocation.ts
//
// Real-time geolocation hook using `navigator.geolocation.watchPosition`.
// Returns the user's current { lat, lng } and updates whenever the device
// reports a new position. Used by TherapistProfileCard to compute live
// distance from the customer to the therapist.
//
// Permission handling:
//   • If geolocation is unsupported   → status = "unsupported"
//   • If user has not granted yet     → status = "prompt" (location is null)
//   • If user denied                   → status = "denied"  (location is null)
//   • If granted and a fix is acquired → status = "ready"   (location set)
//
// We intentionally do NOT request permission on mount — the caller decides
// when to call `request()` (e.g., when the user taps "Use my location").

import { useCallback, useEffect, useRef, useState } from "react";

export type GeoStatus = "idle" | "prompt" | "ready" | "denied" | "unsupported";

export interface LiveLocation {
  lat: number;
  lng: number;
  /** Reported accuracy in meters from the Geolocation API. */
  accuracy?: number;
  /** Timestamp (ms epoch) of the last fix. */
  updatedAt: number;
}

interface UseUserLocationOpts {
  /** Auto-start watching on mount. Defaults to false — explicit request is safer. */
  autoStart?: boolean;
  /** PositionOptions passed to watchPosition. */
  enableHighAccuracy?: boolean;
  /** Maximum age (ms) of a cached fix. Default 30s. */
  maximumAge?: number;
  /** Timeout (ms) for the first fix. Default 15s. */
  timeout?: number;
}

interface UseUserLocationResult {
  location: LiveLocation | null;
  status: GeoStatus;
  error: string | null;
  /** Begin watching the user's position. Idempotent. */
  request: () => void;
  /** Stop watching (releases the watcher and battery). */
  stop: () => void;
}

// 🆕 28w.75 — remembered last fix. Lives ONLY in this device's localStorage
//   (never sent anywhere) and is dropped the moment the guest revokes the
//   permission, so revoking really does forget them.
const GEO_CACHE_KEY = "sr.geo.lastFix";
/** How long a remembered fix stays usable. Beyond this we re-acquire. */
const GEO_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function readCachedFix(): LiveLocation | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(GEO_CACHE_KEY);
    if (!raw) return null;
    const fix = JSON.parse(raw) as LiveLocation;
    if (
      typeof fix?.lat !== "number" ||
      typeof fix?.lng !== "number" ||
      typeof fix?.updatedAt !== "number"
    ) {
      return null;
    }
    if (Date.now() - fix.updatedAt > GEO_CACHE_TTL_MS) return null; // stale
    return fix;
  } catch {
    return null;
  }
}

function writeCachedFix(fix: LiveLocation): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(GEO_CACHE_KEY, JSON.stringify(fix));
  } catch {
    /* private mode / quota — caching is a nicety, never a hard dependency */
  }
}

function clearCachedFix(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(GEO_CACHE_KEY);
  } catch {
    /* ignore */
  }
}

export function useUserLocation(
  opts: UseUserLocationOpts = {}
): UseUserLocationResult {
  const {
    autoStart = false,
    enableHighAccuracy = false,
    maximumAge = 30_000,
    timeout = 15_000,
  } = opts;

  // 🆕 28w.75 (founder "เบราว์เซอร์ ถามซ้ำ วันต่อวัน") — hydrate from the last
  //   remembered fix so a returning guest sees their distance immediately with
  //   NO prompt. Safari (and Chrome for infrequently-visited sites) expires the
  //   geolocation grant, so `permissions.state` falls back to "prompt" every
  //   day — we cannot stop the browser re-asking, but we CAN stop needing to
  //   ask: the cached fix renders the distance while a silent refresh runs.
  const cached = readCachedFix();
  const [location, setLocation] = useState<LiveLocation | null>(cached);
  const [status, setStatus] = useState<GeoStatus>(cached ? "ready" : "idle");
  const [error, setError] = useState<string | null>(null);
  const watcherRef = useRef<number | null>(null);

  const stop = useCallback(() => {
    if (watcherRef.current !== null && typeof navigator !== "undefined") {
      navigator.geolocation.clearWatch(watcherRef.current);
      watcherRef.current = null;
    }
  }, []);

  const request = useCallback(() => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      setStatus("unsupported");
      setError("Geolocation is not supported on this device");
      return;
    }
    // Already watching — don't double-subscribe.
    if (watcherRef.current !== null) return;

    // 🆕 28w.75 — if a remembered fix is already on screen ("ready"), a silent
    //   background refresh must NOT flip the chip back to "Locating…".
    setStatus((prev) => (prev === "ready" ? prev : "prompt"));
    setError(null);

    watcherRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const fix: LiveLocation = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          updatedAt: pos.timestamp,
        };
        setLocation(fix);
        writeCachedFix(fix); // 🆕 28w.75 — remember, so tomorrow needs no prompt
        setStatus("ready");
        setError(null);
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          // 🆕 28w.75 — a denial must also forget the remembered fix, otherwise
          //   revoking the permission would still leave a distance on screen.
          clearCachedFix();
          setLocation(null);
          setStatus("denied");
          setError("Location permission denied");
        } else {
          // POSITION_UNAVAILABLE / TIMEOUT — not fatal, watcher keeps trying
          setError(err.message || "Could not determine location");
        }
      },
      { enableHighAccuracy, maximumAge, timeout }
    );
  }, [enableHighAccuracy, maximumAge, timeout]);

  useEffect(() => {
    if (autoStart) request();

    // 🆕 Round 28b14 — Permissions API auto-resume.
    //   If the browser ALREADY remembers `granted` permission for this
    //   origin (user allowed before), fetch coords immediately on mount
    //   without waiting for a user gesture. Distance shows instantly
    //   on returning visits — no banner, no tap.
    //
    //   For `prompt` (first visit) and `denied` (user blocked), we do
    //   NOT call request — the in-app banner handles those flows.
    if (
      typeof navigator !== "undefined" &&
      "permissions" in navigator &&
      "geolocation" in navigator
    ) {
      void navigator.permissions
        .query({ name: "geolocation" as PermissionName })
        .then((p) => {
          // 🆕 28w.75 — if the guest has REVOKED the permission, the remembered
          //   fix must go too. Without this, a cached distance would keep
          //   showing on mount even though they blocked us (the "change"
          //   listener below only fires on a *transition*, not on load).
          if (p.state === "denied") {
            clearCachedFix();
            setLocation(null);
            setStatus("denied");
          }
          if (p.state === "granted") {
            request();
          }
          // Re-check on permission change (user toggles in browser settings)
          p.addEventListener("change", () => {
            if (p.state === "granted") {
              request();
            } else if (p.state === "denied") {
              // 🆕 28w.75 — revoking in browser settings forgets the fix too.
              clearCachedFix();
              setLocation(null);
              setStatus("denied");
            }
          });
        })
        .catch(() => {
          /* Permissions API unsupported — banner CTA is the fallback. */
        });
    }

    return () => stop();
    // request/stop are stable refs (useCallback) — safe to include
  }, [autoStart, request, stop]);

  return { location, status, error, request, stop };
}

export default useUserLocation;
