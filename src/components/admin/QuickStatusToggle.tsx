// src/components/admin/QuickStatusToggle.tsx
// Compact quick-toggle widget for admin dashboard
// — เห็นรายชื่อพนักงานพร้อมสถานะ ปุ่ม toggle เร็วๆ
// — Real-time sync ทุก client
import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Typography,
  Stack,
  Avatar,
  IconButton,
  CircularProgress,
  Snackbar,
  Alert,
  Tooltip,
  Chip,
  Button,
} from "@mui/material";
import { collection, onSnapshot, updateDoc, doc, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { CheckCircle, Pause, Wifi, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

interface Therapist {
  id: string;
  docId: string;
  name: string;
  image?: string;
  manualStatus?: "available" | "holiday" | "bookable" | "resting";
}

const QuickStatusToggle: React.FC = () => {
  const [therapists, setTherapists] = useState<Therapist[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    msg: string;
  }>({ open: false, msg: "" });

  useEffect(() => {
    const q = query(collection(db, "therapists"), orderBy("name"));
    const unsub = onSnapshot(q, (snap) => {
      const data: Therapist[] = snap.docs.map((d) => {
        const raw = d.data() as any;
        return {
          id: raw.id || d.id,
          docId: d.id,
          name: raw.name || "—",
          image: raw.image,
          manualStatus: raw.manualStatus,
        };
      });
      setTherapists(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Toggle: available ↔ holiday (one-click)
  const handleToggle = async (t: Therapist) => {
    setUpdating(t.docId);
    const newStatus =
      t.manualStatus === "holiday" ? "available" : "holiday";
    try {
      await updateDoc(doc(db, "therapists", t.docId), {
        manualStatus: newStatus,
      });
      setSnackbar({
        open: true,
        msg:
          newStatus === "holiday"
            ? `${t.name} → 🏖 On Holiday`
            : `${t.name} → ✅ Available`,
      });
    } catch (e: any) {
      setSnackbar({ open: true, msg: `Failed: ${e.message}` });
    } finally {
      setUpdating(null);
    }
  };

  const stats = useMemo(() => {
    return {
      total: therapists.length,
      onHoliday: therapists.filter((t) => t.manualStatus === "holiday").length,
      available: therapists.filter(
        (t) => !t.manualStatus || t.manualStatus === "available"
      ).length,
    };
  }, [therapists]);

  return (
    <Box
      sx={{
        p: 2.5,
        borderRadius: 3,
        bgcolor: "#fff",
        border: "1px solid #E5E7EB",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
      }}
    >
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Box>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Typography sx={{ fontWeight: 700, fontSize: 16 }}>
              Therapist Quick Status
            </Typography>
            <Tooltip title="Real-time — change here syncs to customer site instantly">
              <Chip
                icon={<Wifi size={11} />}
                label="LIVE"
                size="small"
                sx={{
                  bgcolor: "#10B981",
                  color: "#fff",
                  fontWeight: 700,
                  height: 18,
                  fontSize: 10,
                }}
              />
            </Tooltip>
          </Stack>
          <Typography sx={{ fontSize: 12, color: "#64748B", mt: 0.3 }}>
            One-click holiday on/off · เปิดปิดได้ทันที
          </Typography>
        </Box>
        <Button
          component={Link}
          to="/admin/holiday"
          endIcon={<ArrowRight size={14} />}
          size="small"
          sx={{
            textTransform: "none",
            fontSize: 12,
            color: "#FE0944",
          }}
        >
          Full control
        </Button>
      </Stack>

      {/* Stats */}
      <Stack direction="row" spacing={1} mb={2}>
        <Chip
          size="small"
          label={`Total ${stats.total}`}
          sx={{ bgcolor: "#F1F5F9", fontWeight: 600 }}
        />
        <Chip
          size="small"
          label={`✅ ${stats.available}`}
          sx={{ bgcolor: "#D1FAE5", color: "#065F46", fontWeight: 700 }}
        />
        <Chip
          size="small"
          label={`🏖 ${stats.onHoliday}`}
          sx={{ bgcolor: "#FEF3C7", color: "#92400E", fontWeight: 700 }}
        />
      </Stack>

      {/* Therapist rows */}
      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
          <CircularProgress size={20} sx={{ color: "#FE0944" }} />
        </Box>
      ) : (
        <Stack spacing={0.5} sx={{ maxHeight: 360, overflowY: "auto" }}>
          {therapists.map((t) => {
            const isHoliday = t.manualStatus === "holiday";
            const isUpdating = updating === t.docId;
            return (
              <Stack
                key={t.docId}
                direction="row"
                alignItems="center"
                spacing={1.5}
                sx={{
                  p: 1,
                  borderRadius: 2,
                  bgcolor: isHoliday ? "#FEF3C7" : "transparent",
                  opacity: isUpdating ? 0.5 : 1,
                  transition: "background 0.2s ease",
                  "&:hover": { bgcolor: isHoliday ? "#FDE68A" : "#F8FAFC" },
                }}
              >
                <Avatar
                  src={t.image}
                  sx={{
                    width: 32,
                    height: 32,
                    bgcolor: "#FE0944",
                    color: "#fff",
                    fontSize: 14,
                    fontWeight: 700,
                  }}
                >
                  {t.name?.[0]?.toUpperCase()}
                </Avatar>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography
                    sx={{
                      fontWeight: 600,
                      fontSize: 14,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {t.name}
                  </Typography>
                  <Typography sx={{ fontSize: 11, color: "#64748B" }}>
                    {isHoliday ? "🏖 On holiday" : "✅ Available"}
                  </Typography>
                </Box>
                <Tooltip
                  title={
                    isHoliday ? "Tap to mark Available" : "Tap to mark Holiday"
                  }
                >
                  <IconButton
                    size="small"
                    onClick={() => handleToggle(t)}
                    disabled={isUpdating}
                    sx={{
                      bgcolor: isHoliday ? "#F59E0B" : "#10B981",
                      color: "#fff",
                      "&:hover": {
                        bgcolor: isHoliday ? "#D97706" : "#059669",
                      },
                      "&.Mui-disabled": {
                        bgcolor: "#E5E7EB",
                        color: "#9CA3AF",
                      },
                    }}
                  >
                    {isHoliday ? <Pause size={14} /> : <CheckCircle size={14} />}
                  </IconButton>
                </Tooltip>
              </Stack>
            );
          })}
        </Stack>
      )}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={2000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity="success" variant="filled">
          {snackbar.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default QuickStatusToggle;
