// src/pages/UpdateLocationPage.tsx
import { useState } from "react";
import {
  Box,
  Button,
  Typography,
  CircularProgress,
  Snackbar,
} from "@mui/material";
import { db } from "@/lib/firebase";
import { useAuth } from "@/providers/AuthProvider";
import { doc, updateDoc } from "firebase/firestore";

const UpdateLocationPage = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState<string | null>(null);

  const updateLocation = () => {
    if (!user?.uid) {
      setSnackbar("❌ Cannot access location or user info");
      return;
    }

    setLoading(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        // wrap async logic ใน IIFE + void เพื่อกัน floating promise
        void (async () => {
          try {
            const therapistRef = doc(db, "therapists", user.uid);
            await updateDoc(therapistRef, {
              standbyLocation: {
                lat: latitude,
                lng: longitude,
              },
            });
            setSnackbar("✅ Standby location updated successfully");
          } catch (err) {
            console.error("Failed to update location", err);
            setSnackbar("❌ Failed to update location");
          } finally {
            setLoading(false);
          }
        })();
      },
      () => {
        setSnackbar("❌ Failed to get GPS location");
        setLoading(false);
      }
    );
  };

  return (
    <Box p={3}>
      <Typography variant="h5" mb={2}>
        📍 Set Standby Location
      </Typography>
      <Typography mb={2}>
        Press the button below to set your current location as your default standby point.
      </Typography>
      <Button
        variant="contained"
        onClick={updateLocation}
        disabled={loading}
      >
        {loading ? <CircularProgress size={24} /> : "Set Current Location"}
      </Button>

      <Snackbar
        open={!!snackbar}
        autoHideDuration={3000}
        onClose={() => setSnackbar(null)}
        message={snackbar}
      />
    </Box>
  );
};

export default UpdateLocationPage;
