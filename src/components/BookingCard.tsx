import React, { useState } from 'react';
import {
  Card, CardContent, Typography, Stack, TextField,
  Button, Box, Avatar, Rating
} from '@mui/material';

interface Booking {
  id: string;
  therapistId: string;
  therapistName: string;
  serviceName: string;
  date: string;
  time: string;
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

interface Props {
  booking: Booking;
  therapist: TherapistInfo;
  userId?: string;
  onReviewSubmit: (id: string, therapistId: string, reviewText: string, rating: number) => void;
  onRebook: (booking: Booking) => void;
}

const BookingCard: React.FC<Props> = ({
  booking, therapist, userId, onReviewSubmit, onRebook
}) => {
  const [reviewText, setReviewText] = useState('');
  const [rating, setRating] = useState<number | null>(0);

  return (
    <Card sx={{ mt: 2 }}>
      <CardContent>
        <Stack direction="row" alignItems="center" spacing={2}>
          <Avatar src={therapist?.image} />
          <Box>
            <Typography fontWeight="bold">{therapist?.name || booking.therapistName}</Typography>
            <Typography fontSize="0.85rem">{booking.serviceName}</Typography>
          </Box>
        </Stack>

        <Typography mt={1} fontSize="0.9rem">🗓️ {booking.date} 🕒 {booking.time}</Typography>
        <Typography fontSize="0.9rem">📜 Note: {booking.note || '-'}</Typography>
        <Typography fontSize="0.9rem">💰 Total: ฿{booking.total.toLocaleString()}</Typography>
        <Typography fontSize="0.9rem">📌 Status: {booking.status}</Typography>

        {/* ✅ เงื่อนไขรีวิว */}
        {booking.status === 'completed' && !booking.reviewed && (
          userId === booking.userId ? (
            <Box mt={2}>
              <Typography fontWeight="bold" fontSize="0.9rem">Leave your review:</Typography>
              <Rating
                value={rating}
                onChange={(_, newValue) => setRating(newValue)}
              />
              <TextField
                label="Feedback"
                fullWidth
                multiline
                rows={2}
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                sx={{ mt: 1 }}
              />
              <Button
                variant="contained"
                size="small"
                sx={{ mt: 1 }}
                onClick={() => onReviewSubmit(booking.id, booking.therapistId, reviewText, rating || 0)}
              >
                Submit
              </Button>
            </Box>
          ) : (
            <Box mt={2}>
              <Typography
                fontSize="0.9rem"
                color="text.secondary"
                fontStyle="italic"
              >
                🔒 รีวิวได้เฉพาะสมาชิกที่เข้าสู่ระบบ และมียอดจองจริง
              </Typography>
            </Box>
          )
        )}

        {/* ✅ แสดงรีวิวที่เคยให้ไปแล้ว */}
        {booking.reviewed && (
          <Box mt={2}>
            <Typography fontSize="0.9rem">⭐ Rating:</Typography>
            <Rating value={booking.rating || 0} readOnly size="small" />
            <Typography
              variant="body2"
              color="text.secondary"
              fontStyle="italic"
            >
              "{booking.reviewText}"
            </Typography>
          </Box>
        )}

        {/* ✅ ปุ่ม Book Again */}
        <Stack direction="row" justifyContent="flex-end" mt={2}>
          <Button variant="outlined" size="small" onClick={() => onRebook(booking)}>
            Book Again
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
};

export default BookingCard;