import React, { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Grid from '@mui/material/Grid';
import CircularProgress from '@mui/material/CircularProgress';
import Button from '@mui/material/Button';
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
      console.log('📦 Firestore snapshot:', snapshot.size);
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
              {todayBookings.length} bookings
            </Typography>
            <Typography variant="body1" mt={1}>
              Total Today: ฿{totalToday.toLocaleString()}
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, borderRadius: 4, boxShadow: 3 }}>
            <Typography variant="h6" fontWeight="bold">
              📦 All Bookings
            </Typography>
            <Typography variant="h4" mt={1} color="primary">
              {bookings.length} bookings
            </Typography>
            <Typography variant="body1" mt={1}>
              Grand Total: ฿{totalAll.toLocaleString()}
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} mt={4}>
        <Button
          variant="outlined"
          fullWidth
          onClick={() => navigate('/admin/change-password')}
        >
          🔐 Change Password
        </Button>
        <Button
          variant="contained"
          color="error"
          fullWidth
          onClick={handleLogout}
        >
          🚪 Logout
        </Button>
      </Stack>
    </Box>
  );
};

export default AdminDashboardPage;