import React from 'react';
import { Box, Button, Typography, Paper, Stack } from '@mui/material';
import { useNavigate } from 'react-router-dom';

const MockLoginPage: React.FC = () => {
  const navigate = useNavigate();

  const handleMockLogin = (role: 'admin' | 'therapist' | 'customer') => {
    // จำลอง mock user แล้วบันทึกไว้ใน localStorage
    const mockUser = {
      uid: `mock-${role}`,
      email: `${role}@example.com`,
      role,
    };
    localStorage.setItem('mockUser', JSON.stringify(mockUser));

    // ไปยังหน้า role ที่เหมาะสม
    if (role === 'admin') {
      navigate('/admin/dashboard');
    } else if (role === 'therapist') {
      navigate('/therapist/profile');
    } else {
      navigate('/');
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        background: '#fafafa',
        p: 2,
      }}
    >
      <Paper elevation={10} sx={{ p: 4, textAlign: 'center', borderRadius: 3 }}>
        <Typography variant="h5" fontWeight="bold" mb={3}>
          Mock Login
        </Typography>

        <Stack spacing={2} direction="row" justifyContent="center">
          <Button variant="contained" onClick={() => handleMockLogin('admin')}>
            LOGIN AS ADMIN
          </Button>
          <Button variant="contained" onClick={() => handleMockLogin('therapist')}>
            LOGIN AS THERAPIST
          </Button>
          <Button variant="contained" onClick={() => handleMockLogin('customer')}>
            LOGIN AS CUSTOMER
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
};

export default MockLoginPage;