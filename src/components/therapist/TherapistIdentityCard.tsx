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

const SERIF = '"Playfair Display", "Fraunces", Georgia, "Times New Roman", serif';
const SANS = '"Inter", system-ui, -apple-system, sans-serif';

const STATUS_PILL: Record<Avail, { bg: string; color: string; label: string }> = {
  available: { bg: "#16a34a", color: "#fff", label: "Available" },
  bookable: { bg: "#831843", color: "#F4F6F5", label: "In session" },
  resting: { bg: "rgba(0,0,0,0.38)", color: "#FFFFFF", label: "Resting" },
  holiday: { bg: "rgba(0,0,0,0.38)", color: "#FFFFFF", label: "On holiday" },
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
        background: "linear-gradient(160deg, #A34A67 0%, #7A3049 55%, #5A2733 100%)",
        borderBottomLeftRadius: 28,
        borderBottomRightRadius: 28,
        color: "#fff",
        boxShadow: "0 12px 30px rgba(15, 23, 42, 0.22)",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
        <Box
          component="img"
          src={enhanceImage(resolvedImage, { variant: "card" })}
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
            border: "3px solid rgba(255,255,255,0.85)",
            boxShadow: "0 6px 16px rgba(15, 23, 42, 0.14)",
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
            Hours · {therapist.startTime ?? "—"} – {therapist.endTime ?? "—"}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default TherapistIdentityCard;
