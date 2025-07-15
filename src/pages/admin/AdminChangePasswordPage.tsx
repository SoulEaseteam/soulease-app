// src/pages/admin/AdminChangePasswordPage.tsx
import React, { useState } from 'react';
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { auth } from '@/firebase';
import { Box, Button, TextField, Typography, Alert } from '@mui/material';

const AdminChangePasswordPage: React.FC = () => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleChangePassword = async () => {
    setMessage('');
    setError('');

    const user = auth.currentUser;
    if (!user || !user.email) {
      setError('No admin is logged in.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }

    try {
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);
      setMessage('Password updated successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <Box maxWidth={400} mx="auto" mt={8} p={3} boxShadow={3} borderRadius={2} bgcolor="white">
      <Typography variant="h6" mb={2} fontWeight="bold">🔐 Change Admin Password</Typography>

      {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <TextField
        label="Current Password"
        type="password"
        fullWidth
        margin="normal"
        value={currentPassword}
        onChange={(e) => setCurrentPassword(e.target.value)}
      />
      <TextField
        label="New Password"
        type="password"
        fullWidth
        margin="normal"
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
      />
      <TextField
        label="Confirm New Password"
        type="password"
        fullWidth
        margin="normal"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
      />

      <Button variant="contained" fullWidth sx={{ mt: 2 }} onClick={handleChangePassword}>
        Update Password
      </Button>
    </Box>
  );
};

export default AdminChangePasswordPage;