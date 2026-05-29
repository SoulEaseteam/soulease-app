// src/pages/admin/AdminTherapistDetailPage.tsx
import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  CircularProgress,
  Button,
  Chip,
  Grid,
  Avatar,
  Divider,
  Stack,
  TextField,
  MenuItem,
  Switch,
  Paper,
  FormControlLabel,
  useMediaQuery,
} from "@mui/material";
import { useParams, useNavigate } from "react-router-dom";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  onSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import dayjs from "dayjs";

const statusOptions = [
  { value: "", label: "Auto" },
  { value: "available", label: "Available" },
  { value: "bookable", label: "Bookable" },
  { value: "resting", label: "Resting" },
];

const badgeOptions = ["VIP", "HOT", "NEW", ""];

const AdminTherapistDetailPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isMobile = useMediaQuery("(max-width:900px)");

  const [loading, setLoading] = useState(true);
  const [therapist, setTherapist] = useState<any>(null);
  const [todayBookings, setTodayBookings] = useState(0);
  const [totalBookings, setTotalBookings] = useState(0);
  const [lastBookingAt, setLastBookingAt] = useState<Date | null>(null);
  const [editing, setEditing] = useState(false);

  const [formData, setFormData] = useState({
    startTime: "",
    endTime: "",
    rating: "",
    reviews: "",
    statusOverride: null as "available" | "bookable" | "resting" | null,
    currentLocation: "",
    badge: "",
    hidden: false,
    blocked: false,
  });

  // ================================
  // LOAD DATA
  // ================================
  useEffect(() => {
    if (!id) return;

    let unsubTherapist: any = null;
    let unsubBookings: any = null;

    const fetchData = async () => {
      setLoading(true);

      let docRef: any = null;
      let docSnap: any = null;

      // 1) Try by documentId
      try {
        const directRef = doc(db, "therapists", id);
        const directSnap = await getDoc(directRef);
        if (directSnap.exists()) {
          docRef = directRef;
          docSnap = directSnap;
        }
      } catch {
        // doc not found at direct ID — fallback to query by field
      }

      // 2) Try by field: id
      if (!docSnap?.exists()) {
        const q = query(collection(db, "therapists"), where("id", "==", id));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          docSnap = snapshot.docs[0];
          docRef = docSnap.ref;
        }
      }

      if (!docSnap?.exists()) {
        setTherapist(null);
        setLoading(false);
        return;
      }

      // Real-time therapist
      unsubTherapist = onSnapshot(docRef, (snap: any) => {
        if (snap.exists()) {
          const data = snap.data();
          setTherapist({ id: snap.id, ...data });

          setFormData({
            startTime: data.startTime || "",
            endTime: data.endTime || "",
            rating: data.rating?.toString() || "",
            reviews: data.reviews?.toString() || "",
            statusOverride: data.statusOverride ?? null,
            currentLocation:
              typeof data.currentLocation === "object"
                ? `${data.currentLocation.lat}, ${data.currentLocation.lng}`
                : data.currentLocation || "",
            badge: data.badge || "",
            hidden: data.hidden || false,
            blocked: data.blocked || false,
          });
        }
      });

      // Real-time bookings
      unsubBookings = onSnapshot(
        query(collection(db, "bookings"), where("therapistId", "==", docSnap.id)),
        (snap) => {
          const today = dayjs().format("YYYY-MM-DD");
          let todayCount = 0;
          let last: Date | null = null;

          snap.forEach((doc) => {
            const d = doc.data();
            if (d.date === today) todayCount++;
            if (d.startAt?.toDate) {
              const dDate = d.startAt.toDate();
              if (!last || dDate > last) last = dDate;
            }
          });

          setTodayBookings(todayCount);
          setTotalBookings(snap.size);
          setLastBookingAt(last);
        }
      );

      setLoading(false);
    };

    void fetchData();

    return () => {
      if (unsubTherapist) unsubTherapist();
      if (unsubBookings) unsubBookings();
    };
  }, [id]);

  // ================================
  // STATUS ENGINE
  // ================================
  const computedStatus = () => {
    if (!therapist) return "N/A";
    if (formData.statusOverride) return formData.statusOverride;

    const now = new Date();
    const [sh = 0, sm = 0] = formData.startTime.split(":").map(Number);
    const [eh = 0, em = 0] = formData.endTime.split(":").map(Number);

    const start = new Date(now);
    const end = new Date(now);
    start.setHours(sh, sm, 0);
    end.setHours(eh, em, 0);

    if (end <= start) end.setDate(end.getDate() + 1);

    const working = now >= start && now <= end;
    return working ? (therapist.isBooked ? "bookable" : "available") : "resting";
  };

  // ================================
  // SAVE EDIT
  // ================================
  const handleSave = async () => {
    if (!therapist) return;

    let locationValue: any = formData.currentLocation;

    if (typeof locationValue === "string" && locationValue.includes(",")) {
      const [latStr, lngStr] = locationValue.split(",");
      const lat = parseFloat(latStr.trim());
      const lng = parseFloat(lngStr.trim());
      if (!isNaN(lat) && !isNaN(lng)) locationValue = { lat, lng };
    }

    await updateDoc(doc(db, "therapists", therapist.id), {
      startTime: formData.startTime,
      endTime: formData.endTime,
      rating: Number(formData.rating),
      reviews: Number(formData.reviews),
      statusOverride: formData.statusOverride ?? null,
      currentLocation: locationValue,
      badge: formData.badge,
      hidden: formData.hidden,
      blocked: formData.blocked,
    });

    setEditing(false);
  };

  // ================================
  // RENDER
  // ================================
  if (loading)
    return (
      <Box p={3}>
        <CircularProgress />
      </Box>
    );

  if (!therapist)
    return (
      <Box p={3}>
        <Typography>Therapist not found.</Typography>
      </Box>
    );

  return (
    <Box p={isMobile ? 2 : 4}>
      <Button onClick={() => navigate(-1)}>&larr; Back</Button>
      <Typography variant="h4" fontWeight="bold" mt={2}>
        👤 Therapist Detail
      </Typography>

      <Paper elevation={3} sx={{ p: 3, mt: 3, borderRadius: 3 }}>
        {/* HEADER */}
        <Stack direction="row" spacing={2} alignItems="center">
          <Avatar src={therapist.image} sx={{ width: 80, height: 80 }} />
          <Box>
            <Typography variant="h6">{therapist.name}</Typography>
            <Stack direction="row" spacing={1} mt={1}>
              <Chip label={`Override: ${formData.statusOverride || "Auto"}`} size="small" />
              <Chip label={`Status: ${computedStatus()}`} color="info" size="small" />
            </Stack>
            <Typography variant="body2" mt={1}>
              Specialty: {therapist.specialty || "N/A"}
            </Typography>
          </Box>
        </Stack>

        <Divider sx={{ my: 3 }} />

        {/* CONTENT GRID */}
        <Grid container spacing={3}>
          {/* LEFT SECTION */}
          <Grid size={{ xs: 12, md: 6 }}>
            {editing ? (
              <>
                <TextField
                  label="Rating"
                  type="number"
                  fullWidth
                  value={formData.rating}
                  onChange={(e) => setFormData({ ...formData, rating: e.target.value })}
                  sx={{ mb: 2 }}
                />
                <TextField
                  label="Reviews"
                  type="number"
                  fullWidth
                  value={formData.reviews}
                  onChange={(e) => setFormData({ ...formData, reviews: e.target.value })}
                  sx={{ mb: 2 }}
                />

                <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
                  <TextField
                    label="Start Time"
                    type="time"
                    fullWidth
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  />
                  <TextField
                    label="End Time"
                    type="time"
                    fullWidth
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                  />
                </Stack>

                <TextField
                  label="Location (lat,lng)"
                  fullWidth
                  value={formData.currentLocation}
                  onChange={(e) =>
                    setFormData({ ...formData, currentLocation: e.target.value })
                  }
                  sx={{ mb: 2 }}
                />

                <TextField
                  label="Badge"
                  select
                  fullWidth
                  value={formData.badge}
                  onChange={(e) => setFormData({ ...formData, badge: e.target.value })}
                  sx={{ mb: 2 }}
                >
                  {badgeOptions.map((b) => (
                    <MenuItem key={b} value={b}>
                      {b || "None"}
                    </MenuItem>
                  ))}
                </TextField>

                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.hidden}
                      onChange={(e) =>
                        setFormData({ ...formData, hidden: e.target.checked })
                      }
                    />
                  }
                  label="Hide from Homepage"
                />

                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.blocked}
                      onChange={(e) =>
                        setFormData({ ...formData, blocked: e.target.checked })
                      }
                    />
                  }
                  label="Blocked (Unavailable)"
                />
              </>
            ) : (
              <>
                <Typography>⭐ Rating: {therapist.rating}</Typography>
                <Typography>💬 Reviews: {therapist.reviews}</Typography>
                <Typography>🕐 Start: {therapist.startTime}</Typography>
                <Typography>🕔 End: {therapist.endTime}</Typography>

                <Typography mt={1}>
                  📍 Location:{" "}
                  {typeof therapist.currentLocation === "object"
                    ? `${therapist.currentLocation.lat}, ${therapist.currentLocation.lng}`
                    : therapist.currentLocation}
                </Typography>

                <Typography>🎖 Badge: {therapist.badge || "None"}</Typography>
                <Typography>🙈 Hidden: {therapist.hidden ? "Yes" : "No"}</Typography>
                <Typography>🚫 Blocked: {therapist.blocked ? "Yes" : "No"}</Typography>
              </>
            )}
          </Grid>

          {/* RIGHT SECTION */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Typography>📆 Today: {todayBookings}</Typography>
            <Typography>📊 Total: {totalBookings}</Typography>
            <Typography>
              🕓 Last Booking:{" "}
              {lastBookingAt ? dayjs(lastBookingAt).format("YYYY-MM-DD HH:mm") : "N/A"}
            </Typography>

            <TextField
              label="Status Override"
              select
              fullWidth
              value={formData.statusOverride || ""}
              sx={{ mt: 3 }}
              disabled={!editing}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  statusOverride: (e.target.value || null) as "available" | "bookable" | "resting" | null,
                })
              }
            >
              {statusOptions.map((op) => (
                <MenuItem key={op.value} value={op.value}>
                  {op.label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
        </Grid>

        {/* BUTTONS */}
        <Stack direction="row" spacing={2} mt={4}>
          {editing ? (
            <>
              <Button variant="contained" onClick={handleSave}>
                💾 Save
              </Button>
              <Button variant="outlined" onClick={() => setEditing(false)}>
                Cancel
              </Button>
            </>
          ) : (
            <Button variant="outlined" onClick={() => setEditing(true)}>
              ✏️ Edit
            </Button>
          )}

          <Button variant="text" onClick={() => navigate(`/therapists/${therapist.id}`)}>
            🔎 View Public Profile
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
};

export default AdminTherapistDetailPage;