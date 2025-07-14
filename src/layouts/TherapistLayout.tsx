// TherapistLayout.tsx
import React from 'react';
import { useLocation } from 'react-router-dom';
import { Box, Typography } from '@mui/material';
import TherapistBottomNav from '@/components/TherapistBottomNav';
import IOSFloatingTopBar from '@/components/FloatingTopBar';

interface TherapistLayoutProps {
  children: React.ReactNode;
  title?: string;
  hasAvailableTherapists?: boolean;
}

const TherapistLayout: React.FC<TherapistLayoutProps> = ({
  children,
  title,
  hasAvailableTherapists = true,
}) => {
  const location = useLocation();

  const noBackButtonPaths = ['/therapist/home'];
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
          backgroundColor: (theme) => theme.palette.background.default,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: hasAvailableTherapists ? 'flex-start' : 'center',
        }}
      >
        {!hasAvailableTherapists ? (
          <Typography
            sx={{
              color: '#666',
              fontSize: 18,
              fontWeight: 'medium',
              textAlign: 'center',
              px: 3,
            }}
          >
            There are currently no staff available. Please try again later.
          </Typography>
        ) : (
          children
        )}
      </Box>

      <TherapistBottomNav />
    </>
  );
};

export default TherapistLayout;