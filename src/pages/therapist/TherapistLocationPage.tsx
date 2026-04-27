// src/pages/therapist/TherapistLocationPage.tsx
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

const containerStyle = { width: "100%", height: "100%" };
const defaultCenter = { lat: 13.736717, lng: 100.523186 };

const TherapistLocationPage: React.FC = () => {
  const [therapistId, setTherapistId] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    null
  );
  const [homeCoords, setHomeCoords] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    msg: string;
    severity: "success" | "error";
  }>({ open: false, msg: "", severity: "success" });

  const navigate = useNavigate();
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
  });

  useEffect(() => {
    void initLocation();
    // initLocation อาศัย auth.currentUser — ตั้งใจไม่ใส่ใน deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** ✅ โหลดตำแหน่ง therapist + เช็ก booking realtime */
  const initLocation = async () => {
    const user = auth.currentUser;
    if (!user) return;

    const q = query(collection(db, "therapists"), where("uid", "==", user.uid));
    const snap = await getDocs(q);
    if (snap.empty) return;

    const therapist = { id: snap.docs[0].id, ...snap.docs[0].data() } as any;
    setTherapistId(therapist.id);

    if (therapist.homeLocation) setHomeCoords(therapist.homeLocation);

    const now = new Date();
    const lastUpdate = therapist.updatedAt?.toDate?.() ?? now;

    // ✅ reset ทุกวัน → กลับบ้าน
    if (isNewDay(lastUpdate, now)) {
      await updateDoc(doc(db, "therapists", therapist.id), {
        currentLocation: therapist.homeLocation,
        updatedAt: Timestamp.fromDate(now),
      });
      setCoords(therapist.homeLocation);
      return;
    }

    // ✅ เช็ก booking realtime
    const bQ = query(
      collection(db, "bookings"),
      where("therapistId", "==", therapist.id),
      where("status", "in", ["ongoing", "accepted", "confirmed"])
    );

    onSnapshot(bQ, (bSnap) => {
      if (!bSnap.empty) {
        const booking = bSnap.docs[0].data() as any;
        if (booking.location) {
          setCoords(booking.location); // 👉 ใช้ location ลูกค้า
          return;
        }
      }
      // ถ้าไม่มี booking active → ใช้ currentLocation หรือ home
      setCoords(therapist.currentLocation || therapist.homeLocation || defaultCenter);
    });
  };

  const isNewDay = (last: Date, now: Date) =>
    last.toDateString() !== now.toDateString();

  /** 👉 อัพเดตตำแหน่งจริงตอนนี้ */
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
              msg: "✅ Current location updated!",
              severity: "success",
            });
          })();
        }
      },
      () =>
        setSnackbar({
          open: true,
          msg: "❌ Cannot access location",
          severity: "error",
        })
    );
  };

  /** 👉 กลับบ้าน (standby) */
  const handleReturnHome = async () => {
    if (!homeCoords || !therapistId) return;
    setCoords(homeCoords);
    await updateDoc(doc(db, "therapists", therapistId), {
      currentLocation: homeCoords,
      updatedAt: Timestamp.fromDate(new Date()),
    });
    setSnackbar({
      open: true,
      msg: "🏠 Returned to standby location",
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
        width: "100%",
        maxWidth: 430,
        height: "100vh",
        mx: "auto",
        position: "relative",
        pb: 8,
      }}
    >
      {/* AppBar */}
      <AppBar
        position="static"
        elevation={0}
        sx={{
          background: "linear-gradient(90deg, #FB8085, #F9C1B1)",
          boxShadow: "0 4px 10px rgba(0,0,0,0.2)",
        }}
      >
        <Toolbar>
          <IconButton edge="start" color="inherit" onClick={() => navigate(-1)}>
            <ArrowBackIcon />
          </IconButton>
          <Typography
            variant="h6"
            sx={{ flexGrow: 1, textAlign: "center", mr: 5 }}
          >
            Location
          </Typography>
        </Toolbar>
      </AppBar>

      {/* Map */}
      <Box sx={{ width: "100%", height: "100%" }}>
        <GoogleMap
          mapContainerStyle={containerStyle}
          center={coords || defaultCenter}
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
          px: 2,
          maxWidth: 430,
          mx: "auto",
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
            bgcolor: "#FB8085",
            fontSize: 15,
            borderRadius: 10,
            py: 1.25,
            boxShadow: "0 3px 6px rgba(0,0,0,0.1)",
            "&:hover": { bgcolor: "#f78b90" },
          }}
        >
          RETURN TO STANDBY LOCATION
        </Button>

        <Button
          variant="contained"
          fullWidth
          onClick={handleUpdateCurrentLocation}
          sx={{
            bgcolor: "#F9C1B1",
            fontSize: 15,
            borderRadius: 10,
            py: 1.25,
            boxShadow: "0 3px 6px rgba(0,0,0,0.1)",
            "&:hover": { bgcolor: "#facfc0" },
          }}
        >
          UPDATE CURRENT LOCATION
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