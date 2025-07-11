import React from 'react';
import { Box, Typography } from '@mui/material';

const NavBar: React.FC = () => {
  return (
    <>
      <Box
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 1000,
          height: 80,
          width: '100%',
          minWidth: 0,
          background: 'linear-gradient(to right, #2b3b53, #3e506b)',
          boxShadow: '0 6px 16px rgba(0, 0, 0, 0.25)',
          fontFamily: 'Orson, sans-serif',
          animation: 'fadeInNav 0.8s ease-out',
          '&:after': {
            // glass layer
            content: '""',
            display: 'block',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 80,
            background: 'rgba(0,0,0,0.17)',
            backdropFilter: 'blur(12px)',
            zIndex: 1,
          },
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
            position: 'relative',
            zIndex: 2,
          }}
        >
          <Typography
            variant="h6"
            fontWeight="bold"
            letterSpacing={6}
            sx={{
              fontSize: { xs: 20, sm: 26 },
              color: '#fff',
              textShadow: '0 2px 6px rgba(255,255,255,0.2)',
              fontFamily: 'Orson, sans-serif',
              userSelect: 'none',
              zIndex: 2,
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