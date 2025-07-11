import React from 'react';
import { useLocation } from 'react-router-dom';
import { Box } from '@mui/material';
import BottomNav from '../components/BottomNav';
import TherapistBottomNav from '../components/TherapistBottomNav';
import AdminFloatingChat from '../components/AdminFloatingChat';
import IOSFloatingTopBar from '../components/FloatingTopBar';
import { useAuth } from '../providers/AuthProvider';

interface AppLayoutProps {
  children: React.ReactNode;
  title?: string;
}

const AppLayout: React.FC<AppLayoutProps> = ({ children, title }) => {
  const location = useLocation();
  const { user } = useAuth();

  const noBackButtonPaths = ['/', '/services', '/booking/history'];
  const noBottomNavPaths = ['/login', '/register', '/profile'];
  const noAdminChatPaths = ['/login', '/register', '/profile'];

  const shouldShowBackButton = !noBackButtonPaths.includes(location.pathname);
  const shouldShowBottomNav = !noBottomNavPaths.includes(location.pathname);
  const shouldShowAdminChat = !noAdminChatPaths.includes(location.pathname);

  const therapistPaths = [
    '/therapist-profile',
    '/my-bookings',
    '/update-location',
    '/booking-status'
  ];
  const isTherapistView = user?.role === 'therapist' && therapistPaths.some((path) => location.pathname.startsWith(path));

  return (
    <>
      {shouldShowBackButton && <IOSFloatingTopBar title={title} />}
      <Box
        sx={{
          pt: shouldShowBackButton ? 7 : 0,
          pb: shouldShowBottomNav ? 10 : 0,
          minHeight: '100vh',
          backgroundColor: '#f7f7f7',
        }}
      >
        {children}
      </Box>
      {shouldShowBottomNav && (isTherapistView ? <TherapistBottomNav /> : <BottomNav />)}
      {shouldShowAdminChat && <AdminFloatingChat />}
    </>
  );
};

export default AppLayout;