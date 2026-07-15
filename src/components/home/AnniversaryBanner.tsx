// src/components/home/AnniversaryBanner.tsx
//
// 🆕 Round 28x.11 (founder: "เอาไปแทนการ์ด นอกและใน") — the home
//   anniversary banner is now the founder-designed wide image
//   (public/images/anniversary/banner.jpg) instead of the CSS
//   berry-gradient card. The whole image is the button: tapping it
//   opens the reward dialog (AnniversaryDialog), same as before.
//
//   ⚠️ Text now lives INSIDE the image (English + the 15 Jul–15 Aug
//   window are baked in), so it no longer re-translates per locale.
//   The clickable wrapper keeps its aria-label for screen readers.
//
// Previous CSS-card implementation (gradient + shimmer + per-locale
// copy) is in git history (≤ 28x.10) if we ever want it back.

import React, { useState } from "react";
import { Box } from "@mui/material";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import AnniversaryDialog from "./AnniversaryDialog";

const BANNER_IMG = "/images/anniversary/banner.jpg";

interface Props {
  variant?: "home" | "pricing";
}

const AnniversaryBanner: React.FC<Props> = ({ variant = "home" }) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  void variant;

  return (
    <>
      <Box
        component={motion.div}
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.4 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        onClick={() => setOpen(true)}
        role="button"
        tabIndex={0}
        onKeyDown={(e: React.KeyboardEvent) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpen(true);
          }
        }}
        aria-label={t(
          "home.anniversary.aria",
          "SunRed 1st Anniversary — view your reward",
        )}
        sx={{
          position: "relative",
          display: "block",
          width: "100%",
          borderRadius: "20px",
          overflow: "hidden",
          cursor: "pointer",
          outline: "none",
          // 🆕 28x.15 (founder: "ทำให้การ์ดวิบวับด้วย และเด้งให้ลูกค้าสังเกตุ")
          //   — a periodic attention "pop": a gentle scale bounce + a magenta
          //   glow pulse every few seconds so the banner catches the eye
          //   without being annoying. Paused for reduced-motion users.
          animation: "sunredAnnivPop 4.6s ease-in-out infinite",
          boxShadow: "0 14px 36px -16px rgba(138,58,87,0.55)",
          "@keyframes sunredAnnivPop": {
            "0%, 82%, 100%": {
              transform: "scale(1)",
              boxShadow: "0 14px 36px -16px rgba(138,58,87,0.5)",
            },
            "88%": {
              transform: "scale(1.025)",
              boxShadow: "0 20px 46px -12px rgba(230,25,126,0.6)",
            },
            "94%": { transform: "scale(0.994)" },
          },
          "@media (prefers-reduced-motion: reduce)": {
            animation: "none",
          },
          "&:hover": {
            transform: "translateY(-2px)",
            boxShadow: "0 20px 44px -16px rgba(138,58,87,0.72)",
          },
          "&:focus-visible": {
            boxShadow: "0 0 0 3px rgba(217,124,149,0.55)",
          },
        }}
      >
        <Box
          component="img"
          src={BANNER_IMG}
          alt={t(
            "home.anniversary.tapReward",
            "SunRed 1st Anniversary · Tap to claim your Anniversary reward",
          )}
          loading="lazy"
          decoding="async"
          sx={{ display: "block", width: "100%", height: "auto" }}
        />

        {/* 🆕 28x.15 — diagonal shimmer sweep for a glossy, "วิบวับ" card feel.
            Sits over the image; pointer-events none so taps still open the
            dialog. Repeats with a pause so it reads as an occasional glint. */}
        <Box
          component={motion.div}
          aria-hidden
          initial={{ x: "-140%" }}
          animate={{ x: "140%" }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            repeatDelay: 3.1,
            ease: "easeInOut",
          }}
          sx={{
            position: "absolute",
            top: 0,
            bottom: 0,
            width: "42%",
            transform: "skewX(-14deg)",
            background:
              "linear-gradient(100deg, transparent, rgba(255,255,255,0.42), transparent)",
            pointerEvents: "none",
            mixBlendMode: "screen",
          }}
        />

        {/* faint twinkling sparkles */}
        {[
          { t: "14%", l: "24%", s: 4, d: 0 },
          { t: "70%", l: "16%", s: 3, d: 0.6 },
          { t: "30%", l: "52%", s: 3.5, d: 1.1 },
          { t: "58%", l: "60%", s: 3, d: 0.3 },
        ].map((d, i) => (
          <Box
            key={i}
            component={motion.span}
            aria-hidden
            animate={{ opacity: [0, 1, 0], scale: [0.6, 1, 0.6] }}
            transition={{
              duration: 1.8,
              repeat: Infinity,
              repeatDelay: 1.6,
              delay: d.d,
              ease: "easeInOut",
            }}
            sx={{
              position: "absolute",
              top: d.t,
              left: d.l,
              width: d.s,
              height: d.s,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.95)",
              boxShadow: "0 0 6px rgba(255,255,255,0.85)",
              pointerEvents: "none",
            }}
          />
        ))}
      </Box>
      <AnniversaryDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
};

export default AnniversaryBanner;
