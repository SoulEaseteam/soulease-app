import React, { useMemo } from "react";
import { CircularProgress, Box, Typography } from "@mui/material";

const FLOWER_COUNT = 22;

// สร้างตำแหน่งดอกไม้แบบคงที่ ไม่เปลี่ยนเมื่อ re-render
const generateFlowerData = () =>
  Array.from({ length: FLOWER_COUNT }).map((_, i) => {
    const top = Math.random() * 100;
    const left = Math.random() * 100;
    const duration = 4 + Math.random() * 6;
    const delay = Math.random() * 3;
    const size = 18 + Math.random() * 24;
    const opacity = 0.35 + Math.random() * 0.55;

    return { key: i, top, left, duration, delay, size, opacity };
  });

const LoadingSpinner: React.FC = () => {
  const flowerData = useMemo(() => generateFlowerData(), []);

  return (
    <>
      <Box
        sx={{
          minHeight: "100vh",
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          background: "#F4F6F5",
          overflow: "hidden",
          fontFamily: "Trebuchet MS, sans-serif",
        }}
      >
        {/* 🌸 Floating flowers */}
        {flowerData.map((f) => (
          <Box
            key={f.key}
            sx={{
              position: "absolute",
              top: `${f.top}%`,
              left: `${f.left}%`,
              animation: `float ${f.duration}s ease-in-out infinite`,
              animationDelay: `${f.delay}s`,
              fontSize: `${f.size}px`,
              opacity: f.opacity,
              transform: "translateY(0)",
              pointerEvents: "none",
              userSelect: "none",
              filter: "drop-shadow(0px 0px 8px rgba(255,128,170,0.4))",
            }}
          >
            🌸
          </Box>
        ))}

        {/* ⭐ Glow Spinner */}
        <Box
          sx={{
            position: "relative",
            mb: 3,
            zIndex: 10,
            animation: "spin 1.5s linear infinite",
          }}
        >
          {/* Light glow */}
          <Box
            sx={{
              position: "absolute",
              top: "-10px",
              left: "-10px",
              width: "86px",
              height: "86px",
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(255,200,225,0.55), transparent)",
              filter: "blur(10px)",
              zIndex: -1,
            }}
          />

          <CircularProgress
            size={66}
            thickness={5}
            sx={{
              color: "#e91e63",
              filter: "drop-shadow(0 0 10px rgba(233,30,99,0.6))",
            }}
          />
        </Box>

        {/* Text */}
        <Typography
          sx={{
            color: "#7a7a7a",
            fontSize: 18,
            fontWeight: 600,
            letterSpacing: 1,
            zIndex: 10,
            textShadow: "0px 1px 2px rgba(255,255,255,0.7)",
          }}
        >
          ☁️ Please wait a moment...
        </Typography>
      </Box>

      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }

          @keyframes float {
            0% { transform: translateY(0px) rotate(0deg); opacity: 0.7; }
            50% { transform: translateY(-18px) rotate(6deg); opacity: 1; }
            100% { transform: translateY(0px) rotate(0deg); opacity: 0.7; }
          }
        `}
      </style>
    </>
  );
};

export default LoadingSpinner;