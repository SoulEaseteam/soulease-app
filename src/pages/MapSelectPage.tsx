// src/pages/MapSelectPage.tsx

import React, { useState, useRef, useEffect } from 'react';
import { Box, Paper, TextField, IconButton, Typography, Button } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import RoomIcon from '@mui/icons-material/Room';
import { useNavigate, useLocation } from 'react-router-dom';

declare global {
  interface Window {
    google: any;
  }
}

const MapSelectPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<any>(null);
  const [marker, setMarker] = useState<any>(null);
  const [address, setAddress] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  const queryParams = new URLSearchParams(location.search);
  const redirectPage = queryParams.get('redirect') || 'booking';

  const loadGoogleMapsScript = (callback: () => void) => {
    if (typeof window.google === 'object' && window.google.maps) {
      callback();
      return;
    }
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = callback;
    document.body.appendChild(script);
  };

  useEffect(() => {
    loadGoogleMapsScript(() => {
      if (!mapRef.current) return;

      const gmap = new window.google.maps.Map(mapRef.current, {
        center: { lat: 13.7563, lng: 100.5018 }, // Bangkok
        zoom: 13,
        disableDefaultUI: true,
      });

      gmap.addListener('click', (e: any) => {
        placeMarker(e.latLng);
        reverseGeocode(e.latLng.lat(), e.latLng.lng());
      });

      const input = document.getElementById('place-search') as HTMLInputElement;
      const autocomplete = new window.google.maps.places.Autocomplete(input);
      autocomplete.setFields(['geometry', 'formatted_address']);
      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        if (place.geometry) {
          const loc = place.geometry.location;
          gmap.panTo(loc);
          placeMarker(loc);
          setAddress(place.formatted_address || '');
        }
      });

      setMap(gmap);
    });
  }, []);

  const placeMarker = (pos: any) => {
    if (marker) marker.setMap(null);
    const m = new window.google.maps.Marker({ position: pos, map });
    setMarker(m);
    setCoords({ lat: pos.lat(), lng: pos.lng() });
  };

  const reverseGeocode = (lat: number, lng: number) => {
    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ location: { lat, lng } }, (results: any, status: any) => {
      if (status === 'OK' && results[0]) {
        setAddress(results[0].formatted_address);
      }
    });
  };

  const handleConfirm = () => {
    if (!coords) return alert('⚠️ Please select a location on the map.');
    navigate(`/${redirectPage}`, {
      state: {
        selectedLat: coords.lat,
        selectedLng: coords.lng,
        selectedAddress: address,
      },
    });
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f8f9fa', fontFamily: 'Prompt, sans-serif', pb: 6 }}>
      {/* 🔙 Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', p: 2 }}>
        <IconButton onClick={() => navigate(-1)}>
          <ArrowBackIcon />
        </IconButton>
        <Typography fontWeight="bold" fontSize={18} ml={1}>Select Location</Typography>
      </Box>

      {/* 🔍 Address Input */}
      <Box sx={{ px: 2, pb: 2 }}>
        <TextField
          id="place-search"
          fullWidth
          variant="outlined"
          size="small"
          placeholder="Search address..."
          sx={{
            borderRadius: 3,
            bgcolor: '#fff',
            '& .MuiOutlinedInput-root': { borderRadius: 3 },
          }}
          onChange={(e) => setAddress(e.target.value)}
        />
      </Box>

      {/* 🗺 Map */}
      <Paper sx={{ mx: 2, borderRadius: 4, height: '60vh', overflow: 'hidden' }} elevation={3}>
        <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
      </Paper>

      {/* 📍 Confirm */}
      <Box sx={{ px: 2, pt: 2 }}>
        {address && (
          <Typography variant="body2" mb={1}>📍 {address}</Typography>
        )}
        <Button
          variant="contained"
          fullWidth
          onClick={handleConfirm}
          startIcon={<RoomIcon />}
          sx={{
            borderRadius: 3,
            py: 1.3,
            fontWeight: 'bold',
            fontSize: 16,
            bgcolor: '#1d3557',
            '&:hover': { bgcolor: '#2c3e60' },
          }}
        >
          Confirm Location
        </Button>
      </Box>
    </Box>
  );
};

export default MapSelectPage;