// src/pages/LocationPage.tsx

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  IconButton,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import RoomIcon from '@mui/icons-material/Room';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../providers/AuthProvider';
import { db } from '../firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

const LocationPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const location = useLocation();

  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedLat, setSelectedLat] = useState<number | null>(null);
  const [selectedLng, setSelectedLng] = useState<number | null>(null);

  useEffect(() => {
    if (location.state) {
      const { selectedAddress, selectedLat, selectedLng } = location.state as any;
      if (selectedAddress) setAddress(selectedAddress);
      if (selectedLat) setSelectedLat(selectedLat);
      if (selectedLng) setSelectedLng(selectedLng);
    }
  }, [location.state]);

  useEffect(() => {
    const loadUserData = async () => {
      if (!user) return;
      const ref = doc(db, 'users', user.uid);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = snap.data();
        setAddress((prev) => prev || data.address || '');
        setPhone(data.phone || '');
        if (data.location) {
          setSelectedLat(data.location.lat);
          setSelectedLng(data.location.lng);
        }
      }
    };
    loadUserData();
  }, [user]);

  const isValidPhone = (p: string) => /^0[0-9]{8,9}$/.test(p);

  const handleSave = async () => {
    if (!user) return;
    if (!isValidPhone(phone)) {
      alert('⚠️ Invalid phone number format');
      return;
    }

    try {
      await updateDoc(doc(db, 'users', user.uid), {
        address,
        phone,
        location: selectedLat && selectedLng ? { lat: selectedLat, lng: selectedLng } : null,
      });
      alert('✅ Customer information saved successfully');
      navigate('/profile');
    } catch (err) {
      console.error('❌ Error updating:', err);
      alert('Error saving information.');
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', background: '#f0f4f8', p: 3, pb: 8 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <IconButton onClick={() => navigate('/profile')} sx={{ mr: 1 }}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h6" fontWeight="bold">
          Customer Information
        </Typography>
      </Box>

      <Paper elevation={3} sx={{ p: 3, borderRadius: 4, bgcolor: '#fff' }}>
        <Button
          variant="outlined"
          startIcon={<RoomIcon />}
          fullWidth
          sx={{ mb: 3, py: 1.2, borderRadius: 3, fontWeight: 'bold', textTransform: 'none' }}
          onClick={() => navigate('/select-location')}
        >
          Select from Map
        </Button>

        <Typography fontWeight="bold" mb={1}>Address:</Typography>
        <TextField
          fullWidth
          variant="outlined"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          sx={{ mb: 3 }}
        />

        <Typography fontWeight="bold" mb={1}>Phone Number:</Typography>
        <TextField
          fullWidth
          variant="outlined"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          sx={{ mb: 3 }}
        />

        {selectedLat && selectedLng && (
          <iframe
            title="Map"
            width="100%"
            height="180"
            frameBorder="0"
            style={{ borderRadius: 8, marginBottom: 16 }}
            src={`https://maps.google.com/maps?q=${selectedLat},${selectedLng}&z=15&output=embed`}
            allowFullScreen
          />
        )}

        <Button
          variant="contained"
          fullWidth
          sx={{ py: 1.3, borderRadius: 3, fontWeight: 'bold', bgcolor: '#2b3b53', '&:hover': { bgcolor: '#3f5066' } }}
          onClick={handleSave}
        >
          Save Information
        </Button>
      </Paper>

      <Typography mt={4} fontSize={13} color="text.secondary" textAlign="center">
        You can also update your address during booking.
      </Typography>
    </Box>
  );
};

export default LocationPage;