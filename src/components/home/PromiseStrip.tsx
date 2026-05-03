// src/components/home/PromiseStrip.tsx
//
// 🆕 Round 25 (founder 2026-05-02): "Why SunRed" promise strip.
//    Bridges visual gap between Hero and Footer (Round 21 stripped
//    HomePage to TopNav + Hero + Footer; the gap felt abrupt).
//
// Hard rules per founder memory:
//   • ใช้ data จริงเท่านั้น — every claim here is FACTUAL business attribute,
//     not a fabricated metric (no "4.8 stars", no "1,200+ bookings"; those
//     were already stripped in Round 21 with TrustSection).
//   • Mobile-first — designed for the 430px phone shell.
//   • Brand-consistent glass-morphism (matches HeroSection .glass-card).

import React from "react";
import { Box, Typography } from "@mui/material";
import VerifiedRoundedIcon from "@mui/icons-material/VerifiedRounded";
import HotelRoundedIcon from "@mui/icons-material/HotelRounded";
import LanguageRoundedIcon from "@mui/icons-material/LanguageRounded";
import { useTranslation } from "react-i18next";

const SERIF = '"Fraunces", Georgia, "Times New Roman", serif';
const SANS = '"Inter", system-ui, -apple-system, sans-serif';

type Promise = {
  Icon: typeof VerifiedRoundedIcon;
  titleKey: string;
  titleFallback: string;
  subKey: string;
  subFallback: string;
};

const PROMISES: Promise[] = [
  {
    Icon: VerifiedRoundedIcon,
    titleKey: "promise.licensed.title",
    titleFallback: "Licensed",
    subKey: "promise.licensed.sub",
    subFallback: "Ministry-verified",
  },
  {
    Icon: HotelRoundedIcon,
    titleKey: "promise.outcall.title",
    titleFallback: "Outcall",
    subKey: "promise.outcall.sub",
    subFallback: "Your hotel, your hour",
  },
  {
    Icon: LanguageRoundedIcon,
    titleKey: "promise.languages.title",
    titleFallback: "5 Languages",
    subKey: "promise.languages.sub",
    subFallback: "EN · 中 · 日 · 한 · TH",
  },
];

const PromiseStrip: React.FC = () => {
  const { t } = useTranslation();

  return (
    <Box
      component="section"
      aria-label="why sunred"
      sx={{
        position: "relative",
        margin: "20px 14px 8px",
        padding: "20px 14px 18px",
        borderRadius: "22px",
        background:
          "linear-gradient(135deg, rgba(255,255,255,0.55) 0%, rgba(255,234,217,0.5) 100%)",
        backdropFilter: "blur(20px) saturate(180%)",
        WebkitBackdropFilter: "blur(20px) saturate(180%)",
        border: "1px solid rgba(255, 255, 255, 0.6)",
        boxShadow:
          "0 8px 28px rgba(254, 9, 68, 0.06), inset 0 1px 0 rgba(255,255,255,0.7)",
      }}
    >
      {/* divider-label — same eyebrow rhythm as Hero */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "8px",
          marginBottom: "14px",
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
          {t("promise.eyebrow", "Why SunRed")}
        </Box>
      </Box>

      {/* italic serif tagline */}
      <Typography
        sx={{
          fontFamily: SERIF,
          fontStyle: "italic",
          fontWeight: 400,
          fontSize: "16px",
          color: "#2a1a14",
          textAlign: "center",
          marginBottom: "14px",
          lineHeight: 1.3,
          "& em": { color: "#FE0944", fontStyle: "italic" },
        }}
      >
        {t("promise.tagline.lead", "Quiet luxury,")}{" "}
        <em>{t("promise.tagline.tail", "on your schedule.")}</em>
      </Typography>

      {/* 3-tile grid */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "8px",
        }}
      >
        {PROMISES.map(({ Icon, titleKey, titleFallback, subKey, subFallback }) => (
          <Box
            key={titleKey}
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              padding: "12px 6px",
              borderRadius: "16px",
              background: "rgba(255, 255, 255, 0.55)",
              border: "1px solid rgba(255, 255, 255, 0.7)",
              boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.6)",
              transition: "transform 0.25s ease, box-shadow 0.25s ease",
              "&:hover": {
                transform: "translateY(-2px)",
                boxShadow: "0 6px 18px rgba(254, 9, 68, 0.12)",
              },
            }}
          >
            {/* icon disc */}
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: "linear-gradient(135deg, #FE0944 0%, #FE7A52 100%)",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "6px",
                boxShadow: "0 4px 12px rgba(254, 9, 68, 0.25)",
              }}
            >
              <Icon sx={{ fontSize: 20 }} />
            </Box>
            <Typography
              sx={{
                fontFamily: SANS,
                fontSize: "11px",
                fontWeight: 700,
                color: "#2a1a14",
                lineHeight: 1.2,
                textAlign: "center",
                marginBottom: "2px",
              }}
            >
              {t(titleKey, titleFallback)}
            </Typography>
            <Typography
              sx={{
                fontFamily: SANS,
                fontSize: "9.5px",
                color: "rgba(60, 30, 20, 0.6)",
                lineHeight: 1.25,
                textAlign: "center",
                fontWeight: 500,
              }}
            >
              {t(subKey, subFallback)}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

export default PromiseStrip;
