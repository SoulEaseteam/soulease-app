// src/components/home/AnniversaryBanner.tsx
//
// 🆕 Round 28w.37 (founder 2026-07-14 "ขึ้นป้าย 🎉 SUNRED 1st ANNIVERSARY
//   … ทำ ป้าย ติด pricing หน้าโฮม สวยๆ") — celebratory 1st-anniversary
//   banner. Two variants:
//     • variant="home"    — compact, clickable → /pricing (home page)
//     • variant="pricing" — static thank-you note (pricing hero)
//   Rose-berry gradient with a soft sheen + a slow shimmer sweep; works on
//   both day and night themes (it's a self-lit colored band). The 🎉 emoji
//   is an explicit founder request (overrides the general no-emoji rule).

import React, { useState } from "react";
import { Box, Typography } from "@mui/material";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import AnniversaryDialog from "./AnniversaryDialog";
import { anniversaryPeriodLabel } from "@/config/anniversary";

const SERIF = '"Playfair Display", "Fraunces", Georgia, serif';
const SANS = '"Inter", system-ui, sans-serif';
const BERRY = "linear-gradient(135deg, #C2568A 0%, #8A3A57 55%, #6E2A46 100%)";

interface Props {
  variant?: "home" | "pricing";
}

const AnniversaryBanner: React.FC<Props> = ({ variant = "home" }) => {
  const { t, i18n } = useTranslation();
  // 🆕 Round 28w.88 (founder: "กดบัตรนี้ แล้วขึ้นป๊อปอับ") — tapping the banner
  //   opens the reward dialog instead of navigating to /pricing.
  //   Note `clickable` used to be `variant === "home"`, so on the PRICING page —
  //   the very page the founder tapped it on — the banner was inert. It is now
  //   clickable on both surfaces.
  const [open, setOpen] = useState(false);
  const period = anniversaryPeriodLabel(i18n.language);
  const clickable = true;
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
      aria-label={t("home.anniversary.aria", "SunRed 1st Anniversary — view your reward")}
      sx={{
        position: "relative",
        overflow: "hidden",
        borderRadius: "20px",
        background: BERRY,
        border: "1px solid rgba(255,255,255,0.16)",
        boxShadow: "0 14px 36px -16px rgba(138,58,87,0.65)",
        px: { xs: 2.25, md: 3.25 },
        py: { xs: 2.1, md: 2.6 },
        cursor: clickable ? "pointer" : "default",
        outline: "none",
        transition: "transform .18s ease, box-shadow .18s ease",
        ...(clickable && {
          "&:hover": {
            transform: "translateY(-2px)",
            boxShadow: "0 20px 44px -16px rgba(138,58,87,0.75)",
          },
          "&:focus-visible": {
            boxShadow: "0 0 0 3px rgba(217,124,149,0.55)",
          },
        }),
      }}
    >
      {/* soft top-left sheen for depth */}
      <Box
        aria-hidden
        sx={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(130% 130% at 10% -20%, rgba(255,255,255,0.24), transparent 46%)",
          pointerEvents: "none",
        }}
      />
      {/* slow shimmer sweep */}
      <Box
        component={motion.div}
        aria-hidden
        initial={{ x: "-130%" }}
        animate={{ x: "130%" }}
        transition={{
          duration: 3.6,
          repeat: Infinity,
          repeatDelay: 2.8,
          ease: "easeInOut",
        }}
        sx={{
          position: "absolute",
          top: 0,
          bottom: 0,
          width: "40%",
          background:
            "linear-gradient(105deg, transparent, rgba(255,255,255,0.20), transparent)",
          pointerEvents: "none",
        }}
      />
      {/* faint sparkle dots */}
      {[
        { t: "16%", l: "62%", s: 3 },
        { t: "68%", l: "78%", s: 2 },
        { t: "34%", l: "90%", s: 2.5 },
      ].map((d, i) => (
        <Box
          key={i}
          aria-hidden
          sx={{
            position: "absolute",
            top: d.t,
            left: d.l,
            width: d.s,
            height: d.s,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.75)",
            boxShadow: "0 0 6px rgba(255,255,255,0.6)",
            pointerEvents: "none",
          }}
        />
      ))}

      {/* content */}
      <Box
        sx={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          gap: { xs: 1.6, md: 2.2 },
        }}
      >
        <Box
          aria-hidden
          sx={{
            fontSize: { xs: 30, md: 36 },
            lineHeight: 1,
            flexShrink: 0,
            filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.28))",
          }}
        >
          🎉
        </Box>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            sx={{
              fontFamily: SANS,
              fontSize: { xs: 9.5, md: 10.5 },
              fontWeight: 800,
              letterSpacing: "0.24em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.72)",
              mb: 0.4,
            }}
          >
            Celebrating One Year
          </Typography>
          <Typography
            sx={{
              fontFamily: SERIF,
              fontSize: { xs: 21, md: 26 },
              fontWeight: 700,
              color: "#fff",
              letterSpacing: "-0.01em",
              lineHeight: 1.05,
            }}
          >
            SunRed 1
            <Box
              component="span"
              sx={{ fontSize: "0.6em", verticalAlign: "super", fontWeight: 600 }}
            >
              st
            </Box>{" "}
            Anniversary
          </Typography>
          <Typography
            sx={{
              fontFamily: SANS,
              fontSize: { xs: 12, md: 12.5 },
              color: "rgba(255,255,255,0.84)",
              mt: 0.55,
              lineHeight: 1.4,
            }}
          >
            {/* 🆕 28w.88 — the banner no longer goes to /pricing, so it must not
                promise that. It opens the reward dialog. */}
            {t("home.anniversary.tapReward", "Thank you for a wonderful first year · Tap to claim your Anniversary reward")}
          </Typography>
          {/* 🆕 28w.90 (founder: "ตั้งแต่ 15 กค - 15 สค 69" · "ทำเป็นข้อความ
              แสดงรายละเอียด") — the campaign window, spelled out on the banner
              like the reference card. Rendered in the guest's own locale, so a
              Thai guest reads 2569 and a Japanese guest reads Japanese months —
              hardcoding "15 ก.ค. – 15 ส.ค. 69" would have been Thai-only on a
              site that auto-translates. */}
          {period && (
            <Typography
              sx={{
                fontFamily: SANS,
                fontSize: { xs: 11, md: 11.5 },
                color: "rgba(255,255,255,0.72)",
                mt: 0.4,
                letterSpacing: "0.02em",
              }}
            >
              {period}
            </Typography>
          )}
        </Box>

        {/* 🆕 28w.90 (founder: "ตรงปุ่มให้เปลี่ยนเป็น ใส่เป็นคำว่ารับสิทธิ์") — was a
            bare "→" glyph, which told the guest nothing about what tapping does.
            Now a labelled pill. It is decorative (aria-hidden): the whole banner
            is already the button, so exposing a second control here would make
            screen readers announce two. */}
        <Box
          aria-hidden
          sx={{
            flexShrink: 0,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px",
            px: { xs: 1.6, md: 2 },
            py: { xs: 0.75, md: 0.9 },
            borderRadius: 999,
            background: "rgba(255,255,255,0.94)",
            color: "#8A3A57",
            fontFamily: SANS,
            fontSize: { xs: 12, md: 12.5 },
            fontWeight: 800,
            letterSpacing: "0.01em",
            whiteSpace: "nowrap",
            boxShadow: "0 4px 14px rgba(0,0,0,0.18)",
          }}
        >
          {t("home.anniversary.cta", "Claim reward")}
        </Box>
      </Box>
    </Box>
    <AnniversaryDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
};

export default AnniversaryBanner;
