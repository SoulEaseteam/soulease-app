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
          display: "block",
          width: "100%",
          borderRadius: "20px",
          overflow: "hidden",
          cursor: "pointer",
          outline: "none",
          boxShadow: "0 14px 36px -16px rgba(138,58,87,0.55)",
          transition: "transform .18s ease, box-shadow .18s ease",
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
      </Box>
      <AnniversaryDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
};

export default AnniversaryBanner;
