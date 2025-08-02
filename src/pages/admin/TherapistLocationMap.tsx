import React, { useEffect, useState, useMemo } from "react";
import {
  Box,
  Typography,
  CircularProgress,
  Button,
  Stack,
  Paper,
  TextField,
  MenuItem,
} from "@mui/material";
import {
  GoogleMap,
  Marker,
  InfoWindow,
  useLoadScript,
} from "@react-google-maps/api";
import {
  collection,
  getDocs,
  query,
  where,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/firebase";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";

interface Therapist {
  id: string;
  name: string;
  currentLocation?: { lat: number; lng: number };
  rating?: number;
  totalBookings?: number;
  startTime?: string;
  endTime?: string;
  statusOverride?: string | null;
}

const mapContainerStyle = { width: "100%", height: "80vh" };
const center = { lat: 13.7563, lng: 100.5018 };

const TherapistLocationMap: React.FC = () => {
  const [therapists, setTherapists] = useState<Therapist[]>([]);
  const [selected, setSelected] = useState<Therapist | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeBookings, setActiveBookings] = useState<string[]>([]);

  const [search, setSearch] = useState("");
  const [minRating, setMinRating] = useState<number | "">("");
  const [statusFilter, setStatusFilter] = useState("all");

  const navigate = useNavigate();

  const { isLoaded } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
  });

  // ✅ ดึงรายชื่อ therapist
  useEffect(() => {
    const fetchData = async () => {
      const snap = await getDocs(collection(db, "therapists"));
      const data = snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Therapist[];
      setTherapists(data.filter((t) => t.currentLocation));
      setLoading(false);
    };
    fetchData();
  }, []);

  // ✅ ดึง booking ปัจจุบัน
  useEffect(() => {
    const fetchBookings = async () => {
      const now = dayjs().toDate();
      const q = query(
        collection(db, "bookings"),
        where("startTime", "<=", now),
        where("endTime", ">=", now),
        where("status", "in", ["confirmed", "in-progress"])
      );
      const snap = await getDocs(q);
      const ids = snap.docs.map((doc) => doc.data().therapistId as string);
      setActiveBookings(ids);
    };
    fetchBookings();
  }, []);

  const getAutoStatus = (therapist: Therapist) => {
    const now = dayjs();
    const start = dayjs(therapist.startTime, "HH:mm");
    const end = dayjs(therapist.endTime, "HH:mm");

    if (!therapist.startTime || !therapist.endTime) return "offline";
    if (!now.isAfter(start) || !now.isBefore(end)) return "offline";

    if (activeBookings.includes(therapist.id)) return "busy";
    return "available";
  };

  const processedTherapists = therapists.map((t) => {
    const status = t.statusOverride || getAutoStatus(t);
    return { ...t, computedStatus: status };
  });

  const filteredTherapists = useMemo(() => {
    return processedTherapists.filter((t) => {
      const matchName = t.name.toLowerCase().includes(search.toLowerCase());
      const matchRating = minRating === "" || (t.rating ?? 0) >= minRating;
      const matchStatus =
        statusFilter === "all" || t.computedStatus === statusFilter;
      return matchName && matchRating && matchStatus;
    });
  }, [processedTherapists, search, minRating, statusFilter]);

  const markerColor = (status: string) => {
    switch (status) {
      case "available":
        return "http://maps.google.com/mapfiles/ms/icons/green-dot.png";
      case "busy":
        return "http://maps.google.com/mapfiles/ms/icons/yellow-dot.png";
      default:
        return "http://maps.google.com/mapfiles/ms/icons/red-dot.png";
    }
  };

  if (!isLoaded)
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="80vh">
        <CircularProgress />
      </Box>
    );

  return (
    <Box p={3}>
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        📍 Therapist Location Map
      </Typography>

      <Stack direction={{ xs: "column", md: "row" }} spacing={2} mb={2}>
        <TextField
          label="Search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <TextField
          select
          label="Min Rating"
          value={minRating}
          onChange={(e) => setMinRating(e.target.value ? Number(e.target.value) : "")}
        >
          <MenuItem value="">All</MenuItem>
          {[1, 2, 3, 4, 5].map((r) => (
            <MenuItem key={r} value={r}>
              ⭐ {r}+
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label="Status"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <MenuItem value="all">All</MenuItem>
          <MenuItem value="available">Available</MenuItem>
          <MenuItem value="busy">Busy</MenuItem>
          <MenuItem value="offline">Offline</MenuItem>
        </TextField>
      </Stack>

      {loading ? (
        <CircularProgress />
      ) : (
        <GoogleMap mapContainerStyle={mapContainerStyle} center={center} zoom={11}>
          {filteredTherapists.map((t) => (
            <Marker
              key={t.id}
              position={t.currentLocation!}
              icon={markerColor(t.computedStatus!)}
              onClick={() => setSelected(t)}
            />
          ))}

          {selected && (
            <InfoWindow
              position={selected.currentLocation}
              onCloseClick={() => setSelected(null)}
            >
              <Box>
                <Typography fontWeight="bold">{selected.name}</Typography>
                <Typography>⭐ {selected.rating ?? "N/A"}</Typography>
                <Typography>📋 Bookings: {selected.totalBookings ?? 0}</Typography>
                <Typography>🔵 Status: {selected.statusOverride || getAutoStatus(selected)}</Typography>
                <Button
                  size="small"
                  variant="contained"
                  sx={{ mt: 1 }}
                  onClick={() => navigate(`/admin/therapists/${selected.id}`)}
                >
                  Edit
                </Button>
              </Box>
            </InfoWindow>
          )}
        </GoogleMap>
      )}
    </Box>
  );
};

export default TherapistLocationMap;