// src/pages/admin/AddTherapistPage.tsx
import React, { useState } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  Alert,
} from '@mui/material';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { collection, doc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/firebase';
import { useNavigate } from 'react-router-dom';

const AddTherapistPage: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleAdd = async () => {
    setError('');
    setSuccess(false);
    try {
      const userCred = await createUserWithEmailAndPassword(auth, email, password);
      const uid = userCred.user.uid;

      // เพิ่มลง Firestore collection therapists
      await setDoc(doc(db, 'therapists', uid), {
        name,
        email,
        role: 'therapist',
        available: 'resting',
        rating: 0,
        reviews: 0,
        totalBookings: 0,
        createdAt: new Date(),
      });

      setSuccess(true);
      setName('');
      setEmail('');
      setPassword('');
      navigate('/admin/therapists');
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Paper sx={{ maxWidth: 500, mx: 'auto', p: 3, borderRadius: 4 }}>
        <Typography variant="h5" fontWeight="bold" mb={2}>
          ➕ Add New Therapist
        </Typography>

        {error && <Alert severity="error">{error}</Alert>}
        {success && <Alert severity="success">Therapist added successfully!</Alert>}

        <TextField
          label="Name"
          fullWidth
          margin="normal"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <TextField
          label="Email"
          fullWidth
          margin="normal"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <TextField
          label="Initial Password"
          fullWidth
          type="password"
          margin="normal"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <Button variant="contained" fullWidth sx={{ mt: 2 }} onClick={handleAdd}>
          Add Therapist
        </Button>
      </Paper>
    </Box>
  );
};

export default AddTherapistPage;
