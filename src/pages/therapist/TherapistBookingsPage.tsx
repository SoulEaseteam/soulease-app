import React, { useEffect, useState } from "react";
import {
  Box, Typography, Tabs, Tab, Paper, Button, Divider, Chip, CircularProgress,
} from "@mui/material";
import { db } from "@/firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  updateDoc,
  doc,
} from "firebase/firestore";
import { useAuth } from "@/providers/AuthProvider"; // ✅ ใช้ AuthProvider แทน auth.currentUser ตรง ๆ

const TherapistBookingsPage: React.FC = () => {
  const { user } = useAuth();
  const [tab, setTab] = useState(0);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    // ✅ ใช้ onSnapshot (Realtime)
    const q = query(collection(db, "bookings"), where("therapistId", "==", user.uid));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setBookings(data);
      setLoading(false);
    });

    return () => unsub();
  }, [user]);

  const filteredBookings = bookings.filter((b) => {
    if (tab === 0) return b.status === "upcoming";
    if (tab === 1) return b.status === "in-progress";
    if (tab === 2) return b.status === "completed";
    if (tab === 3) return b.status === "cancelled";
    return true;
  });

  const handleComplete = async (id: string) => {
    await updateDoc(doc(db, "bookings", id), { status: "completed" });
  };

  if (loading) {
    return (
      <Box sx={{ textAlign: "center", mt: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 430, mx: "auto", bgcolor: "#f8f9fa", minHeight: "100vh" }}>
      <Box
        sx={{
          background: "linear-gradient(90deg, #FB8085, #F9C1B1)",
          color: "#fff",
          p: 2,
          textAlign: "center",
          fontWeight: "bold",
          fontSize: 18,
        }}
      >
        การจองของฉัน
      </Box>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="fullWidth" sx={{ bgcolor: "#fff" }}>
        <Tab label="คำสั่งซื้อใหม่" />
        <Tab label="กำลังดำเนินการ" />
        <Tab label="เสร็จแล้ว" />
        <Tab label="ยกเลิก" />
      </Tabs>

      <Box sx={{ p: 2 }}>
        {filteredBookings.length === 0 ? (
          <Typography textAlign="center" color="text.secondary">
            ไม่มีการจอง
          </Typography>
        ) : (
          filteredBookings.map((b) => (
            <Paper key={b.id} sx={{ p: 2, mb: 2, borderRadius: 3 }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
                <Typography fontWeight="bold">{b.serviceName}</Typography>
                <Chip
                  label={
                    b.status === "upcoming"
                      ? "รอคิว"
                      : b.status === "in-progress"
                      ? "กำลังบริการ"
                      : b.status === "completed"
                      ? "เสร็จสิ้น"
                      : "ยกเลิก"
                  }
                  sx={{
                    bgcolor:
                      b.status === "completed"
                        ? "#4CAF50"
                        : b.status === "in-progress"
                        ? "#FFC107"
                        : b.status === "cancelled"
                        ? "#E57373"
                        : "#90CAF9",
                    color: "#fff",
                    fontSize: 12,
                    fontWeight: "bold",
                  }}
                />
              </Box>

              <Typography variant="body2" color="text.secondary">
                📍 {b.address}
              </Typography>
              {b.note && (
                <Typography variant="body2" color="text.secondary">
                  📝 {b.note}
                </Typography>
              )}

              <Divider sx={{ my: 1 }} />

              <Box display="flex" justifyContent="space-between" mb={1}>
                <Typography>ค่านวด</Typography>
                <Typography>฿{b.servicePrice?.toLocaleString()}</Typography>
              </Box>
              <Box display="flex" justifyContent="space-between" mb={1}>
                <Typography>ค่าเดินทาง</Typography>
                <Typography>฿{b.travelCost?.toLocaleString()}</Typography>
              </Box>

              <Divider sx={{ mb: 1 }} />

              <Box display="flex" justifyContent="space-between">
                <Typography fontWeight="bold">รวมทั้งหมด</Typography>
                <Typography fontWeight="bold" color="orange">
                  ฿{b.total?.toLocaleString()}
                </Typography>
              </Box>

              {b.status === "in-progress" && (
                <Button
                  variant="contained"
                  fullWidth
                  sx={{ mt: 1.5, bgcolor: "#38b48b", fontWeight: "bold" }}
                  onClick={() => handleComplete(b.id)}
                >
                  ✅ บริการเสร็จสิ้น
                </Button>
              )}
            </Paper>
          ))
        )}
      </Box>
    </Box>
  );
};

export default TherapistBookingsPage;