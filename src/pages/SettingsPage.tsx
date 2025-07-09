// src/pages/SettingsPage.tsx
import React from 'react';
import { Box, Typography, Switch, FormControlLabel, Divider } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate } from 'react-router-dom';

const SettingsPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Box sx={{ p: 2, pt: 7, minHeight: '100vh', background: '#f5f5f5' }}>
      <ArrowBackIcon sx={{ cursor: 'pointer', mb: 2 }} onClick={() => navigate('/profile')} />

      <Typography variant="h6" fontWeight="bold">Settings</Typography>
      <Divider sx={{ my: 2 }} />

      <FormControlLabel control={<Switch defaultChecked />} label="Enable Notifications" />
      <FormControlLabel control={<Switch />} label="Dark Mode" />
    </Box>
  );
};

export default SettingsPage;