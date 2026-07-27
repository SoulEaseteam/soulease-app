// src/components/home/HomeMapBrowse.tsx
//
// 🗺 "OR BROWSE BY LOCATION ↓" map preview — verbatim port of the map
// block in `02-mockups/sunred-therapists2.html`. Shows up to 4 nearby
// therapists as colored pins on a grid backdrop, with a floating card
// previewing the currently-selected therapist. Tapping the card or
// pin navigates to /therapists/{id}.
//
// This is NOT a real Google Map — pins are placed at fixed relative
// positions on a stylized grid surface, sized to match the mockup
// (380px tall, full-width card). Real Google Maps integration is a
// separate task (the Phase 2 mockup explicitly uses a stylized preview
// because the customer's lat/lng is rarely accurate to city blocks).
//
// 🆕 Round 26d (founder 2026-05-02): added below the therapist grid
// per "Or browse by location ↓ เพิ่ม" direction.

import React, { useEffect, useMemo, useState } from "react";
import { Box, Typography, Stack } from "@mui/material";
import VerifiedRoundedIcon from "@mui/icons-material/VerifiedRounded";
import StarRoundedIcon from "@mui/icons-material/StarRounded";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

import type { Therapist } from "@/types/therapist";
import { enhanceImage } from "@/utils/cloudinary";
import { brand, fonts, accents } from "@/theme/theme";
import type { LiveLocation } from "@/hooks/useUserLocation";
// 🆕 Round 28b3 — wire to real live data, same engines used by
//   TherapistProfileCard so map + grid never disagree.
import { useTherapistReviews } from "@/hooks/useTherapistReviews";
import { calculateTherapistStatus } from "@/utils/calculateTherapistStatus";
import { haversineKm } from "@/utils/taxiFare";
// 🆕 Round 28b9 — live booking subscription so the floating map
//   card surfaces "next booked at HH:mm" hints when free now.
import {
  useTherapistBookings,
  findActiveBooking,
  findNextBooking,
  nextAvailableHHMM,
} from "@/hooks/useTherapistBookings";
import { fmtBKK } from "@/utils/time";
// 🆕 Round 28r3 — resolve service id → display name so the floating
//   card can show ชื่อเมนูเด่น (e.g. "Aroma · Therapeutic") inline
//   beside the rating, matching the founder mockup layout.
import { getServiceById } from "@/utils/serviceCatalog";

// Compact display name for the floating-card service tags.
// Full catalog names ("SunRed Therapeutic Experience") would clip on
// the 430px phone shell — these short forms read at a glance.
const SERVICE_SHORT_NAME: Record<string, string> = {
  "xSR-Thai": "Thai",
  "SR-Aroma": "Aroma",
  "SR-HJ2200": "Gentleman",
  "SR-B2B3200": "Therapeutic",
};

/** Pick up to 2 short service names for the floating-card tags row. */
function pickServiceTags(t: Therapist): string[] {
  const ids = t.servicesAvailable ?? t.services ?? [];
  const tags: string[] = [];
  for (const id of ids) {
    const short = SERVICE_SHORT_NAME[id];
    if (short) {
      tags.push(short);
    } else {
      const svc = getServiceById(id);
      if (svc?.name) tags.push(svc.name.split(" ")[0]);
    }
    if (tags.length >= 2) break;
  }
  return tags;
}

// Fallback pin positions when GPS / therapist locations aren't available.
// 🆕 Round 28r2 (founder 2026-05-06) — "ไม่บัง". Repositioned all four
// fallback pins into the upper-middle zone so none of them tuck under
// the floating card at the bottom of the map. Also nudged them away
// from the 48%/55% user-dot anchor so the eye reads four distinct
// faces + one location anchor, not a cluster.
const FALLBACK_POSITIONS = [
  // 🆕 28w — pulled the extremes inward so the active pin + its ★ pill
  //   never touch the frame edge (founder "รูปพนักงานหลุดเฟรม").
  { top: 28, left: 30 }, // values in %
  { top: 26, left: 68 },
  { top: 46, left: 72 },
  { top: 47, left: 28 },
] as const;

// "You are here" dot position — kept as % so projected pins can be
// positioned relative to the same anchor.
const USER_CENTER = { top: 55, left: 48 } as const;

/**
 * Project a therapist's real lat/lng to a position on the stylized map
 * surface, using the user's location as the (left:48%, top:55%) anchor.
 * Returns null when either the therapist or user lacks coordinates.
 *
 * The projection is intentionally crude — flat-earth, no Mercator —
 * because this is a neighborhood-scale preview, not a real map.
 */
function projectPin(
  t: Therapist,
  user: LiveLocation,
  scalePctPerKm: number
): { top: number; left: number } | null {
  const target =
    t.currentLocation ??
    t.homeLocation ??
    (typeof t.lat === "number" && typeof t.lng === "number"
      ? { lat: t.lat, lng: t.lng }
      : null);
  if (!target) return null;

  // 1° latitude ≈ 111 km. 1° longitude ≈ 111 × cos(lat) km.
  const dLatKm = (target.lat - user.lat) * 111;
  const dLngKm =
    (target.lng - user.lng) * 111 * Math.cos((user.lat * Math.PI) / 180);

  // North (positive lat) → up (negative top%); East (positive lng) → right.
  const top = USER_CENTER.top - dLatKm * scalePctPerKm;
  const left = USER_CENTER.left + dLngKm * scalePctPerKm;

  // 🆕 Round 28r2 — Clamp `top` so projected pins never tuck under the
  // floating card area (which sits roughly bottom 24% of the map).
  // 🆕 28w — tightened (was 8-64 / 10-90) so the whole pin PLUS its ★
  //   rating pill (which sits below + wider than the avatar) always stays
  //   inside the framed map. Founder: "รูปพนักงานหลุดเฟรม".
  return {
    top: Math.max(24, Math.min(48, top)),
    left: Math.max(18, Math.min(82, left)),
  };
}

export interface HomeMapBrowseProps {
  /**
   * Therapists already sorted by status + distance (parent owns the
   * sort logic). The first 4 will be rendered as pins; the active
   * selection seeds the floating card.
   */
  therapists: Therapist[];
  /** Optional starting price per id, computed by parent. */
  priceById?: Map<string, number>;
  /**
   * 🆕 Customer's live position — when provided, pins are projected to
   * their real lat/lng offsets from this anchor. Falls back to the
   * mockup's fixed `.pin.p1…p4` scatter when GPS is unavailable.
   */
  userLocation?: LiveLocation | null;
}

const HomeMapBrowse: React.FC<HomeMapBrowseProps> = ({
  therapists,
  priceById,
  userLocation = null,
}) => {
  const navigate = useNavigate();
  const top = therapists.slice(0, 4);
  const [activeIdx, setActiveIdx] = useState(0);
  // 🆕 Round 28r2 (founder 2026-05-06) — pause auto-rotation when the
  //   guest manually taps a pin or hovers the map surface. We only
  //   resume after they look away for a few seconds; otherwise the
  //   carousel "fights" their selection.
  const [paused, setPaused] = useState(false);
  // Round 28az — track image-load failures so we can render an
  // initial-letter placeholder instead of the browser's broken-image
  // icon for therapists whose photo file is missing.
  const [imgErrorIds, setImgErrorIds] = useState<Set<string>>(new Set());

  // Reset active pin when the underlying list reshuffles (e.g., status
  // change pushes someone new into the top-4) so we never reference a
  // therapist who's no longer rendered.
  useEffect(() => {
    if (activeIdx >= top.length) setActiveIdx(0);
  }, [top.length, activeIdx]);

  // 🆕 Round 28r2 (founder 2026-05-06) — "คนในpin วนสวยๆ ไม่บัง".
  //   Auto-cycle the active pin so the floating card rotates through
  //   real practitioners. Each cycle the new face gets the brand-red
  //   ring, Bayesian rating, and price/status chip — feels alive
  //   without the guest having to tap anything.
  //   🆕 Round 28r3 — slowed from 3.6s → 6.5s ("ช้ากว่านี้หน่อย อารม
  //   สปา เบาๆ"). Faster cadence read as a slot machine; spa pacing
  //   asks the eye to linger before the next face slides in.
  //   Pauses while `paused` is true (manual tap / hover).
  useEffect(() => {
    if (paused || top.length <= 1) return;
    const id = window.setInterval(() => {
      setActiveIdx((prev) => (prev + 1) % top.length);
    }, 6500);
    return () => window.clearInterval(id);
  }, [paused, top.length]);

  // After a manual tap/hover, hold the selection for 7s then resume
  // the rotation so the guest can leave the page on autopilot.
  useEffect(() => {
    if (!paused) return;
    const id = window.setTimeout(() => setPaused(false), 7000);
    return () => window.clearTimeout(id);
  }, [paused]);

  // 🆕 Round 26e — Project pins to real lat/lng offsets when GPS is
  // available. Pick a per-km scale that sizes the farthest pin to ~38%
  // of the map (so pins stay visible without crowding the edges).
  const projectedPositions = useMemo(() => {
    if (!userLocation) return null;

    // First pass — compute raw offsets to find the farthest pin.
    const offsets: Array<{ dxKm: number; dyKm: number } | null> = top.map(
      (t) => {
        const target =
          t.currentLocation ??
          t.homeLocation ??
          (typeof t.lat === "number" && typeof t.lng === "number"
            ? { lat: t.lat, lng: t.lng }
            : null);
        if (!target) return null;
        const dLatKm = (target.lat - userLocation.lat) * 111;
        const dLngKm =
          (target.lng - userLocation.lng) *
          111 *
          Math.cos((userLocation.lat * Math.PI) / 180);
        return { dxKm: dLngKm, dyKm: dLatKm };
      }
    );

    const maxKm = Math.max(
      0.5,
      ...offsets
        .filter((o): o is { dxKm: number; dyKm: number } => o !== null)
        .map((o) => Math.hypot(o.dxKm, o.dyKm))
    );

    // Scale so the farthest therapist sits ~30% from center (28w — pulled in
    //   from 38% so pins + their pills never reach the framed map edge).
    const scalePctPerKm = 30 / maxKm;

    return top.map((t) => projectPin(t, userLocation, scalePctPerKm));
  }, [top, userLocation]);

  // 🆕 Round 28b3 — Wire active card to real live data:
  //   • Bayesian rating from real Firestore reviews (matches grid cards).
  //   • Live status (available / bookable / resting) from same engine
  //     so the floating card pill never disagrees with the grid.
  //   • Live distance via haversine when userLocation is known.
  // The hooks are called with `top[activeIdx]?.id` (or null) so we
  // gracefully no-op while top is empty / activeIdx is being clamped.
  const activeForHook = top[activeIdx] ?? null;
  const { reviews: activeReviews, reviewCount: activeReviewCount } =
    useTherapistReviews(activeForHook.id);
  // 🆕 Round 28b9 — same booking subscription the time picker uses,
  //   so the floating map card pill matches "TAKEN" slots in real time.
  const liveBookings = useTherapistBookings(activeForHook.id ?? null);

  if (top.length === 0) return null;

  const active = top[activeIdx];
  const activePrice = priceById?.get(active.id);

  // Bayesian rating — same formula used by TherapistProfileCard
  // (PRIOR_MEAN 4.5, PRIOR_WEIGHT 10) so card + map agree.
  const activeRatingNum = (() => {
    const seed = Number(active.rating) || 0;
    if (activeReviewCount === 0) return seed;
    const sum = activeReviews.reduce((s, r) => s + r.rating, 0);
    const PRIOR_MEAN = 4.5;
    const PRIOR_WEIGHT = 10;
    return (PRIOR_MEAN * PRIOR_WEIGHT + sum) / (PRIOR_WEIGHT + activeReviewCount);
  })();
  const activeRatingLabel = activeRatingNum.toFixed(1);

  // Live distance — haversine from userLocation if known.
  const activeDistanceKm = (() => {
    const target =
      active.currentLocation ??
      active.homeLocation ??
      (typeof active.lat === "number" && typeof active.lng === "number"
        ? { lat: active.lat, lng: active.lng }
        : null);
    if (userLocation && target) {
      return haversineKm(
        userLocation.lat,
        userLocation.lng,
        target.lat,
        target.lng
      );
    }
    return typeof active.distanceKm === "number" ? active.distanceKm : null;
  })();
  const distanceLabel =
    typeof activeDistanceKm === "number"
      ? `${activeDistanceKm.toFixed(1)} km`
      : null;

  // 🆕 Round 28r3 — top-2 short service names (e.g. ["Aroma", "Therapeutic"])
  //   for the inline "ชื่อเมนูเด่น" tags in the rating line.
  const activeServiceTags = pickServiceTags(active);

  // 🆕 Round 28b9 — Status now merges the engine output with the live
  //   bookings collection: an active booking covering "now" forces
  //   "bookable", and a future booking surfaces as `nextBookingAt`
  //   so the floating card matches the time-picker reality.
  const activeStatusEngine = calculateTherapistStatus(active);
  const activeBookingNow = findActiveBooking(liveBookings);
  const upcomingBooking = findNextBooking(liveBookings);
  const activeStatus = activeBookingNow
    ? "bookable"
    : activeStatusEngine.status;
  const activeNext = activeBookingNow
    ? nextAvailableHHMM(liveBookings)
    : activeStatusEngine.nextAvailable ?? null;
  const activeNextBookingAt =
    activeStatus === "available" && upcomingBooking
      ? fmtBKK(upcomingBooking.startAt, "HH:mm A", "")
      : null;

  return (
    <Box sx={{ padding: "4px 14px 0" }}>
      {/* 🆕 28w.17 — removed the redundant "Or browse by location ↓" eyebrow;
          the near-me page header already frames the map. */}
      {/* Map surface — 🆕 Round 28b1 Clean v3: warm cream/peach base
          → cool neutral slate. Grid lines neutral slate too. Inset
          shadow loses the red tint so the map reads as a "real" cool
          map, not a coral rug.
          🆕 Round 28r3 (founder 2026-05-06) — kept the cool-slate
          gradient + straight grid (founder feedback "ของเดิมเป็นกริด
          เส้นตรงๆ โอเค แล้ว"). The radial halo / dot pattern / SVG
          contour layers from Round 28r2 were reverted. */}
      <Box
        onMouseEnter={() => setPaused(true)}
        onTouchStart={() => setPaused(true)}
        sx={{
          position: "relative",
          height: 380,
          background: "var(--sr-panel-2)",
          borderRadius: "18px",
          overflow: "hidden",
          border: "1px solid rgba(15, 23, 42, 0.06)",
          boxShadow: "inset 0 0 40px rgba(15, 23, 42, 0.04)",
        }}
      >
        {/* Grid pattern backdrop — subtle slate lines on the cool base */}
        <Box
          aria-hidden="true"
          sx={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "linear-gradient(rgba(15, 23, 42, 0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(15, 23, 42, 0.06) 1px, transparent 1px)",
            backgroundSize: "30px 30px",
          }}
        />

        {/* "You are here" pulsing blue dot */}
        <Box
          component={motion.div}
          animate={{ scale: [1, 1.25, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          aria-label="Your location"
          sx={{
            position: "absolute",
            top: "55%",
            left: "48%",
            width: 14,
            height: 14,
            borderRadius: "50%",
            background: "#1d9bf0",
            boxShadow:
              "0 0 0 4px rgba(29, 155, 240, 0.3), 0 0 16px rgba(29, 155, 240, 0.6)",
            zIndex: 3,
          }}
        />

        {/* Therapist pins — real photos at real lat/lng positions */}
        {top.map((t, i) => {
          const isActive = i === activeIdx;

          // Prefer projected position from GPS; fall back to mockup scatter.
          const projected = projectedPositions?.[i] ?? null;
          const fallback = FALLBACK_POSITIONS[i % FALLBACK_POSITIONS.length];
          const pos = projected ?? fallback;

          // Resolve photo URL the same way the card does
          const rawImg = t.image || "placeholder.jpg";
          const imgUrl =
            rawImg.startsWith("http") || rawImg.startsWith("/")
              ? rawImg
              : `/images/${rawImg}`;
          const photoUrl = enhanceImage(imgUrl, { variant: "card" });

          return (
            <Box
              key={t.id}
              component={motion.button}
              type="button"
              onClick={() => {
                setActiveIdx(i);
                setPaused(true);
              }}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.97 }}
              aria-label={`Show ${t.name} on the map`}
              aria-pressed={isActive}
              sx={{
                position: "absolute",
                top: `${pos.top}%`,
                left: `${pos.left}%`,
                transform: "translate(-50%, -50%)",
                // 🆕 28w.18 (founder "ลอง ซูม เข้าหน้า เลย ตัดปัญหา") —
                //   enlarged the pins so the (face-cropped) photo reads
                //   clearly at a glance instead of a tiny muddy circle.
                width: isActive ? 54 : 42,
                height: isActive ? 54 : 42,
                borderRadius: "50%",
                // 🆕 Round 28b1 — fallback bg moved from warm tan
                //   #d4a574 → cool slate so loading state matches
                //   the new Clean v3 map. Active pin keeps the red
                //   brand glow because that's the deliberate accent
                //   that says "this one's selected".
                backgroundColor: "#CBD5E1",
                // 🆕 Round 28r3 (founder 2026-05-06) — "Pin ไร้ขอบ".
                //   Removed the 3px white ring. The drop-shadow + red
                //   active-glow are enough to lift the pin off the
                //   map surface; the white border was reading as a
                //   1990s sticker outline. We keep `border: 0` so MUI
                //   Box doesn't inherit the default button border.
                border: 0,
                cursor: "pointer",
                padding: 0,
                boxShadow: isActive
                  ? "0 6px 20px rgba(15, 23, 42, 0.50), 0 2px 6px rgba(15,23,42,0.10)"
                  : "0 4px 12px rgba(15, 23, 42, 0.18)",
                zIndex: isActive ? 4 : 2,
                transition:
                  "width 0.25s, height 0.25s, box-shadow 0.25s, top 0.4s ease, left 0.4s ease",
                overflow: "visible",
                "&:focus-visible": {
                  outline: `2px solid ${brand.red}`,
                  outlineOffset: 3,
                },
              }}
            >
              {/* Round 28az — when the image fails to load (missing
                  photo file), render the therapist's initial letter
                  on the brown fallback bg instead of the broken icon. */}
              {imgErrorIds.has(t.id) ? (
                <Box
                  aria-hidden="true"
                  sx={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: fonts.heading,
                    fontStyle: "italic",
                    fontWeight: 700,
                    fontSize: isActive ? 22 : 16,
                    color: "rgba(255,255,255,0.95)",
                    textShadow: "0 1px 3px rgba(0,0,0,0.3)",
                    pointerEvents: "none",
                  }}
                >
                  {t.name.charAt(0).toUpperCase()}
                </Box>
              ) : (
                <Box
                  component="img"
                  src={photoUrl}
                  alt={t.name}
                  loading="lazy"
                  decoding="async"
                  draggable={false}
                  onError={() =>
                    setImgErrorIds((prev) => new Set(prev).add(t.id))
                  }
                  sx={{
                    width: "100%",
                    height: "100%",
                    borderRadius: "50%",
                    objectFit: "cover",
                    // 🆕 28w.18 — frame the FACE, not the midsection.
                    //   Roster photos are full-body standing shots; a
                    //   centered cover crop showed torso/background and
                    //   read as a grey blob. Bias the crop to the top
                    //   third so the practitioner's face fills the pin.
                    objectPosition: "50% 10%",
                    display: "block",
                    pointerEvents: "none",
                  }}
                />
              )}

              {/* Active pin gets a floating ★ rating chip — uses
                  the Bayesian rating computed from real Firestore
                  reviews so it matches grid cards exactly. */}
              {isActive && (
                <Box
                  aria-hidden="true"
                  sx={{
                    position: "absolute",
                    bottom: -6,
                    left: "50%",
                    transform: "translateX(-50%)",
                    background: "#fff",
                    color: brand.red,
                    fontFamily: fonts.body,
                    fontSize: 9,
                    fontWeight: 800,
                    padding: "2px 6px",
                    borderRadius: 99,
                    whiteSpace: "nowrap",
                    boxShadow: "0 2px 6px rgba(0, 0, 0, 0.15)",
                  }}
                >
                  ★ {activeRatingLabel}
                </Box>
              )}
            </Box>
          );
        })}

        {/* Floating card for the active pin */}
        <Box
          component={motion.div}
          key={active.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={() => void navigate(`/therapists/${active.id}`)}
          role="button"
          tabIndex={0}
          aria-label={`Open ${active.name}'s profile`}
          onKeyDown={(e: React.KeyboardEvent) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              void navigate(`/therapists/${active.id}`);
            }
          }}
          sx={{
            position: "absolute",
            bottom: 14,
            left: 14,
            right: 14,
            padding: "10px",
            // 🆕 Round 28b1 — solid white instead of glass blur (cleaner
            //   on cool slate map). Shadow loses red tint, gains slate
            //   depth so card "lifts" without warm cast.
            background: "var(--sr-panel)",
            border: "1px solid var(--sr-hairline)",
            borderRadius: "14px",
            boxShadow:
              "0 1px 2px rgba(15, 23, 42, 0.04), 0 8px 24px rgba(15, 23, 42, 0.12)",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            zIndex: 5,
            cursor: "pointer",
            "&:focus-visible": {
              outline: `2px solid ${brand.red}`,
              outlineOffset: 2,
            },
          }}
        >
          {/* Therapist thumbnail — Round 28az: initial-letter fallback
              when the source photo is missing. */}
          {imgErrorIds.has(active.id) || !active.image ? (
            <Box
              aria-hidden="true"
              sx={{
                width: 56,
                height: 56,
                borderRadius: "12px",
                // 🆕 Round 28b1 — fallback gradient swapped from
                //   warm tan/brown to brand red→coral so the
                //   missing-photo case still feels SunRed.
                background: `#2D2D2B`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: fonts.heading,
                fontStyle: "italic",
                fontWeight: 700,
                fontSize: 28,
                color: "rgba(255,255,255,0.95)",
                textShadow: "0 1px 3px rgba(0,0,0,0.25)",
                flexShrink: 0,
                boxShadow: "0 2px 8px rgba(15, 23, 42, 0.10)",
              }}
            >
              {active.name.charAt(0).toUpperCase()}
            </Box>
          ) : (
            <Box
              component="img"
              src={enhanceImage(
                active.image.startsWith("http") || active.image.startsWith("/")
                  ? active.image
                  : `/images/${active.image}`,
                { variant: "card" }
              )}
              alt={active.name}
              width={56}
              height={56}
              loading="lazy"
              decoding="async"
              onError={() =>
                setImgErrorIds((prev) => new Set(prev).add(active.id))
              }
              sx={{
                width: 56,
                height: 56,
                borderRadius: "12px",
                objectFit: "cover",
                // 🆕 28w.18 — same face-first crop as the map pins so the
                //   thumbnail shows the practitioner's face, not her torso.
                objectPosition: "50% 18%",
                flexShrink: 0,
                boxShadow: "0 4px 10px rgba(15, 23, 42, 0.10)",
              }}
            />
          )}

          {/* Info column — 🆕 Round 28r3 (founder 2026-05-06).
              "ป้ายพนักงาน เปลียน · ชื่อเมนูเด่นมาใส่ ตามแบบ":
              Reverted the specialty chip from Round 28r2; the founder
              mockup wants a single tight metrics line in the form of
                ★ 4.8 · 3.1 km · Aroma · Therapeutic
              where the trailing dotted segments are the practitioner's
              top-2 service tags (their headline menu items) instead of
              one specialty word. This reads as "menu highlights" — the
              fastest signal a guest scanning the map needs. */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Stack
              direction="row"
              alignItems="center"
              spacing={0.5}
              sx={{ lineHeight: 1.1, marginBottom: "2px" }}
            >
              <Typography
                sx={{
                  fontFamily: fonts.heading,
                  fontWeight: 600,
                  fontSize: 14,
                  color: "var(--sr-ink)",
                  letterSpacing: "-0.01em",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {active.name}
                {active.features.age && (
                  <Box component="span" sx={{ opacity: 0.85, fontWeight: 400 }}>
                    , {active.features.age}
                  </Box>
                )}
              </Typography>
              <VerifiedRoundedIcon
                sx={{ fontSize: 14, color: "#1d9bf0", flexShrink: 0 }}
              />
            </Stack>

            <Typography
              sx={{
                fontFamily: fonts.body,
                fontSize: 10.5,
                color: "var(--sr-body)",
                lineHeight: 1.3,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                display: "flex",
                alignItems: "center",
                gap: "2px",
              }}
            >
              {/* 🆕 Round 28r81 — accent amber (#F5A623). */}
              <StarRoundedIcon sx={{ fontSize: 12, color: accents.amber }} />
              {activeRatingLabel}
              {activeReviewCount > 0 && (
                <Box component="span" sx={{ opacity: 0.7 }}>
                  &nbsp;({activeReviewCount})
                </Box>
              )}
              {distanceLabel && <> · {distanceLabel}</>}
              {activeServiceTags.length > 0 && (
                <> · {activeServiceTags.join(" · ")}</>
              )}
            </Typography>
          </Box>

          {/* 🆕 Round 28b3 — Right side: price + live status pill stacked.
              Same colour matrix as TherapistProfileCard so map ↔ grid
              never disagree visually:
                • available           → green   "● Avail Now"
                • bookable + time     → coral   "Avail HH:MM"
                • bookable + no time  → coral   "In session"
                • resting   + time    → gray    "Avail HH:MM" */}
          <Stack
            direction="column"
            alignItems="flex-end"
            spacing={0.5}
            sx={{ flexShrink: 0 }}
          >
            {activePrice != null && (
              <Box sx={{ textAlign: "right" }}>
                <Typography
                  sx={{
                    fontFamily: fonts.heading,
                    fontWeight: 600,
                    fontSize: 14,
                    color: brand.red,
                    letterSpacing: "-0.02em",
                    lineHeight: 1,
                  }}
                >
                  ฿{activePrice.toLocaleString()}
                  <Box
                    component="span"
                    sx={{
                      fontFamily: fonts.body,
                      fontSize: 9,
                      fontWeight: 500,
                      color: brand.textMuted,
                      ml: 0.25,
                    }}
                  >
                    /60min
                  </Box>
                </Typography>
              </Box>
            )}
            {activeStatus === "available" ? (
              <Box
                aria-hidden="true"
                sx={{
                  px: 1,
                  py: 0.3,
                  background: "#10B981",
                  color: "#fff",
                  fontFamily: fonts.body,
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.02em",
                  borderRadius: "999px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 0.5,
                  boxShadow:
                    "0 2px 6px rgba(22, 163, 74, 0.30)",
                  "&::before": {
                    content: '""',
                    width: 5,
                    height: 5,
                    borderRadius: "50%",
                    background: "#fff",
                    animation:
                      "hm-avail-pulse 1.6s ease-in-out infinite",
                    "@keyframes hm-avail-pulse": {
                      "0%, 100%": { opacity: 1 },
                      "50%": { opacity: 0.45 },
                    },
                    "@media (prefers-reduced-motion: reduce)": {
                      animation: "none",
                    },
                  },
                }}
              >
                {activeNextBookingAt
                  ? `Avail · → ${activeNextBookingAt}`
                  : "Avail Now"}
              </Box>
            ) : activeStatus === "bookable" ? (
              <Box
                aria-hidden="true"
                sx={{
                  px: 1,
                  py: 0.3,
                  background: brand.coral,
                  color: "#fff",
                  fontFamily: fonts.body,
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.02em",
                  borderRadius: "999px",
                  boxShadow:
                    "0 2px 6px rgba(214, 40, 40, 0.28)",
                }}
              >
                {activeNext ? `Avail ${activeNext}` : "In session"}
              </Box>
            ) : activeNext ? (
              <Box
                aria-hidden="true"
                sx={{
                  px: 1,
                  py: 0.3,
                  background: "rgba(15, 23, 42, 0.10)",
                  color: "rgba(15, 23, 42, 0.72)",
                  fontFamily: fonts.body,
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.02em",
                  borderRadius: "999px",
                  border: "1px solid rgba(15, 23, 42, 0.08)",
                }}
              >
                Avail {activeNext}
              </Box>
            ) : null}
          </Stack>
        </Box>
      </Box>
    </Box>
  );
};

export default HomeMapBrowse;
