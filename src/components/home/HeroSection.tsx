// src/components/home/HeroSection.tsx
//
// 🎨 Round 28s5 — Aman editorial hero (founder 2026-05-30).
//
// Round 28s3 went pure-typographic. Founder feedback: "ออกแบบใหม่
// หน้าโฮม" — wanted the actual Aman/Six Senses register, which
// uses big editorial photography, not Bauhaus type. This rewrite:
//
//   ┌────────────────────────────────┐
//   │  [full-bleed editorial photo]  │
//   │  SunRed         ● PRIME HOURS  │  ← glassy top row
//   │                                │
//   │                                │
//   │                                │
//   │  ── dark gradient overlay ──   │
//   │                                │
//   │  TONIGHT · PRIME HOURS         │  ← eyebrow, cream
//   │  The city quiets.              │  ← Fraunces serif
//   │  We arrive.                    │     "arrive" italic, coral
//   └────────────────────────────────┘
//
// Hero photo: `/images/xing/xingxing4.jpg` — XingXing back-view at a
// café. Chosen over face-forward shots because (a) it aligns with the
// brand's discretion ethos (CLAUDE.md §3), (b) the contemplative
// mood reads "luxury repose" rather than "look at me", (c) anonymous
// silhouette means the hero doesn't become invalid if XingXing leaves
// the roster — the figure could be any guest, any night.
//
// Cloudinary `enhanceImage(... variant:"hero")` auto-serves WebP/AVIF
// at 900w with retina dpr_auto and quality auto. In local dev with no
// CLOUD_NAME the raw image is returned (graceful fallback).
//
// To revert to the pure-typographic 28s3 hero: `git revert <this>`.

import React from "react";
import { Box, Typography } from "@mui/material";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

import { brand, fonts } from "@/theme";
import { useConciergeMode } from "@/utils/conciergeMode";
import { enhanceImage } from "@/utils/cloudinary";
import ReferralActiveBanner from "@/components/common/ReferralActiveBanner";

const HERO_SRC = "/images/xing/xingxing4.jpg";

const HeroSection: React.FC = () => {
  const { t } = useTranslation();
  const concierge = useConciergeMode();

  const heroOptimised = enhanceImage(HERO_SRC, {
    variant: "hero",
    crop: "fill",
  });

  return (
    <>
      <Box
        component="section"
        aria-label={t("home.hero.aria", "SunRed introduction")}
        sx={{
          position: "relative",
          width: "100%",
          height: "clamp(480px, 78svh, 620px)",
          overflow: "hidden",
          // Cool slate base — visible the instant before the hero image
          // decodes, prevents a flash of cream gradient peeking through.
          backgroundColor: "#1a0e0a",
          color: "#fff",
        }}
      >
        {/* ── Hero image — LCP candidate, prioritised over other fetches ── */}
        <Box
          component="img"
          src={heroOptimised}
          alt=""
          role="presentation"
          loading="eager"
          decoding="async"
          fetchPriority="high"
          sx={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            // Composition tuned for the chosen photo — back-of-shoulder
            // sits in the upper-middle third when cropped to this band.
            objectPosition: "center 28%",
            // Subtle scale-in keeps the hero feeling editorial rather than
            // static. Disabled via prefers-reduced-motion at the OS level.
            animation: "heroScale 14s ease-out forwards",
            "@keyframes heroScale": {
              "0%": { transform: "scale(1.06)" },
              "100%": { transform: "scale(1.0)" },
            },
            "@media (prefers-reduced-motion: reduce)": {
              animation: "none",
            },
          }}
        />

        {/* ── Gradient overlay — top stays clean for the brand mark,
            bottom darkens so white serif copy reads without text-shadow
            doing all the work. */}
        <Box
          aria-hidden="true"
          sx={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(180deg, " +
              "rgba(20,8,12,0.32) 0%, " +
              "rgba(20,8,12,0.04) 22%, " +
              "rgba(20,8,12,0.06) 50%, " +
              "rgba(20,8,12,0.58) 78%, " +
              "rgba(20,8,12,0.92) 100%)",
          }}
        />

        {/* ── Top row: brand mark + live mode pill ───────────────────── */}
        <Box
          sx={{
            position: "absolute",
            top: 18,
            left: 22,
            right: 22,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            zIndex: 2,
          }}
        >
          <Typography
            component="h1"
            sx={{
              fontFamily: fonts.heading,
              fontWeight: 500,
              fontSize: "21px",
              letterSpacing: "0.04em",
              color: "#fff",
              lineHeight: 1,
              textShadow: "0 1px 8px rgba(0,0,0,0.4)",
            }}
          >
            Sun
            <Box component="span" sx={{ color: brand.coral }}>
              Red
            </Box>
          </Typography>

          <Box
            role="status"
            aria-live="polite"
            sx={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "5px 11px",
              borderRadius: 99,
              background: "rgba(255,255,255,0.16)",
              border: "1px solid rgba(255,255,255,0.30)",
              backdropFilter: "blur(10px) saturate(180%)",
              WebkitBackdropFilter: "blur(10px) saturate(180%)",
              fontFamily: fonts.body,
              fontSize: "10.5px",
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "#fff",
            }}
          >
            <Box
              component="span"
              sx={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: brand.green,
                boxShadow: `0 0 0 3px ${brand.green}55`,
              }}
            />
            {concierge.pillLabel}
          </Box>
        </Box>

        {/* ── Bottom block: eyebrow + Fraunces headline ───────────────── */}
        <Box
          component={motion.div}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.95, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
          sx={{
            position: "absolute",
            bottom: 34,
            left: 22,
            right: 22,
            zIndex: 2,
          }}
        >
          <Typography
            component="p"
            sx={{
              fontFamily: fonts.body,
              fontSize: "10.5px",
              fontWeight: 700,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: brand.cream,
              opacity: 0.92,
              marginBottom: "12px",
            }}
          >
            {concierge.promoEyebrow}
          </Typography>

          {/* Editorial headline — one Fraunces sentence, one italic em
              accent in coral (coral reads brighter than brand red on
              dark photography). */}
          <Typography
            component="p"
            sx={{
              fontFamily: fonts.heading,
              fontWeight: 400,
              fontSize: "clamp(34px, 11vw, 46px)",
              lineHeight: 1.06,
              letterSpacing: "-0.015em",
              color: "#fff",
              textShadow: "0 2px 18px rgba(0,0,0,0.45)",
            }}
          >
            {t("home.hero.lineA", "The city quiets. We ")}
            <Box
              component="em"
              sx={{
                fontStyle: "italic",
                color: brand.coral,
                fontWeight: 400,
              }}
            >
              {t("home.hero.lineEm", "arrive")}
            </Box>
            {t("home.hero.lineB", ".")}
          </Typography>
        </Box>
      </Box>

      {/* Referral banner sits below the hero on the cream surface —
          auto-hides when no `?ref=` code is captured from URL. */}
      <ReferralActiveBanner />
    </>
  );
};

export default HeroSection;
