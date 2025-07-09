import React, { useEffect, useState } from 'react';
import { Box, Typography, Button, Paper } from '@mui/material';
import { useAuth } from '../hooks/useAuth';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

const UpdateLocationPage: React.FC = () => {
  const { user } = useAuth();
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(false);

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
    } catch (err) {
      alert('❌ Failed to save location.');
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

        <Button
          variant="outlined"
          fullWidth
          sx={{ mb: 2, borderRadius: 3 }}
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
      </Paper>
    </Box>
  );
};

export default UpdateLocationPage;