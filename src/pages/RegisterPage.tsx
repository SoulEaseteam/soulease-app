// src/pages/RegisterPage.tsx
import React, { useState } from 'react';
import {
  Box, TextField, Button, Typography, Paper, Link, MenuItem, Select, FormControl, InputLabel
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import BottomNav from '../components/BottomNav';
import '@fontsource/chonburi';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<'customer' | 'therapist'>('customer');

  const handleRegister = async () => {
    if (!email || !password || !confirmPassword) {
      alert('Please fill in all fields.');
      return;
    }
    if (password !== confirmPassword) {
      alert('Passwords do not match.');
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user.uid;

      await setDoc(doc(db, 'users', uid), {
        email,
        role,
        createdAt: new Date(),
      });

      if (role === 'therapist') {
        await setDoc(doc(db, 'therapists', uid), {
          name: '',
          image: '',
          rating: 0,
          totalBookings: 0,
          positiveScore: 0,
          currentLat: null,
          currentLng: null,
          available: true,
        });
      }

      alert('🎉 Register successful!');
      navigate('/login');
    } catch (error: any) {
      alert(`❌ ${error.message}`);
    }
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
        p: 0,
      }}>
        <Paper elevation={16} sx={{
          width: '100%',
          maxWidth: 350,
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
              mb: 2, input: { color: '#999' },
              '& .MuiOutlinedInput-root': {
                borderRadius: '16px',
                '& fieldset': { borderColor: '#a4b0ba' },
                '&:hover fieldset': { borderColor: '#7b8b99' },
                '&.Mui-focused fieldset': { borderColor: '#2b3b53' }
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
            sx={{ mb: 2, input: { color: '#999' }, '& .MuiOutlinedInput-root': { borderRadius: '16px' } }}
          />

          <TextField
            placeholder="Confirm Password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            size="small"
            fullWidth
            sx={{ mb: 2, input: { color: '#999' }, '& .MuiOutlinedInput-root': { borderRadius: '16px' } }}
          />

          <FormControl fullWidth sx={{ mb: 3 }}>
            <InputLabel id="role-select-label">Register as</InputLabel>
            <Select
              labelId="role-select-label"
              value={role}
              label="Register as"
              onChange={(e) => setRole(e.target.value as 'customer' | 'therapist')}
              sx={{ borderRadius: 3 }}
            >
              <MenuItem value="customer">Customer</MenuItem>
              <MenuItem value="therapist">Therapist</MenuItem>
            </Select>
          </FormControl>

          <Button onClick={handleRegister} sx={{
            mt: 1, py: 1.2, px: 5, fontWeight: 'bold', fontSize: 14,
            borderRadius: '20px', color: '#fff', textTransform: 'uppercase',
            maxWidth: 150, width: '100%', backgroundColor: '#2b3b53',
            backdropFilter: 'blur(8px)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            '&:hover': { backgroundColor: '#7b8b99', transform: 'scale(1.02)' },
            transition: '0.2s ease-in-out'
          }}>
            SIGN UP
          </Button>

          <Typography mt={3} fontSize={14}>
            Already have an account?{' '}
            <Link href="/login" underline="always" color="#666" fontWeight="bold">
              Login
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

export default RegisterPage;