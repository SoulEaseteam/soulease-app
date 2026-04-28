// src/components/home/HeroSection.tsx
//
// 🌅 Aurora Modern Hero — for SunRed home page
//
// Design:
//   - Pastel gradient (peach → lavender → mint) ใน background
//   - Glass-morphism card พร้อม tagline หลายภาษา
//   - Trust badges (Verified / 24-7 / 5-star)
//   - Floating gradient orbs (subtle animation)
//   - Mobile-first (<= 430px)

import React from "react";
import { Box, Typography, Stack } from "@mui/material";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

import VerifiedIcon from "@mui/icons-material/Verified";
import AccessTimeFilledIcon from "@mui/icons-material/AccessTimeFilled";
import StarRoundedIcon from "@mui/icons-material/StarRounded";

const HeroSection: React.FC = () => {
  const { t } = useTranslation();

  return (
    <Box
      component="section"
      aria-label="hero"
      sx={{
        position: "relative",
        overflow: "hidden",
        borderRadius: 4,
        mt: 2,
        px: 3,
        py: 4,
        // 🌈 Aurora gradient background
        background:
          "linear-gradient(135deg, #FFE5D9 0%, #FFD6E8 35%, #E5D0FF 65%, #D4F4E2 100%)",
        boxShadow: "0 12px 32px rgba(229, 208, 255, 0.35)",
      }}
    >
      {/* 🔮 Floating gradient orbs (decoration) */}
      <Box
        component={motion.div}
        animate={{
          y: [0, -14, 0],
          x: [0, 8, 0],
        }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
        sx={{
          position: "absolute",
          top: -30,
          right: -20,
          width: 120,
          height: 120,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(255,182,193,0.55) 0%, rgba(255,182,193,0) 70%)",
          filter: "blur(8px)",
          pointerEvents: "none",
        }}
      />
      <Box
        component={motion.div}
        animate={{
          y: [0, 10, 0],
          x: [0, -12, 0],
        }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
        sx={{
          position: "absolute",
          bottom: -40,
          left: -30,
          width: 140,
          height: 140,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(180, 220, 255, 0.5) 0%, rgba(180, 220, 255, 0) 70%)",
          filter: "blur(10px)",
          pointerEvents: "none",
        }}
      />

      {/* 🪟 Glass card */}
      <Box
        sx={{
          position: "relative",
          zIndex: 1,
          backdropFilter: "blur(14px)",
          backgroundColor: "rgba(255, 255, 255, 0.45)",
          borderRadius: 3,
          border: "1px solid rgba(255, 255, 255, 0.6)",
          p: 2.5,
          textAlign: "center",
        }}
      >
        {/* Tagline */}
        <Typography
          component="h1"
          sx={{
            fontWeight: 800,
            fontSize: { xs: 22, sm: 26 },
            lineHeight: 1.2,
            // gradient text
            background:
              "linear-gradient(90deg, #E11D48 0%, #B91C9F 50%, #6366F1 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            mb: 0.8,
            letterSpacing: 0.3,
          }}
        >
          {t(
            "hero.title",
            "Bangkok's #1 Outcall Massage"
          )}
        </Typography>

        <Typography
          sx={{
            fontSize: 13.5,
            color: "rgba(60, 60, 80, 0.85)",
            mb: 1.5,
            fontWeight: 500,
            lineHeight: 1.5,
          }}
        >
          {t(
            "hero.subtitle",
            "Verified therapists • Live availability • English / 中文 / 日本語 / 한국어"
          )}
        </Typography>

        {/* 🏅 Trust badges row */}
        <Stack
          direction="row"
          spacing={1}
          justifyContent="center"
          flexWrap="wrap"
          useFlexGap
          sx={{ mt: 1 }}
        >
          <TrustBadge
            icon={<VerifiedIcon sx={{ fontSize: 14 }} />}
            label={t("hero.badge.verified", "Verified")}
          />
          <TrustBadge
            icon={<AccessTimeFilledIcon sx={{ fontSize: 14 }} />}
            label={t("hero.badge.always", "24 / 7")}
          />
          <TrustBadge
            icon={<StarRoundedIcon sx={{ fontSize: 15 }} />}
            label={t("hero.badge.rating", "4.8 ★ • 1,200+")}
          />
        </Stack>
      </Box>
    </Box>
  );
};

/** Small pill-style badge */
const TrustBadge: React.FC<{
  icon: React.ReactNode;
  label: string;
}> = ({ icon, label }) => (
  <Box
    sx={{
      display: "inline-flex",
      alignItems: "center",
      gap: 0.5,
      px: 1.2,
      py: 0.4,
      borderRadius: 99,
      backgroundColor: "rgba(255, 255, 255, 0.75)",
      border: "1px solid rgba(225, 29, 72, 0.15)",
      color: "#7E1F4D",
      fontWeight: 600,
      fontSize: 11.5,
      letterSpacing: 0.2,
      whiteSpace: "nowrap",
    }}
  >
    {icon}
    {label}
  </Box>
);

export default HeroSection;
