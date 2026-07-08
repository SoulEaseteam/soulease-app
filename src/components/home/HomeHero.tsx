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
import { fonts } from "@/theme";
// 🆕 28s332 — time-aware pill label (DAYTIME / PRIME HOURS / …) shared with
//   the therapist grid + TopNav so the hero never disagrees on the mode.
import { useConciergeMode } from "@/utils/conciergeMode";

// Warm quiet-luxury palette — matched to the cream photo, not the cool
// Nordic page grays.
const INK = "#2B2620"; // espresso — serif headline ink (hero only)
const BODY = "#4B4B48"; // GRAY_800 — Thai subtitle unified w/ site body (r80)
const CTA_FILL = "#8F8474"; // WARM_TAUPE — matches sitewide primary CTA (r80)
const CTA_FILL_HOVER = "#7A7060"; // WARM_TAUPE_HOVER

const HERO_IMG = "/images/hero/hero.jpg";

const HomeHero: React.FC = () => {
  const { t } = useTranslation();
  const concierge = useConciergeMode();

  const scrollToTherapistGrid = () => {
    const el = document.getElementById("therapist-grid");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <Box
      component="section"
      aria-label="SunRed — Bangkok outcall massage, delivered to your hotel"
      sx={{
        position: "relative",
        overflow: "hidden",
        margin: { xs: "12px 12px 8px", md: "20px 12px 12px" },
        borderRadius: { xs: "22px", md: "26px" },
        border: "1px solid #E7E0D5",
        boxShadow: "0 10px 30px rgba(43, 38, 32, 0.08)",
        minHeight: { xs: 470, sm: 500, md: 520, lg: 560 },
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
          // 🆕 28s333 — gentle "breathing" Ken Burns drift (founder: calm,
          //   spa-like motion). Very slow so it reads as ambient, not busy.
          //   Starts at scale 1 (always visible — never JS/opacity-gated);
          //   overflow:hidden on the card clips the slight overscale.
          transformOrigin: "68% 42%",
          animation: "heroKenBurns 26s ease-in-out infinite alternate",
          "@keyframes heroKenBurns": {
            from: { transform: "scale(1) translate3d(0, 0, 0)" },
            to: { transform: "scale(1.07) translate3d(-1.2%, -1%, 0)" },
          },
          "@media (prefers-reduced-motion: reduce)": { animation: "none" },
        }}
      />

      {/* Cream scrim — heavier on small screens so the overlaid text always
          reads; the photo is cream so this blends seamlessly. */}
      <Box
        aria-hidden="true"
        sx={{
          position: "absolute",
          inset: 0,
          background: {
            xs: "linear-gradient(90deg, rgba(244,239,232,0.97) 0%, rgba(244,239,232,0.92) 50%, rgba(244,239,232,0.6) 72%, rgba(244,239,232,0) 95%)",
            md: "linear-gradient(90deg, rgba(244,239,232,0.95) 0%, rgba(244,239,232,0.78) 34%, rgba(244,239,232,0.3) 56%, rgba(244,239,232,0) 72%)",
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
          // 🆕 28s335 — top-aligned so the copy flows from the top like the
          //   founder's ref (image 2), sitting high in the hero rather than
          //   floating in the vertical centre ("ขยับข้อความขึ้น + บาลาน").
          justifyContent: "flex-start",
          gap: { xs: "12px", md: "15px" },
          padding: {
            xs: "34px 18px 70px",
            sm: "40px 26px 74px",
            md: "52px 48px 88px",
          },
          maxWidth: { xs: "94%", sm: "82%", md: "66%", lg: "60%" },
        }}
      >
        {/* 🆕 28s332 — eyebrow pill: time-aware mode + Bangkok (founder copy
            "DAYTIME · BANGKOK"). Live dot + soft pill so it reads on the photo. */}
        <Box
          sx={{
            display: "inline-flex",
            alignItems: "center",
            alignSelf: "flex-start",
            gap: "8px",
            padding: "5px 12px",
            borderRadius: 999,
            background: "rgba(255,255,255,0.62)",
            border: "1px solid rgba(43,38,32,0.14)",
            backdropFilter: "blur(2px)",
            WebkitBackdropFilter: "blur(2px)",
          }}
        >
          <Box
            component="span"
            aria-hidden="true"
            sx={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: "#A2846A",
              flexShrink: 0,
              // 🆕 28s333 — soft "live" pulse, slow + calm (spa breathing).
              animation: "heroDotPulse 3.4s ease-in-out infinite",
              "@keyframes heroDotPulse": {
                "0%, 100%": { boxShadow: "0 0 0 3px rgba(162,132,106,0.22)" },
                "50%": { boxShadow: "0 0 0 5px rgba(162,132,106,0.08)" },
              },
              "@media (prefers-reduced-motion: reduce)": {
                animation: "none",
                boxShadow: "0 0 0 3px rgba(162,132,106,0.22)",
              },
            }}
          />
          <Box
            component="span"
            sx={{
              fontFamily: fonts.body,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: BODY,
            }}
          >
            {concierge.pillLabel} · Bangkok
          </Box>
        </Box>

        {/* Headline — founder copy (28s332), hardcoded so the exact wording
            always shows regardless of the i18n bundle. */}
        <Box
          component="h2"
          sx={{
            margin: 0,
            fontFamily: fonts.heading,
            fontWeight: 500,
            color: INK,
            lineHeight: 1.12,
            letterSpacing: "-0.005em",
            fontSize: { xs: 27, sm: 34, md: 44, lg: 52 },
            textWrap: "balance",
            maxWidth: 560,
          }}
        >
          Bangkok Outcall Massage · Delivered to Your Hotel
        </Box>

        {/* Thai subtitle */}
        <Box
          sx={{
            fontFamily: fonts.body,
            fontWeight: 400,
            color: BODY,
            lineHeight: 1.5,
            letterSpacing: "0.01em",
            fontSize: { xs: 13, sm: 14, md: 16 },
            maxWidth: 420,
          }}
        >
          นวดถึงห้อง กรุงเทพฯ · จัดส่งถึงโรงแรม
        </Box>

        {/* Sub-copy — standby + languages (ไทย/EN/中文/日本語/한국어) + promise */}
        <Box
          sx={{
            fontFamily: fonts.body,
            fontWeight: 400,
            color: BODY,
            lineHeight: 1.55,
            fontSize: { xs: 12.5, sm: 13, md: 14.5 },
            maxWidth: 470,
          }}
        >
          Verified practitioners on standby ภาษาไทย, English, 中文, 日本語, 한국어.
          Concierge replies in minutes.
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
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default HomeHero;
