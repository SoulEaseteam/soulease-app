// src/pages/BookingHistoryPage.tsx
import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Card, CardContent, Button, Stack, Tabs, Tab,
  TextField, Rating, Snackbar, Avatar
} from '@mui/material';
import {
  collection, getDocs, updateDoc, doc, query, where, addDoc, getDoc
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../providers/AuthProvider';
import { useNavigate } from 'react-router-dom';
import CustomAlert from '../components/CustomAlert';

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
  const [tempReviewMap, setTempReviewMap] = useState<{ [key: string]: string }>({});
  const [tempRatingMap, setTempRatingMap] = useState<{ [key: string]: number }>({});
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;

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
  }, [user]);

  const handleReview = async (id: string, therapistId: string) => {
    const review = tempReviewMap[id] || '';
    const rating = tempRatingMap[id] || 0;

    await updateDoc(doc(db, 'bookings', id), {
      reviewed: true,
      reviewText: review,
      rating,
    });

    await addDoc(collection(db, `therapists/${therapistId}/reviews`), {
      userId: user?.uid,
      rating,
      reviewText: review,
      createdAt: new Date(),
    });

    setBookings(prev =>
      prev.map(b =>
        b.id === id ? { ...b, reviewed: true, reviewText: review, rating } : b
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
    <Box sx={{ minHeight: '100vh', py: 4, background: '#f8f9fa' }}>
      <Box sx={{ maxWidth: 450, mx: 'auto', px: 2 }}>
        <Typography variant="h6" fontWeight="bold" textAlign="center" mb={2}>
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
              <Card key={b.id} sx={{ mt: 2 }}>
                <CardContent>
                  <Stack direction="row" alignItems="center" spacing={2}>
                    <Avatar src={therapists[b.therapistId]?.image} />
                    <Box>
                      <Typography fontWeight="bold">{therapists[b.therapistId]?.name || b.therapistName}</Typography>
                      <Typography fontSize="0.85rem">{b.serviceName}</Typography>
                    </Box>
                  </Stack>

                  <Typography mt={1} fontSize="0.9rem">📅 {b.date} 🕒 {b.time}</Typography>
                  <Typography fontSize="0.9rem">📝 Note: {b.note || '-'}</Typography>
                  <Typography fontSize="0.9rem">💰 Total: ฿{b.total.toLocaleString()}</Typography>
                  <Typography fontSize="0.9rem">📌 Status: {b.status}</Typography>

                  {b.status === 'completed' && !b.reviewed && user?.uid === b.userId && (
                    <Box mt={2}>
                      <Typography fontWeight="bold" fontSize="0.9rem">Leave your review:</Typography>
                      <Rating
                        value={tempRatingMap[b.id] || 0}
                        onChange={(_, newValue) =>
                          setTempRatingMap(prev => ({ ...prev, [b.id]: newValue || 0 }))
                        }
                      />
                      <TextField
                        label="Feedback"
                        fullWidth
                        multiline
                        rows={2}
                        value={tempReviewMap[b.id] || ''}
                        onChange={(e) =>
                          setTempReviewMap(prev => ({ ...prev, [b.id]: e.target.value }))
                        }
                        sx={{ mt: 1 }}
                      />
                      <Button
                        variant="contained"
                        size="small"
                        sx={{ mt: 1 }}
                        onClick={() => handleReview(b.id, b.therapistId)}
                      >
                        Submit
                      </Button>
                    </Box>
                  )}

                  {b.reviewed && (
                    <Box mt={2}>
                      <Typography fontSize="0.9rem">⭐ Rating:</Typography>
                      <Rating value={b.rating || 0} readOnly size="small" />
                      <Typography variant="body2" color="text.secondary" fontStyle="italic">
                        "{b.reviewText}"
                      </Typography>
                    </Box>
                  )}

                  <Stack direction="row" justifyContent="flex-end" mt={2}>
                    <Button variant="outlined" size="small" onClick={() => handleRebook(b)}>
                      Book Again
                    </Button>
                  </Stack>
                </CardContent>
              </Card>
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