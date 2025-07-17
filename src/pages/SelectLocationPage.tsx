// SelectLocationPage.tsx
import React, { useRef, useState } from 'react';
import {
  Box,
  Button,
  Typography,
  TextField,
  IconButton,
  InputAdornment,
  Snackbar,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { useNavigate } from 'react-router-dom';
import { GoogleMap, Marker, useJsApiLoader, Autocomplete } from '@react-google-maps/api';

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
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [address, setAddress] = useState('');
  const [copied, setCopied] = useState(false);
  const mapRef = useRef<google.maps.Map | null>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries: ['places'],
  });

  const handleMapClick = (e: google.maps.MapMouseEvent) => {
    if (e.latLng) {
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      setCurrentLocation({ lat, lng });
      getAddressFromLatLng(lat, lng);
    }
  };

  const getAddressFromLatLng = (lat: number, lng: number) => {
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ location: { lat, lng } }, (results, status) => {
      if (status === 'OK' && results && results.length > 0) {
        setAddress(results[0].formatted_address);
      } else {
        setAddress('ไม่สามารถดึงที่อยู่ได้');
      }
    });
  };

  const handleUseMyLocation = () => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setCurrentLocation({ lat, lng });
        getAddressFromLatLng(lat, lng);
        if (mapRef.current) {
          mapRef.current.panTo({ lat, lng });
        }
      },
      () => {
        alert('ไม่สามารถเข้าถึงตำแหน่งของคุณได้');
      }
    );
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(address);
    setCopied(true);
  };

  const handleConfirm = () => {
    if (currentLocation && address) {
      navigate('/booking', {
        state: {
          selectedLat: currentLocation.lat,
          selectedLng: currentLocation.lng,
          selectedAddress: address,
        },
      });
    }
  };

  const handlePlaceChanged = () => {
    const place = autocompleteRef.current?.getPlace();
    if (place?.geometry?.location) {
      const lat = place.geometry.location.lat();
      const lng = place.geometry.location.lng();
      setCurrentLocation({ lat, lng });
      setAddress(place.formatted_address || '');
      if (mapRef.current) {
        mapRef.current.panTo({ lat, lng });
      }
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
        เลือกตำแหน่งที่คุณต้องการให้หมอไป
      </Typography>

      {/* 🔍 Autocomplete Search Box */}
      <Autocomplete
        onLoad={(autocomplete) => (autocompleteRef.current = autocomplete)}
        onPlaceChanged={handlePlaceChanged}
      >
        <TextField
          label="ค้นหาสถานที่"
          placeholder="พิมพ์ชื่อสถานที่หรือที่อยู่"
          fullWidth
          sx={{ mb: 2 }}
        />
      </Autocomplete>

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
          onLoad={(map) => {
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
        sx={{
          mt: 2,
          mb: 1,
          borderRadius: '12px',
          textTransform: 'none',
        }}
      >
        ใช้ตำแหน่งของฉัน
      </Button>

      <TextField
        label="ที่อยู่"
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
        sx={{
          mt: 3,
          borderRadius: '12px',
          textTransform: 'none',
        }}
      >
        ยืนยันตำแหน่งนี้
      </Button>

      <Snackbar
        open={copied}
        autoHideDuration={2000}
        onClose={() => setCopied(false)}
        message="คัดลอกที่อยู่เรียบร้อยแล้ว"
      />
    </Box>
  );
};

export default SelectLocationPage;