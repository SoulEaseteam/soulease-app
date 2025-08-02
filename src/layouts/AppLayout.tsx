// src/layouts/AppLayout.tsx
import React from 'react';
import { Box } from '@mui/material';
import BottomNav from '../components/BottomNav';
import AdminFloatingChat from '../components/AdminFloatingChat';

interface Props {
  children: React.ReactNode;
}

const AppLayout: React.FC<Props> = ({ children }) => {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        pb: '80px',
        backgroundColor: '#fdfdfd',
      }}
    >
      {children}
      <BottomNav />
      <AdminFloatingChat />
    </Box>
  );
};

export default AppLayout;