// src/components/therapist/TherapistIdentityCard.tsx
//
// 🆕 Round 28x.96 (founder: "เอาไปใส่หน้าทำงาน ให้มีเหมือนหน้าโปรไฟล์") —
// extracted from TherapistProfilePage's header so Home can show the exact
// same photo/name/status/rating/hours card without duplicating the JSX (and
// risking the two pages drifting the way the FAQ pricing block once did).
// Paired with useTherapistIdentityStats for the reviewCount + computedStatus
// inputs.

import React from "react";
import { Box, Typography, Chip } from "@mui/material";
import type { Avail, Therapist } from "@/types/therapist";
import { enhanceImage } from "@/utils/cloudinary";
import { prettyHHMM } from "@/utils/time";

const SERIF = '"Playfair Display", "Fraunces", Georgia, "Times New Roman", serif';
const SANS = '"Inter", system-ui, -apple-system, sans-serif';

// 🆕 Round 28x.101 (founder: "ปรับให้สวยขึ้น สีสดสวยขึ้น") — each status gets
// its own true, saturated color instead of green/black-wash/black-wash; the
// pill should read at a glance, not just by its label text.
const STATUS_PILL: Record<Avail, { bg: string; color: string; label: string }> = {
  available: { bg: "#22C55E", color: "#fff", label: "Available" },
  bookable: { bg: "#DB2777", color: "#fff", label: "In session" },
  resting: { bg: "#5B4470", color: "#F4F6F5", label: "Resting" },
  holiday: { bg: "#B45309", color: "#FFFFFF", label: "On holiday" },
};

const TherapistIdentityCard: React.FC<{
  therapist: Therapist;
  computedStatus: Avail;
  reviewCount: number;
}> = ({ therapist, computedStatus, reviewCount }) => {
  const rawImage = therapist.image || "placeholder.jpg";
  const resolvedImage =
    rawImage.startsWith("http") || rawImage.startsWith("/")
      ? rawImage
      : `/images/${rawImage}`;

  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
  const ratingNum = (Number(therapist.rating) || 0).toFixed(1);
  const pill = STATUS_PILL[computedStatus];

  return (
    <Box
      sx={{
        position: "relative",
        padding: "24px 20px 28px",
        background: "linear-gradient(160deg, #FF9999 0%, #FF9999 55%, #FF9999 100%)",
        borderBottomLeftRadius: 28,
        borderBottomRightRadius: 28,
        color: "#fff",
        boxShadow: "0 14px 34px rgba(194, 24, 91, 0.32)",
        overflow: "hidden",
      }}
    >
      {/* soft glow — same corner-glow language as the Dashboard hero cards,
          so the hero reads as one design system with the rest of the app. */}
      <Box aria-hidden sx={{ position: "absolute", top: -50, right: -40, width: 180, height: 180, borderRadius: "50%", background: "radial-gradient(circle, rgba(255,255,255,0.20) 0%, transparent 70%)", pointerEvents: "none" }} />

      <Box sx={{ display: "flex", alignItems: "center", gap: 2, position: "relative" }}>
        <Box
          component="img"
          src={enhanceImage(resolvedImage, { variant: "thumb", face: true })}
          alt={therapist.name}
          width={96}
          height={96}
          loading="lazy"
          decoding="async"
          sx={{
            width: 96,
            height: 96,
            borderRadius: "50%",
            objectFit: "cover",
            // 🆕 28x.129 — Cloudinary's g_face already returns a square framed
            //   on the face, so cover has nothing left to trim. This bias only
            //   matters on localhost, where enhanceImage returns the raw URL
            //   untransformed (Cloudinary fetch can't reach localhost): without
            //   it, dev shows the decapitated crop the founder reported and
            //   prod doesn't, which is exactly how this went unnoticed.
            objectPosition: "50% 22%",
            border: "3px solid rgba(255,255,255,0.9)",
            boxShadow: "0 6px 18px rgba(107, 21, 65, 0.35)",
            flexShrink: 0,
          }}
        />

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            sx={{
              fontFamily: SERIF,
              fontWeight: 600,
              fontSize: "20px",
              lineHeight: 1.1,
              letterSpacing: "-0.01em",
            }}
          >
            {therapist.name}
          </Typography>
          <Typography
            sx={{
              fontFamily: SANS,
              fontSize: "11px",
              opacity: 0.85,
              marginTop: "2px",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {(therapist as { email?: string }).email ?? ""}
          </Typography>

          <Box
            sx={{
              marginTop: "6px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              flexWrap: "wrap",
            }}
          >
            <Chip
              size="small"
              label={pill.label}
              sx={{
                height: 22,
                background: pill.bg,
                color: pill.color,
                fontWeight: 700,
                fontSize: "10px",
                letterSpacing: "0.04em",
              }}
            />
            <Typography
              sx={{
                fontFamily: SANS,
                fontSize: "10.5px",
                opacity: 0.85,
                fontWeight: 600,
              }}
            >
              ★ {ratingNum} · {reviewCount} review
              {reviewCount === 1 ? "" : "s"}
            </Typography>
          </Box>

          <Typography
            sx={{
              fontFamily: SANS,
              fontSize: "10.5px",
              opacity: 0.78,
              marginTop: "4px",
            }}
          >
            {/* 🆕 Round 28x.129 (founder: "Hours · 19:00 – 05:00 ใส่ PM AM") —
                was the raw 24h HH:mm straight off the doc. Reuses prettyHHMM,
                the canonical user-facing time format (utils/time.ts, 28b42),
                so this card can't drift from the public profile and the
                booking flow, which already render hours through it. */}
            Hours · {prettyHHMM(therapist.startTime) || "—"} – {prettyHHMM(therapist.endTime) || "—"}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default TherapistIdentityCard;
