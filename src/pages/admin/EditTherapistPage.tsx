// src/pages/admin/EditTherapistPage.tsx
import React, { useEffect, useState } from 'react';
import {
  Box, Button, TextField, Typography, CircularProgress, MenuItem,
} from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/firebase';

const EditTherapistPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [therapist, setTherapist] = useState<any>({});

  useEffect(() => {
    const fetchTherapist = async () => {
      try {
        const docRef = doc(db, 'therapists', id!);
        const snapshot = await getDoc(docRef);
        if (snapshot.exists()) {
          setTherapist(snapshot.data());
        }
      } catch (error) {
        console.error('Error fetching therapist:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchTherapist();
  }, [id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTherapist({ ...therapist, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    try {
      await updateDoc(doc(db, 'therapists', id!), therapist);
      navigate('/admin/therapists');
    } catch (error) {
      console.error('Error updating therapist:', error);
    }
  };

  if (loading) {
    return <Box p={3}><CircularProgress /></Box>;
  }

  return (
    <Box p={3} maxWidth={600}>
      <Typography variant="h5" mb={3}>✏️ Edit Therapist</Typography>

      <TextField
        fullWidth
        margin="normal"
        label="Name"
        name="name"
        value={therapist.name || ''}
        onChange={handleChange}
      />

      <TextField
        fullWidth
        margin="normal"
        label="Specialty"
        name="specialty"
        value={therapist.specialty || ''}
        onChange={handleChange}
      />

      <TextField
        fullWidth
        margin="normal"
        label="Rating"
        name="rating"
        type="number"
        inputProps={{ step: 0.1, min: 0, max: 5 }}
        value={therapist.rating || ''}
        onChange={handleChange}
      />

      <TextField
        fullWidth
        margin="normal"
        label="Available"
        name="available"
        select
        value={therapist.available || ''}
        onChange={handleChange}
      >
        <MenuItem value="available">Available</MenuItem>
        <MenuItem value="bookable">Bookable</MenuItem>
        <MenuItem value="resting">Resting</MenuItem>
      </TextField>

      <Box mt={3}>
        <Button variant="contained" onClick={handleSave}>💾 Save</Button>
        <Button sx={{ ml: 2 }} onClick={() => navigate(-1)}>Cancel</Button>
      </Box>
    </Box>
  );
};

export default EditTherapistPage;