// src/components/home/HomeHero.tsx
//
// 🆕 Round 28s326 (founder 2026-07-08) — Home hero rebuilt to the
//   "Simple · Pure · Balanced" spa mockup the founder sent
//   ("ปรับหน้าโฮม แบบนี้"). Replaces the text-only Nordic-gray hero band
//   that lived inline in HomePage.tsx (r70 / r76).
//
//   Layout — editorial split, faithful to the mockup on every viewport:
//     • Left  : Playfair serif headline stacked "Simple. / Pure. /
//               Balanced." + a small Thai subtitle (Sarabun).
//     • Right : a serene spa image that bleeds into the card's rounded
//               top-right corner. Auto-rotating 3-image carousel
//               (candles → relax → hands) with clickable dots, so the
//               mockup's • • • indicator is real, not decoration.
//     • Below : two pills — "Book Now" (filled taupe) smooth-scrolls to
//               the therapist grid (the actual booking product, mounted
//               under #therapist-grid by HomePage), "View Services"
//               (outline) routes to /services.
//
//   The 3 carousel images are existing on-brand studio shots from
//   public/images/Service — deliberately the no-face / no-watermark
//   still-life & ambience frames (candles, robe-relax, hands-on-back)
//   to hold the quiet-luxury tone. IMG_5056 / IMG_5050 (Xiaohongshu
//   watermark) and IMG_1595 (baked-in "OPEN TODAY" text) were skipped.
//
//   Motion: a single gentle crossfade every ~5.2s, plus a one-shot
//   fade-in on mount. Both are disabled under prefers-reduced-motion.
// ─────────────────────────────────────────────────────────────────────

import React, { useEffect, useState } from "react";
import { Box } from "@mui/material";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { fonts } from "@/theme";

// Warm quiet-luxury palette — a hair warmer than the page's cool Nordic
// grays because the mockup's mood is Aesop/Muji ivory, not slate.
const INK = "#2B2620"; // espresso — serif headline ink
const BODY = "#7B7266"; // warm gray — Thai subtitle / sub-copy
const CARD_BORDER = "#E7E0D5"; // warm neutral 200
const CTA_FILL = "#6B5F54"; // taupe — primary "Book Now" (AA on white)
const CTA_FILL_HOVER = "#574C43";

type Slide = { src: string; alt: string };

const SLIDES: Slide[] = [
  {
    src: "/images/Service/IMG_5089.JPG",
    alt: "Warm candles, folded towels and a botanical vase in a calm spa setting",
  },
  {
    src: "/images/Service/IMG_1593.JPG",
    alt: "A guest in a robe relaxing during a soft-lit treatment",
  },
  {
    src: "/images/Service/IMG_1591.JPG",
    alt: "A therapist's hands resting gently during a massage",
  },
];

const ROTATE_MS = 5200;

const HomeHero: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [idx, setIdx] = useState(0);
  const [reduced, setReduced] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Respect prefers-reduced-motion for both the auto-rotate and the
  // mount fade — accessibility + it reads calmer for anyone who opts out.
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);

  // One-shot fade-in on mount (skipped when reduced-motion is on).
  useEffect(() => {
    const id = window.requestAnimationFrame(() => setMounted(true));
    return () => window.cancelAnimationFrame(id);
  }, []);

  // Gentle auto-crossfade through the 3 ambience frames.
  useEffect(() => {
    if (reduced) return;
    const id = window.setInterval(
      () => setIdx((i) => (i + 1) % SLIDES.length),
      ROTATE_MS
    );
    return () => window.clearInterval(id);
  }, [reduced]);

  const scrollToTherapistGrid = () => {
    const el = document.getElementById("therapist-grid");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <Box
      component="section"
      aria-label="SunRed — Simple. Pure. Balanced."
      sx={{
        margin: { xs: "12px 12px 8px", md: "20px 12px 12px" },
        borderRadius: { xs: "22px", md: "26px" },
        overflow: "hidden",
        position: "relative",
        border: `1px solid ${CARD_BORDER}`,
        // Warm ivory ground — the mockup's Aesop-cream backdrop.
        background: "linear-gradient(158deg, #F6F2EC 0%, #EFE9E0 100%)",
        boxShadow: "0 10px 30px rgba(43, 38, 32, 0.07)",
        // Subtle fade-up on first paint; static when reduced-motion is on.
        opacity: reduced || mounted ? 1 : 0,
        transform: reduced || mounted ? "none" : "translateY(8px)",
        transition: reduced
          ? "none"
          : "opacity 0.6s ease, transform 0.6s ease",
      }}
    >
      {/* ── Top band: headline (left) + bleeding image carousel (right) ── */}
      <Box
        sx={{
          display: "flex",
          alignItems: "stretch",
        }}
      >
        {/* Left — serif headline + Thai subtitle */}
        <Box
          sx={{
            flex: 1,
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: {
              xs: "22px 12px 16px 18px",
              sm: "26px 14px 18px 24px",
              md: "44px 20px 28px 44px",
            },
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
              fontSize: { xs: 30, sm: 38, md: 54, lg: 62 },
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

          {/* Thai subtitle — always shown so Thai guests feel welcomed
              regardless of the auto-detected UI locale. */}
          <Box
            sx={{
              fontFamily: fonts.body,
              fontWeight: 400,
              color: BODY,
              lineHeight: 1.5,
              letterSpacing: "0.01em",
              fontSize: { xs: 12.5, sm: 13.5, md: 16 },
              marginTop: { xs: "12px", md: "18px" },
              maxWidth: 340,
            }}
          >
            ความเรียบง่าย ที่ทำให้คุณรู้สึกดีที่สุด
          </Box>
        </Box>

        {/* Right — serene image carousel bleeding to the top-right corner */}
        <Box
          role="img"
          aria-label={SLIDES[idx].alt}
          sx={{
            position: "relative",
            flexShrink: 0,
            width: { xs: "44%", sm: "46%", md: "48%" },
            minHeight: { xs: 220, sm: 250, md: 340 },
            alignSelf: "stretch",
          }}
        >
          {SLIDES.map((s, i) => (
            <Box
              key={s.src}
              aria-hidden="true"
              sx={{
                position: "absolute",
                inset: 0,
                backgroundImage: `url("${s.src}")`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                opacity: i === idx ? 1 : 0,
                transition: reduced ? "none" : "opacity 1.1s ease",
              }}
            />
          ))}
          {/* Left-edge scrim so the photo melts into the ivory ground
              instead of hard-butting the headline column. */}
          <Box
            aria-hidden="true"
            sx={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(100deg, rgba(243,239,232,0.92) 0%, rgba(243,239,232,0.34) 22%, rgba(243,239,232,0) 48%)",
            }}
          />
        </Box>
      </Box>

      {/* ── Lower band: the two CTAs + carousel dots, beneath the split ── */}
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: { xs: "14px", md: "18px" },
          padding: {
            xs: "6px 18px 20px",
            sm: "8px 24px 22px",
            md: "10px 44px 36px",
          },
        }}
      >
        {/* CTA row */}
        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            gap: { xs: "10px", md: "12px" },
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
          <Box component="span" aria-hidden="true" sx={{ fontSize: 15, lineHeight: 1 }}>
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
            background: "transparent",
            color: INK,
            border: `1.5px solid ${INK}`,
            fontFamily: fonts.body,
            fontSize: { xs: 14, md: 15 },
            fontWeight: 600,
            letterSpacing: "0.01em",
            transition: "background 0.16s ease, color 0.16s ease, transform 0.16s ease",
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

        {/* Carousel dots — dark on the ivory ground, centered (mockup's • • •).
            Real control: each dot jumps the image carousel to that slide. */}
        <Box
          role="tablist"
          aria-label="Hero image"
          sx={{ display: "flex", justifyContent: "center", gap: "8px" }}
        >
          {SLIDES.map((s, i) => (
            <Box
              key={s.src}
              component="button"
              type="button"
              role="tab"
              aria-selected={i === idx}
              aria-label={t("home.hero.slide", "View image {{n}}", { n: i + 1 })}
              onClick={() => setIdx(i)}
              sx={{
                all: "unset",
                cursor: "pointer",
                boxSizing: "content-box",
                width: i === idx ? 20 : 7,
                height: 7,
                borderRadius: 999,
                background: i === idx ? INK : "rgba(43, 38, 32, 0.28)",
                transition: "width 0.28s ease, background 0.28s ease",
                // Small visible dot; ~23px invisible tap target around it.
                padding: "8px 4px",
                backgroundClip: "content-box",
                "&:focus-visible": {
                  outline: `2px solid ${INK}`,
                  outlineOffset: 2,
                },
              }}
            />
          ))}
        </Box>
      </Box>
    </Box>
  );
};

export default HomeHero;
