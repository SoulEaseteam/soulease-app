// src/utils/useTherapists.ts
//
// 🔌 Restored Firestore live therapist data hook (Phase 2 fix).
//
// Wires the existing data pipeline back into the new mockup-aligned UI:
//   1. Static seed → `src/data/therapists.ts`
//   2. Firestore live overrides → `onSnapshot(collection(db, "therapists"))`
//      (statusOverride, isHoliday, busyUntil, activeBooking, hideProfile)
//   3. Geolocation → distance computation against `homeLocation`
//   4. Privacy filter — hide therapists with `hideProfile=true` or status
//      "bookable" (i.e., currently out at a customer's location)
//   5. Map `Therapist` → `TherapistCardData` (the shape consumed by the
//      mockup-aligned `<TherapistCard />`, `<FeaturedTherapists />`,
//      `<TherapistsBrowsePage />`).
//
// This hook restores parity with the old `HomePage.tsx` data behaviour
// after the Phase-1 / Phase-2 redesign rewrites stripped it. Per BRAND.md
// "Existing API integrations / data fetching logic — keep".

import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import therapistsData from "@/data/therapists";
import { calculateTherapistStatus } from "@/utils/calculateTherapistStatus";
import { enhanceImage } from "@/utils/cloudinary";
import {
  bayesianRatingFromAggregate,
  formatRating,
} from "@/utils/rating";
import type { Therapist, FirestoreDateLike } from "@/types/therapist";
import type { TherapistCardData } from "@/components/therapist/TherapistCard";

// ── Live status override fields (subset of Therapist fetched from Firestore)
type LiveStatusFields = Pick<
  Therapist,
  | "statusOverride"
  | "isHoliday"
  | "isBooked"
  | "busyUntil"
  | "activeBooking"
> & { hideProfile?: boolean };

// ── helper: HH:mm minutes
function toMinutes(hhmm: string): number {
  if (!hhmm) return 999_999;
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}
function nowHHMM(): string {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60_000;
  const thai = new Date(utc + 7 * 3600 * 1000);
  return `${String(thai.getHours()).padStart(2, "0")}:${String(thai.getMinutes()).padStart(2, "0")}`;
}
function isWorkingNow(start: string, end: string): boolean {
  if (!start || !end) return true;
  const now = toMinutes(nowHHMM());
  const s = toMinutes(start);
  const e = toMinutes(end);
  if (e < s) return now >= s || now <= e; // cross-day shift
  return now >= s && now <= e;
}
function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

// ── helper: Therapist → TherapistCardData (mockup card shape)
function mapToCardData(
  t: Therapist,
  distanceKm: number | null,
  workingNow: boolean
): TherapistCardData {
  const ageStr = t.features.age ?? "";
  const ageNum = ageStr ? parseInt(ageStr, 10) || undefined : undefined;

  // language: "English, Mandarin" → ["EN", "中"] best-effort
  const langs = parseLangs(t.features.language ?? "");

  // services → UPPERCASE 3-4 letter codes
  const specs = (t.servicesAvailable ?? t.services ?? [])
    .slice(0, 3)
    .map(simplifySpec);

  // 🖼 Build the Cloudinary-enhanced image gallery. Cover (`t.image`) goes
  //    first; rest comes from `t.gallery`. Dedupe in case the cover already
  //    appears in the gallery array. Enhanced via Cloudinary auto-color +
  //    WebP — falls back to original URL if VITE_CLOUDINARY_CLOUD_NAME unset.
  const rawImages: string[] = [];
  if (t.image) rawImages.push(t.image);
  if (t.gallery && t.gallery.length > 0) {
    for (const g of t.gallery) {
      if (g && !rawImages.includes(g)) rawImages.push(g);
    }
  }
  const images = rawImages.map((url) =>
    enhanceImage(url, { variant: "hero" })
  );
  // Use the cover image as the card photo background (`url(...)` so it
  // works as a CSS background-image alongside gradients elsewhere). If
  // no cover, fall back to the per-id gradient.
  const photoBg = images.length > 0
    ? `center / cover no-repeat url("${images[0]}")`
    : gradientForId(t.id);

  return {
    id: t.id,
    name: t.name,
    age: ageNum,
    langs: langs.length > 0 ? langs : ["EN"],
    // ⭐ Bayesian-adjusted rating (prior 4.5★, weight 10) — keeps the
    //    browse cards consistent with the detail-page Reviews tab. New
    //    therapists with 0 reviews show 4.5★ rather than crashing to 0.
    rating: formatRating(
      bayesianRatingFromAggregate(t.rating * (t.reviews ?? 0), t.reviews ?? 0)
    ),
    reviewCount: t.reviews ?? 0,
    distanceKm: distanceKm != null ? `${distanceKm.toFixed(1)} km` : "—",
    specs,
    // Pricing TODO — read from canonical pricing source in Task 7. For now
    // use a sensible default that matches BRAND.md/services.
    price: "฿1,800",
    unit: "/60min",
    online: workingNow,
    availability: workingNow ? "●Now" : (t.startTime ?? ""),
    availabilityColor: workingNow ? "#16a34a" : "#b85c3c",
    photoBg,
    images,
  };
}

function parseLangs(raw: string): string[] {
  if (!raw) return [];
  const map: Record<string, string> = {
    english: "EN",
    en: "EN",
    chinese: "中",
    mandarin: "中",
    zh: "中",
    japanese: "日",
    ja: "日",
    korean: "한",
    ko: "한",
    thai: "TH",
    th: "TH",
  };
  return raw
    .split(/[,/&·•]| - /)
    .map((s) => s.trim().toLowerCase())
    .map((s) => map[s] ?? (s ? s.slice(0, 2).toUpperCase() : ""))
    .filter((s, i, a) => s && a.indexOf(s) === i)
    .slice(0, 3);
}

function simplifySpec(svc: string): string {
  const s = svc.toLowerCase();
  if (s.includes("thai")) return "THAI";
  if (s.includes("oil")) return "OIL";
  if (s.includes("aroma")) return "AROMA";
  if (s.includes("sport")) return "SPORT";
  if (s.includes("deep")) return "DEEP";
  if (s.includes("prenatal") || s.includes("pre-natal")) return "PRENATAL";
  if (s.includes("couple")) return "COUPLE";
  if (s.includes("gentleman")) return "GENT";
  return svc.slice(0, 5).toUpperCase();
}

// stable per-id gradient (matches the mockup palette family)
function gradientForId(id: string): string {
  const palette: [string, string][] = [
    ["#d4a574", "#8b6f47"],
    ["#e8c4a0", "#c89968"],
    ["#c89c7a", "#6b4a2f"],
    ["#f4d4b4", "#d4a574"],
    ["#d8b89c", "#a08060"],
    ["#e8d0b4", "#b89878"],
    ["#dabd9a", "#aa8866"],
    ["#e0c8a0", "#b08858"],
  ];
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  const [a, b] = palette[Math.abs(hash) % palette.length];
  return `linear-gradient(135deg, ${a}, ${b})`;
}

// ── geolocation hook (one-shot, falls back gracefully)
function useGeolocation() {
  const [loc, setLoc] = useState<{ lat: number; lng: number } | null>(null);
  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        setLoc({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        }),
      () => undefined,
      { enableHighAccuracy: true, timeout: 5000 }
    );
  }, []);
  return loc;
}

// ── live Firestore overrides hook
function useLiveOverrides() {
  const [map, setMap] = useState<Record<string, LiveStatusFields>>({});
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "therapists"),
      (snap) => {
        const next: Record<string, LiveStatusFields> = {};
        snap.forEach((doc) => {
          const d = doc.data();
          next[doc.id] = {
            statusOverride: d.statusOverride ?? null,
            isHoliday: !!d.isHoliday,
            isBooked: !!d.isBooked,
            busyUntil: (d.busyUntil ?? null) as FirestoreDateLike,
            activeBooking: !!d.activeBooking,
            hideProfile: !!d.hideProfile,
          };
        });
        setMap(next);
      },
      (err) => {
        // Subscription error — don't block UI; static data is the fallback.
        console.warn("therapists snapshot error:", err);
      }
    );
    return () => unsub();
  }, []);
  return map;
}

// ─────────────────────────────────────────────────────────────────────
// 🔌 Public hook — returns the merged, sorted, privacy-filtered list
//    in the `TherapistCardData` shape the mockup components consume.
// ─────────────────────────────────────────────────────────────────────
export function useTherapists(): TherapistCardData[] {
  const userLoc = useGeolocation();
  const live = useLiveOverrides();

  return useMemo(() => {
    const cards: TherapistCardData[] = [];

    for (const t of therapistsData) {
      // 1. merge static + live overrides
      const overrides = live[t.id];
      const merged: Therapist = overrides
        ? ({
            ...t,
            statusOverride: overrides.statusOverride ?? t.statusOverride,
            isHoliday: overrides.isHoliday ?? t.isHoliday,
            isBooked: overrides.isBooked ?? t.isBooked,
            busyUntil: overrides.busyUntil ?? t.busyUntil,
            activeBooking: overrides.activeBooking ?? t.activeBooking,
          } as Therapist)
        : (t);

      // 2. PRIVACY: hide manual-flag therapists
      // ⚠️ DO NOT remove the optional chain — `overrides` is undefined for
      //    therapists without a Firestore record. `eslint --fix` once
      //    stripped this `?` and crashed runtime with "Cannot read
      //    properties of undefined (reading 'hideProfile')".
      if (overrides?.hideProfile) continue;

      // 3. PRIVACY: hide therapists currently out at a customer's location
      const { status } = calculateTherapistStatus(merged);
      if (status === "bookable") continue;

      // 4. compute distance if both ends have coords
      const lat = (t as { lat?: number | string }).lat;
      const lng = (t as { lng?: number | string }).lng;
      const homeLat =
        typeof lat === "number" ? lat : lat ? Number(lat) : t.homeLocation?.lat;
      const homeLng =
        typeof lng === "number" ? lng : lng ? Number(lng) : t.homeLocation?.lng;
      const distance =
        userLoc && homeLat != null && homeLng != null && !isNaN(homeLat) && !isNaN(homeLng)
          ? getDistanceKm(userLoc.lat, userLoc.lng, Number(homeLat), Number(homeLng))
          : null;

      const workingNow = isWorkingNow(t.startTime, t.endTime);

      cards.push(mapToCardData(merged, distance, workingNow));
    }

    // 5. sort: working-now first, then by distance, then by rating
    return cards.sort((a, b) => {
      if (a.online !== b.online) return a.online ? -1 : 1;
      const aD = parseFloat(a.distanceKm) || Infinity;
      const bD = parseFloat(b.distanceKm) || Infinity;
      if (aD !== bD) return aD - bD;
      return parseFloat(b.rating) - parseFloat(a.rating);
    });
  }, [live, userLoc]);
}

export default useTherapists;
