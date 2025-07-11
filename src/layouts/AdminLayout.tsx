import React from 'react';
import { Box } from '@mui/material';

const AdminLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Box sx={{ minHeight: '100vh', backgroundColor: '#fff', p: 2 }}>
    {children}
  </Box>
);

export default AdminLayout;