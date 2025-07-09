// src/pages/BookingHistoryPage.tsx

import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Card, CardContent, Button, Stack, Tabs, Tab, TextField, Rating, Snackbar, Alert
} from '@mui/material';
import { collection, getDocs, updateDoc, doc, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../hooks/useAuth';

interface Booking {
  id: string;
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

const BookingHistoryPage: React.FC = () => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [tab, setTab] = useState(0);
  const [tempReviewMap, setTempReviewMap] = useState<{ [key: string]: string }>({});
  const [tempRatingMap, setTempRatingMap] = useState<{ [key: string]: number }>({});
  const [snackbarOpen, setSnackbarOpen] = useState(false);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      const q = query(collection(db, 'bookings'), where('userId', '==', user.uid));
      const snapshot = await getDocs(q);
      const data: Booking[] = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as Booking));
      setBookings(data);
    };
    fetchData();
  }, [user]);

  const handleReview = async (id: string) => {
    const review = tempReviewMap[id] || '';
    const rating = tempRatingMap[id] || 0;
    await updateDoc(doc(db, 'bookings', id), {
      reviewed: true,
      reviewText: review,
      rating
    });
    setBookings(prev =>
      prev.map(b =>
        b.id === id ? { ...b, reviewed: true, reviewText: review, rating } : b
      )
    );
    setSnackbarOpen(true);
  };

  const handleRebook = (booking: Booking) => {
    alert(`Processing your reservation ... : ${booking.serviceName}`);
  };

  const filtered = bookings.filter((b) => {
    if (tab === 0) return b.status === 'upcoming';
    if (tab === 1) return b.status === 'completed';
    if (tab === 2) return b.status === 'cancelled';
    return true;
  });

  return (
    <Box sx={{ minHeight: '100vh', py: 4, background: 'linear-gradient(to bottom right, #eee, #fff)', fontFamily: 'Orson, sans-serif' }}>
      <Box sx={{ maxWidth: 430, mx: 'auto', px: 2 }}>
        <Typography variant="h6" fontWeight="bold" textAlign="center" sx={{
          py: 1.5, borderRadius: 2, mb: 2, background: 'rgba(255,255,255,0.4)',
          backdropFilter: 'blur(12px)', boxShadow: '0 4px 12px rgba(0,0,0,0.06)'
        }}>
          Booking History
        </Typography>

        <Box sx={{ background: 'linear-gradient(to bottom, #fff, #f2f2f2)', backdropFilter: 'blur(16px)', borderRadius: 6, boxShadow: '0 8px 32px rgba(0,0,0,0.12)', p: 2, mx: 'auto', maxWidth: 360 }}>
          <Tabs
            value={tab}
            onChange={(_, v) => setTab(v)}
            variant="fullWidth"
            textColor="primary"
            indicatorColor="primary"
            sx={{
              borderRadius: 4, background: 'rgba(255,255,255,0.2)', minHeight: '42px',
              '& .MuiTabs-indicator': { height: 3, borderRadius: 2 },
            }}
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
              <Card key={b.id} sx={{ mt: 2, background: 'rgba(255,255,255,0.6)', borderRadius: 3, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                <CardContent>
                  <Typography fontWeight="bold">💆‍♀️ Therapist: {b.therapistName}</Typography>
                  <Typography fontSize="0.9rem">📅 Date: {b.date} Time: {b.time}</Typography>
                  <Typography fontSize="0.9rem">🧘🏼‍♀️ Service: {b.serviceName}</Typography>
                  <Typography fontSize="0.9rem">📝 Note: {b.note || '-'}</Typography>
                  <Typography fontSize="0.9rem">💰 Total: ฿{b.total.toLocaleString()}</Typography>
                  <Typography fontSize="0.9rem">📌 Status: {b.status}</Typography>

                  {b.status === 'completed' && !b.reviewed && b.userId === user?.uid && (
                    <Box mt={2}>
                      <Typography fontWeight="bold" fontSize="0.9rem">Leave your review:</Typography>
                      <Rating
                        value={tempRatingMap[b.id] || 0}
                        onChange={(_, newValue) => setTempRatingMap((prev) => ({ ...prev, [b.id]: newValue || 0 }))}
                      />
                      <TextField
                        label="Your feedback"
                        fullWidth multiline rows={2}
                        value={tempReviewMap[b.id] || ''}
                        onChange={(e) => setTempReviewMap((prev) => ({ ...prev, [b.id]: e.target.value }))}
                        sx={{ mt: 1 }}
                      />
                      <Button variant="contained" size="small" sx={{ mt: 1 }} onClick={() => handleReview(b.id)}>
                        Submit
                      </Button>
                    </Box>
                  )}

                  {b.reviewed && (
                    <Box mt={2}>
                      <Typography fontSize="0.9rem">⭐ Rating:</Typography>
                      <Rating value={b.rating || 0} readOnly size="small" />
                      <Typography variant="body2" color="text.secondary" fontStyle="italic">"{b.reviewText}"</Typography>
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
        <Alert onClose={() => setSnackbarOpen(false)} severity="success" sx={{ width: '100%' }}>
          Review submitted successfully!
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default BookingHistoryPage;
