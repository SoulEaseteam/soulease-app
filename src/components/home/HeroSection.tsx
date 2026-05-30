// src/components/home/HeroSection.tsx
//
// 🎯 Round 28s10 — Pro outcall massage hero (founder 2026-05-30).
//
// Round 28s9 nailed the Plantum card layout but the founder noted
// the page still didn't read as a real massage shop — copy was
// "Chat to book" without saying WHAT you book. This round adds the
// two missing pro-shop surfaces:
//
//   • Promo banner — "Tonight special · 10% off first booking"
//     (CLAUDE.md §9 confirms FIRST10 is wired and lives in the
//     real discount apply logic since Round 28r14). Bright coral
//     gradient with a decorative gift-tag motif, matching the
//     Plantum reference's orange promo card.
//   • Service strip — 4 horizontally scrolling mini-cards naming
//     the actual services + starting price + duration. Tapping
//     a card opens that service's detail page (the "professional"
//     route — guests see what's included before committing).
//
// The dedicated "Chat to book" red-gradient banner from 28s9 is
// removed — both the greeting card and the promo banner already
// route to WhatsApp, so a third call-to-chat read as redundant
// after stacking the service strip in.
//
// Layout (top → bottom):
//
//   Cream surface
//
//   ● OPENING    📍 BANGKOK     🌅 BOOKING       ← status row
//   Concierge    Sukhumvit ·    WINDOW
//   live         Silom · Asok   Tonight
//
//   ┌──────────────────────────────────┐
//   │ [SR] Good evening                │       ← greeting → WhatsApp
//   │      Bangkok's luxury outcall —  │
//   │      tap to chat with concierge  │
//   └──────────────────────────────────┘
//
//   ┌──────────────────────────────────┐
//   │  TONIGHT SPECIAL          🎁     │       ← promo → WhatsApp
//   │  10% off your first booking      │         coral gradient
//   │  Code FIRST10  applied at        │         decorative gift
//   │  checkout                    [→] │
//   └──────────────────────────────────┘
//
//   Our services
//   ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐         ← service strip
//   │ Thai │ │Aroma │ │Gent. │ │ B2B  │           horizontal scroll
//   │ 60min│ │ 60min│ │ 60min│ │ 60min│           tap → /services/:id
//   │ ฿1.2k│ │ ฿1.6k│ │ ฿2.2k│ │ ฿3.2k│
//   └──────┘ └──────┘ └──────┘ └──────┘
//
//   ┌──────────────────────────────────┐
//   │ ✈ Or message Telegram            │       ← Telegram slim
//   └──────────────────────────────────┘

import React from "react";
import { Box, Typography } from "@mui/material";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import TelegramIcon from "@mui/icons-material/Telegram";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import PlaceRoundedIcon from "@mui/icons-material/PlaceRounded";

import { brand, fonts, gradients } from "@/theme";
import { useConciergeMode } from "@/utils/conciergeMode";
import { trackConciergeOpen } from "@/utils/analytics";
import ConciergeModeIcon from "@/components/common/ConciergeModeIcon";
import ReferralActiveBanner from "@/components/common/ReferralActiveBanner";
import { pickHeroPromo } from "@/data/heroPromos";

// Canonical channel URLs (HomeFooter / AdminFloatingChat / HowItWorks /
// ProfilePage use the same constants).
const WHATSAPP_URL = "https://wa.me/66634350987";
const TELEGRAM_URL = "https://t.me/SunRedvip_bkk";

// Service strip — short labels chosen for the hero tile, full names
// kept in /services/:id detail. Prices and durations match
// src/data/services.ts canonical data; if those move, update here too.
interface HeroService {
  id: string;
  short: string;
  duration: string;
  price: string;
}
const HERO_SERVICES: HeroService[] = [
  { id: "xSR-Thai", short: "Thai", duration: "60 min", price: "฿1,200" },
  { id: "SR-Aroma", short: "Aroma", duration: "60 min", price: "฿1,600" },
  { id: "SR-HJ2200", short: "Gentleman's", duration: "60 min", price: "฿2,200" },
  { id: "SR-B2B3200", short: "Therapeutic", duration: "60 min", price: "฿3,200" },
];

/** Time-aware greeting derived from the concierge operational window. */
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
  const navigate = useNavigate();
  const concierge = useConciergeMode();

  const greeting = greetingFor(concierge.mode);

  // Round 28s11 — rotating promo. Hour-of-day deterministic so the
  // promo doesn't flicker on refresh, but a returning guest sees a
  // fresh angle every hour of the day.
  const promo = pickHeroPromo(concierge.hourBKK, concierge.mode);
  const PromoIcon = promo.icon;

  const handleWhatsApp = (
    source: string,
    msg?: string,
  ) => {
    trackConciergeOpen(`whatsapp_${source}`);
    const url = msg
      ? `${WHATSAPP_URL}?text=${encodeURIComponent(msg)}`
      : WHATSAPP_URL;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleTelegram = () => {
    trackConciergeOpen("telegram");
    window.open(TELEGRAM_URL, "_blank", "noopener,noreferrer");
  };

  const handleServiceTap = (id: string) => {
    navigate(`/services/${encodeURIComponent(id)}`);
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
          // Soft cream→peach gradient — Plantum-style pastel base in
          // SunRed's warm palette.
          background:
            "linear-gradient(180deg, #FFF6EF 0%, #FCEBDC 100%)",
        }}
      >
        {/* ── Status row — three columns ──────────────────────────────── */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "1fr auto 1fr",
            alignItems: "center",
            gap: "10px",
            marginBottom: "16px",
            padding: "0 4px",
          }}
        >
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
              <PlaceRoundedIcon sx={{ fontSize: 13, color: brand.red }} />
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

        {/* ── Greeting card — white rounded, → WhatsApp ──────────────── */}
        <Box
          component={motion.div}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          onClick={() => handleWhatsApp("greeting")}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              handleWhatsApp("greeting");
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
                lineHeight: 1.35,
              }}
            >
              {t(
                "home.hero.greetingSub",
                "Bangkok's luxury outcall — tap to chat"
              )}
            </Typography>
          </Box>

          <ArrowForwardRoundedIcon
            sx={{ fontSize: 18, color: brand.red, opacity: 0.55 }}
          />
        </Box>

        {/* ── Promo banner — TONIGHT SPECIAL / FIRST10 → WhatsApp ─────── */}
        <Box
          component={motion.div}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.06, ease: [0.16, 1, 0.3, 1] }}
          onClick={() => handleWhatsApp(`promo_${promo.id}`, promo.waMsg)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              handleWhatsApp(`promo_${promo.id}`, promo.waMsg);
            }
          }}
          aria-label={t("home.hero.promoAria", "Tap to redeem — {{title}}", {
            title: promo.title,
          })}
          sx={{
            position: "relative",
            display: "flex",
            alignItems: "center",
            gap: "14px",
            padding: "16px 18px",
            borderRadius: "20px",
            // Coral → peach gradient — warmer than the brand-red primary,
            // distinct from the greeting card, reads as "special offer".
            background:
              "linear-gradient(135deg, #FE7A52 0%, #FFA976 55%, #FEC9A7 100%)",
            color: "#fff",
            cursor: "pointer",
            overflow: "hidden",
            boxShadow:
              "0 10px 28px rgba(254, 122, 82, 0.30), 0 2px 6px rgba(254, 122, 82, 0.18)",
            marginBottom: "16px",
            transition: "transform 0.18s ease, box-shadow 0.18s ease",
            "&:hover": {
              transform: "translateY(-1px)",
              boxShadow:
                "0 14px 36px rgba(254, 122, 82, 0.38), 0 3px 8px rgba(254, 122, 82, 0.22)",
            },
            "&:focus-visible": {
              outline: `2px solid #fff`,
              outlineOffset: 2,
            },
          }}
        >
          {/* Decorative icon watermark — varies per promo (gift,
              taxi, sparkle, flight, etc.) so the rotation reads
              visually distinct, not just text swap. */}
          <Box
            aria-hidden="true"
            sx={{
              position: "absolute",
              right: -6,
              top: "50%",
              transform: "translateY(-50%) rotate(-8deg)",
              fontSize: 120,
              lineHeight: 1,
              color: "rgba(255,255,255,0.16)",
              pointerEvents: "none",
            }}
          >
            <PromoIcon sx={{ fontSize: "inherit" }} />
          </Box>

          <Box sx={{ flex: 1, minWidth: 0, zIndex: 1 }}>
            <Typography
              component="p"
              sx={{
                fontFamily: fonts.body,
                fontSize: "10.5px",
                fontWeight: 800,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.95)",
                marginBottom: "4px",
              }}
            >
              {promo.eyebrow}
            </Typography>
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
              {promo.title}
            </Typography>
            <Typography
              component="p"
              sx={{
                fontFamily: fonts.body,
                fontSize: "12px",
                fontWeight: 500,
                color: "rgba(255,255,255,0.92)",
                letterSpacing: "0.005em",
              }}
            >
              {promo.sub}
            </Typography>
          </Box>

          <Box
            sx={{
              flexShrink: 0,
              zIndex: 1,
              width: 36,
              height: 36,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.22)",
              border: "1px solid rgba(255,255,255,0.40)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ArrowForwardRoundedIcon sx={{ fontSize: 18, color: "#fff" }} />
          </Box>
        </Box>

        {/* ── Service strip — Plantum-style mini cards, scrollable ────── */}
        <Box
          component={motion.div}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
          sx={{ marginBottom: "14px" }}
        >
          <Typography
            component="p"
            sx={{
              fontFamily: fonts.body,
              fontSize: "11px",
              fontWeight: 800,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: brand.accent,
              marginBottom: "10px",
              padding: "0 4px",
            }}
          >
            {t("home.hero.servicesEyebrow", "Our services")}
          </Typography>

          <Box
            sx={{
              display: "flex",
              gap: "10px",
              overflowX: "auto",
              padding: "0 4px 4px",
              scrollbarWidth: "none",
              "&::-webkit-scrollbar": { display: "none" },
              // Snap so each card lands cleanly on swipe.
              scrollSnapType: "x mandatory",
            }}
          >
            {HERO_SERVICES.map((svc, idx) => (
              <Box
                key={svc.id}
                component="button"
                type="button"
                onClick={() => handleServiceTap(svc.id)}
                aria-label={t(
                  "home.hero.serviceAria",
                  "View {{name}} details",
                  { name: svc.short }
                )}
                sx={{
                  flexShrink: 0,
                  width: 116,
                  scrollSnapAlign: "start",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  gap: "4px",
                  padding: "14px 12px",
                  borderRadius: "16px",
                  background: "#fff",
                  border: "1px solid rgba(184, 92, 60, 0.10)",
                  boxShadow:
                    "0 4px 14px rgba(126, 30, 46, 0.05), 0 1px 2px rgba(126, 30, 46, 0.03)",
                  cursor: "pointer",
                  textAlign: "left",
                  fontFamily: fonts.body,
                  transition:
                    "transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease",
                  "&:hover": {
                    transform: "translateY(-2px)",
                    boxShadow:
                      "0 8px 22px rgba(126, 30, 46, 0.10), 0 1px 2px rgba(126, 30, 46, 0.04)",
                    borderColor: "rgba(254, 9, 68, 0.30)",
                  },
                  "&:focus-visible": {
                    outline: `2px solid ${brand.red}`,
                    outlineOffset: 2,
                  },
                }}
              >
                {/* Tiny index chip in coral — matches the Plantum tile
                    pop without an illustration asset per card. */}
                <Box
                  component="span"
                  sx={{
                    fontSize: "9.5px",
                    fontWeight: 800,
                    letterSpacing: "0.10em",
                    textTransform: "uppercase",
                    color: brand.accent,
                    marginBottom: "2px",
                  }}
                >
                  {idx === 0 ? "Signature" : "Premium"}
                </Box>
                <Typography
                  component="span"
                  sx={{
                    fontFamily: fonts.heading,
                    fontSize: "15px",
                    fontWeight: 600,
                    color: brand.text,
                    lineHeight: 1.15,
                  }}
                >
                  {svc.short}
                </Typography>
                <Typography
                  component="span"
                  sx={{
                    fontSize: "10.5px",
                    fontWeight: 500,
                    color: brand.textMuted,
                    marginTop: "2px",
                  }}
                >
                  {svc.duration}
                </Typography>
                <Typography
                  component="span"
                  sx={{
                    fontFamily: fonts.heading,
                    fontSize: "15px",
                    fontWeight: 600,
                    color: brand.red,
                    marginTop: "6px",
                  }}
                >
                  {svc.price}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>

        {/* ── Telegram secondary slim card ────────────────────────────── */}
        <Box
          component={motion.div}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.18, ease: [0.16, 1, 0.3, 1] }}
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
            background: "rgba(255,255,255,0.65)",
            border: "1px solid rgba(184, 92, 60, 0.18)",
            cursor: "pointer",
            transition: "background 0.18s ease, transform 0.12s ease",
            "&:hover": {
              background: "rgba(255,255,255,0.85)",
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

      {/* Referral banner sits below the hero — auto-hides when no
          `?ref=` code is captured from URL. */}
      <ReferralActiveBanner />
    </>
  );
};

export default HeroSection;
