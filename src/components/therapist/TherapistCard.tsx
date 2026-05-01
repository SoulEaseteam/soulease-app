// src/components/therapist/TherapistCard.tsx
//
// 🎨 Phase 2 — Therapist card (pixel-perfect port of `.t-card` from
// sunred-therapists2.html). Used by the Browse page grid + future contexts.
//
// DOM (verbatim mockup):
//   <div class="t-card online?">
//     <div class="t-photo" style="background: gradient">
//       <div class="langs">  ← lang pills (right-side, top)
//       <div class="verified">✓
//       <div class="meta-bottom">
//         <div class="name-row">Name <span class="age">28</span>
//         <div class="rating-row">
//           ★ 4.9 (203)            1.2 km
//     <div class="t-info">
//       <div class="specs">[THAI][OIL][8 YR]
//       <div class="price-row">
//         <div class="price">฿1,800<small>/60min</small>
//         <div class="availability">●Now (or "19:30")
//
// CSS values verbatim from sunred-therapists2.html lines 245-362.

import React from "react";
import { Box } from "@mui/material";
import { useNavigate } from "react-router-dom";

const SERIF = '"Fraunces", Georgia, "Times New Roman", serif';
const SANS = '"Inter", system-ui, -apple-system, sans-serif';

export type TherapistCardData = {
  id: string;
  name: string;
  age?: number;
  langs: string[];
  rating: string;
  reviewCount: number;
  distanceKm: string;
  specs: string[];
  price: string;
  unit: string;
  online: boolean;
  /**
   * Optional 3-state status. Drives the colored corner dot:
   *   online  → ●green   (pulsing, live)
   *   busy    → ●orange  (in session / on the way)
   *   offline → ●gray    (not currently working — dot hidden by default)
   * When omitted, falls back to `online` boolean (true → online, false → no dot).
   */
  status?: "online" | "busy" | "offline";
  /** "●Now" or "19:30" — already-formatted */
  availability: string;
  /** "color:#16a34a" or "#b85c3c" — drives availability text color */
  availabilityColor: string;
  photoBg: string;
  /** Cloudinary-enhanced image URLs for the photo gallery (DetailHero
   *  carousel + fullscreen viewer). First entry is the cover image, used
   *  as `photoBg` background fallback. */
  images?: string[];
};

interface Props {
  t: TherapistCardData;
}

// Status dot color map — same hues used in DetailHero
const STATUS_DOT: Record<NonNullable<TherapistCardData["status"]>, string | null> = {
  online: "#16a34a",  // green
  busy: "#f97316",    // orange
  offline: null,      // hide entirely on cards (would clutter the grid)
};

const TherapistCard: React.FC<Props> = ({ t }) => {
  const navigate = useNavigate();

  // Resolve dot color: prefer 3-state status, fall back to legacy boolean.
  const statusKey: "online" | "busy" | "offline" =
    t.status ?? (t.online ? "online" : "offline");
  const dotColor = STATUS_DOT[statusKey];

  return (
    <Box
      role="button"
      tabIndex={0}
      onClick={() => navigate(`/therapists/${t.id}`)}
      sx={{
        // .t-card — verbatim
        background: "#fff",
        borderRadius: "18px",
        overflow: "hidden",
        boxShadow: "0 6px 20px rgba(126, 30, 46, 0.1)",
        cursor: "pointer",
        position: "relative",
        // 🆕 Phase 4 — colored status dot per 3-state availability.
        //    Pulses for all visible statuses (color-tinted glow).
        ...(dotColor && {
          "&::before": {
            content: '""',
            position: "absolute",
            top: "8px",
            left: "8px",
            width: "8px",
            height: "8px",
            borderRadius: "50%",
            background: dotColor,
            boxShadow: `0 0 8px ${dotColor}`,
            zIndex: 3,
            animation: "sunredCardPulse 1.8s ease-in-out infinite",
            "@keyframes sunredCardPulse": {
              "0%, 100%": { transform: "scale(1)", opacity: 1 },
              "50%": { transform: "scale(1.2)", opacity: 0.72 },
            },
          },
        }),
      }}
    >
      {/* .t-photo — verbatim */}
      <Box
        sx={{
          aspectRatio: "3 / 4",
          position: "relative",
          overflow: "hidden",
          background: t.photoBg,
          // .t-photo::after — gradient overlay
          "&::after": {
            content: '""',
            position: "absolute",
            inset: 0,
            background: [
              "radial-gradient(ellipse at 30% 25%, rgba(255, 255, 255, 0.25) 0%, transparent 50%)",
              "linear-gradient(180deg, transparent 50%, rgba(0, 0, 0, 0.55) 100%)",
            ].join(", "),
          },
        }}
      >
        {/* .langs — top-right (verified is at the very right corner) */}
        <Box
          sx={{
            position: "absolute",
            top: "8px",
            right: "38px",
            display: "flex",
            gap: "3px",
            zIndex: 2,
          }}
        >
          {t.langs.map((l) => (
            <Box
              key={l}
              sx={{
                background: "rgba(0, 0, 0, 0.55)",
                backdropFilter: "blur(10px)",
                WebkitBackdropFilter: "blur(10px)",
                color: "#fff",
                padding: "2px 5px",
                borderRadius: "5px",
                fontSize: "9px",
                fontWeight: 700,
                fontFamily: SANS,
              }}
            >
              {l}
            </Box>
          ))}
        </Box>

        {/* .verified */}
        <Box
          aria-label="verified"
          sx={{
            position: "absolute",
            top: "8px",
            right: "8px",
            width: "22px",
            height: "22px",
            borderRadius: "50%",
            background: "rgba(255, 255, 255, 0.95)",
            color: "#1d9bf0",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "11px",
            fontWeight: 700,
            zIndex: 2,
            boxShadow: "0 2px 6px rgba(0, 0, 0, 0.15)",
            fontFamily: SANS,
          }}
        >
          ✓
        </Box>

        {/* .meta-bottom — name + rating row */}
        <Box
          sx={{
            position: "absolute",
            bottom: "8px",
            left: "8px",
            right: "8px",
            zIndex: 2,
            color: "#fff",
          }}
        >
          {/* .name-row */}
          <Box
            sx={{
              fontFamily: SERIF,
              fontWeight: 500,
              fontSize: "14px",
              marginBottom: "2px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Box component="span">
              {t.name}{" "}
              {t.age != null && (
                <Box
                  component="span"
                  sx={{ fontWeight: 400, opacity: 0.8 }}
                >
                  {t.age}
                </Box>
              )}
            </Box>
          </Box>
          {/* .rating-row */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontSize: "10px",
              fontWeight: 600,
              opacity: 0.95,
              fontFamily: SANS,
            }}
          >
            <Box component="span">
              <Box component="span" sx={{ color: "#FBBF24" }}>★</Box>{" "}
              {t.rating} ({t.reviewCount})
            </Box>
            <Box component="span" sx={{ opacity: 0.85 }}>
              {t.distanceKm}
            </Box>
          </Box>
        </Box>
      </Box>

      {/* .t-info */}
      <Box sx={{ padding: "8px 10px 10px" }}>
        {/* .specs */}
        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            gap: "3px",
            marginBottom: "6px",
          }}
        >
          {t.specs.map((sp) => (
            <Box
              key={sp}
              sx={{
                background: "rgba(254, 122, 82, 0.1)",
                color: "#FE7A52",
                padding: "2px 6px",
                borderRadius: "5px",
                fontSize: "9px",
                fontWeight: 700,
                fontFamily: SANS,
              }}
            >
              {sp}
            </Box>
          ))}
        </Box>

        {/* .price-row */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          {/* .price */}
          <Box
            sx={{
              fontFamily: SERIF,
              fontWeight: 600,
              fontSize: "13px",
              color: "#FE0944",
              letterSpacing: "-0.02em",
            }}
          >
            {t.price}
            <Box
              component="small"
              sx={{
                fontFamily: SANS,
                fontWeight: 500,
                fontSize: "9px",
                color: "rgba(60, 30, 20, 0.72)",
              }}
            >
              {t.unit}
            </Box>
          </Box>
          {/* .availability */}
          <Box
            sx={{
              fontSize: "9px",
              color: t.availabilityColor,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              fontFamily: SANS,
            }}
          >
            {t.availability}
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default TherapistCard;
