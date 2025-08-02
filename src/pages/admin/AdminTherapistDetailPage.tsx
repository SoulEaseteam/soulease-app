// src/pages/admin/AdminTherapistDetailPage.tsx
import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Button,
  Chip,
  Grid,
  Avatar,
  Divider,
  Stack,
  TextField,
  MenuItem,
} from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  updateDoc,
} from 'firebase/firestore';
import { db } from '@/firebase';
import dayjs from 'dayjs';

const statusOptions = ['available', 'holiday', 'bookable', 'resting'];

const AdminTherapistDetailPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [therapist, setTherapist] = useState<any>(null);
  const [todayBookings, setTodayBookings] = useState(0);
  const [totalBookings, setTotalBookings] = useState(0);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    startTime: '',
    endTime: '',
    rating: '',
    reviews: '',
    manualStatus: '',
  });

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      setLoading(true);

      const docRef = doc(db, 'therapists', id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setTherapist({ id: docSnap.id, ...data });
        setFormData({
          startTime: data.startTime || '',
          endTime: data.endTime || '',
          rating: data.rating?.toString() || '',
          reviews: data.reviews?.toString() || '',
          manualStatus: data.manualStatus || 'available',
        });
      }

      const q = query(collection(db, 'bookings'), where('therapistId', '==', id));
      const snapshot = await getDocs(q);
      const today = dayjs().format('YYYY-MM-DD');
      let todayCount = 0;
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.date === today) todayCount++;
      });
      setTodayBookings(todayCount);
      setTotalBookings(snapshot.size);
      setLoading(false);
    };

    fetchData();
  }, [id]);

  const computedStatus = () => {
    if (!therapist) return 'N/A';
    if (formData.manualStatus === 'holiday') return 'holiday';
    const now = new Date();
    const [startHour = 0, startMin = 0] = formData.startTime?.split(':').map(Number) || [];
    const [endHour = 0, endMin = 0] = formData.endTime?.split(':').map(Number) || [];
    const start = new Date(now);
    const end = new Date(now);
    start.setHours(startHour, startMin, 0);
    end.setHours(endHour, endMin, 0);
    if (end <= start) end.setDate(end.getDate() + 1);
    const inWorkingHours = now >= start && now <= end;
    return inWorkingHours ? (therapist.isBooked ? 'bookable' : 'available') : 'resting';
  };

  const handleSave = async () => {
    if (!therapist) return;
    await updateDoc(doc(db, 'therapists', therapist.id), {
      startTime: formData.startTime,
      endTime: formData.endTime,
      rating: Number(formData.rating),
      reviews: Number(formData.reviews),
      manualStatus: formData.manualStatus,
    });
    setTherapist({ ...therapist, ...formData });
    setEditing(false);
  };

  if (loading) return <Box p={3}><CircularProgress /></Box>;
  if (!therapist) return <Typography>Therapist not found.</Typography>;

  return (
    <Box p={3}>
      <Button onClick={() => navigate(-1)}>&larr; Back</Button>
      <Typography variant="h4" gutterBottom>👤 Therapist Detail</Typography>
      <Divider sx={{ my: 2 }} />

      <Stack direction="row" spacing={2} alignItems="center">
        <Avatar src={therapist.image} sx={{ width: 80, height: 80 }} />
        <Box>
          <Typography variant="h6">{therapist.name}</Typography>
          <Chip
            label={`Manual: ${formData.manualStatus}`}
            color="default"
            size="small"
            sx={{ mr: 1 }}
          />
          <Chip
            label={`Status: ${computedStatus()}`}
            color="info"
            size="small"
          />
          <Typography variant="body2" mt={1}>
            Specialty: {therapist.specialty || 'N/A'}
          </Typography>
        </Box>
      </Stack>

      <Grid container spacing={2} mt={3}>
        <Grid item xs={12} sm={6}>
          {editing ? (
            <>
              <TextField
                fullWidth
                label="Rating"
                type="number"
                inputProps={{ step: 0.1 }}
                value={formData.rating}
                onChange={(e) => setFormData({ ...formData, rating: e.target.value })}
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                label="Reviews"
                type="number"
                value={formData.reviews}
                onChange={(e) => setFormData({ ...formData, reviews: e.target.value })}
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                label="Start Time"
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                label="End Time"
                value={formData.endTime}
                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
              />
            </>
          ) : (
            <>
              <Typography>⭐ Rating: {therapist.rating ?? 'N/A'}</Typography>
              <Typography>💬 Reviews: {therapist.reviews ?? 0}</Typography>
              <Typography>🕐 Start: {therapist.startTime ?? 'N/A'}</Typography>
              <Typography>🕔 End: {therapist.endTime ?? 'N/A'}</Typography>
            </>
          )}
        </Grid>
        <Grid item xs={12} sm={6}>
          <Typography>📆 Bookings Today: {todayBookings}</Typography>
          <Typography>📊 Total Bookings: {totalBookings}</Typography>
          <TextField
            select
            fullWidth
            label="Manual Status"
            value={formData.manualStatus}
            onChange={(e) => setFormData({ ...formData, manualStatus: e.target.value })}
            disabled={!editing}
            sx={{ mt: editing ? 2 : 4 }}
          >
            {statusOptions.map((option) => (
              <MenuItem key={option} value={option}>
                {option.charAt(0).toUpperCase() + option.slice(1)}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
      </Grid>

      <Stack direction="row" spacing={2} mt={3}>
        {editing ? (
          <>
            <Button variant="contained" onClick={handleSave}>💾 Save</Button>
            <Button variant="outlined" onClick={() => setEditing(false)}>Cancel</Button>
          </>
        ) : (
          <Button variant="outlined" onClick={() => setEditing(true)}>✏️ Edit</Button>
        )}
      </Stack>
    </Box>
  );
};

export default AdminTherapistDetailPage;