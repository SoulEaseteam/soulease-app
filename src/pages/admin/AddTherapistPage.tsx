// src/pages/admin/AddTherapistPage.tsx
import React, { useState } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  Snackbar,
  Alert,
  InputLabel,
  MenuItem,
  Select,
  FormControl,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, db, storage } from '@/firebase';

const AddTherapistPage: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('123456');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState('');
  const [province, setProvince] = useState('');
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('22:00');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  const navigate = useNavigate();

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleAddTherapist = async () => {
    if (!name || !email || !phone || !gender || !province) {
      setSnackbar({ open: true, message: 'Please fill out all fields.', severity: 'error' });
      return;
    }

    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      let imageUrl = '';
      if (imageFile) {
        const imageRef = ref(storage, `therapists/${user.uid}/profile.jpg`);
        await uploadBytes(imageRef, imageFile);
        imageUrl = await getDownloadURL(imageRef);
      }

      await addDoc(collection(db, 'therapists'), {
        uid: user.uid,
        name,
        email,
        phone,
        gender,
        province,
        role: 'therapist',
        available: 'available',
        startTime,
        endTime,
        image: imageUrl || '',
        rating: 0,
        reviews: [],
        totalBookings: 0,
        createdAt: serverTimestamp(),
      });

      setSnackbar({ open: true, message: 'Therapist added successfully!', severity: 'success' });
      setTimeout(() => navigate('/admin/therapists'), 1000);
    } catch (error: any) {
      setSnackbar({ open: true, message: error.message || 'Error occurred', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box p={4}>
      <Paper sx={{ maxWidth: 600, mx: 'auto', p: 4, borderRadius: 3 }}>
        <Typography variant="h5" gutterBottom>➕ Add New Therapist</Typography>

        <TextField label="Full Name" fullWidth margin="normal" value={name} onChange={(e) => setName(e.target.value)} />
        <TextField label="Email" type="email" fullWidth margin="normal" value={email} onChange={(e) => setEmail(e.target.value)} />
        <TextField label="Password" type="password" fullWidth margin="normal" value={password} onChange={(e) => setPassword(e.target.value)} />
        <TextField label="Phone Number" fullWidth margin="normal" value={phone} onChange={(e) => setPhone(e.target.value)} />

        <FormControl fullWidth margin="normal">
          <InputLabel>Gender</InputLabel>
          <Select value={gender} label="Gender" onChange={(e) => setGender(e.target.value)}>
            <MenuItem value="female">Female</MenuItem>
            <MenuItem value="male">Male</MenuItem>
            <MenuItem value="other">Other</MenuItem>
          </Select>
        </FormControl>

        <TextField label="Province" fullWidth margin="normal" value={province} onChange={(e) => setProvince(e.target.value)} />

        <Box display="flex" gap={2} mt={2}>
          <TextField
            label="Start Time"
            type="time"
            fullWidth
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label="End Time"
            type="time"
            fullWidth
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
        </Box>

        <Box mt={3}>
          <InputLabel>Profile Image</InputLabel>
          <input type="file" accept="image/*" onChange={handleImageChange} />
          {imagePreview && (
            <Box mt={2}>
              <img src={imagePreview} alt="Preview" style={{ width: 120, borderRadius: 8 }} />
            </Box>
          )}
        </Box>

        <Button
          variant="contained"
          color="primary"
          fullWidth
          sx={{ mt: 3 }}
          onClick={handleAddTherapist}
          disabled={loading}
        >
          {loading ? 'Adding...' : 'Add Therapist'}
        </Button>
      </Paper>

      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default AddTherapistPage;