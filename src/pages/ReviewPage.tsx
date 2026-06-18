// src/pages/ReviewPage.tsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  doc,
  onSnapshot,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/providers/AuthProvider";
import { isInappropriate } from "@/utils/moderate";

import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Stack,
  Avatar,
  Rating,
  IconButton,
  CircularProgress,
} from "@mui/material";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import { toast } from "react-toastify";

type TherapistLite = {
  id: string;
  name: string;
  image?: string;
  rating?: number;
  reviews?: number;
};

interface TherapistDoc {
  name?: string;
  image?: string;
  profileImage?: string;
  rating?: number;
  reviews?: number;
}

const ReviewPage: React.FC = () => {
  const { therapistId } = useParams<{ therapistId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [therapist, setTherapist] = useState<TherapistLite | null>(null);

  const [rating, setRating] = useState<number | null>(5);
  const [comment, setComment] = useState("");
  const [canReview, setCanReview] = useState(false);
  const [hasExistingReview, setHasExistingReview] = useState(false);

  const [checking, setChecking] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // 🔹 Load therapist info (realtime)
  useEffect(() => {
    if (!therapistId) return;
    const ref = doc(db, "therapists", therapistId);
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        const data = snap.data() as TherapistDoc;
        setTherapist({
          id: snap.id,
          name: data.name ?? "Unknown",
          image:
            data.image &&
            (data.image.startsWith("http") || data.image.startsWith("/"))
              ? data.image
              : data.image
              ? `/images/${data.image}`
              : "/images/placeholder.jpg",
          rating: data.rating ?? 5,
          reviews: data.reviews ?? 0,
        });
      } else {
        setTherapist(null);
      }
    });
    return () => unsub();
  }, [therapistId]);

  // 🔹 Check if user is allowed to review
  useEffect(() => {
    const checkEligibility = async () => {
      if (!user || !therapistId) {
        setCanReview(false);
        setHasExistingReview(false);
        setChecking(false);
        return;
      }

      try {
        // 1) มี booking ที่จบแล้วกับ therapist คนนี้ไหม
        const bookingsRef = collection(db, "bookings");
        const bookingQ = query(
          bookingsRef,
          where("userId", "==", user.uid),
          where("therapistId", "==", therapistId),
          where("status", "in", ["completed", "done"])
        );
        const bookingSnap = await getDocs(bookingQ);
        const hasCompletedBooking = !bookingSnap.empty;

        // 2) เคยเขียนรีวิว therapist คนนี้ไปแล้วรึยัง
        const reviewsRef = collection(db, "reviews");
        const reviewQ = query(
          reviewsRef,
          where("userId", "==", user.uid),
          where("therapistId", "==", therapistId)
        );
        const reviewSnap = await getDocs(reviewQ);
        const alreadyReviewed = !reviewSnap.empty;

        setHasExistingReview(alreadyReviewed);
        setCanReview(hasCompletedBooking && !alreadyReviewed);
      } catch (e) {
        console.error("Review eligibility error:", e);
        setCanReview(false);
      } finally {
        setChecking(false);
      }
    };

    void checkEligibility();
  }, [user, therapistId]);

  // 🔹 Submit review
  const handleSubmit = async () => {
    if (!user) {
      toast.warning("Please log in before writing a review.");
      return;
    }
    if (!therapistId) {
      toast.error("Invalid therapist.");
      return;
    }
    if (!canReview) {
      toast.warning("You are not allowed to review this therapist.");
      return;
    }
    if (!rating || comment.trim() === "") {
      toast.warning("Please add a rating and a comment.");
      return;
    }

    setSubmitting(true);
    try {
      // 🛡️ Moderation — block inappropriate review content
      if (await isInappropriate(comment.trim())) {
        toast.error(
          "Review contains inappropriate content. Please revise."
        );
        setSubmitting(false);
        return;
      }

      await addDoc(collection(db, "reviews"), {
        therapistId,
        userId: user.uid,
        rating,
        comment: comment.trim(),
        createdAt: Timestamp.now(),
        userName: user.email || "Anonymous",
        status: "pending", // ✅ รอ admin อนุมัติ
      });

      toast.success("Review submitted! Waiting for admin approval.");
      setComment("");
      setRating(5);
      void navigate(`/review/all/${therapistId}`);
    } catch (e) {
      console.error("Submit review error:", e);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const disabledMessage = (() => {
    if (!user) return "🔒 Please login before writing a review.";
    if (checking) return "";
    if (hasExistingReview)
      return "💬 You already wrote a review for this therapist.";
    return "🔒 You must complete a booking before writing a review.";
  })();

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#f9f9f9" }}>
      {/* 🔹 iPhone-style Header */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          height: 56,
          px: 2,
          borderBottom: "1px solid rgba(0,0,0,0.05)",
          bgcolor: "white",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <IconButton onClick={() => navigate(-1)}>
          <ArrowBackIosNewIcon fontSize="small" />
        </IconButton>
        <Typography sx={{ flex: 1, textAlign: "center", fontWeight: 600 }}>
          Write Review
        </Typography>
        {/* spacer */}
        <Box sx={{ width: 32 }} />
      </Box>

      <Box sx={{ maxWidth: 430, mx: "auto", p: 2 }}>
        {/* Therapist info */}
        {therapist ? (
          <Stack direction="row" spacing={2} alignItems="center" mb={2}>
            <Avatar
              src={therapist.image}
              sx={{ width: 60, height: 60, borderRadius: "50%" }}
            />
            <Box>
              <Typography fontWeight="bold">{therapist.name}</Typography>
              <Stack direction="row" spacing={0.5} alignItems="center">
                <img
                  src="/images/icon/star.png"
                  alt="star"
                  style={{ width: 16, height: 16 }}
                />
                <Typography fontSize={13} color="text.secondary">
                  {(Number(therapist.rating) || 5).toFixed(1)} ({therapist.reviews ?? 0}
                  )
                </Typography>
              </Stack>
            </Box>
          </Stack>
        ) : (
          <Box textAlign="center" mt={3} mb={3}>
            {therapistId ? (
              <Typography color="text.secondary" fontSize={14}>
                Loading therapist...
              </Typography>
            ) : (
              <Typography color="error" fontSize={14}>
                Therapist not found.
              </Typography>
            )}
          </Box>
        )}

        {/* Loading state while checking permission */}
        {checking ? (
          <Box
            sx={{
              mt: 6,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 2,
            }}
          >
            <CircularProgress size={28} />
            <Typography fontSize={13} color="text.secondary">
              Checking your booking history...
            </Typography>
          </Box>
        ) : canReview ? (
          // ✅ Allowed to review
          <Paper sx={{ p: 3, borderRadius: 3 }}>
            <Typography fontWeight="bold" mb={1}>
              Your Rating
            </Typography>
            <Rating
              value={rating}
              onChange={(_, v) => setRating(v)}
              size="large"
            />

            <TextField
              label="Write your review"
              multiline
              rows={4}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              fullWidth
              sx={{ mt: 2 }}
            />

            <Button
              fullWidth
              variant="contained"
              sx={{ mt: 3, borderRadius: 3, py: 1.3 }}
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? "Sending..." : "Submit Review"}
            </Button>
          </Paper>
        ) : (
          // ❌ Not allowed
          <Paper sx={{ p: 3, borderRadius: 3, mt: 2 }}>
            <Typography align="center" color="text.secondary" fontSize={14}>
              {disabledMessage}
            </Typography>
            {user && hasExistingReview && (
              <Typography
                align="center"
                color="text.secondary"
                fontSize={13}
                mt={1.5}
              >
                If you need to update or remove your review, please contact
                support.
              </Typography>
            )}
          </Paper>
        )}
      </Box>
    </Box>
  );
};

export default ReviewPage;