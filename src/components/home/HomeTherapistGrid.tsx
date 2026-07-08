

import React, { useEffect, useMemo, useState } from "react";
import { Box, Typography, CircularProgress } from "@mui/material";
import { collection, onSnapshot } from "firebase/firestore";

import { db } from "@/lib/firebase";
import type { Therapist as TherapistType, Avail } from "@/types/therapist";
import { calculateTherapistStatus } from "@/utils/calculateTherapistStatus";
import { getBadgeForTherapist, pickTopRatedTherapistId } from "@/utils/getTherapistBadge";
import { haversineKm } from "@/utils/taxiFare";

import TherapistProfileCard from "@/components/TherapistProfileCard";
// 🆕 Round 28s128 — Clean single-column list card for the home grid.
//   Replaces the 2-column TherapistProfileCard layout per founder
//   feedback ("หน้าเว็บรกมาก"). Old card kept for other surfaces.
import TherapistMinimalCard from "@/components/TherapistMinimalCard";
import TherapistSearchBar from "@/components/TherapistSearchBar";
import HomeMapBrowse from "@/components/home/HomeMapBrowse";
import { matchesQuery } from "@/utils/therapistSearch";
import { useUserLocation } from "@/hooks/useUserLocation";
import NearMeRoundedIcon from "@mui/icons-material/NearMeRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import { priceForDuration } from "@/utils/servicePricing";
import staticServices from "@/data/services";
import { brand, fonts, glass, gradients } from "@/theme";
// 🆕 Round 28r53 — Phase 3.2 responsive typography helpers.
import { responsiveType } from "@/theme/typography";
import type { MassageService } from "@/data/services";
// 🆕 Round 28r4 — same time-aware mode the Hero uses, so the grid
//   header phrase ("On standby · Bangkok Tonight" / "Concierge resumes
//   09:00") never disagrees with the Live pill above it.
import { useConciergeMode } from "@/utils/conciergeMode";
// 🆕 Round 28r16 — initial roster filter is mode-aware: prime hours
//   default to "available_now" so late-night guests see actionable
//   cards first.
import { nowBKK } from "@/utils/time";
// 🆕 Round 28r71 — shared concierge endpoints (r71 rebrand phase 2).
import { whatsappDeepLink } from "@/config/concierge";

const SERIF = '"Playfair Display", "Fraunces", Georgia, "Times New Roman", serif';
const SANS = '"Inter", system-ui, -apple-system, sans-serif';

interface Therapist extends TherapistType {
  computedStatus?: Avail;
  computedNext?: string | null;
}

// Round 28s2 — Areas chip strip + BANGKOK_AREAS table removed (founder
//   2026-05-30). Data showed Sukhumvit/Asok/Thonglor all chronically
//   read "0 available", which actively drove tourist bounces. Until
//   supply covers those zones, hide the geographic gap rather than
//   advertise it. Roster filter (All / Available now / Express) stays.

// 🆕 28s335 — `mapOnly` renders JUST the "OR BROWSE BY LOCATION" map
//   (reusing this component's live therapist/price/location loading) so the
//   new /near-me page can host it without duplicating any data logic. The
//   home page renders the default (grid, no map — the map moved to /near-me).
const HomeTherapistGrid: React.FC<{ mapOnly?: boolean }> = ({
  mapOnly = false,
}) => {
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

      // 🆕 Round 28s153 — TOP RATED is the daily bestseller. Picked
      //   once across the whole roster (top 1 by todayBookings, tie-
      //   broken by totalBookings, min 1 sale to qualify) so only
      //   ONE practitioner ever wears the badge per day.
      const topRatedId = pickTopRatedTherapistId(raw);

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
        // TOP_RATED override — beats VIP/HOT/NEW for the day's #1.
        const badgeKey = t.id === topRatedId ? "TOP_RATED" : badge.key;
        return {
          ...t,
          computedStatus: safeStatus,
          computedNext: nextAvailable ?? null,
          badgeKey,
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
  // 🆕 Round 28s166 — Filter UI removed (founder: "เอาตัวกรอง ออก").
  //   Default fixed to "all" so the grid shows every practitioner;
  //   the prime-hours auto-flip to "available_now" no longer makes
  //   sense without a visible chip explaining the filter.
  const [rosterFilter, setRosterFilter] = useState<RosterFilter>("all");

  // ── Apply search filter (free-text) + roster filter.
  //   Round 28s2 — area chip filter dropped (see comment near top of file).
  const visible = useMemo(() => {
    let pool = sorted.filter((t) => matchesQuery(t, searchQ));
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
  // 🆕 Round 28s224 — Honest count: working today = visible - on-holiday.
  // Old copy said "All 12 with guests" which contradicted the holiday
  // badges on the cards. Now reflects roster reality.
  const workingTodayCount = visible.filter(
    (t) => t.computedStatus !== "holiday"
  ).length;
  const onHolidayCount = visible.filter(
    (t) => t.computedStatus === "holiday"
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

  // 🆕 28s335 — /near-me page: render ONLY the location map, reusing all the
  //   live data loaded above. Placed after every hook so the rules of hooks
  //   hold regardless of this branch.
  if (mapOnly) {
    return (
      <Box component="section" aria-label="browse by location">
        {loading ? (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              minHeight: 320,
            }}
          >
            <CircularProgress size={28} />
          </Box>
        ) : visible.length > 0 ? (
          <HomeMapBrowse
            therapists={visible}
            priceById={priceById}
            userLocation={userLocation}
          />
        ) : null}
      </Box>
    );
  }

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
        //   everything around as Firestore docs arrive.
        // 🆕 Round 28s146 (audit #2) — minHeight halved (was
        //   1200/1400 → now 800/900). Cards switched to single
        //   column (28s128) so the old 2-col 6-row reservation was
        //   way over-budget — guests saw a giant empty cream void
        //   under "Available now" when supply was low, which looked
        //   broken. 800px ≈ first 4 cards of the list + filter chips,
        //   still enough to absorb the Firestore load without CLS.
        minHeight: { xs: "800px", sm: "900px" },
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
      {/* Round 28s17 — Header restyled to match the hero polish
          (28s15). Old: 2-tone "Our Therapists" with red half +
          busy 3-segment subtitle. New: small clay eyebrow above a
          single-color Fraunces serif title, a clean live-status
          pill, and the concierge headline as a quiet italic line —
          all in the same hierarchy register the hero now uses. */}
      {/* 🆕 Round 28r75 (founder 2026-07-08) — Editorial tagline
          "Bangkok's most discreet outcall massage, delivered to you."
          + "N practitioners on standby" both removed per founder
          direction "ลบ". The desktop hero band (r70, HomePage.tsx) +
          QuickNavRow (r74) now carry the top-of-fold context; this
          section jumped straight to the therapist grid without an
          extra editorial header.
          Historical: was added in 28s165, Thai subtitle in r61 (removed
          in prior r75 edit), full block removed in this round. */}

      {/* 🆕 Round 28s166 — Founder: "เอาตัวกรอง ออก". Roster filter
          chip strip (All / Available now / Express ≤5km) removed
          from the home. `rosterFilter` state still defaults to
          "all" so every practitioner shows; the `visible` list
          stays unfiltered until a future UI brings filtering back. */}

      {/* Round 28s2 — area chip strip removed (Sukhumvit/Asok/Thonglor
          chronically read "0", actively driving bounces). */}

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
          <CircularProgress size={28} sx={{ color: "#2D2D2B" }} />
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
              color: "#1A2B2E",
              fontWeight: 600,
            }}
          >
            {searchQ ? "No matches" : "All practitioners are with guests right now"}
          </Typography>
          <Typography
            sx={{
              fontFamily: SANS,
              fontSize: "12px",
              color: "rgba(15, 23, 42, 0.6)",
              marginTop: "4px",
            }}
          >
            {searchQ
              ? `Nothing matches "${searchQ}". Try a different keyword.`
              : "Message the concierge to be first in line tonight."}
          </Typography>

          {/* 🆕 Round 28s86 — supply-constrained prime-time conversion fix.
              When the roster filter (default "available_now" in prime
              hours) returns zero practitioners, the old dead-end empty
              state killed momentum during the exact window that matters.
              Surface a discreet concierge WhatsApp CTA so a guest can be
              first in line instead of bouncing. Search-no-match keeps the
              "try a different keyword" line; the CTA still helps either way. */}
          <Box
            component="a"
            href={whatsappDeepLink(
              "Hi SunRed concierge, I'd like to book an outcall massage tonight — who's available?",
            )}
            target="_blank"
            rel="noopener noreferrer"
            sx={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              marginTop: "18px",
              padding: "11px 22px",
              borderRadius: "999px",
              background: gradients.primary,
              color: "#fff",
              fontFamily: SANS,
              fontSize: "13px",
              fontWeight: 700,
              letterSpacing: "0.01em",
              textDecoration: "none",
              boxShadow: "0 8px 22px rgba(15, 23, 42, 0.28)",
              transition: "transform 0.15s ease, box-shadow 0.15s ease",
              "&:hover": {
                transform: "translateY(-1px)",
                boxShadow: "0 10px 26px rgba(15, 23, 42, 0.34)",
              },
            }}
          >
            Chat with concierge
            <ArrowForwardRoundedIcon sx={{ fontSize: 16 }} />
          </Box>
        </Box>
      ) : (
        // 🆕 Round 28s128 — Single-column clean list (was 2-column dense
        //   grid). Each card is the minimal portrait-right design that
        //   matches the founder's reference. Old TherapistProfileCard
        //   stays the import in case future iteration needs it but is
        //   intentionally not rendered here. eslint silenced below.
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        (() => {
          // Touch TherapistProfileCard so TS doesn't complain about the
          // unused import while it's preserved for revert.
          void TherapistProfileCard;
          void userLocation;
          void servicesById;
          void requestLocation;
          // 🆕 Round 28s166 — Filter UI dropped; the chip counts
          //   + state setter + prime-hours helper are unused now.
          void setRosterFilter;
          void totalAvailable;
          void totalExpress;
          void nowBKK;
          return (
            <Box
              sx={{
                // 🆕 Round 28r53 — Phase 3.2 responsive grid. Previous
                //   single-column flex list stayed 1-wide at every
                //   viewport (dead space on tablet/desktop). Grid now
                //   scales 2 (phone) → 3 (small tablet) → 3 (tablet)
                //   → 4 (desktop) → 5 (wide desktop). Card is a
                //   vertical portrait card (28r53 restack), aspect
                //   3/4 photo on top, so each column reflows
                //   proportionately as the column width scales.
                display: "grid",
                gridTemplateColumns: {
                  xs: "repeat(2, 1fr)",
                  sm: "repeat(3, 1fr)",
                  md: "repeat(3, 1fr)",
                  lg: "repeat(4, 1fr)",
                  xl: "repeat(5, 1fr)",
                },
                gap: { xs: 1.5, md: 2 },
                padding: {
                  xs: "0 14px 16px",
                  sm: "0 8px 20px",
                  md: "0 12px 24px",
                },
              }}
            >
              {visible.map((t, i) => (
                <TherapistMinimalCard
                  key={t.id}
                  therapist={t}
                  computedStatus={t.computedStatus}
                  // 🆕 Round 28s227 — First card is the LCP element
                  //   on the home page (and the LCP target Search
                  //   Console grades for Core Web Vitals). Pass
                  //   `eager` so the portrait gets fetchpriority=high
                  //   + loading=eager + decoding=sync.
                  eager={i === 0}
                />
              ))}
            </Box>
          );
        })()
      )}

      {/* 🆕 28s335 — HomeMapBrowse moved OFF the home grid to the new
          /near-me page (founder: "ย้าย Or browse by location ไปหน้าใหม่").
          It now renders via the `mapOnly` branch above, reached from the
          "Near Me" quick-nav tile. */}
    </Box>
  );
};

export default HomeTherapistGrid;
