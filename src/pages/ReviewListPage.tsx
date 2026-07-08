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
  Timestamp,
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
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
// 🆕 Round 28r52 — Phase 3.1 responsive shell.
import { responsiveShell } from "@/theme/breakpoints";

// 🆕 Round 19 (founder 2026-05-01): human-friendly review timestamps
//    via dayjs.fromNow() — '2 days ago' beats '2025-11-22 01:30'.
dayjs.extend(relativeTime);

const SERIF = '"Playfair Display", "Fraunces", Georgia, "Times New Roman", serif';
const SANS = '"Inter", system-ui, -apple-system, sans-serif';

// =======================================================
// TYPES
// =======================================================
/** ค่าวันที่จาก Firestore อาจมาในหลายรูป — Timestamp / Date / ISO string / null */
type FirestoreDateLike = Timestamp | Date | string | number | null | undefined;

interface Review {
  id: string;
  therapistId: string;
  userId?: string | null;
  rating: number;
  comment: string;
  createdAt: FirestoreDateLike;
  userName: string;
  photoURL?: string;
}

/** narrow shape ของ booking doc ที่ ReviewListPage อ่าน — รับเฉพาะฟิลด์ที่ใช้จริง */
interface BookingReviewDoc {
  id?: string;
  therapistId?: string;
  userId?: string | null;
  rating?: number;
  reviewText?: string;
  startAt?: FirestoreDateLike;
  createdAt?: FirestoreDateLike;
  userName?: string;
  userEmail?: string;
  userAvatar?: string;
}

interface TherapistInfo {
  name?: string;
  image?: string;
}

/** แปลง FirestoreDateLike → epoch ms (สำหรับ sort) */
function toMs(v: FirestoreDateLike): number {
  if (!v) return 0;
  if (v instanceof Timestamp) return v.toMillis();
  if (v instanceof Date) return v.getTime();
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const t = Date.parse(v);
    return Number.isFinite(t) ? t : 0;
  }
  return 0;
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

    void loadTherapist();
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
      // enrich with fallback reviewer name + avatar
      const enriched: Review[] = snapshot.docs.map((d) => {
        const r = d.data() as BookingReviewDoc;
        return {
          id: d.id, // ใช้ docId ของจริง ไม่ใช่ field `id` ที่อาจไม่มี
          therapistId: r.therapistId ?? "",
          userId: r.userId ?? null,
          rating: typeof r.rating === "number" ? r.rating : 5,
          comment: r.reviewText ?? "",
          createdAt: r.startAt ?? r.createdAt ?? null,
          userName: r.userName ?? r.userEmail ?? `Booking: ${d.id}`,
          photoURL: r.userAvatar ?? "/images/default-avatar.png",
        };
      });

      // Sort newest first
      enriched.sort((a, b) => toMs(b.createdAt) - toMs(a.createdAt));

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

  // 🆕 Round 19: rating distribution (5★ X / 4★ Y / …) for trust signal.
  const total = reviews.length;
  const avgRating =
    total > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / total
      : 0;
  const buckets: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  reviews.forEach((r) => {
    const k = Math.max(1, Math.min(5, Math.round(r.rating)));
    buckets[k]++;
  });

  // =======================================================
  // UI: LOADING
  // =======================================================
  if (loading) {
    return (
      <Box minHeight="80vh" display="flex" justifyContent="center" alignItems="center">
        <CircularProgress sx={{ color: "#2D2D2B" }} />
      </Box>
    );
  }

  // =======================================================
  // UI PAGE
  // =======================================================
  return (
    <Box
      sx={{
        // 🆕 Round 19: phone-shell wrapper for site rhythm consistency.
        // 🆕 Round 28r52 — responsiveShell widens through sm/md/lg.
        ...responsiveShell,
        minHeight: "100vh",
        background: "#F4F6F5",
        borderRadius: { xs: "28px", md: 0 },
        overflow: "hidden",
        boxShadow: {
          xs: "0 20px 60px rgba(15, 23, 42, 0.15)",
          md: "none",
        },
        position: "relative",
        pb: 10,
        fontFamily: SANS,
      }}
    >
      {/* HEADER */}
      <Box
        sx={{
          height: 110,
          background: "#2D2D2B",
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

        <Typography
          fontFamily={SERIF}
          fontWeight={700}
          fontSize={26}
          mt={2}
          sx={{ color: "#1A2B2E", letterSpacing: "-0.02em" }}
        >
          {therapistInfo.name || "Therapist"}
        </Typography>

        <Typography
          fontSize={13}
          mt={0.5}
          sx={{
            color: "rgba(15, 23, 42, 0.6)",
            display: "inline-flex",
            alignItems: "center",
            gap: 0.5,
          }}
        >
          <CheckCircleIcon sx={{ fontSize: 14, color: "#16a34a" }} />
          Verified SunRed Professional
        </Typography>
      </Box>

      {/* 🆕 Round 19: rating summary card with 5-bar distribution.
          Trust signal — visitors can size up the rating shape at a glance.
          🆕 Round 28r52 — responsiveShell replaces the 430 cap. */}
      {total > 0 && (
        <Box sx={{ ...responsiveShell, px: 3, mt: 3 }}>
          <Box
            sx={{
              p: 2.5,
              borderRadius: 4,
              background: "#fff",
              border: "1px solid rgba(15, 23, 42,0.08)",
              boxShadow: "0 4px 14px rgba(15, 23, 42, 0.06)",
              display: "flex",
              gap: 2.5,
              alignItems: "center",
            }}
          >
            {/* Avg rating big number */}
            <Box sx={{ textAlign: "center", flexShrink: 0 }}>
              <Typography
                fontFamily={SERIF}
                fontWeight={700}
                fontSize={36}
                sx={{ color: "#2D2D2B", letterSpacing: "-0.02em", lineHeight: 1 }}
              >
                {avgRating.toFixed(1)}
              </Typography>
              <Rating
                value={avgRating}
                precision={0.1}
                readOnly
                size="small"
                sx={{ color: "#FF9800", mt: 0.25 }}
              />
              <Typography
                fontSize={11}
                sx={{ color: "rgba(15, 23, 42, 0.55)", mt: 0.25 }}
              >
                {total} {total === 1 ? "review" : "reviews"}
              </Typography>
            </Box>
            {/* 5-bar distribution */}
            <Box sx={{ flex: 1, display: "flex", flexDirection: "column", gap: 0.5 }}>
              {[5, 4, 3, 2, 1].map((star) => {
                const count = buckets[star];
                const pct = total > 0 ? (count / total) * 100 : 0;
                return (
                  <Box
                    key={star}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      fontSize: 11,
                    }}
                  >
                    <Typography
                      sx={{
                        width: 14,
                        textAlign: "right",
                        color: "rgba(15, 23, 42, 0.7)",
                        fontWeight: 600,
                      }}
                    >
                      {star}
                    </Typography>
                    <Box
                      component="span"
                      sx={{ color: "#FF9800", fontSize: 11, lineHeight: 1 }}
                    >
                      ★
                    </Box>
                    <Box
                      sx={{
                        flex: 1,
                        height: 6,
                        borderRadius: 999,
                        background: "rgba(0, 0, 0, 0.06)",
                        overflow: "hidden",
                      }}
                    >
                      <Box
                        sx={{
                          height: "100%",
                          width: `${pct}%`,
                          background:
                            "#2D2D2B",
                          transition: "width 0.4s ease",
                        }}
                      />
                    </Box>
                    <Typography
                      sx={{
                        width: 22,
                        textAlign: "right",
                        color: "rgba(15, 23, 42, 0.55)",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {count}
                    </Typography>
                  </Box>
                );
              })}
            </Box>
          </Box>
        </Box>
      )}

      {/* REVIEW LIST */}
      <Box sx={{ maxWidth: 450, mx: "auto", p: 3 }}>
        <Typography
          fontFamily={SERIF}
          fontWeight={600}
          fontSize={18}
          mb={2}
          sx={{ color: "#1A2B2E" }}
        >
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
                sx={{
                  mt: 1,
                  display: "block",
                  color: "rgba(15, 23, 42, 0.55)",
                  fontSize: 11.5,
                }}
                title={(() => {
                  const ms = toMs(r.createdAt);
                  return ms
                    ? dayjs(ms).format("YYYY-MM-DD HH:mm")
                    : "";
                })()}
              >
                {(() => {
                  const ms = toMs(r.createdAt);
                  return ms ? dayjs(ms).fromNow() : "—";
                })()}
              </Typography>
     
            </Paper>
          ))
        )}
      </Box>
    </Box>
  );
};

export default ReviewListPage;