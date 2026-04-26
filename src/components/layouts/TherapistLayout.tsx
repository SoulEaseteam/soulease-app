// src/components/layouts/TherapistLayout.tsx
import React from "react";
import { Outlet } from "react-router-dom";
import { Box } from "@mui/material";
import BottomNavGlass from "@/components/layouts/BottomNavGlass";

const TherapistLayout: React.FC = () => {
  return (
    <Box sx={{ minHeight: "100vh", pb: 10 }}>
      <Outlet />
      <BottomNavGlass />
    </Box>
  );
};

export default TherapistLayout;
