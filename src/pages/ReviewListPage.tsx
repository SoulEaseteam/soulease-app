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
} from '@mui/material';
import { collection, getDocs, query, where, orderBy, limit, startAfter } from 'firebase/firestore';
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
  const [sortNewest, setSortNewest] = useState(true);
  const [lastVisible, setLastVisible] = useState<any>(null);
  const [hasMore, setHasMore] = useState(true);

  const fetchReviews = async (reset = false) => {
    if (!id) return;
    try {
      const q = query(
        collection(db, 'reviews'),
        where('therapistId', '==', id),
        orderBy('createdAt', sortNewest ? 'desc' : 'asc'),
        ...(lastVisible && !reset ? [startAfter(lastVisible)] : []),
        limit(10)
      );

      const snapshot = await getDocs(q);
      const data: Review[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Review));

      if (reset) {
        setReviews(data);
      } else {
        setReviews(prev => [...prev, ...data]);
      }

      setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
      setHasMore(snapshot.docs.length === 10);
    } catch (err) {
      console.error('Failed to fetch reviews:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    setLastVisible(null);
    fetchReviews(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, sortNewest]);

  return (
    <AppLayout title="Customer Reviews">
      <Box
        sx={{
          minHeight: '100vh',
          background: 'linear-gradient(to bottom, #e0f7fa, #fde2e4)',
          pt: 6,
          pb: 10,
          px: 2,
          maxWidth: 430,
          mx: 'auto',
        }}
      >
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography fontWeight="bold">Reviews</Typography>
          <Button onClick={() => setSortNewest(!sortNewest)} size="small">
            Sort: {sortNewest ? 'Newest First' : 'Oldest First'}
          </Button>
        </Stack>

        {loading ? (
          <Box textAlign="center" mt={10}>
            <CircularProgress />
            <Typography mt={2} color="text.secondary">Loading reviews...</Typography>
          </Box>
        ) : reviews.length === 0 ? (
          <Typography align="center" color="text.secondary" mt={8}>
            No reviews yet for this therapist.
          </Typography>
        ) : (
          <>
            {reviews.map((r) => (
              <Card
                key={r.id}
                sx={{
                  mb: 2,
                  background: 'rgba(255,255,255,0.75)',
                  borderRadius: 4,
                  boxShadow: '0 4px 10px rgba(0,0,0,0.06)',
                }}
              >
                <CardContent>
                  <Stack direction="row" spacing={2} alignItems="center" mb={1}>
                    <Avatar src={r.userPhotoURL || '/images/user.png'} />
                    <Box>
                      <Typography fontWeight="bold" fontSize={15}>
                        {r.userName || 'Customer'}
                      </Typography>
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
            ))}

            {hasMore && (
              <Button fullWidth variant="outlined" onClick={() => fetchReviews()}>
                Load More
              </Button>
            )}
          </>
        )}
      </Box>
    </AppLayout>
  );
};

export default ReviewListPage;
