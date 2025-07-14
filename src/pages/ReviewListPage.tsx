// src/pages/ReviewListPage.tsx
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Rating,
  CircularProgress,
  Avatar,
  Button,
  Stack,
  Tabs,
  Tab,
} from '@mui/material';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import AppLayout from '../layouts/AppLayout';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
dayjs.extend(relativeTime);

interface Review {
  id?: string;
  therapistId: string;
  userId: string;
  rating: number;
  comment: string;
  createdAt: any;
  userName?: string;
  userPhotoURL?: string;
}

const ReviewListPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(0);

  useEffect(() => {
    const fetchReviews = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const q = query(
          collection(db, 'reviews'),
          where('therapistId', '==', id),
          orderBy('createdAt', 'desc')
        );
        const snapshot = await getDocs(q);
        const data: Review[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Review));
        setReviews(data);
      } catch (error) {
        console.error('Error fetching reviews:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchReviews();
  }, [id]);

  const sortedReviews = tab === 0
    ? reviews
    : [...reviews].sort((a, b) => (tab === 1 ? b.rating - a.rating : a.rating - b.rating));

  return (
    <AppLayout title="Customer Reviews">
      <Box sx={{ minHeight: '100vh', py: 4, background: '#f8f9fa' }}>
        <Box sx={{ maxWidth: 420, mx: 'auto', px: 2 }}>
          <Typography variant="h6" fontWeight="bold" textAlign="center" mb={2}>
            Therapist Reviews
          </Typography>

          <Box sx={{ background: '#fff', borderRadius: 4, p: 2, boxShadow: 3 }}>
            <Tabs
              value={tab}
              onChange={(_, v: number) => setTab(v)}
              variant="fullWidth"
              textColor="primary"
              indicatorColor="primary"
            >
              <Tab label="Recent" />
              <Tab label="Highest Rated" />
              <Tab label="Lowest Rated" />
            </Tabs>

            {loading ? (
              <Box textAlign="center" mt={4}>
                <CircularProgress />
              </Box>
            ) : sortedReviews.length === 0 ? (
              <Typography align="center" color="text.secondary" mt={4}>
                No reviews available.
              </Typography>
            ) : (
              sortedReviews.map((r) => (
                <Card
                  key={r.id}
                  sx={{ mt: 2, background: 'rgba(255,255,255,0.75)', borderRadius: 4, boxShadow: 3 }}
                >
                  <CardContent>
                    <Stack direction="row" spacing={2} alignItems="center">
                      <Avatar src={r.userPhotoURL || '/images/user.png'} />
                      <Box>
                        <Typography fontWeight="bold">{r.userName || 'Customer'}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {dayjs(r.createdAt?.toDate?.()).fromNow() || 'N/A'}
                        </Typography>
                      </Box>
                    </Stack>
                    <Rating value={r.rating} readOnly size="small" sx={{ mt: 0.5 }} />
                    <Typography fontSize={13} color="text.secondary" mt={1}>
                      "{r.comment}"
                    </Typography>
                  </CardContent>
                </Card>
              ))
            )}
          </Box>
        </Box>
      </Box>
    </AppLayout>
  );
};

export default ReviewListPage;
