// src/pages/admin/AdminTherapistsPage.tsx
import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Chip,
  CircularProgress,
  Avatar,
  Stack,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
} from "@mui/material";
import { collection, getDocs, doc, deleteDoc, updateDoc } from "firebase/firestore";
import { db } from "@/firebase";
import { useNavigate } from "react-router-dom";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import TherapistBookingChart from "@/components/admin/TherapistBookingChart";

interface Therapist {
  id: string;
  name: string;
  image?: string;
  specialty: string;
  status: "available" | "bookable" | "resting";
  statusOverride?: "available" | "bookable" | "resting";
  rating: number;
  startTime?: string;
  endTime?: string;
  servedCount?: number;
  totalBookings?: number; // ✅ เพิ่ม field นี้
}

const statusColor = (status: Therapist["status"]) => {
  switch (status) {
    case "available":
      return "success";
    case "bookable":
      return "warning";
    case "resting":
      return "default";
    default:
      return "default";
  }
};

const statusLabel = (status: Therapist["status"]) => {
  switch (status) {
    case "available":
      return "Available";
    case "bookable":
      return "Bookable";
    case "resting":
      return "Resting";
    default:
      return status || "-";
  }
};

const getComputedStatus = (t: any): Therapist["status"] => {
  if (t.statusOverride) return t.statusOverride;
  const now = new Date();
  const [startHour = 0, startMin = 0] = t.startTime?.split(":").map(Number) || [];
  const [endHour = 0, endMin = 0] = t.endTime?.split(":").map(Number) || [];
  const start = new Date(now);
  const end = new Date(now);
  start.setHours(startHour, startMin, 0);
  end.setHours(endHour, endMin, 0);
  if (end <= start) end.setDate(end.getDate() + 1);
  const inWorkingHours = now >= start && now <= end;
  return inWorkingHours ? (t.isBooked ? "bookable" : "available") : "resting";
};

const AdminTherapistsPage: React.FC = () => {
  const [therapists, setTherapists] = useState<Therapist[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [bookingChartData, setBookingChartData] = useState<{ name: string; bookings: number }[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchTherapists = async () => {
      setLoading(true);
      try {
        const snapshot = await getDocs(collection(db, "therapists"));
        const bookingSnap = await getDocs(collection(db, "bookings"));

        // ✅ นับจำนวน booking ของ therapist แต่ละคน
        const bookingMap: Record<string, number> = {};
        bookingSnap.forEach((doc) => {
          const { therapistId } = doc.data();
          if (therapistId) {
            bookingMap[therapistId] = (bookingMap[therapistId] || 0) + 1;
          }
        });

        // ✅ รวมข้อมูล therapist + totalBookings
        const data = snapshot.docs.map((doc) => {
          const t = doc.data();
          return {
            id: doc.id,
            ...t,
            totalBookings: bookingMap[doc.id] || 0,
            status: getComputedStatus(t),
          };
        }) as Therapist[];

        setTherapists(data);

        // ✅ ใช้ข้อมูล bookingMap ทำ chart ด้วย
        const chartData = data
          .map((t) => ({ name: t.name, bookings: t.totalBookings || 0 }))
          .sort((a, b) => b.bookings - a.bookings);

        setBookingChartData(chartData.slice(0, 10));
      } catch (error) {
        console.error("Failed to fetch therapists:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchTherapists();
  }, []);

  const handleDelete = async () => {
    if (deleteId) {
      await deleteDoc(doc(db, "therapists", deleteId));
      setTherapists((prev) => prev.filter((t) => t.id !== deleteId));
      setDeleteId(null);
    }
  };

  const filteredTherapists =
    statusFilter === "all" ? therapists : therapists.filter((t) => t.status === statusFilter);

  if (loading) {
    return (
      <Box p={3} textAlign="center">
        <CircularProgress />
        <Typography mt={2}>Loading therapists...</Typography>
      </Box>
    );
  }

  return (
    <Box p={{ xs: 2, md: 4 }}>
      <Typography variant="h5" fontWeight="bold" mb={3}>
    All Therapists
      </Typography>

      <Box display="flex" justifyContent="space-between" mb={2} flexWrap="wrap" gap={2}>
        <Button variant="contained" onClick={() => navigate("/admin/add-therapist")}>
          ➕ Add Therapist
        </Button>

        <FormControl sx={{ minWidth: 150 }}>
          <InputLabel>Status Filter</InputLabel>
          <Select
            value={statusFilter}
            label="Status Filter"
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <MenuItem value="all">All</MenuItem>
            <MenuItem value="available">Available</MenuItem>
            <MenuItem value="bookable">Bookable</MenuItem>
            <MenuItem value="resting">Resting</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <TableContainer component={Paper} sx={{ borderRadius: 3 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Override</TableCell>
              <TableCell>Working Hours</TableCell>
              <TableCell align="center">Total Bookings</TableCell>
              <TableCell align="right">Rating</TableCell>
              <TableCell align="center">Served</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredTherapists.map((t) => (
              <TableRow key={t.id}>
                              <TableCell>
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Box
                      sx={{
                        width: 50,
                        height: 50,
                        borderRadius: "50%",
                        overflow: "hidden",
                        bgcolor: "#f0f0f0",
                      }}
                    >
                      <img
                        src={t.image?.startsWith("/") ? t.image : `/images/${t.image}`}
                        alt={t.name}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          objectPosition: "center top",
                        }}
                      />
                    </Box>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {t.name}
                    </Typography>
                  </Stack>
                </TableCell>
                <TableCell>
                  <Chip label={statusLabel(t.status)} color={statusColor(t.status)} size="small" />
                </TableCell>
                <TableCell>
                  <Select
                    size="small"
                    value={t.statusOverride || ""}
                    onChange={async (e) => {
                      const newStatus = e.target.value || null;
                      await updateDoc(doc(db, "therapists", t.id), { statusOverride: newStatus });
                      setTherapists((prev) =>
                        prev.map((item) =>
                          item.id === t.id
                            ? {
                                ...item,
                                status: newStatus || getComputedStatus(item),
                                statusOverride: newStatus,
                              }
                            : item
                        )
                      );
                    }}
                    displayEmpty
                    sx={{ minWidth: 120 }}
                  >
                    <MenuItem value="">Auto</MenuItem>
                    <MenuItem value="available">Available</MenuItem>
                    <MenuItem value="bookable">Bookable</MenuItem>
                    <MenuItem value="resting">Resting</MenuItem>
                  </Select>
                </TableCell>
                <TableCell>
                  {t.startTime || "-"} - {t.endTime || "-"}
                </TableCell>
                <TableCell align="center">{t.totalBookings || 0}</TableCell>
                <TableCell align="right">{t.rating ? t.rating.toFixed(1) : "N/A"}</TableCell>
                <TableCell align="center">{t.servedCount || 0}</TableCell>
                <TableCell align="center">
                  <Stack direction="row" spacing={1} justifyContent="center">
                    <IconButton
                      color="primary"
                      onClick={() => navigate(`/admin/therapists/${t.id}`)}
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton color="error" onClick={() => setDeleteId(t.id)}>
                      <DeleteIcon />
                    </IconButton>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={!!deleteId} onClose={() => setDeleteId(null)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>Are you sure you want to delete this therapist?</DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteId(null)}>Cancel</Button>
          <Button onClick={handleDelete} color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <Box mt={4}>
        <Typography variant="h6" gutterBottom>
          📈 Top Therapist Bookings (Monthly)
        </Typography>
        <TherapistBookingChart data={bookingChartData} />
      </Box>
    </Box>
  );
};

export default AdminTherapistsPage;