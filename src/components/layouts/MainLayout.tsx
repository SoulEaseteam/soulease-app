// src/components/layouts/MainLayout.tsx
import React from "react";
import { Outlet } from "react-router-dom";
import { Box } from "@mui/material";
import BottomNavGlass from "@/components/layouts/BottomNavGlass";

/**
 * 🌅 Aurora pastel background — ทุกหน้า public inherit ผ่าน MainLayout
 * (peach → pink → lavender → mint, very soft tint)
 */
const MainLayout: React.FC = () => {
  return (
    <Box
      sx={{
        minHeight: "100vh",
        pb: "90px",
        background:
          "linear-gradient(180deg, #FFF8F4 0%, #FFF1F6 28%, #FAF0FF 56%, #F0FAF4 100%)",
        // subtle aurora glow on top — adds depth without being distracting
        position: "relative",
        "&::before": {
          content: '""',
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          background:
            "radial-gradient(ellipse 80% 40% at 50% 0%, rgba(255, 214, 232, 0.25) 0%, transparent 60%)",
          zIndex: 0,
        },
        "& > *": { position: "relative", zIndex: 1 },
      }}
    >
      <Outlet />
      <BottomNavGlass />
    </Box>
  );
};

export default MainLayout;