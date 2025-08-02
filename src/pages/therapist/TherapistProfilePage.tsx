import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Avatar,
  Paper,
  Button,
  Chip,
  CircularProgress,
  IconButton,
} from "@mui/material";
import LogoutIcon from "@mui/icons-material/Logout";
import { useNavigate } from "react-router-dom";
import { auth, db } from "@/firebase";
import { doc, getDoc, getDocs, query, where, collection } from "firebase/firestore";
import { signOut } from "firebase/auth";
import BottomNav from "@/components/BottomNav";
import { Divider } from "@mui/material";

const TherapistProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const [therapist, setTherapist] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [totalBookings, setTotalBookings] = useState(0);
  const [rating, setRating] = useState(0);

  const getComputedStatus = (data: any) => {
    if (!data) return "resting";
    if (data.statusOverride) return data.statusOverride;

    const now = new Date();
    const [startH, startM] = (data.startTime || "00:00").split(":").map(Number);
    const [endH, endM] = (data.endTime || "00:00").split(":").map(Number);

    const start = new Date();
    start.setHours(startH, startM, 0, 0);
    const end = new Date();
    end.setHours(endH, endM, 0, 0);

    if (now >= start && now <= end) {
      return data.isBooked ? "bookable" : "available";
    }
    return "resting";
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "available":
        return "green";
      case "bookable":
        return "orange";
      case "resting":
      default:
        return "grey";
    }
  };

  useEffect(() => {
    const fetchTherapist = async () => {
      const user = auth.currentUser;
      if (!user) return;

      let data: any = null;

      const ref1 = doc(db, "therapists", user.uid);
      const snap1 = await getDoc(ref1);
      if (snap1.exists()) data = { id: snap1.id, ...snap1.data() };

      if (!data) {
        const q = query(collection(db, "therapists"), where("uid", "==", user.uid));
        const snap2 = await getDocs(q);
        if (!snap2.empty) data = { id: snap2.docs[0].id, ...snap2.docs[0].data() };
      }

      if (!data) {
        const q = query(collection(db, "therapists"), where("email", "==", user.email));
        const snap3 = await getDocs(q);
        if (!snap3.empty) data = { id: snap3.docs[0].id, ...snap3.docs[0].data() };
      }

      if (data) {
        setTherapist(data);
        const bq = query(collection(db, "bookings"), where("therapistId", "==", data.id));
        const bSnap = await getDocs(bq);
        setTotalBookings(bSnap.size);
        setRating(data.rating || 0);
      }

      setLoading(false);
    };

    fetchTherapist();
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/login");
  };

  if (loading)
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 10 }}>
        <CircularProgress />
      </Box>
    );

  const computedStatus = getComputedStatus(therapist);

  return (
    <Box sx={{ bgcolor: "#f6f8fa", minHeight: "100vh", maxWidth: 430, mx: "auto", pb: 7 }}>
      <Box
        sx={{
          position: "relative",
          background: "linear-gradient(90deg, #FB8085, #F9C1B1)",
          p: 3,
          display: "flex",
          alignItems: "center",
          borderBottomLeftRadius: 24,
          borderBottomRightRadius: 24,
        }}
      >
        <IconButton
          onClick={handleLogout}
          sx={{ position: "absolute", top: 10, right: 10, color: "#fff" }}
        >
          <LogoutIcon />
        </IconButton>

        <Avatar
          sx={{
            width: 120,
            height: 120,
            border: "3px solid white",
            boxShadow: "0 4px 10px rgba(0,0,0,0.2)",
            mr: 2,
          }}
        >
          <img
            src={therapist?.image?.startsWith("/") ? therapist.image : `/images/${therapist?.image}`}
            alt={therapist?.name}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: "center top",
              borderRadius: "50%",
            }}
          />
        </Avatar>

        <Box>
          <Typography variant="h6" fontWeight="bold" color="#fff">
            {therapist?.name || therapist?.displayName || "Therapist"}
          </Typography>
          <Typography variant="body2" color="#fff">
            {therapist?.email}
          </Typography>
          <Typography variant="body2" color="#fff">
            Time : {therapist?.startTime || "--:--"} - {therapist?.endTime || "--:--"}
          </Typography>

          <Chip
            label={computedStatus}
            sx={{
              mt: 2,
              bgcolor: getStatusColor(computedStatus),
              color: "#fff",
              fontSize: 12,
              height: 24,
            }}
          />
        </Box>
      </Box>

      {/* Stats */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 1,
          p: 2,
        }}
      >
        <Paper sx={{ p: 3, textAlign: "center", borderRadius: 3 }}>
          <Typography variant="h6" fontWeight="bold" color="primary">
            {totalBookings}
          </Typography>
          <Typography variant="caption">คำสั่งซื้อทั้งหมด</Typography>
        </Paper>

        <Paper sx={{ p: 3, textAlign: "center", borderRadius: 3 }}>
          <Typography variant="h6" fontWeight="bold" color="primary">
            0%
          </Typography>
          <Typography variant="caption">การเพิ่มเวลา</Typography>
        </Paper>

        <Paper sx={{ p: 3, textAlign: "center", borderRadius: 3 }}>
          <Typography variant="h6" fontWeight="bold" color="primary">
            {rating.toFixed(1)} ⭐
          </Typography>
          <Typography variant="caption">เรตติ้ง</Typography>
        </Paper>
      </Box>

      <Divider sx={{ my: 2, mx: 2 }} />

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: -3,
          p: 1,
        }}
      >
        
       {[
  { label: "การจองของฉัน", gif: "/images/icon/Gift Box.gif",  path: "/therapist/bookings" },
  { label: "สถานะ", gif: "/images/icon/Coffee Break.gif",  path: "/therapist/status" },
  { label: "ตำแหน่ง", gif: "/images/icon/Map pin.gif",  path: "/therapist/location" },
].map((btn, i) => (
<Button
  key={i}
  fullWidth
  variant="text" // ✅ ใช้ text หรือ outlined จะไม่มีพื้นหลัง
  sx={{
    flexDirection: "column",
    py: 1,
    borderRadius: 3,
    fontWeight: "bold",
    boxShadow: "none", // ✅ เอาเงาออก
    background: "transparent", // ✅ เอาพื้นหลังออก
    "&:hover": {
      background: "rgba(0,0,0,0.05)", // ✅ hover effect เบาๆ (จะเอาออกเลยก็ได้)
    },
  }}
  onClick={() => navigate(btn.path)}
>
  <img
    src={btn.gif}
    alt={btn.label}
    style={{ width: 80, height: 80, marginBottom: -10 }}
  />

  <Typography variant="subtitle1" sx={{ fontWeight: "bold", fontSize: 16 }}>
    {btn.label}
  </Typography>
</Button>
))}
      </Box>

      <BottomNav />
    </Box>
  );
};

export default TherapistProfilePage;