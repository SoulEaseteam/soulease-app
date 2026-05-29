// src/components/home/HeroSection.tsx
//
// 🎯 Round 28s8 — Conversion-first hero (founder 2026-05-30).
//
// Three luxury-aesthetic iterations (28s3 pure-type, 28s5 Aman
// photo, 28s7 Shanghai 静) did not feel right to the founder. She
// re-scoped the hero brief tonight to "ปิดดีลไวไว — conversion
// first". This rewrite drops luxury chatter entirely and optimises
// for the behaviour the funnel data already proves wins:
//
//   • 13 concierge taps (WhatsApp + Telegram + LINE) outscored
//     6 booking-flow starts in the last 7 days. Guests prefer to
//     ASK a human before self-serving the form.
//   • In-flow conversion is already 67% — when guests commit to
//     the form they finish; nothing to fix there.
//   • The blocker is COMMITMENT, not completion. The hero now
//     leads with one large primary action (chat) and one secondary
//     (Telegram), with a clear time promise + price anchor so a
//     guest can decide in one screen.
//
// Composition:
//
//   ┌────────────────────────────────┐
//   │  SunRed              ● PRIME   │
//   │                                │
//   │  Practitioner at               │  ← Fraunces serif, white
//   │  your door — tonight.          │
//   │                                │
//   │  Concierge live · arrives      │  ← time promise, body white
//   │  within 40 minutes.            │
//   │                                │
//   │  ╔════════════════════════════╗│
//   │  ║  💬  Chat — WhatsApp       ║│  ← PRIMARY CTA, white on red
//   │  ║      Reply in 2 min         ║│
//   │  ╚════════════════════════════╝│
//   │                                │
//   │  ┌────────────────────────────┐│
//   │  │  ✈  Telegram               ││  ← Secondary, outlined
//   │  └────────────────────────────┘│
//   │                                │
//   │  ↓ or browse practitioners ↓   │  ← tiny pointer
//   │  From ฿1,200 · 60 min · 24/7   │  ← micro trust line
//   └────────────────────────────────┘
//
// Background: brand red→coral gradient. No photo, no Chinese
// characters, no negative-space contemplation. The hero asks the
// guest to act, not to feel.
//
// Channels reuse the canonical CONTACT URLs already used by
// HomeFooter, AdminFloatingChat, HowItWorks, and ProfilePage so
// updates remain a one-place edit. Both CTAs fire
// `trackConciergeOpen` so the funnel analytics keep counting.

import React from "react";
import { Box, Typography, Button } from "@mui/material";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import TelegramIcon from "@mui/icons-material/Telegram";
import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";

import { brand, fonts, gradients } from "@/theme";
import { useConciergeMode } from "@/utils/conciergeMode";
import { trackConciergeOpen } from "@/utils/analytics";
import ReferralActiveBanner from "@/components/common/ReferralActiveBanner";

// Canonical concierge channel URLs — see HomeFooter.tsx,
// AdminFloatingChat.tsx, HowItWorks.tsx for the same constants.
const WHATSAPP_URL = "https://wa.me/66634350987";
const TELEGRAM_URL = "https://t.me/SunRedvip_bkk";

const HeroSection: React.FC = () => {
  const { t } = useTranslation();
  const concierge = useConciergeMode();

  const handleWhatsApp = () => {
    trackConciergeOpen("whatsapp");
    window.open(WHATSAPP_URL, "_blank", "noopener,noreferrer");
  };

  const handleTelegram = () => {
    trackConciergeOpen("telegram");
    window.open(TELEGRAM_URL, "_blank", "noopener,noreferrer");
  };

  return (
    <>
      <Box
        component="section"
        aria-label={t("home.hero.aria", "Book a practitioner")}
        sx={{
          position: "relative",
          width: "100%",
          padding: "20px 22px 28px",
          // Brand-red gradient — primary identity, no photo to distract
          // from the two action buttons below.
          background: gradients.primary,
          color: "#fff",
        }}
      >
        {/* ── Top row: brand mark + live mode pill ───────────────────── */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "32px",
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
            }}
          >
            SunRed
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
              background: "rgba(255,255,255,0.18)",
              border: "1px solid rgba(255,255,255,0.32)",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
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
                background: "#fff",
                boxShadow: "0 0 0 3px rgba(255,255,255,0.35)",
              }}
            />
            {concierge.pillLabel}
          </Box>
        </Box>

        {/* ── Headline + time promise ────────────────────────────────── */}
        <Box
          component={motion.div}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <Typography
            component="p"
            sx={{
              fontFamily: fonts.heading,
              fontWeight: 400,
              fontSize: "clamp(30px, 9vw, 36px)",
              lineHeight: 1.08,
              letterSpacing: "-0.015em",
              color: "#fff",
              marginBottom: "12px",
            }}
          >
            {t(
              "home.hero.title",
              "Practitioner at your door — tonight."
            )}
          </Typography>

          <Typography
            component="p"
            sx={{
              fontFamily: fonts.body,
              fontSize: "14px",
              fontWeight: 500,
              lineHeight: 1.5,
              color: "rgba(255,255,255,0.92)",
              marginBottom: "22px",
            }}
          >
            {t(
              "home.hero.promise",
              "Concierge live · arrives within 40 minutes."
            )}
          </Typography>
        </Box>

        {/* ── Primary CTA: WhatsApp ──────────────────────────────────── */}
        <Button
          fullWidth
          onClick={handleWhatsApp}
          aria-label={t("home.hero.ctaWhatsApp", "Chat to book via WhatsApp")}
          startIcon={<WhatsAppIcon sx={{ fontSize: "22px !important" }} />}
          sx={{
            // Default MUI Button row layout — startIcon sits left of
            // the content. The inner Box stacks title + subtitle.
            padding: "14px 20px",
            borderRadius: "16px",
            background: "#fff",
            color: brand.red,
            justifyContent: "flex-start",
            fontFamily: fonts.body,
            fontWeight: 700,
            fontSize: "16px",
            letterSpacing: "-0.005em",
            textTransform: "none",
            boxShadow:
              "0 12px 32px rgba(20, 5, 10, 0.18), 0 2px 6px rgba(20, 5, 10, 0.10)",
            marginBottom: "10px",
            "&:hover": {
              background: "#fff",
              boxShadow:
                "0 14px 38px rgba(20, 5, 10, 0.22), 0 3px 8px rgba(20, 5, 10, 0.14)",
              transform: "translateY(-1px)",
            },
            // startIcon override — keep icon left of stacked text
            "& .MuiButton-startIcon": {
              marginRight: "10px",
              marginLeft: 0,
            },
            transition: "transform 0.18s ease, box-shadow 0.18s ease",
          }}
        >
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              lineHeight: 1.1,
            }}
          >
            <Box component="span" sx={{ fontSize: "16px", fontWeight: 700 }}>
              {t("home.hero.ctaWhatsAppTitle", "Chat — WhatsApp")}
            </Box>
            <Box
              component="span"
              sx={{
                fontSize: "11px",
                fontWeight: 500,
                color: brand.textMuted,
                marginTop: "2px",
                letterSpacing: "0.01em",
              }}
            >
              {t("home.hero.ctaWhatsAppSub", "Reply in 2 minutes")}
            </Box>
          </Box>
        </Button>

        {/* ── Secondary CTA: Telegram ───────────────────────────────── */}
        <Button
          fullWidth
          onClick={handleTelegram}
          aria-label={t("home.hero.ctaTelegram", "Open Telegram channel")}
          startIcon={<TelegramIcon sx={{ fontSize: "20px !important" }} />}
          sx={{
            padding: "11px 20px",
            borderRadius: "16px",
            background: "rgba(255,255,255,0.10)",
            border: "1px solid rgba(255,255,255,0.40)",
            color: "#fff",
            fontFamily: fonts.body,
            fontWeight: 600,
            fontSize: "14.5px",
            textTransform: "none",
            backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)",
            marginBottom: "20px",
            "&:hover": {
              background: "rgba(255,255,255,0.18)",
              border: "1px solid rgba(255,255,255,0.55)",
            },
          }}
        >
          {t("home.hero.ctaTelegramLabel", "Telegram")}
        </Button>

        {/* ── Browse hint + micro trust line ─────────────────────────── */}
        <Box
          sx={{
            textAlign: "center",
            fontFamily: fonts.body,
          }}
        >
          <Typography
            component="p"
            sx={{
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              fontSize: "12px",
              fontWeight: 600,
              color: "rgba(255,255,255,0.85)",
              letterSpacing: "0.02em",
              marginBottom: "8px",
            }}
          >
            {t("home.hero.browseHint", "or browse practitioners below")}
            <KeyboardArrowDownRoundedIcon
              sx={{ fontSize: 16, opacity: 0.9 }}
            />
          </Typography>

          <Typography
            component="p"
            sx={{
              fontSize: "11px",
              fontWeight: 500,
              color: "rgba(255,255,255,0.72)",
              letterSpacing: "0.04em",
            }}
          >
            {t(
              "home.hero.trustLine",
              "From ฿1,200 · 60 min · Sukhumvit · Silom · Asok"
            )}
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
