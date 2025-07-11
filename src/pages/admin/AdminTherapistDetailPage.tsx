// src/pages/admin/AdminTherapistDetailPage.tsx

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/firebase';
import {
  Box,
  Typography,
  Avatar,
  Switch,
  FormControlLabel,
  Divider,
  CircularProgress,
  Button,
  Paper,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

const AdminTherapistDetailPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [therapist, setTherapist] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTherapist = async () => {
      const ref = doc(db, 'therapists', id!);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        setTherapist(snap.data());
      }
      setLoading(false);
    };
    fetchTherapist();
  }, [id]);

  const toggleHoliday = async () => {
    if (!therapist) return;
    const newStatus = therapist.manualStatus === 'holiday' ? 'available' : 'holiday';
    await updateDoc(doc(db, 'therapists', id!), {
      manualStatus: newStatus,
    });
    setTherapist((prev: any) => ({ ...prev, manualStatus: newStatus }));
  };

  if (loading) {
    return (
      <Box p={3} textAlign="center">
        <CircularProgress />
      </Box>
    );
  }

  if (!therapist) {
    return (
      <Box p={3}>
        <Typography color="error">Therapist not found.</Typography>
      </Box>
    );
  }

  return (
    <Box p={3} maxWidth={600} mx="auto">
      <Button onClick={() => navigate(-1)} startIcon={<ArrowBackIcon />} sx={{ mb: 2 }}>
        กลับ
      </Button>

      <Paper elevation={3} sx={{ p: 3, borderRadius: 4 }}>
        <Box display="flex" alignItems="center" gap={2}>
          <Avatar src={therapist.image} alt={therapist.name} sx={{ width: 70, height: 70 }} />
          <Box>
            <Typography variant="h5" fontWeight="bold">
              {therapist.name}
            </Typography>
            <Typography variant="body2">{therapist.experience} experience</Typography>
          </Box>
        </Box>

        <Divider sx={{ my: 2 }} />

        <FormControlLabel
          control={
            <Switch
              checked={therapist.manualStatus === 'holiday'}
              onChange={toggleHoliday}
              color="error"
            />
          }
          label="🛑 Toggle Holiday Mode"
        />

        <Box mt={2}>
          <Typography>
            <b>Current Status:</b>{' '}
            {therapist.manualStatus === 'holiday' ? '❌ Holiday' : '✅ Available'}
          </Typography>
          <Typography>
            <b>Total Bookings:</b> {therapist.totalBookings ?? 0}
          </Typography>
          <Typography>
            <b>Today’s Bookings:</b> {therapist.todayBookings ?? 0}
          </Typography>
          <Typography>
            <b>Rating:</b> {therapist.rating ?? 'N/A'} ⭐
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
};

export default AdminTherapistDetailPage;