import React, { useState } from 'react';
import {
  Box,
  Button,
  Paper,
  TextField,
  Typography,
  Alert,
} from '@mui/material';
import { auth, db } from '@/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

const AddAdminPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleAddAdmin = async () => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const { user } = userCredential;

      await setDoc(doc(db, 'users', user.uid), {
        email,
        name,
        role: 'admin',
        createdAt: serverTimestamp(),
      });

      setSuccess('✅ Admin created successfully!');
      setEmail('');
      setPassword('');
      setName('');
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <Box maxWidth={500} mx="auto" mt={6} p={3}>
      <Paper elevation={6} sx={{ p: 4, borderRadius: 3 }}>
        <Typography variant="h5" gutterBottom>
          👑 Add New Admin
        </Typography>

        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <TextField
          fullWidth
          label="Full Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          margin="normal"
        />
        <TextField
          fullWidth
          label="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          margin="normal"
          type="email"
        />
        <TextField
          fullWidth
          label="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          margin="normal"
          type="password"
        />

        <Box mt={3}>
          <Button fullWidth variant="contained" color="primary" onClick={handleAddAdmin}>
            ➕ Create Admin
          </Button>
        </Box>

        <Box mt={2}>
          <Button variant="outlined" fullWidth onClick={() => navigate('/admin/dashboard')}>
            🔙 Back to Dashboard
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default AddAdminPage;