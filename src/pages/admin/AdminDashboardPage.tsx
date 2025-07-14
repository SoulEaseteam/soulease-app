// ✅ AdminDashboardPage.tsx
import React, { useEffect, useState } from 'react';
import { Box, Typography, Paper, Stack } from '@mui/material';
import { db } from '../../firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import dayjs from 'dayjs';

interface Booking {
  id: string;
  createdAt: { seconds: number };
  total: number;
}

const AdminDashboardPage: React.FC = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'bookings'), (snapshot) => {
      const data: Booking[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Booking[];
      setBookings(data);
    });
    return () => unsubscribe();
  }, []);

  const today = dayjs().format('YYYY-MM-DD');
  const todayBookings = bookings.filter(b => dayjs.unix(b.createdAt.seconds).format('YYYY-MM-DD') === today);
  const totalToday = todayBookings.reduce((sum, b) => sum + b.total, 0);
  const totalAll = bookings.reduce((sum, b) => sum + b.total, 0);

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" fontWeight="bold">📊 Admin Dashboard</Typography>
      <Stack direction="row" spacing={2} mt={3}>
        <Paper sx={{ p: 2, flex: 1 }}>
          <Typography variant="h6">📅 Bookings Today</Typography>
          <Typography>{todayBookings.length} รายการ</Typography>
          <Typography color="primary">฿{totalToday.toLocaleString()}</Typography>
        </Paper>
        <Paper sx={{ p: 2, flex: 1 }}>
          <Typography variant="h6">📦 Total Bookings</Typography>
          <Typography>{bookings.length} รายการ</Typography>
          <Typography color="primary">฿{totalAll.toLocaleString()}</Typography>
        </Paper>
      </Stack>
    </Box>
  );
};

export default AdminDashboardPage;
