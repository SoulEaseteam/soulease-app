// src/pages/therapist/TherapistProfilePage.tsx
//
// 🆕 Round 26 (founder 2026-05-02): refactor for real Firestore live data.
//    Founder asked: "จัดการหน้า src/pages/therapist ให้ดึงข้อมูลจิง มาใช้".
//
// 🆕 Round 28x.87 (founder reference screenshots, "อยากได้ 3 แท็บแบบภาพอ้างอิง")
//   — Working Status (the toggle grid, Holiday switch, location rows) moved
//   to the new TherapistHomePage; this page is now identity + Settings only,
//   same split the reference app uses (grid icon = dashboard, person icon =
//   profile). Doc resolution now comes from the shared useTherapistSelf hook
//   instead of a local copy, so Home and Profile can never disagree about
//   which therapist doc they're reading.
//   Also dropped todayBookings/completedJobs/cancelledJobs — dead state left
//   over from 28x.78 moving those counters to /therapist/jobs; they were
//   computed on every bookings snapshot here but never rendered.

import React, { useEffect, useMemo, useState } from "react";
import { Box, Typography, CircularProgress, Chip, Button } from "@mui/material";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import { useNavigate } from "react-router-dom";
import { auth, db } from "@/lib/firebase";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { signOut } from "firebase/auth";

import type { Avail } from "@/types/therapist";
// 🆕 Round 28r52 — Phase 3.1 responsive shell.
import { responsiveShell } from "@/theme/breakpoints";
import { calculateTherapistStatus } from "@/utils/calculateTherapistStatus";
import { enhanceImage } from "@/utils/cloudinary";
import { useTherapistSelf } from "@/hooks/useTherapistSelf";

const SERIF = '"Playfair Display", "Fraunces", Georgia, "Times New Roman", serif';
const SANS = '"Inter", system-ui, -apple-system, sans-serif';

/** Narrow shape of a booking record we read from Firestore. */
interface BookingDoc {
  reviewText?: string;
  status?: string;
}

/** Status pill colors — brand-consistent, no salmon. */
const STATUS_PILL: Record<Avail, { bg: string; color: string; label: string }> = {
  available: { bg: "#16a34a", color: "#fff", label: "Available" },
  bookable: { bg: "#831843", color: "#F4F6F5", label: "In session" },
  resting: { bg: "rgba(0,0,0,0.38)", color: "#FFFFFF", label: "Resting" },
  holiday: { bg: "rgba(0,0,0,0.38)", color: "#FFFFFF", label: "On holiday" },
};

const TherapistProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { therapist, therapistDocId, loading } = useTherapistSelf();

  // Live review count — completed bookings with a non-empty reviewText.
  const [reviewCount, setReviewCount] = useState(0);
  useEffect(() => {
    const myUid = auth.currentUser?.uid;
    if (!myUid) return;
    const q = query(collection(db, "bookings"), where("therapistUid", "==", myUid));
    const unsub = onSnapshot(q, (snap) => {
      let reviewed = 0;
      snap.forEach((d) => {
        const b = d.data() as BookingDoc;
        const status = (b.status ?? "").toLowerCase();
        if (
          ["completed", "done"].includes(status) &&
          typeof b.reviewText === "string" &&
          b.reviewText.trim().length > 0
        ) {
          reviewed += 1;
        }
      });
      setReviewCount(reviewed);
    });
    return () => unsub();
  }, [therapistDocId]); // re-subscribes after auth resolves the profile

  // Computed status via canonical engine — one source of truth.
  const computedStatus: Avail = useMemo(() => {
    if (!therapist) return "resting";
    const { status } = calculateTherapistStatus(therapist);
    /* eslint-disable @typescript-eslint/no-unnecessary-condition */
    return status === "available" || status === "bookable" || status === "resting"
      ? status
      : "resting";
    /* eslint-enable @typescript-eslint/no-unnecessary-condition */
  }, [therapist]);

  const handleLogout = async () => {
    await signOut(auth);
    void navigate("/login");
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 10 }}>
        <CircularProgress sx={{ color: "#D97C95" }} />
      </Box>
    );
  }

  if (!therapist) {
    return (
      <Box sx={{ ...responsiveShell, padding: "40px 24px", textAlign: "center" }}>
        <Typography sx={{ fontFamily: SERIF, fontSize: "18px", fontWeight: 600, color: "var(--sr-ink)", marginBottom: 1 }}>
          Therapist profile not found
        </Typography>
        <Typography sx={{ fontFamily: SANS, fontSize: "13px", color: "var(--sr-muted)", marginBottom: 3 }}>
          Please contact admin if this is unexpected.
        </Typography>
        <Button onClick={handleLogout} variant="outlined">
          Sign out
        </Button>
      </Box>
    );
  }

  const rawImage = therapist.image || "placeholder.jpg";
  const resolvedImage =
    rawImage.startsWith("http") || rawImage.startsWith("/")
      ? rawImage
      : `/images/${rawImage}`;

  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
  const ratingNum = (Number(therapist.rating) || 0).toFixed(1);
  const pill = STATUS_PILL[computedStatus];

  return (
    <Box
      sx={{
        ...responsiveShell,
        minHeight: "100vh",
        background: "var(--sr-bg)",
        paddingBottom: "calc(80px + env(safe-area-inset-bottom, 0px))",
        fontFamily: SANS,
      }}
    >
      {/* Header — brand red→coral gradient (replaces legacy salmon) */}
      <Box
        sx={{
          position: "relative",
          padding: "24px 20px 28px",
          background: "linear-gradient(160deg, #A34A67 0%, #7A3049 55%, #5A2733 100%)",
          borderBottomLeftRadius: 28,
          borderBottomRightRadius: 28,
          color: "#fff",
          boxShadow: "0 12px 30px rgba(15, 23, 42, 0.22)",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Box
            component="img"
            src={enhanceImage(resolvedImage, { variant: "card" })}
            alt={therapist.name}
            width={96}
            height={96}
            loading="lazy"
            decoding="async"
            sx={{
              width: 96,
              height: 96,
              borderRadius: "50%",
              objectFit: "cover",
              border: "3px solid rgba(255,255,255,0.85)",
              boxShadow: "0 6px 16px rgba(15, 23, 42, 0.14)",
              flexShrink: 0,
            }}
          />

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              sx={{
                fontFamily: SERIF,
                fontWeight: 600,
                fontSize: "20px",
                lineHeight: 1.1,
                letterSpacing: "-0.01em",
              }}
            >
              {therapist.name}
            </Typography>
            <Typography
              sx={{
                fontFamily: SANS,
                fontSize: "11px",
                opacity: 0.85,
                marginTop: "2px",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {(therapist as { email?: string }).email ?? ""}
            </Typography>

            <Box
              sx={{
                marginTop: "6px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                flexWrap: "wrap",
              }}
            >
              <Chip
                size="small"
                label={pill.label}
                sx={{
                  height: 22,
                  background: pill.bg,
                  color: pill.color,
                  fontWeight: 700,
                  fontSize: "10px",
                  letterSpacing: "0.04em",
                }}
              />
              <Typography
                sx={{
                  fontFamily: SANS,
                  fontSize: "10.5px",
                  opacity: 0.85,
                  fontWeight: 600,
                }}
              >
                ★ {ratingNum} · {reviewCount} review
                {reviewCount === 1 ? "" : "s"}
              </Typography>
            </Box>

            <Typography
              sx={{
                fontFamily: SANS,
                fontSize: "10.5px",
                opacity: 0.78,
                marginTop: "4px",
              }}
            >
              Hours · {therapist.startTime ?? "—"} – {therapist.endTime ?? "—"}
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Settings — the only thing left here besides identity. Working
          Status moved to the Home dashboard (28x.87). */}
      <Box sx={{ paddingX: 2, marginTop: 2.5 }}>
        <Box
          role="button"
          tabIndex={0}
          onClick={() => navigate("/therapist/settings")}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") void navigate("/therapist/settings"); }}
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            padding: "14px 16px",
            borderRadius: 3,
            background: "var(--sr-panel)",
            border: "1px solid rgba(184,92,60,0.18)",
            boxShadow: "0 6px 18px rgba(15, 23, 42,0.06)",
            cursor: "pointer",
            "&:active": { background: "var(--sr-panel-2)" },
          }}
        >
          <SettingsRoundedIcon sx={{ color: "#C96F89" }} />
          <Typography sx={{ flex: 1, fontFamily: SANS, fontWeight: 700, fontSize: "14px", color: "var(--sr-ink)" }}>
            ตั้งค่า · Settings
          </Typography>
          <ChevronRightRoundedIcon sx={{ color: "var(--sr-dim)" }} />
        </Box>
      </Box>
    </Box>
  );
};

export default TherapistProfilePage;
