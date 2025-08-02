import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Switch,
  FormControlLabel,
  Divider,
  TextField,
  Button,
  Snackbar,
  Alert,
} from '@mui/material';

const AdminAdvancedSettingsPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info' | 'warning';
  }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const handleSave = async () => {
    setLoading(true);
    try {
      // 👇 ใส่ logic บันทึกข้อมูลที่นี่ เช่นอัปเดต Firestore
      await new Promise((resolve) => setTimeout(resolve, 1000)); // mock delay
      setSnackbar({
        open: true,
        message: 'Settings saved successfully.',
        severity: 'success',
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Failed to save settings.',
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        Advanced Settings
      </Typography>

      <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6">🔔 Notifications</Typography>
        <FormControlLabel control={<Switch defaultChecked />} label="Enable Telegram Notifications" />
        <FormControlLabel control={<Switch />} label="Enable LINE Notify" />
        <TextField fullWidth label="Telegram Bot Token" margin="normal" />
        <TextField fullWidth label="LINE Notify Token" margin="normal" />
      </Paper>

      <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6">💳 Payment</Typography>
        <FormControlLabel control={<Switch defaultChecked />} label="Enable PromptPay QR" />
        <FormControlLabel control={<Switch />} label="Enable Stripe" />
        <TextField fullWidth label="Deposit Amount (THB)" type="number" margin="normal" />
      </Paper>

      <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6">📍 Distance Settings</Typography>
        <TextField fullWidth label="Max Distance Allowed (KM)" type="number" margin="normal" />
        <FormControlLabel control={<Switch defaultChecked />} label="Multiply by 2 for Round Trip" />
      </Paper>

      <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6">⏰ Booking Rules</Typography>
        <TextField fullWidth label="Min Advance Booking (minutes)" type="number" margin="normal" />
        <TextField fullWidth label="Max Future Booking (days)" type="number" margin="normal" />
      </Paper>

      <Paper elevation={3} sx={{ p: 3 }}>
        <Typography variant="h6">🛡️ Security</Typography>
        <FormControlLabel control={<Switch />} label="Enable Maintenance Mode" />
        <TextField fullWidth label="Blocked IP Addresses (comma separated)" margin="normal" />
      </Paper>

      <Divider sx={{ my: 3 }} />
      <Button
        variant="contained"
        color="primary"
        disabled={loading}
        onClick={handleSave}
      >
        {loading ? 'Saving...' : 'Save Settings'}
      </Button>

      {/* ✅ Snackbar แก้ type เรียบร้อย */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
      >
        <Alert severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default AdminAdvancedSettingsPage;