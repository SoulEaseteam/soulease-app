// ✅ ReviewPage.tsx (เฉพาะส่วนที่เกี่ยวข้องกับการให้สิทธิ์รีวิว)
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../providers/AuthProvider';
import { Box, Typography, TextField, Button, Rating } from '@mui/material';

interface Review {
  rating: number;
  comment: string;
  createdAt: any;
  therapistId: string;
  userId: string;
}

const ReviewPage: React.FC = () => {
  const { id } = useParams<{ id: string }>(); // therapistId
  const navigate = useNavigate();
  const { user } = useAuth();

  const [rating, setRating] = useState<number | null>(5);
  const [comment, setComment] = useState('');
  const [canReview, setCanReview] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkBooking = async () => {
      if (!user?.uid || !id) return;
      const q = query(
        collection(db, 'bookings'),
        where('userId', '==', user.uid),
        where('therapistId', '==', id),
        where('status', '==', 'completed') // ✅ ตรวจเฉพาะการจองที่สำเร็จแล้ว
      );
      const snap = await getDocs(q);
      setCanReview(!snap.empty);
      setLoading(false);
    };
    checkBooking();
  }, [user, id]);

  const handleSubmit = async () => {
    if (!rating || !comment.trim()) {
      alert('Please complete all fields');
      return;
    }
    const newReview: Review = {
      rating,
      comment,
      therapistId: id!,
      userId: user!.uid,
      createdAt: Timestamp.now()
    };
    await addDoc(collection(db, 'reviews'), newReview);
    alert('Review submitted!');
    navigate(`/review-list/${id}`);
  };

  if (loading) return <Typography>Loading...</Typography>;
  if (!user || !canReview) {
    return (
      <Box sx={{ p: 4 }}>
        <Typography fontWeight="bold" fontSize={18} color="gray">
          You can only review if you completed a booking with this therapist.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 4 }}>
      <Typography fontSize={20} fontWeight="bold" mb={2}>
        Write your review
      </Typography>
      <Rating
        value={rating}
        onChange={(_, newValue) => setRating(newValue)}
        size="large"
      />
      <TextField
        fullWidth
        multiline
        rows={4}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Share your experience..."
        sx={{ mt: 2 }}
      />
      <Button variant="contained" onClick={handleSubmit} sx={{ mt: 2 }}>
        Submit Review
      </Button>
    </Box>
  );
};

export default ReviewPage;