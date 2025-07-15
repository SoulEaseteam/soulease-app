// EditTherapistPage.tsx (Professional Version with Full Fields)
import React, { useEffect, useState } from 'react';
import {
  Box, Button, CircularProgress, Stack, TextField, Typography, Paper, Avatar
} from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import { db, storage } from '@/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytesResumable } from 'firebase/storage';
import dayjs from 'dayjs';

const EditTherapistPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [therapist, setTherapist] = useState<any>(null);

  const [name, setName] = useState('');
  const [rating, setRating] = useState(0);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [language, setLanguage] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  useEffect(() => {
    const fetchTherapist = async () => {
      if (!id) return;
      const ref = doc(db, 'therapists', id);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = snap.data();
        setTherapist(data);
        setName(data.name || '');
        setRating(data.rating || 0);
        setStartTime(data.startTime || '');
        setEndTime(data.endTime || '');
        setLanguage(data.features?.language || '');
        setSpecialty(data.specialty || '');
        setImageUrl(data.image || '');
      }
      setLoading(false);
    };
    fetchTherapist();
  }, [id]);

  const handleUpdate = async () => {
    if (!id) return;
    const ref = doc(db, 'therapists', id);
    await updateDoc(ref, {
      name,
      rating,
      startTime,
      endTime,
      specialty,
      image: imageUrl,
      features: {
        ...therapist.features,
        language,
      },
    });
    alert('✅ Therapist updated successfully');
    navigate('/admin/therapists');
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const storageRef = ref(storage, `therapists/${id}/${file.name}`);
    const uploadTask = uploadBytesResumable(storageRef, file);
    uploadTask.on('state_changed',
      null,
      (error) => {
        console.error('Upload error', error);
        setUploading(false);
      },
      async () => {
        const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
        setImageUrl(downloadUrl);
        setUploading(false);
      }
    );
  };

  if (loading) return <Box p={4}><CircularProgress /></Box>;

  return (
    <Box maxWidth={600} mx="auto" mt={4}>
      <Typography variant="h5" fontWeight="bold" mb={2}>✏️ Edit Therapist</Typography>
      <Paper sx={{ p: 3, borderRadius: 4 }}>
        <Stack spacing={2}>
          <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} fullWidth />
          <TextField label="Rating" type="number" value={rating} onChange={(e) => setRating(parseFloat(e.target.value))} fullWidth />
          <TextField label="Start Time" value={startTime} onChange={(e) => setStartTime(e.target.value)} fullWidth />
          <TextField label="End Time" value={endTime} onChange={(e) => setEndTime(e.target.value)} fullWidth />
          <TextField label="Specialty" value={specialty} onChange={(e) => setSpecialty(e.target.value)} fullWidth />
          <TextField label="Language" value={language} onChange={(e) => setLanguage(e.target.value)} fullWidth />

          <Box>
            <Typography variant="body2" mb={1}>Profile Image</Typography>
            {uploading ? <CircularProgress /> : (
              <>
                <Avatar src={imageUrl} sx={{ width: 100, height: 100, mb: 1 }} />
                <Button variant="outlined" component="label">
                  Upload New Image
                  <input type="file" hidden accept="image/*" onChange={handleImageUpload} />
                </Button>
              </>
            )}
          </Box>

          <Button variant="contained" onClick={handleUpdate} sx={{ mt: 2 }}>
            Save Changes
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
};

export default EditTherapistPage;
