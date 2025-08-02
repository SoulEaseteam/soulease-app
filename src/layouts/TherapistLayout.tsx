import React from "react";
import { Outlet } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import { Box } from "@mui/material";

const TherapistLayout: React.FC = () => {
  return (
    <Box sx={{ bgcolor: "#f6f8fa", minHeight: "100vh", pb: 7 }}>
      <Outlet />
      <BottomNav />
    </Box>
  );
};

export default TherapistLayout;