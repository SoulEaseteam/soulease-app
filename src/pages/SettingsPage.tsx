import React, { useState } from 'react';
import {
  Box,
  Typography,
  Switch,
  FormControlLabel,
  Divider,
  Paper,
  IconButton,
  Snackbar,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import { useNavigate } from 'react-router-dom';

const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const [enableNotif, setEnableNotif] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [snackOpen, setSnackOpen] = useState(false);

  const handleToggleNotif = () => {
    setEnableNotif((prev) => !prev);
    setSnackOpen(true);
  };

  const handleToggleDark = () => {
    setDarkMode((prev) => !prev);
    setSnackOpen(true);
  };

  return (
    <Box sx={{ minHeight: '100vh', background: '#f5f5f5', pb: 8 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', p: 2, pt: 4 }}>
        <IconButton onClick={() => navigate('/profile')}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h6" fontWeight="bold" ml={1}>
          Settings
        </Typography>
      </Box>

      {/* Preferences Section */}
      <Box sx={{ px: 2, mt: 2 }}>
        <Paper elevation={3} sx={{ p: 3, borderRadius: 4 }}>
          <Typography fontWeight="bold" mb={2}>🔧 Preferences</Typography>

          <FormControlLabel
            control={
              <Switch
                checked={enableNotif}
                onChange={handleToggleNotif}
              />
            }
            label={
              <Box display="flex" alignItems="center">
                <NotificationsActiveIcon sx={{ mr: 1 }} />
                Enable Notifications
              </Box>
            }
            sx={{ mb: 2 }}
          />

          <FormControlLabel
            control={
              <Switch
                checked={darkMode}
                onChange={handleToggleDark}
              />
            }
            label={
              <Box display="flex" alignItems="center">
                <DarkModeIcon sx={{ mr: 1 }} />
                Dark Mode (coming soon)
              </Box>
            }
          />
        </Paper>
      </Box>

      {/* Snackbar for feedback */}
      <Snackbar
        open={snackOpen}
        autoHideDuration={1500}
        onClose={() => setSnackOpen(false)}
        message="✅ Settings updated"
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  );
};

export default SettingsPage;