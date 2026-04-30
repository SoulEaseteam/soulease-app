// src/components/home/TrustSection.tsx
//
// 🎨 Phase 1 Home — Trust (pixel-perfect port of `.trust` block).
// Peach-tinted glass container with h2 + p + 4-stat grid.
//
// Verbatim CSS from sunred-home1.html `.trust { margin: 0 14px 28px; padding: 24px 20px; ... }`
// + `.trust::before` decorative blurry red circle.

import React from "react";
import { Box, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";

const SERIF = '"Fraunces", Georgia, "Times New Roman", serif';
const SANS = '"Inter", system-ui, -apple-system, sans-serif';

type Stat = { id: string; icon: string };
const STATS: Stat[] = [
  { id: "licensed", icon: "🛡️" },
  { id: "rated", icon: "⭐" },
  { id: "langs", icon: "🌐" },
  { id: "arrival", icon: "⏱️" },
];

const TrustSection: React.FC = () => {
  const { t } = useTranslation();

  return (
    <Box
      sx={{
        // .trust — verbatim
        margin: "0 14px 28px",
        padding: "24px 20px",
        borderRadius: "22px",
        background:
          "linear-gradient(180deg, rgba(254, 201, 167, 0.4) 0%, rgba(255, 176, 136, 0.3) 100%)",
        backdropFilter: "blur(30px) saturate(180%)",
        WebkitBackdropFilter: "blur(30px) saturate(180%)",
        border: "1px solid rgba(255, 255, 255, 0.6)",
        textAlign: "center",
        position: "relative",
        overflow: "hidden",
        // .trust::before
        "&::before": {
          content: '""',
          position: "absolute",
          top: "-40px",
          right: "-40px",
          width: "150px",
          height: "150px",
          borderRadius: "50%",
          background: "rgba(254, 9, 68, 0.15)",
          filter: "blur(30px)",
        },
      }}
    >
      {/* .trust h2 */}
      <Typography
        component="h2"
        sx={{
          position: "relative",
          fontFamily: SERIF,
          fontWeight: 400,
          fontSize: "22px",
          color: "#2a1a14",
          marginBottom: "6px",
          lineHeight: 1.2,
          "& em": { fontStyle: "italic", color: "#FE0944" },
        }}
      >
        {t("home.trust.title.pre", "Standards ")}
        <em>{t("home.trust.title.em", "that matter")}</em>
        {t("home.trust.title.tail", ".")}
      </Typography>

      {/* .trust p */}
      <Box
        component="p"
        sx={{
          position: "relative",
          fontFamily: SANS,
          fontSize: "12.5px",
          color: "rgba(60, 30, 20, 0.72)",
          lineHeight: 1.55,
          marginBottom: "18px",
        }}
      >
        {t(
          "home.trust.lead",
          "Every therapist on SunRed holds a current Thai Ministry of Public Health license and undergoes annual recertification."
        )}
      </Box>

      {/* .trust-grid */}
      <Box
        sx={{
          position: "relative",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "10px",
        }}
      >
        {STATS.map((s) => (
          <Box
            key={s.id}
            sx={{
              // .trust-card — verbatim
              background: "rgba(255, 255, 255, 0.7)",
              backdropFilter: "blur(15px)",
              WebkitBackdropFilter: "blur(15px)",
              border: "1px solid rgba(255, 255, 255, 0.8)",
              borderRadius: "14px",
              padding: "12px 10px",
              textAlign: "center",
            }}
          >
            <Box sx={{ fontSize: "20px", marginBottom: "6px" }}>{s.icon}</Box>
            <Box
              sx={{
                fontFamily: SERIF,
                fontWeight: 600,
                fontSize: "18px",
                color: "#FE0944",
                letterSpacing: "-0.02em",
                lineHeight: 1,
              }}
            >
              {t(`home.trust.${s.id}.num`, defaultStatNum(s.id))}
            </Box>
            <Box
              sx={{
                fontFamily: SANS,
                fontSize: "9.5px",
                color: "rgba(60, 30, 20, 0.72)",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                fontWeight: 600,
                marginTop: "3px",
              }}
            >
              {t(`home.trust.${s.id}.lbl`, defaultStatLbl(s.id))}
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

function defaultStatNum(id: string): string {
  switch (id) {
    case "licensed": return "100%";
    case "rated": return "4.8★";
    case "langs": return "5";
    case "arrival": return "<60min";
    default: return "";
  }
}
function defaultStatLbl(id: string): string {
  switch (id) {
    case "licensed": return "Licensed";
    case "rated": return "1,200 reviews";
    case "langs": return "Languages";
    case "arrival": return "Avg arrival";
    default: return "";
  }
}

export default TrustSection;
