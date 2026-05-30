// src/components/home/HeroSection.tsx
//
// 🎯 Round 28s9 — Plantum-style card hero (founder 2026-05-30).
//
// Founder sent a Plantum app screenshot as reference: "เอาแค่ตรง
// hero". The Plantum DNA she keyed on:
//   • Soft pastel background — not a hard brand-color gradient
//   • Three-column status row at the very top (live data, scannable)
//   • Friendly greeting card with avatar + sub-line
//   • One bright promo banner — the primary action, gradient, with
//     a decorative motif so it pops above the calmer cards
//
// Keeps the 28s8 conversion-first intent (chat is the action) but
// uses the Plantum layout language instead of a single red-gradient
// monolith. Multiple cards on a cream surface read friendlier and
// give the eye distinct rest points — useful for tired late-night
// guests skimming on a phone.
//
// Structure:
//
//   Soft cream gradient bg
//
//   ● PRIME HOURS    ▲ Bangkok          🌙       ← status row
//   Concierge live   Sukhumvit · Silom  Tonight
//
//   ┌────────────────────────────────────┐
//   │ [SR]  Good evening                 │       ← greeting card
//   │       Concierge online · tap to chat│
//   └────────────────────────────────────┘
//
//   ┌────────────────────────────────────┐
//   │ Chat to book                  [→]  │       ← promo banner
//   │ Reply in 2 min · WhatsApp          │       brand red→coral gradient
//   └────────────────────────────────────┘
//
//   ┌────────────────────────────────────┐
//   │ ✈ Telegram                          │      ← secondary, slim
//   └────────────────────────────────────┘
//
// Both the greeting card and the promo banner tap into WhatsApp —
// guests reading either as the primary affordance still end up in
// the same chat, which the funnel data shows wins.

import React from "react";
import { Box, Typography } from "@mui/material";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import TelegramIcon from "@mui/icons-material/Telegram";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import PlaceRoundedIcon from "@mui/icons-material/PlaceRounded";

import { brand, fonts, gradients } from "@/theme";
import { useConciergeMode } from "@/utils/conciergeMode";
import { trackConciergeOpen } from "@/utils/analytics";
import ConciergeModeIcon from "@/components/common/ConciergeModeIcon";
import ReferralActiveBanner from "@/components/common/ReferralActiveBanner";

// Canonical channel URLs (HomeFooter / AdminFloatingChat / HowItWorks /
// ProfilePage use the same constants).
const WHATSAPP_URL = "https://wa.me/66634350987";
const TELEGRAM_URL = "https://t.me/SunRedvip_bkk";

/** Time-aware greeting derived from the concierge operational window.
 *  Strings are kept short — Plantum-style greeting cards lean on the
 *  greeting itself being the visual hook. */
function greetingFor(mode: string): string {
  switch (mode) {
    case "prime":
      return "Good night";
    case "evening":
      return "Good evening";
    case "day":
      return "Good afternoon";
    case "off":
    default:
      return "Good morning";
  }
}

const HeroSection: React.FC = () => {
  const { t } = useTranslation();
  const concierge = useConciergeMode();

  const greeting = greetingFor(concierge.mode);

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
          padding: "20px 18px 24px",
          // Soft cream→peach gradient — Plantum's pastel base, swapped
          // to SunRed's warm palette. Cards read crisp on top of it.
          background:
            "linear-gradient(180deg, #FFF6EF 0%, #FCEBDC 100%)",
        }}
      >
        {/* ── Status row — three columns, no card chrome ───────────── */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "1fr auto 1fr",
            alignItems: "center",
            gap: "10px",
            marginBottom: "18px",
            padding: "0 4px",
          }}
        >
          {/* LEFT — live mode (e.g. "PRIME HOURS / Concierge live") */}
          <Box>
            <Typography
              component="p"
              sx={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                fontFamily: fonts.body,
                fontSize: "11px",
                fontWeight: 800,
                letterSpacing: "0.10em",
                textTransform: "uppercase",
                color: brand.text,
                lineHeight: 1.1,
              }}
            >
              <Box
                component="span"
                sx={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: brand.green,
                  boxShadow: `0 0 0 3px ${brand.green}33`,
                }}
              />
              {concierge.pillLabel}
            </Typography>
            <Typography
              component="p"
              sx={{
                fontFamily: fonts.body,
                fontSize: "10.5px",
                fontWeight: 500,
                color: brand.textMuted,
                marginTop: "2px",
              }}
            >
              {t("home.hero.statusLive", "Concierge live")}
            </Typography>
          </Box>

          {/* CENTER — service area */}
          <Box sx={{ textAlign: "center" }}>
            <Typography
              component="p"
              sx={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                fontFamily: fonts.body,
                fontSize: "11px",
                fontWeight: 800,
                letterSpacing: "0.10em",
                textTransform: "uppercase",
                color: brand.text,
                lineHeight: 1.1,
              }}
            >
              <PlaceRoundedIcon
                sx={{ fontSize: 13, color: brand.red }}
              />
              Bangkok
            </Typography>
            <Typography
              component="p"
              sx={{
                fontFamily: fonts.body,
                fontSize: "10.5px",
                fontWeight: 500,
                color: brand.textMuted,
                marginTop: "2px",
                whiteSpace: "nowrap",
              }}
            >
              {t("home.hero.areas", "Sukhumvit · Silom · Asok")}
            </Typography>
          </Box>

          {/* RIGHT — time-of-day glyph + window label */}
          <Box sx={{ textAlign: "right" }}>
            <Box
              sx={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "flex-end",
                gap: "4px",
              }}
            >
              <ConciergeModeIcon
                mode={concierge.mode}
                sx={{ fontSize: 16, color: brand.red }}
              />
              <Typography
                component="span"
                sx={{
                  fontFamily: fonts.body,
                  fontSize: "11px",
                  fontWeight: 800,
                  letterSpacing: "0.10em",
                  textTransform: "uppercase",
                  color: brand.text,
                  lineHeight: 1.1,
                }}
              >
                {concierge.promoEyebrow.split("·").pop()?.trim() ??
                  concierge.promoEyebrow}
              </Typography>
            </Box>
            <Typography
              component="p"
              sx={{
                fontFamily: fonts.body,
                fontSize: "10.5px",
                fontWeight: 500,
                color: brand.textMuted,
                marginTop: "2px",
              }}
            >
              {t("home.hero.tonightLabel", "Tonight")}
            </Typography>
          </Box>
        </Box>

        {/* ── Greeting card — white rounded, soft shadow ─────────────── */}
        <Box
          component={motion.div}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          onClick={handleWhatsApp}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              handleWhatsApp();
            }
          }}
          aria-label={t(
            "home.hero.greetingAria",
            "Tap to chat with concierge"
          )}
          sx={{
            display: "flex",
            alignItems: "center",
            gap: "14px",
            padding: "14px 16px",
            borderRadius: "20px",
            background: "#fff",
            border: "1px solid rgba(184, 92, 60, 0.10)",
            boxShadow:
              "0 6px 20px rgba(126, 30, 46, 0.06), 0 1px 2px rgba(126, 30, 46, 0.04)",
            cursor: "pointer",
            marginBottom: "12px",
            transition: "transform 0.18s ease, box-shadow 0.18s ease",
            "&:hover": {
              transform: "translateY(-1px)",
              boxShadow:
                "0 10px 28px rgba(126, 30, 46, 0.10), 0 1px 2px rgba(126, 30, 46, 0.05)",
            },
            "&:focus-visible": {
              outline: `2px solid ${brand.red}`,
              outlineOffset: 2,
            },
          }}
        >
          {/* Avatar — SunRed brand mark */}
          <Box
            sx={{
              flexShrink: 0,
              width: 44,
              height: 44,
              borderRadius: "50%",
              background: gradients.primary,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow:
                "0 4px 12px rgba(254, 9, 68, 0.30), inset 0 1px 0 rgba(255,255,255,0.30)",
            }}
          >
            <Box
              component="img"
              src="/images/logo/sunred-mark.svg"
              alt=""
              aria-hidden="true"
              sx={{
                width: 24,
                height: 24,
                filter: "brightness(0) invert(1)",
              }}
            />
          </Box>

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              component="p"
              sx={{
                fontFamily: fonts.heading,
                fontWeight: 600,
                fontSize: "18px",
                color: brand.text,
                lineHeight: 1.15,
              }}
            >
              {t(`home.hero.greeting.${concierge.mode}`, greeting)}
            </Typography>
            <Typography
              component="p"
              sx={{
                fontFamily: fonts.body,
                fontSize: "12.5px",
                fontWeight: 500,
                color: brand.textMuted,
                marginTop: "2px",
              }}
            >
              {t("home.hero.greetingSub", "Tap here to chat with concierge")}
            </Typography>
          </Box>

          <ArrowForwardRoundedIcon
            sx={{ fontSize: 18, color: brand.red, opacity: 0.55 }}
          />
        </Box>

        {/* ── Promo banner — primary CTA, brand red gradient ─────────── */}
        <Box
          component={motion.div}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
          onClick={handleWhatsApp}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              handleWhatsApp();
            }
          }}
          aria-label={t(
            "home.hero.promoAria",
            "Chat to book via WhatsApp"
          )}
          sx={{
            position: "relative",
            display: "flex",
            alignItems: "center",
            gap: "14px",
            padding: "18px 20px",
            borderRadius: "20px",
            background: gradients.primary,
            color: "#fff",
            cursor: "pointer",
            overflow: "hidden",
            boxShadow:
              "0 12px 32px rgba(254, 9, 68, 0.28), 0 2px 6px rgba(254, 9, 68, 0.18)",
            marginBottom: "10px",
            transition: "transform 0.18s ease, box-shadow 0.18s ease",
            "&:hover": {
              transform: "translateY(-1px)",
              boxShadow:
                "0 16px 40px rgba(254, 9, 68, 0.34), 0 3px 8px rgba(254, 9, 68, 0.22)",
            },
            "&:focus-visible": {
              outline: `2px solid #fff`,
              outlineOffset: 2,
            },
          }}
        >
          {/* Decorative WhatsApp glyph fading in from the right edge —
              Plantum-style playful motif without illustration files. */}
          <Box
            aria-hidden="true"
            sx={{
              position: "absolute",
              right: -12,
              top: "50%",
              transform: "translateY(-50%) rotate(-12deg)",
              fontSize: 132,
              lineHeight: 1,
              color: "rgba(255,255,255,0.10)",
              pointerEvents: "none",
            }}
          >
            <WhatsAppIcon sx={{ fontSize: "inherit" }} />
          </Box>

          <Box sx={{ flex: 1, minWidth: 0, zIndex: 1 }}>
            <Typography
              component="p"
              sx={{
                fontFamily: fonts.heading,
                fontWeight: 600,
                fontSize: "20px",
                color: "#fff",
                lineHeight: 1.1,
                marginBottom: "4px",
              }}
            >
              {t("home.hero.promoTitle", "Chat to book")}
            </Typography>
            <Typography
              component="p"
              sx={{
                fontFamily: fonts.body,
                fontSize: "12.5px",
                fontWeight: 500,
                color: "rgba(255,255,255,0.92)",
                letterSpacing: "0.005em",
              }}
            >
              {t(
                "home.hero.promoSub",
                "Reply in 2 minutes · WhatsApp"
              )}
            </Typography>
          </Box>

          <Box
            sx={{
              flexShrink: 0,
              zIndex: 1,
              width: 36,
              height: 36,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.20)",
              border: "1px solid rgba(255,255,255,0.35)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ArrowForwardRoundedIcon sx={{ fontSize: 18, color: "#fff" }} />
          </Box>
        </Box>

        {/* ── Telegram secondary — slim card ─────────────────────────── */}
        <Box
          component={motion.div}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.16, ease: [0.16, 1, 0.3, 1] }}
          onClick={handleTelegram}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              handleTelegram();
            }
          }}
          aria-label={t(
            "home.hero.telegramAria",
            "Open Telegram channel"
          )}
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            padding: "10px 16px",
            borderRadius: "14px",
            background: "rgba(255,255,255,0.6)",
            border: "1px solid rgba(184, 92, 60, 0.18)",
            cursor: "pointer",
            transition: "background 0.18s ease, transform 0.12s ease",
            "&:hover": {
              background: "rgba(255,255,255,0.8)",
              transform: "translateY(-1px)",
            },
            "&:focus-visible": {
              outline: `2px solid ${brand.red}`,
              outlineOffset: 2,
            },
          }}
        >
          <TelegramIcon sx={{ fontSize: 18, color: brand.red }} />
          <Typography
            component="span"
            sx={{
              fontFamily: fonts.body,
              fontSize: "13.5px",
              fontWeight: 600,
              color: brand.text,
            }}
          >
            {t("home.hero.telegramLabel", "Or message Telegram")}
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
