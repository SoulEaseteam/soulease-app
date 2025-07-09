import React from 'react';
import { Box, Typography } from '@mui/material';

const NavBar: React.FC = () => {
  return (
    <>
      {/* เลเยอร์หลัง: Gradient หรูหรา */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 80,
          background: 'linear-gradient(to right, #2b3b53, #3e506b)',
          zIndex: 0,
        }}
      />

      {/* เลเยอร์หน้า: เบลอ + โปร่งใส + เงา */}
      <Box
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 1000,
          height: 80,
          backgroundColor: 'rgba(0, 0, 0, 0.25)',
          backdropFilter: 'blur(12px)',
          boxShadow: '0 6px 16px rgba(0, 0, 0, 0.25)',
          fontFamily: 'Orson, sans-serif',
          animation: 'fadeInNav 0.8s ease-out',
        }}
      >
        <Box
          sx={{
            maxWidth: 430,
            height: '100%',
            mx: 'auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Typography
            variant="h6"
            fontWeight="bold"
            letterSpacing={6}
            sx={{
              fontSize: 26,
              color: '#fff',
              textShadow: '0 2px 6px rgba(255,255,255,0.2)',
              fontFamily: 'Orson, sans-serif',
              userSelect: 'none',
            }}
          >
            SoulEase
          </Typography>
        </Box>
      </Box>

      {/* Keyframe animation */}
      <style>
        {`
          @keyframes fadeInNav {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}
      </style>
    </>
  );
};

export default NavBar;