// src/components/CustomAppBar.tsx
import React from 'react';
import {
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Box,
  SxProps,
  Theme,
} from '@mui/material';
import { ArrowLeft } from 'phosphor-react';
import { useNavigate } from 'react-router-dom';

interface CustomAppBarProps {
  title?: string;
  onBack?: () => void;
  hideBack?: boolean;
  sx?: SxProps<Theme>;
}

const CustomAppBar: React.FC<CustomAppBarProps> = ({
  title = 'Back',
  onBack,
  hideBack = false,
  sx,
}) => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) onBack();
    else if (window.history.length > 1) navigate(-1);
    else navigate('/');
  };

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        backgroundColor: 'rgba(255, 255, 255, 0.6)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(0,0,0,0.05)',
        boxShadow: '0 1px 6px rgba(0,0,0,0.08)',
        height: 60,
        display: 'flex',
        justifyContent: 'center',
        fontFamily: 'Orson, sans-serif',
        ...sx,
      }}
    >
      <Toolbar sx={{ justifyContent: hideBack ? 'center' : 'flex-start',}}>
        {!hideBack && (
          <IconButton
            aria-label="Back"
            onClick={handleBack}
            sx={{
              width: 40,
              height: 40,
              borderRadius: 2,
              backgroundColor: 'rgba(255, 255, 255, 0.7)',
              backdropFilter: 'blur(6px)',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
              },
              zIndex: 1,
            }}
          >
            <ArrowLeft size={20} weight="bold" color="#333" />
          </IconButton>
        )}

        <Box
          sx={{
            position: 'absolute',
            left: 0,
            right: 0,
            textAlign: 'center',
            pointerEvents: 'none',
          }}
        >
          <Typography
            variant="subtitle1"
            fontWeight="600"
            sx={{ color: '#333', fontFamily: 'Orson, sans-serif' }}
          >
            {title}
          </Typography>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default CustomAppBar;