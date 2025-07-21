import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Avatar,
  Button,
  CircularProgress,
  Stack,
  Paper,
} from '@mui/material';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/firebase';
import { useAuth } from '@/providers/AuthProvider';
import UploadAvatar from '@/components/UploadAvatar';
import { updateUserLocation } from '@/utils/updateLocation';
import { updateUserLocation } from '@/utils/updateUserLocation';

interface Therapist {
  id: string;
  name: string;
  image: string;
  avatar?: string;
  rating: number;
  reviews: number;
  distance?: number;
  specialty: string;
  experience: string;
  available: 'available' | 'bookable' | 'resting' | 'holiday';
  hot?: boolean;
  new?: boolean;
  topRated?: boolean;
  serviceCount?: string;
  nextAvailableTime?: string;
  todayBookings?: number;
  totalBookings?: number;
  startTime?: string;
  endTime?: string;
}

const statusColors: Record<string, { label: string; color: string }> = {
  available: { label: 'Available', color: '#36A681' },
  bookable: { label: 'Bookable', color: '#DB661C' },
  resting: { label: 'Resting', color: '#9E9E9E' },
  holiday: { label: 'Holiday', color: '#BDBDBD' },
};

const TherapistProfilePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [therapist, setTherapist] = useState<Therapist | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    const fetchTherapist = async () => {
      setLoading(true);
      try {
        const docRef = doc(db, 'therapists', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setTherapist({ id: docSnap.id, ...docSnap.data() } as Therapist);
        } else {
          setTherapist(null);
        }
      } catch (error) {
        console.error('Error fetching therapist:', error);
        setTherapist(null);
      } finally {
        setLoading(false);
      }
    };

    fetchTherapist();
  }, [id]);

  const handleUpdateLocation = () => {
    if (user?.uid) {
      updateUserLocation(user.uid, 'therapist');
    } else {
      alert('Please login to update location');
    }
  };

  if (loading) {
    return (
      <Box sx={{ textAlign: 'center', mt: 10 }}>
        <CircularProgress />
        <Typography mt={2}>Loading therapist data...</Typography>
      </Box>
    );
  }

  if (!therapist) {
    return (
      <Box sx={{ textAlign: 'center', mt: 10 }}>
        <Typography variant="h6" color="error">
          Therapist not found
        </Typography>
        <Button variant="contained" sx={{ mt: 2 }} onClick={() => navigate(-1)}>
          Go Back
        </Button>
      </Box>
    );
  }

  const imageUrl = therapist.avatar
    ? therapist.avatar
    : therapist.image.startsWith('/')
    ? therapist.image
    : `/images/${therapist.image}`;

  const isBookable = ['available', 'bookable'].includes(therapist.available);
  const isUnavailable = ['resting', 'holiday'].includes(therapist.available);

  return (
    <Box sx={{ maxWidth: 480, mx: 'auto', p: 3 }}>
      <Paper sx={{ p: 3, borderRadius: 3, boxShadow: 3 }}>
        <Stack spacing={2} alignItems="center">
          <Avatar
            src={imageUrl}
            alt={therapist.name}
            sx={{ width: 140, height: 140 }}
          />

          {user?.uid === therapist.id && <UploadAvatar />}

          <Typography variant="h5" fontWeight="bold">
            {therapist.name}
          </Typography>
          <Typography
            sx={{
              color: statusColors[therapist.available]?.color || '#000',
              fontWeight: 'bold',
              textTransform: 'capitalize',
            }}
          >
            Status: {statusColors[therapist.available]?.label || therapist.available}
          </Typography>
          <Typography>
            ⭐ {therapist.rating?.toFixed(1) || '0.0'} ({therapist.reviews} reviews)
          </Typography>
          <Typography>Today Bookings: {therapist.todayBookings || 0}</Typography>
          <Typography>Total Bookings: {therapist.totalBookings || 0}</Typography>
          <Typography>
            Working Hours: {therapist.startTime || 'N/A'} - {therapist.endTime || 'N/A'}
          </Typography>

          {/* ✅ ปุ่มอัปเดตตำแหน่ง */}
          {user?.uid === therapist.id && (
            <Button
              variant="outlined"
              onClick={handleUpdateLocation}
              sx={{ mt: 1, borderRadius: 2 }}
            >
              📍 Update My Current Location
            </Button>
          )}

          <Button
            variant="contained"
            color="primary"
            fullWidth
            onClick={() => alert('Booking functionality here')}
            disabled={isUnavailable}
            sx={{ mt: 2 }}
          >
            {isBookable ? 'Book Now' : 'Unavailable'}
          </Button>

          <Button variant="text" onClick={() => navigate(-1)} sx={{ mt: 1 }}>
            Back
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
};

export default TherapistProfilePage;