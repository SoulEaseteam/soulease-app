import React, { useEffect, useState } from "react";
import { Box, Button, AppBar, Toolbar, IconButton, Typography, Snackbar, Alert } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { GoogleMap, Marker, useJsApiLoader } from "@react-google-maps/api";
import { auth, db } from "@/firebase";
import { doc, getDoc, updateDoc, collection, query, where, getDocs } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

const containerStyle = {
  width: "100%",
  height: "100%",
};

const defaultCenter = { lat: 13.736717, lng: 100.523186 };

const TherapistLocationPage: React.FC = () => {
  const [therapistId, setTherapistId] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [homeCoords, setHomeCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; msg: string; severity: "success" | "error" }>({
    open: false,
    msg: "",
    severity: "success",
  });

  const navigate = useNavigate();

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
  });

  useEffect(() => {
    const fetchData = async () => {
      const user = auth.currentUser;
      if (!user) return;

      const q = query(collection(db, "therapists"), where("uid", "==", user.uid));
      const snap = await getDocs(q);

      if (!snap.empty) {
        const docRef = snap.docs[0];
        setTherapistId(docRef.id);
        const data = docRef.data();
        if (data.homeLocation) setHomeCoords(data.homeLocation);
        if (data.currentLocation) setCoords(data.currentLocation);
      }
    };
    fetchData();
  }, []);

  const handleUpdateCurrentLocation = () => {
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const newCoords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCoords(newCoords);
        if (therapistId) {
          await updateDoc(doc(db, "therapists", therapistId), {
            currentLocation: newCoords,
            updatedAt: new Date(),
          });
          setSnackbar({ open: true, msg: "✅ อัปเดตตำแหน่งปัจจุบันแล้ว", severity: "success" });
        }
      },
      () => setSnackbar({ open: true, msg: "❌ ไม่สามารถเข้าถึงตำแหน่ง", severity: "error" })
    );
  };

  const handleReturnHome = async () => {
    if (!homeCoords || !therapistId) return;
    setCoords(homeCoords);
    await updateDoc(doc(db, "therapists", therapistId), {
      currentLocation: homeCoords,
      updatedAt: new Date(),
    });
    setSnackbar({ open: true, msg: "🏠 กลับไปยังตำแหน่งสแตนด์บายแล้ว", severity: "success" });
  };

  if (!isLoaded) return <Typography>กำลังโหลดแผนที่...</Typography>;

  return (
    <Box sx={{ width: "100%", maxWidth: 430, height: "100vh", mx: "auto", position: "relative" }}>
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
          <Typography variant="h6" sx={{ flexGrow: 1, textAlign: "center", mr: 5 }}>
            ตำแหน่ง
          </Typography>
        </Toolbar>
      </AppBar>

      {/* Google Map */}
      <Box sx={{ width: "100%", height: "100%" }}>
        <GoogleMap
          mapContainerStyle={containerStyle}
          center={coords || defaultCenter}
          zoom={14}
        >
          {coords && <Marker position={coords} />}
        </GoogleMap>
      </Box>

      {/* ปุ่มสองปุ่มด้านล่าง */}
      <Box
        sx={{
          position: "absolute",
          bottom: 20,
          left: 0,
          right: 0,
          display: "flex",
          flexDirection: "column",
          gap: 2,
          px: 3,
        }}
      >
        <Button
          variant="contained"
          sx={{
            bgcolor: "#FB8085",
            fontWeight: "bold",
            fontSize: 16,
            borderRadius: 8,
            py: 1.5,
          }}
          onClick={handleReturnHome}
        >
          กลับไปยังตำแหน่งสแตนด์บาย
        </Button>

        <Button
          variant="contained"
          sx={{
            bgcolor: "#F9C1B1",
            fontWeight: "bold",
            fontSize: 16,
            borderRadius: 8,
            py: 1.5,
          }}
          onClick={handleUpdateCurrentLocation}
        >
          อัปเดตตำแหน่งปัจจุบัน
        </Button>
      </Box>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={2000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert severity={snackbar.severity}>{snackbar.msg}</Alert>
      </Snackbar>
    </Box>
  );
};

export default TherapistLocationPage;