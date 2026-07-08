// src/pages/therapist/TherapistLocationPage.tsx
//
// 🆕 Round 26 (founder 2026-05-02): real-data + memory-safe refactor.
//   • The legacy version started an onSnapshot inside an async helper but
//     never stored the unsub → listener leaked on every component unmount.
//     Fixed: subscriptions return a cleanup chain.
//   • `any` types replaced with Therapist / BookingDoc shapes.
//   • Snackbar emojis removed (Round 15 mandate "no emojis, use icons").
//   • AppBar legacy salmon (#FB8085) replaced with brand red→coral gradient.
//   • Initial therapist lookup also moved into a live onSnapshot so admin
//     edits to homeLocation propagate instantly.
import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Snackbar,
  Alert,
  CircularProgress,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { GoogleMap, Marker, useJsApiLoader } from "@react-google-maps/api";
import { auth, db } from "@/lib/firebase";
import {
  doc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  Timestamp,
  onSnapshot,
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import BottomNav from "@/components/layouts/BottomNavGlass";
import type { Therapist, Location as TherapistLocation } from "@/types/therapist";
// 🆕 Round 28r52 — Phase 3.1 responsive shell replaces the 430 cap.
import { responsiveShell } from "@/theme/breakpoints";

const containerStyle = { width: "100%", height: "100%" };
const defaultCenter = { lat: 13.736717, lng: 100.523186 };

interface BookingDoc {
  location?: TherapistLocation;
  status?: string;
}

const TherapistLocationPage: React.FC = () => {
  const [therapistId, setTherapistId] = useState<string | null>(null);
  const [coords, setCoords] = useState<TherapistLocation | null>(null);
  const [homeCoords, setHomeCoords] = useState<TherapistLocation | null>(null);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    msg: string;
    severity: "success" | "error";
  }>({ open: false, msg: "", severity: "success" });

  const navigate = useNavigate();
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
  });

  // ── 1. Resolve therapist doc id once via auth uid ─────────────────────
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const user = auth.currentUser;
      if (!user) return;
      const q = query(
        collection(db, "therapists"),
        where("uid", "==", user.uid)
      );
      const snap = await getDocs(q);
      if (!cancelled && !snap.empty) {
        setTherapistId(snap.docs[0].id);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // ── 2. Live therapist subscription (homeLocation + currentLocation) ───
  //       Plus daily auto-reset to home if last update was on a previous day.
  useEffect(() => {
    if (!therapistId) return;
    const ref = doc(db, "therapists", therapistId);
    const unsub = onSnapshot(ref, (snap) => {
      if (!snap.exists()) return;
      const data = snap.data() as Therapist;

      if (data.homeLocation) setHomeCoords(data.homeLocation);

      const now = new Date();
      const updatedAtRaw = (data as { updatedAt?: { toDate?: () => Date } })
        .updatedAt;
      const lastUpdate = updatedAtRaw?.toDate?.() ?? now;

      if (isNewDay(lastUpdate, now) && data.homeLocation) {
        // Daily reset: snap therapist back to standby (home) location.
        void updateDoc(ref, {
          currentLocation: data.homeLocation,
          updatedAt: Timestamp.fromDate(now),
        });
        setCoords(data.homeLocation);
      }
    });
    return () => unsub();
  }, [therapistId]);

  // ── 3. Live active-booking subscription — if there's an ongoing booking,
  //       show the customer's location on the map; otherwise show home.
  useEffect(() => {
    if (!therapistId) return;
    const bQ = query(
      collection(db, "bookings"),
      where("therapistId", "==", therapistId),
      where("status", "in", ["ongoing", "accepted", "confirmed"])
    );
    const unsub = onSnapshot(bQ, (bSnap) => {
      if (!bSnap.empty) {
        const booking = bSnap.docs[0].data() as BookingDoc;
        if (booking.location) {
          setCoords(booking.location);
          return;
        }
      }
      // No active booking — fall back to home (or default if missing)
      setCoords((prev) => prev ?? homeCoords ?? defaultCenter);
    });
    return () => unsub();
  }, [therapistId, homeCoords]);

  const isNewDay = (last: Date, now: Date) =>
    last.toDateString() !== now.toDateString();

  /** Capture the device's GPS and persist to Firestore. */
  const handleUpdateCurrentLocation = () => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const newCoords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        setCoords(newCoords);
        if (therapistId) {
          void (async () => {
            await updateDoc(doc(db, "therapists", therapistId), {
              currentLocation: newCoords,
              updatedAt: Timestamp.fromDate(new Date()),
            });
            setSnackbar({
              open: true,
              msg: "Current location updated",
              severity: "success",
            });
          })();
        }
      },
      () =>
        setSnackbar({
          open: true,
          msg: "Cannot access device location",
          severity: "error",
        })
    );
  };

  /** Snap therapist back to standby (home) location. */
  const handleReturnHome = async () => {
    if (!homeCoords || !therapistId) return;
    setCoords(homeCoords);
    await updateDoc(doc(db, "therapists", therapistId), {
      currentLocation: homeCoords,
      updatedAt: Timestamp.fromDate(new Date()),
    });
    setSnackbar({
      open: true,
      msg: "Returned to standby location",
      severity: "success",
    });
  };

  if (!isLoaded) {
    return (
      <Box sx={{ mt: 10, textAlign: "center" }}>
        <CircularProgress />
        <Typography mt={2}>Loading map...</Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        // 🆕 Round 28r52 — responsiveShell replaces the fixed 430 cap.
        ...responsiveShell,
        width: "100%",
        height: "100vh",
        position: "relative",
        pb: 8,
      }}
    >
      {/* AppBar — brand red→coral gradient (replaces legacy salmon) */}
      <AppBar
        position="static"
        elevation={0}
        sx={{
          background: "#B4000A",
          boxShadow: "0 4px 12px rgba(15, 23, 42, 0.22)",
        }}
      >
        <Toolbar>
          <IconButton edge="start" color="inherit" onClick={() => navigate(-1)}>
            <ArrowBackIcon />
          </IconButton>
          <Typography
            variant="h6"
            sx={{
              flexGrow: 1,
              textAlign: "center",
              mr: 5,
              fontFamily: '"Fraunces", Georgia, serif',
              fontWeight: 600,
              letterSpacing: "-0.01em",
            }}
          >
            Location
          </Typography>
        </Toolbar>
      </AppBar>

      {/* Map */}
      <Box sx={{ width: "100%", height: "100%" }}>
        <GoogleMap
          mapContainerStyle={containerStyle}
          center={coords ?? defaultCenter}
          zoom={14}
        >
          {coords && <Marker position={coords} />}
        </GoogleMap>
      </Box>

      {/* Buttons */}
      <Box
        sx={{
          position: "absolute",
          bottom: 220,
          left: 0,
          right: 0,
          // 🆕 Round 28r52 — inner button rail follows the shell too.
          //   The shell brings its own px scale; place it AFTER `px: 2`
          //   would silently overwrite the shell padding, so we skip
          //   the manual px and let responsiveShell own the spacing.
          ...responsiveShell,
          display: "flex",
          flexDirection: "column",
          gap: 1.5,
          zIndex: 10,
        }}
      >
        <Button
          variant="contained"
          fullWidth
          onClick={handleReturnHome}
          sx={{
            background: "#B4000A",
            color: "#fff",
            fontSize: 14,
            fontWeight: 800,
            letterSpacing: "0.04em",
            borderRadius: 99,
            py: 1.25,
            boxShadow: "0 6px 16px rgba(15, 23, 42, 0.26)",
            textTransform: "none",
            "&:hover": {
              background: "#B4000A",
              boxShadow: "0 8px 20px rgba(15, 23, 42, 0.36)",
            },
          }}
        >
          Return to standby
        </Button>

        <Button
          variant="contained"
          fullWidth
          onClick={handleUpdateCurrentLocation}
          sx={{
            background: "rgba(244, 246, 245, 0.95)",
            color: "#831843",
            fontSize: 14,
            fontWeight: 800,
            letterSpacing: "0.04em",
            borderRadius: 99,
            py: 1.25,
            border: "1px solid rgba(184, 92, 60, 0.22)",
            boxShadow: "0 4px 12px rgba(15, 23, 42, 0.08)",
            textTransform: "none",
            "&:hover": { background: "#fff" },
          }}
        >
          Update current GPS
        </Button>
      </Box>

      {/* Feedback */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert severity={snackbar.severity}>{snackbar.msg}</Alert>
      </Snackbar>

      <BottomNav />
    </Box>
  );
};

export default TherapistLocationPage;