// ✅ TherapistLayout.tsx
import React from 'react';
import { useLocation } from 'react-router-dom';
import { Box } from '@mui/material';
import TherapistBottomNav from '@components/TherapistBottomNav';
import IOSFloatingTopBar from '../components/FloatingTopBar';

const TherapistLayout: React.FC<{ children: React.ReactNode; title?: string }> = ({ children, title }) => {
  const location = useLocation();
  const noBackButtonPaths = ['/therapist/home'];
  const shouldShowBackButton = !noBackButtonPaths.includes(location.pathname);

  return (
    <>
      {shouldShowBackButton && <IOSFloatingTopBar title={title} />}
      <Box sx={{ pt: shouldShowBackButton ? 7 : 0, pb: 10, minHeight: '100vh', backgroundColor: '#f7f7f7' }}>
        {children}
      </Box>
      <TherapistBottomNav />
    </>
  );
};

export default TherapistLayout;