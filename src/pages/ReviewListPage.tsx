import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  getDoc,
  getDocs,
} from "firebase/firestore";
import { db } from "../lib/firebase";

import {
  Box,
  Typography,
  Paper,
  Rating,
  Stack,
  Avatar,
  IconButton,
  CircularProgress,
} from "@mui/material";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import dayjs from "dayjs";

// =======================================================
// TYPES
// =======================================================
interface Review {
  id: string;
  therapistId: string;
  userId?: string | null;
  rating: number;
  comment: string;
  createdAt: any;
  userName: string;
  photoURL?: string;
}

interface TherapistInfo {
  name?: string;
  image?: string;
}

// =======================================================
// COMPONENT
// =======================================================
const ReviewListPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [therapistInfo, setTherapistInfo] = useState<TherapistInfo>({});

  // =======================================================
  // LOAD THERAPIST INFO (supports both docId + custom id)
  // =======================================================
  useEffect(() => {
    if (!id) return;

    const loadTherapist = async () => {
      setLoading(true);

      // 1) Try custom ID
      const q = query(collection(db, "therapists"), where("id", "==", id));
      const snap = await getDocs(q);

      if (!snap.empty) {
        setTherapistInfo(snap.docs[0].data() as TherapistInfo);
        setLoading(false);
        return;
      }

      // 2) Try docId fallback
      const docRef = doc(db, "therapists", id);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        setTherapistInfo(docSnap.data() as TherapistInfo);
      }

      setLoading(false);
    };

    loadTherapist();
  }, [id]);

  // =======================================================
  // LOAD REVIEWS (from bookings)
  // =======================================================
  useEffect(() => {
    if (!id) return;

    const q = query(
      collection(db, "bookings"),
      where("therapistId", "==", id),
      where("reviewText", "!=", "")
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const raw = snapshot.docs.map((d) => d.data());

      // enrich with fallback reviewer name + avatar
      const enriched: Review[] = raw.map((r: any) => ({
        id: r.id,
        therapistId: r.therapistId,
        userId: r.userId || null,
        rating: r.rating || 5,
        comment: r.reviewText || "",
        createdAt: r.startAt || r.createdAt || null,
        userName: r.userName || r.userEmail || `Booking: ${r.id}`,
        photoURL: r.userAvatar || "/images/default-avatar.png",
      }));

      // Sort newest first
      enriched.sort((a, b) => {
        const t1 = a.createdAt?.seconds || a.createdAt?.toDate?.()?.getTime() || 0;
        const t2 = b.createdAt?.seconds || b.createdAt?.toDate?.()?.getTime() || 0;
        return t2 - t1;
      });

      setReviews(enriched);
    });

    return () => unsub();
  }, [id]);

  // =======================================================
  // FALLBACK IMAGE LOGIC
  // =======================================================
  const getImageUrl = (path?: string) => {
    if (!path) return "/images/default-therapist.png";
    if (path.startsWith("http")) return path;

    return path.startsWith("/") ? path : `/${path}`;
  };

  // =======================================================
  // UI: LOADING
  // =======================================================
  if (loading) {
    return (
      <Box minHeight="80vh" display="flex" justifyContent="center" alignItems="center">
        <CircularProgress color="error" />
      </Box>
    );
  }

  // =======================================================
  // UI PAGE
  // =======================================================
  return (
    <Box sx={{ minHeight: "100vh", backgroundColor: "#fdfdfd", pb: 10 }}>
      {/* HEADER */}
      <Box
        sx={{
          height: 110,
          background: "linear-gradient(to bottom, #FE0944, #FEAE96)",
          position: "relative",
        }}
      >
        <IconButton
          onClick={() => navigate(-1)}
          sx={{ position: "absolute", left: 16, top: 20, color: "#fff" }}
        >
          <ArrowBackIosNewIcon fontSize="small" />
        </IconButton>

        <Typography
          sx={{
            fontWeight: 700,
            fontSize: 24,
            color: "#fff",
            textAlign: "center",
            pt: 3.5,
          }}
        >
          Therapist Reviews
        </Typography>
      </Box>

      {/* THERAPIST PROFILE BLOCK */}
      <Box sx={{ maxWidth: 420, mx: "auto", textAlign: "center", mt: 6 }}>
        <Box
          sx={{
            width: 150,
            height: 150,
            mx: "auto",
            borderRadius: "50%",
            overflow: "hidden",
            border: "4px solid #fff",
            boxShadow: "0 6px 18px rgba(0,0,0,0.15)",
            background: "#fff",
          }}
        >
          <img
            src={getImageUrl(therapistInfo.image)}
            alt={therapistInfo.name}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: "center 0%",
            }}
          />
        </Box>

        <Typography fontWeight="bold" fontSize={26} mt={2}>
          {therapistInfo.name || "Therapist"}
        </Typography>

        <Typography fontSize={14} color="text.secondary" mt={0.5}>
          Verified SunRed Professional
        </Typography>
      </Box>

      {/* REVIEW LIST */}
      <Box sx={{ maxWidth: 450, mx: "auto", p: 3 }}>
        <Typography fontWeight="bold" fontSize={20} mb={2}>
          ⭐ All Reviews ({reviews.length})
        </Typography>

        {reviews.length === 0 ? (
          <Typography align="center" color="text.secondary" mt={3}>
            There are no reviews for this masseuse. ✨
          </Typography>
        ) : (
          reviews.map((r) => (
            <Paper
              key={r.id}
              sx={{
                mb: 2,
                p: 2.5,
                borderRadius: 4,
                boxShadow: "0 6px 18px rgba(0,0,0,0.08)",
              }}
            >
              <Stack direction="row" spacing={2} alignItems="center" mb={1}>
                <Avatar
                  src={r.photoURL}
                  sx={{ width: 58, height: 58, border: "2px solid #fff" }}
                />
                <Box>
                  <Typography fontWeight="bold" fontSize={15}>
                    {r.userName}
                  </Typography>
                  <Rating value={r.rating} readOnly size="small" sx={{ color: "#FF9800" }} />
                </Box>
              </Stack>

              {/* COMMENT */}
              <Typography
                sx={{
                  color: "#444",
                  fontFamily: "Trebuchet MS",
                  whiteSpace: "pre-line",
                  lineHeight: 1.7,
                  wordBreak: "break-word",
                  fontSize: 15,
                  mt: 1,
                }}
              >
                {r.comment}
              </Typography>

            
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ mt: 1, display: "block" }}
              >
                {dayjs(r.createdAt?.toDate?.()).format("YYYY-MM-DD HH:mm")}
              </Typography>
              <Typography textAlign="center" mt={3} fontSize={13} sx={{ color: '#aaa', fontStyle: 'Trebuchet MS, sans-serif' }}> 
                                  “Updated reviews & feedback in our Telegram channel"</Typography>
     
            </Paper>
          ))
        )}
      </Box>
    </Box>
  );
};

export default ReviewListPage;