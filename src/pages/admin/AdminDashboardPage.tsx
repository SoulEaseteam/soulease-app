// src/pages/admin/AdminDashboardPage.tsx

import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Stack,
  Grid,
  CircularProgress,
  Button,
} from '@mui/material';
import { db } from '@/firebase';
import { collection, onSnapshot, DocumentData } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import 'dayjs/locale/th';

interface Booking {
  id: string;
  createdAt: { seconds: number };
  total: number;
}

const AdminDashboardPage: React.FC = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'bookings'), (snapshot) => {
      const data: Booking[] = snapshot.docs.map((doc) => {
        const booking = doc.data() as DocumentData;
        return {
          id: doc.id,
          createdAt: booking.createdAt ?? { seconds: 0 },
          total: booking.total ?? 0,
        };
      });
      setBookings(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const today = dayjs().format('YYYY-MM-DD');
  const todayBookings = bookings.filter(
    (b) => dayjs.unix(b.createdAt.seconds).format('YYYY-MM-DD') === today
  );
  const totalToday = todayBookings.reduce((sum, b) => sum + b.total, 0);
  const totalAll = bookings.reduce((sum, b) => sum + b.total, 0);

  const handleLogout = () => {
    localStorage.clear();
    navigate('/admin/login');
  };

  if (loading) {
    return (
      <Box sx={{ p: 5, textAlign: 'center' }}>
        <CircularProgress />
        <Typography mt={2}>Loading bookings...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, fontFamily: 'Prompt, sans-serif' }}>
      <Typography variant="h5" fontWeight="bold" mb={3}>
        📊 Admin Dashboard
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, borderRadius: 4, boxShadow: 3 }}>
            <Typography variant="h6" fontWeight="bold">
              📅 Bookings Today
            </Typography>
            <Typography variant="h4" mt={1} color="primary">
              {todayBookings.length} รายการ
            </Typography>
            <Typography variant="body1" mt={1}>
              ยอดวันนี้: ฿{totalToday.toLocaleString()}
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, borderRadius: 4, boxShadow: 3 }}>
            <Typography variant="h6" fontWeight="bold">
              📦 All Bookings
            </Typography>
            <Typography variant="h4" mt={1} color="primary">
              {bookings.length} รายการ
            </Typography>
            <Typography variant="body1" mt={1}>
              ยอดรวมทั้งหมด: ฿{totalAll.toLocaleString()}
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} mt={4}>
        <Button
          variant="outlined"
          fullWidth={true}
          onClick={() => navigate('/admin/change-password')}
        >
          🔐 Change Password
        </Button>
        <Button
          variant="contained"
          color="error"
          fullWidth={true}
          onClick={handleLogout}
        >
          🚪 Logout
        </Button>
      </Stack>
    </Box>
  );
};

export default AdminDashboardPage;