// src/components/home/HeroSection.tsx
//
// 🎨 SunRed Hero — PIXEL-PERFECT port of `01-mockups/sunred-home.html`.
// Per HANDOFF1.md §"Pixel-perfect copy, not creative interpretation":
// every value below is copied verbatim from the mockup's <style> block.
// DO NOT consolidate, "improve", or simplify — `padding: 16px 14px 16px`,
// `border-radius: 24px`, `blur(50px)`, etc. are all literal mockup values.
//
// DOM hierarchy (matches mockup `.hero` exactly):
//   <section class="hero">
//     <div class="blob blob-1"/>            ← red blob, top-left, 200×200
//     <div class="blob blob-2"/>            ← peach blob, top-right
//     <div class="blob blob-3"/>            ← cream blob, bottom-center
//     <div class="leaf leaf-1"/>            ← coral leaf SVG, top-right
//     <div class="leaf leaf-2"/>            ← peach leaf SVG, bottom-left, rotated 160°
//     <div class="top-pill">                ← Concierge · Live · Bangkok
//     <div class="glass-card">              ← divider + h1 + sub + 3 badges
//     <button class="cta-primary">          ← Book your therapist →
//
// Mockup CSS variables resolved:
//   --red:       #FE0944
//   --coral:     #FE7A52
//   --peach:     #FFB088
//   --cream:     #FEC9A7
//   --burgundy:  #831843
//   --accent:    #b85c3c
//   --text:      #2a1a14
//   --text-muted: rgba(60, 30, 20, 0.72)

import React from "react";
import { Box, Typography, Button } from "@mui/material";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

const SERIF = '"Fraunces", Georgia, "Times New Roman", serif';
const SANS = '"Inter", system-ui, -apple-system, sans-serif';

const HeroSection: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // 🆕 Round 25c (founder 2026-05-02): /therapists list is now on
  //    HomePage itself (HomeTherapistGrid). CTA scrolls down to the
  //    grid section instead of routing — feels instant, no page swap.
  //    Falls back to navigate('/') if the grid isn't on the page (e.g.
  //    if Hero is reused elsewhere later).
  const handleCta = () => {
    const el = document.getElementById("therapist-grid");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      void navigate("/");
    }
  };

  return (
    <Box
      component="section"
      aria-label="hero"
      sx={{
        // ── verbatim from mockup `.hero` ──
        position: "relative",
        overflow: "hidden",
        borderRadius: "24px",
        margin: "0 14px",
        padding: "16px 14px 16px",
        minHeight: "460px",

        // Scoped @keyframes — verbatim from mockup
        "@keyframes blobMove1": {
          "0%, 100%": { transform: "translate(0, 0) scale(1)" },
          "33%": { transform: "translate(40px, -30px) scale(1.15)" },
          "66%": { transform: "translate(-20px, 30px) scale(0.95)" },
        },
        "@keyframes blobMove2": {
          "0%, 100%": { transform: "translate(0, 0) scale(1)" },
          "33%": { transform: "translate(-50px, 40px) scale(1.1)" },
          "66%": { transform: "translate(30px, -20px) scale(1.2)" },
        },
        "@keyframes blobMove3": {
          "0%, 100%": { transform: "translate(0, 0) scale(1)" },
          "50%": { transform: "translate(20px, -40px) scale(1.25)" },
        },
        "@keyframes pulseDot": {
          "0%, 100%": { opacity: 1 },
          "50%": { opacity: 0.4 },
        },
        "@keyframes leafFloat": {
          "0%, 100%": { transform: "rotate(0deg) translate(0, 0)" },
          "50%": { transform: "rotate(8deg) translate(3px, -4px)" },
        },
      }}
    >
      {/* ── .blob.blob-1 ── verbatim ── */}
      <Box
        aria-hidden
        sx={{
          position: "absolute",
          top: "-50px",
          left: "-30px",
          width: "200px",
          height: "200px",
          borderRadius: "50%",
          background: "#FE0944",
          opacity: 0.65,
          filter: "blur(50px)",
          pointerEvents: "none",
          animation: "blobMove1 14s ease-in-out infinite",
        }}
      />
      {/* ── .blob.blob-2 ── verbatim ── */}
      <Box
        aria-hidden
        sx={{
          position: "absolute",
          top: "25%",
          right: "-50px",
          width: "200px",
          height: "200px",
          borderRadius: "50%",
          background: "#FFB088",
          opacity: 0.65,
          filter: "blur(50px)",
          pointerEvents: "none",
          animation: "blobMove2 16s ease-in-out infinite",
        }}
      />
      {/* ── .blob.blob-3 ── verbatim ── */}
      <Box
        aria-hidden
        sx={{
          position: "absolute",
          bottom: "-40px",
          left: "30%",
          width: "180px",
          height: "180px",
          borderRadius: "50%",
          background: "#FEC9A7",
          opacity: 0.65,
          filter: "blur(50px)",
          pointerEvents: "none",
          animation: "blobMove3 12s ease-in-out infinite",
        }}
      />

      {/* ── .leaf.leaf-1 ── verbatim ── */}
      <Box
        aria-hidden
        sx={{
          position: "absolute",
          top: "12px",
          right: "22px",
          opacity: 0.5,
          zIndex: 2,
          pointerEvents: "none",
          animation: "leafFloat 6s ease-in-out infinite",
        }}
      >
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 2C8 6 6 10 8 14C9 17 11 18 12 22C13 18 15 17 16 14C18 10 16 6 12 2Z"
            fill="#FE7A52"
            opacity="0.7"
          />
          <path d="M12 6V18" stroke="#FE0944" strokeWidth="0.5" />
        </svg>
      </Box>
      {/* ── .leaf.leaf-2 ── verbatim ── */}
      <Box
        aria-hidden
        sx={{
          position: "absolute",
          bottom: "80px",
          left: "12px",
          opacity: 0.4,
          transform: "rotate(160deg)",
          zIndex: 2,
          pointerEvents: "none",
          animation: "leafFloat 6s ease-in-out infinite -2s",
        }}
      >
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 2C8 6 6 10 8 14C9 17 11 18 12 22C13 18 15 17 16 14C18 10 16 6 12 2Z"
            fill="#FFB088"
            opacity="0.6"
          />
        </svg>
      </Box>

      {/* ── .top-pill ── verbatim ── */}
      <Box
        sx={{
          position: "relative",
          zIndex: 3,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "8px 14px",
          borderRadius: "99px",
          background: "rgba(255, 255, 255, 0.55)",
          backdropFilter: "blur(20px) saturate(180%)",
          WebkitBackdropFilter: "blur(20px) saturate(180%)",
          border: "1px solid rgba(255, 255, 255, 0.7)",
          boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.6)",
          marginBottom: "14px",
        }}
      >
        {/* .top-pill .label */}
        <Box
          component="span"
          sx={{
            fontFamily: SERIF,
            fontStyle: "italic",
            fontWeight: 500,
            fontSize: "14px",
            color: "#831843",
          }}
        >
          {t("hero.concierge", "Concierge")}
        </Box>
        {/* .top-pill .live */}
        <Box
          component="span"
          sx={{
            display: "flex",
            alignItems: "center",
            gap: "5px",
            fontFamily: SANS,
            fontSize: "10px",
            fontWeight: 600,
            color: "#831843",
            letterSpacing: "0.05em",
            textTransform: "uppercase",
          }}
        >
          {/* .top-pill .dot */}
          <Box
            aria-hidden
            sx={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              background: "#16a34a",
              boxShadow: "0 0 8px #16a34a",
              animation: "pulseDot 1.5s ease-in-out infinite",
            }}
          />
          {t("hero.live", "Live · Bangkok")}
        </Box>
      </Box>

      {/* ── .glass-card ── verbatim ── */}
      <Box
        sx={{
          position: "relative",
          zIndex: 3,
          borderRadius: "22px",
          padding: "28px 20px 24px",
          background: "rgba(255, 255, 255, 0.45)",
          backdropFilter: "blur(30px) saturate(180%)",
          WebkitBackdropFilter: "blur(30px) saturate(180%)",
          border: "1px solid rgba(255, 255, 255, 0.65)",
          boxShadow:
            "0 12px 40px rgba(254, 9, 68, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.7)",
          textAlign: "center",
          marginBottom: "14px",
        }}
      >
        {/* .divider-label */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            marginBottom: "12px",
            "&::before, &::after": {
              content: '""',
              width: "18px",
              height: "1px",
              background: "rgba(184, 92, 60, 0.4)",
            },
          }}
        >
          <Box
            component="span"
            sx={{
              fontFamily: SANS,
              fontSize: "9.5px",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "#b85c3c",
              fontWeight: 600,
            }}
          >
            {t("hero.tagline", "Bangkok · Outcall Wellness")}
          </Box>
        </Box>

        {/* h1 */}
        <Typography
          component="h1"
          sx={{
            fontFamily: SERIF,
            fontWeight: 400,
            fontSize: "34px",
            lineHeight: 1.05,
            letterSpacing: "-0.02em",
            color: "#2a1a14",
            marginBottom: "12px",
            "& em": {
              fontStyle: "italic",
              color: "#FE0944",
            },
          }}
        >
          {t("hero.title", "Restore.")}
          <br />
          <em>{t("hero.title.accent", "Delivered")}</em>{" "}
          {t("hero.title.tail", "to you.")}
        </Typography>

        {/* .sub */}
        <Box
          component="p"
          sx={{
            fontFamily: SANS,
            fontSize: "13px",
            color: "rgba(60, 30, 20, 0.72)",
            lineHeight: 1.55,
            marginBottom: "18px",
            fontWeight: 500,
          }}
        >
          {t(
            "hero.subtitle",
            "Licensed therapists, real-time availability, multilingual care — at your hotel, on your schedule."
          )}
        </Box>

        {/* .badges */}
        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            gap: "6px",
            justifyContent: "center",
          }}
        >
          {/* .badge ✓ Licensed */}
          <Box
            component="span"
            sx={{
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              padding: "5px 11px",
              borderRadius: "99px",
              background: "rgba(255, 255, 255, 0.7)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              border: "1px solid rgba(254, 9, 68, 0.15)",
              color: "#be1d4a",
              fontFamily: SANS,
              fontSize: "11px",
              fontWeight: 600,
              boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.6)",
            }}
          >
            ✓ {t("hero.badge.verified", "Licensed")}
          </Box>
          {/* .badge ⏰ 24 / 7 */}
          <Box
            component="span"
            sx={{
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              padding: "5px 11px",
              borderRadius: "99px",
              background: "rgba(255, 255, 255, 0.7)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              border: "1px solid rgba(254, 9, 68, 0.15)",
              color: "#be1d4a",
              fontFamily: SANS,
              fontSize: "11px",
              fontWeight: 600,
              boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.6)",
            }}
          >
            ⏰ {t("hero.badge.always", "24 / 7")}
          </Box>
          {/* .badge 🌐 5 Languages
              🆕 Round 25 (founder 2026-05-02): replaced fake "★ 4.8 · 1,200+"
              stat (was hardcoded, no data backing) with factual claim that
              the platform actually supports 5 languages. Same anti-fake-data
              rationale as Round 21 stripping TrustSection. */}
          <Box
            component="span"
            sx={{
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              padding: "5px 11px",
              borderRadius: "99px",
              background: "rgba(255, 255, 255, 0.7)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              border: "1px solid rgba(254, 9, 68, 0.15)",
              color: "#be1d4a",
              fontFamily: SANS,
              fontSize: "11px",
              fontWeight: 600,
              boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.6)",
            }}
          >
            🌐 {t("hero.badge.languages", "5 Languages")}
          </Box>
        </Box>
      </Box>

      {/* ── .cta-primary ── verbatim ── */}
      <Button
        type="button"
        onClick={handleCta}
        aria-label={t("hero.cta", "Book your therapist")}
        sx={{
          position: "relative",
          zIndex: 3,
          width: "100%",
          background: "linear-gradient(135deg, #FE0944, #FE7A52)",
          color: "#fff",
          padding: "14px",
          border: "none",
          borderRadius: "99px",
          fontFamily: SANS,
          fontSize: "14px",
          fontWeight: 700,
          letterSpacing: "-0.01em",
          textTransform: "none",
          boxShadow:
            "0 8px 24px rgba(254, 9, 68, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.3)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "8px",
          cursor: "pointer",
          "&:hover": {
            background: "linear-gradient(135deg, #FE0944, #FE7A52)",
            boxShadow:
              "0 10px 28px rgba(254, 9, 68, 0.36), inset 0 1px 0 rgba(255, 255, 255, 0.3)",
          },
        }}
      >
        {t("hero.cta", "Book your therapist")} <span>→</span>
      </Button>
    </Box>
  );
};

export default HeroSection;
