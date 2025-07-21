import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';

const UnauthorizedPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: '#f8f9fa',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        textAlign: 'center',
        px: 3
      }}
    >
      <Typography variant="h3" color="error" gutterBottom>
        🚫 Access Denied
      </Typography>

      <Typography variant="body1" color="textSecondary" mb={4}>
        You do not have permission to view this page.
      </Typography>

      <Button variant="contained" onClick={() => navigate('/')}>
        Go to Home
      </Button>
    </Box>
  );
};

export default UnauthorizedPage;