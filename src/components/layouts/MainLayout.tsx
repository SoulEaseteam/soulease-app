// src/components/layouts/MainLayout.tsx
import React from "react";
import { Outlet } from "react-router-dom";
import { Box } from "@mui/material";
import BottomNavGlass from "@/components/layouts/BottomNavGlass";

/**
 * 🎨 Page surface — Phase 1 redesign defers all styling to the MUI theme's
 * `MuiCssBaseline` body override (warm-cream gradient `#FFF8F0 → #FCEBDC`
 * from BRAND.md). MainLayout used to set its own "Aurora pastel" bg which
 * conflicted with the mockup's surface. Other routes (Booking, Login,
 * Therapist Detail, etc.) inherit the same warm-cream surface until each
 * is individually redesigned in its own ROADMAP.md task.
 */
const MainLayout: React.FC = () => {
  return (
    <Box
      sx={{
        minHeight: "100vh",
        pb: "90px",
        position: "relative",
      }}
    >
      <Outlet />
      <BottomNavGlass />
    </Box>
  );
};

export default MainLayout;