

import React, { useEffect, useMemo, useState } from "react";
import { Box, Typography, CircularProgress } from "@mui/material";
import { collection, onSnapshot } from "firebase/firestore";

import { db } from "@/lib/firebase";
import type { Therapist as TherapistType, Avail } from "@/types/therapist";
import { calculateTherapistStatus } from "@/utils/calculateTherapistStatus";
import { getBadgeForTherapist } from "@/utils/getTherapistBadge";
import { haversineKm } from "@/utils/taxiFare";

import TherapistProfileCard from "@/components/TherapistProfileCard";
import TherapistSearchBar from "@/components/TherapistSearchBar";
import HomeMapBrowse from "@/components/home/HomeMapBrowse";
import { matchesQuery } from "@/utils/therapistSearch";
import { useUserLocation } from "@/hooks/useUserLocation";
import NearMeRoundedIcon from "@mui/icons-material/NearMeRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import { priceForDuration } from "@/utils/servicePricing";
import staticServices from "@/data/services";
import { brand, fonts, glass, gradients } from "@/theme";
import type { MassageService } from "@/data/services";
// 🆕 Round 28r4 — same time-aware mode the Hero uses, so the grid
//   header phrase ("On standby · Bangkok Tonight" / "Concierge resumes
//   09:00") never disagrees with the Live pill above it.
import { useConciergeMode } from "@/utils/conciergeMode";
// 🆕 Round 28r16 — initial roster filter is mode-aware: prime hours
//   default to "available_now" so late-night guests see actionable
//   cards first.
import { nowBKK } from "@/utils/time";

const SERIF = '"Fraunces", Georgia, "Times New Roman", serif';
const SANS = '"Inter", system-ui, -apple-system, sans-serif';

interface Therapist extends TherapistType {
  computedStatus?: Avail;
  computedNext?: string | null;
}

// 🆕 Round 28r4 (founder 2026-05-06) — Bangkok area chips for the
//   home-page "browse by neighbourhood" strip.
//
// 🆕 Round 28r17 (founder 2026-05-07) — Each chip now matches its
//   own neighbourhood AND nearby districts. The pre-r17 behaviour
//   was strict substring match against `area` field — clicking
//   "Silom" only matched a single therapist whose home address
//   literally contained "Silom". Travel-time-wise an Asok therapist
//   and a Bangrak therapist both serve a Silom guest comfortably,
//   so we expand each chip to cover walking-or-short-taxi neighbours.
//
//   `match[]` holds substrings — therapist passes the filter if its
//   `area` or `homeAddress` contains ANY of them (case-insensitive).
const BANGKOK_AREAS: {
  label: string;
  /** Substrings that count as "in this zone" — the chip's own name
   *  is always included; the rest are nearby districts. */
  match: string[];
}[] = [
  {
    label: "Sukhumvit",
    match: [
      "Sukhumvit",
      "Asok",
      "Phrom Phong",
      "Phloen Chit",
      "Nana",
      "Thonglor",
      "Ekkamai",
      "Ploenchit",
    ],
  },
  {
    label: "Asok",
    match: ["Asok", "Sukhumvit", "Phrom Phong", "Nana", "Phetchaburi"],
  },
  {
    label: "Thonglor",
    match: ["Thonglor", "Ekkamai", "Phrom Phong", "Sukhumvit"],
  },
  {
    label: "Silom",
    match: [
      "Silom",
      "Sathorn",
      "Bangrak",
      "Surasak",
      "Saladaeng",
      "Chong Nonsi",
    ],
  },
  {
    label: "Sathorn",
    match: ["Sathorn", "Silom", "Lumpini", "Chong Nonsi", "Surasak"],
  },
  {
    label: "Riverside",
    match: [
      "Riverside",
      "Bangrak",
      "Sathorn",
      "Charoen Krung",
      "Saphan Taksin",
      "Klongsan",
    ],
  },
];

const HomeTherapistGrid: React.FC = () => {
  const [therapists, setTherapists] = useState<Therapist[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQ, setSearchQ] = useState("");
  // 🆕 Round 28r4 — current concierge mode for the grid header phrase.
  const concierge = useConciergeMode();

  // ── Single GPS watcher — feeds every card with a fresh userLocation.
  //    🆕 Round 28b14 — autoStart removed. Modern browsers silently block
  //    geolocation requests not tied to a user gesture (Chrome 122+ esp.
  //    on first-party-set sites). We render an explicit in-app banner
  //    below; tapping its CTA calls request() in a user gesture context
  //    so the native permission popup reliably fires.
  //    🆕 Round 28b34 (founder 2026-05-04) — Auto-trigger on FIRST USER
  //    INTERACTION (scroll/touchstart/click ANYWHERE on the page).
  //    Browser-compliant (gesture context), but the customer never
  //    needs to find/tap an in-app "Allow location" link — they
  //    just glance at the page → scroll → native popup fires → grant
  //    → every card lights up with "6 min • 2.4 km" instantly.
  //    The Permissions API auto-resume in useUserLocation already
  //    handles repeat visitors who've previously granted.
  const {
    location: userLocation,
    request: requestLocation,
    status: locationStatus,
  } = useUserLocation({ autoStart: false });

  // 🆕 Round 28b34 — first-interaction auto-trigger.
  useEffect(() => {
    if (locationStatus === "ready" || locationStatus === "denied") return;
    if (typeof window === "undefined") return;
    let triggered = false;
    const onFirstInteraction = () => {
      if (triggered) return;
      triggered = true;
      requestLocation();
      window.removeEventListener("touchstart", onFirstInteraction);
      window.removeEventListener("click", onFirstInteraction);
      window.removeEventListener("scroll", onFirstInteraction);
      window.removeEventListener("keydown", onFirstInteraction);
    };
    // `passive: true` so the listener can't accidentally block scroll perf.
    window.addEventListener("touchstart", onFirstInteraction, { passive: true });
    window.addEventListener("click", onFirstInteraction, { passive: true });
    window.addEventListener("scroll", onFirstInteraction, { passive: true });
    window.addEventListener("keydown", onFirstInteraction);
    return () => {
      window.removeEventListener("touchstart", onFirstInteraction);
      window.removeEventListener("click", onFirstInteraction);
      window.removeEventListener("scroll", onFirstInteraction);
      window.removeEventListener("keydown", onFirstInteraction);
    };
  }, [locationStatus, requestLocation]);

  // ── Single `services` collection subscription — every card reads from
  //    the same Map. Falls back to static services when Firestore is empty
  //    (e.g., before admin has populated the collection).
  const [liveServices, setLiveServices] = useState<MassageService[] | null>(
    null
  );
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
        setLiveServices(arr.length > 0 ? arr : null);
      },
      () => setLiveServices(null)
    );
    return () => unsub();
  }, []);

  const servicesById = useMemo(() => {
    const m = new Map<string, MassageService>();
    const source = liveServices ?? staticServices;
    for (const s of source) m.set(s.id, s);
    return m;
  }, [liveServices]);

  // ── Therapists collection — live subscription with enrich (NO sort here)
  // 🆕 Round 26d — sort moved to a useMemo below so it can re-run when
  // userLocation changes (distance is part of the sort key).
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "therapists"), (snap) => {
      const raw: Therapist[] = [];
      snap.forEach((docSnap) => {
        const data = docSnap.data() as Therapist;
        raw.push({ ...data, id: data.id || docSnap.id });
      });

      const enriched = raw.map((t) => {
        const { status, nextAvailable } = calculateTherapistStatus(t);
        // Defensive: clamp engine output to known Avail union — admin
        // typo on statusOverride can leak a non-Avail string at runtime.
        /* eslint-disable @typescript-eslint/no-unnecessary-condition */
        const safeStatus: Avail =
          status === "available" || status === "bookable" || status === "resting" || status === "holiday"
            ? status
            : "resting";
        /* eslint-enable @typescript-eslint/no-unnecessary-condition */
        const badge = getBadgeForTherapist({
          totalBookings: t.totalBookings ?? 0,
          todayBookings: t.todayBookings ?? 0,
          badgeKey: t.badgeKey,
          badgeUpdatedAt: t.badgeUpdatedAt,
        });
        return {
          ...t,
          computedStatus: safeStatus,
          computedNext: nextAvailable ?? null,
          badgeKey: badge.key,
        };
      });

      setTherapists(enriched);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // ── Sort: status (available > bookable > resting), distance ASC, rating DESC.
  //    🆕 Round 26d (founder 2026-05-02): "พนักงานที่ใกล้ user และกำลัง
  //    available / bookable / resting ขึ้นก่อน". Status is the primary
  //    bucket; within each bucket, closer therapists rank higher; rating
  //    breaks ties when distance is unknown / equal.
  const sorted = useMemo(() => {
    const statusOrder: Record<Avail, number> = {
      available: 1,
      bookable: 2,
      resting: 3,
      holiday: 4,
    };

    const distanceFor = (t: Therapist): number => {
      // Prefer live Haversine from userLocation. Fall back to denormalized
      // distanceKm. Unknown → +Infinity so it sinks to the bottom of its
      // status bucket (rating still breaks the tie).
      if (userLocation) {
        const target =
          t.currentLocation ??
          t.homeLocation ??
          (typeof t.lat === "number" && typeof t.lng === "number"
            ? { lat: t.lat, lng: t.lng }
            : null);
        if (target) {
          return haversineKm(
            userLocation.lat,
            userLocation.lng,
            target.lat,
            target.lng
          );
        }
      }
      return typeof t.distanceKm === "number"
        ? t.distanceKm
        : Number.POSITIVE_INFINITY;
    };

    return [...therapists].sort((a, b) => {
      const stA = statusOrder[a.computedStatus ?? "resting"];
      const stB = statusOrder[b.computedStatus ?? "resting"];
      if (stA !== stB) return stA - stB;

      // NEW badge floats to the top within its status bucket.
      const newA = a.badgeKey === "NEW" ? 0 : 1;
      const newB = b.badgeKey === "NEW" ? 0 : 1;
      if (newA !== newB) return newA - newB;

      const dA = distanceFor(a);
      const dB = distanceFor(b);
      if (dA !== dB) return dA - dB;

      // Tie-breaker — higher rating wins. NaN-safe via `||`.
      // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
      return (Number(b.rating) || 0) - (Number(a.rating) || 0);
    });
  }, [therapists, userLocation]);

  // 🆕 Round 28r16 (founder 2026-05-07) — Tonight's roster filter.
  //   Direct response to FAQ pattern #1 ("Who's available now?" — 21%
  //   of inbound chat). Lets a guest opening the page at 23:00 jump
  //   straight to "show me ONLY who's free right now" instead of
  //   scrolling 12 cards and reading status pills.
  //
  //   Default behaviour:
  //     • Prime hours (22:00–04:00) → "available_now" pre-selected
  //       so the late-night guest sees actionable cards first.
  //     • Other hours → "all" pre-selected (browse mode).
  //
  //   Filters reset cleanly with "All".
  type RosterFilter = "all" | "available_now" | "express";
  const [rosterFilter, setRosterFilter] = useState<RosterFilter>(() => {
    const hour = nowBKK().hour();
    return hour >= 22 || hour < 4 ? "available_now" : "all";
  });

  // 🆕 Round 28r17 — Area chip filter is now its own state (separate
  //   from search input). Lets us match a chip to MULTIPLE neighbour
  //   substrings rather than feed one string to matchesQuery.
  const [activeAreaLabel, setActiveAreaLabel] = useState<string | null>(null);
  const activeArea = activeAreaLabel
    ? BANGKOK_AREAS.find((a) => a.label === activeAreaLabel) ?? null
    : null;

  // Helper — does therapist's area / homeAddress match ANY of the
  // chip's neighbour substrings? Returns true when no area is active.
  const matchesArea = (
    t: Therapist,
    matchList: string[] | null
  ): boolean => {
    if (!matchList || matchList.length === 0) return true;
    const hay = `${t.area ?? ""} ${t.homeAddress ?? ""}`.toLowerCase();
    return matchList.some((m) => hay.includes(m.toLowerCase()));
  };

  // ── Apply search filter (free-text) + area chip + roster filter.
  const visible = useMemo(() => {
    let pool = sorted.filter((t) => matchesQuery(t, searchQ));
    if (activeArea) {
      pool = pool.filter((t) => matchesArea(t, activeArea.match));
    }
    if (rosterFilter === "available_now") {
      pool = pool.filter((t) => t.computedStatus === "available");
    } else if (rosterFilter === "express") {
      // "Express" = available right now AND within ~5km of the guest
      //   (or no guest location → use distanceKm field if present).
      pool = pool.filter((t) => {
        if (t.computedStatus !== "available") return false;
        const km = typeof t.distanceKm === "number" ? t.distanceKm : null;
        return km != null ? km <= 5 : true;
      });
    }
    return pool;
  }, [sorted, searchQ, rosterFilter]);

  const availableNow = visible.filter(
    (t) => t.computedStatus === "available"
  ).length;
  // Total available regardless of filter — for chip badge counts.
  const totalAvailable = sorted.filter(
    (t) => t.computedStatus === "available"
  ).length;
  const totalExpress = sorted.filter((t) => {
    if (t.computedStatus !== "available") return false;
    const km = typeof t.distanceKm === "number" ? t.distanceKm : null;
    return km != null ? km <= 5 : true;
  }).length;

  // ── Starting-price-per-therapist map for the map preview card.
  //    Same logic the card uses internally — lift it here so the map
  //    section can show ฿ without a second Firestore subscription.
  const priceById = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of visible) {
      const ids = ((t.servicesAvailable ?? t.services ?? [])) || [];
      let min: number | null = null;
      for (const id of ids) {
        const svc = servicesById.get(id);
        if (!svc) continue;
        const p = priceForDuration(svc, 60);
        if (min == null || p < min) min = p;
      }
      if (min != null) m.set(t.id, min);
    }
    return m;
  }, [visible, servicesById]);

  return (
    <Box
      component="section"
      // 🆕 Round 28b61 — `id="therapist-grid"` removed (founder
      //   "ลบ -grid"). All anchor links pointing at it now navigate
      //   to plain "/" since the home page lands on this section
      //   below the hero anyway. No more #-suffix in the URL.
      aria-label="available therapists"
      sx={{
        margin: "20px 0 4px",
        scrollMarginTop: "12px",
        // 🆕 Round 28b30 (perf #66) — Reserve vertical space BEFORE
        //   therapists load. PageSpeed flagged 0.097 CLS from this
        //   section: cards fly in from below the search bar, pushing
        //   everything around as Firestore docs arrive. minHeight
        //   sized for ~6 rows of 2-col cards (typical first-fold).
        minHeight: { xs: "1200px", sm: "1400px" },
      }}
    >
      {/* Header: serif title + live count.
          🆕 Round 28c — bumped horizontal padding 16 → 14 to match
          Hero margin and search bar inset (cohesive home rhythm).
          🆕 Round 28r4 (founder 2026-05-06) — sub-line is now in
          concierge tone. Old "X online now · Y verified" read as a
          dashboard stat; new "X on standby · Bangkok Tonight" reads
          as a host saying "we have people waiting for you". The
          phrase suffix ("Bangkok Tonight" / "Concierge resumes 09:00")
          comes from the same `useConciergeMode` payload as the Live
          pill — header + pill always agree. */}
      <Box sx={{ marginBottom: "10px", padding: "0 14px" }}>
        <Typography
          sx={{
            fontFamily: fonts.heading,
            fontSize: "22px",
            fontWeight: 600,
            color: "#3c1e14",
            letterSpacing: "-0.02em",
            lineHeight: 1.05,
          }}
        >
          Our{" "}
          <Box component="span" sx={{ color: "#FE0944" }}>
            Therapists
          </Box>
        </Typography>
        {!loading && therapists.length > 0 && (
          <Typography
            sx={{
              fontFamily: fonts.body,
              fontSize: "11px",
              color: "rgba(60, 30, 20, 0.6)",
              marginTop: "3px",
              display: "flex",
              alignItems: "center",
              gap: "5px",
            }}
          >
            {availableNow > 0 && (
              <>
                <Box
                  component="span"
                  sx={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: "#16a34a",
                    boxShadow: "0 0 0 3px rgba(22,163,74,0.18)",
                    animation: "homeGridBlink 1.4s ease-in-out infinite",
                    "@keyframes homeGridBlink": {
                      "0%, 100%": { opacity: 1 },
                      "50%": { opacity: 0.5 },
                    },
                  }}
                />
                <Box component="span" sx={{ color: "#16a34a", fontWeight: 700 }}>
                  {availableNow} on standby
                </Box>
                <Box component="span" sx={{ opacity: 0.4 }}>
                  ·
                </Box>
              </>
            )}
            <Box
              component="span"
              sx={{
                fontFamily: fonts.heading,
                fontStyle: "italic",
                fontWeight: 500,
                color: brand.accent,
              }}
            >
              {concierge.gridHeadline}
            </Box>
          </Typography>
        )}
      </Box>

      {/* 🆕 Round 28r16 (founder 2026-05-07) — Roster filter strip.
          Sits ABOVE the Areas chip strip so the highest-priority
          filter (status: available now / express) is one tap away.
          Pre-selected to "available_now" during prime hours so a
          guest opening at 23:30 lands directly on actionable cards.
          Each chip carries its own count so the guest knows
          immediately whether the filter has anything in it. */}
      <Box
        role="group"
        aria-label="Filter therapists by availability"
        sx={{
          display: "flex",
          gap: "6px",
          padding: "0 14px 8px",
          overflowX: "auto",
          scrollbarWidth: "none",
          "&::-webkit-scrollbar": { display: "none" },
        }}
      >
        {(
          [
            { id: "all", label: "All", count: sorted.length },
            {
              id: "available_now",
              label: "● Available now",
              count: totalAvailable,
            },
            { id: "express", label: "Express ≤5km", count: totalExpress },
          ] as const
        ).map((opt) => {
          const isActive = rosterFilter === opt.id;
          const isAvailableChip = opt.id !== "all";
          return (
            <Box
              key={opt.id}
              component="button"
              type="button"
              onClick={() => setRosterFilter(opt.id)}
              aria-pressed={isActive}
              sx={{
                flexShrink: 0,
                padding: "6px 12px",
                borderRadius: 999,
                fontFamily: fonts.body,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "-0.005em",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                border: isActive
                  ? isAvailableChip
                    ? "1px solid rgba(22, 163, 74, 0.55)"
                    : "1px solid rgba(254, 9, 68, 0.55)"
                  : "1px solid rgba(184, 92, 60, 0.18)",
                background: isActive
                  ? isAvailableChip
                    ? "linear-gradient(135deg, rgba(22, 163, 74, 0.12), rgba(22, 163, 74, 0.06))"
                    : "linear-gradient(135deg, rgba(254, 9, 68, 0.10), rgba(254, 122, 82, 0.10))"
                  : "rgba(255,255,255,0.55)",
                color: isActive
                  ? isAvailableChip
                    ? "#15803d"
                    : brand.red
                  : brand.text,
                boxShadow: isActive
                  ? isAvailableChip
                    ? "0 2px 6px rgba(22, 163, 74, 0.18)"
                    : "0 2px 6px rgba(254, 9, 68, 0.15)"
                  : "inset 0 1px 0 rgba(255,255,255,0.55)",
                transition:
                  "background 0.18s ease, border-color 0.18s ease, transform 0.12s ease",
                "&:hover": { transform: "translateY(-1px)" },
                "&:focus-visible": {
                  outline: `2px solid ${brand.red}`,
                  outlineOffset: 2,
                },
              }}
            >
              {opt.label}
              <Box
                component="span"
                sx={{
                  fontSize: 9.5,
                  fontWeight: 800,
                  opacity: isActive ? 0.8 : 0.55,
                }}
              >
                {opt.count}
              </Box>
            </Box>
          );
        })}
      </Box>

      {/* 🆕 Round 28r4 (founder 2026-05-06) — Areas chip strip.
          A guest at Anantara Riverside used to have to scroll all the
          way down to the footer trust line to confirm we cover their
          neighbourhood. Now: six dense BKK zones as horizontally
          scrollable pills directly above the search bar. Tapping a
          chip pre-fills the search input (zero new filtering code —
          we just feed `matchesQuery` an area string), tapping the
          active chip again clears it. */}
      <Box
        role="group"
        aria-label="Browse by Bangkok area"
        sx={{
          display: "flex",
          gap: "6px",
          padding: "0 14px 8px",
          overflowX: "auto",
          // Hide the scrollbar so the strip reads as a clean chip row.
          scrollbarWidth: "none",
          "&::-webkit-scrollbar": { display: "none" },
        }}
      >
        {BANGKOK_AREAS.map((area) => {
          const isActive = activeAreaLabel === area.label;
          // 🆕 Round 28r17 — Per-chip count using neighbour-matching
          //   so "Silom" reports the number of therapists in Silom +
          //   Sathorn + Bangrak + Surasak combined, not just literal
          //   Silom matches.
          const count = sorted.filter((t) =>
            matchesArea(t, area.match)
          ).length;
          return (
            <Box
              key={area.label}
              component="button"
              type="button"
              onClick={() =>
                setActiveAreaLabel(isActive ? null : area.label)
              }
              aria-pressed={isActive}
              sx={{
                flexShrink: 0,
                padding: "6px 12px",
                borderRadius: 999,
                fontFamily: fonts.body,
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: "-0.005em",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                border: isActive
                  ? "1px solid rgba(254, 9, 68, 0.55)"
                  : "1px solid rgba(184, 92, 60, 0.18)",
                background: isActive
                  ? "linear-gradient(135deg, rgba(254, 9, 68, 0.10), rgba(254, 122, 82, 0.10))"
                  : "rgba(255,255,255,0.55)",
                color: isActive ? brand.red : brand.text,
                boxShadow: isActive
                  ? "0 2px 6px rgba(254, 9, 68, 0.15)"
                  : "inset 0 1px 0 rgba(255,255,255,0.55)",
                transition:
                  "background 0.18s ease, border-color 0.18s ease, transform 0.12s ease",
                "&:hover": { transform: "translateY(-1px)" },
                "&:focus-visible": {
                  outline: `2px solid ${brand.red}`,
                  outlineOffset: 2,
                },
              }}
            >
              {area.label}
              <Box
                component="span"
                sx={{
                  fontSize: 9.5,
                  fontWeight: 800,
                  opacity: isActive ? 0.8 : 0.55,
                }}
              >
                {count}
              </Box>
            </Box>
          );
        })}
      </Box>

      <TherapistSearchBar value={searchQ} onChange={setSearchQ} m="0 14px 12px" />

      {/* Body */}
      {loading ? (
        <Box
          sx={{
            minHeight: 220,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <CircularProgress size={28} sx={{ color: "#FE0944" }} />
        </Box>
      ) : visible.length === 0 ? (
        <Box
          sx={{
            margin: "0 14px",
            textAlign: "center",
            padding: "40px 14px",
            borderRadius: "16px",
            background: "rgba(255,255,255,0.5)",
            border: "1px solid rgba(255,255,255,0.6)",
          }}
        >
          <Typography
            sx={{
              fontFamily: fonts.heading,
              fontSize: "15px",
              color: "#3c1e14",
              fontWeight: 600,
            }}
          >
            {searchQ ? "No matches" : "No therapists right now"}
          </Typography>
          <Typography
            sx={{
              fontFamily: SANS,
              fontSize: "12px",
              color: "rgba(60, 30, 20, 0.6)",
              marginTop: "4px",
            }}
          >
            {searchQ
              ? `Nothing matches "${searchQ}". Try a different keyword.`
              : "Check back in a moment."}
          </Typography>
        </Box>
      ) : (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: "10px",
            padding: "0 14px 16px",
          }}
        >
          {visible.map((t, i) => (
            <TherapistProfileCard
              key={t.id}
              therapist={t}
              priority={i < 2 /* eager-load top row for LCP */}
              userLocation={userLocation}
              services={servicesById}
              // Round 28aw — pass requestLocation so the "Allow location"
              // chip can trigger the browser permission prompt directly.
              onRequestLocation={requestLocation}
            />
          ))}
        </Box>
      )}

      {/* 🆕 Round 26d — "Or browse by location ↓" map preview.
          Shown only when there are therapists in the visible list and
          we're not in a no-match search state. Pass the live user
          position so pins can be projected at real lat/lng offsets. */}
      {!loading && visible.length > 0 && (
        <HomeMapBrowse
          therapists={visible}
          priceById={priceById}
          userLocation={userLocation}
        />
      )}
    </Box>
  );
};

export default HomeTherapistGrid;
