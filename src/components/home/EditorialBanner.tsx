// src/components/home/EditorialBanner.tsx
//
// 🆕 Round 28r74 · Nordic sections build (2026-07-08)
// ─────────────────────────────────────────────────────────────────────
// Editorial closing banner — Playfair quote "Time For Yourself. You
// Deserve It." + outlined dark CTA "Book Now →" + ceramic-vase graphic.
// Matches mockup phone-2 "editorial" block
// (outputs/sunred-nordic-gray-mockup.html:508-565).
//
// Ceramic vase is rendered with CSS radial gradient + two ::before /
// ::after pseudo elements (no static image dependency) — matches the
// mockup's synthetic-graphic aesthetic and keeps the bundle image-free.
//
// CTA "Book Now →" → /pricing (Core Experiences menu — canonical
// booking entry surface since 28r72).
// ─────────────────────────────────────────────────────────────────────

import React from "react";
import { Box } from "@mui/material";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { fonts } from "@/theme";

const EditorialBanner: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <Box
      component="section"
      aria-label="Time for yourself · Editorial banner"
      sx={{
        margin: { xs: "28px 12px 0", md: "36px 12px 0" },
        padding: { xs: "24px", md: "32px 32px" },
        background: "#ECEBE8", // NEUTRAL_100 cream
        border: "1px solid #E2E0DD", // NEUTRAL_200
        borderRadius: "22px",
        display: "grid",
        gridTemplateColumns: { xs: "1.2fr 1fr", md: "1.4fr 1fr" },
        gap: { xs: "14px", md: "24px" },
        alignItems: "center",
      }}
    >
      {/* Left — Playfair quote + outlined dark CTA */}
      <Box>
        <Box
          component="p"
          sx={{
            fontFamily: fonts.heading,
            fontSize: { xs: 22, md: 30 },
            fontWeight: 400,
            color: "#4B4B48", // GRAY_900
            lineHeight: 1.15,
            letterSpacing: "-0.02em",
            margin: 0,
            marginBottom: { xs: "14px", md: "20px" },
          }}
        >
          Time For<br />
          Yourself.<br />
          <Box
            component="em"
            sx={{
              fontStyle: "italic",
              color: "#4B4B48", // GRAY_800
              fontWeight: 500,
            }}
          >
            You Deserve It.
          </Box>
        </Box>
        <Box
          component="button"
          type="button"
          onClick={() => navigate("/pricing")}
          sx={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px",
            padding: "10px 24px",
            background: "#8F8474", // WARM_TAUPE (r80)
            color: "#FFFFFF",
            border: "none",
            borderRadius: 999,
            fontFamily: fonts.body,
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: "0.005em",
            cursor: "pointer",
            minHeight: 40,
            boxShadow: "0 4px 12px rgba(143, 132, 116, 0.22)",
            transition: "background 0.18s ease, transform 0.18s ease, box-shadow 0.18s ease",
            "&:hover": {
              background: "#7A7060",
              boxShadow: "0 6px 16px rgba(122, 112, 96, 0.28)",
              transform: "translateY(-1px)",
            },
            "&:focus-visible": {
              outline: "2px solid #4B4B48",
              outlineOffset: 3,
            },
          }}
        >
          {t("home.editorial.cta", "Book Now")}
          <Box component="span" aria-hidden sx={{ fontSize: 13, lineHeight: 1 }}>
            →
          </Box>
        </Box>
      </Box>

      {/* Right — ceramic-vase graphic (pure CSS) */}
      <Box
        aria-hidden
        sx={{
          aspectRatio: "4 / 5",
          borderRadius: "14px",
          position: "relative",
          overflow: "hidden",
          background: `
            radial-gradient(circle at 30% 40%, rgba(196,205,191,0.5), transparent),
            linear-gradient(135deg, #E8E2D3 0%, #C4B896 100%)
          `,
          // Tall narrow vase — left
          "&::before": {
            content: '""',
            position: "absolute",
            bottom: "15%",
            left: "25%",
            width: "20%",
            height: "40%",
            background: "linear-gradient(180deg, #F3EEE1, #C4B896)",
            borderRadius: "4px 4px 30% 30%",
          },
          // Squat vase — right
          "&::after": {
            content: '""',
            position: "absolute",
            bottom: "15%",
            right: "20%",
            width: "15%",
            height: "30%",
            background: "linear-gradient(180deg, #EDE7D6, #B8A582)",
            borderRadius: "40% 40% 6px 6px",
          },
        }}
      />
    </Box>
  );
};

export default EditorialBanner;
