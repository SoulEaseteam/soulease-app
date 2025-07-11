// src/pages/UpdateLocationPage.tsx
import React, { useEffect, useState } from 'react';
import { Box, Typography, Button, Paper, Stack } from '@mui/material';
import { useAuth } from '../providers/AuthProvider';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

const UpdateLocationPage: React.FC = () => {
  const { user } = useAuth();
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [homeCoords, setHomeCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchHome = async () => {
      if (!user) return;
      const ref = doc(db, 'therapists', user.uid);
      const snap = await getDoc(ref);
      if (snap.exists() && snap.data().homeLocation) {
        setHomeCoords(snap.data().homeLocation);
      }
    };
    fetchHome();
  }, [user]);

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      alert('❌ Your browser does not support geolocation.');
      return;
    }

    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setCoords({ lat: latitude, lng: longitude });
        setLoading(false);
      },
      (err) => {
        alert('⚠️ Failed to get location: ' + err.message);
        setLoading(false);
      }
    );
  };

  const handleSaveLocation = async () => {
    if (!user || !coords) return;
    try {
      const ref = doc(db, 'therapists', user.uid);
      await updateDoc(ref, {
        currentLocation: coords,
        updatedAt: new Date(),
      });
      alert('✅ Location updated successfully!');

      // set home location if not already set
      const snap = await getDoc(ref);
      if (!snap.exists() || !snap.data().homeLocation) {
        await updateDoc(ref, { homeLocation: coords });
        setHomeCoords(coords);
      }
    } catch (err) {
      alert('❌ Failed to save location.');
    }
  };

  const handleReturnHome = async () => {
    if (!user || !homeCoords) return;
    try {
      const ref = doc(db, 'therapists', user.uid);
      await updateDoc(ref, {
        currentLocation: homeCoords,
        updatedAt: new Date(),
      });
      setCoords(homeCoords);
      alert('🏡 Returned to Home Location');
    } catch (err) {
      alert('❌ Failed to return home.');
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', px: 3, py: 5, bgcolor: '#f0f8ff' }}>
      <Typography fontWeight="bold" fontSize={20} mb={2}>
        Update Your Current Location
      </Typography>

      <Paper elevation={3} sx={{ p: 3, borderRadius: 4, background: '#fff' }}>
        <Typography fontSize={14} mb={1}>📍 Current Coordinates:</Typography>
        <Typography fontSize={14} color="text.secondary" mb={2}>
          {coords ? `Lat: ${coords.lat.toFixed(6)}, Lng: ${coords.lng.toFixed(6)}` : 'Not set yet'}
        </Typography>

        <Stack spacing={2}>
          <Button
            variant="outlined"
            fullWidth
            sx={{ borderRadius: 3 }}
            onClick={handleGetLocation}
            disabled={loading}
          >
            {loading ? 'Locating...' : 'Get Current Location'}
          </Button>

          <Button
            variant="contained"
            fullWidth
            sx={{ borderRadius: 3, bgcolor: '#1d3557', '&:hover': { bgcolor: '#2b3b53' } }}
            onClick={handleSaveLocation}
            disabled={!coords}
          >
            Save Location
          </Button>

          <Button
            variant="outlined"
            fullWidth
            sx={{ borderRadius: 3, color: '#444' }}
            onClick={handleReturnHome}
            disabled={!homeCoords}
          >
            🏠 Return to Home Location
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
};

export default UpdateLocationPage;
