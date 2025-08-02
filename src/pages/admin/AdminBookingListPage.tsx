import React, { useEffect, useState } from "react";
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
  useTheme,
} from "@mui/material";
import { db } from "@/firebase";
import { collection, onSnapshot, updateDoc, doc, Timestamp } from "firebase/firestore";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import SaveIcon from "@mui/icons-material/Save";
import { format } from "date-fns";

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

const AdminBookingListPage: React.FC = () => {
  const theme = useTheme(); // ✅ ใช้ theme เพื่อตรวจโหมดมืด/สว่าง
  const isDark = theme.palette.mode === "dark";

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [noteEdits, setNoteEdits] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "bookings"), (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Booking[];
      setBookings(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleStatusChange = async (id: string, newStatus: string) => {
    await updateDoc(doc(db, "bookings", id), { status: newStatus });
  };

  const handleTogglePayment = async (id: string, current: boolean) => {
    await updateDoc(doc(db, "bookings", id), { paid: !current });
  };

  const handleSaveNote = async (id: string) => {
    const note = noteEdits[id] ?? "";
    await updateDoc(doc(db, "bookings", id), { adminNote: note });
  };

  const handleExport = () => {
    const header =
      "ID,User,Therapist,Service,Date,Address,Detail,AdminNote,Status,Paid,ServicePrice,TaxiFee,TotalPrice\n";

    const csv = bookings
      .map((b) =>
        [
          b.id,
          b.userName || "-",
          b.therapistName,
          b.serviceName,
          format(b.createdAt.toDate(), "yyyy-MM-dd HH:mm"),
          `"${b.address || ""}"`,
          `"${b.placeDetail || ""}"`,
          `"${b.adminNote || ""}"`,
          b.status,
          b.paid ? "Paid" : "Unpaid",
          b.servicePrice ?? 0,
          b.taxiFee ?? 0,
          b.totalPrice ?? 0,
        ].join(",")
      )
      .join("\n");

    const blob = new Blob([header + csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `booking-report-${new Date().toISOString()}.csv`;
    link.click();
  };

  return (
    <Box p={3}>
      <Typography variant="h5" fontWeight="bold" mb={2}>
        📋 Booking Management
      </Typography>

      <Button
        startIcon={<FileDownloadIcon />}
        onClick={handleExport}
        sx={{ mb: 2 }}
        variant="contained"
      >
        Export CSV
      </Button>

      <Paper sx={{ borderRadius: 3, overflow: "hidden" }}>
        {loading ? (
          <Box textAlign="center" p={3}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer>
            <Table>
              {/* ✅ หัวตารางปรับตามธีม */}
              <TableHead
                sx={{
                  backgroundColor: isDark ? "#111" : "#f5f5f5",
                }}
              >
                <TableRow>
                  {[
                    "ID",
                    "User",
                    "Therapist",
                    "Service",
                    "Date",
                    "Address",
                    "Detail",
                    "Note (Admin)",
                    "Status",
                    "Payment",
                    "Service Price",
                    "Taxi Fee",
                    "Total Price",
                  ].map((head) => (
                    <TableCell
                      key={head}
                      sx={{
                        color: isDark ? "#fff" : "#000",
                        fontWeight: "bold",
                      }}
                    >
                      {head}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>

              <TableBody>
                {bookings.map((b, index) => {
                  const rowDark = isDark ? index % 2 === 0 : index % 2 !== 0;

                  return (
                    <TableRow
                      key={b.id}
                      sx={{
                        backgroundColor: rowDark
                          ? isDark
                            ? "#222"
                            : "#f9f9f9"
                          : "transparent",
                        "& td": { color: isDark ? "#fff" : "#000" },
                      }}
                    >
                      <TableCell>{b.id.slice(0, 6)}...</TableCell>
                      <TableCell>{b.userName || "-"}</TableCell>
                      <TableCell>{b.therapistName}</TableCell>
                      <TableCell>{b.serviceName}</TableCell>
                      <TableCell>
                        {format(b.createdAt.toDate(), "yyyy-MM-dd HH:mm")}
                      </TableCell>
                      <TableCell>{b.address || "-"}</TableCell>
                      <TableCell>{b.placeDetail || "-"}</TableCell>

                      <TableCell>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <TextField
                            size="small"
                            variant="outlined"
                            value={noteEdits[b.id] ?? b.adminNote ?? ""}
                            onChange={(e) =>
                              setNoteEdits((prev) => ({
                                ...prev,
                                [b.id]: e.target.value,
                              }))
                            }
                            sx={{
                              width: 140,
                              "& .MuiOutlinedInput-input": {
                                color: isDark ? "#fff" : "#000",
                              },
                            }}
                          />
                          <IconButton
                            color="primary"
                            onClick={() => handleSaveNote(b.id)}
                          >
                            <SaveIcon />
                          </IconButton>
                        </Box>
                      </TableCell>

                      <TableCell>
                        <Select
                          size="small"
                          value={b.status}
                          onChange={(e) => handleStatusChange(b.id, e.target.value)}
                          sx={{
                            color: isDark ? "#fff" : "#000",
                            "& .MuiSelect-icon": { color: isDark ? "#fff" : "#000" },
                          }}
                        >
                          <MenuItem value="pending">Pending</MenuItem>
                          <MenuItem value="confirmed">Confirmed</MenuItem>
                          <MenuItem value="completed">Completed</MenuItem>
                          <MenuItem value="cancelled">Cancelled</MenuItem>
                        </Select>
                      </TableCell>

                      <TableCell>
                        <IconButton
                          color={b.paid ? "success" : "default"}
                          onClick={() => handleTogglePayment(b.id, b.paid)}
                        >
                          {b.paid ? <DoneAllIcon /> : <CheckCircleIcon />}
                        </IconButton>
                      </TableCell>

                      <TableCell>{b.servicePrice ?? 0}฿</TableCell>
                      <TableCell>{b.taxiFee ?? 0}฿</TableCell>
                      <TableCell>{b.totalPrice ?? 0}฿</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </Box>
  );
};

export default AdminBookingListPage;