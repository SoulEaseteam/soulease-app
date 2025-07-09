// src/pages/TherapistProfilePage.tsx

import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Avatar,
  Stack,
  Button,
  Paper,
  Divider,
} from '@mui/material';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import LogoutIcon from '@mui/icons-material/Logout';
import { useAuth } from '../hooks/useAuth';
import { signOut } from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';

const TherapistProfilePage: React.FC = () => {
  const { user } = useAuth();
  const [therapistData, setTherapistData] = useState<any>(null);
  const [announcement, setAnnouncement] = useState('');

  useEffect(() => {
    const fetchTherapist = async () => {
      if (!user) return;
      const ref = doc(db, 'therapists', user.uid);
      const snap = await getDoc(ref);
      if (snap.exists()) setTherapistData(snap.data());
    };

    const fetchAnnouncement = async () => {
      const ref = doc(db, 'announcements', 'weekly');
      const snap = await getDoc(ref);
      if (snap.exists()) setAnnouncement(snap.data().message);
    };

    fetchTherapist();
    fetchAnnouncement();
  }, [user]);

  const handleUpdateLocation = () => {
    window.location.href = '/update-location';
  };

  const handleLogout = async () => {
    await signOut(auth);
    window.location.href = '/login';
  };

  if (!therapistData) return <Box p={4}>Loading...</Box>;

  return (
    <Box sx={{ bgcolor: 'linear-gradient(to bottom, #d0f1f7, #f0eaff)', minHeight: '100vh', pt: 6 }}>
      <Box sx={{ maxWidth: 430, mx: 'auto', px: 3 }}>
        <Paper
          elevation={3}
          sx={{
            p: 3,
            borderRadius: 4,
            mb: 3,
            textAlign: 'center',
            background: 'linear-gradient(to bottom, #e0f7fa, #fff)',
          }}
        >
          <Avatar sx={{ width: 80, height: 80, mx: 'auto', mb: 1 }} src={therapistData.image || ''} />
          <Typography fontWeight="bold" fontSize={18}>
            {therapistData.name || 'Therapist'}
          </Typography>
          <Typography fontSize={14} color="text.secondary">
            ID: {user?.uid.slice(0, 6)}
          </Typography>
        </Paper>

        <Stack direction="row" justifyContent="space-between" sx={{ mb: 2 }}>
          <Box textAlign="center">
            <Typography fontWeight="bold">{therapistData.totalBookings || 0}</Typography>
            <Typography fontSize={12}>Total Bookings</Typography>
          </Box>
          <Box textAlign="center">
            <Typography fontWeight="bold">{therapistData.rating || 0} ⭐</Typography>
            <Typography fontSize={12}>Rating</Typography>
          </Box>
          <Box textAlign="center">
            <Typography fontWeight="bold">{therapistData.positiveScore || 0}%</Typography>
            <Typography fontSize={12}>Positive Score</Typography>
          </Box>
        </Stack>

        <Paper variant="outlined" sx={{ p: 2, borderRadius: 3, background: '#f8f8ff', mb: 3 }}>
          <Typography fontWeight="bold" mb={1}>📢 Announcement</Typography>
          <Typography fontSize={14}>{announcement || 'No announcement available'}</Typography>
        </Paper>

        <Stack direction="row" spacing={2} justifyContent="space-between" mb={3}>
          <Button fullWidth variant="contained" startIcon={<CalendarMonthIcon />} onClick={() => window.location.href = '/my-bookings'}>
            My Bookings
          </Button>
          <Button fullWidth variant="outlined" startIcon={<AssignmentTurnedInIcon />} onClick={() => window.location.href = '/booking-status'}>
            Booking Status
          </Button>
          <Button fullWidth variant="outlined" startIcon={<LocationOnIcon />} onClick={handleUpdateLocation}>
            Update Location
          </Button>
        </Stack>

        <Divider sx={{ my: 2 }} />

        <Button
          variant="text"
          color="error"
          startIcon={<LogoutIcon />}
          fullWidth
          onClick={handleLogout}
        >
          Log Out
        </Button>
      </Box>
    </Box>
  );
};

export default TherapistProfilePage;