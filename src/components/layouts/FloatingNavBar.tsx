// src/components/layouts/FloatingNavBar.tsx
import React from "react";
import { Box, Typography } from "@mui/material";

/**
 * 🌅 Aurora-themed floating nav bar
 * peach → pink → lavender gradient, glass blur, subtle entrance
 */
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
          // 🌅 Aurora pastel gradient — peach → pink → lavender
          background:
            "linear-gradient(135deg, #FFD6A5 0%, #FFD6E8 35%, #E5D0FF 70%, #C4B5FD 100%)",
          backdropFilter: "blur(16px)",
          border: "1px solid rgba(255, 255, 255, 0.55)",
          boxShadow:
            "0 8px 28px rgba(225, 29, 72, 0.12), 0 4px 12px rgba(99, 102, 241, 0.10)",
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
            // gradient text on the brand wordmark
            background:
              "linear-gradient(90deg, #B91C9F 0%, #6366F1 50%, #1D9E75 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            textShadow: "0 1px 0 rgba(255, 255, 255, 0.6)",
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