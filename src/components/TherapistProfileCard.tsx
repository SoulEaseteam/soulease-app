// src/components/TherapistProfileCard.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Typography,
  Button,
  Stack,
  Paper,
  Dialog,
  IconButton,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import RoomIcon from "@mui/icons-material/Room";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  where,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

import type { Therapist } from "@/types/therapist";
import { calculateTherapistStatus } from "@/utils/calculateTherapistStatus";
import { badgeConfig } from "@/utils/badgeConfig";
import { enhanceImage } from "@/utils/cloudinary";

/** ---------------- Utility ---------------- */

/** narrow shape ของ booking ที่อ่านจาก Firestore (มีทั้ง legacy `start`/`end` และ official `startAt`/`endAt`) */
interface BookingDoc {
  startAt?: Timestamp | Date | string | null;
  endAt?: Timestamp | Date | string | null;
  start?: Timestamp | Date | string | null;
  end?: Timestamp | Date | string | null;
  status?: string;
  reviewText?: string;
}

function toDateSafe(v: unknown): Date | null {
  try {
    if (!v) return null;
    if (
      typeof v === "object" &&
      v !== null &&
      "toDate" in v &&
      typeof (v as { toDate?: unknown }).toDate === "function"
    ) {
      return (v as { toDate: () => Date }).toDate();
    }
    if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
    if (typeof v === "string" || typeof v === "number") {
      const d = new Date(v);
      return isNaN(d.getTime()) ? null : d;
    }
    return null;
  } catch {
    return null;
  }
}

function fmtHHMM(d: Date | null): string | null {
  if (!d) return null;
  return `${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes()
  ).padStart(2, "0")}`;
}

function hasActiveBooking(now: Date, start?: Date | null, end?: Date | null) {
  return !!(start && end && now >= start && now < end);
}

function nowThai(): Date {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utc + 7 * 3600 * 1000);
}

/** ---------------- Component ---------------- */
interface TherapistProfileCardProps {
  therapist: Therapist;
  /** ถ้า true → image โหลด eager + fetchpriority=high (ใช้กับการ์ดบนสุดเพื่อช่วย LCP) */
  priority?: boolean;
}

const TherapistProfileCard: React.FC<TherapistProfileCardProps> = ({
  therapist,
  priority = false,
}) => {
  const navigate = useNavigate();

  // realtime therapist document
  const [profile, setProfile] = useState<Therapist>(therapist);

  // stats
  const [reviewCount, setReviewCount] = useState(0);
  const [served, setServed] = useState(therapist.totalBookings ?? 0);
  const [todayBookings, setTodayBookings] = useState(
    therapist.todayBookings ?? 0
  );

  // unified nextAvailable from booking OR status engine
  const [bookingNext, setBookingNext] = useState<string | null>(null);

  // ACTIVE BOOKING REAL-TIME FIX ⭐⭐⭐⭐⭐
  const [activeNow, setActiveNow] = useState(false);

  // image preview dialog
  const [open, setOpen] = useState(false);

  /** ---------------- Firestore: Realtime Therapist Profile ---------------- */
  useEffect(() => {
    if (!therapist.id) return;

    const ref = doc(db, "therapists", therapist.id);
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        setProfile((prev) => ({
          ...prev,
          ...(snap.data() as Partial<Therapist>),
          id: therapist.id,
        }));
      }
    });

    return () => unsub();
  }, [therapist.id]);

  /** ---------------- Firestore: Review Count ---------------- */
  useEffect(() => {
    if (!therapist.id) return;

    const q = query(
      collection(db, "bookings"),
      where("therapistId", "==", therapist.id),
      where("status", "in", ["completed", "done"])
    );

    const unsub = onSnapshot(q, (snap) => {
      let cnt = 0;
      snap.forEach((d) => {
        const data = d.data() as BookingDoc;
        if (data.reviewText?.trim()) cnt++;
      });
      setReviewCount(cnt);
    });

    return () => unsub();
  }, [therapist.id]);

  /** ---------------- Firestore: Served / TodayBookings ---------------- */
  useEffect(() => {
    if (!therapist.id) return;

    const servedQ = query(
      collection(db, "bookings"),
      where("therapistId", "==", therapist.id),
      where("status", "in", ["completed", "done"])
    );
    const unsub1 = onSnapshot(servedQ, (snap) => setServed(snap.size));

    const now = nowThai();
    const startDay = new Date(now);
    const endDay = new Date(now);

    startDay.setHours(0, 0, 0, 0);
    endDay.setHours(23, 59, 59, 999);

    const todayQ = query(
      collection(db, "bookings"),
      where("therapistId", "==", therapist.id),
      where("startAt", ">=", Timestamp.fromDate(startDay)),
      where("startAt", "<=", Timestamp.fromDate(endDay))
    );

    const unsub2 = onSnapshot(todayQ, (snap) => {
      let cnt = 0;
      snap.forEach((d) => {
        const s = (d.data() as BookingDoc).status?.toLowerCase() ?? "";
        if (["confirmed", "paid", "completed"].includes(s)) cnt++;
      });
      setTodayBookings(cnt);
    });

    return () => {
      unsub1();
      unsub2();
    };
  }, [therapist.id]);

  /** ---------------- Firestore: Upcoming Bookings ---------------- */
  useEffect(() => {
    if (!therapist.id) return;

    const upcomingQ = query(
      collection(db, "bookings"),
      where("therapistId", "==", therapist.id),
      orderBy("startAt", "asc")
    );

    const unsub = onSnapshot(upcomingQ, (snap) => {
      const now = nowThai();

      const list = snap.docs
        .map((d) => d.data() as BookingDoc)
        .map((b) => ({
          start: toDateSafe(b.startAt ?? b.start),
          end: toDateSafe(b.endAt ?? b.end),
        }))
        .filter((x): x is { start: Date; end: Date } => !!x.start && !!x.end);

      // Active booking now
      const active = list.find((b) => hasActiveBooking(now, b.start, b.end));
      if (active) {
        setBookingNext(fmtHHMM(active.end));
      } else {
        const nextFuture = list.find((b) => b.start > now);
        setBookingNext(nextFuture ? fmtHHMM(nextFuture.start) : null);
      }
    });

    return () => unsub();
  }, [therapist.id]);

  /** ---------------- ACTIVE BOOKING REAL-TIME FIX ---------------- */
  useEffect(() => {
    if (!therapist.id) return;

    const now = nowThai();

    const qActive = query(
      collection(db, "bookings"),
      where("therapistId", "==", therapist.id),
      where("status", "in", ["confirmed", "paid", "completed"])
    );

    const unsub = onSnapshot(qActive, (snap) => {
      let inSession = false;

      snap.forEach((d) => {
        const b = d.data() as BookingDoc;
        const start = toDateSafe(b.startAt ?? b.start);
        const end = toDateSafe(b.endAt ?? b.end);

        if (start && end && now >= start && now < end) {
          inSession = true;
        }
      });

      setActiveNow(inSession);
    });

    return () => unsub();
  }, [therapist.id]);

  /** ---------------- FINAL STATUS ENGINE ---------------- */
  const engineResult = useMemo(() => {
    return calculateTherapistStatus({
      ...profile,
      todayBookings,
      totalBookings: served,
    } as Therapist);
  }, [profile, todayBookings, served]);

  const finalStatus = engineResult.status;
  const engineNext = engineResult.nextAvailable;

  // ⭐ OVERRIDE: If real-time booking is active → force "bookable"
  const displayStatus = activeNow ? "bookable" : finalStatus;

  const finalNext =
    bookingNext && displayStatus !== "available"
      ? bookingNext
      : engineNext ?? null;

  /** ---------------- BADGE ---------------- */
  const activeBadge = useMemo(() => {
    const base: Therapist = {
      ...profile,
      todayBookings,
      totalBookings: served,
    };
    return badgeConfig.find((cfg) => cfg.condition(base)) ?? null;
  }, [profile, todayBookings, served]);

  // framer-motion props ใช้ shape ที่ยืดหยุ่นมาก ปล่อยให้ infer เองได้
  const badgeMotionProps = useMemo(() => {
    if (!activeBadge || activeBadge.animation === "none") return {};

    if (activeBadge.animation === "pulse") {
      return {
        animate: { scale: [1, 1.08, 1] },
        transition: { duration: 1.6, repeat: Infinity, ease: "easeInOut" as const },
      };
    }

    if (activeBadge.animation === "float") {
      return {
        animate: { y: [0, -6, 0] },
        transition: { duration: 2.2, repeat: Infinity, ease: "easeInOut" as const },
      };
    }

    return {};
  }, [activeBadge]);

  const resolvedImage =
    profile.image.startsWith("http") || profile.image.startsWith("/")
      ? profile.image
      : `/images/${profile.image ?? "placeholder.jpg"}`;

  /** ---------------- UI ---------------- */
  return (
    <motion.div
      initial={{ opacity: 0, y: 18, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      whileHover={{ scale: 1.025, y: -6 }}
      whileTap={{ scale: 0.985 }}
      transition={{ type: "spring", stiffness: 130, damping: 14 }}
    >
      <Paper
        sx={{
          width: "86%",
          maxWidth: 260,
          borderRadius: 6,
          p: 1.7,
          backgroundColor: "rgba(255,255,255,0.55)",
          backdropFilter: "blur(14px)",
          textAlign: "center",
          boxShadow: "0 8px 20px rgba(0,0,0,0.08)",
          border: "1px solid rgba(255, 255, 255, 0.6)",
          transition: "box-shadow 0.25s ease",
          "&:hover": {
            boxShadow:
              "0 16px 40px rgba(225, 29, 72, 0.15), 0 6px 18px rgba(99, 102, 241, 0.12)",
          },
        }}
      >
        {/* Image */}
        <Box sx={{ position: "relative" }}>
          <Box
            component="img"
            src={enhanceImage(resolvedImage, { variant: "card" })}
            alt={profile.name}
            loading={priority ? "eager" : "lazy"}
            // ⚡ HTML attr: fetchpriority="high" — ช่วย LCP ของการ์ดบนสุด
            {...(priority ? { fetchpriority: "high" as const } : {})}
            decoding="async"
            sx={{
              width: "100%",
              height: 260,
              objectFit: "cover",
              borderRadius: 4,
              cursor: "pointer",
              filter: displayStatus === "resting" ? "blur(2px)" : "none",
            }}
            onClick={() => setOpen(true)}
          />

          {/* Badge */}
          {activeBadge && (
            <Box
              component={motion.img}
              src={activeBadge.image}
              alt="badge"
              sx={{
                position: "absolute",
                top: activeBadge.position.top,
                left: activeBadge.position.left,
                width: activeBadge.size,
              }}
              {...badgeMotionProps}
            />
          )}

          {/* Distance — Therapist type มี distanceKm อยู่แล้ว */}
          {typeof therapist.distanceKm === "number" && (
            <Typography
              fontSize={12}
              color="#fff"
              sx={{
                position: "absolute",
                bottom: 10,
                left: 10,
                px: 1.2,
                py: 0.3,
                borderRadius: 99,
                backdropFilter: "blur(6px)",
                background: "rgba(0,0,0,0.28)",
              }}
            >
              <RoomIcon sx={{ fontSize: 14, mr: 0.5 }} />
              {therapist.distanceKm.toFixed(1)} km
            </Typography>
          )}
        </Box>

        {/* Name + Photos */}
        <Stack direction="row" justifyContent="center" spacing={1} mt={1}>
          <Typography fontWeight="bold" fontSize={20} color="#555">
            {profile.name}
          </Typography>

          <Button
            size="small"
            variant="outlined"
            onClick={() =>
              navigate(`/therapists/${profile.id}?section=profile`)
            }
            sx={{
              fontSize: 9,
              borderRadius: 99,
              px: 1,
              color: "#FE0944",
              borderColor: "#FEAE96",
              fontWeight: "bold",
              textTransform: "none",
            }}
          >
            PHOTOS
          </Button>
        </Stack>

        <Typography fontSize={14} color="#666" mt={0.5}>
          <img
            src="/images/icon/star.png"
            alt="star"
            style={{ width: 18, height: 18, marginRight: 6 }}
          />
          {(profile.rating ?? 0).toFixed(1)} | {served} served
        </Typography>

        {/* Reviews + Button */}
        <Stack direction="row" spacing={1} mt={1} justifyContent="center">
          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            sx={{
              px: 1.2,
              py: 0.7,
              borderRadius: 20,
              bgcolor: "rgba(0,0,0,0.04)",
            }}
          >
            <img
              src="/images/icon/chat-dots (2).png"
              alt="reviews"
              style={{ width: 25, height: 25, cursor: "pointer" }}
              onClick={() => navigate(`/review/all/${profile.id}`)}
            />
            <Typography
              sx={{ cursor: "pointer" }}
              onClick={() => navigate(`/review/all/${profile.id}`)}
            >
              {reviewCount}
            </Typography>

            <Button
              variant="contained"
              size="small"
              disabled={displayStatus === "resting"}
              onClick={() =>
                navigate(`/therapists/${profile.id}?section=services`)
              }
              sx={{
                fontSize: 12,
                borderRadius: 99,
                minWidth: 100,
                backgroundColor:
                  displayStatus === "resting"
                    ? "#9b9484"
                    : displayStatus === "bookable"
                    ? "#ef6c00"
                    : "#f36c60",
                "&.Mui-disabled": {
                  backgroundColor: "#b0bec5",
                  color: "#fff",
                },
              }}
            >
              {displayStatus === "available"
                ? "BOOK NOW"
                : displayStatus === "bookable"
                ? "IN SESSION"
                : "RESTING"}
            </Button>
          </Stack>
        </Stack>

        {/* Next Available */}
        {finalNext && (
          <Typography fontSize={12} color="#666" mt={1}>
            Available: {finalNext}
          </Typography>
        )}

        {/* Preview dialog */}
        <Dialog open={open} onClose={() => setOpen(false)}>
          <Box sx={{ position: "relative" }}>
            <IconButton
              onClick={() => setOpen(false)}
              sx={{
                position: "absolute",
                top: 4,
                right: 4,
                background: "rgba(0,0,0,0.45)",
                color: "#fff",
              }}
            >
              <CloseIcon />
            </IconButton>
            <Box
              component="img"
              src={enhanceImage(resolvedImage, { variant: "hero" })}
              sx={{
                width: "100%",
                maxWidth: 400,
                objectFit: "cover",
                borderRadius: 4,
              }}
            />
          </Box>
        </Dialog>
      </Paper>
    </motion.div>
  );
};

export default TherapistProfileCard;