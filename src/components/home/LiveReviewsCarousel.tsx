// src/components/home/LiveReviewsCarousel.tsx
// แสดงรีวิวจริงจาก Firestore (`reviews` collection) — ล่าสุด 8 รายการ
// ใช้แทน hardcoded testimonials เพราะ:
//  1. รีวิวจริง = trust signal ที่แท้จริง
//  2. update อัตโนมัติเมื่อมีรีวิวใหม่ — UI สด
import React, { useEffect, useState } from "react";
import { Box, Typography, Stack, Avatar, CircularProgress } from "@mui/material";
import { Quote } from "lucide-react";
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Link } from "react-router-dom";

interface Review {
  id: string;
  rating: number;
  comment: string;
  userName?: string;
  userFlag?: string;
  therapistId?: string;
  therapistName?: string;
  createdAt?: any;
}

const LiveReviewsCarousel: React.FC = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        // ดึง reviews ล่าสุด 8 อันที่ rating >= 4
        const q = query(
          collection(db, "reviews"),
          orderBy("createdAt", "desc"),
          limit(12)
        );
        const snap = await getDocs(q);
        if (cancelled) return;
        const items: Review[] = [];
        snap.forEach((d) => {
          const data = d.data() as any;
          if ((data.rating ?? 0) >= 4 && data.comment) {
            items.push({
              id: d.id,
              rating: data.rating ?? 5,
              comment: String(data.comment).slice(0, 240),
              userName: data.userName || "Anonymous",
              userFlag: data.userFlag,
              therapistId: data.therapistId,
              therapistName: data.therapistName,
              createdAt: data.createdAt,
            });
          }
        });
        setReviews(items.slice(0, 8));
      } catch (e) {
        // Firestore rules might block unauthenticated read — silently fail
        console.warn("[LiveReviews] failed to load:", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // ถ้าไม่มี reviews ใน DB เลย — ซ่อน section ทั้งหมด (แทนที่จะแสดง empty)
  if (!loading && reviews.length === 0) return null;

  return (
    <Box sx={{ mt: 6, mb: 5, px: 2 }}>
      <Typography
        sx={{
          fontSize: 11,
          letterSpacing: 4,
          textAlign: "center",
          color: "#FE0944",
          fontWeight: 700,
          mb: 1,
          textTransform: "uppercase",
        }}
      >
        Real Reviews
      </Typography>
      <Typography
        sx={{
          fontSize: 22,
          textAlign: "center",
          fontWeight: 700,
          mb: 0.5,
          color: "#0F172A",
        }}
      >
        ลูกค้าจริง · จากระบบ
      </Typography>
      <Typography
        sx={{ fontSize: 13, textAlign: "center", color: "#64748B", mb: 3 }}
      >
        Real reviews from verified bookings
      </Typography>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
          <CircularProgress size={24} sx={{ color: "#FE0944" }} />
        </Box>
      ) : (
        <Box
          sx={{
            display: "flex",
            gap: 1.5,
            overflowX: "auto",
            pb: 2,
            px: 1,
            scrollSnapType: "x mandatory",
            WebkitOverflowScrolling: "touch",
            "&::-webkit-scrollbar": { display: "none" },
          }}
        >
          {reviews.map((r) => (
            <Box
              key={r.id}
              component={r.therapistId ? Link : "div"}
              to={r.therapistId ? `/review/all/${r.therapistId}` : undefined}
              sx={{
                flex: "0 0 280px",
                scrollSnapAlign: "start",
                p: 2,
                borderRadius: 3,
                background: "#fff",
                border: "1px solid #F1F5F9",
                position: "relative",
                textDecoration: "none",
                color: "inherit",
                cursor: r.therapistId ? "pointer" : "default",
                transition: "all 0.2s ease",
                "&:hover": r.therapistId
                  ? {
                      transform: "translateY(-2px)",
                      boxShadow: "0 6px 20px rgba(254,9,68,0.08)",
                    }
                  : undefined,
              }}
            >
              <Quote
                size={20}
                color="#FE0944"
                style={{
                  opacity: 0.25,
                  position: "absolute",
                  top: 12,
                  right: 12,
                }}
              />
              <Typography
                sx={{ fontSize: 14, color: "#374151", lineHeight: 1.5 }}
              >
                "{r.comment}"
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center" mt={2}>
                <Avatar sx={{ width: 28, height: 28, fontSize: 14 }}>
                  {r.userFlag || (r.userName?.[0] ?? "?").toUpperCase()}
                </Avatar>
                <Box sx={{ flex: 1 }}>
                  <Typography sx={{ fontSize: 12, fontWeight: 700 }}>
                    {r.userName}
                    {r.therapistName && (
                      <Typography
                        component="span"
                        sx={{ fontSize: 10, color: "#94A3B8", ml: 0.5 }}
                      >
                        · {r.therapistName}
                      </Typography>
                    )}
                  </Typography>
                  <Typography sx={{ fontSize: 11, color: "#FBBF24" }}>
                    {"★".repeat(Math.min(5, Math.max(1, Math.round(r.rating))))}
                  </Typography>
                </Box>
              </Stack>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
};

export default LiveReviewsCarousel;
