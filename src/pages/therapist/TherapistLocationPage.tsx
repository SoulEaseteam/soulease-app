// src/pages/therapist/TherapistLocationPage.tsx
//
// 🆕 Round 26 (founder 2026-05-02): real-data + memory-safe refactor.
//   • The legacy version started an onSnapshot inside an async helper but
//     never stored the unsub → listener leaked on every component unmount.
//     Fixed: subscriptions return a cleanup chain.
//   • `any` types replaced with Therapist / BookingDoc shapes.
//   • Snackbar emojis removed (Round 15 mandate "no emojis, use icons").
//   • Initial therapist lookup also moved into a live onSnapshot so admin
//     edits to homeLocation propagate instantly.
//
// 🆕 Round 28x.105 (founder: "Location ปรับให้สวยขึ้น เป็นสัดส่วน ดูง่าย
//   กระชับขึ้น") — two real bugs surfaced while restyling, both from this
//   page predating StaffLayout (28x.79):
//   1. This page rendered its OWN olive (#8F8474) AppBar, completely off
//      the app's rose palette and duplicating StaffLayout's own persistent
//      "SUNRED STAFF" bar above it — two stacked headers.
//   2. This page rendered `<BottomNav />` (BottomNavGlass — the CUSTOMER
//      tab bar: Practitioners/Services/History/Profile), stacked UNDER/
//      OVER StaffLayout's own staff tab bar (หน้าทำงาน/My Jobs/Profile).
//      A therapist standing on this screen saw the wrong bottom nav
//      entirely — exactly the "no shared surface left to leak through"
//      leak 28x.79 set out to prevent everywhere else. Removed; StaffLayout
//      already provides the real tab bar for every route nested under it,
//      this page included.
//   The floating button rail's old `bottom: 220` was a magic number sized
//   for the (wrong, taller) customer nav — now anchored relative to
//   StaffLayout's actual ~64px + safe-area tab bar instead of a guess.
//
// 🆕 Round 28x.114 (founder: "ตำแหน่ง · Location ทำให้มันกระชับจอมือถือขึ้น
//   เข้าที่เข้าทางตกแต่งใหม่ ให้เป็นสัดส่วน") — the map used to fill the
//   ENTIRE viewport (`height: 100vh` flex column, map as the `flex: 1`
//   filler) with the two buttons floating absolutely on top of it near the
//   bottom, covering whatever map was underneath them. Rebuilt as a normal
//   scrollable page matching every other self-edit screen: a compact
//   coordinates row, the map in a fixed-height rounded card (not the whole
//   screen), then the two buttons in normal flow below it — no more
//   floating overlay, no more TAB_BAR_CLEARANCE math.
import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  Typography,
  Snackbar,
  Alert,
  CircularProgress,
} from "@mui/material";
import { CaretLeft, NavigationArrow, House } from "phosphor-react";
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
import type { Therapist, Location as TherapistLocation } from "@/types/therapist";
// 🆕 Round 28r52 — Phase 3.1 responsive shell replaces the 430 cap.
import { responsiveShell } from "@/theme/breakpoints";

const SERIF = '"Playfair Display", "Fraunces", Georgia, serif';
const SANS = '"Inter", system-ui, sans-serif';
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
    // 🆕 28x.67 — see TherapistProfilePage: rules grant access by uid, and a
    //   query filtering on the profile doc id is rejected wholesale.
    const therapistUid = auth.currentUser?.uid;
    if (!therapistId || !therapistUid) return;
    const bQ = query(
      collection(db, "bookings"),
      where("therapistUid", "==", therapistUid),
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
      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", mt: 10 }}>
        <CircularProgress sx={{ color: "#E0708F" }} />
        <Typography sx={{ fontFamily: SANS, fontSize: 13, color: "var(--sr-muted)", mt: 2 }}>
          กำลังโหลดแผนที่…
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ ...responsiveShell, minHeight: "100vh", background: "var(--sr-bg)", pb: 6 }}>
      {/* Header — same transparent back+title row every self-edit page uses,
          no second colored bar duplicating StaffLayout's own. */}
      <Box sx={{ display: "flex", alignItems: "center", px: 1, pt: 2, pb: 1.5 }}>
        <Button onClick={() => navigate(-1)} sx={{ minWidth: 0, p: 1, color: "var(--sr-ink)" }}>
          <CaretLeft size={22} />
        </Button>
        <Typography sx={{ flex: 1, textAlign: "center", fontFamily: SERIF, fontSize: 20, fontWeight: 700, color: "var(--sr-ink)", mr: 5 }}>
          ตำแหน่ง · Location
        </Typography>
      </Box>

      <Box sx={{ px: 2 }}>
        {/* Compact coordinates row — replaces guessing from a full-bleed map
            with an at-a-glance readout, same "location glance" pattern
            Profile's Working Status card already uses. */}
        <Box
          sx={{
            display: "flex", alignItems: "center", gap: 1,
            mb: 1.5, p: "10px 14px", borderRadius: "14px",
            background: "var(--sr-panel-2)", border: "1px solid var(--sr-hairline)",
          }}
        >
          <NavigationArrow size={15} weight="duotone" color="#C2185B" />
          <Typography sx={{ fontFamily: SANS, fontSize: 12, color: "var(--sr-body)" }}>
            {coords ? `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}` : "กำลังโหลดตำแหน่ง…"}
          </Typography>
        </Box>

        {/* Map — a fixed-height card instead of the whole viewport, so the
            page scrolls normally like every other staff screen. */}
        <Box
          sx={{
            height: "42vh",
            borderRadius: "20px",
            overflow: "hidden",
            border: "1px solid var(--sr-hairline)",
            boxShadow: "var(--sr-card-shadow)",
            mb: 2,
          }}
        >
          <GoogleMap
            mapContainerStyle={containerStyle}
            center={coords ?? defaultCenter}
            zoom={14}
          >
            {coords && <Marker position={coords} />}
          </GoogleMap>
        </Box>

        {/* Buttons — normal document flow now, same pill styling as before. */}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          <Button
            variant="contained"
            fullWidth
            onClick={handleUpdateCurrentLocation}
            startIcon={<NavigationArrow size={16} weight="bold" />}
            sx={{
              background: "linear-gradient(135deg, #E0708F, #B23A63)",
              color: "#fff",
              fontSize: 14,
              fontWeight: 700,
              borderRadius: 999,
              py: 1.25,
              boxShadow: "0 6px 16px rgba(194,24,91,0.32)",
              textTransform: "none",
              "&:hover": { boxShadow: "0 6px 16px rgba(194,24,91,0.32)" },
            }}
          >
            Update current GPS
          </Button>

          <Button
            variant="contained"
            fullWidth
            onClick={() => void handleReturnHome()}
            startIcon={<House size={16} weight="bold" />}
            sx={{
              background: "var(--sr-panel)",
              color: "#C2185B",
              fontSize: 14,
              fontWeight: 700,
              borderRadius: 999,
              py: 1.25,
              border: "1px solid rgba(194,24,91,0.28)",
              boxShadow: "0 4px 12px rgba(15, 23, 42, 0.10)",
              textTransform: "none",
              "&:hover": { background: "var(--sr-panel-2)" },
            }}
          >
            Return to standby
          </Button>
        </Box>
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
    </Box>
  );
};

export default TherapistLocationPage;
