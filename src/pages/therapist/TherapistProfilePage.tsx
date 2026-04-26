import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Avatar,
  CircularProgress,
  Chip,
  IconButton,
  Divider,
  Button,
} from "@mui/material";
import LogoutIcon from "@mui/icons-material/Logout";
import { useNavigate } from "react-router-dom";
import { auth, db } from "@/lib/firebase";
import {
  doc,
  getDoc,
  getDocs,
  query,
  where,
  collection,
  Timestamp,
} from "firebase/firestore";
import { signOut } from "firebase/auth";
import ProfileSummaryCard from "@/components/therapist/ProfileSummaryCard";


const TherapistProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const [therapist, setTherapist] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // 📊 Summary states
  const [todayBookings, setTodayBookings] = useState(0);
  const [completedJobs, setCompletedJobs] = useState(0);
  const [cancelledJobs, setCancelledJobs] = useState(0);

  // 🟢 ฟังก์ชันคำนวณสถานะ
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

    // ✅ handle cross-midnight shift
    if (end <= start) {
      if (now < start) start.setDate(start.getDate() - 1);
      end.setDate(end.getDate() + 1);
    }

    if (now < start || now > end) return "resting";
    return data.isBooked ? "bookable" : "available";
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "available":
        return "green";
      case "bookable":
        return "orange";
      default:
        return "grey";
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      const user = auth.currentUser;
      if (!user) return;

      let data: any = null;

      // 🔎 หา therapist doc
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

        // 📊 ดึง bookings ของ therapist
        const bq = query(collection(db, "bookings"), where("therapistId", "==", data.id));
        const bSnap = await getDocs(bq);

        let todayCount = 0;
        let completedCount = 0;
        let cancelledCount = 0;

        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
        const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

        bSnap.forEach((doc) => {
          const booking = doc.data() as any;
          const startAt: Date = booking.startAt?.toDate
            ? booking.startAt.toDate()
            : booking.startAt instanceof Timestamp
            ? booking.startAt.toDate()
            : new Date(booking.startAt);

          const status = booking.status?.toLowerCase();

          if (startAt >= todayStart && startAt <= todayEnd && ["confirmed", "completed", "done", "paid"].includes(status)) {
            todayCount++;
          }
          if (["completed", "done"].includes(status)) {
            completedCount++;
          }
          if (status === "cancelled" || status === "canceled") {
            cancelledCount++;
          }
        });

        setTodayBookings(todayCount);
        setCompletedJobs(completedCount);
        setCancelledJobs(cancelledCount);
      }

      setLoading(false);
    };

    fetchData();
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/login");
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  const computedStatus = getComputedStatus(therapist);

  return (
    <Box sx={{ bgcolor: "#f6f8fa", minHeight: "100vh", maxWidth: 430, mx: "auto", pb: 7 }}>
      {/* Header */}
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
        <IconButton onClick={handleLogout} sx={{ position: "absolute", top: 10, right: 10, color: "#fff" }}>
          <LogoutIcon />
        </IconButton>

        {/* ✅ Avatar ใช้ img ห่อ */}
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
            src={
              therapist?.image?.startsWith("/")
                ? therapist.image
                : `/images/${therapist?.image}`
            }
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
            {therapist?.name}
          </Typography>
          <Typography variant="body2" color="#fff">
            {therapist?.email}
          </Typography>
          <Typography variant="body2" color="#fff">
            Working Hours: {therapist?.startTime} - {therapist?.endTime}
          </Typography>

          <Chip
            label={computedStatus}
            sx={{
              mt: 1,
              bgcolor: getStatusColor(computedStatus),
              color: "#fff",
              fontSize: 12,
              height: 22,
            }}
          />
        </Box>
      </Box>

      {/* ✅ Summary Card */}
      <Box sx={{ px: 2, mt: 3 }}>
        <ProfileSummaryCard
          todayBookings={todayBookings}
          completedJobs={completedJobs}
          cancelledJobs={cancelledJobs}
        />
      </Box>

      <Divider sx={{ my: 2, mx: 2 }} />

      {/* Menu */}
      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", p: 1 }}>
        {[
          { label: "My Bookings", gif: "/images/icon/Gift Box.gif", path: "/therapist/bookings" },
          { label: "Status", gif: "/images/icon/Coffee Break.gif", path: "/therapist/status" },
          { label: "Location", gif: "/images/icon/Map pin.gif", path: "/therapist/location" },
        ].map((btn) => (
          <Button
            key={btn.path}
            fullWidth
            variant="text"
            sx={{
              flexDirection: "column",
              py: 1,
              borderRadius: 3,
              fontWeight: "bold",
              "&:hover": { background: "rgba(0,0,0,0.05)" },
            }}
            onClick={() => navigate(btn.path)}
          >
            <img src={btn.gif} alt={btn.label} style={{ width: 70, height: 70, marginBottom: -8 }} />
            <Typography variant="subtitle1" sx={{ fontWeight: "bold", fontSize: 15 }}>
              {btn.label}
            </Typography>
          </Button>
        ))}
      </Box>


    </Box>
  );
};

export default TherapistProfilePage;