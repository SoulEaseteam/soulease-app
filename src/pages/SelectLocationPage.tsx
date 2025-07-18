import React, { useEffect, useRef, useState } from 'react';
import {
  Box, Button, Typography, TextField, IconButton,
  InputAdornment, Snackbar, useMediaQuery, useTheme,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { useNavigate, useLocation } from 'react-router-dom';
import { GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api';

const containerStyle = {
  width: '100%',
  height: '60vh',
  borderRadius: '12px',
};

const defaultCenter = {
  lat: 13.736717,
  lng: 100.523186,
};

const SelectLocationPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as {
    therapistId: string;
    service: string;
  };

  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [address, setAddress] = useState('');
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries: ['places'],
  });

  useEffect(() => {
    if (isLoaded && inputRef.current && window.google) {
      const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current);
      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        if (place.geometry?.location) {
          const lat = place.geometry.location.lat();
          const lng = place.geometry.location.lng();
          setCurrentLocation({ lat, lng });
          setAddress(place.formatted_address || '');
          if (mapRef.current) mapRef.current.panTo({ lat, lng });
        }
      });
    }
  }, [isLoaded]);

  const getAddressFromLatLng = (lat: number, lng: number) => {
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ location: { lat, lng } }, (results, status) => {
      if (status === 'OK' && results?.length) {
        setAddress(results[0].formatted_address);
      } else {
        setAddress('Unable to retrieve address');
      }
    });
  };

  const handleMapClick = (e: google.maps.MapMouseEvent) => {
    if (e.latLng) {
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      setCurrentLocation({ lat, lng });
      getAddressFromLatLng(lat, lng);
    }
  };

  const handleUseMyLocation = () => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setCurrentLocation({ lat, lng });
        getAddressFromLatLng(lat, lng);
        if (mapRef.current) mapRef.current.panTo({ lat, lng });
      },
      () => {
        alert('Unable to access your location');
      }
    );
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(address);
    setCopied(true);
  };

  const handleConfirm = () => {
    if (currentLocation && address && state?.therapistId && state?.service) {
      navigate(
        `/booking/${state.therapistId}?service=${encodeURIComponent(state.service)}&selectedLat=${currentLocation.lat}&selectedLng=${currentLocation.lng}&selectedAddress=${encodeURIComponent(address)}`
      );
    } else {
      alert('Please select the complete position first.');
    }
  };

  if (!isLoaded) return <Typography>Loading map...</Typography>;

  return (
    <Box
      p={isMobile ? 1 : 3}
      sx={{
        fontFamily: 'Trebuchet MS, sans-serif',
        maxWidth: 600,
        margin: '0 auto',
      }}
    >
      <Typography variant="h6" gutterBottom>
        Choose the location where you want the masseuse to go.
      </Typography>

      <input
        ref={inputRef}
        placeholder="Find location"
        style={{
          width: '100%',
          padding: '12px',
          fontSize: '16px',
          borderRadius: '8px',
          border: '1px solid #ccc',
          marginBottom: '16px',
        }}
      />

      <Box
        sx={{
          borderRadius: '12px',
          overflow: 'hidden',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        }}
      >
        <GoogleMap
          mapContainerStyle={containerStyle}
          center={currentLocation || defaultCenter}
          zoom={15}
          onClick={handleMapClick}
         onLoad={(map: google.maps.Map) => {
          mapRef.current = map;
}}
        >
          {currentLocation && <Marker position={currentLocation} />}
        </GoogleMap>
      </Box>

      <Button
        variant="outlined"
        fullWidth
        onClick={handleUseMyLocation}
        sx={{ mt: 2, mb: 1, borderRadius: '12px', textTransform: 'none' }}
      >
        Use my current location
      </Button>

      <TextField
        label="Address"
        value={address}
        onChange={(e) => setAddress(e.target.value)}
        fullWidth
        multiline
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <IconButton onClick={handleCopy}>
                <ContentCopyIcon />
              </IconButton>
            </InputAdornment>
          ),
        }}
        sx={{ mt: 1 }}
      />

      <Button
        variant="contained"
        fullWidth
        onClick={handleConfirm}
        disabled={!currentLocation || !address}
        sx={{ mt: 3, borderRadius: '12px', textTransform: 'none' }}
      >
        Confirm this location
      </Button>

      <Snackbar
        open={copied}
        autoHideDuration={2000}
        onClose={() => setCopied(false)}
        message="Address copied to clipboard"
      />
    </Box>
  );
};

export default SelectLocationPage;