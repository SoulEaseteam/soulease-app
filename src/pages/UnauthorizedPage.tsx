// src/pages/UnauthorizedPage.tsx
import React from 'react';
import { Box, Typography } from '@mui/material';

const UnauthorizedPage = () => (
  <Box textAlign="center" mt={10}>
    <Typography variant="h4">Access Denied</Typography>
    <Typography color="textSecondary">You do not have permission to access this page.</Typography>
  </Box>
);

export default UnauthorizedPage;