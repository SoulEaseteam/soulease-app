// src/components/home/HeroSection.tsx
//
// 🎨 Round 28s3 — Quiet-luxury rewrite (founder 2026-05-30).
//
// Why this exists in its current form:
//   The previous HeroSection (Round 28) layered 7 surfaces before the
//   practitioner grid: live pill row, social-proof "12 bookings in
//   24h", verified row, weather-aware Tonight banner card, three niche
//   tiles (Jet Lag / Couples / Express), two loyalty cards (Concierge /
//   Refer), then finally the grid header.
//
//   Founder feedback 2026-05-30: "ไม่ค่อยน่าเข้า". The seven shouting
//   surfaces read as bazaar energy, not Aman energy. CLAUDE.md §3 brand
//   goal is quiet luxury (Aman · Six Senses · Mandarin Oriental). This
//   rewrite strips the hero to:
//     • brand mark + live mode pill
//     • one Fraunces serif headline with one italic-red accent word
//     • one eyebrow + concierge-mode line
//   Everything else (niche tiles, loyalty cards, social-proof ticker,
//   weather widget, first-booking banner) has been removed. Discount
//   capture for `?ref=` URLs still happens at the page level via
//   `captureReferralFromURL` in HomePage.tsx — losing the visual banner
//   does not break referral attribution.
//
//   The therapist grid below the hero is now the second surface a guest
//   sees instead of the eighth.
//
//   To revert: `git revert <this commit>` — the prior 1230-line version
//   is fully preserved in git history.

import React from "react";
import { Box, Typography } from "@mui/material";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

import { brand, fonts } from "@/theme";
import { useConciergeMode } from "@/utils/conciergeMode";
// ReferralActiveBanner self-hides when no ?ref= code is captured — safe
// to mount unconditionally. Kept because a referred guest landing on
// the home should still see "Referral active · ฿500 off" before they
// pick a practitioner.
import ReferralActiveBanner from "@/components/common/ReferralActiveBanner";

const HeroSection: React.FC = () => {
  const { t } = useTranslation();
  const concierge = useConciergeMode();

  return (
    <Box
      component="section"
      aria-label={t("home.hero.aria", "SunRed introduction")}
      sx={{
        position: "relative",
        padding: "20px 22px 28px",
      }}
    >
      {/* ── Top row: brand mark + live mode pill ───────────────────── */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "44px",
        }}
      >
        <Typography
          component="h1"
          sx={{
            fontFamily: fonts.heading,
            fontWeight: 500,
            fontSize: "20px",
            letterSpacing: "0.04em",
            color: brand.text,
            lineHeight: 1,
          }}
        >
          Sun
          <Box component="span" sx={{ color: brand.red }}>
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
            padding: "4px 10px",
            borderRadius: 99,
            background: "rgba(255,255,255,0.6)",
            border: "1px solid rgba(184, 92, 60, 0.15)",
            fontFamily: fonts.body,
            fontSize: "10.5px",
            fontWeight: 600,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: brand.textMuted,
          }}
        >
          <Box
            component="span"
            sx={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: brand.green,
              boxShadow: `0 0 0 3px ${brand.green}22`,
            }}
          />
          {concierge.pillLabel}
        </Box>
      </Box>

      {/* ── Referral banner (auto-hides when no ?ref= present) ─────── */}
      <ReferralActiveBanner />

      {/* Editorial headline — one Fraunces sentence, one italic em
          accent in brand red. Localisable via i18n; defaults fall
          back to the English line until per-locale keys are added. */}
      <Box
        component={motion.div}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        sx={{ marginBottom: "40px" }}
      >
        <Typography
          component="p"
          sx={{
            fontFamily: fonts.heading,
            fontWeight: 400,
            fontSize: "clamp(34px, 11vw, 44px)",
            lineHeight: 1.08,
            letterSpacing: "-0.015em",
            color: brand.text,
          }}
        >
          {t("home.hero.lineA", "We ")}
          <Box
            component="em"
            sx={{
              fontStyle: "italic",
              color: brand.red,
              fontWeight: 400,
            }}
          >
            {t("home.hero.lineEm", "arrive")}
          </Box>
          {t(
            "home.hero.lineB",
            " at the hour you choose."
          )}
        </Typography>
      </Box>

      {/* ── Concierge mode line ─────────────────────────────────────
          Replaces the old Tonight Special banner. One eyebrow + one
          plain status sentence. The eyebrow rotates with the four
          operational windows (Prime / Evening / Day / Off-hours);
          the body line stays consistent. */}
      <Box>
        <Typography
          component="p"
          sx={{
            fontFamily: fonts.body,
            fontSize: "10.5px",
            fontWeight: 700,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: brand.accent,
            marginBottom: "4px",
          }}
        >
          {t("home.hero.eyebrow", "Tonight")} · {concierge.promoEyebrow}
        </Typography>
        <Typography
          component="p"
          sx={{
            fontFamily: fonts.body,
            fontSize: "13.5px",
            fontWeight: 500,
            lineHeight: 1.5,
            color: brand.textMuted,
          }}
        >
          {t(
            "home.hero.status",
            "Concierge online · Practitioner dispatched within the hour."
          )}
        </Typography>
      </Box>
    </Box>
  );
};

export default HeroSection;
