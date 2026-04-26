// src/pages/UpdateLocationPage.tsx
import React, { useEffect, useState } from "react";
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
import { useNavigate } from "react-router-dom";

const UpdateLocationPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState<string | null>(null);

  const updateLocation = async () => {
    if (!navigator.geolocation || !user?.email) {
      setSnackbar("❌ Cannot access location or user info");
      return;
    }

    setLoading(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
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
        }
        setLoading(false);
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
