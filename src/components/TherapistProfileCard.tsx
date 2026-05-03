// src/components/TherapistProfileCard.tsx
//
// 🎨 Phase 2 Redesign — verbatim port of `02-mockups/sunred-therapists2.html`
// (founder 2026-05-02). Compact 2-col grid card with:
//
//   ┌──────────────────────────────────────┐
//   │                  [EN][中] [✓]        │  ← lang pills + verified
//   │                                       │
//   │           [photo 3:4]                 │
//   │                                       │
//   │  Jimmy 29                             │  ← name + age (Fraunces)
//   │  ★ 4.6 (2)              1.2 km        │  ← Bayesian rating + live distance
//   ├──────────────────────────────────────┤
//   │ [155CM] [SLIM] [📷 GALLERY (9)]       │  ← spec chips coral + V1 gallery
//   │ ฿1,200/60min               ●Now       │  ← Firestore price + live status
//   └──────────────────────────────────────┘
//
// What's new vs. the v5 single-column hero card:
//   • Layout — 3:4 photo, fits 2-col grid (~190px wide on a 430px shell)
//   • Languages — `features.language` parsed → short pills (EN / 中 / 日 / 한)
//   • Verified — every Therapist in Firestore is verified, so the badge
//     always shows (matches mockup behavior)
//   • Real-time GPS distance — optional `userLocation` prop. When provided,
//     distance recomputes via Haversine on every position update.
//   • Real Firestore prices — subscribes to `services` collection and picks
//     the cheapest `priceForDuration(svc, 60)` across the therapist's
//     `servicesAvailable`. Falls back to static services.ts when Firestore
//     hasn't loaded yet (first paint).
//   • Live status — Available (●Now green) / Bookable (in-session) /
//     Resting (next time HH:MM in coral)
//
// Realtime listeners (3 per card — down from 5 in v5):
//   1. therapists/{id}                  — profile sync
//   2. bookings WHERE therapistId=…     — reviews + active session + next
//   3. services collection (live prices)
//
// 🆕 Round 26b (founder 2026-05-02) — Privacy mask removed. Photos now
// show in every state (available / bookable / resting). Status is still
// communicated via the footer pill (●NOW / HH:MM / RESTING) and the
// resting saturation filter — but the in-session lock + cream gradient
// is gone per founder direction.

import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Typography,
  Stack,
  Dialog,
  IconButton,
} from "@mui/material";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import StarRoundedIcon from "@mui/icons-material/StarRounded";
import VerifiedRoundedIcon from "@mui/icons-material/VerifiedRounded";
// 🆕 Round 28ax — replace emoji 📍 / 📷 with MUI icons (founder rule).
import LocationOnRoundedIcon from "@mui/icons-material/LocationOnRounded";
import PhotoLibraryRoundedIcon from "@mui/icons-material/PhotoLibraryRounded";
import NearMeRoundedIcon from "@mui/icons-material/NearMeRounded";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  collection,
  doc,
  onSnapshot,
  query,
  where,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

import type { Therapist, Avail } from "@/types/therapist";
import { calculateTherapistStatus } from "@/utils/calculateTherapistStatus";
import { enhanceImage } from "@/utils/cloudinary";
import { haversineKm } from "@/utils/taxiFare";
import {
  priceForDuration,
  formatTHB,
} from "@/utils/servicePricing";
import staticServices from "@/data/services";
import type { MassageService } from "@/data/services";
import { brand, fonts } from "@/theme";
import type { LiveLocation } from "@/hooks/useUserLocation";

/** ---------------- Utility ---------------- */

interface BookingDoc {
  startAt?: Timestamp | Date | string | null;
  endAt?: Timestamp | Date | string | null;
  start?: Timestamp | Date | string | null;
  end?: Timestamp | Date | string | null;
  status?: string;
  reviewText?: string;
}

function toDateSafe(v: unknown): Date | null {
  try {
    if (!v) return null;
    if (
      typeof v === "object" &&
      v !== null &&
      "toDate" in v &&
      typeof (v as { toDate?: unknown }).toDate === "function"
    ) {
      return (v as { toDate: () => Date }).toDate();
    }
    if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
    if (typeof v === "string" || typeof v === "number") {
      const d = new Date(v);
      return isNaN(d.getTime()) ? null : d;
    }
    return null;
  } catch {
    return null;
  }
}

function fmtHHMM(d: Date | null): string | null {
  if (!d) return null;
  return `${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes()
  ).padStart(2, "0")}`;
}

function nowThai(): Date {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utc + 7 * 3600 * 1000);
}

/** Parse "Thai, English, Mandarin" → ["TH", "EN", "中"] (max 3, deduped). */
function parseLanguagePills(raw: string | undefined): string[] {
  if (!raw) return [];
  const map: Record<string, string> = {
    english: "EN", en: "EN", eng: "EN",
    thai: "TH", th: "TH",
    chinese: "中", mandarin: "中", cantonese: "中", zh: "中",
    "中文": "中", "中": "中", "汉语": "中",
    japanese: "日", ja: "日", jp: "日",
    "日本語": "日", "日": "日",
    korean: "한", ko: "한", kr: "한",
    "한국어": "한", "한": "한",
    french: "FR", fr: "FR",
    german: "DE", de: "DE",
    spanish: "ES", es: "ES",
    russian: "RU", ru: "RU",
  };
  const tokens = raw
    .split(/[,/\s•·|]+/)
    .map((w) => w.trim())
    .filter(Boolean);
  const out: string[] = [];
  for (const t of tokens) {
    const k = t.toLowerCase();
    const code = map[k] ?? map[t] ?? t.slice(0, 2).toUpperCase();
    if (!out.includes(code)) out.push(code);
    if (out.length === 3) break;
  }
  return out;
}

/** Round 28az — stable per-id warm gradient for the no-photo placeholder.
 *  Same hash logic as TherapistDetailPage so a therapist's fallback bg
 *  reads identical across screens. Six warm hues from the brand palette. */
function gradientForId(id: string): string {
  const hues = [
    ["#d4a574", "#8b6f47"],
    ["#e8c4a0", "#c89968"],
    ["#c89c7a", "#6b4a2f"],
    ["#f4d4b4", "#d4a574"],
    ["#d8b89c", "#a08060"],
    ["#e8d0b4", "#b89878"],
  ] as const;
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  const [a, b] = hues[h % hues.length];
  return `linear-gradient(135deg, ${a}, ${b})`;
}

/**
 * Compact spec chips — physical attributes from `features`.
 * 🆕 Round 26d (founder 2026-05-02): swapped from service-type tags
 * (THAI/OIL/AROMA) to personal stats. Customers care more about who
 * the therapist is than what the menu lists.
 *
 * Example output: ["165 CM", "SLIM", "8 YR"]
 */
function parseSpecChips(t: Therapist): string[] {
  const f = t.features ?? null;
  const chips: string[] = [];

  // Height — append "CM" if not already part of the value.
  if (f?.height) {
    const h = String(f.height).trim();
    if (h) {
      const upper = h.toUpperCase();
      chips.push(upper.includes("CM") ? upper : `${upper} CM`);
    }
  }

  // Body type — uppercase, single word
  if (f?.bodyType) {
    const b = String(f.bodyType).trim();
    if (b) chips.push(b.toUpperCase());
  }

  // Experience — fall back to numeric `experience` field
  const exp =
    typeof t.experience === "number" && t.experience > 0 ? t.experience : null;
  if (exp) chips.push(`${exp} YR`);

  return chips.slice(0, 3);
}

/** Build a price map keyed by service id from Firestore (live) → static fallback. */
function useLiveServices(): Map<string, MassageService> {
  const [live, setLive] = useState<MassageService[] | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "services"),
      (snap) => {
        const arr: MassageService[] = [];
        snap.forEach((d) => {
          const data = d.data() as Partial<MassageService> & { id?: string };
          if (typeof data.price === "number") {
            arr.push({
              id: data.id ?? d.id,
              name: data.name ?? d.id,
              desc: data.desc ?? "",
              price: data.price,
              duration: data.duration ?? 60,
              availableDurations: data.availableDurations,
              count: data.count ?? 0,
              image: data.image ?? "",
              detail: data.detail ?? "",
              benefit: data.benefit ?? [],
              badge: data.badge ?? "RECOMMEND",
            });
          }
        });
        setLive(arr.length > 0 ? arr : null);
      },
      // On error / permission denied, silently fall back to static.
      () => setLive(null)
    );
    return () => unsub();
  }, []);

  return useMemo(() => {
    const m = new Map<string, MassageService>();
    const source = live ?? staticServices;
    for (const s of source) m.set(s.id, s);
    return m;
  }, [live]);
}

/** Cheapest 60-min price across the therapist's available services. */
function startingPriceForTherapist(
  t: Therapist,
  servicesById: Map<string, MassageService>
): number | null {
  const ids = ((t.servicesAvailable ?? t.services ?? []) as string[]) || [];
  let min: number | null = null;
  for (const id of ids) {
    const svc = servicesById.get(id);
    if (!svc) continue;
    const p = priceForDuration(svc, 60);
    if (min == null || p < min) min = p;
  }
  return min;
}

/** ---------------- Component ---------------- */
export interface TherapistProfileCardProps {
  therapist: Therapist;
  /** LCP hint — eager-load for above-fold cards. */
  priority?: boolean;
  /**
   * Customer's live position. When provided, the card recomputes distance
   * locally on every position update via Haversine. Falls back to
   * `therapist.distanceKm` (server-/parent-computed) when omitted.
   */
  userLocation?: LiveLocation | null;
  /**
   * Optional pre-fetched services map (id → service). Pass from a parent
   * subscription to avoid N Firestore listeners on a long list. When
   * omitted, the card subscribes itself.
   */
  services?: Map<string, MassageService>;
  /**
   * Round 28aw — when set, the "📍 Allow location" prompt becomes
   * clickable and calls this handler to trigger the browser's geo
   * permission popup. Parent owns the GPS state.
   */
  onRequestLocation?: () => void;
}

const TherapistProfileCard: React.FC<TherapistProfileCardProps> = ({
  therapist,
  priority = false,
  userLocation = null,
  services: externalServices,
  onRequestLocation,
}) => {
  const navigate = useNavigate();

  const [profile, setProfile] = useState<Therapist>(therapist);
  const [reviewCount, setReviewCount] = useState<number>(
    Number(therapist.reviews) || 0
  );
  // Round 28aw — track sum of real review ratings so we can Bayesian-
  // adjust the displayed star rating (instead of the seed 0 from data).
  const [reviewRatingSum, setReviewRatingSum] = useState<number>(0);
  const [bookingNext, setBookingNext] = useState<string | null>(null);
  const [activeNow, setActiveNow] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  // Round 28az — track image-load failure separately so we can swap
  // in an initial-letter placeholder instead of the browser's broken
  // image icon (e.g., for therapists whose photo folder is empty).
  const [imgError, setImgError] = useState(false);
  // Round 28av — V1-style gallery viewer triggered from the spec-chips
  // strip. Lets customers preview all profile photos without leaving
  // the listing.
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);

  // ── Live services (Firestore w/ static fallback) ─────────────────────
  const internalServices = useLiveServices();
  const servicesById = externalServices ?? internalServices;

  // ── 1. Realtime profile ──────────────────────────────────────────────
  useEffect(() => {
    if (!therapist.id) return;
    const ref = doc(db, "therapists", therapist.id);
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        setProfile((prev) => ({
          ...prev,
          ...(snap.data() as Partial<Therapist>),
          id: therapist.id,
        }));
      }
    });
    return () => unsub();
  }, [therapist.id]);

  // ── 2. Bookings sweep — reviews + active session + next available ────
  // Single subscription handles all three signals to avoid 3× listeners.
  useEffect(() => {
    if (!therapist.id) return;
    // Round 28aw — drop orderBy("startAt") — required composite index
    // (therapistId + startAt) doesn't exist in firestore.indexes.json,
    // so Firestore silently failed the query. We iterate ALL results
    // anyway and pick the earliest active/future client-side, so the
    // server-side sort wasn't needed.
    const q = query(
      collection(db, "bookings"),
      where("therapistId", "==", therapist.id)
    );
    const unsub = onSnapshot(q, (snap) => {
      const now = nowThai();
      let reviews = 0;
      let ratingSum = 0;
      let inSession = false;
      let nextEnd: Date | null = null;
      let nextStart: Date | null = null;

      snap.forEach((d) => {
        const data = d.data() as BookingDoc & { rating?: number };
        const status = (data.status ?? "").toLowerCase();
        const start = toDateSafe(data.startAt ?? data.start);
        const end = toDateSafe(data.endAt ?? data.end);

        // Reviews — count completed/done bookings with reviewText
        if (
          (status === "completed" || status === "done") &&
          typeof data.reviewText === "string" &&
          data.reviewText.trim().length > 0
        ) {
          reviews++;
          // Round 28aw — accumulate real rating values for Bayesian
          //   adjustment. Default missing rating to 5 (matches our
          //   review hook + ReviewListPage convention).
          ratingSum += typeof data.rating === "number" ? data.rating : 5;
        }

        // Active session detection — only "live" statuses count
        if (
          ["confirmed", "paid", "completed"].includes(status) &&
          start &&
          end &&
          now >= start &&
          now < end
        ) {
          inSession = true;
          if (!nextEnd || end < nextEnd) nextEnd = end;
        }

        // Future booking — track earliest upcoming start
        if (start && start > now && (!nextStart || start < nextStart)) {
          nextStart = start;
        }
      });

      setReviewCount(reviews);
      setReviewRatingSum(ratingSum);
      setActiveNow(inSession);
      setBookingNext(
        inSession ? fmtHHMM(nextEnd) : nextStart ? fmtHHMM(nextStart) : null
      );
    });
    return () => unsub();
  }, [therapist.id]);

  // ── Status engine — clamp to known Avail union (defensive) ───────────
  const engineResult = useMemo(
    () => calculateTherapistStatus(profile),
    [profile]
  );
  const finalStatus: Avail = useMemo(() => {
    const s = engineResult.status;
    return s === "available" || s === "bookable" || s === "resting"
      ? s
      : "resting";
  }, [engineResult.status]);
  const displayStatus: Avail = activeNow ? "bookable" : finalStatus;
  const isAvailable = displayStatus === "available";

  // Pick the time to display in the footer status pill
  const finalNext =
    bookingNext && displayStatus !== "available"
      ? bookingNext
      : engineResult.nextAvailable ?? null;

  // ── Live distance (Haversine from userLocation → therapist) ──────────
  const liveDistanceKm = useMemo<number | null>(() => {
    if (!userLocation) {
      return typeof therapist.distanceKm === "number"
        ? therapist.distanceKm
        : null;
    }
    const target =
      profile.currentLocation ??
      profile.homeLocation ??
      (typeof profile.lat === "number" && typeof profile.lng === "number"
        ? { lat: profile.lat, lng: profile.lng }
        : null);
    if (!target) return null;
    return haversineKm(userLocation.lat, userLocation.lng, target.lat, target.lng);
  }, [
    userLocation,
    profile.currentLocation,
    profile.homeLocation,
    profile.lat,
    profile.lng,
    therapist.distanceKm,
  ]);

  // ── Derived display values ───────────────────────────────────────────
  // Round 28aw — Bayesian-adjusted rating from REAL reviews:
  //   • 0 reviews → use seed (data.rating, currently 0 across the catalog)
  //   • 1+ reviews → (PRIOR_MEAN × PRIOR_WEIGHT + sum) / (PRIOR_WEIGHT + count)
  //                  matches the formula used in StatsCard / ReviewsTab so
  //                  every surface shows the SAME rating number.
  const ratingNum = useMemo(() => {
    const seed = Number(profile.rating) || 0;
    if (reviewCount === 0) return seed.toFixed(1);
    const PRIOR_MEAN = 4.5;
    const PRIOR_WEIGHT = 10;
    const adjusted =
      (PRIOR_MEAN * PRIOR_WEIGHT + reviewRatingSum) /
      (PRIOR_WEIGHT + reviewCount);
    return adjusted.toFixed(1);
  }, [profile.rating, reviewCount, reviewRatingSum]);
  const languages = useMemo(
    () => parseLanguagePills(profile.features?.language),
    [profile.features]
  );
  const specChips = useMemo(() => parseSpecChips(profile), [profile]);
  const age = profile.features?.age?.toString().trim() || null;
  const fromPrice = useMemo(
    () => startingPriceForTherapist(profile, servicesById),
    [profile, servicesById]
  );

  const resolvedImage = useMemo(() => {
    const img = profile.image || "placeholder.jpg";
    return img.startsWith("http") || img.startsWith("/")
      ? img
      : `/images/${img}`;
  }, [profile.image]);

  // Reduced-motion guard
  const prefersReducedMotion =
    typeof window !== "undefined" && window.matchMedia
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false;

  // ARIA
  const titleId = `sr-tcard-${therapist.id}-title`;
  const statusId = `sr-tcard-${therapist.id}-status`;
  const ariaStatusLabel = isAvailable
    ? `${profile.name} is available now. Book a session.`
    : displayStatus === "bookable"
    ? `${profile.name} is currently in session.`
    : finalNext
    ? `${profile.name} is resting. Next available at ${finalNext}.`
    : `${profile.name} is resting.`;

  /** ---------------- UI ---------------- */
  return (
    <>
      <Box
        component={motion.article}
        initial={prefersReducedMotion ? false : { opacity: 0, y: 14, scale: 0.98 }}
        animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0, scale: 1 }}
        whileHover={prefersReducedMotion ? undefined : { y: -4 }}
        whileTap={prefersReducedMotion ? undefined : { scale: 0.985 }}
        transition={{ type: "spring", stiffness: 200, damping: 18 }}
        onClick={() => void navigate(`/therapists/${profile.id}`)}
        role="button"
        tabIndex={0}
        aria-labelledby={titleId}
        aria-describedby={statusId}
        onKeyDown={(e: React.KeyboardEvent) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            void navigate(`/therapists/${profile.id}`);
          }
        }}
        sx={{
          position: "relative",
          width: "100%",
          // 🆕 Round 28b1 (Step B) — competitor-inspired crispness:
          //   pure white card on cool-neutral bg makes photos pop.
          //   Cool neutral border (was warm coral tint) + softer
          //   larger-blur shadow so the card "lifts" instead of
          //   anchoring with a heavy red drop-shadow.
          background: "#FFFFFF",
          borderRadius: "18px",
          overflow: "hidden",
          cursor: "pointer",
          border: "1px solid rgba(15, 23, 42, 0.06)",
          boxShadow:
            "0 1px 2px rgba(15, 23, 42, 0.04), 0 8px 28px rgba(15, 23, 42, 0.06)",
          transition: "box-shadow 0.25s ease, transform 0.25s ease",
          "&:hover": {
            boxShadow:
              "0 2px 4px rgba(15, 23, 42, 0.05), 0 16px 40px rgba(254, 9, 68, 0.10)",
            transform: "translateY(-1px)",
          },
          "&:focus-visible": {
            outline: `2px solid ${brand.red}`,
            outlineOffset: 2,
          },
        }}
      >
        {/* ===== Photo (3:4) — always shown, no privacy mask ===== */}
        <Box sx={{ position: "relative", aspectRatio: "3 / 4", overflow: "hidden" }}>
          {/* Skeleton shimmer until image decodes */}
          {!imgLoaded && (
            <Box
              aria-hidden="true"
              sx={{
                position: "absolute",
                inset: 0,
                background: `linear-gradient(135deg, ${brand.bg2} 0%, ${brand.cream} 50%, ${brand.bg2} 100%)`,
                backgroundSize: "200% 200%",
                animation: prefersReducedMotion
                  ? "none"
                  : "tprofile-skeleton 1.4s ease-in-out infinite",
                "@keyframes tprofile-skeleton": {
                  "0%": { backgroundPosition: "0% 50%" },
                  "50%": { backgroundPosition: "100% 50%" },
                  "100%": { backgroundPosition: "0% 50%" },
                },
              }}
            />
          )}
          {imgError ? (
            // Round 28az — initial-letter placeholder when image fails
            //   to load. Pleasant gradient + first letter of name in
            //   serif. Avoids broken-image icon embarrassment.
            <Box
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation();
              }}
              sx={{
                width: "100%",
                height: "100%",
                background: gradientForId(profile.id),
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: fonts.heading,
                fontSize: 64,
                fontWeight: 600,
                fontStyle: "italic",
                color: "rgba(255,255,255,0.85)",
                textShadow: "0 2px 8px rgba(0,0,0,0.25)",
                letterSpacing: "-0.02em",
              }}
            >
              {profile.name.charAt(0).toUpperCase()}
            </Box>
          ) : (
            <Box
              component="img"
              src={enhanceImage(resolvedImage, { variant: "card" })}
              alt={`Photo of ${profile.name}, SunRed therapist`}
              loading={priority ? "eager" : "lazy"}
              {...(priority ? { fetchpriority: "high" as const } : {})}
              decoding="async"
              onLoad={() => setImgLoaded(true)}
              onError={() => {
                setImgLoaded(true);
                setImgError(true);
              }}
              onClick={(e: React.MouseEvent) => {
                // Photo tap → open preview, don't navigate
                e.stopPropagation();
                setPreviewOpen(true);
              }}
              sx={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
                // 🆕 Round 28b3 — resting blur/saturate filter removed.
                //   Founder feedback: photos should always look their
                //   best. Status is communicated via the colored
                //   pill (Avail Now / coral In session / gray Avail
                //   HH:MM), no need to dim the photo too.
                transition: "opacity 0.3s ease",
                opacity: imgLoaded ? 1 : 0,
              }}
            />
          )}

          {/* Bottom gradient scrim — frames name overlay */}
          <Box
            aria-hidden="true"
            sx={{
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
              background:
                "linear-gradient(180deg, rgba(0,0,0,0) 50%, rgba(0,0,0,0.55) 100%)",
            }}
          />

          {/* 🆕 Round 26d — Online dot moved from top-left → next to
              the rating in the bottom overlay (see below). Top-left
              corner now stays clean. */}

          {/* 🆕 Round 28b2 (founder 2026-05-03) — Avail pill moved
              from photo TOP-LEFT to the footer row, next to the
              price. Frees the photo to be photo-only and keeps
              the price + status info anchored together where the
              eye lands when deciding "book or scroll on". */}

          {/* TOP-RIGHT — language pills + verified badge */}
          <Stack
            direction="row"
            spacing={0.5}
            sx={{
              position: "absolute",
              top: 8,
              right: 8,
              alignItems: "center",
              zIndex: 3,
            }}
          >
            {languages.map((lang) => (
              <Box
                key={lang}
                sx={{
                  px: 0.75,
                  py: 0.25,
                  background: "rgba(0, 0, 0, 0.55)",
                  backdropFilter: "blur(8px)",
                  WebkitBackdropFilter: "blur(8px)",
                  color: "#fff",
                  fontFamily: fonts.body,
                  fontSize: 9,
                  fontWeight: 700,
                  borderRadius: "5px",
                  letterSpacing: "0.04em",
                  minWidth: 22,
                  textAlign: "center",
                }}
              >
                {lang}
              </Box>
            ))}
            {/* 🆕 Round 28b3 (founder 2026-05-03) — Verified badge:
                white-circle frame removed, just the Twitter-blue
                checkmark on its own. Drop-shadow gives separation
                from the photo without the heavy circle background. */}
            <VerifiedRoundedIcon
              aria-label="verified"
              titleAccess="Verified by SunRed"
              sx={{
                fontSize: 22,
                color: "#1d9bf0",
                filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.35))",
              }}
            />
          </Stack>

          {/* BOTTOM overlay — name + age + rating + distance */}
          <Box
            sx={{
              position: "absolute",
              left: 10,
              right: 10,
              bottom: 8,
              color: "#fff",
              zIndex: 2,
            }}
          >
            <Typography
              id={titleId}
              sx={{
                fontFamily: fonts.heading,
                fontWeight: 500,
                fontSize: 15,
                letterSpacing: "-0.01em",
                lineHeight: 1.1,
                textShadow: "0 2px 8px rgba(0,0,0,0.5)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {profile.name}
              {age && (
                <Box
                  component="span"
                  sx={{ fontWeight: 400, opacity: 0.85, ml: 0.6 }}
                >
                  {age}
                </Box>
              )}
            </Typography>
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              sx={{ mt: 0.4 }}
            >
              <Stack direction="row" alignItems="center" spacing={0.4}>
                <StarRoundedIcon sx={{ fontSize: 12, color: "#FBBF24" }} />
                <Typography
                  sx={{
                    fontFamily: fonts.body,
                    fontSize: 10,
                    fontWeight: 600,
                    textShadow: "0 1px 4px rgba(0,0,0,0.6)",
                  }}
                >
                  {ratingNum}
                  <Box component="span" sx={{ opacity: 0.85, ml: 0.4 }}>
                    ({reviewCount})
                  </Box>
                </Typography>
                {/* 🆕 Round 26e — Online dot removed entirely per founder
                    direction. Available status is communicated via the
                    footer pill (●NOW + green tint). */}
              </Stack>
              {/* Round 28aw — clickable "Allow location" prompt. When
                  GPS resolved → render plain text ("X.X km"). When not,
                  render a button that invokes the parent's geolocation
                  request, triggering the browser permission popup. */}
              {liveDistanceKm != null ? (
                <Box
                  sx={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "3px",
                    fontFamily: fonts.body,
                    fontSize: 10,
                    fontWeight: 600,
                    color: "#fff",
                    opacity: 0.92,
                    textShadow: "0 1px 4px rgba(0,0,0,0.6)",
                  }}
                >
                  <LocationOnRoundedIcon sx={{ fontSize: 11 }} />
                  {liveDistanceKm.toFixed(1)} km
                </Box>
              ) : (
                <Box
                  role={onRequestLocation ? "button" : undefined}
                  onClick={(e) => {
                    if (!onRequestLocation) return;
                    e.stopPropagation();
                    onRequestLocation();
                  }}
                  sx={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "3px",
                    fontFamily: fonts.body,
                    fontSize: 10,
                    fontWeight: 600,
                    color: "#fff",
                    opacity: 0.85,
                    textShadow: "0 1px 4px rgba(0,0,0,0.6)",
                    cursor: onRequestLocation ? "pointer" : "default",
                    textDecoration: onRequestLocation ? "underline" : "none",
                    textUnderlineOffset: "2px",
                    "&:hover": onRequestLocation ? { opacity: 1 } : undefined,
                  }}
                >
                  <NearMeRoundedIcon sx={{ fontSize: 11 }} />
                  Allow location
                </Box>
              )}
            </Stack>
          </Box>
        </Box>

        {/* ===== Footer info ===== */}
        <Box sx={{ p: "8px 10px 10px" }}>
         
          {(specChips.length > 0 || (profile.gallery?.length ?? 0) > 0) && (
            <Stack
              direction="row"
              spacing={0.4}
              flexWrap="wrap"
              useFlexGap
              sx={{ mb: 0.75 }}
            >
              {specChips.map((s) => (
                <Box
                  key={s}
                  sx={{
                    px: 0.75,
                    py: 0.25,
                    background: "rgba(254, 122, 82, 0.1)",
                    color: brand.coral,
                    borderRadius: "5px",
                    fontFamily: fonts.body,
                    fontSize: 9,
                    fontWeight: 700,
                    letterSpacing: "0.02em",
                  }}
                >
                  {s}
                </Box>
              ))}

              {/* Round 28av — Gallery chip (V1 style). Tap to open the
                  photo viewer dialog. Only shows when there are extra
                  gallery photos beyond the cover. */}
              {(profile.gallery?.length ?? 0) > 0 && (
                <Box
                  role="button"
                  aria-label={`View ${profile.gallery?.length ?? 0} photos of ${profile.name}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setGalleryIndex(0);
                    setGalleryOpen(true);
                  }}
                  sx={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "3px",
                    px: 0.75,
                    py: 0.25,
                    background: brand.coral,
                    color: "#fff",
                    borderRadius: "5px",
                    fontFamily: fonts.body,
                    fontSize: 9,
                    fontWeight: 700,
                    letterSpacing: "0.02em",
                    cursor: "pointer",
                    transition: "transform 0.12s ease, opacity 0.12s ease",
                    "&:hover": { transform: "translateY(-1px)", opacity: 0.92 },
                    "&:active": { transform: "scale(0.97)" },
                  }}
                >
                  <PhotoLibraryRoundedIcon sx={{ fontSize: 11 }} />
                  GALLERY ({profile.gallery?.length ?? 0})
                </Box>
              )}
            </Stack>
          )}

          {/* 🆕 Round 28b2 (founder 2026-05-03) — price LEFT, Avail
              pill RIGHT. State matrix:
                • available           → green   "● Avail Now"  (white pulse dot)
                • bookable + time     → coral   "Avail HH:MM"
                • bookable + no time  → coral   "In session"
                • resting   + time    → gray    "Avail HH:MM"
                • resting   + no time → not rendered (avoid clutter) */}
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            spacing={1}
            id={statusId}
            role="status"
            aria-live="polite"
            aria-label={ariaStatusLabel}
          >
            <Box sx={{ minWidth: 0 }}>
              {fromPrice != null ? (
                <Typography
                  sx={{
                    fontFamily: fonts.heading,
                    fontWeight: 600,
                    fontSize: 13,
                    color: brand.red,
                    letterSpacing: "-0.02em",
                    lineHeight: 1,
                  }}
                >
                  {formatTHB(fromPrice)}
                  <Box
                    component="span"
                    sx={{
                      fontFamily: fonts.body,
                      fontWeight: 500,
                      fontSize: 9,
                      color: brand.textMuted,
                      ml: 0.25,
                    }}
                  >
                    /60min
                  </Box>
                </Typography>
              ) : (
                <Typography
                  sx={{
                    fontFamily: fonts.body,
                    fontSize: 10,
                    color: brand.textMuted,
                    fontStyle: "italic",
                  }}
                >
                  Pricing on request
                </Typography>
              )}
            </Box>

            {/* Avail pill — color by state, hidden when no info to show */}
            {isAvailable ? (
              <Box
                aria-hidden="true"
                sx={{
                  flexShrink: 0,
                  px: 1,
                  py: 0.4,
                  background:"#10B981",
                  color: "#fff",
                  fontFamily: fonts.body,
                  fontSize: 10.5,
                  fontWeight: 700,
                  letterSpacing: "0.02em",
                  borderRadius: "999px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 0.5,
                  boxShadow:
                    "0 2px 8px rgba(22, 163, 74, 0.30), 0 1px 2px rgba(0,0,0,0.08)",
                  "&::before": {
                    content: '""',
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: "#fff",
                    boxShadow: "0 0 6px rgba(255,255,255,0.85)",
                    animation: prefersReducedMotion
                      ? "none"
                      : "tcard-avail-pulse 1.6s ease-in-out infinite",
                    "@keyframes tcard-avail-pulse": {
                      "0%, 100%": { opacity: 1 },
                      "50%": { opacity: 0.45 },
                    },
                  },
                }}
              >
                {/* 🆕 Round 28b9 — when free now but a session
                    is on the schedule, append "→ HH:mm" hint so the
                    card mirrors the time picker's TAKEN slots. */}
                {bookingNext ? `Avail · → ${bookingNext}` : "Avail Now"}
              </Box>
            ) : displayStatus === "bookable" ? (
              <Box
                aria-hidden="true"
                sx={{
                  flexShrink: 0,
                  px: 1,
                  py: 0.4,
                  background: brand.coral,
                  color: "#fff",
                  fontFamily: fonts.body,
                  fontSize: 10.5,
                  fontWeight: 700,
                  letterSpacing: "0.02em",
                  borderRadius: "999px",
                  boxShadow:
                    "0 2px 8px rgba(254, 122, 82, 0.30), 0 1px 2px rgba(0,0,0,0.08)",
                }}
              >
                {finalNext ? `Avail ${finalNext}` : "In session"}
              </Box>
            ) : finalNext ? (
              <Box
                aria-hidden="true"
                sx={{
                  flexShrink: 0,
                  px: 1,
                  py: 0.4,
                  background: "rgba(15, 23, 42, 0.10)",
                  color: "rgba(15, 23, 42, 0.72)",
                  fontFamily: fonts.body,
                  fontSize: 10.5,
                  fontWeight: 700,
                  letterSpacing: "0.02em",
                  borderRadius: "999px",
                  border: "1px solid rgba(15, 23, 42, 0.08)",
                }}
              >
                Avail {finalNext}
              </Box>
            ) : null}
          </Stack>
        </Box>
      </Box>

      {/* ===== Photo Preview Dialog ===== */}
      <Dialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        PaperProps={{
          sx: {
            background: "transparent",
            boxShadow: "none",
            margin: 2,
          },
        }}
      >
        <Box sx={{ position: "relative" }}>
          <IconButton
            aria-label="close preview"
            onClick={() => setPreviewOpen(false)}
            sx={{
              position: "absolute",
              top: 8,
              right: 8,
              background: "rgba(0,0,0,0.55)",
              color: "#fff",
              "&:hover": { background: "rgba(0,0,0,0.75)" },
            }}
            size="small"
          >
            <CloseRoundedIcon />
          </IconButton>
          <Box
            component="img"
            src={enhanceImage(resolvedImage, { variant: "hero" })}
            alt={profile.name}
            sx={{
              display: "block",
              width: "100%",
              maxWidth: 480,
              maxHeight: "85vh",
              objectFit: "cover",
              borderRadius: "16px",
              boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
            }}
          />
        </Box>
      </Dialog>

      {/* ===== Round 28av — Gallery Viewer Dialog (V1 style) ===== */}
      <Dialog
        open={galleryOpen}
        onClose={() => setGalleryOpen(false)}
        fullScreen
        PaperProps={{
          sx: {
            background: "rgba(0, 0, 0, 0.95)",
            margin: 0,
          },
        }}
      >
        <Box
          sx={{
            position: "relative",
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Header — close + counter */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "calc(env(safe-area-inset-top, 0px) + 12px) 16px 12px",
              color: "#fff",
            }}
          >
            <Box>
              <Typography
                sx={{
                  fontFamily: fonts.heading,
                  fontSize: 16,
                  fontWeight: 600,
                  lineHeight: 1.1,
                }}
              >
                {profile.name}
              </Typography>
              <Typography
                sx={{
                  fontFamily: fonts.body,
                  fontSize: 11,
                  opacity: 0.7,
                }}
              >
                {galleryIndex + 1} / {profile.gallery?.length ?? 0}
              </Typography>
            </Box>
            <IconButton
              aria-label="close gallery"
              onClick={() => setGalleryOpen(false)}
              sx={{
                background: "rgba(255,255,255,0.12)",
                color: "#fff",
                "&:hover": { background: "rgba(255,255,255,0.2)" },
              }}
              size="small"
            >
              <CloseRoundedIcon />
            </IconButton>
          </Box>

          {/* Main photo */}
          <Box
            sx={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "8px 16px",
              minHeight: 0,
              position: "relative",
            }}
          >
            {profile.gallery && profile.gallery.length > 0 && (
              <>
                <Box
                  component="img"
                  src={enhanceImage(profile.gallery[galleryIndex], {
                    variant: "hero",
                  })}
                  alt={`${profile.name} photo ${galleryIndex + 1}`}
                  sx={{
                    maxWidth: "100%",
                    maxHeight: "100%",
                    objectFit: "contain",
                    borderRadius: "12px",
                    boxShadow: "0 12px 36px rgba(0,0,0,0.5)",
                  }}
                />

                {/* 🆕 Round 28b3 — Prev/Next ‹ › buttons removed.
                    Founder feedback: thumbnail strip below is enough
                    navigation, the floating arrows added clutter and
                    overlapped the photo. */}
              </>
            )}
          </Box>

          {/* Thumbnail strip */}
          {profile.gallery && profile.gallery.length > 1 && (
            <Box
              sx={{
                display: "flex",
                gap: "6px",
                padding:
                  "10px 16px calc(env(safe-area-inset-bottom, 0px) + 14px)",
                overflowX: "auto",
                "&::-webkit-scrollbar": { display: "none" },
                scrollbarWidth: "none",
              }}
            >
              {profile.gallery.map((src, i) => (
                <Box
                  key={`${src}-${i}`}
                  role="button"
                  aria-label={`Photo ${i + 1}`}
                  onClick={() => setGalleryIndex(i)}
                  sx={{
                    flexShrink: 0,
                    width: 56,
                    height: 56,
                    borderRadius: "8px",
                    overflow: "hidden",
                    cursor: "pointer",
                    border:
                      i === galleryIndex
                        ? `2px solid ${brand.coral}`
                        : "2px solid transparent",
                    opacity: i === galleryIndex ? 1 : 0.55,
                    transition: "opacity 0.15s ease, border-color 0.15s ease",
                    "&:hover": { opacity: 0.9 },
                  }}
                >
                  <Box
                    component="img"
                    src={enhanceImage(src, { variant: "card" })}
                    alt=""
                    sx={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      display: "block",
                    }}
                  />
                </Box>
              ))}
            </Box>
          )}
        </Box>
      </Dialog>
    </>
  );
};

export default TherapistProfileCard;
