import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Paper, Grid, CircularProgress, Avatar, Stack
} from '@mui/material';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import dayjs from 'dayjs';
import { Therapist } from '../types/therapist';

const AdminDashboardPage: React.FC = () => {
  const [bookings, setBookings] = useState<any[]>([]);
  const [therapists, setTherapists] = useState<Therapist[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const bookingSnap = await getDocs(collection(db, 'bookings'));
      const therapistSnap = await getDocs(collection(db, 'therapists'));

      const bookingData = bookingSnap.docs.map((doc) => doc.data());
      const therapistData = therapistSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Therapist[];

      setBookings(bookingData);
      setTherapists(therapistData);
      setLoading(false);
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  const today = dayjs().format('YYYY-MM-DD');

  const todayBookings = bookings.filter((b) =>
    dayjs(b.selectedDate?.seconds * 1000).format('YYYY-MM-DD') === today
  );

  const totalRevenue = bookings.reduce((sum, b) => sum + (b.totalPrice || 0), 0);

  const bookingCountPerTherapist: Record<string, number> = {};

  bookings.forEach((b) => {
    if (b.therapistId) {
      bookingCountPerTherapist[b.therapistId] = (bookingCountPerTherapist[b.therapistId] || 0) + 1;
    }
  });

  const topTherapists = Object.entries(bookingCountPerTherapist)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([id, count]) => {
      const therapist = therapists.find((t) => t.id === id);
      return {
        id,
        name: therapist?.name || 'Unknown',
        image: therapist?.image || '/images/user.png',
        count,
      };
    });

  return (
    <Box sx={{ minHeight: '100vh', background: '#f3f5f7', py: 4 }}>
      <Box sx={{ maxWidth: 900, mx: 'auto', px: 2 }}>
        <Typography variant="h4" fontWeight="bold" mb={4}>
          Admin Dashboard
        </Typography>

        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 3, borderRadius: 3 }}>
              <Typography variant="h6">Today's Bookings</Typography>
              <Typography variant="h4" fontWeight="bold">{todayBookings.length}</Typography>
            </Paper>
          </Grid>

          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 3, borderRadius: 3 }}>
              <Typography variant="h6">Total Bookings</Typography>
              <Typography variant="h4" fontWeight="bold">{bookings.length}</Typography>
            </Paper>
          </Grid>

          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 3, borderRadius: 3 }}>
              <Typography variant="h6">Total Revenue</Typography>
              <Typography variant="h4" fontWeight="bold">
                ฿{totalRevenue.toLocaleString()}
              </Typography>
            </Paper>
          </Grid>
        </Grid>

        <Typography variant="h6" mt={5} mb={2}>
          🔝 Top 3 Most Booked Therapists
        </Typography>

        <Stack spacing={2}>
          {topTherapists.map((t, index) => (
            <Paper key={t.id} sx={{ p: 2, borderRadius: 2 }}>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Avatar src={t.image} sx={{ width: 48, height: 48 }} />
                <Box>
                  <Typography fontWeight="bold">{index + 1}. {t.name}</Typography>
                  <Typography color="text.secondary">{t.count} bookings</Typography>
                </Box>
              </Stack>
            </Paper>
          ))}
        </Stack>
      </Box>
    </Box>
  );
};

export default AdminDashboardPage;