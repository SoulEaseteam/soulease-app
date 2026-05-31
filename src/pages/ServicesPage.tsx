// src/pages/ServicesPage.tsx
//
// 🎯 Round 28s21 — Minimal Grab/Klook-style services lobby
// (founder 2026-05-30, "Web-app trim — ทุกหน้า").
//
// Replaces the 2,481-line Clean v3 page (Round 28b/c series) that
// carried: 3-tab nav (Services / About / How to book), welcome
// banner, "Help me choose" quiz popup, service compare panel,
// bundle promo card, social icons row, position-1 flagship card,
// editorial copy blocks. All of that was marketing-site chrome —
// real web apps land you on a list of buyable items and let the
// detail page carry the storytelling.
//
// New shape: eyebrow + title + 4 vertical service cards. Each card
// matches the home hero's service-card design language (unified
// cream icon swatch, tier-laddered icon colour, Fraunces serif
// name, brand-red price). Tap → /services/:id detail.
//
// To revert to the full Clean v3 services page: `git revert
// 28s21` — the prior 2,481-line file is preserved in git history.
//
// Components that USED to live here (ServiceCompare, the Quiz
// helpers, etc.) are intentionally dropped along with the page —
// they were only consumed inside this file. The detail page,
// HowItWorks component, and Payment page remain unchanged.

import React, { useEffect } from "react";
import { Box, Typography } from "@mui/material";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import services, { type MassageService } from "@/data/services";
import { brand, fonts } from "@/theme";
import {
  startingPrice,
  durationsFor,
  formatTHB,
} from "@/utils/servicePricing";
import { useDocumentMeta, langToLocale } from "@/utils/useDocumentMeta";
import { trackServiceView } from "@/utils/analytics";

// Service display order — premium first so high-margin items anchor
// the scroll. Matches the home hero's row order + the booking picker
// (StepService) editorial order, so both surfaces read identically.
const SERVICE_ORDER = [
  "SR-HJ2200", // Gentleman's Signature — ฿2,200 (best seller → trending)
  "SR-B2B3200", // SunRed Therapeutic — ฿3,200
  "SR-Aroma", // Aromatherapy — ฿1,600
  "xSR-Thai", // Thai Massage — ฿1,200
] as const;

// 🆕 Round 28s87 — badge colour ladder, mirrored from StepService so
//   the lobby cards and the in-flow picker look identical.
const BADGE_COLORS: Record<MassageService["badge"], { bg: string; fg: string }> = {
  SIGNATURE: { bg: "rgba(254, 9, 68, 0.95)", fg: "#fff" },
  POPULAR: { bg: "rgba(254, 122, 82, 0.95)", fg: "#fff" },
  RECOMMEND: { bg: "rgba(184, 92, 60, 0.95)", fg: "#fff" },
  EXCLUSIVE: { bg: "rgba(60, 30, 20, 0.95)", fg: "#FEC9A7" },
};

const ServicesPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  useEffect(() => {
    trackServiceView("services_lobby");
  }, []);

  useDocumentMeta({
    title: t(
      "meta.services.title",
      "SunRed Services — Bangkok Luxury Outcall Massage"
    ),
    description: t(
      "meta.services.description",
      "Four signature rituals delivered to your hotel suite or residence in Bangkok. Thai, Aromatherapy, Gentleman's Signature, and Therapeutic — from ฿1,200."
    ),
    locale: langToLocale(i18n.language),
    url: "https://sunred.vip/services",
    type: "website",
  });

  // Apply manual editorial order
  const sortedServices = React.useMemo(() => {
    const orderIdx = (id: string) => {
      const i = SERVICE_ORDER.indexOf(
        id as (typeof SERVICE_ORDER)[number]
      );
      return i === -1 ? 999 : i;
    };
    return [...services].sort((a, b) => orderIdx(a.id) - orderIdx(b.id));
  }, []);

  const handleSelectService = (id: string) => {
    navigate(`/services/${encodeURIComponent(id)}`);
  };

  return (
    <Box
      sx={{
        maxWidth: "430px",
        margin: "0 auto",
        background: "linear-gradient(180deg, #FFF6EF 0%, #FCEBDC 60%, #FAFBFC 100%)",
        minHeight: "100vh",
        padding: "22px 18px 32px",
        position: "relative",
      }}
    >
      {/* ── Header ─────────────────────────────────────────────────── */}
      <Box sx={{ marginBottom: "22px" }}>
        <Typography
          component="p"
          sx={{
            fontFamily: fonts.body,
            fontSize: "11px",
            fontWeight: 800,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: brand.accent,
            marginBottom: "6px",
          }}
        >
          {t("services.eyebrow", "Bangkok · Outcall")}
        </Typography>
        <Typography
          component="h1"
          sx={{
            fontFamily: fonts.heading,
            fontSize: "26px",
            fontWeight: 600,
            color: brand.text,
            letterSpacing: "-0.015em",
            lineHeight: 1.1,
            marginBottom: "6px",
          }}
        >
          {t("services.title", "Services")}
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
            "services.sub",
            "Four rituals · in-suite delivery · concierge-confirmed"
          )}
        </Typography>
      </Box>

      {/* ── Service cards — vertical list ──────────────────────────── */}
      <Box
        component={motion.div}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: "12px",
        }}
      >
        {sortedServices.map((svc, idx) => {
          // 🆕 Round 28s87 — mirror the booking picker (StepService):
          //   real badge + Trending on the top (best-seller) card +
          //   description + "From ฿X · 60/90/120 min".
          const isTrending = idx === 0;
          const badgeColor = BADGE_COLORS[svc.badge];
          const fromPrice = startingPrice(svc);
          const tiers = durationsFor(svc);
          return (
            <Box
              key={svc.id}
              onClick={() => handleSelectService(svc.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleSelectService(svc.id);
                }
              }}
              aria-label={t(
                "services.cardAria",
                "View {{name}} details",
                { name: svc.name }
              )}
              sx={{
                // 🆕 Round 28s85 (founder "ปรับใหม่ · รูปเต็มใบ") —
                //   full-bleed editorial card: real service photo with a
                //   bottom-up gradient scrim + overlaid title / price.
                position: "relative",
                borderRadius: "22px",
                overflow: "hidden",
                aspectRatio: "3 / 2",
                cursor: "pointer",
                boxShadow:
                  "0 10px 26px rgba(126, 30, 46, 0.12), 0 1px 2px rgba(126, 30, 46, 0.06)",
                transition: "transform 0.2s ease, box-shadow 0.2s ease",
                "@media (hover: hover)": {
                  "&:hover": {
                    transform: "translateY(-2px)",
                    boxShadow:
                      "0 16px 36px rgba(126, 30, 46, 0.18), 0 2px 4px rgba(126, 30, 46, 0.08)",
                  },
                  "&:hover .svc-img": { transform: "scale(1.05)" },
                },
                "&:focus-visible": {
                  outline: `2px solid ${brand.red}`,
                  outlineOffset: 2,
                },
              }}
            >
              {/* Photo layer */}
              <Box
                className="svc-img"
                aria-hidden="true"
                sx={{
                  position: "absolute",
                  inset: 0,
                  backgroundImage: `url("${svc.image}")`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  transition: "transform 0.45s cubic-bezier(0.16,1,0.3,1)",
                }}
              />
              {/* Legibility scrim */}
              <Box
                aria-hidden="true"
                sx={{
                  position: "absolute",
                  inset: 0,
                  background:
                    "linear-gradient(180deg, rgba(20,8,4,0.20) 0%, rgba(20,8,4,0) 32%, rgba(20,8,4,0.30) 62%, rgba(16,6,3,0.82) 100%)",
                }}
              />

              {/* Top row — badge (left) + Trending (right) */}
              <Box
                sx={{
                  position: "absolute",
                  top: 12,
                  left: 12,
                  right: 12,
                  zIndex: 2,
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  gap: "8px",
                }}
              >
                <Box
                  sx={{
                    fontFamily: fonts.body,
                    fontSize: "9px",
                    fontWeight: 800,
                    letterSpacing: "0.08em",
                    background: badgeColor.bg,
                    color: badgeColor.fg,
                    padding: "3px 8px",
                    borderRadius: "6px",
                    textTransform: "uppercase",
                    boxShadow: "0 2px 6px rgba(20, 6, 12, 0.22)",
                  }}
                >
                  {svc.badge}
                </Box>
                {isTrending && (
                  <Box
                    aria-label="Trending"
                    sx={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      padding: "3px 9px 3px 7px",
                      borderRadius: 999,
                      background: "linear-gradient(135deg, #FE0944, #FE7A52)",
                      color: "#fff",
                      fontFamily: fonts.body,
                      fontSize: "9.5px",
                      fontWeight: 800,
                      letterSpacing: "0.10em",
                      textTransform: "uppercase",
                      boxShadow:
                        "0 6px 14px rgba(254, 9, 68, 0.36), inset 0 1px 0 rgba(255,255,255,0.30)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    <Box
                      component="span"
                      aria-hidden
                      sx={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: "#fff",
                        boxShadow: "0 0 0 3px rgba(255,255,255,0.30)",
                        animation:
                          "sunredTrendingPulse 1.6s ease-in-out infinite",
                        "@keyframes sunredTrendingPulse": {
                          "0%, 100%": { opacity: 1 },
                          "50%": { opacity: 0.45 },
                        },
                      }}
                    />
                    Trending
                  </Box>
                )}
              </Box>

              {/* Overlaid detail — bottom */}
              <Box
                sx={{
                  position: "absolute",
                  left: 16,
                  right: 16,
                  bottom: 14,
                  zIndex: 1,
                }}
              >
                <Typography
                  component="h2"
                  sx={{
                    fontFamily: fonts.heading,
                    fontSize: "20px",
                    fontWeight: 600,
                    color: "#fff",
                    lineHeight: 1.13,
                    letterSpacing: "-0.01em",
                    textShadow: "0 1px 8px rgba(0,0,0,0.4)",
                    marginBottom: "4px",
                  }}
                >
                  {svc.name}
                </Typography>
                <Typography
                  sx={{
                    fontFamily: fonts.body,
                    fontSize: "12px",
                    color: "rgba(255,255,255,0.86)",
                    lineHeight: 1.4,
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                    textShadow: "0 1px 6px rgba(0,0,0,0.35)",
                    marginBottom: "8px",
                  }}
                >
                  {svc.desc}
                </Typography>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "baseline",
                    gap: "6px",
                    flexWrap: "wrap",
                  }}
                >
                  <Typography
                    component="span"
                    sx={{
                      fontFamily: fonts.body,
                      fontSize: "9.5px",
                      fontWeight: 700,
                      color: "rgba(255,255,255,0.7)",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                    }}
                  >
                    {t("services.from", "From")}
                  </Typography>
                  <Typography
                    component="span"
                    sx={{
                      fontFamily: fonts.heading,
                      fontSize: "17px",
                      fontWeight: 700,
                      color: "#fff",
                      letterSpacing: "-0.02em",
                      textShadow: "0 1px 8px rgba(0,0,0,0.4)",
                    }}
                  >
                    {formatTHB(fromPrice)}
                  </Typography>
                  <Typography
                    component="span"
                    sx={{
                      fontFamily: fonts.body,
                      fontSize: "11px",
                      color: "rgba(255,255,255,0.72)",
                      fontWeight: 500,
                    }}
                  >
                    · {tiers.join("/")} {t("common.min", "min")}
                  </Typography>
                </Box>
              </Box>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};

export default ServicesPage;
