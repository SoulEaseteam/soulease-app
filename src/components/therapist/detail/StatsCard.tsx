// src/components/therapist/detail/StatsCard.tsx
//
// 🎨 Phase 2 Detail — floating stats card (verbatim port of `.stats-card`).
// Negative top margin (-30px) to overlap into the hero photo above. Three
// cells separated by gold hairline borders.

import React from "react";
import { Box } from "@mui/material";
import { useTranslation } from "react-i18next";

const SERIF = '"Fraunces", Georgia, "Times New Roman", serif';
const SANS = '"Inter", system-ui, -apple-system, sans-serif';

interface Stat {
  num: React.ReactNode;
  label: string;
  /** Tap handler — when set, cell becomes a button with affordance. */
  onTap?: () => void;
}

interface Props {
  rating: string;
  reviewCount: number;
  yearsExp: number;
  rebookRate: string;
  /** Optional — opens an info sheet on the Reviews tab. */
  onTapRating?: () => void;
  /** Optional — opens an info sheet on the Verified Profile tab. */
  onTapProfile?: () => void;
}

const StatsCard: React.FC<Props> = ({
  rating,
  reviewCount,
  yearsExp,
  rebookRate,
  onTapRating,
  onTapProfile,
}) => {
  const { t } = useTranslation();

  const stats: Stat[] = [
    {
      num: (
        <>
          <Box component="span" sx={{ color: "#FE0944" }}>★</Box> {rating}
        </>
      ),
      label: t("detail.stats.reviews", "{{count}} reviews", { count: reviewCount }),
      onTap: onTapRating,
    },
    {
      num: t("detail.stats.years", "{{years}} yrs", { years: yearsExp }),
      label: t("detail.stats.experience", "Experience"),
      onTap: onTapProfile,
    },
    {
      num: rebookRate,
      label: t("detail.stats.rebook", "Rebook rate"),
      onTap: onTapProfile,
    },
  ];

  return (
    <Box
      sx={{
        // .stats-card — verbatim
        margin: "-30px 14px 18px",
        padding: "14px 16px",
        borderRadius: "18px",
        background: "rgba(255, 255, 255, 0.65)",
        backdropFilter: "blur(30px) saturate(180%)",
        WebkitBackdropFilter: "blur(30px) saturate(180%)",
        border: "1px solid rgba(255, 255, 255, 0.7)",
        boxShadow:
          "0 12px 32px rgba(126, 30, 46, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.7)",
        display: "grid",
        gridTemplateColumns: "1fr 1fr 1fr",
        gap: "8px",
        position: "relative",
        zIndex: 5,
      }}
    >
      {stats.map((s, i) => (
        <Box
          key={i}
          {...(s.onTap
            ? {
                role: "button",
                tabIndex: 0,
                onClick: s.onTap,
                onKeyDown: (e: React.KeyboardEvent) => {
                  if (e.key === " " || e.key === "Enter") {
                    e.preventDefault();
                    s.onTap?.();
                  }
                },
              }
            : {})}
          sx={{
            // .stat-cell — verbatim
            textAlign: "center",
            padding: "4px 0",
            position: "relative",
            cursor: s.onTap ? "pointer" : "default",
            borderRadius: "10px",
            transition: "background 0.15s ease, transform 0.15s ease",
            ...(i > 0 && {
              borderLeft: "1px solid rgba(184, 92, 60, 0.18)",
            }),
            ...(s.onTap && {
              "&:hover": {
                background: "rgba(254, 9, 68, 0.04)",
              },
              "&:active": {
                transform: "scale(0.97)",
              },
              "&:focus-visible": {
                outline: "2px solid #FE0944",
                outlineOffset: "2px",
              },
            }),
          }}
        >
          <Box
            sx={{
              fontFamily: SERIF,
              fontWeight: 600,
              fontSize: "18px",
              color: "#2a1a14",
              letterSpacing: "-0.02em",
            }}
          >
            {s.num}
          </Box>
          <Box
            sx={{
              fontFamily: SANS,
              fontSize: "9px",
              color: "rgba(60, 30, 20, 0.72)",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              fontWeight: 700,
              marginTop: "2px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "3px",
            }}
          >
            {s.label}
            {s.onTap && (
              <Box
                component="span"
                aria-hidden
                sx={{
                  fontSize: "10px",
                  color: "#FE0944",
                  fontWeight: 800,
                  marginLeft: "1px",
                  lineHeight: 1,
                }}
              >
                ›
              </Box>
            )}
          </Box>
        </Box>
      ))}
    </Box>
  );
};

export default StatsCard;
