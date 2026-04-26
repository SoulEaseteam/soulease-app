// src/pages/RegisterPage.tsx
import React, { useState } from 'react';
import {
  Box, TextField, Button, Typography, Paper, Link
} from '@mui/material';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import BottomNav from '../components/layouts/BottomNavGlass';
import '@fontsource/chonburi';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from "../lib/firebase";
import { doc, setDoc } from 'firebase/firestore';
import { toast } from 'react-toastify';

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleRegister = async () => {
    if (!email || !password || !confirmPassword) {
      toast.warning('Please fill in all fields.');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user.uid;

      await setDoc(doc(db, 'users', uid), {
        email,
        role: 'customer',
        createdAt: new Date(),
      });

      toast.success('🎉 Register successful!');
      navigate('/login');
    } catch (error: any) {
      toast.error(error.message || 'Registration failed.');
    }
  };

  return (
    <>
      <Box sx={{
        minHeight: '100vh',
        background: "linear-gradient(to bottom, #FE0944, #FEAE96)",
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'column',
        p: 0,
      }}>
        <Paper elevation={8} sx={{
          width: '100%',
          maxWidth: 320,
          textAlign: 'center',
          p: 4,
          borderRadius: 6,
          background: 'rgba(255,255,255,0.95)',
          backdropFilter: "blur(12px)",
          color: '#3a3420',
          position: 'relative',
          boxShadow: '0 6px 20px rgba(0,0,0,0.15)'
        }}>
          <Box sx={{ textAlign: 'center', mt: -12 }}>
            <Box component="img" src="/images/icon/User.gif" alt="User Icon"
              sx={{ width: 120, height: 120, borderRadius: '50%', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }} />
          </Box>

          <Typography variant="h6" fontWeight="bold" mt={3} mb={4}
            sx={{ fontFamily: 'Chonburi, serif', fontSize: '2rem', color: "#FE0944" }}>
            Sign Up
          </Typography>

          <TextField
            placeholder="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            variant="outlined"
            size="small"
            fullWidth
            sx={{
              mb: 2, input: { color: '#333' },
              '& .MuiOutlinedInput-root': {
                borderRadius: '16px',
                '& fieldset': { borderColor: '#f5a6a6' },
                '&:hover fieldset': { borderColor: '#FE0944' },
                '&.Mui-focused fieldset': { borderColor: '#FE0944' }
              }
            }}
          />

          <TextField
            placeholder="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            size="small"
            fullWidth
            sx={{
              mb: 2, input: { color: '#333' },
              '& .MuiOutlinedInput-root': {
                borderRadius: '16px',
                '& fieldset': { borderColor: '#f5a6a6' },
                '&:hover fieldset': { borderColor: '#FE0944' },
                '&.Mui-focused fieldset': { borderColor: '#FE0944' }
              }
            }}
          />

          <TextField
            placeholder="Confirm Password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            size="small"
            fullWidth
            sx={{
              mb: 2, input: { color: '#333' },
              '& .MuiOutlinedInput-root': {
                borderRadius: '16px',
                '& fieldset': { borderColor: '#f5a6a6' },
                '&:hover fieldset': { borderColor: '#FE0944' },
                '&.Mui-focused fieldset': { borderColor: '#FE0944' }
              }
            }}
          />

          <Button 
            onClick={handleRegister}
            sx={{
              mt: 1, py: 1.2, px: 5, fontWeight: 'bold', fontSize: 14,
              borderRadius: '20px', color: '#fff', textTransform: 'uppercase',
              maxWidth: 150, width: '100%',
              background: '#FE0944',
              boxShadow: '0 4px 20px rgba(254, 9, 68, 0.4)',
              '&:hover': { background: '#FEAE96', transform: 'scale(1.05)' },
              transition: '0.2s ease-in-out'
            }}>
            SIGN UP
          </Button>

          <Typography mt={3} fontSize={14}>
            Already have an account?{' '}
            <Link component={RouterLink} to="/login" underline="always" color="#FE0944" fontWeight="bold">
              Login
            </Link>
          </Typography>
        </Paper>

        <Typography mt={4} fontSize={14} color="#fff" textAlign="center">
          You may proceed with booking without an account.
        </Typography>
      </Box>

      <BottomNav />
    </>
  );
};

export default RegisterPage;