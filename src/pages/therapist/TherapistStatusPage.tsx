import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Switch,
  Button,
  TextField,
  AppBar,
  Toolbar,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  CircularProgress,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { useNavigate } from "react-router-dom";
import { auth, db } from "@/firebase";
import { doc, getDoc, updateDoc, query, where, collection, getDocs } from "firebase/firestore";
import BottomNav from "@/components/BottomNav";

const TherapistStatusPage: React.FC = () => {
  const [therapist, setTherapist] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [statusOverride, setStatusOverride] = useState("resting");

  const navigate = useNavigate();
  const today = new Date();
  const day = today.getDay();
  const isEditableDay = day === 0 || day === 3; // ✅ อาทิตย์ หรือ พุธ

  // ✅ ดึงข้อมูล Therapist โดยเช็คทั้ง uid และ email
  useEffect(() => {
    const fetchTherapist = async () => {
      const user = auth.currentUser;
      if (!user) return;

      let data: any = null;

      // 🔹 ลองหา therapist ด้วย uid ก่อน
      const q = query(collection(db, "therapists"), where("uid", "==", user.uid));
      const snap = await getDocs(q);
      if (!snap.empty) data = { id: snap.docs[0].id, ...snap.docs[0].data() };

      // 🔹 ถ้าไม่เจอ ลองหาด้วย email
      if (!data) {
        const q2 = query(collection(db, "therapists"), where("email", "==", user.email));
        const snap2 = await getDocs(q2);
        if (!snap2.empty) data = { id: snap2.docs[0].id, ...snap2.docs[0].data() };
      }

      if (data) {
        setTherapist(data);
        setStartTime(data.startTime || "");
        setEndTime(data.endTime || "");
        setStatusOverride(data.statusOverride || "resting");
      }

      setLoading(false);
    };

    fetchTherapist();
  }, []);

  // ✅ อัปเดตสถานะ (เปิด/ปิด)
  const handleToggleStatus = async () => {
    if (!therapist) return;
    const newStatus = statusOverride === "available" ? "resting" : "available";
    try {
      await updateDoc(doc(db, "therapists", therapist.id), { statusOverride: newStatus });
      setStatusOverride(newStatus);
    } catch (err) {
      alert("❌ เกิดข้อผิดพลาดในการอัปเดตสถานะ");
      console.error(err);
    }
  };

  // ✅ อัปเดตเวลา
  const handleSaveTime = async () => {
    if (!therapist) return;
    if (!isEditableDay) {
      alert("⛔ เปลี่ยนเวลาได้เฉพาะวันพุธและวันอาทิตย์");
      return;
    }

    try {
      await updateDoc(doc(db, "therapists", therapist.id), { startTime, endTime });
      alert("✅ อัปเดตเวลาเรียบร้อย!");
    } catch (err) {
      alert("❌ เกิดข้อผิดพลาดในการบันทึกเวลา");
      console.error(err);
    }
  };

  if (loading) {
    return (
      <Box sx={{ textAlign: "center", mt: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ bgcolor: "#f6f8fa", minHeight: "100vh", pb: 7 }}>
      {/* 🔹 AppBar */}
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
            แก้ไขสถานะ
          </Typography>
        </Toolbar>
      </AppBar>

      {/* 🔹 Main Content */}
      <Box sx={{ maxWidth: 420, mx: "auto", p: 3 }}>
        <Paper sx={{ p: 3, borderRadius: 4, boxShadow: 3 }}>
          {/* แสดงสถานะปัจจุบัน */}
          <Box
            sx={{
              width: 150,
              height: 150,
              borderRadius: "50%",
              mx: "auto",
              my: 2,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              background: statusOverride === "available" ? "#FB8085" : "grey",
              color: "white",
              fontSize: 24,
              fontWeight: "bold",
            }}
          >
            {statusOverride === "available" ? "เปิดแล้ว" : "ปิดแล้ว"}
          </Box>

          {/* Toggle */}
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
            <Typography fontWeight="bold">สแตนด์บาย เปิด/ปิด</Typography>
            <Switch checked={statusOverride === "available"} onChange={handleToggleStatus} />
          </Box>

          {/* ตารางเวลา */}
          <Table size="small" sx={{ mb: 2, border: "1px solid #ddd" }}>
            <TableHead sx={{ bgcolor: "#f5f5f5" }}>
              <TableRow>
                <TableCell align="center" sx={{ fontWeight: "bold" }}>เริ่มทำงาน</TableCell>
                <TableCell align="center" sx={{ fontWeight: "bold" }}>เวลาเลิกงาน</TableCell>
                <TableCell align="center" sx={{ fontWeight: "bold" }}>สถานะ</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell align="center">{startTime || "--:--"}</TableCell>
                <TableCell align="center">{endTime || "--:--"}</TableCell>
                <TableCell align="center">
                  {statusOverride === "available" ? "เปิด" : "ปิด"}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>

          {/* ฟอร์มแก้ไขเวลา */}
          <Box sx={{ display: "flex", gap: 1, my: 2 }}>
            <TextField
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              disabled={!isEditableDay}
              fullWidth
            />
            <TextField
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              disabled={!isEditableDay}
              fullWidth
            />
          </Box>

          <Button
            fullWidth
            variant="contained"
            sx={{ bgcolor: "#FB8085", fontWeight: "bold", "&:hover": { bgcolor: "#F9C1B1" } }}
            onClick={handleSaveTime}
            disabled={!isEditableDay}
          >
            บันทึกเวลา
          </Button>

          {!isEditableDay && (
            <Typography sx={{ mt: 1, color: "red", fontSize: 14, textAlign: "center" }}>
              ⛔ เปลี่ยนเวลาได้เฉพาะวันพุธและวันอาทิตย์
            </Typography>
          )}
        </Paper>
      </Box>

      <BottomNav />
    </Box>
  );
};

export default TherapistStatusPage;