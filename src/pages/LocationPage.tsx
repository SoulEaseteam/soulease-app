// src/pages/LocationPage.tsx
import React, { useState, useEffect } from "react";
import {
  Box, Typography, Paper, TextField, Button,
  IconButton, CircularProgress
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import RoomIcon from "@mui/icons-material/Room";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/providers/AuthProvider";
import { db } from "@/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";

const LocationPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const location = useLocation();

  const [loading, setLoading] = useState(true);
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [selectedLat, setSelectedLat] = useState<number | null>(null);
  const [selectedLng, setSelectedLng] = useState<number | null>(null);
  const [placeDetail, setPlaceDetail] = useState("");
  const [placeName, setPlaceName] = useState("");

  // ✅ โหลด state ที่ส่งมาจาก SelectLocationPage
useEffect(() => {
  const fetchPlaceName = async () => {
    if (!selectedLat || !selectedLng) return;

    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_KEY; // ✅ ดึงจาก .env
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${selectedLat},${selectedLng}&key=${apiKey}&language=th`;

    try {
      const res = await fetch(url);
      const data = await res.json();

      if (data.results && data.results.length > 0) {
        // ✅ หาชื่อสถานที่สั้นๆ ก่อน
        let place = "";
        const firstResult = data.results[0];

        // 1. ถ้ามีชื่อสถานที่แบบ landmark / POI ให้ใช้
        if (firstResult.address_components) {
          const poi = firstResult.address_components.find((c: any) =>
            c.types.includes("point_of_interest") || c.types.includes("establishment")
          );
          if (poi) place = poi.long_name;
        }

        // 2. ถ้าไม่มี → ลองใช้ formatted_address เต็ม
        if (!place) place = firstResult.formatted_address;

        setPlaceName(place);
      }
    } catch (err) {
      console.error("Error fetching place name:", err);
    }
  };

  fetchPlaceName();
}, [selectedLat, selectedLng]);


  // ✅ โหลดข้อมูลผู้ใช้จาก Firestore
  useEffect(() => {
    const loadUserData = async () => {
      if (!user) return;
      const ref = doc(db, "users", user.uid);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = snap.data();
        setAddress((prev) => prev || data.address || "");
        setPhone(data.phone || "");
        if (data.location) {
          setSelectedLat(data.location.lat);
          setSelectedLng(data.location.lng);
          setPlaceDetail(data.location.placeDetail || "");
        }
      }
      setLoading(false);
    };
    loadUserData();
  }, [user]);

  const isValidPhone = (p: string) => /^0[0-9]{8,9}$/.test(p);

  const handleSave = async () => {
    if (!user) return;
    if (!isValidPhone(phone)) {
      alert("⚠️ Invalid phone number format");
      return;
    }

    try {
      await updateDoc(doc(db, "users", user.uid), {
        address,
        phone,
        location:
          selectedLat && selectedLng
            ? { lat: selectedLat, lng: selectedLng, placeDetail }
            : null,
      });
      alert("✅ Customer information saved successfully");
      navigate("/profile");
    } catch (err) {
      console.error("❌ Error updating:", err);
      alert("❌ Error saving information.");
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: "100vh", background: "#f0f4f8", p: 3, pb: 8 }}>
      <Box sx={{ display: "flex", alignItems: "center", mb: 3 }}>
        <IconButton onClick={() => navigate("/profile")} sx={{ mr: 1 }}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h6" fontWeight="bold">
          Customer Information
        </Typography>
      </Box>

      <Paper elevation={3} sx={{ p: 3, borderRadius: 4, bgcolor: "#fff" }}>
        <Button
          variant="outlined"
          startIcon={<RoomIcon />}
          fullWidth
          sx={{ mb: 3, py: 1.2, borderRadius: 3, fontWeight: "bold" }}
          onClick={() =>
            navigate("/select-location", {
              state: { currentAddress: address, placeDetail },
            })
          }
        >
          Select from Map
        </Button>

        <Typography fontWeight="bold" mb={1}>
          Address:
        </Typography>
        <TextField
          fullWidth
          variant="outlined"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          sx={{ mb: 3 }}
        />

        <Typography fontWeight="bold" mb={1}>
          Additional Location Details (e.g., Hotel/Condo Name):
        </Typography>
        <TextField
          fullWidth
          variant="outlined"
          value={placeDetail}
          onChange={(e) => setPlaceDetail(e.target.value)}
          sx={{ mb: 3 }}
        />

        <Typography fontWeight="bold" mb={1}>
          Phone Number:
        </Typography>
        <TextField
          fullWidth
          variant="outlined"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          sx={{ mb: 3 }}
        />

                {placeName && (
          <Typography fontWeight="bold" mb={1}>
            📍 {placeName}
          </Typography>
        )}


        {selectedLat && selectedLng && (
          <iframe
            title="Map"
            width="100%"
            height="180"
            frameBorder="0"
            style={{ borderRadius: 8, marginBottom: 16 }}
            src={`https://maps.google.com/maps?q=${selectedLat},${selectedLng}&z=15&output=embed`}
          />
        )}

        <Button
          variant="contained"
          fullWidth
          sx={{
            py: 1.3,
            borderRadius: 3,
            fontWeight: "bold",
            bgcolor: "#2b3b53",
            "&:hover": { bgcolor: "#3f5066" },
          }}
          onClick={handleSave}
        >
          Save Information
        </Button>
      </Paper>

      <Typography mt={4} fontSize={13} color="text.secondary" textAlign="center">
        You can also update your address during booking.
      </Typography>
    </Box>
  );
};

export default LocationPage;