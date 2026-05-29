// src/components/home/HeroSection.tsx
//
// 🎨 Round 28s7 — Shanghai night editorial (founder 2026-05-30).
//
// Round 28s5 went Aman editorial (full-bleed photo). Founder feedback:
// "ปรับเป็นแนว อื่นๆ สไตล์จีน" — wanted a Chinese register, photo
// skipped in favour of typographic ornament.
//
// Direction: Wong Kar-wai "In the Mood for Love" cinematic — deep
// crimson vertical gradient, contemplative pace, decorative Chinese
// character watermark, cream/coral accents instead of pure white.
// CLAUDE.md §6 confirms Chinese tourists are a primary target; the
// hero now greets that audience in their visual language.
//
// Composition:
//
//   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ ← thin cream line
//
//   SunRed                  ● PRIME HOURS
//
//                       静               ← massive 静 (jìng, "quiet")
//                                          watermark, ~70% opacity 0.05,
//                                          right-aligned, decorative
//
//   TONIGHT · PRIME HOURS
//   夜深 · 静候                ← Chinese annotation under eyebrow
//
//   The city quiets.
//   We arrive.                ← Fraunces serif cream, "arrive" coral
//
//   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ ← thin cream line
//
// Why 静 ("quiet"):
//   The Latin headline "The city quiets. We arrive." centres on a
//   single emotion — the late-hour pause. 静 names that emotion in
//   one stroke. It is also a Chinese aesthetic mainstay (Tao silence,
//   tea ceremony, Wong Kar-wai's negative space) so it reads as
//   genuine luxury register, not pastiche.
//
// To revert to the Aman editorial photo hero: `git revert <this>`.

import React from "react";
import { Box, Typography } from "@mui/material";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

import { brand, fonts } from "@/theme";
import { useConciergeMode } from "@/utils/conciergeMode";
import ReferralActiveBanner from "@/components/common/ReferralActiveBanner";

// System Chinese serif stack — devices that ship Source Han / Noto
// Serif SC use them; everything else falls back to the platform
// Chinese system serif (Songti / PingFang on Apple, Microsoft YaHei
// on Windows). No remote font download.
const ZH_SERIF =
  '"Source Han Serif SC", "Noto Serif SC", "Songti SC", "STSong", ' +
  '"Microsoft YaHei", "PingFang SC", serif';

const HeroSection: React.FC = () => {
  const { t } = useTranslation();
  const concierge = useConciergeMode();

  return (
    <>
      <Box
        component="section"
        aria-label={t("home.hero.aria", "SunRed introduction")}
        sx={{
          position: "relative",
          width: "100%",
          height: "clamp(520px, 80svh, 640px)",
          overflow: "hidden",
          // Deep crimson vertical gradient — top reads as oxblood, bottom
          // sinks to near-black. Mood pinned to late-night.
          background:
            "linear-gradient(180deg, " +
            "#5C0A18 0%, " +
            "#7A1024 22%, " +
            "#561020 58%, " +
            "#1F060C 100%)",
          color: brand.cream,
        }}
      >
        {/* ── Watermark 静 — decorative, screen-reader hidden ─────────
            Sits behind everything, off-axis right, very faint so the
            headline retains the page hierarchy. */}
        <Box
          aria-hidden="true"
          sx={{
            position: "absolute",
            right: "-6%",
            top: "8%",
            fontFamily: ZH_SERIF,
            fontWeight: 400,
            fontSize: "clamp(360px, 92vw, 520px)",
            lineHeight: 1,
            color: "rgba(254, 201, 167, 0.06)",
            userSelect: "none",
            pointerEvents: "none",
          }}
        >
          静
        </Box>

        {/* ── Cinematic letterbox lines — thin cream, top + bottom ──── */}
        <Box
          aria-hidden="true"
          sx={{
            position: "absolute",
            top: 62,
            left: 22,
            right: 22,
            height: 1,
            background:
              "linear-gradient(90deg, " +
              "transparent 0%, " +
              "rgba(254,201,167,0.32) 20%, " +
              "rgba(254,201,167,0.32) 80%, " +
              "transparent 100%)",
          }}
        />
        <Box
          aria-hidden="true"
          sx={{
            position: "absolute",
            bottom: 26,
            left: 22,
            right: 22,
            height: 1,
            background:
              "linear-gradient(90deg, " +
              "transparent 0%, " +
              "rgba(254,201,167,0.32) 20%, " +
              "rgba(254,201,167,0.32) 80%, " +
              "transparent 100%)",
          }}
        />

        {/* ── Top row: brand mark + live mode pill ───────────────────── */}
        <Box
          sx={{
            position: "absolute",
            top: 20,
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
              color: brand.cream,
              lineHeight: 1,
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
              background: "rgba(254, 201, 167, 0.10)",
              border: "1px solid rgba(254, 201, 167, 0.26)",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
              fontFamily: fonts.body,
              fontSize: "10.5px",
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: brand.cream,
            }}
          >
            <Box
              component="span"
              sx={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: brand.coral,
                boxShadow: `0 0 0 3px ${brand.coral}40`,
              }}
            />
            {concierge.pillLabel}
          </Box>
        </Box>

        {/* ── Bottom block: bilingual eyebrow + Fraunces headline ───── */}
        <Box
          component={motion.div}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.05, ease: [0.16, 1, 0.3, 1], delay: 0.18 }}
          sx={{
            position: "absolute",
            bottom: 50,
            left: 22,
            right: 22,
            zIndex: 2,
          }}
        >
          {/* Latin eyebrow (concierge mode → "TONIGHT · PRIME HOURS"
              etc.) above the Chinese annotation. */}
          <Typography
            component="p"
            sx={{
              fontFamily: fonts.body,
              fontSize: "10.5px",
              fontWeight: 700,
              letterSpacing: "0.20em",
              textTransform: "uppercase",
              color: brand.cream,
              opacity: 0.78,
              marginBottom: "4px",
            }}
          >
            {concierge.promoEyebrow}
          </Typography>

          {/* Chinese annotation — 夜深 (deep night) · 静候 (waiting
              quietly). Decorative for non-Chinese readers; meaningful
              for the brand's primary tourist segment. */}
          <Typography
            component="p"
            sx={{
              fontFamily: ZH_SERIF,
              fontSize: "12.5px",
              fontWeight: 400,
              letterSpacing: "0.3em",
              color: brand.cream,
              opacity: 0.62,
              marginBottom: "18px",
            }}
          >
            夜深 · 静候
          </Typography>

          {/* Editorial headline — Fraunces serif, italic em on the
              accent word. Cream over crimson reads warmer than white
              while keeping the brand red/coral identity intact. */}
          <Typography
            component="p"
            sx={{
              fontFamily: fonts.heading,
              fontWeight: 400,
              fontSize: "clamp(36px, 12vw, 48px)",
              lineHeight: 1.05,
              letterSpacing: "-0.015em",
              color: brand.cream,
              textShadow: "0 2px 22px rgba(20,6,12,0.45)",
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
