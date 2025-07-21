// src/pages/BookingHistoryPage.tsx
import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Tabs, Tab, Snackbar,
} from '@mui/material';
import {
  collection, getDocs, updateDoc, doc, query, where, addDoc, getDoc,
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../providers/AuthProvider';
import { useNavigate } from 'react-router-dom';
import CustomAlert from '../components/CustomAlert';
import BookingCard from '../components/BookingCard';

interface Booking {
  id: string;
  therapistId: string;
  therapistName: string;
  serviceName: string;
  date: string;
  time: string;
  phone: string;
  note: string;
  total: number;
  status: 'upcoming' | 'completed' | 'cancelled';
  reviewed?: boolean;
  reviewText?: string;
  rating?: number;
  userId?: string;
}

interface TherapistInfo {
  name: string;
  image?: string;
}

const BookingHistoryPage: React.FC = () => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [therapists, setTherapists] = useState<Record<string, TherapistInfo>>({});
  const [tab, setTab] = useState(0);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (user?.uid) {
      const fetchData = async () => {
        const q = query(collection(db, 'bookings'), where('userId', '==', user.uid));
        const snapshot = await getDocs(q);
        const data: Booking[] = snapshot.docs.map(docSnap => ({
          ...(docSnap.data() as Booking),
          id: docSnap.id,
        }));

        const therapistIds = Array.from(new Set(data.map(b => b.therapistId)));
        const therapistMap: Record<string, TherapistInfo> = {};
        for (const id of therapistIds) {
          const ref = doc(db, 'therapists', id);
          const snap = await getDoc(ref);
          if (snap.exists()) {
            therapistMap[id] = {
              name: snap.data().name,
              image: snap.data().image,
            };
          }
        }

        setTherapists(therapistMap);
        setBookings(data);
      };

      fetchData();
    } else {
      const guestData = localStorage.getItem('guestBookings');
      if (guestData) {
        const parsed: Booking[] = JSON.parse(guestData);
        setBookings(parsed);
      }
    }
  }, [user]);

  const handleReview = async (id: string, therapistId: string, rating: number, reviewText: string) => {
    if (!user?.uid) {
      alert('Please log in to submit a review.');
      return;
    }

    await updateDoc(doc(db, 'bookings', id), {
      reviewed: true,
      reviewText,
      rating,
    });

    await addDoc(collection(db, `therapists/${therapistId}/reviews`), {
      userId: user.uid,
      rating,
      reviewText,
      createdAt: new Date(),
    });

    setBookings(prev =>
      prev.map(b =>
        b.id === id ? { ...b, reviewed: true, reviewText, rating } : b
      )
    );
    setSnackbarOpen(true);
  };

  const handleRebook = (booking: Booking) => {
    navigate('/booking', {
      state: {
        therapistId: booking.therapistId,
        therapistName: therapists[booking.therapistId]?.name,
        serviceName: booking.serviceName,
      },
    });
  };

  const filtered = bookings.filter((b) => {
    if (tab === 0) return b.status === 'upcoming';
    if (tab === 1) return b.status === 'completed';
    if (tab === 2) return b.status === 'cancelled';
    return true;
  });

  return (
    <Box sx={{ minHeight: '100vh', py: 3, background: '#f8f9fa' }}>
      <Box sx={{ maxWidth: 430, mx: 'auto', px: 2 }}>
        <Typography variant="h6" fontWeight="bold" textAlign="center" mb={4}>
          Booking History
        </Typography>

        <Box sx={{ background: '#fff', borderRadius: 4, p: 2, boxShadow: 3 }}>
          <Tabs
            value={tab}
            onChange={(_, v: number) => setTab(v)}
            variant="fullWidth"
            textColor="primary"
            indicatorColor="primary"
          >
            <Tab label="Upcoming" />
            <Tab label="Completed" />
            <Tab label="Cancelled" />
          </Tabs>

          {filtered.length === 0 ? (
            <Typography align="center" color="text.secondary" sx={{ mt: 4 }}>
              No reservations found.
            </Typography>
          ) : (
            filtered.map((b) => (
              <BookingCard
                key={b.id}
                booking={b}
                therapist={therapists[b.therapistId] || { name: b.therapistName }}
                userId={user?.uid}
                onReviewSubmit={handleReview}
                onRebook={handleRebook}
              />
            ))
          )}
        </Box>
      </Box>

      <Snackbar open={snackbarOpen} autoHideDuration={3000} onClose={() => setSnackbarOpen(false)}>
        <CustomAlert
          open={snackbarOpen}
          onClose={() => setSnackbarOpen(false)}
          severity="success"
          message="Review submitted successfully!"
        />
      </Snackbar>
    </Box>
  );
};

export default BookingHistoryPage;
