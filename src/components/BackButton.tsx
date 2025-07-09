// src/components/BackButton.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { IconButton, Box, useTheme } from '@mui/material';
import { ArrowLeft } from 'phosphor-react';

interface BackButtonProps {
  fixed?: boolean;
}

const BackButton: React.FC<BackButtonProps> = ({ fixed = true }) => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  return (
    <Box
  sx={{
    ...(fixed && {
      position: 'fixed',
      top: 16,
      left: 16,
      zIndex: 2000,
    }),
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 48,
    height: 48,
    borderRadius: '50%',
    backdropFilter: 'blur(10px)',
    backgroundColor: isDark
      ? 'rgba(30, 30, 40, 0.5)'
      : 'rgba(255, 255, 255, 0.6)',
    border: isDark
      ? '1px solid rgba(255, 255, 255, 0.2)'
      : '1px solid rgba(0, 0, 0, 0.05)',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    transition: 'all 0.3s ease',
    '&:hover': {
      transform: 'scale(1.05)',
    },
  }}
>
  <IconButton
    onClick={() => {
      if (window.history.length > 1) navigate(-1);
      else navigate('/');
    }}
    sx={{
      color: isDark ? '#fff' : '#111',
      width: 44,
      height: 44,
    }}
  >
    <ArrowLeft size={24} weight="bold" />
  </IconButton>
</Box>
  );
};

export default BackButton;