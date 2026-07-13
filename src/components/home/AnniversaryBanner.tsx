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

import React from "react";
import { Box, Typography } from "@mui/material";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

const SERIF = '"Playfair Display", "Fraunces", Georgia, serif';
const SANS = '"Inter", system-ui, sans-serif';
const BERRY = "linear-gradient(135deg, #C2568A 0%, #8A3A57 55%, #6E2A46 100%)";

interface Props {
  variant?: "home" | "pricing";
}

const AnniversaryBanner: React.FC<Props> = ({ variant = "home" }) => {
  const navigate = useNavigate();
  const clickable = variant === "home";

  return (
    <Box
      component={motion.div}
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      onClick={clickable ? () => navigate("/pricing") : undefined}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={
        clickable
          ? (e: React.KeyboardEvent) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                navigate("/pricing");
              }
            }
          : undefined
      }
      aria-label={
        clickable ? "SunRed 1st Anniversary — view pricing" : undefined
      }
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
            {clickable
              ? "ฉลองครบรอบ 1 ปี · ราคาใหม่ทุกเมนู — แตะดูราคา"
              : "ฉลองครบรอบ 1 ปี · ขอบคุณที่ไว้วางใจ SunRed"}
          </Typography>
        </Box>

        {clickable && (
          <Box
            aria-hidden
            sx={{
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 34,
              height: 34,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.16)",
              border: "1px solid rgba(255,255,255,0.28)",
              color: "#fff",
              fontSize: 17,
              fontWeight: 700,
            }}
          >
            →
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default AnniversaryBanner;
