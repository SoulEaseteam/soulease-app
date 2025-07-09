// src/pages/NotFoundPage.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Button, Paper } from '@mui/material';
import SentimentVeryDissatisfiedIcon from '@mui/icons-material/SentimentVeryDissatisfied';

const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(to bottom, #dceeff, #ffffff)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        px: 2,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* 🌸 Floating Symbols */}
      {Array.from({ length: 16 }).map((_, i) => (
        <Box
          key={i}
          sx={{
            position: 'absolute',
            top: `${Math.random() * 100}%`,
            left: `${Math.random() * 100}%`,
            fontSize: `${16 + Math.random() * 16}px`,
            animation: `float ${4 + Math.random() * 3}s ease-in-out infinite`,
            opacity: 0.4,
            pointerEvents: 'none',
            zIndex: 0,
          }}
        >
          💫
        </Box>
      ))}

      <Paper
        elevation={4}
        sx={{
          p: { xs: 3, sm: 5 },
          borderRadius: 6,
          textAlign: 'center',
          backdropFilter: 'blur(14px)',
          backgroundColor: 'rgba(255,255,255,0.75)',
          boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
          width: '100%',
          maxWidth: 420,
          zIndex: 2,
        }}
      >
        <SentimentVeryDissatisfiedIcon
          sx={{ fontSize: { xs: 60, sm: 80 }, color: '#3f5066', mb: 1 }}
        />
        <Typography variant="h3" fontWeight="bold" color="primary" gutterBottom>
          404
        </Typography>
        <Typography variant="h6" gutterBottom>
          Page Not Found
        </Typography>
        <Typography variant="body2" sx={{ color: '#666', mt: 1, mb: 2 }}>
          The page you are looking for might have been removed or does not exist.
        </Typography>

        <Button
          onClick={() => navigate('/')}
          fullWidth
          sx={{
            background: 'linear-gradient(to right, #4f87e3, #70c9ff)',
            py: 1.4,
            fontSize: 16,
            fontWeight: 'bold',
            borderRadius: 99,
            color: '#fff',
            boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
            transition: 'all 0.3s ease',
            '&:hover': {
              transform: 'scale(1.05)',
              background: 'linear-gradient(to right, #70c9ff, #4f87e3)',
            },
          }}
        >
          Back to Home
        </Button>
      </Paper>

      <style>
        {`
          @keyframes float {
            0% { transform: translateY(0) rotate(0deg); opacity: 0.4; }
            50% { transform: translateY(-12px) rotate(4deg); opacity: 0.8; }
            100% { transform: translateY(0) rotate(0deg); opacity: 0.4; }
          }
        `}
      </style>
    </Box>
  );
};

export default NotFoundPage;