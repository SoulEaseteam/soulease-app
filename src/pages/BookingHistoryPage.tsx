// src/pages/BookingHistoryPage.tsx
//
// 🎨 Phase 5A — My Bookings page (rewrite of legacy 360-line MUI version).
//
// Visual language matches Phase 4 Confirm Order: warm cream background,
// glass cards, red→coral gradient CTAs, Fraunces+Inter typography.
//
// Layout:
//   ┌─ ← My Bookings ─────────────────────────────┐
//   │  [ Upcoming · Completed · Cancelled ]       │  tab switcher
//   │                                              │
//   │  ┌─ Booking card ────────────────────────┐  │
//   │  │ [avatar] Yuri · ★4.7        [STATUS]  │  │
//   │  │          Thai Massage · 90 min          │  │
//   │  │          Today · 17:00                  │  │
//   │  │          📍 Mandarin Oriental           │  │
//   │  │  ─────                                  │  │
//   │  │  Total ฿1,800        [Rebook] [Review] │  │
//   │  └────────────────────────────────────────┘  │
//   │  …                                           │
//   └──────────────────────────────────────────────┘
//
// 🚧 Cancel + Review submit flows wired in next sub-commits (5A-2, 5A-3).
//    Today: read-only list + Rebook navigates to /therapists/:id so the
//    user can pick a fresh date/time on the detail page.

import React, { useEffect, useMemo, useState } from "react";
import { Box, Typography, IconButton, Tabs, Tab, Button } from "@mui/material";
import { useNavigate } from "react-router-dom";
import {
  collection,
  onSnapshot,
  query,
  where,
  orderBy,
  Timestamp,
} from "firebase/firestore";
import dayjs from "dayjs";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import LocationOnRoundedIcon from "@mui/icons-material/LocationOnRounded";

import { db } from "@/lib/firebase";
import { useAuth } from "@/providers/AuthProvider";
import { formatTHB } from "@/utils/servicePricing";
import { bayesianRatingFromAggregate, formatRating } from "@/utils/rating";
import therapistsData from "@/data/therapists";

const SERIF = '"Fraunces", Georgia, "Times New Roman", serif';
const SANS = '"Inter", system-ui, -apple-system, sans-serif';

type BookingStatus =
  | "pending"
  | "confirmed"
  | "completed"
  | "cancelled"
  | "upcoming"; // legacy alias

interface Booking {
  id: string;
  therapistId: string;
  therapistName?: string;
  serviceName?: string;
  duration?: number;
  date?: string;
  time?: string;
  startAt?: Timestamp;
  locationName?: string;
  address?: string;
  servicePrice?: number;
  taxiFee?: number;
  totalPrice?: number;
  total?: number;
  status: BookingStatus;
  reviewed?: boolean;
  rating?: number;
  reviewText?: string;
  createdAt?: Timestamp;
  userId?: string;
}

const STATUS_PILL: Record<
  string,
  { label: string; bg: string; fg: string; bucket: TabKey }
> = {
  upcoming: { label: "Upcoming", bg: "rgba(254, 9, 68, 0.1)", fg: "#FE0944", bucket: "upcoming" },
  pending: { label: "Pending", bg: "rgba(254, 9, 68, 0.1)", fg: "#FE0944", bucket: "upcoming" },
  confirmed: { label: "Confirmed", bg: "rgba(22, 163, 74, 0.12)", fg: "#16a34a", bucket: "upcoming" },
  completed: { label: "Completed", bg: "rgba(60, 30, 20, 0.08)", fg: "rgba(60, 30, 20, 0.7)", bucket: "completed" },
  cancelled: { label: "Cancelled", bg: "rgba(0, 0, 0, 0.06)", fg: "rgba(60, 30, 20, 0.5)", bucket: "cancelled" },
};

type TabKey = "upcoming" | "completed" | "cancelled";

const TABS: { key: TabKey; label: string }[] = [
  { key: "upcoming", label: "Upcoming" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
];

const BookingHistoryPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabKey>("upcoming");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Firestore real-time listener for THIS user's bookings
  useEffect(() => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }
    const q = query(
      collection(db, "bookings"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const next: Booking[] = [];
        snap.forEach((d) => {
          const data = d.data() as Omit<Booking, "id">;
          next.push({ id: d.id, ...data });
        });
        setBookings(next);
        setLoading(false);
      },
      (err) => {
        console.warn("[bookings] snapshot error:", err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [user?.uid]);

  // ── Bucket by status
  const counts = useMemo(() => {
    const c: Record<TabKey, number> = {
      upcoming: 0,
      completed: 0,
      cancelled: 0,
    };
    for (const b of bookings) {
      const meta = STATUS_PILL[b.status];
      if (meta) c[meta.bucket]++;
    }
    return c;
  }, [bookings]);

  const visible = useMemo(
    () =>
      bookings.filter((b) => {
        const meta = STATUS_PILL[b.status];
        return meta?.bucket === tab;
      }),
    [bookings, tab]
  );

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #FFF8F0 0%, #FCEBDC 100%)",
        paddingBottom: "120px",
        fontFamily: SANS,
      }}
    >
      {/* ── Page header ── */}
      <Box
        sx={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          background: "rgba(255, 248, 240, 0.92)",
          backdropFilter: "blur(20px) saturate(180%)",
          WebkitBackdropFilter: "blur(20px) saturate(180%)",
          borderBottom: "1px solid rgba(0, 0, 0, 0.04)",
          display: "flex",
          alignItems: "center",
          padding: "14px 16px",
        }}
      >
        <IconButton
          aria-label="back"
          onClick={() => void navigate(-1)}
          sx={{
            width: 36,
            height: 36,
            background: "rgba(255, 255, 255, 0.7)",
            border: "1px solid rgba(0, 0, 0, 0.06)",
            color: "#3c1e14",
            "&:hover": { background: "rgba(255, 255, 255, 0.9)" },
          }}
        >
          <ArrowBackRoundedIcon fontSize="small" />
        </IconButton>
        <Typography
          component="h1"
          sx={{
            flex: 1,
            textAlign: "center",
            fontFamily: SERIF,
            fontSize: "18px",
            fontWeight: 600,
            color: "#3c1e14",
            letterSpacing: "-0.01em",
            marginRight: "36px",
          }}
        >
          My Bookings
        </Typography>
      </Box>

      {/* ── Tabs ── */}
      <Box sx={{ padding: "8px 16px 0" }}>
        <Tabs
          value={tab}
          onChange={(_, v: TabKey) => setTab(v)}
          variant="fullWidth"
          sx={{
            background: "rgba(255, 255, 255, 0.7)",
            backdropFilter: "blur(20px) saturate(180%)",
            WebkitBackdropFilter: "blur(20px) saturate(180%)",
            borderRadius: "14px",
            minHeight: 44,
            border: "1px solid rgba(255, 255, 255, 0.6)",
            "& .MuiTab-root": {
              fontFamily: SANS,
              fontSize: "13px",
              fontWeight: 700,
              textTransform: "none",
              color: "rgba(60, 30, 20, 0.55)",
              minHeight: 44,
              "&.Mui-selected": { color: "#FE0944" },
            },
            "& .MuiTabs-indicator": {
              background: "linear-gradient(135deg, #FE0944, #FE7A52)",
              height: "3px",
              borderRadius: "2px 2px 0 0",
            },
          }}
        >
          {TABS.map((t) => (
            <Tab
              key={t.key}
              value={t.key}
              label={`${t.label}${counts[t.key] > 0 ? ` (${counts[t.key]})` : ""}`}
            />
          ))}
        </Tabs>
      </Box>

      {/* ── List ── */}
      <Box
        sx={{
          padding: "16px",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
        }}
      >
        {!user ? (
          <EmptyState
            icon="🔒"
            title="Sign in to view your bookings"
            body="Your booking history shows here once you log in."
            ctaLabel="Sign in"
            onCta={() => void navigate("/login")}
          />
        ) : loading ? (
          <Typography
            sx={{
              fontFamily: SANS,
              fontSize: "13px",
              color: "rgba(60, 30, 20, 0.55)",
              textAlign: "center",
              padding: "40px 0",
            }}
          >
            Loading your bookings…
          </Typography>
        ) : visible.length === 0 ? (
          <EmptyState
            icon={tab === "upcoming" ? "🗓" : tab === "completed" ? "🎉" : "💤"}
            title={
              tab === "upcoming"
                ? "No upcoming bookings"
                : tab === "completed"
                ? "No completed sessions yet"
                : "No cancelled bookings"
            }
            body={
              tab === "upcoming"
                ? "Browse therapists and book your next session."
                : tab === "completed"
                ? "Your completed sessions will land here once you book."
                : "Cancelled bookings would show here."
            }
            ctaLabel={tab === "upcoming" ? "Browse therapists" : undefined}
            onCta={
              tab === "upcoming"
                ? () => void navigate("/therapists")
                : undefined
            }
          />
        ) : (
          visible.map((b) => (
            <BookingCard
              key={b.id}
              booking={b}
              onRebook={() =>
                void navigate(`/therapists/${b.therapistId}`)
              }
              onReview={() =>
                void navigate(`/review/${b.id}`)
              }
            />
          ))
        )}
      </Box>
    </Box>
  );
};

// ──────────────────────────────────────────────────────────────────
// Booking card
// ──────────────────────────────────────────────────────────────────
const BookingCard: React.FC<{
  booking: Booking;
  onRebook: () => void;
  onReview: () => void;
}> = ({ booking, onRebook, onReview }) => {
  const status = STATUS_PILL[booking.status] ?? STATUS_PILL.pending;
  const therapist = therapistsData.find((tt) => tt.id === booking.therapistId);
  const total = booking.totalPrice ?? booking.total ?? 0;

  const dateLabel = booking.startAt?.toDate
    ? dayjs(booking.startAt.toDate()).format("ddd MMM D")
    : booking.date
    ? dayjs(booking.date).format("ddd MMM D")
    : "—";
  const timeLabel = booking.time ?? "—";

  const isUpcoming = status.bucket === "upcoming";
  const isCompleted = status.bucket === "completed";

  return (
    <Box
      sx={{
        padding: "14px",
        borderRadius: "16px",
        background: "rgba(255, 255, 255, 0.7)",
        border: "1px solid rgba(255, 255, 255, 0.6)",
        boxShadow: "0 4px 14px rgba(126, 30, 46, 0.06)",
      }}
    >
      {/* Top row — avatar + name + status */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          marginBottom: "10px",
        }}
      >
        <Box
          sx={{
            width: 44,
            height: 44,
            flexShrink: 0,
            borderRadius: "50%",
            background: therapist?.image
              ? `center / cover no-repeat url("${therapist.image}"), linear-gradient(135deg, #d4a574, #8b6f47)`
              : "linear-gradient(135deg, #d4a574, #8b6f47)",
            border: "2px solid #fff",
            boxShadow: "0 2px 6px rgba(0, 0, 0, 0.1)",
          }}
        />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            sx={{
              fontFamily: SERIF,
              fontSize: "15px",
              fontWeight: 600,
              color: "#3c1e14",
              lineHeight: 1.2,
            }}
          >
            {booking.therapistName ?? therapist?.name ?? "Therapist"}
          </Typography>
          {therapist && (
            <Typography
              sx={{
                fontFamily: SANS,
                fontSize: "11.5px",
                color: "rgba(60, 30, 20, 0.6)",
                marginTop: "2px",
              }}
            >
              ★{" "}
              {formatRating(
                bayesianRatingFromAggregate(
                  therapist.rating * (therapist.reviews ?? 0),
                  therapist.reviews ?? 0
                )
              )}{" "}
              · Licensed (ผ.พ.)
            </Typography>
          )}
        </Box>
        <Box
          sx={{
            fontFamily: SANS,
            fontSize: "10px",
            fontWeight: 800,
            letterSpacing: "0.06em",
            background: status.bg,
            color: status.fg,
            padding: "4px 10px",
            borderRadius: "999px",
            textTransform: "uppercase",
            flexShrink: 0,
          }}
        >
          {status.label}
        </Box>
      </Box>

      {/* Middle — service + when + where */}
      <Box sx={{ display: "flex", flexDirection: "column", gap: "4px" }}>
        <Typography
          sx={{
            fontFamily: SERIF,
            fontSize: "14px",
            fontWeight: 600,
            color: "#3c1e14",
          }}
        >
          {booking.serviceName ?? "—"}
          {booking.duration && (
            <Box
              component="span"
              sx={{
                fontFamily: SANS,
                fontSize: "12px",
                fontWeight: 500,
                color: "rgba(60, 30, 20, 0.6)",
                marginLeft: "8px",
              }}
            >
              · {booking.duration} min
            </Box>
          )}
        </Typography>
        <Typography
          sx={{
            fontFamily: SANS,
            fontSize: "12px",
            color: "rgba(60, 30, 20, 0.7)",
          }}
        >
          {dateLabel} · {timeLabel}
        </Typography>
        {(booking.locationName || booking.address) && (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              color: "rgba(60, 30, 20, 0.55)",
            }}
          >
            <LocationOnRoundedIcon sx={{ fontSize: 14 }} />
            <Typography
              sx={{
                fontFamily: SANS,
                fontSize: "12px",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {booking.locationName ?? booking.address}
            </Typography>
          </Box>
        )}
      </Box>

      {/* Bottom — total + actions */}
      <Box
        sx={{
          marginTop: "12px",
          paddingTop: "12px",
          borderTop: "1px solid rgba(0, 0, 0, 0.06)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "10px",
        }}
      >
        <Box>
          <Typography
            sx={{
              fontFamily: SANS,
              fontSize: "10px",
              fontWeight: 700,
              color: "rgba(60, 30, 20, 0.55)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            Total
          </Typography>
          <Typography
            sx={{
              fontFamily: SERIF,
              fontSize: "18px",
              fontWeight: 700,
              color: "#FE0944",
              letterSpacing: "-0.02em",
              lineHeight: 1.1,
            }}
          >
            {formatTHB(total)}
          </Typography>
        </Box>
        <Box sx={{ display: "flex", gap: "8px" }}>
          {isCompleted && !booking.reviewed && (
            <Button
              size="small"
              onClick={onReview}
              sx={{
                height: 36,
                paddingX: "14px",
                borderRadius: "999px",
                background: "rgba(254, 9, 68, 0.08)",
                color: "#FE0944",
                fontFamily: SANS,
                fontSize: "12px",
                fontWeight: 700,
                textTransform: "none",
                "&:hover": { background: "rgba(254, 9, 68, 0.14)" },
              }}
            >
              ★ Review
            </Button>
          )}
          {!isUpcoming && (
            <Button
              size="small"
              onClick={onRebook}
              sx={{
                height: 36,
                paddingX: "14px",
                borderRadius: "999px",
                background: "linear-gradient(135deg, #FE0944, #FE7A52)",
                color: "#fff",
                fontFamily: SANS,
                fontSize: "12px",
                fontWeight: 700,
                textTransform: "none",
                boxShadow: "0 4px 12px rgba(254, 9, 68, 0.25)",
                "&:hover": {
                  background: "linear-gradient(135deg, #E50840, #E56A47)",
                },
              }}
            >
              Rebook
            </Button>
          )}
        </Box>
      </Box>
    </Box>
  );
};

// ──────────────────────────────────────────────────────────────────
// Empty state card
// ──────────────────────────────────────────────────────────────────
const EmptyState: React.FC<{
  icon: string;
  title: string;
  body: string;
  ctaLabel?: string;
  onCta?: () => void;
}> = ({ icon, title, body, ctaLabel, onCta }) => (
  <Box
    sx={{
      padding: "48px 24px",
      textAlign: "center",
      borderRadius: "16px",
      background: "rgba(255, 255, 255, 0.5)",
      border: "1px solid rgba(255, 255, 255, 0.6)",
    }}
  >
    <Box sx={{ fontSize: "44px", lineHeight: 1, marginBottom: "12px" }}>
      {icon}
    </Box>
    <Typography
      sx={{
        fontFamily: SERIF,
        fontSize: "18px",
        fontWeight: 600,
        color: "#3c1e14",
        marginBottom: "6px",
      }}
    >
      {title}
    </Typography>
    <Typography
      sx={{
        fontFamily: SANS,
        fontSize: "13px",
        color: "rgba(60, 30, 20, 0.6)",
        marginBottom: "18px",
        lineHeight: 1.5,
      }}
    >
      {body}
    </Typography>
    {ctaLabel && onCta && (
      <Button
        onClick={onCta}
        sx={{
          height: 44,
          paddingX: "24px",
          borderRadius: "999px",
          background: "linear-gradient(135deg, #FE0944, #FE7A52)",
          color: "#fff",
          fontFamily: SANS,
          fontSize: "14px",
          fontWeight: 700,
          textTransform: "none",
          boxShadow: "0 6px 18px rgba(254, 9, 68, 0.3)",
          "&:hover": {
            background: "linear-gradient(135deg, #E50840, #E56A47)",
          },
        }}
      >
        {ctaLabel}
      </Button>
    )}
  </Box>
);

export default BookingHistoryPage;
