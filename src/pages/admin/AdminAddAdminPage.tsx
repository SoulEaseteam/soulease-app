// src/pages/admin/AdminAddAdminPage.tsx
import React from 'react';
import { Box, Typography, TextField, Button, Paper } from '@mui/material';

const AdminAddAdminPage: React.FC = () => {
  return (
    <Box sx={{ p: 3, maxWidth: 500, mx: 'auto' }}>
      <Typography variant="h6" mb={2}>Add New Admin</Typography>
      <Paper sx={{ p: 3 }} elevation={2}>
        <TextField fullWidth label="Name" sx={{ mb: 2 }} />
        <TextField fullWidth label="Email" type="email" sx={{ mb: 2 }} />
        <TextField fullWidth label="Temporary Password" type="password" sx={{ mb: 2 }} />
        <Button variant="contained" fullWidth>Submit</Button>
      </Paper>
    </Box>
  );
};

export default AdminAddAdminPage;