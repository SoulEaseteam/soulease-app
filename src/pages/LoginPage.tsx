// src/pages/LoginPage.tsx

import React, { useState } from 'react';
import { Box, TextField, Button, Typography, Paper, Link } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import '@fontsource/chonburi';
import BottomNav from '../components/BottomNav';

const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleLogin = () => {
    if (!username || !password) {
      alert('Please fill in all fields.');
      return;
    }
    alert('Login successful!');
    navigate('/');
  };

  return (
    <>
      <Box sx={{
        minHeight: '100vh',
        background: '#1c2a3a',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'column',
      }}>
       <Paper elevation={16} sx={{
                 width: '100%',
                 maxWidth: 335,
                 textAlign: 'center',
                 p: 4,
                 borderRadius: 2,
                 background: 'linear-gradient(to bottom, #fff, #f2f2f2)',
                 color: '#2b3b53',
                 position: 'relative'
               }}>
                 <Box sx={{ textAlign: 'center', mt: -16 }}>
                   <Box sx={{ display: 'inline-block', p: 1, borderRadius: '50%', bgcolor: '#fff' }}>
                     <Box sx={{ display: 'inline-block', p: 1.2, borderRadius: '50%', bgcolor: '#2b3b53' }}>
                       <Box component="img" src="/images/icon/support-service.png" alt="User Icon"
                         sx={{ width: 150, height: 150, borderRadius: '50%', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }} />
                     </Box>
                   </Box>
                 </Box>

          <Typography variant="h6" fontWeight="bold" mt={4} mb={4}
            sx={{ fontFamily: 'Chonburi, serif', fontSize: '2rem' }}>
            Welcome
          </Typography>

          <TextField
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            fullWidth
            size="small"
            sx={{
              mb: 2, input: { color: '#999' },
              '& .MuiOutlinedInput-root': {
                borderRadius: '16px',
                '& fieldset': { borderColor: '#a4b0ba' },
                '&:hover fieldset': { borderColor: '#7b8b99' },
                '&.Mui-focused fieldset': { borderColor: '#7b8b99' }
              }
            }}
          />
          <TextField
            placeholder="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            fullWidth
            size="small"
            sx={{
              mb: 2, input: { color: '#999' },
              '& .MuiOutlinedInput-root': {
                borderRadius: '16px',
                '& fieldset': { borderColor: '#a4b0ba' },
                '&:hover fieldset': { borderColor: '#7b8b99' },
                '&.Mui-focused fieldset': { borderColor: '#7b8b99' }
              }
            }}
          />

          <Button onClick={handleLogin} fullWidth sx={{
             mt: 1, py: 1.2, px: 5, fontWeight: 'bold', fontSize: 14,
            borderRadius: '20px', color: '#fff', textTransform: 'uppercase',
            maxWidth: 150, width: '100%', backgroundColor: '#2b3b53',
            backdropFilter: 'blur(8px)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            '&:hover': { backgroundColor: '#7b8b99', transform: 'scale(1.02)' },
            transition: '0.2s ease-in-out'
          }}>
            LOGIN
          </Button>

          <Typography mt={3} fontSize={14}>
            <Link href="#" underline="hover" color="#a4b0ba">Forgot password?</Link>
          </Typography>
          <Typography mt={1} fontSize={14}>
            Don’t have an account?{' '}
            <Link href="/register" underline="always" color="#666" fontWeight="bold">
              Sign up
            </Link>
          </Typography>
        </Paper>

        <Typography mt={4} fontSize={14} color="#ccc" textAlign="center">
          You may proceed with booking without an account.
        </Typography>
      </Box>

      <BottomNav />
    </>
  );
};

export default LoginPage;