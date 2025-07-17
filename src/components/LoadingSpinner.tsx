import React from 'react';
import { CircularProgress, Box, Typography } from '@mui/material';

const flowerCount = 20;
const getFlowers = () =>
  Array.from({ length: flowerCount }).map((_, i) => {
    // แยก Math.random มาคำนวณก่อน เพื่อไม่ให้ rerender แล้วตำแหน่งเปลี่ยน
    const top = Math.random() * 100;
    const left = Math.random() * 100;
    const duration = 5 + Math.random() * 5;
    const delay = Math.random() * 3;
    const fontSize = 16 + Math.random() * 20;
    const opacity = 0.3 + Math.random() * 0.7;
    return { top, left, duration, delay, fontSize, opacity, key: i };
  });

const flowerData = getFlowers();

const LoadingSpinner: React.FC = () => {
  return (
    <>
      <Box
        sx={{
          minHeight: '100vh',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          background: 'linear-gradient(to bottom right, #fff0f5, #f9f4ff)',
          overflow: 'hidden',
          fontFamily: 'Trebuchet MS, sans-serif',
        }}
      >
        {/* 🌸 Floating flowers */}
        {flowerData.map((f) => (
          <Box
            key={f.key}
            sx={{
              position: 'absolute',
              top: `${f.top}%`,
              left: `${f.left}%`,
              animation: `float ${f.duration}s ease-in-out infinite`,
              animationDelay: `${f.delay}s`,
              fontSize: `${f.fontSize}px`,
              opacity: f.opacity,
              transform: 'translateY(0px)',
              pointerEvents: 'none',
              zIndex: 1,
              userSelect: 'none',
            }}
          >
            🌸
          </Box>
        ))}

        {/* Spinner with glow */}
        <Box
          sx={{
            animation: 'spin 1.5s linear infinite',
            mb: 2,
            zIndex: 10,
            filter: 'drop-shadow(0 0 12px rgba(233,30,99,0.6))',
          }}
        >
          <CircularProgress size={66} thickness={5} sx={{ color: '#e91e63' }} />
        </Box>

        <Typography
          sx={{
            color: '#7a7a7a',
            fontSize: 18,
            fontWeight: 600,
            letterSpacing: 1,
            zIndex: 10,
            fontFamily: 'Trebuchet MS, sans-serif',
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
            0%   { transform: translateY(0px) rotate(0deg); opacity: 0.6; }
            50%  { transform: translateY(-20px) rotate(8deg); opacity: 1; }
            100% { transform: translateY(0px) rotate(0deg); opacity: 0.6; }
          }
        `}
      </style>
    </>
  );
};

export default LoadingSpinner;