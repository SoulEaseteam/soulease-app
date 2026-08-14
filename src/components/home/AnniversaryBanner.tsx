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
import { anniversaryIsLive } from "@/config/anniversary";
import { useAnniversaryConfigVersion } from "@/hooks/useAnniversaryConfigVersion";

const BANNER_IMG = "/images/anniversary/banner.jpg";

interface Props {
  variant?: "home" | "pricing";
}

const AnniversaryBanner: React.FC<Props> = ({ variant = "home" }) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  // 2026-08-14 — this component used to render UNCONDITIONALLY: it never
  // consulted anniversaryIsLive(), so the banner would have outlived its own
  // endISO forever, and the founder's "end it now" (anniversary.enabled=false)
  // had nothing to switch off. The version subscription makes the gate live —
  // MaintenanceGate's snapshot pulls the banner off already-open screens
  // without a reload.
  useAnniversaryConfigVersion();
  void variant;

  if (!anniversaryIsLive()) return null;

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
          // 🆕 28x.18 (founder: "ยังมีเรืองแสงสีแดงๆ อยู่ เอาออก แล้วให้การ์ด
          //   แวววาว วิบวับ") — removed the berry/red glow (was a coloured
          //   box-shadow) for a NEUTRAL theme shadow, and brought back the
          //   glossy shimmer sweep + twinkling sparkles below. The periodic
          //   scale bounce stays. Paused for reduced-motion users.
          animation: "sunredAnnivPop 4.6s ease-in-out infinite",
          boxShadow: "var(--sr-card-shadow)",
          "@keyframes sunredAnnivPop": {
            "0%, 82%, 100%": { transform: "scale(1)" },
            "88%": { transform: "scale(1.03)" },
            "94%": { transform: "scale(0.994)" },
          },
          "@media (prefers-reduced-motion: reduce)": {
            animation: "none",
          },
          "&:hover": {
            transform: "translateY(-2px)",
            boxShadow: "var(--sr-card-shadow)",
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

        {/* 🆕 28x.18 — diagonal shimmer sweep for a glossy "แวววาว" glint.
            Over the image, pointer-events none so taps still open the dialog. */}
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
              "linear-gradient(100deg, transparent, rgba(255,255,255,0.45), transparent)",
            pointerEvents: "none",
            mixBlendMode: "screen",
          }}
        />

        {/* twinkling sparkles ("วิบวับ") */}
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
