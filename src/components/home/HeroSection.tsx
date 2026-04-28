// src/components/home/HeroSection.tsx
//
// 🌅 SunRed Brand Hero — peach/coral/pink core (brand tokens) with subtle
//    lavender accent for depth. Now sources colors from `@/theme` (`brand`)
//    so future palette tweaks propagate automatically.
//
// Color story:
//   • Background:   peach (FEAE96 / FFE5D9) → soft pink (FFD6E8) → light lavender accent
//   • Title:        SunRed red (FE0944) → magenta → indigo  ← signature gradient
//   • Orbs:         peach + pink (warm, on-brand) — replaced the cool blue orb
//   • Trust pills:  white glass + SunRed red border + dark plum text
//
// Fits next to FloatingNavBar (peach→pink→lavender→violet) and BottomNavGlass
// (peach-pink-lavender glass) — all three now share the same color story.

import React from "react";
import { Box, Typography, Stack } from "@mui/material";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

import VerifiedIcon from "@mui/icons-material/Verified";
import AccessTimeFilledIcon from "@mui/icons-material/AccessTimeFilled";
import StarRoundedIcon from "@mui/icons-material/StarRounded";

import { brand } from "@/theme";

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
        // 🌅 Brand-led background — peach/pink dominant, lavender hint
        // (FEAE96 = brand.peach baseline, blends into FloatingNavBar)
        background: `linear-gradient(135deg,
          ${brand.aurora.peach} 0%,
          ${brand.aurora.pink} 35%,
          ${brand.aurora.lavender} 75%,
          rgba(196, 181, 253, 0.55) 100%)`,
        boxShadow: `0 12px 32px rgba(254, 9, 68, 0.10),
                    0 4px 14px rgba(254, 174, 150, 0.18)`,
      }}
    >
      {/* 🔮 Floating peach orb (top-right) */}
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
          // SunRed peach (FEAE96) at 60% — warm and on-brand
          background:
            "radial-gradient(circle, rgba(254, 174, 150, 0.65) 0%, rgba(254, 174, 150, 0) 70%)",
          filter: "blur(8px)",
          pointerEvents: "none",
        }}
      />

      {/* 🌸 Floating pink-coral orb (bottom-left) */}
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
          // soft SunRed-red glow (FE0944) — diluted, not aggressive
          background:
            "radial-gradient(circle, rgba(254, 9, 68, 0.18) 0%, rgba(254, 9, 68, 0) 70%)",
          filter: "blur(12px)",
          pointerEvents: "none",
        }}
      />

      {/* ✨ Twinkling sparkles overlay (pure CSS, no JS cost) */}
      <Box
        aria-hidden
        sx={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          backgroundImage: `
            radial-gradient(circle at 15% 25%, rgba(255,255,255,0.95) 0.5px, transparent 1.5px),
            radial-gradient(circle at 78% 18%, rgba(255,255,255,0.85) 0.5px, transparent 1.2px),
            radial-gradient(circle at 88% 70%, rgba(255,255,255,0.9) 0.4px, transparent 1.3px),
            radial-gradient(circle at 22% 75%, rgba(255,255,255,0.8) 0.5px, transparent 1.4px),
            radial-gradient(circle at 58% 35%, rgba(255,255,255,0.7) 0.4px, transparent 1.1px)
          `,
          animation: "twinkle 3.5s ease-in-out infinite",
          "@keyframes twinkle": {
            "0%, 100%": { opacity: 0.3 },
            "50%": { opacity: 1 },
          },
        }}
      />

      {/* 🪟 Glass card */}
      <Box
        sx={{
          position: "relative",
          zIndex: 1,
          backdropFilter: "blur(14px)",
          backgroundColor: "rgba(255, 255, 255, 0.5)",
          borderRadius: 3,
          border: "1px solid rgba(255, 255, 255, 0.6)",
          p: 2.5,
          textAlign: "center",
        }}
      >
        {/* Tagline — SunRed signature gradient text */}
        <Typography
          component="h1"
          sx={{
            fontWeight: 800,
            fontSize: { xs: 19, sm: 23, md: 26 },
            lineHeight: 1.25,
            // 🔥 SunRed red (FE0944) → magenta → indigo
            // ใช้สี brand จริงเป็นหลัก ตามด้วย accent
            background: `linear-gradient(90deg,
              ${brand.red} 0%,
              #B91C9F 50%,
              #6366F1 100%)`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            mb: 0.8,
            letterSpacing: 0.2,
            // 🌐 multi-language safe wrapping
            textWrap: "balance",
            wordBreak: "keep-all",
            overflowWrap: "break-word",
            px: 1,
          }}
        >
          {t("hero.title", "Bangkok's #1 Outcall Massage")}
        </Typography>

        <Typography
          sx={{
            fontSize: { xs: 12.5, sm: 13.5 },
            // dark plum (matches BottomNav active text + TrustBadge family)
            color: "rgba(74, 26, 51, 0.8)",
            mb: 1.5,
            fontWeight: 500,
            lineHeight: 1.55,
            textWrap: "balance",
            wordBreak: "keep-all",
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

/** Small pill-style badge — uses SunRed red border for brand consistency */
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
      backgroundColor: "rgba(255, 255, 255, 0.85)",
      // SunRed red @ 25% — visible accent without shouting
      border: `1px solid rgba(254, 9, 68, 0.25)`,
      color: "#7E1F4D",
      fontWeight: 600,
      fontSize: 11.5,
      letterSpacing: 0.2,
      whiteSpace: "nowrap",
      boxShadow: "0 2px 6px rgba(254, 9, 68, 0.06)",
    }}
  >
    {icon}
    {label}
  </Box>
);

export default HeroSection;
