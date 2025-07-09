// src/components/FloatingTopBar.tsx
import React from 'react';
import { Box } from '@mui/material';
import BackButton from './BackButton';

interface Props {
  title?: string;
}

const FloatingTopBar: React.FC<Props> = ({ title }) => (
  <Box
    sx={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      height: 56,
      background: 'rgba(255,255,255,0.6)',
      backdropFilter: 'blur(10px)',
      display: 'flex',
      alignItems: 'center',
      px: 1,
      zIndex: 2000,
      borderBottom: '1px solid rgba(0,0,0,0.08)',
    }}
  >
    <BackButton />
    {title && (
      <Box sx={{ flex: 1, textAlign: 'center', mr: 4 }}>
        <span style={{ fontWeight: 600, fontSize: 16, color: '#2b3b53' }}>{title}</span>
      </Box>
    )}
  </Box>
);

export default FloatingTopBar;