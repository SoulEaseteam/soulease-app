// src/components/home/ServicesGrid.tsx
//
// 🎨 Phase 1 Home — Services (pixel-perfect port of `.services-grid` block).
// Section eyebrow + h2 + lead, then 5 service cards: 1 featured (full-width
// red→coral gradient, "Signature Thai") + 4 regular (glass tiles, 2-col).

import React from "react";
import { Box, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

const SERIF = '"Fraunces", Georgia, "Times New Roman", serif';
const SANS = '"Inter", system-ui, -apple-system, sans-serif';

type Service = {
  id: string;
  icon: string;
  featured?: boolean;
  /** Real services.ts id this tile maps to. Tap → /services/{realId}.
   *  Tiles without a realId fall back to /therapists (browse all). */
  realId?: string;
};

// 🆕 Founder 2026-05-01: each tile now navigates somewhere real.
//    Mapping home-tile ids → src/data/services.ts ids:
const SERVICES: Service[] = [
  { id: "signatureThai", icon: "🌿", featured: true, realId: "thai-massage" },
  { id: "oil", icon: "💆", realId: "aromatherapy" },
  { id: "aroma", icon: "🌸", realId: "aromatherapy" },
  { id: "sport", icon: "🔥", realId: "gentlemans-recovery" },
  { id: "prenatal", icon: "🤰" }, // no direct match → falls through to /therapists
];

const ServicesGrid: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const goToService = (s: Service) => {
    if (s.realId) {
      void navigate(`/services/${s.realId}`);
    } else {
      void navigate("/therapists");
    }
  };

  return (
    <Box>
      {/* .section — verbatim */}
      <Box sx={{ padding: "36px 20px 8px", position: "relative" }}>
        {/* .section-eyebrow */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            fontSize: "10px",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: "#b85c3c",
            fontWeight: 700,
            marginBottom: "6px",
            fontFamily: SANS,
            "&::before": {
              content: '""',
              width: "16px",
              height: "1px",
              background: "rgba(184, 92, 60, 0.5)",
            },
          }}
        >
          {t("home.services.eyebrow", "Services")}
        </Box>

        {/* .section h2 */}
        <Typography
          component="h2"
          sx={{
            fontFamily: SERIF,
            fontWeight: 400,
            fontSize: "28px",
            lineHeight: 1.1,
            letterSpacing: "-0.02em",
            color: "#2a1a14",
            marginBottom: "8px",
            "& em": { fontStyle: "italic", color: "#FE0944" },
          }}
        >
          {t("home.services.title.pre", "Wellness, ")}
          <em>{t("home.services.title.em", "tailored")}</em>
          {t("home.services.title.tail", ".")}
        </Typography>

        {/* .lead */}
        <Box
          component="p"
          sx={{
            fontFamily: SANS,
            fontSize: "13.5px",
            color: "rgba(60, 30, 20, 0.72)",
            lineHeight: 1.55,
            marginBottom: "20px",
          }}
        >
          {t(
            "home.services.lead",
            "Five therapeutic styles. All performed by licensed practitioners (ผ.พ.)."
          )}
        </Box>
      </Box>

      {/* .services-grid — verbatim */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "10px",
          padding: "0 20px 28px",
        }}
      >
        {SERVICES.map((s) => {
          const featured = !!s.featured;
          return (
            <Box
              key={s.id}
              role="button"
              tabIndex={0}
              onClick={() => goToService(s)}
              onKeyDown={(e) => {
                if (e.key === " " || e.key === "Enter") {
                  e.preventDefault();
                  goToService(s);
                }
              }}
              sx={{
                // .service-card — verbatim
                background: featured
                  ? "linear-gradient(135deg, rgba(254, 9, 68, 0.85), rgba(254, 122, 82, 0.85))"
                  : "rgba(255, 255, 255, 0.5)",
                backdropFilter: "blur(20px) saturate(180%)",
                WebkitBackdropFilter: "blur(20px) saturate(180%)",
                border: featured
                  ? "1px solid rgba(255, 255, 255, 0.4)"
                  : "1px solid rgba(255, 255, 255, 0.7)",
                borderRadius: "18px",
                padding: "14px",
                boxShadow: featured
                  ? "0 12px 32px rgba(254, 9, 68, 0.3)"
                  : "0 4px 16px rgba(254, 9, 68, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.6)",
                cursor: "pointer",
                position: "relative",
                overflow: "hidden",
                color: featured ? "#fff" : "#2a1a14",
                gridColumn: featured ? "1 / -1" : "auto",
                transition: "transform 0.15s ease, box-shadow 0.15s ease",
                "&:hover": {
                  transform: "translateY(-2px)",
                  boxShadow: featured
                    ? "0 16px 40px rgba(254, 9, 68, 0.38)"
                    : "0 8px 24px rgba(254, 9, 68, 0.12)",
                },
                "&:focus-visible": {
                  outline: "2px solid #FE0944",
                  outlineOffset: "2px",
                },
                // .service-card.featured::before — verbatim
                ...(featured && {
                  "&::before": {
                    content: '""',
                    position: "absolute",
                    top: "-30px",
                    right: "-30px",
                    width: "100px",
                    height: "100px",
                    borderRadius: "50%",
                    background: "rgba(255, 255, 255, 0.15)",
                    filter: "blur(20px)",
                  },
                }),
              }}
            >
              {/* .service-icon */}
              <Box
                aria-hidden
                sx={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                  background: featured
                    ? "rgba(255, 255, 255, 0.2)"
                    : "rgba(254, 9, 68, 0.1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "16px",
                  marginBottom: "10px",
                  position: "relative",
                  zIndex: 1,
                }}
              >
                {s.icon}
              </Box>

              {/* h3 */}
              <Typography
                component="h3"
                sx={{
                  fontFamily: SERIF,
                  fontWeight: 500,
                  fontSize: featured ? "18px" : "16px",
                  fontStyle: featured ? "italic" : "normal",
                  color: featured ? "#fff" : "#2a1a14",
                  marginBottom: "3px",
                  position: "relative",
                  zIndex: 1,
                }}
              >
                {t(`home.services.${s.id}.name`, defaultName(s.id))}
              </Typography>

              {/* .meta */}
              <Box
                sx={{
                  fontFamily: SANS,
                  fontSize: "11px",
                  color: featured ? "rgba(255, 255, 255, 0.85)" : "rgba(60, 30, 20, 0.72)",
                  marginBottom: "6px",
                  position: "relative",
                  zIndex: 1,
                }}
              >
                {t(`home.services.${s.id}.meta`, defaultMeta(s.id))}
              </Box>

              {/* .price */}
              <Box
                sx={{
                  fontFamily: SERIF,
                  fontWeight: 600,
                  fontSize: featured ? "18px" : "14px",
                  color: featured ? "#fff" : "#FE0944",
                  letterSpacing: "-0.02em",
                  position: "relative",
                  zIndex: 1,
                }}
              >
                {t(`home.services.${s.id}.price`, defaultPrice(s.id))}
                <Box
                  component="small"
                  sx={{
                    fontFamily: SANS,
                    fontWeight: 500,
                    fontSize: "10px",
                    color: featured ? "rgba(255, 255, 255, 0.7)" : "rgba(60, 30, 20, 0.72)",
                    marginLeft: "3px",
                  }}
                >
                  {t(`home.services.${s.id}.unit`, defaultUnit(s.id))}
                </Box>
              </Box>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};

// ─── EN fallback copy ───
function defaultName(id: string): string {
  switch (id) {
    case "signatureThai": return "Signature Thai";
    case "oil": return "Oil Relaxation";
    case "aroma": return "Aromatherapy";
    case "sport": return "Sport Recovery";
    case "prenatal": return "Pre-natal";
    default: return id;
  }
}
function defaultMeta(id: string): string {
  switch (id) {
    case "signatureThai": return "Most booked · 60–120 min";
    case "oil": return "60–90 min";
    case "aroma": return "90 min";
    case "sport": return "60–90 min";
    case "prenatal": return "60 min · certified";
    default: return "";
  }
}
function defaultPrice(id: string): string {
  switch (id) {
    case "signatureThai": return "฿1,800";
    case "oil": return "฿2,000";
    case "aroma": return "฿2,500";
    case "sport": return "฿2,200";
    case "prenatal": return "฿2,400";
    default: return "";
  }
}
function defaultUnit(id: string): string {
  switch (id) {
    case "aroma": return "/ 90min";
    default: return "/ 60min";
  }
}

export default ServicesGrid;
