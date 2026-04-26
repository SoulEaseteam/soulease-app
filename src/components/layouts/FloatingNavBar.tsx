// src/components/nav/FloatingNavBar.tsx
import React from "react";
import { Box, Typography } from "@mui/material";

const FloatingNavBar: React.FC = () => {
  return (
    <Box
      sx={{
        position: "sticky",
        top: 12,
        zIndex: 999,
        display: "flex",
        justifyContent: "center",
        pointerEvents: "none",
      }}
    >
      <Box
        sx={{
          width: "92%",
          maxWidth: 430,
          height: 70,
          borderRadius: 6,
          background: "linear-gradient(to bottom, #FE0944, #FEAE96)",
          backdropFilter: "blur(16px)",
          boxShadow: "0 8px 28px rgba(0,0,0,0.2)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          pointerEvents: "auto",
          animation: "floatIn 0.6s ease",
        }}
      >
        <Typography
          fontFamily="Chonburi"
          letterSpacing={7}
          sx={{
            fontSize: 24,
            color: "#fff",
            textShadow: "0 2px 6px rgba(255,255,255,0.2)",
            userSelect: "none",
          }}
        >
          SunRed
        </Typography>
      </Box>

      <style>
        {`
        @keyframes floatIn {
          from { opacity: 0; transform: translateY(-10px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}
      </style>
    </Box>
  );
};

export default FloatingNavBar;