// src/pages/SelectLocationPage.tsx
import React, { useEffect, useRef, useState } from 'react';
import {
  Box, Typography, Button, IconButton, CircularProgress
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate, useLocation } from 'react-router-dom';

declare global {
  interface Window {
    google: any;
  }
}

const SelectLocationPage: React.FC = () => {
  const mapRef = useRef<HTMLDivElement>(null);
  const markerRef = useRef<any>(null);
  const navigate = useNavigate();
  const routerState = useLocation().state as { therapistId?: string };
  const [loading, setLoading] = useState(true);
  const [latLng, setLatLng] = useState<{ lat: number; lng: number } | null>(null);
  const [address, setAddress] = useState('');

  // Load Google Maps script dynamically
  useEffect(() => {
    const loadScript = () => {
      if (document.getElementById('google-maps-script')) return initMap();

      const script = document.createElement('script');
      script.id = 'google-maps-script';
      script.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}`;
      script.async = true;
      script.defer = true;
      script.onload = initMap;
      document.body.appendChild(script);
    };

    const initMap = () => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const initialPos = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          };

          const map = new window.google.maps.Map(mapRef.current, {
            center: initialPos,
            zoom: 16,
          });

          const marker = new window.google.maps.Marker({
            position: initialPos,
            map,
            draggable: true,
          });

          markerRef.current = marker;
          setLatLng(initialPos);
          reverseGeocode(initialPos);

          marker.addListener('dragend', () => {
            const newPos = {
              lat: marker.getPosition().lat(),
              lng: marker.getPosition().lng(),
            };
            setLatLng(newPos);
            reverseGeocode(newPos);
          });

          setLoading(false);
        },
        (err) => {
          console.error(err);
          alert('⚠️ Cannot access location. Please enable GPS.');
          setLoading(false);
        }
      );
    };

    const reverseGeocode = async ({ lat, lng }: { lat: number; lng: number }) => {
      try {
        const res = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}`
        );
        const data = await res.json();
        const result = data.results?.[0]?.formatted_address || '';
        setAddress(result);
      } catch (err) {
        console.error('Geocode error:', err);
        setAddress('');
      }
    };

    loadScript();
  }, []);

  const handleConfirm = () => {
    if (latLng) {
      navigate(`/booking/${routerState?.therapistId || ''}`, {
        state: {
          selectedLat: latLng.lat,
          selectedLng: latLng.lng,
          selectedAddress: address || `Lat: ${latLng.lat.toFixed(5)}, Lng: ${latLng.lng.toFixed(5)}`
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
        <Typography variant="h6" fontWeight="bold">Select Location</Typography>
      </Box>

      {loading ? (
        <Box display="flex" justifyContent="center" mt={8}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <Box ref={mapRef} sx={{ height: 350, borderRadius: 3, overflow: 'hidden' }} />
          <Typography mt={2} align="center" color="text.secondary">
            {address || 'Drag the pin to update address'}
          </Typography>
          <Button
            fullWidth
            variant="contained"
            onClick={handleConfirm}
            sx={{ mt: 3, py: 1.3, borderRadius: 3, fontWeight: 'bold', bgcolor: '#2b3b53' }}
          >
            Use This Location
          </Button>
        </>
      )}
    </Box>
  );
};

export default SelectLocationPage;