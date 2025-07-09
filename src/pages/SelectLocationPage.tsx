// src/pages/SelectLocationPage.tsx

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  IconButton,
  CircularProgress,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate } from 'react-router-dom';

const SelectLocationPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        setLoading(false);
      },
      (err) => {
        setError('Unable to retrieve your location. Please enable location services.');
        setLoading(false);
      }
    );
  }, []);

  const handleSelect = () => {
    if (location) {
      navigate('/location', {
        state: {
          selectedLat: location.lat,
          selectedLng: location.lng,
          selectedAddress: `Lat: ${location.lat.toFixed(5)}, Lng: ${location.lng.toFixed(5)}`,
        },
      });
    }
  };

  return (
    <Box sx={{ p: 3, pb: 8, minHeight: '100vh', background: '#f0f4f8' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <IconButton onClick={() => navigate(-1)} sx={{ mr: 1 }}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h6" fontWeight="bold">
          Select Location
        </Typography>
      </Box>

      {loading ? (
        <Box display="flex" flexDirection="column" alignItems="center" mt={8}>
          <CircularProgress />
          <Typography mt={2}>Fetching your location...</Typography>
        </Box>
      ) : error ? (
        <Typography color="error" mt={4} textAlign="center">
          {error}
        </Typography>
      ) : (
        <>
          <iframe
            title="Map"
            width="100%"
            height="320"
            frameBorder="0"
            style={{ borderRadius: 12 }}
            src={`https://maps.google.com/maps?q=${location?.lat},${location?.lng}&z=16&output=embed`}
            allowFullScreen
          />

          <Button
            fullWidth
            variant="contained"
            sx={{ mt: 3, py: 1.3, borderRadius: 3, fontWeight: 'bold', bgcolor: '#2b3b53' }}
            onClick={handleSelect}
          >
            Use This Location
          </Button>
        </>
      )}
    </Box>
  );
};

export default SelectLocationPage;
