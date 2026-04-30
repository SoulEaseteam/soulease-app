// src/components/home/FinalCTA.tsx
//
// 🎨 Phase 1 Home — Final CTA (pixel-perfect port of `.final-cta`).
// Full red→coral→peach gradient block with white CTA pill + concierge link.
//
// Verbatim CSS from sunred-home1.html:
//   .final-cta { margin: 0 14px 24px; padding: 32px 24px; border-radius: 24px;
//     background: linear-gradient(135deg, #FE0944 0%, #FE7A52 50%, #FFB088 100%);
//     ...box-shadow + ::before + ::after blurry circles. }
//   .final-cta .btn — white pill with red text.

import React from "react";
import { Box, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";

const SERIF = '"Fraunces", Georgia, "Times New Roman", serif';
const SANS = '"Inter", system-ui, -apple-system, sans-serif';

const FinalCTA: React.FC = () => {
  const { t } = useTranslation();

  const handleCta = () => {
    if (typeof document === "undefined") return;
    const el = document.getElementById("therapist-list");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <Box
      sx={{
        // .final-cta — verbatim
        margin: "0 14px 24px",
        padding: "32px 24px",
        borderRadius: "24px",
        background:
          "linear-gradient(135deg, #FE0944 0%, #FE7A52 50%, #FFB088 100%)",
        textAlign: "center",
        color: "#fff",
        position: "relative",
        overflow: "hidden",
        boxShadow: "0 16px 40px rgba(254, 9, 68, 0.3)",
        // .final-cta::before
        "&::before": {
          content: '""',
          position: "absolute",
          top: "-60px",
          left: "-40px",
          width: "200px",
          height: "200px",
          borderRadius: "50%",
          background: "rgba(255, 255, 255, 0.15)",
          filter: "blur(30px)",
        },
        // .final-cta::after
        "&::after": {
          content: '""',
          position: "absolute",
          bottom: "-50px",
          right: "-30px",
          width: "180px",
          height: "180px",
          borderRadius: "50%",
          background: "rgba(255, 229, 217, 0.3)",
          filter: "blur(30px)",
        },
      }}
    >
      {/* .eyebrow */}
      <Box
        sx={{
          position: "relative",
          fontFamily: SANS,
          fontSize: "10px",
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          opacity: 0.85,
          fontWeight: 700,
          marginBottom: "8px",
        }}
      >
        {t("home.finalCta.eyebrow", "Ready when you are")}
      </Box>

      {/* h2 */}
      <Typography
        component="h2"
        sx={{
          position: "relative",
          fontFamily: SERIF,
          fontWeight: 400,
          fontSize: "28px",
          lineHeight: 1.1,
          letterSpacing: "-0.02em",
          marginBottom: "10px",
          "& em": { fontStyle: "italic", color: "#FFE5D9" },
        }}
      >
        {t("home.finalCta.title.pre", "Restore ")}
        <em>{t("home.finalCta.title.em", "tonight")}</em>
        {t("home.finalCta.title.tail", ".")}
      </Typography>

      {/* p */}
      <Box
        component="p"
        sx={{
          position: "relative",
          fontFamily: SANS,
          fontSize: "13px",
          opacity: 0.9,
          marginBottom: "22px",
          lineHeight: 1.55,
        }}
      >
        {t(
          "home.finalCta.body",
          "32 therapists online now. Average arrival time under one hour anywhere in central Bangkok."
        )}
      </Box>

      {/* .btn — white pill */}
      <Box
        component="button"
        type="button"
        onClick={handleCta}
        sx={{
          position: "relative",
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
          background: "rgba(255, 255, 255, 0.95)",
          color: "#FE0944",
          padding: "14px 28px",
          borderRadius: "99px",
          fontSize: "14px",
          fontWeight: 700,
          textDecoration: "none",
          boxShadow:
            "0 8px 24px rgba(126, 31, 30, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.5)",
          marginBottom: "14px",
          width: "100%",
          justifyContent: "center",
          fontFamily: SANS,
          border: "none",
          cursor: "pointer",
        }}
      >
        {t("home.finalCta.cta", "Book your therapist")} <span>→</span>
      </Box>

      {/* .secondary */}
      <Box
        sx={{
          position: "relative",
          fontSize: "11px",
          opacity: 0.85,
          display: "flex",
          alignItems: "center",
          gap: "6px",
          justifyContent: "center",
          fontFamily: SANS,
        }}
      >
        {t("home.finalCta.or", "or ")}
        <Box
          component="a"
          href="#concierge"
          sx={{
            color: "#fff",
            textDecoration: "underline",
            fontWeight: 600,
          }}
        >
          {t("home.finalCta.concierge", "talk to our concierge")}
        </Box>
      </Box>
    </Box>
  );
};

export default FinalCTA;
