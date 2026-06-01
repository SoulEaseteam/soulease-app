// src/components/home/ReserveCTA.tsx
//
// 🆕 Round 28s112 — Sticky-feel reservation CTA between HeroSection and
//   HomeTherapistGrid. Closes the audit gap #9 in docs/site-audit-2026-06.md:
//   first-time visitor from Stickman / Telegram cross-promo / WeChat OA
//   lands on home and wonders "where do I click to book?". The greeting
//   tap → WhatsApp exists but reads as plain text · not a CTA.
//
// Design choices
//  • Time-aware headline (uses useConciergeMode) — "Reserve tonight" in
//    prime, "Reserve your evening" earlier, etc. Same mode engine the
//    rest of the home uses, so visual tone stays consistent.
//  • Primary CTA = Telegram concierge (per CLAUDE.md §5 founder bias:
//    "Telegram first — marketing-first channel"). Single clear button,
//    no decision paralysis.
//  • Secondary row = small chips for WhatsApp / LINE / WeChat for
//    customers who already use those — visible but quiet.
//  • Quiet luxury palette (warm cream gradient + brand-red CTA),
//    Fraunces serif for the headline. Matches Hero / HowItWorks /
//    PromiseStrip register so nothing reads like a hard sell.
//  • Analytics: trackConciergeOpen('reserve_cta_{channel}') so we can
//    measure which channel converts when this CTA fires.

import React from "react";
import { Box, Typography } from "@mui/material";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import { FaTelegramPlane, FaWhatsapp, FaLine, FaWeixin } from "react-icons/fa";

import { brand, fonts } from "@/theme";
import { useConciergeMode } from "@/utils/conciergeMode";
import { trackConciergeOpen } from "@/utils/analytics";

// 🆕 Round 28s126 — Primary Telegram CTA now routes through the FAQ
//   bot (@SunRedGreeterBot) instead of the personal concierge handle.
//   Customers get instant multilingual greeting + 6-button menu
//   (Pricing · Services · Areas · Available now · How to book · Chat
//   with concierge) before reaching View's inbox.
const TELEGRAM_URL = "https://t.me/SunRedGreeterBot";
const WHATSAPP_URL = "https://wa.me/66634350987";
const LINE_URL = "https://lin.ee/uqvdwWt";
const WECHAT_ROUTE = "/wechat-scan"; // internal scan page

interface SecondaryChip {
  Icon: React.ElementType;
  label: string;
  href: string;
  external: boolean;
  fg: string;
  source: string;
}

const SECONDARY_CHIPS: SecondaryChip[] = [
  {
    Icon: FaWhatsapp,
    label: "WhatsApp",
    href: WHATSAPP_URL,
    external: true,
    fg: "#25D366",
    source: "whatsapp",
  },
  {
    Icon: FaLine,
    label: "LINE",
    href: LINE_URL,
    external: true,
    fg: "#06C755",
    source: "line",
  },
  {
    Icon: FaWeixin,
    label: "WeChat",
    href: WECHAT_ROUTE,
    external: false,
    fg: "#07C160",
    source: "wechat",
  },
];

/** Mode-aware headline. Maps the four concierge windows to a natural
 *  reservation invitation. Stays in English so the same string copies
 *  cleanly to Telegram/WhatsApp pre-fill in a future iteration. */
function headlineFor(mode: string): string {
  switch (mode) {
    case "prime":
      return "Reserve tonight";
    case "evening":
      return "Reserve your evening";
    case "day":
      return "Reserve your afternoon";
    case "off":
    default:
      return "Reserve your session";
  }
}

const ReserveCTA: React.FC = () => {
  const { t } = useTranslation();
  const concierge = useConciergeMode();
  const headline = headlineFor(concierge.mode);

  const handleTelegram = () => {
    trackConciergeOpen("reserve_cta_telegram");
    window.open(TELEGRAM_URL, "_blank", "noopener,noreferrer");
  };

  const handleChip = (chip: SecondaryChip) => {
    trackConciergeOpen(`reserve_cta_${chip.source}`);
    if (chip.external) {
      window.open(chip.href, "_blank", "noopener,noreferrer");
    } else {
      window.location.href = chip.href;
    }
  };

  return (
    <Box
      component={motion.section}
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
      aria-label={t("home.reserveCta.aria", "Reserve your session")}
      sx={{
        margin: "20px 16px 8px",
        padding: "20px 18px 16px",
        borderRadius: "20px",
        background:
          "#F4F6F5",
        border: "1px solid rgba(184, 92, 60, 0.14)",
        boxShadow:
          "0 10px 30px rgba(15, 23, 42, 0.06), 0 2px 6px rgba(15, 23, 42, 0.04)",
      }}
    >
      {/* Eyebrow */}
      <Typography
        component="p"
        sx={{
          fontFamily: fonts.body,
          fontSize: "10px",
          fontWeight: 800,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: brand.accent,
          marginBottom: "6px",
        }}
      >
        {t("home.reserveCta.eyebrow", "Concierge · 24/7")}
      </Typography>

      {/* Headline (mode-aware) */}
      <Typography
        component="h2"
        sx={{
          fontFamily: fonts.heading,
          fontWeight: 600,
          fontSize: "22px",
          lineHeight: 1.15,
          letterSpacing: "-0.01em",
          color: brand.text,
          marginBottom: "4px",
          "& em": { fontStyle: "italic", color: brand.red },
        }}
      >
        {t(`home.reserveCta.headline.${concierge.mode}`, headline)}
      </Typography>

      <Typography
        component="p"
        sx={{
          fontFamily: fonts.body,
          fontSize: "13px",
          fontWeight: 500,
          color: brand.textMuted,
          lineHeight: 1.4,
          marginBottom: "14px",
        }}
      >
        {t(
          "home.reserveCta.sub",
          "Concierge replies in minutes · English, 中文, 日本語, 한국어, ไทย."
        )}
      </Typography>

      {/* Primary CTA — Telegram (founder strategy) */}
      <Box
        component="button"
        type="button"
        onClick={handleTelegram}
        aria-label={t(
          "home.reserveCta.primaryAria",
          "Open Telegram concierge"
        )}
        sx={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "10px",
          padding: "13px 16px",
          borderRadius: "14px",
          background:
            "#B4000A",
          color: "#fff",
          border: "none",
          cursor: "pointer",
          fontFamily: fonts.heading,
          fontWeight: 600,
          fontSize: "15px",
          letterSpacing: "0.005em",
          boxShadow:
            "0 10px 24px rgba(15, 23, 42, 0.28), 0 2px 6px rgba(15, 23, 42, 0.16)",
          transition: "transform 0.18s ease, box-shadow 0.18s ease",
          "&:hover": {
            transform: "translateY(-1px)",
            boxShadow:
              "0 14px 30px rgba(15, 23, 42, 0.34), 0 3px 8px rgba(15, 23, 42, 0.18)",
          },
          "&:focus-visible": {
            outline: "2px solid #fff",
            outlineOffset: 2,
          },
        }}
      >
        <FaTelegramPlane size={18} />
        <span>
          {t("home.reserveCta.primary", "Telegram concierge")}
        </span>
        <ArrowForwardRoundedIcon sx={{ fontSize: 18 }} />
      </Box>

      {/* Secondary chips */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "8px",
          marginTop: "12px",
        }}
      >
        <Typography
          component="span"
          sx={{
            fontFamily: fonts.body,
            fontSize: "10.5px",
            fontWeight: 600,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: brand.textMuted,
            marginRight: "2px",
          }}
        >
          {t("home.reserveCta.or", "or")}
        </Typography>

        {SECONDARY_CHIPS.map((chip) => {
          const Icon = chip.Icon;
          return (
            <Box
              key={chip.source}
              component="button"
              type="button"
              onClick={() => handleChip(chip)}
              aria-label={t(
                "home.reserveCta.chipAria",
                "Open {{name}}",
                { name: chip.label }
              )}
              sx={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                padding: "6px 10px",
                borderRadius: "999px",
                background: "rgba(255, 255, 255, 0.78)",
                border: "1px solid rgba(184, 92, 60, 0.18)",
                cursor: "pointer",
                fontFamily: fonts.body,
                fontSize: "11px",
                fontWeight: 600,
                color: brand.text,
                transition:
                  "transform 0.15s ease, background 0.15s ease, border-color 0.15s ease",
                "&:hover": {
                  transform: "translateY(-1px)",
                  background: "#fff",
                  borderColor: chip.fg,
                },
                "&:focus-visible": {
                  outline: `2px solid ${chip.fg}`,
                  outlineOffset: 2,
                },
              }}
            >
              <Icon size={13} color={chip.fg} />
              <span>{chip.label}</span>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};

export default ReserveCTA;
