// src/components/home/HeroSection.tsx
//
// 🎯 Round 28s13 — Karim-style 2-col service grid (founder 2026-05-30).
//
// Founder sent a Behance "Mid Fidelity Wireframes" reference (Karim
// agricultural shop): "เอา แบบนี้". The DNA she keyed on this time:
//   • Plain-text greeting at the very top (no card chrome)
//   • One promo / consultation card under the greeting
//   • A section title with a "See all" link
//   • 2×2 product grid — each card has an icon swatch up top, an
//     eyebrow, the product name, a price, and an add-to-cart button
//   • Bottom nav (already provided site-wide by MainLayout)
//
// Translated for SunRed outcall:
//   • Text greeting → time-aware "Good evening · Bangkok's luxury
//     outcall — tap to chat" (whole block taps WhatsApp)
//   • Promo card → the rotating promo bank from 28s11 stays
//   • Section title → "Our services" + "See all →" linking to the
//     full /services lobby
//   • 2×2 grid → 4 services (Thai · Aroma · Gentleman's · Therapeutic)
//     with a brand-tinted icon swatch, eyebrow tier label, service
//     name in Fraunces, duration, price in brand red, and a [+]
//     add-button that opens WhatsApp with the service pre-filled
//     in the message so admin gets the booking context for free
//   • Tapping the body of a card still routes to /services/:id
//     for guests who want to read what's included before chatting
//
// The 28s12 trim still applies: no status row, no Telegram card.

import React from "react";
import { Box, Typography } from "@mui/material";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import SpaRoundedIcon from "@mui/icons-material/SpaRounded";
import LocalFloristRoundedIcon from "@mui/icons-material/LocalFloristRounded";
import DiamondRoundedIcon from "@mui/icons-material/DiamondRounded";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";

import type { SvgIconComponent } from "@mui/icons-material";

import { brand, fonts } from "@/theme";
import { useConciergeMode } from "@/utils/conciergeMode";
import { trackConciergeOpen } from "@/utils/analytics";
import ReferralActiveBanner from "@/components/common/ReferralActiveBanner";
import { pickHeroPromo } from "@/data/heroPromos";

// Canonical channel URL — same one HomeFooter / AdminFloatingChat /
// HowItWorks / ProfilePage already use.
const WHATSAPP_URL = "https://wa.me/66634350987";

// 4 services in the 2×2 grid. `fullName` flows into the WhatsApp
// pre-fill so admin gets the canonical SKU name; `short` is what
// renders inside the card chip.
interface HeroService {
  id: string;
  short: string;
  fullName: string;
  duration: string;
  price: string;
  tier: "SIGNATURE" | "PREMIUM";
  icon: SvgIconComponent;
  /** Background colour for the icon swatch — gives each card a
   *  distinct visual identity without needing a photo. */
  swatch: string;
  /** Foreground colour for the icon glyph. */
  swatchIcon: string;
}
const HERO_SERVICES: HeroService[] = [
  {
    id: "xSR-Thai",
    short: "Thai Massage",
    fullName: "Thai Massage",
    duration: "60 min",
    price: "฿1,200",
    tier: "SIGNATURE",
    icon: SpaRoundedIcon,
    swatch: "#FFF1E5",
    swatchIcon: "#E07A4F",
  },
  {
    id: "SR-Aroma",
    short: "Aromatherapy",
    fullName: "Aromatherapy Massage",
    duration: "60 min",
    price: "฿1,600",
    tier: "PREMIUM",
    icon: LocalFloristRoundedIcon,
    swatch: "#FEEDE0",
    swatchIcon: "#FE7A52",
  },
  {
    id: "SR-HJ2200",
    short: "Gentleman's",
    fullName: "Gentleman's Signature Therapy",
    duration: "60 min",
    price: "฿2,200",
    tier: "PREMIUM",
    icon: DiamondRoundedIcon,
    swatch: "#FFE3E8",
    swatchIcon: "#FE0944",
  },
  {
    id: "SR-B2B3200",
    short: "Therapeutic",
    fullName: "SunRed Therapeutic Experience",
    duration: "60 min",
    price: "฿3,200",
    tier: "PREMIUM",
    icon: AutoAwesomeRoundedIcon,
    swatch: "#F5E5D8",
    swatchIcon: "#831843",
  },
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

  const handleWhatsApp = (source: string, msg?: string) => {
    trackConciergeOpen(`whatsapp_${source}`);
    const url = msg
      ? `${WHATSAPP_URL}?text=${encodeURIComponent(msg)}`
      : WHATSAPP_URL;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleServiceTap = (id: string) => {
    navigate(`/services/${encodeURIComponent(id)}`);
  };

  /** Per-card "+" button: skip the detail page and open WhatsApp
   *  with the service already named in the message so the concierge
   *  can quote/confirm in one reply. */
  const handleServiceBook = (
    e: React.MouseEvent,
    svc: HeroService,
  ) => {
    e.stopPropagation();
    const msg = `Hi, I'd like to book ${svc.fullName} (${svc.duration} · ${svc.price}). When can I reserve?`;
    handleWhatsApp(`service_${svc.id}`, msg);
  };

  const handleSeeAll = () => {
    navigate("/services");
  };

  return (
    <>
      <Box
        component="section"
        aria-label={t("home.hero.aria", "Book a practitioner")}
        sx={{
          position: "relative",
          width: "100%",
          padding: "22px 18px 24px",
          background:
            "linear-gradient(180deg, #FFF6EF 0%, #FCEBDC 100%)",
        }}
      >
        {/* ── Greeting — plain text top (Karim-style) ────────────────── */}
        <Box
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
            marginBottom: "18px",
            cursor: "pointer",
            "&:focus-visible": {
              outline: `2px solid ${brand.red}`,
              outlineOffset: 4,
              borderRadius: "8px",
            },
          }}
        >
          <Typography
            component="h2"
            sx={{
              fontFamily: fonts.heading,
              fontWeight: 600,
              fontSize: "22px",
              color: brand.text,
              lineHeight: 1.15,
              marginBottom: "2px",
            }}
          >
            {t(`home.hero.greeting.${concierge.mode}`, greeting)}
            <Box
              component="span"
              sx={{ color: brand.red, fontStyle: "italic" }}
            >
              .
            </Box>
          </Typography>
          <Typography
            component="p"
            sx={{
              fontFamily: fonts.body,
              fontSize: "13.5px",
              fontWeight: 500,
              color: brand.textMuted,
              lineHeight: 1.4,
            }}
          >
            {t(
              "home.hero.greetingSub",
              "Bangkok's luxury outcall — tap to chat with concierge"
            )}
          </Typography>
        </Box>

        {/* ── Rotating promo banner — coral gradient, → WhatsApp ──────── */}
        <Box
          component={motion.div}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
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
            background:
              "linear-gradient(135deg, #FE7A52 0%, #FFA976 55%, #FEC9A7 100%)",
            color: "#fff",
            cursor: "pointer",
            overflow: "hidden",
            boxShadow:
              "0 10px 28px rgba(254, 122, 82, 0.30), 0 2px 6px rgba(254, 122, 82, 0.18)",
            marginBottom: "22px",
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

        {/* ── Section header: "Our services" + See all ──────────────── */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "12px",
            padding: "0 2px",
          }}
        >
          <Typography
            component="h3"
            sx={{
              // Round 28s14 — was 18px Fraunces serif. Founder:
              // "Our services เล็กลง". Reads as a quiet eyebrow now
              // (Inter, small caps, warm clay), not a hero element —
              // matches the "Featured Products" register in the
              // Karim reference rather than competing with the
              // greeting headline above.
              fontFamily: fonts.body,
              fontWeight: 800,
              fontSize: "11.5px",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: brand.accent,
              lineHeight: 1.1,
            }}
          >
            {t("home.hero.servicesTitle", "Our services")}
          </Typography>
          <Box
            component="button"
            type="button"
            onClick={handleSeeAll}
            aria-label={t(
              "home.hero.servicesSeeAllAria",
              "See all services"
            )}
            sx={{
              display: "inline-flex",
              alignItems: "center",
              gap: "2px",
              padding: "4px 6px",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              fontFamily: fonts.body,
              fontSize: "11px",
              fontWeight: 700,
              letterSpacing: "0.04em",
              color: brand.red,
              "&:hover": { opacity: 0.85 },
              "&:focus-visible": {
                outline: `2px solid ${brand.red}`,
                outlineOffset: 2,
                borderRadius: "6px",
              },
            }}
          >
            {t("home.hero.servicesSeeAll", "See all")}
            <ArrowForwardRoundedIcon sx={{ fontSize: 13 }} />
          </Box>
        </Box>

        {/* ── 2×2 service grid ───────────────────────────────────────── */}
        <Box
          component={motion.div}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
          sx={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "10px",
          }}
        >
          {HERO_SERVICES.map((svc) => {
            const Icon = svc.icon;
            return (
              <Box
                key={svc.id}
                onClick={() => handleServiceTap(svc.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleServiceTap(svc.id);
                  }
                }}
                aria-label={t(
                  "home.hero.serviceCardAria",
                  "View {{name}} details",
                  { name: svc.fullName }
                )}
                sx={{
                  position: "relative",
                  display: "flex",
                  flexDirection: "column",
                  padding: "12px 12px 14px",
                  borderRadius: "18px",
                  background: "#fff",
                  border: "1px solid rgba(184, 92, 60, 0.10)",
                  boxShadow:
                    "0 4px 14px rgba(126, 30, 46, 0.05), 0 1px 2px rgba(126, 30, 46, 0.03)",
                  cursor: "pointer",
                  fontFamily: fonts.body,
                  transition:
                    "transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease",
                  "&:hover": {
                    transform: "translateY(-2px)",
                    boxShadow:
                      "0 10px 24px rgba(126, 30, 46, 0.10), 0 1px 2px rgba(126, 30, 46, 0.04)",
                    borderColor: "rgba(254, 9, 68, 0.30)",
                  },
                  "&:focus-visible": {
                    outline: `2px solid ${brand.red}`,
                    outlineOffset: 2,
                  },
                }}
              >
                {/* Icon swatch — tinted background block at the top */}
                <Box
                  sx={{
                    width: "100%",
                    height: 76,
                    borderRadius: "12px",
                    background: svc.swatch,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: "10px",
                  }}
                >
                  <Icon sx={{ fontSize: 34, color: svc.swatchIcon }} />
                </Box>

                <Typography
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
                  {svc.tier}
                </Typography>
                <Typography
                  component="span"
                  sx={{
                    fontFamily: fonts.heading,
                    fontSize: "15px",
                    fontWeight: 600,
                    color: brand.text,
                    lineHeight: 1.15,
                    marginBottom: "2px",
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
                    marginBottom: "8px",
                  }}
                >
                  {svc.duration}
                </Typography>

                {/* Price row + Add (+) button — Karim's card bottom */}
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginTop: "auto",
                  }}
                >
                  <Typography
                    component="span"
                    sx={{
                      fontFamily: fonts.heading,
                      fontSize: "16px",
                      fontWeight: 700,
                      color: brand.red,
                    }}
                  >
                    {svc.price}
                  </Typography>
                  <Box
                    component="button"
                    type="button"
                    onClick={(e) => handleServiceBook(e, svc)}
                    aria-label={t(
                      "home.hero.serviceBookAria",
                      "Book {{name}} via WhatsApp",
                      { name: svc.fullName }
                    )}
                    sx={{
                      flexShrink: 0,
                      width: 30,
                      height: 30,
                      borderRadius: "10px",
                      border: "none",
                      cursor: "pointer",
                      background: brand.text,
                      color: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transition:
                        "background 0.18s ease, transform 0.12s ease",
                      "&:hover": {
                        background: brand.red,
                        transform: "scale(1.05)",
                      },
                      "&:focus-visible": {
                        outline: `2px solid ${brand.red}`,
                        outlineOffset: 2,
                      },
                    }}
                  >
                    <AddRoundedIcon sx={{ fontSize: 18 }} />
                  </Box>
                </Box>
              </Box>
            );
          })}
        </Box>
      </Box>

      {/* Referral banner sits below the hero — auto-hides when no
          `?ref=` code is captured from URL. */}
      <ReferralActiveBanner />
    </>
  );
};

export default HeroSection;
