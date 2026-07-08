// src/components/home/HomeHero.tsx
//
// 🆕 Round 28s326 (founder 2026-07-08) — Home hero rebuilt to the
//   "Simple · Pure · Balanced" spa mockup ("ปรับหน้าโฮม แบบนี้").
// 🆕 Round 28s327 (founder 2026-07-08) — Swapped to a single full-bleed
//   background photo the founder supplied ("ใช้พื้นหลังอันนี้"): a bright
//   cream still-life — ceramic vase of eucalyptus + a lit candle + white
//   pebbles on a wood tray, subject on the RIGHT, generous empty cream
//   wall on the LEFT. Replaces the 3-image split carousel (28s326) — the
//   headline + Thai subtitle + CTAs now sit over the empty left third.
//
//   The photo lives at public/images/hero/hero.jpg (founder-provided).
//   Because the whole frame is light cream, a soft left→right cream scrim
//   guarantees text legibility on every crop without muddying the image:
//   on a narrow phone the cover-crop keeps the vase on the right while the
//   scrim keeps the left readable. Mount fade honors reduced-motion.
//
//   CTAs: "Book Now" (filled taupe) smooth-scrolls to the therapist grid
//   (#therapist-grid, mounted by HomePage); "View Services" (outline) →
//   /services. TopNav (red wordmark, 28s163-172) + QuickNavRow are left
//   as-is — QuickNavRow already carries the mockup's 4-icon nav.
// ─────────────────────────────────────────────────────────────────────

import React from "react";
import { Box } from "@mui/material";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { fonts } from "@/theme";

// 🆕 Round 28s329 (founder 2026-07-08) — "ทำไงให้สีมาหม่นๆ เทาๆ พาสเทล
//   แบบนี้": shift the hero from a WARM cream/taupe palette to a COOL,
//   desaturated grey-pastel to match the mockup. The photo is warm, so
//   it's muted via a CSS filter + a cool grey overlay (below); the tokens
//   here move ink/body/buttons from espresso+taupe to cool charcoal+greige.
const INK = "#3A3A3C"; // cool charcoal — serif headline ink
const BODY = "#6E6E73"; // cool grey — Thai subtitle (AA over the scrim)
const CTA_FILL = "#726F6B"; // muted greige — primary "Book Now" (AA on white)
const CTA_FILL_HOVER = "#5B5854";

const HERO_IMG = "/images/hero/hero.jpg";

const HomeHero: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const scrollToTherapistGrid = () => {
    const el = document.getElementById("therapist-grid");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <Box
      component="section"
      aria-label="SunRed — Simple. Pure. Balanced."
      sx={{
        position: "relative",
        overflow: "hidden",
        margin: { xs: "12px 12px 8px", md: "20px 12px 12px" },
        borderRadius: { xs: "22px", md: "26px" },
        border: "1px solid #E2E3E6", // 🆕 28s329 — cool grey (was warm #E7E0D5)
        boxShadow: "0 10px 30px rgba(58, 58, 60, 0.08)",
        minHeight: { xs: 430, sm: 470, md: 500, lg: 540 },
        display: "flex",
      }}
    >
      {/* Full-bleed background photo — subject kept on the right. */}
      <Box
        aria-hidden="true"
        sx={{
          position: "absolute",
          inset: 0,
          backgroundImage: `url("${HERO_IMG}")`,
          backgroundSize: "cover",
          backgroundRepeat: "no-repeat",
          // On a narrow phone the crop hugs the right so the vase/candle
          // stay in frame; on wide viewports the whole scene shows.
          backgroundPosition: { xs: "72% center", md: "right center" },
          // 🆕 28s329 — mute + brighten the warm photo toward the mockup's
          //   soft grey pastel (less saturation, a touch airier, softer
          //   contrast). The cool overlay below finishes the temperature shift.
          filter: "saturate(0.6) brightness(1.04) contrast(0.95)",
        }}
      />

      {/* 🆕 28s329 — cool grey wash over the whole photo to pull the warm
          cream/wood tones toward the muted grey-pastel of the mockup. */}
      <Box
        aria-hidden="true"
        sx={{
          position: "absolute",
          inset: 0,
          background: "rgba(226, 228, 233, 0.30)",
        }}
      />

      {/* Cool grey scrim — heavier on small screens so the overlaid text
          always reads. 🆕 28s329 — swapped from warm cream to cool light
          grey so the left reads muted/pastel, matching the mockup. */}
      <Box
        aria-hidden="true"
        sx={{
          position: "absolute",
          inset: 0,
          background: {
            xs: "linear-gradient(90deg, rgba(233,234,238,0.97) 0%, rgba(233,234,238,0.90) 42%, rgba(233,234,238,0.48) 64%, rgba(233,234,238,0) 88%)",
            md: "linear-gradient(90deg, rgba(233,234,238,0.95) 0%, rgba(233,234,238,0.74) 30%, rgba(233,234,238,0.26) 52%, rgba(233,234,238,0) 68%)",
          },
        }}
      />

      {/* Content — headline + Thai subtitle + CTAs over the empty left. */}
      <Box
        sx={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: { xs: "16px", md: "22px" },
          padding: {
            xs: "28px 18px",
            sm: "32px 26px",
            md: "44px 48px",
          },
          maxWidth: { xs: "88%", sm: "78%", md: "62%", lg: "56%" },
        }}
      >
        <Box
          component="h2"
          sx={{
            margin: 0,
            fontFamily: fonts.heading,
            fontWeight: 500,
            color: INK,
            lineHeight: 1.04,
            letterSpacing: "-0.01em",
            fontSize: { xs: 34, sm: 42, md: 56, lg: 64 },
            textWrap: "balance",
          }}
        >
          <Box component="span" sx={{ display: "block" }}>
            Simple.
          </Box>
          <Box component="span" sx={{ display: "block" }}>
            Pure.
          </Box>
          <Box component="span" sx={{ display: "block" }}>
            Balanced.
          </Box>
        </Box>

        {/* Thai subtitle — always shown so Thai guests feel welcomed. */}
        <Box
          sx={{
            fontFamily: fonts.body,
            fontWeight: 400,
            color: BODY,
            lineHeight: 1.5,
            letterSpacing: "0.01em",
            fontSize: { xs: 13, sm: 14, md: 16.5 },
            maxWidth: 360,
          }}
        >
          ความเรียบง่าย ที่ทำให้คุณรู้สึกดีที่สุด
        </Box>

        {/* CTAs */}
        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            gap: { xs: "10px", md: "12px" },
            marginTop: { xs: "2px", md: "4px" },
          }}
        >
          {/* Primary — Book Now → therapist grid */}
          <Box
            component="button"
            type="button"
            onClick={scrollToTherapistGrid}
            sx={{
              all: "unset",
              boxSizing: "border-box",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              minHeight: 48,
              padding: { xs: "0 22px", md: "0 30px" },
              borderRadius: 999,
              background: CTA_FILL,
              color: "#FFFFFF",
              fontFamily: fonts.body,
              fontSize: { xs: 14, md: 15 },
              fontWeight: 600,
              letterSpacing: "0.01em",
              boxShadow: "0 6px 18px rgba(43, 38, 32, 0.18)",
              transition:
                "background 0.16s ease, transform 0.16s ease, box-shadow 0.16s ease",
              "&:hover": {
                background: CTA_FILL_HOVER,
                transform: "translateY(-1px)",
                boxShadow: "0 8px 22px rgba(43, 38, 32, 0.24)",
              },
              "&:focus-visible": {
                outline: `2px solid ${INK}`,
                outlineOffset: 3,
              },
            }}
          >
            {t("home.hero.book", "Book Now")}
            <Box
              component="span"
              aria-hidden="true"
              sx={{ fontSize: 15, lineHeight: 1 }}
            >
              →
            </Box>
          </Box>

          {/* Secondary — View Services → /services */}
          <Box
            component="button"
            type="button"
            onClick={() => navigate("/services")}
            sx={{
              all: "unset",
              boxSizing: "border-box",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              minHeight: 48,
              padding: { xs: "0 22px", md: "0 30px" },
              borderRadius: 999,
              background: "rgba(245,246,248,0.6)",
              color: INK,
              border: `1.5px solid ${INK}`,
              backdropFilter: "blur(2px)",
              WebkitBackdropFilter: "blur(2px)",
              fontFamily: fonts.body,
              fontSize: { xs: 14, md: 15 },
              fontWeight: 600,
              letterSpacing: "0.01em",
              transition:
                "background 0.16s ease, color 0.16s ease, transform 0.16s ease",
              "&:hover": {
                background: INK,
                color: "#FFFFFF",
                transform: "translateY(-1px)",
              },
              "&:focus-visible": {
                outline: `2px solid ${INK}`,
                outlineOffset: 3,
              },
            }}
          >
            {t("home.hero.services", "View Services")}
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default HomeHero;
