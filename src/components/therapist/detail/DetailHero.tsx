// src/components/therapist/detail/DetailHero.tsx
//
// 🎨 Phase 2 Detail — hero photo (verbatim port of `.detail-hero` from
// `01-mockups/sunred-therapists.html` Phone B) + restored gallery features.
//
// Restored from old TherapistDetailPage:
//   • 🖼 Multi-photo carousel — swipe / tap left/right to advance, dots
//        reflect the current index (replaces the static-dots mockup).
//   • 🔍 Tap-to-fullscreen modal — Dialog with the active image enlarged
//        (no Swiper to keep bundle lean — single-image at a time).
//   • 📤 Share button (top-right) — Web Share API with copy-to-clipboard
//        fallback + toast notification.

import React, { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Box,
  Typography,
  Dialog,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import ArrowBackIosNewRoundedIcon from "@mui/icons-material/ArrowBackIosNewRounded";
import IosShareRoundedIcon from "@mui/icons-material/IosShareRounded";
import FavoriteBorderRoundedIcon from "@mui/icons-material/FavoriteBorderRounded";
import FlagOutlinedIcon from "@mui/icons-material/FlagOutlined";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
// 🆕 Round 28az — replace 📍 emoji with MUI icon (founder rule: icons only).
import LocationOnRoundedIcon from "@mui/icons-material/LocationOnRounded";
import NearMeRoundedIcon from "@mui/icons-material/NearMeRounded";
import VerifiedRoundedIcon from "@mui/icons-material/VerifiedRounded";

const SERIF = '"Playfair Display", "Fraunces", Georgia, "Times New Roman", serif';
const SANS = '"Inter", system-ui, -apple-system, sans-serif';

/** 3-state availability — drives the colored status dot in the hero
 *  name strip:
 *    online  = ●green  · available now
 *    busy    = ●orange · in a session / on the way
 *    offline = ●gray   · not currently working
 */
export type AvailabilityStatus = "online" | "busy" | "offline";

interface Props {
  name: string;
  age: number;
  area: string;
  /**
   * @deprecated Round 28b33 — prefer `distanceLabel`. Kept for back-
   * compat with callers that already pass a pre-formatted string.
   */
  distance?: string;
  /**
   * 🆕 Round 28b33 (founder 2026-05-04) — Canonical distance + ETA
   * label produced by `formatDistanceEta(km, etaMin)`. Renders as
   * "1.2 km • 4 min" or just "1.2 km" / "—" depending on inputs.
   * When provided, overrides the legacy `distance` string.
   */
  distanceLabel?: string | null;
  /**
   * Either the legacy boolean (true → online, false → offline) or a
   * 3-state status string. Existing callers passing `online={t.online}`
   * keep working; pass `status="busy"` for the new orange state.
   */
  online: boolean | AvailabilityStatus;
  /** Cloudinary-enhanced image URLs. First is cover. Empty → photoBg only. */
  images?: string[];
  /** Fallback CSS background when `images` is empty (gradient placeholder). */
  photoBg: string;
  /** Round 28s52 — Optional working hours shown in the info overlay
   *  next to the distance row. e.g. "19:00 – 05:00 (overnight)". */
  workingHours?: string | null;
  /** Round 28s53 — Tapping the "Allow location" chip fires this to
   *  request a real GPS position. Once it resolves, the parent
   *  recomputes `distanceLabel`. */
  onRequestLocation?: () => void;
  /** Round 28s53 — Geolocation status drives the chip copy:
   *  idle/prompt → "Allow location", "prompt" while pending →
   *  "Locating…", "denied" → "Location off". */
  geoStatus?: "idle" | "prompt" | "ready" | "denied" | "unsupported";
}

const STATUS_COLORS: Record<AvailabilityStatus, { dot: string; label: string }> = {
  online: { dot: "#16a34a", label: "Online" },
  busy: { dot: "#f97316", label: "Busy" },
  offline: { dot: "#9ca3af", label: "Offline" },
};

function resolveStatus(input: boolean | AvailabilityStatus): AvailabilityStatus {
  if (typeof input === "string") return input;
  return input ? "online" : "offline";
}

const DetailHero: React.FC<Props> = ({
  name,
  age,
  area,
  distance,
  distanceLabel,
  online,
  images = [],
  photoBg,
  workingHours,
  onRequestLocation,
  geoStatus = "idle",
}) => {
  // 🆕 Round 28s219 — i18n for hardcoded Thai "ดูทั้งหมด" overlay
  //   (founder: "ทำไมเป็นภาษาไทย").
  const { t } = useTranslation();
  // 🆕 Round 28b33 — Prefer the new prop. Fall back to the legacy
  //   string for callers that haven't migrated yet.
  const resolvedLabel = distanceLabel ?? distance ?? null;
  const navigate = useNavigate();
  const [activeIdx, setActiveIdx] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  // ⋯ menu — combines Share + Save + Report into one anchor (was 3 buttons)
  const moreBtnRef = useRef<HTMLDivElement | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const photoCount = Math.max(images.length, 1);
  const currentImage = images[activeIdx];

  // 🆕 Round 28b6 — fullscreen viewer gestures.
  //   • horizontal scroll-snap pager → swipe to change photo
  //   • vertical drag > 80px → dismiss
  //   • tap dark backdrop → dismiss
  const fullscreenScrollRef = useRef<HTMLDivElement | null>(null);
  const heroTouchStartY = useRef<number | null>(null);
  const heroTouchStartX = useRef<number | null>(null);

  // When the fullscreen viewer opens, scroll to the currently active
  // photo so we land on what the user tapped (not always slide #0).
  React.useEffect(() => {
    if (!fullscreen) return;
    const id = window.requestAnimationFrame(() => {
      const el = fullscreenScrollRef.current;
      if (el) el.scrollLeft = activeIdx * el.clientWidth;
    });
    return () => window.cancelAnimationFrame(id);
  }, [fullscreen, activeIdx]);

  const handleFullscreenScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (!el.clientWidth) return;
    const idx = Math.round(el.scrollLeft / el.clientWidth);
    if (idx !== activeIdx && idx >= 0 && idx < photoCount) {
      setActiveIdx(idx);
    }
  };

  const handleHeroTouchStart = (e: React.TouchEvent) => {
    heroTouchStartY.current = e.touches[0].clientY;
    heroTouchStartX.current = e.touches[0].clientX;
  };
  const handleHeroTouchEnd = (e: React.TouchEvent) => {
    const startY = heroTouchStartY.current;
    const startX = heroTouchStartX.current;
    heroTouchStartY.current = null;
    heroTouchStartX.current = null;
    if (startY === null || startX === null) return;
    const dy = e.changedTouches[0].clientY - startY;
    const dx = Math.abs(e.changedTouches[0].clientX - startX);
    if (dy > 80 && dx < 60) setFullscreen(false);
  };

  const handleShare = async () => {
    if (typeof window === "undefined" || typeof navigator === "undefined") return;
    const url = window.location.href;
    const title = `SunRed · ${name}`;
    // 1. Try Web Share API (mobile native sheet)
    const nav = navigator as Navigator & {
      share?: (data: ShareData) => Promise<void>;
    };
    if (typeof nav.share === "function") {
      try {
        await nav.share({ title, url });
        return;
      } catch {
        // user cancelled — silent
        return;
      }
    }
    // 2. Fallback to clipboard copy + toast
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied");
    } catch {
      // clipboard blocked — silent
    }
  };

  // Background = either current Cloudinary image (in carousel mode) or the
  // original photoBg gradient. We render the image as the .bg layer so the
  // existing gradient overlay (::after radial + linear) sits on top.
  const bgValue = currentImage
    ? `center / cover no-repeat url("${currentImage}"), ${photoBg}`
    : photoBg;

  // 🆕 Round 28s30 (founder 2026-05-31) — Airbnb-style photo grid.
  //   Replaces the single full-bleed hero photo with a 1-big-left +
  //   2×2-small-right gallery preview. Tap any cell → fullscreen
  //   viewer opens on THAT photo. The bottom-right cell carries a
  //   "+N ดูทั้งหมด" overlay when more than 5 photos exist.
  //   Reference: founder-supplied resort booking screenshot
  //   ("P4 · 4 photos visible · +4 more").
  const previewCells = [0, 1, 2, 3, 4].map((i) => images[i] ?? null);
  const remaining = Math.max(0, images.length - 5);

  return (
    <>
      <Box
        sx={{
          // Round 28s37 — 4:3 landscape hero (shorter than the old 4:5).
          // Round 28s56 ("ตรงรูป ทำให้สวยขึ้น") — the photo block now
          // floats as a rounded card: side + top margin, 22px radius,
          // soft warm shadow. Reads premium (Airbnb listing hero)
          // instead of edge-to-edge.
          position: "relative",
          aspectRatio: "4 / 3",
          overflow: "hidden",
          margin: "8px 12px 0",
          borderRadius: "22px",
          boxShadow:
            "0 14px 34px rgba(15, 23, 42, 0.16), 0 2px 6px rgba(15, 23, 42, 0.08)",
        }}
      >
        {/* 🆕 28s30 — Airbnb-style 5-cell grid. Each cell tap opens
            fullscreen at its index.
            Round 28s59 — match the founder's resort reference: wider
            white gaps (7px) + per-cell rounded corners so the grid
            reads as 5 distinct framed photos, not one sliced image.
            Inner padding gives the gaps room to show as white. */}
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            display: "grid",
            gridTemplateColumns: "2fr 1fr 1fr",
            gridTemplateRows: "1fr 1fr",
            gap: "7px",
            padding: "7px",
            background: "#fff",
          }}
        >
          {previewCells.map((src, idx) => {
            const isBig = idx === 0;
            const isLastVisible = idx === 4;
            const showSeeAll = isLastVisible && remaining > 0;
            return (
              <Box
                key={idx}
                onClick={(e) => {
                  e.stopPropagation();
                  if (images.length === 0) return;
                  setActiveIdx(idx);
                  setFullscreen(true);
                }}
                sx={{
                  position: "relative",
                  ...(isBig
                    ? { gridColumn: "1", gridRow: "1 / span 2" }
                    : {}),
                  background: src
                    ? `center / cover no-repeat url("${src}")`
                    : "rgba(184, 92, 60, 0.08)",
                  cursor: images.length > 0 ? "zoom-in" : "default",
                  overflow: "hidden",
                  // Round 28s59 — per-cell rounding. Big-left gets a
                  // larger radius; the small cells a tighter one, like
                  // the resort reference's framed thumbnails.
                  borderRadius: isBig ? "14px" : "10px",
                  // Round 28s56 — subtle zoom + brighten on hover so the
                  // grid feels interactive (desktop / hover-capable).
                  transition: "transform 0.4s ease, filter 0.3s ease",
                  "@media (hover: hover)": {
                    "&:hover": {
                      transform: "scale(1.04)",
                      filter: "brightness(1.04)",
                    },
                  },
                  // Only the big cell carries the original ::after
                  // dark gradient so the bottom-of-card name overlay
                  // (rendered later, position absolute on the wrapper)
                  // still reads on the LEFT half where it sits.
                  ...(isBig && {
                    "&::after": {
                      content: '""',
                      position: "absolute",
                      inset: 0,
                      background: [
                        "radial-gradient(ellipse at 30% 25%, rgba(255, 255, 255, 0.18) 0%, transparent 50%)",
                        "linear-gradient(180deg, rgba(0, 0, 0, 0.15) 0%, transparent 30%, transparent 55%, rgba(0, 0, 0, 0.70) 100%)",
                      ].join(", "),
                      pointerEvents: "none",
                    },
                  }),
                }}
              >
                {showSeeAll && (
                  <Box
                    aria-hidden="true"
                    sx={{
                      // Round 28s59 — matches the founder's resort
                      // reference: dim scrim, "+N" in plain white
                      // above a solid brand-red "ดูทั้งหมด" pill.
                      position: "absolute",
                      inset: 0,
                      background: "rgba(20, 8, 12, 0.58)",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                      color: "#fff",
                      fontFamily: SANS,
                      backdropFilter: "blur(2px)",
                      WebkitBackdropFilter: "blur(2px)",
                    }}
                  >
                    <Box
                      component="span"
                      sx={{
                        fontFamily: SERIF,
                        fontSize: "30px",
                        fontWeight: 600,
                        lineHeight: 1,
                        textShadow: "0 2px 6px rgba(0,0,0,0.45)",
                      }}
                    >
                      +{remaining}
                    </Box>
                    <Box
                      component="span"
                      sx={{
                        padding: "5px 14px",
                        borderRadius: "999px",
                        background:
                          "#2D2D2B",
                        fontSize: "12px",
                        fontWeight: 800,
                        letterSpacing: "0.04em",
                        boxShadow: "0 6px 16px rgba(45, 45, 43, 0.34)",
                      }}
                    >
                      {t("detail.gallery.viewAll", "View all")}
                    </Box>
                  </Box>
                )}
              </Box>
            );
          })}
        </Box>

        {/* 🆕 Round 28b3 — Prev/Next chevrons removed from hero photo
            (founder feedback). Tap photo to open fullscreen viewer
            with thumbnail navigation; dot pager below indicates
            multiple photos. */}

        {/* .top-overlay */}
        <Box
          sx={{
            position: "absolute",
            top: "14px",
            left: "14px",
            right: "14px",
            zIndex: 3,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          {/* Round 28s47 — Back arrow: frame removed entirely
              (founder "arrow เอา กรอบ ออก"). MUI chevron icon stays
              for a proper arrow shape, white with a stronger 2-stop
              drop-shadow so the stroke holds up against any cell of
              the photo grid (light hair, sky, dark interior, etc.)
              without needing a background circle. Tap area kept at
              40×40 via padding so the affordance is still big. */}
          <Box
            role="button"
            tabIndex={0}
            aria-label="back"
            onClick={(e) => {
              e?.stopPropagation();
              void navigate(-1);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                void navigate(-1);
              }
            }}
            sx={{
              width: 40,
              height: 40,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "#fff",
              userSelect: "none",
              "&:focus-visible": {
                outline: "2px solid #fff",
                outlineOffset: 2,
                borderRadius: "8px",
              },
            }}
          >
            <ArrowBackIosNewRoundedIcon
              sx={{
                fontSize: 22,
                marginLeft: "3px",
                filter:
                  "drop-shadow(0 1px 2px rgba(0,0,0,0.55)) drop-shadow(0 2px 6px rgba(0,0,0,0.35))",
              }}
            />
          </Box>
          <Box ref={moreBtnRef}>
            <IconBtnGlass
              label="more"
              onClick={(e) => {
                e?.stopPropagation();
                setMenuOpen(true);
              }}
            >
              ⋯
            </IconBtnGlass>
          </Box>
        </Box>

        {/* .photo-dots — moved BELOW the status line (bottom 38px) so the
            top edge stays clean. Centered ~70% width, 2px tall, 3px gap
            for a more refined look — Instagram story bars but slimmer. */}
        <Box
          sx={{
            position: "absolute",
            bottom: "38px",
            left: "50%",
            transform: "translateX(-50%)",
            width: "70%",
            display: "flex",
            gap: "3px",
            zIndex: 3,
          }}
        >
          {Array.from({ length: photoCount }).map((_, i) => (
            <Box
              key={i}
              sx={{
                flex: 1,
                height: "2px",
                borderRadius: "2px",
                background:
                  i === activeIdx
                    ? "#fff"
                    : "rgba(255, 255, 255, 0.32)",
                transition: "background 0.2s ease",
              }}
            />
          ))}
        </Box>

        {/* .info-overlay — bottom 70px lifts the name+status above the
            StatsCard's -30px overlap zone (was 24px → got covered). */}
        <Box
          sx={{
            position: "absolute",
            bottom: "70px",
            left: "20px",
            right: "20px",
            zIndex: 3,
            color: "#fff",
          }}
        >
          {/* .name-line */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              marginBottom: "6px",
            }}
          >
            <Typography
              component="h1"
              sx={{
                fontFamily: SERIF,
                fontWeight: 500,
                fontSize: "30px",
                letterSpacing: "-0.02em",
                lineHeight: 1.0,
                "& em": {
                  fontStyle: "italic",
                  opacity: 0.85,
                  fontWeight: 400,
                  fontSize: "22px",
                },
              }}
            >
              {name} <em>{age}</em>
            </Typography>
            {/* 🆕 Round 28b3 — verified badge: white circle frame
                + Unicode tick → bare Twitter-blue checkmark icon
                with drop-shadow for separation from the photo. */}
            <VerifiedRoundedIcon
              aria-label="verified"
              titleAccess="Verified by SunRed"
              sx={{
                fontSize: 26,
                color: "#1d9bf0",
                filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.45))",
              }}
            />
          </Box>
          {/* .quick-meta */}
          <Box
            sx={{
              display: "flex",
              gap: "12px",
              fontSize: "11.5px",
              opacity: 0.95,
              fontWeight: 500,
              fontFamily: SANS,
            }}
          >
            {/* Round 28au — privacy: show only distance, never the area
                name. Exposing standby area indirectly leaks therapist
                home info. Distance ("1.2 km") gives the customer enough
                signal without the safety risk. */}
            {/* Round 28aw — always render the distance row. Falls back
                to "Allow location" prompt when GPS hasn't resolved yet
                so the customer knows the field exists + how to enable
                it. Privacy: still no area name, distance only. */}
            {/* Round 28s53 — Real GPS distance. When resolved, show
                "4 min • 1.2 km". When not yet granted, the chip is
                tappable and fires onRequestLocation; copy reflects
                geoStatus (Allow location / Locating… / Location off). */}
            <Box
              role={
                resolvedLabel?.trim() && resolvedLabel !== "—"
                  ? undefined
                  : "button"
              }
              tabIndex={
                resolvedLabel?.trim() && resolvedLabel !== "—"
                  ? undefined
                  : 0
              }
              onClick={(e) => {
                if (resolvedLabel?.trim() && resolvedLabel !== "—") return;
                if (geoStatus === "denied") return;
                e.stopPropagation();
                onRequestLocation?.();
              }}
              onKeyDown={(e) => {
                if (e.key !== "Enter" && e.key !== " ") return;
                if (resolvedLabel?.trim() && resolvedLabel !== "—") return;
                if (geoStatus === "denied") return;
                e.preventDefault();
                e.stopPropagation();
                onRequestLocation?.();
              }}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
                cursor:
                  resolvedLabel?.trim() && resolvedLabel !== "—"
                    ? "default"
                    : geoStatus === "denied"
                      ? "default"
                      : "pointer",
              }}
            >
              {resolvedLabel?.trim() && resolvedLabel !== "—" ? (
                <>
                  <LocationOnRoundedIcon sx={{ fontSize: 14 }} />
                  {resolvedLabel}
                </>
              ) : (
                <>
                  <NearMeRoundedIcon sx={{ fontSize: 14 }} />
                  {geoStatus === "prompt"
                    ? "Locating…"
                    : geoStatus === "denied"
                      ? "Location off"
                      : "Allow location"}
                </>
              )}
            </Box>
            {/* 🆕 Round 28s207 (audit #4) — Status dot removed from
                hero overlay. The StatusPill rendered below the
                StatsCard is the single source of truth for live
                status (Online/Busy/Offline + Next available). */}
            {/* Round 28s57 — Working hours moved OUT of the photo
                overlay (founder "ย้ายลงมาข้างล่าง"); it now renders
                below the StatsCard in TherapistDetailPage so the
                overlay row stays uncrowded (Allow location · status
                only). `workingHours` prop kept for back-compat but
                no longer rendered here. */}
          </Box>
        </Box>
      </Box>

      {/* 🆕 Round 28b6 — Fullscreen viewer redesigned for native
          gestures (founder spec, matches About-card lightbox):
            • Horizontal scroll-snap pager — swipe left/right between photos
            • Swipe DOWN > 80px → dismiss
            • Tap dark area around the photo → dismiss
            • Counter "3 / 9" + dot pager update live with scroll */}
      <Dialog
        open={fullscreen}
        onClose={() => setFullscreen(false)}
        fullScreen
        PaperProps={{
          sx: {
            background: "#000",
            display: "flex",
            flexDirection: "column",
            position: "relative",
          },
        }}
      >
        {/* Top bar — counter + close (pinned, doesn't scroll) */}
        <Box
          sx={{
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "calc(env(safe-area-inset-top, 0px) + 12px) 16px 12px",
            color: "#fff",
            fontFamily: SANS,
            zIndex: 2,
          }}
        >
          <Box sx={{ fontSize: 13, fontWeight: 600, opacity: 0.85 }}>
            {activeIdx + 1} / {Math.max(images.length, 1)}
          </Box>
          <IconButton
            aria-label="close"
            onClick={() => setFullscreen(false)}
            size="small"
            sx={{
              color: "#fff",
              background: "rgba(255, 255, 255, 0.15)",
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
              "&:hover": { background: "rgba(255, 255, 255, 0.25)" },
            }}
          >
            <CloseRoundedIcon />
          </IconButton>
        </Box>

        {/* Horizontal scroll pager — each slide = one full-screen
            photo. onScroll keeps `activeIdx` synced. Touch handlers
            detect downward swipe to dismiss. */}
        <Box
          ref={fullscreenScrollRef}
          onScroll={handleFullscreenScroll}
          onTouchStart={handleHeroTouchStart}
          onTouchEnd={handleHeroTouchEnd}
          sx={{
            flex: 1,
            display: "flex",
            overflowX: "auto",
            overflowY: "hidden",
            scrollSnapType: "x mandatory",
            WebkitOverflowScrolling: "touch",
            scrollbarWidth: "none",
            "&::-webkit-scrollbar": { display: "none" },
          }}
        >
          {(images.length > 0 ? images : [photoBg]).map((src, i) => (
            <Box
              key={`fs-${src}-${i}`}
              onClick={() => setFullscreen(false)}
              sx={{
                flexShrink: 0,
                width: "100%",
                height: "100%",
                scrollSnapAlign: "center",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "16px",
                boxSizing: "border-box",
                cursor: "pointer",
              }}
            >
              <Box
                component="img"
                src={src}
                alt={`${name} — SunRed practitioner in Bangkok, photo ${i + 1}`}
                loading={i === 0 ? "eager" : "lazy"}
                decoding="async"
                draggable={false}
                onClick={(e: React.MouseEvent) => e.stopPropagation()}
                sx={{
                  maxWidth: "100%",
                  maxHeight: "100%",
                  objectFit: "contain",
                  borderRadius: "12px",
                  boxShadow: "0 12px 36px rgba(0,0,0,0.5)",
                  cursor: "default",
                }}
              />
            </Box>
          ))}
        </Box>

        {/* Dot pager — updates live via activeIdx that handleFullscreenScroll bumps */}
        {images.length > 1 && (
          <Box
            sx={{
              position: "absolute",
              bottom: "calc(env(safe-area-inset-bottom, 0px) + 18px)",
              left: 0,
              right: 0,
              display: "flex",
              justifyContent: "center",
              gap: "6px",
              pointerEvents: "none",
            }}
          >
            {images.map((_, i) => (
              <Box
                key={i}
                sx={{
                  width: i === activeIdx ? 12 : 6,
                  height: 6,
                  borderRadius: 3,
                  background:
                    i === activeIdx ? "#fff" : "rgba(255, 255, 255, 0.4)",
                  transition: "all 0.2s ease",
                }}
              />
            ))}
          </Box>
        )}
      </Dialog>

      {/* ⋯ More menu — Share / Save / Report. Replaces the standalone
          ↗ Share button so the hero top row is just [← back] [⋯ more]. */}
      <Menu
        anchorEl={moreBtnRef.current}
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        PaperProps={{
          sx: {
            marginTop: "6px",
            minWidth: 180,
            borderRadius: "14px",
            background: "rgba(244, 246, 245, 0.96)",
            backdropFilter: "blur(20px) saturate(180%)",
            WebkitBackdropFilter: "blur(20px) saturate(180%)",
            border: "1px solid rgba(0, 0, 0, 0.06)",
            boxShadow: "0 12px 32px rgba(15, 23, 42, 0.18)",
          },
        }}
      >
        <MenuItem
          onClick={() => {
            setMenuOpen(false);
            void handleShare();
          }}
        >
          <ListItemIcon>
            <IosShareRoundedIcon
              fontSize="small"
              sx={{ color: "#1A2B2E" }}
            />
          </ListItemIcon>
          <ListItemText
            primaryTypographyProps={{
              sx: {
                fontFamily: SANS,
                fontSize: "13.5px",
                fontWeight: 600,
                color: "#1A2B2E",
              },
            }}
          >
            Share profile
          </ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => {
            setMenuOpen(false);
            // TODO Task 5 — wire to favoriteTherapists in users/{uid}
          }}
        >
          <ListItemIcon>
            <FavoriteBorderRoundedIcon
              fontSize="small"
              sx={{ color: "#2D2D2B" }}
            />
          </ListItemIcon>
          <ListItemText
            primaryTypographyProps={{
              sx: {
                fontFamily: SANS,
                fontSize: "13.5px",
                fontWeight: 600,
                color: "#1A2B2E",
              },
            }}
          >
            Save to favorites
          </ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => {
            setMenuOpen(false);
            // TODO Task 6 — open ReportPage with therapistId pre-filled
          }}
        >
          <ListItemIcon>
            <FlagOutlinedIcon
              fontSize="small"
              sx={{ color: "rgba(15, 23, 42, 0.7)" }}
            />
          </ListItemIcon>
          <ListItemText
            primaryTypographyProps={{
              sx: {
                fontFamily: SANS,
                fontSize: "13.5px",
                fontWeight: 600,
                color: "rgba(15, 23, 42, 0.7)",
              },
            }}
          >
            Report
          </ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
};

// .icon-btn-glass — small reusable
const IconBtnGlass: React.FC<{
  children: React.ReactNode;
  label: string;
  onClick?: (e?: React.MouseEvent) => void;
}> = ({ children, label, onClick }) => (
  <Box
    role="button"
    tabIndex={0}
    aria-label={label}
    onClick={onClick}
    sx={{
      width: "40px",
      height: "40px",
      borderRadius: "50%",
      background: "rgba(255, 255, 255, 0.18)",
      backdropFilter: "blur(20px) saturate(180%)",
      WebkitBackdropFilter: "blur(20px) saturate(180%)",
      border: "1px solid rgba(255, 255, 255, 0.3)",
      color: "#fff",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: "16px",
      cursor: "pointer",
      fontFamily: SANS,
    }}
  >
    {children}
  </Box>
);

export default DetailHero;
