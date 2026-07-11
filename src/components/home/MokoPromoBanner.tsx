// src/components/home/MokoPromoBanner.tsx
//
// 🆕 28s383 — "จัดเต็ม เหมือน mokofans" incl. the pink promo banner. Moko's
//   home carries a bright pink/purple gradient banner between the notice bar
//   and the category tabs. SunRed version: same magenta→violet Moko gradient,
//   but a discreet quiet-luxury message (the Discovery welcome offer) instead
//   of Moko's crude copy. Tapping scrolls to the practitioner list.

import React from "react";
import { Box } from "@mui/material";
import { useTranslation } from "react-i18next";
import { ShieldCheck, Sparkle, CaretRight } from "phosphor-react";
import { fonts } from "@/theme";

const MokoPromoBanner: React.FC = () => {
  const { t } = useTranslation();

  const scrollToGrid = () => {
    const el = document.getElementById("therapist-grid");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <Box
      component="button"
      type="button"
      onClick={scrollToGrid}
      aria-label={t("home.promo.aria", "See available practitioners")}
      sx={{
        all: "unset",
        boxSizing: "border-box",
        cursor: "pointer",
        display: "block",
        width: "auto",
        margin: { xs: "8px 16px 4px", md: "10px 20px 6px" },
        padding: "16px 18px",
        borderRadius: "18px",
        position: "relative",
        overflow: "hidden",
        // Moko magenta→violet gradient.
        background: "linear-gradient(120deg,#EC4899 0%,#B052C4 55%,#8B5CF6 100%)",
        boxShadow: "0 10px 26px rgba(176, 82, 196, 0.28)",
        transition: "transform 0.16s ease, box-shadow 0.16s ease",
        "&:hover": {
          transform: "translateY(-1px)",
          boxShadow: "0 14px 30px rgba(176, 82, 196, 0.34)",
        },
        "&:focus-visible": { outline: "2px solid #fff", outlineOffset: 2 },
      }}
    >
      {/* soft decorative blobs */}
      <Box
        aria-hidden
        sx={{
          position: "absolute",
          top: -30,
          right: -20,
          width: 120,
          height: 120,
          borderRadius: "50%",
          background: "rgba(255,255,255,0.14)",
        }}
      />
      <Box
        aria-hidden
        sx={{
          position: "absolute",
          bottom: -40,
          right: 60,
          width: 90,
          height: 90,
          borderRadius: "50%",
          background: "rgba(255,255,255,0.08)",
        }}
      />

      <Box
        sx={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          gap: "12px",
        }}
      >
        <Box sx={{ flex: 1, minWidth: 0, textAlign: "left" }}>
          {/* eyebrow */}
          <Box
            sx={{
              display: "inline-flex",
              alignItems: "center",
              gap: "5px",
              marginBottom: "6px",
            }}
          >
            <Sparkle size={13} weight="fill" color="#fff" />
            <Box
              sx={{
                fontFamily: fonts.body,
                fontSize: "10px",
                fontWeight: 800,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.92)",
              }}
            >
              {t("home.promo.eyebrow", "SunRed Concierge")}
            </Box>
          </Box>

          {/* headline */}
          <Box
            sx={{
              fontFamily: fonts.heading,
              fontSize: { xs: "16px", md: "18px" },
              fontWeight: 700,
              color: "#fff",
              lineHeight: 1.25,
              marginBottom: "3px",
            }}
          >
            {t("home.promo.title", "First reservation? A welcome gesture awaits")}
          </Box>

          {/* sub + verified chip */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              flexWrap: "wrap",
            }}
          >
            <Box
              sx={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                fontFamily: fonts.body,
                fontSize: "11.5px",
                fontWeight: 700,
                color: "#fff",
                background: "rgba(255,255,255,0.18)",
                borderRadius: "999px",
                padding: "3px 9px",
              }}
            >
              <ShieldCheck size={13} weight="fill" color="#fff" />
              {t("home.promo.verified", "100% Verified")}
            </Box>
            <Box
              sx={{
                fontFamily: fonts.body,
                fontSize: "11.5px",
                fontWeight: 500,
                color: "rgba(255,255,255,0.9)",
              }}
            >
              {t("home.promo.sub", "Concierge replies in minutes")}
            </Box>
          </Box>
        </Box>

        {/* CTA arrow */}
        <Box
          aria-hidden
          sx={{
            flexShrink: 0,
            width: 34,
            height: 34,
            borderRadius: "50%",
            background: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 4px 10px rgba(124, 58, 237, 0.30)",
          }}
        >
          <CaretRight size={17} weight="bold" color="#B052C4" />
        </Box>
      </Box>
    </Box>
  );
};

export default MokoPromoBanner;
