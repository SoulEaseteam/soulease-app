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
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { toast } from 'react-toastify';
import { getErrorMessage } from "@/utils/getErrorMessage";

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleRegister = async () => {
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail || !password || !confirmPassword) {
      toast.warning('Please fill in all fields.');
      return;
    }
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, trimmedEmail, password);
      const uid = userCredential.user.uid;

      await setDoc(doc(db, 'users', uid), {
        email: trimmedEmail,
        role: 'user', // normalized — เลิกใช้ "customer" ที่ไม่ตรงกับ Role type
        createdAt: serverTimestamp(),
      });

      toast.success('🎉 Register successful!');
      void navigate('/login');
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Registration failed.'));
    }
  };

  return (
    <>
      <Box sx={{
        minHeight: '100vh',
        background: "#B4000A",
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
          background: "#fff",
          color: '#3a3420',
          position: 'relative',
          boxShadow: '0 6px 20px rgba(0,0,0,0.15)'
        }}>
          <Box sx={{ textAlign: 'center', mt: -12 }}>
            <Box component="img" src="/images/icon/User.gif" alt="User Icon"
              sx={{ width: 120, height: 120, borderRadius: '50%', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }} />
          </Box>

          <Typography variant="h6" fontWeight="bold" mt={3} mb={4}
            sx={{ fontFamily: 'Chonburi, serif', fontSize: '2rem', color: "#B4000A" }}>
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
                '&:hover fieldset': { borderColor: '#B4000A' },
                '&.Mui-focused fieldset': { borderColor: '#B4000A' }
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
                '&:hover fieldset': { borderColor: '#B4000A' },
                '&.Mui-focused fieldset': { borderColor: '#B4000A' }
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
                '&:hover fieldset': { borderColor: '#B4000A' },
                '&.Mui-focused fieldset': { borderColor: '#B4000A' }
              }
            }}
          />

          <Button 
            onClick={handleRegister}
            sx={{
              mt: 1, py: 1.2, px: 5, fontWeight: 'bold', fontSize: 14,
              borderRadius: '20px', color: '#fff', textTransform: 'uppercase',
              maxWidth: 150, width: '100%',
              background: '#B4000A',
              boxShadow: '0 4px 20px rgba(15, 23, 42, 0.40)',
              '&:hover': { background: '#FEAE96', transform: 'scale(1.05)' },
              transition: '0.2s ease-in-out'
            }}>
            SIGN UP
          </Button>

          <Typography mt={3} fontSize={14}>
            Already have an account?{' '}
            <Link component={RouterLink} to="/login" underline="always" color="#B4000A" fontWeight="bold">
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