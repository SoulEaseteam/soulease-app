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
    if (onBack) {
      onBack();
    } else if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        backgroundColor: 'rgba(255,255,255,0.68)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(0,0,0,0.04)',
        boxShadow: '0 1px 6px rgba(0,0,0,0.08)',
        height: 60,
        display: 'flex',
        justifyContent: 'center',
        fontFamily: 'Orson, sans-serif',
        ...sx,
      }}
    >
      <Toolbar sx={{ justifyContent: hideBack ? 'center' : 'flex-start', position: 'relative', minHeight: 60 }}>
        {!hideBack && (
          <IconButton
            aria-label="Back"
            onClick={handleBack}
            sx={{
              width: 40,
              height: 40,
              borderRadius: 2,
              backgroundColor: 'rgba(255,255,255,0.8)',
              backdropFilter: 'blur(6px)',
              boxShadow: '0 2px 4px rgba(0,0,0,0.10)',
              '&:hover': { backgroundColor: 'rgba(255,255,255,0.92)' },
              zIndex: 2,
              ml: -1,
              mr: 1.5,
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
            width: '100%',
            textAlign: 'center',
            pointerEvents: 'none',
            zIndex: 1,
          }}
        >
          <Typography
            variant="subtitle1"
            fontWeight={600}
            sx={{
              color: '#222',
              fontFamily: 'Orson, sans-serif',
              fontSize: 18,
              letterSpacing: 0.5,
            }}
          >
            {title}
          </Typography>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default CustomAppBar;