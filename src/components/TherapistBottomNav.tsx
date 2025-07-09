// src/components/TherapistBottomNav.tsx

import React from 'react';
import { BottomNavigation, BottomNavigationAction, Paper } from '@mui/material';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import PersonIcon from '@mui/icons-material/Person';
import { useNavigate, useLocation } from 'react-router-dom';

const TherapistBottomNav: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const currentPath = location.pathname;

  return (
    <Paper sx={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 999 }} elevation={3}>
      <BottomNavigation
        showLabels
        value={currentPath}
        onChange={(event, newValue) => navigate(newValue)}
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
