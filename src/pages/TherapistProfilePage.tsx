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

interface Therapist {
  id: string;
  name: string;
  image: string;
  rating: number;
  reviews: number;
  distance?: number;
  specialty: string;
  experience: string;
  available: 'available' | 'bookable' | 'resting';
  hot?: boolean;
  new?: boolean;
  topRated?: boolean;
  serviceCount?: string;
  nextAvailableTime?: string;
}


const statusColors: Record<string, string> = {
  available: { label: 'Available', color: '#36A681' },
    bookable: { label: 'Bookable', color: '#DB661C' },
    resting: { label: 'Resting', color: '#9E9E9E' },
  };

const TherapistProfilePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

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

  // แก้ไขแสดงภาพรองรับกรณีชื่อไฟล์แบบ relative หรือ path จริง
  const imageUrl = therapist.image.startsWith('/')
    ? therapist.image
    : `/images/${therapist.image}`;

  // กำหนดปุ่มจองตามสถานะ
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
          <Typography variant="h5" fontWeight="bold">
            {therapist.name}
          </Typography>
          <Typography
            sx={{
              color: statusColors[therapist.available] || '#000',
              fontWeight: 'bold',
              textTransform: 'capitalize',
            }}
          >
            Status: {therapist.available}
          </Typography>
          <Typography>
            ⭐ {therapist.rating?.toFixed(1) || '0.0'} ({therapist.reviews} reviews)
          </Typography>
          <Typography>Today Bookings: {therapist.todayBookings}</Typography>
          <Typography>Total Bookings: {therapist.totalBookings}</Typography>
          <Typography>
            Working Hours: {therapist.startTime} - {therapist.endTime}
          </Typography>

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