// src/components/FloatingTopBar.tsx
import React from 'react';
import { Box } from '@mui/material';


interface Props {
  title?: string;
  noBack?: boolean;
}

const FloatingTopBar: React.FC<Props> = ({ title, noBack }) => (
  <Box
    sx={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      height: 56,
      background: 'rgba(255,255,255,0.85)',
      backdropFilter: 'blur(12px)',
      display: 'flex',
      alignItems: 'center',
      px: 1.5,
      zIndex: 2000,
      borderBottom: '1px solid rgba(0,0,0,0.08)',
      boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
    }}
  >
    
    <Box sx={{ flex: 1, textAlign: 'center', mr: noBack ? 0 : 4 }}>
      {title && (
        <span
          style={{
            fontWeight: 600,
            fontSize: 17,
            color: '#2b3b53',
            letterSpacing: 0.1,
            fontFamily: 'inherit',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: 'inline-block',
            maxWidth: '85vw',
            verticalAlign: 'middle',
          }}
        >
          {title}
        </span>
      )}
    </Box>
  </Box>
);

export default FloatingTopBar;
