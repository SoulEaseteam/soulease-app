// src/pages/admin/AdminTherapistHolidayPage.tsx
// Real-time admin control panel for therapist availability / holiday status
// — เปลี่ยน status ที่นี่ → customer-facing HomePage update ทันที (no refresh needed)
import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Typography,
  CircularProgress,
  List,
  ListItem,
  ListItemAvatar,
  Avatar,
  ListItemText,
  Paper,
  Divider,
  Chip,
  ToggleButton,
  ToggleButtonGroup,
  Snackbar,
  Alert,
  TextField,
  Stack,
  IconButton,
  Tooltip,
} from "@mui/material";
import {
  collection,
  onSnapshot,
  updateDoc,
  doc,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Search, RefreshCw, Wifi } from "lucide-react";

interface Therapist {
  id: string;
  docId: string;
  name: string;
  image?: string;
  manualStatus?: "available" | "holiday" | "bookable" | "resting";
  startTime?: string;
  endTime?: string;
}

const STATUS_OPTIONS = [
  { value: "available", label: "✅ Available", color: "#10B981" },
  { value: "holiday", label: "🏖 Holiday", color: "#F59E0B" },
  { value: "bookable", label: "📅 Bookable", color: "#3B82F6" },
  { value: "resting", label: "💤 Resting", color: "#6B7280" },
] as const;

const AdminTherapistHolidayPage: React.FC = () => {
  const [therapists, setTherapists] = useState<Therapist[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    msg: string;
    severity: "success" | "error";
  }>({ open: false, msg: "", severity: "success" });
  const [updating, setUpdating] = useState<string | null>(null);

  // Real-time subscription — updates instantly when ANY admin changes status
  useEffect(() => {
    const q = query(collection(db, "therapists"), orderBy("name"));
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const data: Therapist[] = snapshot.docs.map((d) => {
          const raw = d.data() as any;
          return {
            id: raw.id || d.id,
            docId: d.id,
            name: raw.name || "—",
            image: raw.image,
            manualStatus: raw.manualStatus,
            startTime: raw.startTime,
            endTime: raw.endTime,
          };
        });
        setTherapists(data);
        setLoading(false);
      },
      (err) => {
        console.error("[AdminHoliday] subscribe error:", err);
        setSnackbar({
          open: true,
          msg: `Failed to load: ${err.message}`,
          severity: "error",
        });
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  const handleStatusChange = async (
    therapistDocId: string,
    newStatus: Therapist["manualStatus"],
    therapistName: string
  ) => {
    if (!newStatus) return;
    setUpdating(therapistDocId);
    try {
      await updateDoc(doc(db, "therapists", therapistDocId), {
        manualStatus: newStatus,
      });
      setSnackbar({
        open: true,
        msg: `${therapistName} → ${newStatus}`,
        severity: "success",
      });
    } catch (e: any) {
      setSnackbar({
        open: true,
        msg: `Update failed: ${e.message}`,
        severity: "error",
      });
    } finally {
      setUpdating(null);
    }
  };

  // Filter by name
  const filtered = useMemo(() => {
    if (!search.trim()) return therapists;
    const q = search.trim().toLowerCase();
    return therapists.filter((t) => t.name.toLowerCase().includes(q));
  }, [therapists, search]);

  // Stats
  const stats = useMemo(() => {
    const total = therapists.length;
    const onHoliday = therapists.filter((t) => t.manualStatus === "holiday").length;
    const available = therapists.filter(
      (t) => !t.manualStatus || t.manualStatus === "available"
    ).length;
    return { total, onHoliday, available };
  }, [therapists]);

  if (loading) {
    return (
      <Box sx={{ p: 4, textAlign: "center" }}>
        <CircularProgress sx={{ color: "#FE0944" }} />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: 900, mx: "auto" }}>
      {/* HEADER */}
      <Stack direction="row" alignItems="center" spacing={1.5} mb={1}>
        <Typography variant="h5" fontWeight={700}>
          🧘 Therapist Status Control
        </Typography>
        <Tooltip title="Real-time sync — changes appear on customer site instantly">
          <Chip
            icon={<Wifi size={14} />}
            label="LIVE"
            size="small"
            sx={{
              bgcolor: "#10B981",
              color: "#fff",
              fontWeight: 700,
              height: 22,
            }}
          />
        </Tooltip>
      </Stack>
      <Typography sx={{ color: "#64748B", fontSize: 13, mb: 3 }}>
        Toggle each therapist's availability. Changes sync to the customer site in real-time.
      </Typography>

      {/* STATS */}
      <Stack direction="row" spacing={2} mb={2}>
        <Chip
          label={`Total: ${stats.total}`}
          sx={{ fontWeight: 600, bgcolor: "#F1F5F9" }}
        />
        <Chip
          label={`Available: ${stats.available}`}
          sx={{ fontWeight: 600, bgcolor: "#D1FAE5", color: "#065F46" }}
        />
        <Chip
          label={`On Holiday: ${stats.onHoliday}`}
          sx={{ fontWeight: 600, bgcolor: "#FEF3C7", color: "#92400E" }}
        />
      </Stack>

      {/* SEARCH */}
      <TextField
        fullWidth
        size="small"
        placeholder="Search therapist by name..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        InputProps={{
          startAdornment: (
            <Search size={18} style={{ marginRight: 8, color: "#94A3B8" }} />
          ),
        }}
        sx={{ mb: 3 }}
      />

      {/* LIST */}
      <Paper elevation={0} sx={{ border: "1px solid #E5E7EB", borderRadius: 2 }}>
        <List sx={{ p: 0 }}>
          {filtered.length === 0 ? (
            <ListItem>
              <ListItemText
                primary="No therapists match your search"
                sx={{ textAlign: "center", color: "#94A3B8" }}
              />
            </ListItem>
          ) : (
            filtered.map((t, idx) => {
              const currentStatus = t.manualStatus || "available";
              const isUpdating = updating === t.docId;
              return (
                <React.Fragment key={t.docId}>
                  <ListItem sx={{ py: 2, opacity: isUpdating ? 0.6 : 1 }}>
                    <ListItemAvatar>
                      <Avatar
                        src={t.image}
                        sx={{
                          bgcolor: "#FE0944",
                          color: "#fff",
                          fontWeight: 700,
                        }}
                      >
                        {t.name?.[0]?.toUpperCase()}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Typography fontWeight={700} fontSize={15}>
                          {t.name}
                        </Typography>
                      }
                      secondary={
                        <Typography fontSize={12} color="#64748B">
                          {t.startTime || "—"} – {t.endTime || "—"}
                          {isUpdating && " · saving..."}
                        </Typography>
                      }
                    />
                    <ToggleButtonGroup
                      exclusive
                      size="small"
                      value={currentStatus}
                      onChange={(_, val) =>
                        val && handleStatusChange(t.docId, val, t.name)
                      }
                      disabled={isUpdating}
                      sx={{
                        "& .MuiToggleButton-root": {
                          textTransform: "none",
                          fontSize: 11,
                          px: 1.2,
                          py: 0.5,
                        },
                      }}
                    >
                      {STATUS_OPTIONS.map((opt) => (
                        <ToggleButton
                          key={opt.value}
                          value={opt.value}
                          sx={{
                            "&.Mui-selected": {
                              bgcolor: opt.color,
                              color: "#fff",
                              fontWeight: 700,
                              "&:hover": { bgcolor: opt.color },
                            },
                          }}
                        >
                          {opt.label}
                        </ToggleButton>
                      ))}
                    </ToggleButtonGroup>
                  </ListItem>
                  {idx < filtered.length - 1 && <Divider />}
                </React.Fragment>
              );
            })
          )}
        </List>
      </Paper>

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

export default AdminTherapistHolidayPage;
