// src/pages/NearMePage.tsx
//
// 🆕 Round 28s335 (founder 2026-07-08) — "ย้าย Or browse by location ไปหน้าใหม่".
//   The "OR BROWSE BY LOCATION" map used to live at the bottom of the home
//   therapist grid; it now has its own page, reached from the "Near Me"
//   quick-nav tile. Renders <HomeTherapistGrid mapOnly /> which reuses all
//   of the grid's live therapist / price / geolocation loading.
// 🆕 Round 28w.5 (founder 2026-07-13) — "ปรับแก้หน้า near-me". Was a bare
//   map floating in a hardcoded #F7F7F6 slab (broke in night mode) with no
//   header and a lot of empty space below. Now: day/night var(--sr-bg),
//   a proper themed header, plus a coverage-areas chip row + a concierge
//   CTA under the map so the page reads as finished.
// ─────────────────────────────────────────────────────────────────────

import React from "react";
import { Box, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
import HomeTherapistGrid from "@/components/home/HomeTherapistGrid";
import { responsiveShell } from "@/theme/breakpoints";
import { useDocumentMeta, langToLocale } from "@/utils/useDocumentMeta";
import { whatsappDeepLink } from "@/config/concierge";

const SERIF = '"Playfair Display", "Fraunces", Georgia, serif';
const SANS = '"Inter", system-ui, sans-serif';
const ROSE = "#D97C95";

// Central-Bangkok areas SunRed dispatches to (mirrors the ServicesPage
// "Service area" row). Informational — reassures a guest their hotel is
// in range before they even pick a practitioner.
const AREAS = [
  "Sukhumvit", "Silom", "Sathorn", "Asok", "Nana", "Thonglor",
  "Phrom Phong", "Ploenchit", "Chidlom", "Ari", "Riverside", "Ratchada",
];

const NearMePage: React.FC = () => {
  const { t, i18n } = useTranslation();

  useDocumentMeta({
    title: t(
      "meta.nearme.title",
      "Near Me — Bangkok Outcall Massage by Location | SunRed"
    ),
    description: t(
      "meta.nearme.description",
      "See which verified SunRed practitioners are near your Bangkok hotel — browse outcall massage by location on the live map."
    ),
    locale: langToLocale(i18n.language),
    url: "https://sunred.vip/near-me",
    type: "website",
  });

  return (
    <Box
      sx={{
        ...responsiveShell,
        background: "var(--sr-bg)",
        minHeight: "100vh",
        padding: { xs: "10px 12px 28px", md: "16px 12px 36px" },
      }}
    >
      {/* Header */}
      <Box sx={{ px: 0.5, pt: 1, pb: 2 }}>
        <Typography
          sx={{
            fontFamily: SANS,
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: "var(--sr-gold-text)",
          }}
        >
          {t("nearme.eyebrow", "Near You")}
        </Typography>
        <Typography
          component="h1"
          sx={{
            fontFamily: SERIF,
            fontSize: { xs: 24, md: 28 },
            fontWeight: 700,
            color: "var(--sr-ink)",
            letterSpacing: "-0.02em",
            lineHeight: 1.15,
            mt: 0.5,
          }}
        >
          {t("nearme.title", "Practitioners near your hotel")}
        </Typography>
        <Typography
          sx={{
            fontFamily: SANS,
            fontSize: 13,
            color: "var(--sr-muted)",
            lineHeight: 1.5,
            mt: 0.75,
            maxWidth: 460,
          }}
        >
          {t(
            "nearme.subtitle",
            "A live look at verified SunRed practitioners across central Bangkok. Tap a pin for rates and availability."
          )}
        </Typography>
      </Box>

      {/* The live location map (reuses the home grid's data) */}
      <HomeTherapistGrid mapOnly />

      {/* Coverage areas */}
      <Box sx={{ mt: 3, px: 0.5 }}>
        <Typography
          sx={{
            fontFamily: SANS,
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "var(--sr-gold-text)",
            mb: 1.25,
          }}
        >
          {t("nearme.coverage.title", "Areas we cover")}
        </Typography>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
          {AREAS.map((a) => (
            <Box
              key={a}
              sx={{
                px: "12px",
                py: "6px",
                borderRadius: "999px",
                background: "var(--sr-panel-2)",
                border: "1px solid var(--sr-hairline)",
                fontFamily: SANS,
                fontSize: 12.5,
                fontWeight: 600,
                color: "var(--sr-body)",
              }}
            >
              {a}
            </Box>
          ))}
        </Box>
        <Typography
          sx={{
            fontFamily: SANS,
            fontSize: 12,
            color: "var(--sr-muted)",
            mt: 1.25,
          }}
        >
          {t(
            "nearme.coverage.note",
            "Delivered to your hotel or residence — typical arrival 30–45 min to central Bangkok."
          )}
        </Typography>
      </Box>

      {/* Concierge CTA */}
      <Box
        component="a"
        href={whatsappDeepLink(
          "Hi SunRed concierge, which practitioner is nearest my hotel tonight?"
        )}
        target="_blank"
        rel="noopener noreferrer"
        sx={{
          mt: 3,
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          p: "16px 18px",
          borderRadius: "18px",
          background: "linear-gradient(135deg, rgba(217,124,149,0.16), rgba(217,124,149,0.06))",
          border: "1px solid rgba(217,124,149,0.30)",
          textDecoration: "none",
          transition: "transform 0.15s ease",
          "&:hover": { transform: "translateY(-1px)" },
        }}
      >
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontFamily: SERIF, fontSize: 15.5, fontWeight: 700, color: "var(--sr-ink)", lineHeight: 1.25 }}>
            {t("nearme.cta.title", "Not sure who's nearest?")}
          </Typography>
          <Typography sx={{ fontFamily: SANS, fontSize: 12.5, color: "var(--sr-body)", mt: 0.25 }}>
            {t("nearme.cta.subtitle", "Ask the concierge — we'll match the closest available practitioner.")}
          </Typography>
        </Box>
        <Box aria-hidden sx={{ flexShrink: 0, fontSize: 20, fontWeight: 800, color: ROSE }}>
          ›
        </Box>
      </Box>
    </Box>
  );
};

export default NearMePage;
