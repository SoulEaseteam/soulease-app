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

import SpaRoundedIcon from "@mui/icons-material/SpaRounded";
import LocalFloristRoundedIcon from "@mui/icons-material/LocalFloristRounded";
import DiamondRoundedIcon from "@mui/icons-material/DiamondRounded";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";

import type { SvgIconComponent } from "@mui/icons-material";

import services from "@/data/services";
import { brand, fonts } from "@/theme";
import { useDocumentMeta, langToLocale } from "@/utils/useDocumentMeta";
import { trackServiceView } from "@/utils/analytics";

// Service display order — premium first so high-margin items anchor
// the scroll. Matches the home hero's row order.
const SERVICE_ORDER = [
  "SR-HJ2200", // Gentleman's Signature — ฿2,200
  "SR-B2B3200", // SunRed Therapeutic — ฿3,200
  "SR-Aroma", // Aromatherapy — ฿1,600
  "xSR-Thai", // Thai Massage — ฿1,200
] as const;

// Icon + swatch colour ladder — matches the home hero so a guest
// scrolling from home into services sees the same visual treatment.
const SWATCH_BG = "#FFF1E5";
interface IconConfig {
  icon: SvgIconComponent;
  swatchIcon: string;
  tier: "SIGNATURE" | "PREMIUM";
}
const ICON_BY_ID: Record<string, IconConfig> = {
  "xSR-Thai": {
    icon: SpaRoundedIcon,
    swatchIcon: "#E07A4F",
    tier: "SIGNATURE",
  },
  "SR-Aroma": {
    icon: LocalFloristRoundedIcon,
    swatchIcon: "#FE7A52",
    tier: "PREMIUM",
  },
  "SR-HJ2200": {
    icon: DiamondRoundedIcon,
    swatchIcon: "#FE0944",
    tier: "PREMIUM",
  },
  "SR-B2B3200": {
    icon: AutoAwesomeRoundedIcon,
    swatchIcon: "#831843",
    tier: "PREMIUM",
  },
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
        {sortedServices.map((svc) => {
          const config = ICON_BY_ID[svc.id];
          if (!config) return null;
          const Icon = config.icon;
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
                position: "relative",
                display: "flex",
                alignItems: "stretch",
                gap: "14px",
                padding: "14px",
                borderRadius: "20px",
                background: "#fff",
                border: "1px solid rgba(184, 92, 60, 0.10)",
                boxShadow:
                  "0 6px 18px rgba(126, 30, 46, 0.06), 0 1px 2px rgba(126, 30, 46, 0.04)",
                cursor: "pointer",
                transition:
                  "transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease",
                "&:hover": {
                  transform: "translateY(-2px)",
                  boxShadow:
                    "0 12px 28px rgba(126, 30, 46, 0.10), 0 1px 2px rgba(126, 30, 46, 0.05)",
                  borderColor: "rgba(254, 9, 68, 0.25)",
                },
                "&:focus-visible": {
                  outline: `2px solid ${brand.red}`,
                  outlineOffset: 2,
                },
              }}
            >
              {/* Icon swatch */}
              <Box
                sx={{
                  flexShrink: 0,
                  width: 84,
                  borderRadius: "14px",
                  background: SWATCH_BG,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon sx={{ fontSize: 38, color: config.swatchIcon }} />
              </Box>

              {/* Text block */}
              <Box
                sx={{
                  flex: 1,
                  minWidth: 0,
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <Typography
                  component="span"
                  sx={{
                    fontFamily: fonts.body,
                    fontSize: "9.5px",
                    fontWeight: 800,
                    letterSpacing: "0.10em",
                    textTransform: "uppercase",
                    color: brand.accent,
                    marginBottom: "3px",
                  }}
                >
                  {config.tier}
                </Typography>
                <Typography
                  component="span"
                  sx={{
                    fontFamily: fonts.heading,
                    fontSize: "17px",
                    fontWeight: 600,
                    color: brand.text,
                    lineHeight: 1.15,
                    marginBottom: "4px",
                  }}
                >
                  {svc.name}
                </Typography>
                <Typography
                  component="span"
                  sx={{
                    fontFamily: fonts.body,
                    fontSize: "12px",
                    fontWeight: 500,
                    color: brand.textMuted,
                    lineHeight: 1.4,
                    marginBottom: "10px",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {svc.desc}
                </Typography>

                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginTop: "auto",
                    gap: "8px",
                  }}
                >
                  <Typography
                    component="span"
                    sx={{
                      fontFamily: fonts.body,
                      fontSize: "11px",
                      fontWeight: 600,
                      color: brand.textMuted,
                      letterSpacing: "0.02em",
                    }}
                  >
                    {svc.duration} min
                  </Typography>
                  <Typography
                    component="span"
                    sx={{
                      fontFamily: fonts.heading,
                      fontSize: "17px",
                      fontWeight: 700,
                      color: brand.red,
                      lineHeight: 1,
                    }}
                  >
                    {`฿${svc.price.toLocaleString()}`}
                  </Typography>
                </Box>
              </Box>

              {/* Arrow affordance */}
              <Box
                aria-hidden="true"
                sx={{
                  position: "absolute",
                  top: 12,
                  right: 12,
                  width: 26,
                  height: 26,
                  borderRadius: "50%",
                  background: "rgba(184, 92, 60, 0.10)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <ArrowForwardRoundedIcon
                  sx={{ fontSize: 14, color: brand.accent }}
                />
              </Box>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};

export default ServicesPage;
