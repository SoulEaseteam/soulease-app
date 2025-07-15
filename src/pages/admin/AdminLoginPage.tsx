// ✅ src/pages/admin/AdminLoginPage.tsx
import React, { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '@/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import {
  Box, Button, TextField, Typography, Paper, Stack
} from '@mui/material';

const AdminLoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async () => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const snapshot = await getDocs(collection(db, 'admins'));
      const isAdmin = snapshot.docs.some(doc => doc.data().email === email);

      if (!isAdmin) throw new Error('You are not an admin');

      navigate('/admin/dashboard');
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Paper sx={{ p: 4, width: 400 }}>
        <Typography variant="h6" gutterBottom>🔐 Admin Login</Typography>
        <Stack spacing={2}>
          <TextField label="Email" fullWidth value={email} onChange={(e) => setEmail(e.target.value)} />
          <TextField label="Password" type="password" fullWidth value={password} onChange={(e) => setPassword(e.target.value)} />
          {error && <Typography color="error">{error}</Typography>}
          <Button variant="contained" onClick={handleLogin}>Login</Button>
        </Stack>
      </Paper>
    </Box>
  );
};

export default AdminLoginPage;