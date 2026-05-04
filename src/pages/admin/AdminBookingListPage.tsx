// src/pages/admin/AdminBookingListPage.tsx
import React, { useEffect, useState, useMemo } from "react";
import {
  Box,
  Typography,
  Paper,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Button,
  IconButton,
  MenuItem,
  Select,
  CircularProgress,
  TableContainer,
  TextField,
  Chip,
  Stack,
} from "@mui/material";
import { db } from "@/lib/firebase";
import {
  collection,
  onSnapshot,
  updateDoc,
  doc,
  Timestamp,
  query,
  orderBy,
} from "firebase/firestore";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import SaveIcon from "@mui/icons-material/Save";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { format } from "date-fns";
import { ExportToExcel } from "@/utils/exportTools";
// 🆕 Round 28b16 — central catalog lookup so renaming a service in
//   data/services.ts auto-updates the admin booking table too.
import { getServiceLabel } from "@/utils/serviceCatalog";

interface Booking {
  id: string;
  userName?: string;
  therapistName: string;
  serviceName: string;
  servicePrice?: number;
  taxiFee?: number;
  totalPrice?: number;
  createdAt: Timestamp;
  status: string;
  paid: boolean;
  address?: string;
  placeDetail?: string;
  adminNote?: string;
}

type ChipColor = "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning";

const statusColors: Record<string, ChipColor> = {
  pending: "warning",
  confirmed: "info",
  completed: "success",
  cancelled: "error",
};

const paymentColors: Record<string, ChipColor> = {
  paid: "success",
  unpaid: "default",
};

const AdminBookingListPage: React.FC = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [noteEdits, setNoteEdits] = useState<Record<string, string>>({});
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [search, setSearch] = useState("");

  // ============================
  // 🔥 1) LOAD REALTIME BOOKINGS
  // ============================
  useEffect(() => {
    const q = query(collection(db, "bookings"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Booking[];
      setBookings(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // ============================
  // 🔍 2) ADVANCED FILTERING
  // ============================
  const filtered = useMemo(() => {
    return bookings.filter((b) => {
      const matchStatus = statusFilter === "all" || b.status === statusFilter;
      const matchPayment =
        paymentFilter === "all" ||
        (paymentFilter === "paid" && b.paid) ||
        (paymentFilter === "unpaid" && !b.paid);

      const matchSearch = [
        b.userName,
        b.therapistName,
        b.serviceName,
        b.address,
        b.placeDetail,
      ]
        .join(" ")
        .toLowerCase()
        .includes(search.toLowerCase());

      return matchStatus && matchPayment && matchSearch;
    });
  }, [bookings, statusFilter, paymentFilter, search]);

  // ============================
  // 💾 UPDATE FUNCTIONS
  // ============================
  const updateStatus = async (id: string, newStatus: string) => {
    await updateDoc(doc(db, "bookings", id), { status: newStatus });
  };

  const togglePayment = async (id: string, current: boolean) => {
    await updateDoc(doc(db, "bookings", id), { paid: !current });
  };

  const saveNote = async (id: string) => {
    const note = noteEdits[id] ?? "";
    await updateDoc(doc(db, "bookings", id), { adminNote: note });
  };

  // ============================
  // 🧾 EXPORT XLSX
  // ============================
  const exportExcel = async () => {
    const rows = filtered.map((b) => ({
      ID: b.id,
      User: b.userName || "-",
      Therapist: b.therapistName,
      Service: b.serviceName,
      Date: format(b.createdAt.toDate(), "yyyy-MM-dd HH:mm"),
      Address: b.address || "",
      Detail: b.placeDetail || "",
      Status: b.status,
      Payment: b.paid ? "Paid" : "Unpaid",
      ServicePrice: b.servicePrice || 0,
      TaxiFee: b.taxiFee || 0,
      Total: b.totalPrice || 0,
      Note: b.adminNote || "",
    }));

    await ExportToExcel(rows, `booking-report-${Date.now()}.xlsx`);
  };

  return (
    <Box p={10}>
      <Typography variant="h5" fontWeight="bold" mb={3}>
        📋 Booking Management
      </Typography>

      {/* ===================== FILTER BAR ===================== */}
      <Stack direction="row" spacing={2} mb={2} flexWrap="wrap">
        <TextField
          label="Search…"
          size="small"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <Select
          size="small"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <MenuItem value="all">All Status</MenuItem>
          <MenuItem value="pending">Pending</MenuItem>
          <MenuItem value="confirmed">Confirmed</MenuItem>
          <MenuItem value="completed">Completed</MenuItem>
          <MenuItem value="cancelled">Cancelled</MenuItem>
        </Select>

        <Select
          size="small"
          value={paymentFilter}
          onChange={(e) => setPaymentFilter(e.target.value)}
        >
          <MenuItem value="all">All Payments</MenuItem>
          <MenuItem value="paid">Paid</MenuItem>
          <MenuItem value="unpaid">Unpaid</MenuItem>
        </Select>

        <Button variant="contained" startIcon={<FileDownloadIcon />} onClick={exportExcel}>
          Export XLSX
        </Button>
      </Stack>

      {/* ===================== TABLE ===================== */}
      <Paper sx={{ borderRadius: 3, overflow: "hidden" }}>
        {loading ? (
          <Box textAlign="center" p={3}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer sx={{ maxHeight: "75vh" }}>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  {[
                    "ID",
                    "User",
                    "Therapist",
                    "Service",
                    "Date",
                    "Status",
                    "Payment",
                    "Address",
                    "Note",
                    "Service",
                    "Taxi",
                    "Total",
                    "Save",
                  ].map((h) => (
                    <TableCell key={h} sx={{ fontWeight: "bold" }}>
                      {h}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>

              <TableBody>
                {filtered.map((b) => (
                  <TableRow
                    key={b.id}
                    hover
                    sx={{ "&:hover": { backgroundColor: "#fff6f6" } }}
                  >
                    <TableCell>{b.id.slice(0, 6)}...</TableCell>
                    <TableCell>{b.userName || "-"}</TableCell>
                    <TableCell>{b.therapistName}</TableCell>
                    <TableCell>
                      {getServiceLabel(
                        (b as unknown as { serviceId?: string }).serviceId,
                        b.serviceName
                      )}
                    </TableCell>

                    <TableCell>
                      {format(b.createdAt.toDate(), "yyyy-MM-dd HH:mm")}
                    </TableCell>

                    <TableCell>
                      <Chip
                        size="small"
                        label={b.status}
                        color={statusColors[b.status]}
                        sx={{ textTransform: "capitalize", fontWeight: "bold" }}
                        onClick={(e) => {
                          e.stopPropagation();
                          const next =
                            b.status === "pending"
                              ? "confirmed"
                              : b.status === "confirmed"
                              ? "completed"
                              : "pending";
                          void updateStatus(b.id, next);
                        }}
                      />
                    </TableCell>

                    <TableCell>
                      <Chip
                        size="small"
                        label={b.paid ? "Paid" : "Unpaid"}
                        color={paymentColors[b.paid ? "paid" : "unpaid"]}
                        onClick={() => togglePayment(b.id, b.paid)}
                      />
                    </TableCell>

                    <TableCell>{b.address || "-"}</TableCell>

                    <TableCell>
                      <TextField
                        size="small"
                        value={noteEdits[b.id] ?? b.adminNote ?? ""}
                        onChange={(e) =>
                          setNoteEdits((prev) => ({
                            ...prev,
                            [b.id]: e.target.value,
                          }))
                        }
                        sx={{ width: 140 }}
                      />
                    </TableCell>

                    <TableCell>{b.servicePrice || 0}฿</TableCell>
                    <TableCell>{b.taxiFee || 0}฿</TableCell>
                    <TableCell>{b.totalPrice || 0}฿</TableCell>

                    <TableCell>
                      <IconButton onClick={() => saveNote(b.id)} color="primary">
                        <SaveIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </Box>
  );
};

export default AdminBookingListPage;