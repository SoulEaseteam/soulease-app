import React from 'react';
import { BottomNavigation, BottomNavigationAction, Paper } from '@mui/material';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import PersonIcon from '@mui/icons-material/Person';
import { useNavigate, useLocation } from 'react-router-dom';

const TherapistBottomNav: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // ใช้ currentPath เฉพาะ path หลัก (ไม่เอา query param)
  const currentPath = location.pathname.split('?')[0];

  return (
    <Paper
      sx={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 999,
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        boxShadow: '0 -6px 24px rgba(0,0,0,0.20)',
        background: 'rgba(255,255,255,0.9)',
        backdropFilter: 'blur(8px)',
      }}
      elevation={10}
    >
      <BottomNavigation
        showLabels
        value={currentPath}
        onChange={(_event: React.SyntheticEvent, newValue: string) => navigate(newValue)}
        sx={{
          '& .Mui-selected': { color: '#2b3b53' },
          '& .MuiBottomNavigationAction-root': {
            fontFamily: 'Orson, sans-serif',
          },
        }}
      >
        <BottomNavigationAction
          label="Bookings"
          value="/my-bookings"
          icon={<CalendarMonthIcon />}
        />
        <BottomNavigationAction
          label="Location"
          value="/update-location"
          icon={<LocationOnIcon />}
        />
        <BottomNavigationAction
          label="Profile"
          value="/therapist-profile"
          icon={<PersonIcon />}
        />
      </BottomNavigation>
    </Paper>
  );
};

export default TherapistBottomNav;