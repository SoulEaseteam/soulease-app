// src/pages/RegisterPage.tsx
//
// 🆕 Round 28w.3 (2026-07-13) — audit retheme, mirrors LoginPage 28w.1/.2:
//   retired taupe #8F8474 + Chonburi + navy → rose #D97C95 on day/night
//   var(--sr-*); real <form> (Enter submits); type=email + autoComplete;
//   labelled fields with a visible rose border (MUI's default computes
//   white → invisible on the day panel); removed emoji from the toast;
//   eager avatar.
import React, { useState } from 'react';
import {
  Box, TextField, Button, Typography, Paper, Link
} from '@mui/material';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import BottomNav from '../components/layouts/BottomNavGlass';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from "../lib/firebase";
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { toast } from 'react-toastify';
import { getErrorMessage } from "@/utils/getErrorMessage";

const SERIF = '"Fraunces", "Playfair Display", Georgia, serif';
const ROSE = "#D97C95";
const ROSE_HOVER = "#C96F89";

// Shared field styling — rose border visible in both day + night
// (MUI's default outline computes to white on the day panel).
// 🆕 28w.76 (founder "ไม่เห็นข้อมูลในกล่อง") — the outline + label were themed
//   but the INPUT TEXT never was, so MUI fell back to its light-theme ink
//   (#232B36) and rendered near-black on the dark panel: 1.11:1 contrast, i.e.
//   what you type is invisible. Pin the text, placeholder and caret to theme
//   tokens, and neutralise the browser's autofill styling (Chrome force-paints
//   its own background + text colour on autofilled fields).
const fieldSx = {
  mb: 2,
  '& .MuiOutlinedInput-root': {
    borderRadius: '16px',
    '& fieldset': { borderColor: 'rgba(217, 124, 149, 0.55)' },
    '&:hover fieldset': { borderColor: ROSE },
    '&.Mui-focused fieldset': { borderColor: ROSE },
  },
  '& .MuiOutlinedInput-input': {
    color: 'var(--sr-ink)',
    caretColor: 'var(--sr-ink)',
    '&::placeholder': { color: 'var(--sr-muted)', opacity: 1 },
    '&:-webkit-autofill': {
      WebkitTextFillColor: 'var(--sr-ink)',
      WebkitBoxShadow: '0 0 0 1000px var(--sr-panel-2) inset',
      caretColor: 'var(--sr-ink)',
      transition: 'background-color 9999s ease-in-out 0s',
    },
  },
  '& label': { color: 'var(--sr-muted)' },
  '& label.Mui-focused': { color: ROSE },
} as const;

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

      toast.success('Register successful');
      void navigate('/login');
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Registration failed.'));
    }
  };

  return (
    <>
      <Box sx={{
        minHeight: '100vh',
        background: "var(--sr-bg)",
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'column',
        p: 2,
      }}>
        <Paper elevation={0} sx={{
          width: '100%',
          maxWidth: 320,
          textAlign: 'center',
          p: 4,
          borderRadius: 6,
          background: "var(--sr-panel)",
          color: 'var(--sr-ink)',
          position: 'relative',
          border: '1px solid var(--sr-hairline)',
          boxShadow: 'var(--sr-card-shadow)',
        }}>
          <Box sx={{ textAlign: 'center', mt: -12 }}>
            <Box component="img" src="/images/icon/User.webp" alt="User Icon"
              width={120} height={120}
              loading="eager" decoding="async"
              sx={{ width: 120, height: 120, borderRadius: '50%', boxShadow: '0 6px 18px rgba(138, 58, 87, 0.20)' }} />
          </Box>

          <Typography variant="h6" fontWeight="bold" mt={3} mb={4}
            sx={{ fontFamily: SERIF, fontSize: '2rem', color: "var(--sr-ink)" }}>
            Sign Up
          </Typography>

          <Box
            component="form"
            onSubmit={(e) => {
              e.preventDefault();
              void handleRegister();
            }}
          >
            <TextField
              label="Email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              variant="outlined"
              size="small"
              fullWidth
              sx={fieldSx}
            />

            <TextField
              label="Password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              size="small"
              fullWidth
              sx={fieldSx}
            />

            <TextField
              label="Confirm Password"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              size="small"
              fullWidth
              sx={fieldSx}
            />

            <Button
              type="submit"
              fullWidth
              sx={{
                mt: 1, py: 1.2, fontWeight: 'bold', fontSize: 14,
                borderRadius: '20px', color: '#fff', textTransform: 'uppercase',
                background: ROSE,
                boxShadow: '0 4px 16px rgba(138, 58, 87, 0.30)',
                '&:hover': { background: ROSE_HOVER },
                transition: '0.2s ease-in-out'
              }}>
              SIGN UP
            </Button>
          </Box>

          <Typography mt={3} fontSize={14} sx={{ color: 'var(--sr-body)' }}>
            Already have an account?{' '}
            <Link component={RouterLink} to="/login" underline="always" sx={{ color: ROSE, fontWeight: 'bold' }}>
              Login
            </Link>
          </Typography>
        </Paper>

        <Typography mt={4} fontSize={14} sx={{ color: 'var(--sr-muted)' }} textAlign="center">
          You may proceed with booking without an account.
        </Typography>
      </Box>

      <BottomNav />
    </>
  );
};

export default RegisterPage;
