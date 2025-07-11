// src/pages/ReviewPage.tsx

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, onSnapshot, collection, addDoc, getDocs, Timestamp, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { Therapist } from '../types/therapist';
import { useAuth } from '../providers/AuthProvider';
import {
  Box, Typography, Paper, TextField, Button, Stack, Avatar, Rating
} from '@mui/material';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import CustomAppBar from '../components/CustomAppBar';
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
}

const ReviewPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [rating, setRating] = useState<number | null>(5);
  const [comment, setComment] = useState('');
  const [reviews, setReviews] = useState<Review[]>([]);
  const [therapist, setTherapist] = useState<Therapist | null>(null);

  // ✅ โหลด therapist แบบ realtime
  useEffect(() => {
    if (!id) return;
    const unsub = onSnapshot(doc(db, 'therapists', id), (snap) => {
      if (snap.exists()) {
        setTherapist({ id: snap.id, ...snap.data() } as Therapist);
      } else {
        setTherapist(null);
      }
    });
    return () => unsub();
  }, [id]);

  useEffect(() => {
    const fetchReviews = async () => {
      const q = query(collection(db, 'reviews'), where('therapistId', '==', id));
      const snapshot = await getDocs(q);
      const data: Review[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Review));
      setReviews(data.sort((a, b) => b.createdAt?.seconds - a.createdAt?.seconds));
    };
    fetchReviews();
  }, [id]);

  const handleSubmit = async () => {
    if (!rating || comment.trim() === '') {
      alert('Please fill rating and review.');
      return;
    }

    const newReview: Omit<Review, 'id'> = {
      therapistId: id!,
      userId: user?.uid!,
      rating: rating,
      comment: comment,
      createdAt: Timestamp.now(),
      userName: user?.email || 'Anonymous'
    };

    await addDoc(collection(db, 'reviews'), newReview);
    alert('✅ Review submitted!');
    navigate(`/review/${id}`);
  };

  if (!therapist) {
    return <Typography color="#ccc">Therapist not found.</Typography>;
  }

  return (
    <Box sx={{ minHeight: '100vh', background: 'linear-gradient(to bottom, #e0f7fa, #b2dfdb)', pb: 8 }}>
      <CustomAppBar title="Rate & Review" />

      <Box sx={{ maxWidth: 430, mx: 'auto', px: 2, mt: 4 }}>
        <Paper sx={{
          p: 3, borderRadius: 4, backgroundColor: 'rgba(255, 255, 255, 0.85)',
          backdropFilter: 'blur(8px)', boxShadow: '0 8px 24px rgba(0,0,0,0.08)'
        }}>
          <Stack direction="row" spacing={2} alignItems="center" mb={2}>
            <Avatar src={`/images/${therapist.image}`} sx={{ width: 64, height: 64 }} />
            <Box>
              <Typography fontWeight="bold" fontSize={18} color="#00695c">
                {therapist.name}
              </Typography>
              <Typography fontSize={14} color="#666">
                ⭐ {therapist.rating} / {therapist.reviews} reviews
              </Typography>
            </Box>
          </Stack>

          <Typography fontWeight="bold" mb={1} color="#004d40">Your Rating</Typography>
          <Rating
            name="rating"
            value={rating}
            onChange={(_e: any, newValue: React.SetStateAction<number | null>) => setRating(newValue)}
            icon={<FavoriteIcon fontSize="inherit" color="error" />}
            emptyIcon={<FavoriteBorderIcon fontSize="inherit" />}
            size="large"
          />

          <TextField
            label="Write your review"
            multiline rows={4}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            fullWidth sx={{ mt: 2 }}
          />

          <Button fullWidth onClick={handleSubmit} variant="contained"
            sx={{
              mt: 3, py: 1.5, fontWeight: 'bold', fontSize: 16,
              background: 'linear-gradient(to right, #00bfa5, #1de9b6)',
              color: '#fff', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
            }}>
            Submit Review
          </Button>
        </Paper>

        <Box mt={4}>
          <Typography fontWeight="bold" fontSize={16} mb={2}>⭐ All Reviews</Typography>
          {reviews.length === 0 ? (
            <Typography>No reviews yet</Typography>
          ) : (
            reviews.map((r) => (
              <Paper key={r.id} sx={{ mb: 2, p: 2, borderRadius: 3, background: 'rgba(255,255,255,0.8)' }}>
                <Stack direction="row" alignItems="center" mb={1}>
                  <Typography fontWeight="bold" fontSize={14} mr={1}>{r.userName || 'User'}</Typography>
                  <Rating value={r.rating} readOnly size="small" />
                </Stack>
                <Typography fontSize={14}>{r.comment}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {dayjs(r.createdAt?.toDate?.()).fromNow()}
                </Typography>
              </Paper>
            ))
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default ReviewPage;