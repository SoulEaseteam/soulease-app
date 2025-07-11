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
  Switch,
  FormControlLabel,
  Snackbar,
} from '@mui/material';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import LogoutIcon from '@mui/icons-material/Logout';
import NotificationsIcon from '@mui/icons-material/Notifications';
import ScheduleIcon from '@mui/icons-material/Schedule';
import GpsFixedIcon from '@mui/icons-material/GpsFixed';
import { useAuth } from '../providers/AuthProvider';
import { signOut } from 'firebase/auth';
import { auth, db } from '../firebase';
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  onSnapshot,
  Timestamp,
} from 'firebase/firestore';

const TherapistProfilePage: React.FC = () => {
  const { user } = useAuth();
  const [therapistData, setTherapistData] = useState<any>(null);
  const [announcement, setAnnouncement] = useState('');
  const [autoTime, setAutoTime] = useState(false);
  const [autoGPS, setAutoGPS] = useState(false);
  const [notification, setNotification] = useState(false);
  const [snackbar, setSnackbar] = useState('');

  useEffect(() => {
    if (!user) return;
    const ref = doc(db, 'therapists', user.uid);
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) setTherapistData(snap.data());
    });

    const fetchAnnouncement = async () => {
      const ref = doc(db, 'announcements', 'weekly');
      const snap = await getDoc(ref);
      if (snap.exists()) setAnnouncement(snap.data().message);
    };

    fetchAnnouncement();
    return () => unsub();
  }, [user]);

  // Auto GPS Status Update
  useEffect(() => {
    if (!autoGPS || !therapistData?.manualStatus) return;
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude, longitude } = pos.coords;
      const inZone = latitude > 13.6 && latitude < 13.9 && longitude > 100.4 && longitude < 100.6;
      const status = inZone ? 'bookable' : 'resting';
      if (therapistData.manualStatus !== status) {
        await updateDoc(doc(db, 'therapists', user!.uid), { manualStatus: status });
        setSnackbar(`Status auto-set to ${status}`);
      }
    });
  }, [autoGPS, therapistData]);

  // Auto Time Status Update
  useEffect(() => {
    if (!autoTime || !therapistData?.startTime || !therapistData?.endTime) return;
    const interval = setInterval(() => {
      const now = new Date();
      const [startH, startM] = therapistData.startTime.split(':').map(Number);
      const [endH, endM] = therapistData.endTime.split(':').map(Number);
      const start = new Date(now);
      const end = new Date(now);
      start.setHours(startH, startM);
      end.setHours(endH, endM);
      const status = now >= start && now <= end ? 'bookable' : 'resting';
      if (therapistData.manualStatus !== status) {
        updateDoc(doc(db, 'therapists', user!.uid), { manualStatus: status });
        setSnackbar(`Status auto-set to ${status} (time-based)`);
      }
    }, 60000);
    return () => clearInterval(interval);
  }, [autoTime, therapistData]);

  const handleLogout = async () => {
    await signOut(auth);
    window.location.href = '/login';
  };

  const handleUpdateLocation = () => {
    window.location.href = '/update-location';
  };

  if (!therapistData) return <Box p={4}>Loading...</Box>;

  return (
    <Box sx={{ bgcolor: 'linear-gradient(to bottom, #d0f1f7, #f0eaff)', minHeight: '100vh', pt: 6 }}>
      <Box sx={{ maxWidth: 430, mx: 'auto', px: 3 }}>
        <Paper elevation={3} sx={{ p: 3, borderRadius: 4, mb: 3, textAlign: 'center', background: 'linear-gradient(to bottom, #e0f7fa, #fff)' }}>
          <Avatar sx={{ width: 80, height: 80, mx: 'auto', mb: 1 }} src={therapistData.image || ''} />
          <Typography fontWeight="bold" fontSize={18}>{therapistData.name}</Typography>
          <Typography fontSize={14} color="text.secondary">ID: {user?.uid.slice(0, 6)}</Typography>
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
            <Typography fontSize={12}>Positive</Typography>
          </Box>
        </Stack>

        <Paper variant="outlined" sx={{ p: 2, borderRadius: 3, background: '#f8f8ff', mb: 3 }}>
          <Typography fontWeight="bold" mb={1}>📢 Announcement</Typography>
          <Typography fontSize={14}>{announcement || 'No announcement'}</Typography>
        </Paper>

        {/* ✅ Auto Systems */}
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 3, background: '#fff7f0', mb: 3 }}>
          <Typography fontWeight="bold" mb={1}>⚙️ Auto Systems</Typography>
          <FormControlLabel control={<Switch checked={notification} onChange={(e) => setNotification(e.target.checked)} />} label={<><NotificationsIcon sx={{ mr: 1 }} />Notify on Booking</>} />
          <FormControlLabel control={<Switch checked={autoTime} onChange={(e) => setAutoTime(e.target.checked)} />} label={<><ScheduleIcon sx={{ mr: 1 }} />Auto by Time</>} />
          <FormControlLabel control={<Switch checked={autoGPS} onChange={(e) => setAutoGPS(e.target.checked)} />} label={<><GpsFixedIcon sx={{ mr: 1 }} />Auto by GPS</>} />
        </Paper>

        <Stack direction="row" spacing={2} justifyContent="space-between" mb={3}>
          <Button fullWidth variant="contained" startIcon={<CalendarMonthIcon />} onClick={() => window.location.href = '/my-bookings'}>My Bookings</Button>
          <Button fullWidth variant="outlined" startIcon={<AssignmentTurnedInIcon />} onClick={() => window.location.href = '/booking-status'}>Status</Button>
          <Button fullWidth variant="outlined" startIcon={<LocationOnIcon />} onClick={handleUpdateLocation}>Location</Button>
        </Stack>

        <Divider sx={{ my: 2 }} />
        <Button variant="text" color="error" startIcon={<LogoutIcon />} fullWidth onClick={handleLogout}>Log Out</Button>
      </Box>
      <Snackbar open={!!snackbar} autoHideDuration={3000} onClose={() => setSnackbar('')} message={snackbar} />
    </Box>
  );
};

export default TherapistProfilePage;
