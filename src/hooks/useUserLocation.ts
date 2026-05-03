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

export function useUserLocation(
  opts: UseUserLocationOpts = {}
): UseUserLocationResult {
  const {
    autoStart = false,
    enableHighAccuracy = false,
    maximumAge = 30_000,
    timeout = 15_000,
  } = opts;

  const [location, setLocation] = useState<LiveLocation | null>(null);
  const [status, setStatus] = useState<GeoStatus>("idle");
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

    setStatus("prompt");
    setError(null);

    watcherRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          updatedAt: pos.timestamp,
        });
        setStatus("ready");
        setError(null);
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
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
          if (p.state === "granted") {
            request();
          }
          // Re-check on permission change (user toggles in browser settings)
          p.addEventListener("change", () => {
            if (p.state === "granted") request();
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
