// src/components/layouts/MainLayout.tsx
import React from "react";
import { Outlet } from "react-router-dom";
import { Box } from "@mui/material";
import BottomNavGlass from "@/components/layouts/BottomNavGlass";

const MainLayout: React.FC = () => {
  return (
    <Box
      sx={{
        minHeight: "100vh",
        pb: "90px",
        backgroundColor: "#fdfdfd",
      }}
    >
      <Outlet />
      <BottomNavGlass />
    </Box>
  );
};

export default MainLayout;