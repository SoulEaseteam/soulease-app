// src/components/therapist/detail/DetailSections.tsx
//
// 🎨 Phase 2 Detail — middle body sections, each a verbatim port of one
// `.d-section` block from sunred-therapists2.html. Bundled for compactness;
// each export is structurally distinct per HANDOFF1.md (no consolidation
// of visual layers — each section's DOM matches its mockup `.d-section`).
//
// Exports: About, Credentials, Specialties, Languages, Pricing, Calendar, Reviews
//
// 🆕 Round 28b3 (founder 2026-05-03) — upgrade pass:
//   • Clean v3 palette — warm cream/coral borders → cool slate,
//     glass cards → solid white where contrast lifts the section.
//   • `Cred.icon` & `Spec.icon` widened from `string` to `ReactNode`
//     so callers can pass MUI icons instead of emoji (founder rule
//     "no emoji, icons only"). Strings still render as text for
//     backward compat.
//   • Reviews now render dynamic stars from each review's `rating`
//     value (was static 5★). Falls back to 5 when rating missing.
//   • Verified badge in review header — bare blue check, no white
//     circle frame (matches site-wide pattern).

import React, { useState } from "react";
import { Box, Typography, Dialog, IconButton } from "@mui/material";
import StarRoundedIcon from "@mui/icons-material/StarRounded";
import StarBorderRoundedIcon from "@mui/icons-material/StarBorderRounded";
import VerifiedRoundedIcon from "@mui/icons-material/VerifiedRounded";
import FemaleRoundedIcon from "@mui/icons-material/FemaleRounded";
import MaleRoundedIcon from "@mui/icons-material/MaleRounded";
import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import { useTranslation } from "react-i18next";

const SERIF = '"Federo", "Italiana", "Cinzel", "Fraunces", Georgia, "Times New Roman", serif';
const SANS = '"Inter", system-ui, -apple-system, sans-serif';

/** 5-star row that reflects an actual numeric rating (rounded to int). */
const StarRow: React.FC<{ rating: number; size?: number }> = ({
  rating,
  size = 13,
}) => {
  const filled = Math.max(0, Math.min(5, Math.round(rating)));
  return (
    <Box
      sx={{
        display: "inline-flex",
        alignItems: "center",
        color: "#FBBF24",
        gap: "1px",
      }}
      aria-label={`${filled} out of 5 stars`}
    >
      {Array.from({ length: 5 }).map((_, i) =>
        i < filled ? (
          <StarRoundedIcon key={i} sx={{ fontSize: size }} />
        ) : (
          <StarBorderRoundedIcon
            key={i}
            sx={{ fontSize: size, color: "rgba(15, 23, 42, 0.20)" }}
          />
        )
      )}
    </Box>
  );
};

// shared .d-section + h2 wrapper
const DSectionH2: React.FC<{ children: React.ReactNode; em?: string }> = ({
  children,
  em,
}) => (
  <Typography
    component="h2"
    sx={{
      fontFamily: SERIF,
      fontWeight: 500,
      fontSize: "17px",
      color: "#1A2B2E",
      marginBottom: "8px",
      letterSpacing: "-0.01em",
      "& em": { fontStyle: "italic", color: "#B4000A", fontWeight: 500 },
    }}
  >
    {children}
    {em && (
      <>
        {" "}
        <em>{em}</em>
      </>
    )}
  </Typography>
);

const dSection = { padding: "0 20px 20px" } as const;

// ─── About ───
// 🆕 Round 28ak (founder 2026-05-03) — structured facts with category
// colors. Round 28b3 — moved from chip-per-fact to ROW-PER-CATEGORY
// layout per founder spec. Three semantic rows make the card scannable:
//   Row 1 (work):   Part-time therapist / 09:00–22:00
//   Row 2 (body):   Female / 160 cm / Slim / Bust C / Olive
//   Row 3 (origin): Thai · English · 中文
// Each row shows an icon left + " · "-joined parts right.

export type AboutFact = {
  /** MUI icon component, or React node (kept generic for emoji fallback). */
  icon: React.ReactNode;
  /** Display text, e.g. "Full-time therapist", "160 cm · Slim build". */
  text: string;
  /** Category — drives the chip background tint. */
  tone: "work" | "ethnicity" | "body" | "language" | "hours" | "gender";
};

/** Round 28b3 — new row-based shape. Each row groups multiple parts. */
export type AboutRow = {
  icon: React.ReactNode;
  tone: "work" | "ethnicity" | "body" | "language" | "hours" | "gender";
  /** Pieces joined by " · "; nullish/empty entries dropped. */
  parts: (string | null | undefined | false)[];
};

const TONE_STYLES: Record<
  AboutFact["tone"],
  { iconBg: string; iconColor: string }
> = {
  work: {
    iconBg: "rgba(214, 40, 40, 0.12)",
    iconColor: "#4A5568",
  },
  ethnicity: {
    iconBg: "rgba(22, 163, 74, 0.12)",
    iconColor: "#16a34a",
  },
  body: {
    iconBg: "rgba(15, 23, 42, 0.10)",
    iconColor: "#B4000A",
  },
  language: {
    iconBg: "rgba(14, 165, 233, 0.10)",
    iconColor: "#0284C7",
  },
  hours: {
    iconBg: "rgba(245, 158, 11, 0.12)",
    iconColor: "#B45309",
  },
  gender: {
    iconBg: "rgba(168, 85, 247, 0.10)",
    iconColor: "#9333EA",
  },
};

export const About: React.FC<{
  name: string;
  /** Legacy chip API — still rendered when `rows` not provided. */
  facts?: AboutFact[];
  /** New row API — each row shows icon + parts joined by " · ". */
  rows?: AboutRow[];
  /** Legacy prop — plain body fallback during migration window. */
  body?: string;
  /** 🆕 Round 28b4 — gender drives the small icon shown next to the
   *  therapist's italic name in the section title. Accepts "Female",
   *  "Male", or any falsy value (no icon). Case-insensitive. */
  gender?: string | null;
  /** 🆕 Round 28b5 — gallery photos embedded INSIDE the card.
   *  Hidden by default; revealed alongside Row 2/Row 3 when the
   *  card is expanded. Tap any tile to open the fullscreen viewer
   *  (thumbnail strip nav, no prev/next arrows — same lightbox the
   *  standalone GalleryTile used). */
  images?: string[];
  /** Optional Cloudinary helper — receives raw url + mode and
   *  returns a sized URL. When omitted, raw url is used as-is. */
  enhance?: (url: string, mode: "thumb" | "hero") => string;
  /** Override base alt text for gallery images (defaults to name). */
  galleryAltBase?: string;
}> = ({
  name,
  facts = [],
  rows = [],
  body,
  gender,
  images = [],
  enhance,
  galleryAltBase,
}) => {
  const { t } = useTranslation();
  // Round 28s31 (founder 2026-05-31, "ตรงเกี่ยวกับ ปรับใหม่") —
  // Collapse removed. The card now shows ALL rows from first render
  // so guests don't have to tap to discover height / body / language
  // / area. The embedded gallery is also dropped here because the
  // Round 28s30 DetailHero Airbnb grid already exposes every photo.
  const [expanded, setExpanded] = React.useState(true);
  // Round 28b5 — embedded gallery lightbox state.
  const [openIdx, setOpenIdx] = React.useState<number | null>(null);
  // Round 28b6 — track which page the horizontal scroller is on so
  //   the counter "3 / 9" stays in sync as the user swipes between
  //   photos. Initialised from openIdx whenever the lightbox opens.
  const [currentIdx, setCurrentIdx] = React.useState(0);
  const scrollRef = React.useRef<HTMLDivElement | null>(null);
  // Touch state for vertical swipe-to-dismiss.
  const touchStartY = React.useRef<number | null>(null);
  const touchStartX = React.useRef<number | null>(null);
  const validImages = (images ?? []).filter(Boolean);
  const thumbUrl = (u: string) => (enhance ? enhance(u, "thumb") : u);
  const heroUrl = (u: string) => (enhance ? enhance(u, "hero") : u);
  const altBase = galleryAltBase ?? `${name} photo`;

  // When the lightbox opens, jump the scroller to the tapped index
  // and seed the counter. Re-runs only on open events.
  React.useEffect(() => {
    if (openIdx === null) return;
    setCurrentIdx(openIdx);
    // Defer to next paint so the scroller has its width measured.
    const id = window.requestAnimationFrame(() => {
      const el = scrollRef.current;
      if (el) el.scrollLeft = openIdx * el.clientWidth;
    });
    return () => window.cancelAnimationFrame(id);
  }, [openIdx]);

  const handleLightboxScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (!el.clientWidth) return;
    const idx = Math.round(el.scrollLeft / el.clientWidth);
    if (
      idx !== currentIdx &&
      idx >= 0 &&
      idx < validImages.length
    ) {
      setCurrentIdx(idx);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const startY = touchStartY.current;
    const startX = touchStartX.current;
    touchStartY.current = null;
    touchStartX.current = null;
    if (startY === null || startX === null) return;
    const dy = e.changedTouches[0].clientY - startY;
    const dx = Math.abs(e.changedTouches[0].clientX - startX);
    // Downward drag > 80px and not predominantly horizontal → dismiss.
    if (dy > 80 && dx < 60) setOpenIdx(null);
  };

  // Hide the whole section when there's nothing real to show.
  if (
    rows.length === 0 &&
    facts.length === 0 &&
    !body?.trim() &&
    validImages.length === 0
  )
    return null;

  // Filter out empty rows (no real parts → don't render).
  const realRows = rows
    .map((r) => ({
      ...r,
      parts: r.parts
        .map((p) => (typeof p === "string" ? p.trim() : ""))
        .filter((p): p is string => Boolean(p)),
    }))
    .filter((r) => r.parts.length > 0);

  // Round 28s31 — Card no longer collapses; all rows render at
  // once and the embedded gallery is hidden (hero handles photos).
  const hasMoreRows = false;
  const visibleRows = realRows;

  // 🆕 Gender icon next to the italic name in the title.
  const g = (gender ?? "").toLowerCase();
  const GenderIcon =
    g === "female" || g === "f"
      ? FemaleRoundedIcon
      : g === "male" || g === "m"
      ? MaleRoundedIcon
      : null;

  return (
    <Box sx={dSection}>
      {/* 🆕 Round 28b4 — title row with gender icon trailing the
          italic name. Wrapped in flex so the icon sits on the same
          baseline as the name. */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          flexWrap: "wrap",
        }}
      >
        <DSectionH2 em={name}>{t("detail.about.title", "About")}</DSectionH2>
        {GenderIcon && (
          <GenderIcon
            aria-label={`${gender} therapist`}
            sx={{
              fontSize: 18,
              color: g.startsWith("m") ? "#1d9bf0" : "#FE5A8C",
              marginBottom: "6px",
              flexShrink: 0,
            }}
          />
        )}
      </Box>

      {/* 🆕 Round 28b4 — collapsible card. Showing Row 1 only by
          default keeps the booking CTA in the first fold. Tap card
          to reveal Row 2 + Row 3; chevron rotates. */}
      <Box
        role={hasMoreRows ? "button" : undefined}
        aria-expanded={hasMoreRows ? expanded : undefined}
        tabIndex={hasMoreRows ? 0 : undefined}
        onClick={() => hasMoreRows && setExpanded((v) => !v)}
        onKeyDown={(e: React.KeyboardEvent) => {
          if (!hasMoreRows) return;
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setExpanded((v) => !v);
          }
        }}
        sx={{
          // Round 28s52 (founder "เปลี่ยน ให้เหมือน Credentials")
          // — Card chrome removed. Rows live directly on the page
          // surface like the Credentials / Specialties /
          // Languages sections below; the divider lines between
          // rows are enough visual structure.
          marginTop: "14px",
          padding: "0 4px",
          display: "flex",
          flexDirection: "column",
          userSelect: "none",
        }}
      >
        {realRows.length > 0 ? (
          <>
            {visibleRows.map((r, i) => {
              const tone = TONE_STYLES[r.tone];
              return (
                <Box
                  key={i}
                  sx={{
                    // Round 28s32 — bigger row breathing room, soft
                    // clay-tinted divider, slightly larger icon
                    // chip + name text for easier scan.
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "10px 0",
                    borderTop:
                      i === 0
                        ? "none"
                        : "1px solid rgba(184, 92, 60, 0.10)",
                  }}
                >
                  <Box
                    sx={{
                      width: 32,
                      height: 32,
                      borderRadius: "50%",
                      background: tone.iconBg,
                      color: tone.iconColor,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      "& svg": { fontSize: "17px" },
                    }}
                  >
                    {r.icon}
                  </Box>
                  <Box
                    sx={{
                      flex: 1,
                      minWidth: 0,
                      fontFamily: SANS,
                      fontSize: "13px",
                      fontWeight: 600,
                      color: "#1A2B2E",
                      letterSpacing: "0.005em",
                      lineHeight: 1.45,
                    }}
                  >
                    {r.parts.map((part, idx) => (
                      <React.Fragment key={idx}>
                        {idx > 0 && (
                          <Box
                            component="span"
                            sx={{
                              color: "rgba(184, 92, 60, 0.45)",
                              margin: "0 8px",
                              fontWeight: 400,
                            }}
                          >
                            ·
                          </Box>
                        )}
                        <span>{part}</span>
                      </React.Fragment>
                    ))}
                  </Box>
                </Box>
              );
            })}
            {/* Round 28s31 — Embedded gallery removed. DetailHero
                Airbnb grid (28s30) now owns photo browsing. */}
          </>
        ) : facts.length > 0 ? (
          // Legacy chip layout — kept for any caller that hasn't migrated
          // to the new `rows` API.
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {facts.map((f, i) => {
              const tone = TONE_STYLES[f.tone];
              return (
                <Box
                  key={i}
                  sx={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "6px 10px 6px 6px",
                    borderRadius: "999px",
                    background: tone.iconBg,
                    border: `1px solid ${tone.iconBg}`,
                  }}
                >
                  <Box
                    sx={{
                      width: 20,
                      height: 20,
                      borderRadius: "50%",
                      background: tone.iconBg,
                      color: tone.iconColor,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      "& svg": { fontSize: "13px" },
                    }}
                  >
                    {f.icon}
                  </Box>
                  <Box
                    sx={{
                      fontFamily: SANS,
                      fontSize: "11.5px",
                      fontWeight: 600,
                      color: "rgba(15, 23, 42, 0.85)",
                    }}
                  >
                    {f.text}
                  </Box>
                </Box>
              );
            })}
          </Box>
        ) : (
          <Box
            component="p"
            sx={{
              fontFamily: SANS,
              fontSize: "13px",
              color: "rgba(15, 23, 42, 0.72)",
              lineHeight: 1.55,
              margin: 0,
            }}
          >
            {body}
          </Box>
        )}
      </Box>

      {/* 🆕 Round 28b6 — Lightbox redesigned for native gestures
          (founder spec):
            • Horizontal scroll-snap pages all photos — swipe left/right
            • Swipe DOWN > 80px → dismiss (touch tracking)
            • Tap dark backdrop around the photo → dismiss
            • Counter "3 / 9" updates live as user swipes
          Thumbnail strip removed; horizontal swipe is the primary nav. */}
      <Dialog
        open={openIdx !== null}
        onClose={() => setOpenIdx(null)}
        fullScreen
        PaperProps={{
          sx: {
            background: "rgba(0, 0, 0, 0.95)",
            display: "flex",
            flexDirection: "column",
          },
        }}
      >
        {/* Top bar — counter + close. Pinned, doesn't scroll. */}
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
            {currentIdx + 1} / {validImages.length}
          </Box>
          <IconButton
            aria-label="close gallery"
            onClick={() => setOpenIdx(null)}
            size="small"
            sx={{
              background: "rgba(255,255,255,0.12)",
              color: "#fff",
              "&:hover": { background: "rgba(255,255,255,0.2)" },
            }}
          >
            <CloseRoundedIcon />
          </IconButton>
        </Box>

        {/* Horizontal scroll pager — each slide is one full-screen
            photo. Touch handlers detect downward swipe to dismiss. */}
        <Box
          ref={scrollRef}
          onScroll={handleLightboxScroll}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          sx={{
            flex: 1,
            display: "flex",
            overflowX: "auto",
            overflowY: "hidden",
            scrollSnapType: "x mandatory",
            WebkitOverflowScrolling: "touch",
            scrollbarWidth: "none",
            "&::-webkit-scrollbar": { display: "none" },
            paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 14px)",
          }}
        >
          {validImages.map((src, i) => (
            <Box
              key={`slide-${src}-${i}`}
              // Tap on the dark area around the image → close.
              //   Image itself ignores the click via stopPropagation.
              onClick={() => setOpenIdx(null)}
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
                src={heroUrl(src)}
                alt={`${altBase} ${i + 1}`}
                draggable={false}
                onClick={(e: React.MouseEvent) => e.stopPropagation()}
                loading={i === openIdx ? "eager" : "lazy"}
                decoding="async"
                sx={{
                  maxWidth: "100%",
                  maxHeight: "100%",
                  objectFit: "contain",
                  borderRadius: "12px",
                  boxShadow: "0 12px 36px rgba(0,0,0,0.5)",
                  cursor: "default",
                  // Pointer events still active so e.stopPropagation
                  // above can fire — without it, tapping the image
                  // bubbles to the slide handler and closes.
                }}
              />
            </Box>
          ))}
        </Box>
      </Dialog>
    </Box>
  );
};

// ─── Gallery (legacy standalone tile) ───
// 🆕 Round 28b3 — standalone photo gallery section. Round 28b5: this
//   is now LEGACY because the gallery moved INSIDE the About card.
//   Kept as a named export in case any other surface wants the
//   standalone tile.
export const GalleryTile: React.FC<{
  images: string[];
  /** Per-image alt text base — e.g. "Yuri photo". Index appended. */
  altBase?: string;
  /** Optional cloudinary helper — receives raw url, returns sized url.
   *  When omitted, the raw url is rendered as-is. */
  enhance?: (url: string, mode: "thumb" | "hero") => string;
}> = ({ images, altBase = "Therapist photo", enhance }) => {
  const { t } = useTranslation();
  const [openIdx, setOpenIdx] = React.useState<number | null>(null);
  const validImages = images.filter(Boolean);
  if (validImages.length === 0) return null;

  const thumbUrl = (u: string) =>
    enhance ? enhance(u, "thumb") : u;
  const heroUrl = (u: string) =>
    enhance ? enhance(u, "hero") : u;

  return (
    <Box sx={dSection}>
      <DSectionH2>
        {t("detail.gallery.title", "Gallery")}{" "}
        <Box
          component="span"
          sx={{
            color: "rgba(15, 23, 42, 0.55)",
            fontWeight: 400,
            fontSize: "13px",
            fontFamily: SANS,
          }}
        >
          · {validImages.length}
        </Box>
      </DSectionH2>

      {/* 🆕 Round 28b3 — Single-row horizontal scroll strip. Founder
          feedback: "มันดูรกไป" — a 3-col grid of 10 photos pushed
          the booking CTA off-screen. Strip shows ~2.5 photos at a
          time, scrolls horizontally, native momentum on touch.
          Each tile is 4:5 portrait (~144px tall) so the section
          adds just one row of vertical space. Tap → lightbox. */}
      <Box
        sx={{
          marginTop: "10px",
          display: "flex",
          gap: "8px",
          overflowX: "auto",
          paddingBottom: "4px",
          scrollSnapType: "x mandatory",
          WebkitOverflowScrolling: "touch",
          scrollbarWidth: "none",
          "&::-webkit-scrollbar": { display: "none" },
        }}
      >
        {validImages.map((src, i) => (
          <Box
            key={`${src}-${i}`}
            role="button"
            aria-label={`Open ${altBase} ${i + 1}`}
            tabIndex={0}
            onClick={() => setOpenIdx(i)}
            onKeyDown={(e: React.KeyboardEvent) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setOpenIdx(i);
              }
            }}
            sx={{
              flexShrink: 0,
              position: "relative",
              width: 116,
              aspectRatio: "4 / 5",
              scrollSnapAlign: "start",
              borderRadius: "12px",
              overflow: "hidden",
              cursor: "pointer",
              background: "#F1F3F5",
              border: "1px solid rgba(15, 23, 42, 0.06)",
              transition: "transform 0.15s ease, box-shadow 0.15s ease",
              "&:hover": {
                transform: "translateY(-1px)",
                boxShadow: "0 6px 18px rgba(15, 23, 42, 0.12)",
              },
              "&:focus-visible": {
                outline: "2px solid #B4000A",
                outlineOffset: 2,
              },
            }}
          >
            <Box
              component="img"
              src={thumbUrl(src)}
              alt={`${altBase} ${i + 1}`}
              loading="lazy"
              decoding="async"
              draggable={false}
              sx={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
              }}
            />
            {/* Show "+N" overlay on the 3rd tile when there are more
                images out of view — gentle nudge that the strip is
                scrollable horizontally. */}
            {i === 2 && validImages.length > 3 && (
              <Box
                aria-hidden="true"
                sx={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "rgba(15, 23, 42, 0.55)",
                  color: "#fff",
                  fontFamily: SANS,
                  fontSize: 18,
                  fontWeight: 700,
                  letterSpacing: "0.02em",
                  textShadow: "0 1px 4px rgba(0,0,0,0.25)",
                }}
              >
                +{validImages.length - 3}
              </Box>
            )}
          </Box>
        ))}
      </Box>

      {/* Lightbox — full image + thumbnail strip, no prev/next buttons */}
      <Dialog
        open={openIdx !== null}
        onClose={() => setOpenIdx(null)}
        fullScreen
        PaperProps={{
          sx: {
            background: "rgba(0, 0, 0, 0.95)",
            display: "flex",
            flexDirection: "column",
          },
        }}
      >
        {/* Top bar */}
        <Box
          sx={{
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "calc(env(safe-area-inset-top, 0px) + 12px) 16px 12px",
            color: "#fff",
            fontFamily: SANS,
          }}
        >
          <Box sx={{ fontSize: 12, opacity: 0.7 }}>
            {(openIdx ?? 0) + 1} / {validImages.length}
          </Box>
          <IconButton
            aria-label="close gallery"
            onClick={() => setOpenIdx(null)}
            size="small"
            sx={{
              background: "rgba(255,255,255,0.12)",
              color: "#fff",
              "&:hover": { background: "rgba(255,255,255,0.2)" },
            }}
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
          }}
        >
          {openIdx !== null && (
            <Box
              component="img"
              src={heroUrl(validImages[openIdx])}
              alt={`${altBase} ${openIdx + 1}`}
              loading="lazy"
              decoding="async"
              sx={{
                maxWidth: "100%",
                maxHeight: "100%",
                objectFit: "contain",
                borderRadius: "12px",
                boxShadow: "0 16px 40px rgba(15, 23, 42, 0.36)",
              }}
            />
          )}
        </Box>

        {/* Thumbnail strip */}
        {validImages.length > 1 && (
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
            {validImages.map((src, i) => (
              <Box
                key={`thumb-${src}-${i}`}
                role="button"
                aria-label={`Photo ${i + 1}`}
                onClick={() => setOpenIdx(i)}
                sx={{
                  flexShrink: 0,
                  width: 56,
                  height: 56,
                  borderRadius: "8px",
                  overflow: "hidden",
                  cursor: "pointer",
                  border:
                    i === openIdx
                      ? "2px solid #B4000A"
                      : "2px solid transparent",
                  opacity: i === openIdx ? 1 : 0.55,
                  transition: "opacity 0.15s ease, border-color 0.15s ease",
                  "&:hover": { opacity: 0.9 },
                }}
              >
                <Box
                  component="img"
                  src={thumbUrl(src)}
                  alt=""
                  draggable={false}
                  loading="lazy"
                  decoding="async"
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
      </Dialog>
    </Box>
  );
};

// ─── Credentials ───
// 🆕 Round 28b3 — `icon` widened from string-only to ReactNode so
//   callers can pass MUI icon components (founder "no emoji" rule).
//   Strings render as text for backward compat. Cool-palette card
//   with neutral slate border instead of frosty glass.
type Cred = { icon: React.ReactNode; label: string; meta: string };
export const Credentials: React.FC<{ creds: Cred[] }> = ({ creds }) => {
  const { t } = useTranslation();
  if (creds.length === 0) return null;
  return (
    <Box sx={dSection}>
      <DSectionH2>{t("detail.creds.title", "Credentials")}</DSectionH2>
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          marginTop: "10px",
        }}
      >
        {creds.map((c, i) => (
          <Box
            key={i}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "10px 12px",
              background: "#FFFFFF",
              border: "1px solid rgba(15, 23, 42, 0.06)",
              boxShadow: "0 1px 2px rgba(15, 23, 42, 0.03)",
              borderRadius: "12px",
            }}
          >
            <Box
              sx={{
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                background: "rgba(22, 163, 74, 0.12)",
                color: "#16a34a",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "14px",
                flexShrink: 0,
                "& svg": { fontSize: "18px" },
              }}
            >
              {c.icon}
            </Box>
            <Box sx={{ flex: 1 }}>
              <Box
                sx={{
                  fontFamily: SANS,
                  fontSize: "12px",
                  fontWeight: 700,
                  color: "#1A2B2E",
                  marginBottom: "1px",
                }}
              >
                {c.label}
              </Box>
              <Box
                sx={{
                  fontFamily: SANS,
                  fontSize: "10.5px",
                  color: "rgba(15, 23, 42, 0.72)",
                }}
              >
                {c.meta}
              </Box>
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

// ─── Specialties ───
// 🆕 Round 28b3 — `icon` widened to ReactNode + Clean v3 card.
//   `yrs` rendered only when non-empty (caller passes "" when admin
//   hasn't verified service-experience counts — Strategy B).
type Spec = { icon: React.ReactNode; name: string; yrs: string };
export const Specialties: React.FC<{ specs: Spec[] }> = ({ specs }) => {
  const { t } = useTranslation();
  if (specs.length === 0) return null;
  return (
    <Box sx={dSection}>
      <DSectionH2>{t("detail.specs.title", "Specialties")}</DSectionH2>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "8px",
        }}
      >
        {specs.map((s, i) => (
          <Box
            key={i}
            sx={{
              padding: "12px",
              background: "#FFFFFF",
              border: "1px solid rgba(15, 23, 42, 0.06)",
              boxShadow: "0 1px 2px rgba(15, 23, 42, 0.03)",
              borderRadius: "14px",
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                background:
                  "rgba(180, 0, 10, 0.09)",
                color: "#B4000A",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "20px",
                flexShrink: 0,
                "& svg": { fontSize: "18px" },
              }}
            >
              {s.icon}
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Box
                sx={{
                  fontFamily: SERIF,
                  fontWeight: 500,
                  fontSize: "13px",
                  color: "#1A2B2E",
                  lineHeight: 1.2,
                }}
              >
                {s.name}
              </Box>
              {s.yrs && (
                <Box
                  sx={{
                    fontFamily: SANS,
                    fontSize: "9.5px",
                    color: "rgba(15, 23, 42, 0.72)",
                    fontWeight: 600,
                    marginTop: "2px",
                  }}
                >
                  {s.yrs}
                </Box>
              )}
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

// ─── Languages ───
// 🆕 Round 27 — emoji flags dropped (Round 15 mandate). Each row now uses
//    a 2-letter brand-tinted code disc instead. Hide section if no langs.
type Lang = { flag: string; name: string; level: string };
const LANG_CODE: Record<string, string> = {
  English: "EN",
  Thai: "TH",
  "中文": "中",
  "日本語": "日",
  "한국어": "한",
};
export const Languages: React.FC<{ langs: Lang[] }> = ({ langs }) => {
  const { t } = useTranslation();
  if (langs.length === 0) return null;
  return (
    <Box sx={dSection}>
      <DSectionH2>{t("detail.langs.title", "Languages")}</DSectionH2>
      <Box sx={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        {langs.map((l, i) => (
          <Box
            key={i}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "8px 12px",
              background: "#FFFFFF",
              borderRadius: "10px",
              border: "1px solid rgba(15, 23, 42, 0.06)",
              boxShadow: "0 1px 2px rgba(15, 23, 42, 0.03)",
            }}
          >
            <Box
              sx={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "#B4000A",
                color: "#fff",
                fontFamily: SANS,
                fontSize: "11px",
                fontWeight: 800,
                letterSpacing: "0.02em",
                flexShrink: 0,
                boxShadow: "0 2px 6px rgba(15, 23, 42, 0.22)",
              }}
            >
              {LANG_CODE[l.name] ?? l.name.slice(0, 2).toUpperCase()}
            </Box>
            <Box
              sx={{
                flex: 1,
                fontFamily: SANS,
                fontSize: "12.5px",
                fontWeight: 600,
                color: "#1A2B2E",
              }}
            >
              {l.name}
            </Box>
            <Box
              sx={{
                fontFamily: SANS,
                fontSize: "10px",
                color: "#4A5568",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              {l.level}
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

// ─── Pricing ───
// 🆕 Round 27 — hide section if no real pricing rows (no MAI fallback).
type Price = { name: string; duration: string; price: string };
export const Pricing: React.FC<{ items: Price[] }> = ({ items }) => {
  const { t } = useTranslation();
  if (items.length === 0) return null;
  return (
    <Box sx={dSection}>
      <DSectionH2>{t("detail.pricing.title", "Pricing")}</DSectionH2>
      <Box sx={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        {items.map((p, i) => (
          <Box
            key={i}
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 14px",
              background: "#FFFFFF",
              borderRadius: "12px",
              border: "1px solid rgba(15, 23, 42, 0.06)",
              boxShadow: "0 1px 2px rgba(15, 23, 42, 0.03)",
            }}
          >
            <Box>
              <Box
                sx={{
                  fontFamily: SERIF,
                  fontWeight: 500,
                  fontSize: "13px",
                  color: "#1A2B2E",
                }}
              >
                {p.name}
              </Box>
              <Box
                sx={{
                  fontFamily: SANS,
                  fontSize: "10px",
                  color: "rgba(15, 23, 42, 0.72)",
                  marginTop: "1px",
                }}
              >
                {p.duration}
              </Box>
            </Box>
            <Box
              sx={{
                fontFamily: SERIF,
                fontWeight: 600,
                fontSize: "14px",
                color: "#B4000A",
                letterSpacing: "-0.02em",
              }}
            >
              {p.price}
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

// ─── Calendar (day pills + slot grid) ───
type Day = { dow: string; num: string; unavailable?: boolean };
type Slot = { time: string; taken?: boolean };

interface CalendarProps {
  days: Day[];
  slots: Slot[];
}
export const Calendar: React.FC<CalendarProps> = ({ days, slots }) => {
  const { t } = useTranslation();
  const [activeDay, setActiveDay] = useState(0);
  const [activeSlot, setActiveSlot] = useState<number | null>(3);

  return (
    <Box sx={dSection}>
      <DSectionH2 em={t("detail.calendar.subtitle", "today & tomorrow")}>
        {t("detail.calendar.title", "Available")}
      </DSectionH2>

      {/* .calendar-row */}
      <Box
        sx={{
          display: "flex",
          gap: "6px",
          overflowX: "auto",
          paddingBottom: "4px",
          marginBottom: "12px",
          scrollbarWidth: "none",
          "&::-webkit-scrollbar": { display: "none" },
        }}
      >
        {days.map((d, i) => {
          const active = activeDay === i;
          return (
            <Box
              key={i}
              role="button"
              tabIndex={0}
              onClick={() => !d.unavailable && setActiveDay(i)}
              sx={{
                flexShrink: 0,
                padding: "8px 10px",
                borderRadius: "12px",
                background: active
                  ? "#B4000A"
                  : "#FFFFFF",
                border: active
                  ? "1px solid rgba(255, 255, 255, 0.4)"
                  : "1px solid rgba(15, 23, 42, 0.06)",
                textAlign: "center",
                minWidth: "50px",
                cursor: d.unavailable ? "not-allowed" : "pointer",
                opacity: d.unavailable ? 0.45 : 1,
                boxShadow: active
                  ? "0 4px 12px rgba(15, 23, 42, 0.35)"
                  : "0 1px 2px rgba(15, 23, 42, 0.03)",
              }}
            >
              <Box
                sx={{
                  fontFamily: SANS,
                  fontSize: "9.5px",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  color: active ? "rgba(255, 255, 255, 0.85)" : "rgba(15, 23, 42, 0.72)",
                }}
              >
                {d.dow}
              </Box>
              <Box
                sx={{
                  fontFamily: SERIF,
                  fontWeight: 600,
                  fontSize: "16px",
                  color: active ? "#fff" : "#1A2B2E",
                  marginTop: "1px",
                }}
              >
                {d.num}
              </Box>
            </Box>
          );
        })}
      </Box>

      {/* .slot-grid */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "6px",
        }}
      >
        {slots.map((s, i) => {
          const active = activeSlot === i;
          return (
            <Box
              key={i}
              role="button"
              tabIndex={0}
              onClick={() => !s.taken && setActiveSlot(i)}
              sx={{
                padding: "8px 4px",
                borderRadius: "10px",
                background: active
                  ? "#B4000A"
                  : "#FFFFFF",
                border: active
                  ? "1px solid rgba(255, 255, 255, 0.4)"
                  : "1px solid rgba(15, 23, 42, 0.06)",
                textAlign: "center",
                fontFamily: SANS,
                fontSize: "11px",
                fontWeight: 700,
                color: active ? "#fff" : "#1A2B2E",
                cursor: s.taken ? "not-allowed" : "pointer",
                ...(s.taken && { opacity: 0.4, textDecoration: "line-through" }),
                boxShadow: active
                  ? "0 4px 12px rgba(15, 23, 42, 0.30)"
                  : "0 1px 2px rgba(15, 23, 42, 0.03)",
              }}
            >
              {s.time}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};

// ─── Reviews ───
type Bucket = { num: number; count: number; pct: number };
// 🆕 Round 28b3 — added optional `rating` so review cards can render
//   the ACTUAL stars given (not a static 5★). Falls back to 5 when
//   the caller doesn't pass it. `flag` is optional too — we'll
//   eventually drop emoji flags.
type Review = {
  initial: string;
  name: string;
  flag?: string;
  meta: string;
  quote: string;
  rating?: number;
};
interface ReviewsProps {
  rating: string;
  total: number;
  buckets: Bucket[];
  reviews: Review[];
}
export const Reviews: React.FC<ReviewsProps> = ({ rating, total, buckets, reviews }) => {
  const { t } = useTranslation();
  return (
    <Box sx={dSection}>
      <Typography
        component="h2"
        sx={{
          fontFamily: SERIF,
          fontWeight: 500,
          fontSize: "17px",
          color: "#1A2B2E",
          marginBottom: "8px",
          letterSpacing: "-0.01em",
        }}
      >
        {t("detail.reviews.title", "Reviews")}{" "}
        <Box
          component="span"
          sx={{
            color: "rgba(15, 23, 42, 0.72)",
            fontWeight: 400,
            fontSize: "13px",
            fontFamily: SANS,
          }}
        >
          · {total}
        </Box>
      </Typography>

      {/* 🆕 Round 28b3 — Clean v3: solid white card + cool slate
          border. Summary stars now reflect the numeric `rating`
          via StarRow (was static 5★). Bucket bar tint switched
          from warm coral to cool slate so empty buckets read as
          neutral. */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: "14px",
          padding: "14px",
          background: "#FFFFFF",
          border: "1px solid rgba(15, 23, 42, 0.06)",
          boxShadow: "0 1px 2px rgba(15, 23, 42, 0.03)",
          borderRadius: "14px",
          marginBottom: "12px",
        }}
      >
        <Box sx={{ textAlign: "center" }}>
          <Box
            sx={{
              fontFamily: SERIF,
              fontWeight: 600,
              fontSize: "32px",
              color: "#B4000A",
              letterSpacing: "-0.03em",
              lineHeight: 1,
            }}
          >
            {rating}
          </Box>
          <Box sx={{ marginTop: "2px" }}>
            <StarRow rating={parseFloat(rating) || 0} size={13} />
          </Box>
          <Box
            sx={{
              fontFamily: SANS,
              fontSize: "9.5px",
              color: "rgba(15, 23, 42, 0.72)",
              marginTop: "2px",
              fontWeight: 600,
            }}
          >
            {t("detail.reviews.total", "{{count}} reviews", { count: total })}
          </Box>
        </Box>
        <Box sx={{ flex: 1, display: "flex", flexDirection: "column", gap: "3px" }}>
          {buckets.map((b) => (
            <Box
              key={b.num}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontFamily: SANS,
                fontSize: "9.5px",
                color: "rgba(15, 23, 42, 0.72)",
              }}
            >
              <Box sx={{ width: "8px", fontWeight: 700 }}>{b.num}</Box>
              <Box
                sx={{
                  flex: 1,
                  height: "4px",
                  background: "rgba(15, 23, 42, 0.08)",
                  borderRadius: "2px",
                  overflow: "hidden",
                }}
              >
                <Box
                  sx={{
                    height: "100%",
                    width: `${b.pct}%`,
                    background: "#B4000A",
                    borderRadius: "2px",
                  }}
                />
              </Box>
              <Box>{b.count}</Box>
            </Box>
          ))}
        </Box>
      </Box>

      {/* review cards */}
      {reviews.map((r, i) => (
        <Box
          key={i}
          sx={{
            padding: "14px",
            background: "#FFFFFF",
            border: "1px solid rgba(15, 23, 42, 0.06)",
            boxShadow: "0 1px 2px rgba(15, 23, 42, 0.03)",
            borderRadius: "14px",
            marginBottom: "8px",
          }}
        >
          {/* .head */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              marginBottom: "8px",
            }}
          >
            <Box
              sx={{
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                background: "#B4000A",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                fontSize: "12px",
                fontFamily: SANS,
              }}
            >
              {r.initial}
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Box
                sx={{
                  fontFamily: SANS,
                  fontSize: "12px",
                  fontWeight: 700,
                  color: "#1A2B2E",
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                  flexWrap: "wrap",
                }}
              >
                {r.name}
                {r.flag && <span>{r.flag}</span>}
                <VerifiedRoundedIcon
                  aria-label="verified booking"
                  titleAccess={t(
                    "detail.reviews.verified",
                    "Verified booking"
                  )}
                  sx={{ fontSize: 13, color: "#1d9bf0", flexShrink: 0 }}
                />
                <Box
                  component="span"
                  sx={{
                    color: "rgba(15, 23, 42, 0.72)",
                    fontWeight: 400,
                    fontSize: "10px",
                  }}
                >
                  {t("detail.reviews.verified", "Verified booking")}
                </Box>
              </Box>
              <Box
                sx={{
                  fontFamily: SANS,
                  fontSize: "10px",
                  color: "rgba(15, 23, 42, 0.72)",
                  marginTop: "1px",
                }}
              >
                {r.meta}
              </Box>
            </Box>
            <StarRow rating={r.rating ?? 5} size={12} />
          </Box>
          <Box
            sx={{
              fontFamily: SERIF,
              fontStyle: "italic",
              fontSize: "13px",
              lineHeight: 1.45,
              color: "#1A2B2E",
            }}
          >
            &ldquo;{r.quote}&rdquo;
          </Box>
        </Box>
      ))}

      <Box
        sx={{
          textAlign: "center",
          padding: "8px",
          color: "#4A5568",
          fontSize: "12px",
          fontWeight: 700,
          fontFamily: SANS,
          cursor: "pointer",
        }}
      >
        {t("detail.reviews.seeAll", "See all {{count}} reviews", { count: total })} →
      </Box>
    </Box>
  );
};
