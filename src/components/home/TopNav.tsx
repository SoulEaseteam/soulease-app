// src/components/home/TopNav.tsx
//
// 🎨 Phase 1 Home — TopNav (pixel-perfect port of `.nav` in sunred-home1.html).
// Menu button (left) · brand wordmark (center) · language pill (right).
// Sits above HeroSection in the 430px phone column.

import React from "react";
import { Box, Typography, IconButton } from "@mui/material";
import { useTranslation } from "react-i18next";
import MenuRoundedIcon from "@mui/icons-material/MenuRounded";

const SERIF = '"Fraunces", Georgia, "Times New Roman", serif';

const TopNav: React.FC = () => {
  const { t, i18n } = useTranslation();

  const langCode = (i18n.language || "en").slice(0, 2).toLowerCase();
  const flagMap: Record<string, { flag: string; label: string }> = {
    en: { flag: "🇬🇧", label: "EN" },
    th: { flag: "🇹🇭", label: "TH" },
    zh: { flag: "🇨🇳", label: "中" },
    ja: { flag: "🇯🇵", label: "日" },
    ko: { flag: "🇰🇷", label: "한" },
  };
  const cur = flagMap[langCode] ?? flagMap.en;

  return (
    <Box
      component="nav"
      sx={{
        // verbatim from .nav
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "8px 18px 14px",
        position: "relative",
        zIndex: 10,
      }}
    >
      {/* .menu-btn — verbatim */}
      <IconButton
        aria-label="open menu"
        sx={{
          width: "40px",
          height: "40px",
          borderRadius: "50%",
          background: "rgba(255, 255, 255, 0.55)",
          backdropFilter: "blur(20px) saturate(180%)",
          WebkitBackdropFilter: "blur(20px) saturate(180%)",
          border: "1px solid rgba(255, 255, 255, 0.7)",
          boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.6)",
          color: "#2a1a14",
          fontSize: "16px",
        }}
      >
        <MenuRoundedIcon sx={{ fontSize: 20 }} />
      </IconButton>

      {/* .brand — verbatim */}
      <Typography
        component="div"
        sx={{
          fontFamily: SERIF,
          fontStyle: "italic",
          fontWeight: 500,
          fontSize: "22px",
          background: "linear-gradient(90deg, #FE0944, #FE7A52)",
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          WebkitTextFillColor: "transparent",
          letterSpacing: "-0.01em",
        }}
      >
        {t("hero.brand", "SunRed")}
      </Typography>

      {/* .lang-btn — verbatim */}
      <Box
        component="button"
        type="button"
        aria-label="language"
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "4px",
          height: "40px",
          padding: "0 14px",
          borderRadius: "99px",
          background: "rgba(255, 255, 255, 0.55)",
          backdropFilter: "blur(20px) saturate(180%)",
          WebkitBackdropFilter: "blur(20px) saturate(180%)",
          border: "1px solid rgba(255, 255, 255, 0.7)",
          boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.6)",
          color: "#2a1a14",
          fontSize: "11px",
          fontWeight: 700,
          letterSpacing: "0.05em",
          cursor: "pointer",
          fontFamily: '"Inter", sans-serif',
        }}
      >
        <Box component="span" sx={{ fontSize: "14px" }}>
          {cur.flag}
        </Box>
        {cur.label}
      </Box>
    </Box>
  );
};

export default TopNav;
