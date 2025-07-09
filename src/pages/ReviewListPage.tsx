// src/pages/ReviewListPage.tsx

import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Rating,
  CircularProgress
} from '@mui/material';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import AppLayout from '../layouts/AppLayout';

interface Review {
  id?: string;
  therapistId: string;
  userId: string;
  rating: number;
  comment: string;
  createdAt: any;
  userName?: string; // เพิ่มชื่อผู้ใช้หากมี
}

const ReviewListPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReviews = async () => {
      if (!id) return;
      try {
        const q = query(collection(db, 'reviews'), where('therapistId', '==', id));
        const snapshot = await getDocs(q);
        const data: Review[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Review));
        setReviews(data);
      } catch (err) {
        console.error('Failed to fetch reviews:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchReviews();
  }, [id]);

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
          reviews.map((r) => (
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
                <Typography fontWeight="bold" fontSize={15}>
                  {r.userName || 'Customer'}
                </Typography>
                <Rating value={r.rating} readOnly size="small" sx={{ mt: 0.5 }} />
                <Typography fontSize={13} color="text.secondary" mt={1}>
                  "{r.comment}"
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block" mt={1}>
                  {r.createdAt?.toDate?.()?.toLocaleDateString?.() || 'N/A'}
                </Typography>
              </CardContent>
            </Card>
          ))
        )}
      </Box>
    </AppLayout>
  );
};

export default ReviewListPage;