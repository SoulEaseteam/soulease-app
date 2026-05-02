// src/pages/therapist/TherapistProfilePage.tsx
//
// 🆕 Round 26 (founder 2026-05-02): refactor for real Firestore live data.
//    Founder asked: "จัดการหน้า src/pages/therapist ให้ดึงข้อมูลจิง มาใช้".
//
// Changes vs. legacy version:
//   • One-shot getDoc/getDocs → onSnapshot live subscriptions on therapist
//     doc + bookings query. Stats refresh in real time as bookings move.
//   • Inline `getComputedStatus()` removed — use canonical
//     calculateTherapistStatus engine (same as customer-side cards) so the
//     therapist-self view never disagrees with what customers see.
//   • `any` types replaced with Therapist + BookingDoc shapes.
//   • Number()/safe-string coercion on rating + image (matches the dodge
//     we applied across HomeTherapistGrid, TherapistProfileCard, etc.).
//   • Live review count (bookings with non-empty reviewText) +
//     served count (completed bookings) — same pattern as Round 25f.
//   • Dead menu links removed: /therapist/bookings doesn't exist (no
//     route in App.tsx) and /therapist/status was deleted in Round 22b.
//   • Brand-consistent styling: warm cream gradient + Fraunces serif +
//     brand red. Replaces legacy salmon (#FB8085).

import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Typography,
  CircularProgress,
  Chip,
  IconButton,
  Divider,
  Button,
} from "@mui/material";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import RoomRoundedIcon from "@mui/icons-material/RoomRounded";
import MyLocationRoundedIcon from "@mui/icons-material/MyLocationRounded";
import { useNavigate } from "react-router-dom";
import { auth, db } from "@/lib/firebase";
import {
  doc,
  getDoc,
  getDocs,
  query,
  where,
  collection,
  onSnapshot,
  Timestamp,
} from "firebase/firestore";
import { signOut } from "firebase/auth";

import ProfileSummaryCard from "@/components/therapist/ProfileSummaryCard";
import type { Therapist, Avail } from "@/types/therapist";
import { calculateTherapistStatus } from "@/utils/calculateTherapistStatus";
import { enhanceImage } from "@/utils/cloudinary";

const SERIF = '"Fraunces", Georgia, "Times New Roman", serif';
const SANS = '"Inter", system-ui, -apple-system, sans-serif';

/** Narrow shape of a booking record we read from Firestore. */
interface BookingDoc {
  startAt?: Timestamp | Date | string | null;
  status?: string;
  reviewText?: string;
}

/** Status pill colors — brand-consistent, no salmon. */
const STATUS_PILL: Record<Avail, { bg: string; color: string; label: string }> = {
  available: { bg: "#16a34a", color: "#fff", label: "Available" },
  bookable: { bg: "#831843", color: "#FCEBDC", label: "In session" },
  resting: { bg: "rgba(184,92,60,0.18)", color: "#831843", label: "Resting" },
};

const TherapistProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const [therapist, setTherapist] = useState<Therapist | null>(null);
  const [therapistDocId, setTherapistDocId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Bookings-derived stats (all live)
  const [todayBookings, setTodayBookings] = useState(0);
  const [completedJobs, setCompletedJobs] = useState(0);
  const [cancelledJobs, setCancelledJobs] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);

  // ── 1. Resolve therapist doc id (one-time lookup) ───────────────────────
  //    UID match on therapists/{uid}, fallback to where("uid", "==", ...)
  //    or where("email", "==", ...). After resolution we hand off to a
  //    onSnapshot listener so subsequent doc edits stream live.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const user = auth.currentUser;
      if (!user) {
        setLoading(false);
        return;
      }

      let resolvedId: string | null = null;

      // Try direct lookup by uid
      const directRef = doc(db, "therapists", user.uid);
      const directSnap = await getDoc(directRef);
      if (directSnap.exists()) resolvedId = directSnap.id;

      // Fallback: query by uid field
      if (!resolvedId) {
        const q = query(
          collection(db, "therapists"),
          where("uid", "==", user.uid)
        );
        const snap = await getDocs(q);
        if (!snap.empty) resolvedId = snap.docs[0].id;
      }

      // Fallback: query by email field
      if (!resolvedId && user.email) {
        const q = query(
          collection(db, "therapists"),
          where("email", "==", user.email)
        );
        const snap = await getDocs(q);
        if (!snap.empty) resolvedId = snap.docs[0].id;
      }

      if (!cancelled) {
        setTherapistDocId(resolvedId);
        if (!resolvedId) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // ── 2. Live therapist doc subscription ──────────────────────────────────
  useEffect(() => {
    if (!therapistDocId) return;
    const unsub = onSnapshot(doc(db, "therapists", therapistDocId), (snap) => {
      if (snap.exists()) {
        // Spread first, then override id with the canonical doc id so a
        // stale `id` field embedded in the document can't shadow it.
        setTherapist({ ...(snap.data() as Therapist), id: snap.id });
      }
      setLoading(false);
    });
    return () => unsub();
  }, [therapistDocId]);

  // ── 3. Live bookings subscription — derive today/completed/cancelled +
  //       review count in one place. Replaces the old getDocs one-shot.
  useEffect(() => {
    if (!therapistDocId) return;
    const q = query(
      collection(db, "bookings"),
      where("therapistId", "==", therapistDocId)
    );
    const unsub = onSnapshot(q, (snap) => {
      const now = new Date();
      const todayStart = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        0,
        0,
        0
      );
      const todayEnd = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        23,
        59,
        59
      );

      let today = 0;
      let completed = 0;
      let cancelled = 0;
      let reviewed = 0;

      snap.forEach((d) => {
        const b = d.data() as BookingDoc;
        const status = (b.status ?? "").toLowerCase();
        const startAt =
          b.startAt instanceof Timestamp
            ? b.startAt.toDate()
            : b.startAt instanceof Date
            ? b.startAt
            : typeof b.startAt === "string"
            ? new Date(b.startAt)
            : null;

        if (
          startAt &&
          startAt >= todayStart &&
          startAt <= todayEnd &&
          ["confirmed", "completed", "done", "paid"].includes(status)
        ) {
          today += 1;
        }
        if (["completed", "done"].includes(status)) {
          completed += 1;
          if (
            typeof b.reviewText === "string" &&
            b.reviewText.trim().length > 0
          ) {
            reviewed += 1;
          }
        }
        if (status === "cancelled" || status === "canceled") {
          cancelled += 1;
        }
      });

      setTodayBookings(today);
      setCompletedJobs(completed);
      setCancelledJobs(cancelled);
      setReviewCount(reviewed);
    });
    return () => unsub();
  }, [therapistDocId]);

  // ── 4. Computed status via canonical engine — one source of truth ──────
  const computedStatus: Avail = useMemo(() => {
    if (!therapist) return "resting";
    const { status } = calculateTherapistStatus(therapist);
    // Defensive: clamp to a known Avail union (admin typos can leak through).
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
        <CircularProgress sx={{ color: "#FE0944" }} />
      </Box>
    );
  }

  if (!therapist) {
    return (
      <Box
        sx={{
          maxWidth: 430,
          margin: "0 auto",
          padding: "40px 24px",
          textAlign: "center",
        }}
      >
        <Typography
          sx={{
            fontFamily: SERIF,
            fontSize: "18px",
            fontWeight: 600,
            color: "#3c1e14",
            marginBottom: 1,
          }}
        >
          Therapist profile not found
        </Typography>
        <Typography
          sx={{
            fontFamily: SANS,
            fontSize: "13px",
            color: "rgba(60,30,20,0.6)",
            marginBottom: 3,
          }}
        >
          Please contact admin if this is unexpected.
        </Typography>
        <Button onClick={handleLogout} variant="outlined">
          Sign out
        </Button>
      </Box>
    );
  }

  // ── Image resolution: defensive against missing/empty image string ──
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
        // Phone-shell wrapper — match brand pattern
        maxWidth: 430,
        margin: "0 auto",
        minHeight: "100vh",
        background: "linear-gradient(180deg, #FFF8F0 0%, #FCEBDC 100%)",
        paddingBottom: "calc(80px + env(safe-area-inset-bottom, 0px))",
        fontFamily: SANS,
      }}
    >
      {/* Header — brand red→coral gradient (replaces legacy salmon) */}
      <Box
        sx={{
          position: "relative",
          padding: "24px 20px 28px",
          background: "linear-gradient(135deg, #FE0944 0%, #FE7A52 100%)",
          borderBottomLeftRadius: 28,
          borderBottomRightRadius: 28,
          color: "#fff",
          boxShadow: "0 12px 30px rgba(254, 9, 68, 0.22)",
        }}
      >
        <IconButton
          aria-label="sign out"
          onClick={handleLogout}
          sx={{
            position: "absolute",
            top: 10,
            right: 10,
            color: "#fff",
            background: "rgba(0,0,0,0.18)",
            "&:hover": { background: "rgba(0,0,0,0.32)" },
          }}
        >
          <LogoutRoundedIcon />
        </IconButton>

        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Box
            component="img"
            src={enhanceImage(resolvedImage, { variant: "card" })}
            alt={therapist.name}
            sx={{
              width: 96,
              height: 96,
              borderRadius: "50%",
              objectFit: "cover",
              border: "3px solid rgba(255,255,255,0.85)",
              boxShadow: "0 4px 12px rgba(0,0,0,0.18)",
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

      {/* Live stats card */}
      <Box sx={{ paddingX: 2, marginTop: 3 }}>
        <ProfileSummaryCard
          todayBookings={todayBookings}
          completedJobs={completedJobs}
          cancelledJobs={cancelledJobs}
        />
      </Box>

      <Divider sx={{ my: 2, mx: 2, borderColor: "rgba(184,92,60,0.15)" }} />

      {/* Menu — only routes that actually exist (Round 22b removed
          /therapist/status; /therapist/bookings was never wired in App.tsx).
          Kept tight: Location + Update GPS. */}
      <Box
        sx={{
          paddingX: 2,
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: 1.5,
        }}
      >
        <MenuTile
          label="Standby Location"
          Icon={RoomRoundedIcon}
          onClick={() => navigate("/location")}
        />
        <MenuTile
          label="Update GPS"
          Icon={MyLocationRoundedIcon}
          onClick={() => navigate("/update-location")}
        />
      </Box>
    </Box>
  );
};

/** Small reusable menu tile — keeps card body declarative + brand-consistent. */
interface MenuTileProps {
  label: string;
  Icon: typeof RoomRoundedIcon;
  onClick: () => void;
}

const MenuTile: React.FC<MenuTileProps> = ({ label, Icon, onClick }) => (
  <Button
    onClick={onClick}
    sx={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: "8px",
      padding: "16px 8px",
      borderRadius: "16px",
      background: "rgba(255,255,255,0.7)",
      border: "1px solid rgba(184,92,60,0.15)",
      boxShadow: "0 4px 12px rgba(126,30,46,0.06)",
      textTransform: "none",
      transition: "transform 0.2s ease, box-shadow 0.2s ease",
      "&:hover": {
        background: "rgba(255,255,255,0.9)",
        transform: "translateY(-2px)",
        boxShadow: "0 8px 20px rgba(254,9,68,0.12)",
      },
    }}
  >
    <Box
      sx={{
        width: 40,
        height: 40,
        borderRadius: "50%",
        background: "linear-gradient(135deg, #FE0944 0%, #FE7A52 100%)",
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 4px 10px rgba(254,9,68,0.25)",
      }}
    >
      <Icon sx={{ fontSize: 20 }} />
    </Box>
    <Typography
      sx={{
        fontFamily: SANS,
        fontSize: "12px",
        fontWeight: 700,
        color: "#3c1e14",
        letterSpacing: "0.01em",
      }}
    >
      {label}
    </Typography>
  </Button>
);

export default TherapistProfilePage;
