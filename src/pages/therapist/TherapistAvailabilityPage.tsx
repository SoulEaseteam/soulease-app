// src/pages/therapist/TherapistAvailabilityPage.tsx
// Self-service page — therapist toggles their own holiday/availability
// Real-time: status saves to Firestore → customer site updates instantly
import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Stack,
  Button,
  Chip,
  CircularProgress,
  Snackbar,
  Alert,
  Divider,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/providers/AuthProvider";
import { ArrowLeft, CheckCircle, Coffee, Calendar, Pause, Wifi } from "lucide-react";

type Status = "available" | "holiday" | "bookable" | "resting";

const STATUS_CONFIG: {
  value: Status;
  label: string;
  desc: string;
  color: string;
  icon: React.ReactNode;
}[] = [
  {
    value: "available",
    label: "✅ Available — รับงาน",
    desc: "ลูกค้าจองได้ทันที / Customers can book me now",
    color: "#10B981",
    icon: <CheckCircle size={20} />,
  },
  {
    value: "bookable",
    label: "📅 Bookable — รับงานล่วงหน้า",
    desc: "รับจองล่วงหน้าได้ ยังไม่พร้อมทันที / Accepting future bookings",
    color: "#3B82F6",
    icon: <Calendar size={20} />,
  },
  {
    value: "resting",
    label: "💤 Resting — พักช่วงสั้น",
    desc: "พักช่วงสั้น เช่น ทานข้าว / Short break (lunch, etc.)",
    color: "#6B7280",
    icon: <Coffee size={20} />,
  },
  {
    value: "holiday",
    label: "🏖 On Leave — ลาวันนี้",
    desc: "ลางานวันนี้/หลายวัน / On leave today (or multiple days)",
    color: "#F59E0B",
    icon: <Pause size={20} />,
  },
];

const TherapistAvailabilityPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [currentStatus, setCurrentStatus] = useState<Status>("available");
  const [therapistName, setTherapistName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    msg: string;
    severity: "success" | "error";
  }>({ open: false, msg: "", severity: "success" });

  // Real-time subscribe to own therapist doc
  useEffect(() => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }
    const unsub = onSnapshot(
      doc(db, "therapists", user.uid),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setCurrentStatus((data.manualStatus as Status) || "available");
          setTherapistName(data.name || "");
        }
        setLoading(false);
      },
      (err) => {
        console.error("[TherapistAvailability] subscribe error:", err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [user?.uid]);

  const handleSetStatus = async (newStatus: Status) => {
    if (!user?.uid || newStatus === currentStatus) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, "therapists", user.uid), {
        manualStatus: newStatus,
      });
      const cfg = STATUS_CONFIG.find((s) => s.value === newStatus);
      setSnackbar({
        open: true,
        msg: `เปลี่ยนเป็น ${cfg?.label} แล้ว`,
        severity: "success",
      });
    } catch (e: any) {
      setSnackbar({
        open: true,
        msg: `บันทึกไม่สำเร็จ: ${e.message}`,
        severity: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <Box sx={{ p: 4, textAlign: "center" }}>
        <Typography>กรุณาเข้าสู่ระบบ / Please log in</Typography>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box sx={{ p: 4, textAlign: "center" }}>
        <CircularProgress sx={{ color: "#FE0944" }} />
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#FAFAFA", pb: 8 }}>
      {/* Hero */}
      <Box
        sx={{
          background: "linear-gradient(180deg, #FE0944 0%, #FEAE96 100%)",
          color: "#fff",
          px: 3,
          py: 4,
          position: "relative",
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1} mb={2}>
          <Button
            onClick={() => navigate(-1)}
            startIcon={<ArrowLeft size={18} />}
            sx={{
              color: "#fff",
              textTransform: "none",
              minWidth: 0,
              "&:hover": { background: "rgba(255,255,255,0.15)" },
            }}
          >
            Back
          </Button>
        </Stack>
        <Typography sx={{ fontSize: 11, letterSpacing: 4, opacity: 0.9 }}>
          THERAPIST PORTAL
        </Typography>
        <Typography
          sx={{
            fontFamily: "'Cormorant Garamond', serif",
            fontWeight: 600,
            fontSize: 32,
            mt: 0.5,
          }}
        >
          {therapistName || "My Status"}
        </Typography>
        <Stack direction="row" alignItems="center" spacing={1} mt={1}>
          <Wifi size={14} />
          <Typography sx={{ fontSize: 12, opacity: 0.9 }}>
            Real-time sync — เปลี่ยนสถานะแล้วลูกค้าเห็นทันที
          </Typography>
        </Stack>
      </Box>

      {/* Current status indicator */}
      <Box sx={{ px: 3, pt: 3, maxWidth: 600, mx: "auto" }}>
        <Paper
          elevation={0}
          sx={{
            p: 2,
            mb: 3,
            borderRadius: 3,
            border: "2px solid",
            borderColor: STATUS_CONFIG.find((s) => s.value === currentStatus)
              ?.color,
            bgcolor: "#fff",
          }}
        >
          <Typography sx={{ fontSize: 12, color: "#64748B", fontWeight: 600 }}>
            CURRENT STATUS
          </Typography>
          <Stack direction="row" alignItems="center" spacing={1.5} mt={1}>
            <Box
              sx={{
                color: STATUS_CONFIG.find((s) => s.value === currentStatus)
                  ?.color,
              }}
            >
              {STATUS_CONFIG.find((s) => s.value === currentStatus)?.icon}
            </Box>
            <Typography fontWeight={700} fontSize={18}>
              {STATUS_CONFIG.find((s) => s.value === currentStatus)?.label}
            </Typography>
          </Stack>
        </Paper>

        {/* Toggle buttons */}
        <Typography fontWeight={700} fontSize={14} color="#64748B" mb={1.5}>
          เปลี่ยนสถานะ / Change status
        </Typography>
        <Stack spacing={1.5}>
          {STATUS_CONFIG.map((opt) => {
            const active = opt.value === currentStatus;
            return (
              <Paper
                key={opt.value}
                elevation={0}
                onClick={() => !saving && handleSetStatus(opt.value)}
                sx={{
                  p: 2,
                  borderRadius: 3,
                  cursor: saving ? "default" : "pointer",
                  border: "2px solid",
                  borderColor: active ? opt.color : "transparent",
                  bgcolor: active ? `${opt.color}11` : "#fff",
                  transition: "all 0.2s ease",
                  opacity: saving ? 0.6 : 1,
                  "&:hover": {
                    transform: saving ? undefined : "translateY(-1px)",
                    boxShadow: saving
                      ? undefined
                      : "0 6px 20px rgba(0,0,0,0.06)",
                  },
                }}
              >
                <Stack direction="row" alignItems="center" spacing={2}>
                  <Box
                    sx={{
                      width: 44,
                      height: 44,
                      borderRadius: 2,
                      bgcolor: `${opt.color}22`,
                      color: opt.color,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    {opt.icon}
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography fontWeight={700} fontSize={15}>
                      {opt.label}
                    </Typography>
                    <Typography fontSize={12} color="#64748B" mt={0.3}>
                      {opt.desc}
                    </Typography>
                  </Box>
                  {active && (
                    <Chip
                      label="ON"
                      size="small"
                      sx={{
                        bgcolor: opt.color,
                        color: "#fff",
                        fontWeight: 700,
                        fontSize: 10,
                      }}
                    />
                  )}
                </Stack>
              </Paper>
            );
          })}
        </Stack>

        <Divider sx={{ my: 4 }} />

        <Typography sx={{ fontSize: 12, color: "#94A3B8", textAlign: "center" }}>
          ลาเสร็จแล้วอย่าลืมกลับมาเปลี่ยนเป็น "Available" ก่อนเริ่มงาน
          <br />
          Remember to set back to "Available" before your shift starts
        </Typography>
      </Box>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={2500}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity={snackbar.severity} variant="filled">
          {snackbar.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default TherapistAvailabilityPage;
