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

import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";

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

// 🆕 Round 28s85 — full-bleed photo cards; only the tier label is
//   overlaid now (the per-service icon/swatch treatment was retired).
const TIER_BY_ID: Record<string, "SIGNATURE" | "PREMIUM"> = {
  "xSR-Thai": "SIGNATURE",
  "SR-Aroma": "PREMIUM",
  "SR-HJ2200": "PREMIUM",
  "SR-B2B3200": "PREMIUM",
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
          const tier = TIER_BY_ID[svc.id];
          if (!tier) return null;
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

              {/* Tier pill — top-left */}
              <Box
                sx={{
                  position: "absolute",
                  top: 12,
                  left: 12,
                  padding: "4px 10px",
                  borderRadius: "999px",
                  background: "rgba(255, 255, 255, 0.18)",
                  backdropFilter: "blur(8px)",
                  WebkitBackdropFilter: "blur(8px)",
                  border: "1px solid rgba(255, 255, 255, 0.28)",
                  fontFamily: fonts.body,
                  fontSize: "9.5px",
                  fontWeight: 800,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "#fff",
                }}
              >
                {tier}
              </Box>

              {/* Arrow affordance — top-right */}
              <Box
                aria-hidden="true"
                sx={{
                  position: "absolute",
                  top: 12,
                  right: 12,
                  width: 30,
                  height: 30,
                  borderRadius: "50%",
                  background: "rgba(255, 255, 255, 0.22)",
                  backdropFilter: "blur(8px)",
                  WebkitBackdropFilter: "blur(8px)",
                  border: "1px solid rgba(255, 255, 255, 0.32)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <ArrowForwardRoundedIcon sx={{ fontSize: 15, color: "#fff" }} />
              </Box>

              {/* Overlaid text — bottom */}
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
                    fontSize: "21px",
                    fontWeight: 600,
                    color: "#fff",
                    lineHeight: 1.12,
                    letterSpacing: "-0.01em",
                    textShadow: "0 1px 8px rgba(0,0,0,0.35)",
                    marginBottom: "6px",
                  }}
                >
                  {svc.name}
                </Typography>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "baseline",
                    justifyContent: "space-between",
                    gap: "8px",
                  }}
                >
                  <Typography
                    component="span"
                    sx={{
                      fontFamily: fonts.body,
                      fontSize: "11.5px",
                      fontWeight: 600,
                      color: "rgba(255,255,255,0.82)",
                      letterSpacing: "0.03em",
                    }}
                  >
                    {svc.duration} {t("common.min", "min")}
                  </Typography>
                  <Typography
                    component="span"
                    sx={{
                      fontFamily: fonts.heading,
                      fontSize: "19px",
                      fontWeight: 700,
                      color: "#fff",
                      lineHeight: 1,
                      textShadow: "0 1px 8px rgba(0,0,0,0.35)",
                    }}
                  >
                    {`฿${svc.price.toLocaleString()}`}
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
