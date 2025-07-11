// ✅ UserLayout.tsx
import React from 'react';
import { useLocation } from 'react-router-dom';
import { Box } from '@mui/material';
import BottomNav from '../components/BottomNav';
import IOSFloatingTopBar from '../components/FloatingTopBar';
import AdminFloatingChat from '../components/AdminFloatingChat';

const UserLayout: React.FC<{ children: React.ReactNode; title?: string }> = ({ children, title }) => {
  const location = useLocation();

  const noBackButtonPaths = ['/', '/services', '/booking/history'];
  const shouldShowBackButton = !noBackButtonPaths.some((path) =>
    location.pathname.startsWith(path)
  );

  return (
    <>
      {shouldShowBackButton && <IOSFloatingTopBar title={title} />}
      <Box
        sx={{
          pt: shouldShowBackButton ? 7 : 0,
          pb: 10,
          minHeight: '100vh',
          backgroundColor: '#f7f7f7',
        }}
      >
        {children}
      </Box>
      <BottomNav />
      <AdminFloatingChat />
    </>
  );
};

export default UserLayout;