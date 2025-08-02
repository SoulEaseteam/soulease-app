import React, { useEffect, useRef, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Button,
  Grid,
  TextField,
  IconButton,
  MenuItem,
  Select,
  CircularProgress,
  useTheme,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
} from "@mui/material";
import { db } from "@/firebase";
import { collection, getDocs, updateDoc, doc } from "firebase/firestore";
import dayjs, { Dayjs } from "dayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import DownloadIcon from "@mui/icons-material/Download";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import Papa from "papaparse";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import * as XLSX from "xlsx";

interface Booking {
  id: string;
  therapistName: string;
  serviceName: string;
  servicePrice?: number;
  taxiFee?: number;
  totalPrice?: number;
  paid?: boolean;
  status?: string;
  createdAt?: any;
  address?: string;
  note?: string;
}

const AdminReportPage: React.FC = () => {
  const [startDate, setStartDate] = useState<Dayjs | null>(dayjs().startOf("month"));
  const [endDate, setEndDate] = useState<Dayjs | null>(dayjs().endOf("month"));
  const [filtered, setFiltered] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const reportRef = useRef<HTMLDivElement>(null);
  const theme = useTheme();

  const fetchData = async () => {
    setLoading(true);
    const snap = await getDocs(collection(db, "bookings"));
    const data = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Booking[];
    setFiltered(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleFilterByDateRange = async () => {
    setLoading(true);
    const start = startDate?.startOf("day").toDate();
    const end = endDate?.endOf("day").toDate();

    const snap = await getDocs(collection(db, "bookings"));
    const data = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((b: any) => {
        const created =
          b.createdAt?.toDate?.() ||
          (b.createdAt?.seconds && new Date(b.createdAt.seconds * 1000));
        return created && created >= start && created <= end;
      }) as Booking[];

    setFiltered(data);
    setLoading(false);
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    await updateDoc(doc(db, "bookings", id), { status: newStatus });
    fetchData();
  };

  const handleTogglePayment = async (id: string, current: boolean) => {
    await updateDoc(doc(db, "bookings", id), { paid: !current });
    fetchData();
  };

  const handleNoteChange = async (id: string, newNote: string) => {
    await updateDoc(doc(db, "bookings", id), { note: newNote });
    fetchData();
  };

  // คำนวณยอดรวม
  const totalServicePrice = filtered.reduce((s, b) => s + (b.servicePrice || 0), 0);
  const taxiTotal = filtered.reduce((s, b) => s + (b.taxiFee || 0), 0);
  const shopShare = totalServicePrice * 0.4;
  const workerShare = totalServicePrice * 0.6;
  const getTotalByStatus = (status: string) =>
    filtered
      .filter((b) => b.status === status)
      .reduce((acc, b) => acc + (b.totalPrice || 0), 0);

  // Export CSV
  const handleExportCSV = () => {
    const csv = Papa.unparse(filtered);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", "report.csv");
    link.click();
  };

  const handleExportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(filtered);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Bookings");
    XLSX.writeFile(wb, "bookings_report.xlsx");
  };

  const handleExportPDF = () => {
    if (reportRef.current) {
      html2canvas(reportRef.current).then((canvas) => {
        const pdf = new jsPDF();
        const img = canvas.toDataURL("image/png");
        const width = pdf.internal.pageSize.getWidth();
        const height = (canvas.height * width) / canvas.width;
        pdf.addImage(img, "PNG", 0, 0, width, height);
        pdf.save("report.pdf");
      });
    }
  };

  return (
    <Box p={3}>
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        📊 Admin Report
      </Typography>

      {/* Filter */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={3}>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DatePicker label="Start Date" value={startDate} onChange={(v) => setStartDate(v)} />
            </LocalizationProvider>
          </Grid>
          <Grid item xs={12} sm={3}>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DatePicker label="End Date" value={endDate} onChange={(v) => setEndDate(v)} />
            </LocalizationProvider>
          </Grid>
          <Grid item xs={12} sm={6} display="flex" gap={1} flexWrap="wrap">
            <Button variant="contained" onClick={handleFilterByDateRange}>
              REFRESH
            </Button>
            <Button variant="outlined" startIcon={<DownloadIcon />} onClick={handleExportCSV}>
              EXPORT CSV
            </Button>
            <Button variant="outlined" startIcon={<DownloadIcon />} onClick={handleExportExcel}>
              EXPORT EXCEL
            </Button>
            <Button variant="outlined" startIcon={<DownloadIcon />} onClick={handleExportPDF}>
              EXPORT PDF
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Summary */}
      <Box
        display="grid"
        gridTemplateColumns={{ xs: "1fr", sm: "1fr 1fr", md: "repeat(3, 1fr)" }}
        gap={2}
        mb={3}
      >
        {[
          { label: "🏪 Shop (40%)", value: shopShare, color: "#1abc9c" },
          { label: "💃 Worker (60%)", value: workerShare, color: "#3498db" },
          { label: "💰 Total Service Price", value: totalServicePrice, color: "#8e44ad" },
          { label: "🚖 Taxi", value: taxiTotal, color: "#f39c12" },
          { label: "✅ Completed", value: getTotalByStatus("completed"), color: "#2ecc71" },
          { label: "❌ Cancelled", value: getTotalByStatus("cancelled"), color: "#e74c3c" },
        ].map((c) => (
          <Paper
            key={c.label}
            sx={{
              p: 2,
              borderRadius: 2,
              background: c.color,
              color: "white",
              textAlign: "center",
            }}
          >
            <Typography fontWeight="bold">{c.label}</Typography>
            <Typography variant="h5" fontWeight="bold">฿{c.value.toFixed(2)}</Typography>
          </Paper>
        ))}
      </Box>

      {/* Table */}
      <TableContainer
        ref={reportRef}
        component={Paper}
        sx={{ borderRadius: 3, overflowX: "auto" }}
      >
        <Table>
          <TableHead
            sx={{
              backgroundColor: theme.palette.mode === "dark" ? "#333" : "#f5f5f5",
              "& .MuiTableCell-root": { fontWeight: "bold" },
            }}
          >
            <TableRow>
              {[
                "ID",
                "Therapist",
                "Service",
                "Date",
                "Address",
                "Note",
                "Status",
                "Payment",
                "Service Price",
                "Taxi Fee",
                "Total Price",
              ].map((h) => (
                <TableCell key={h} align="center">
                  {h}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>

          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={11} align="center">
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((b, i) => (
                <TableRow
                  key={b.id}
                  sx={{
                    backgroundColor:
                      theme.palette.mode === "dark"
                        ? i % 2 === 0
                          ? "#1e1e1e"
                          : "#2a2a2a"
                        : i % 2 === 0
                        ? "#fff"
                        : "#fafafa",
                  }}
                >
                  <TableCell align="center">{b.id.slice(0, 6)}...</TableCell>
                  <TableCell align="center">{b.therapistName}</TableCell>
                  <TableCell align="center">{b.serviceName}</TableCell>
                  <TableCell align="center">
                    {dayjs(b.createdAt?.toDate?.() || new Date()).format("YYYY-MM-DD HH:mm")}
                  </TableCell>
                  <TableCell align="center">{b.address || "-"}</TableCell>
                  <TableCell align="center">
                    <TextField
                      size="small"
                      defaultValue={b.note || ""}
                      onBlur={(e) => handleNoteChange(b.id, e.target.value)}
                      sx={{ width: 140 }}
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Select
                      size="small"
                      value={b.status || ""}
                      onChange={(e) => handleStatusChange(b.id, e.target.value)}
                      sx={{ minWidth: 120 }}
                    >
                      <MenuItem value="pending">Pending</MenuItem>
                      <MenuItem value="confirmed">Confirmed</MenuItem>
                      <MenuItem value="completed">Completed</MenuItem>
                      <MenuItem value="cancelled">Cancelled</MenuItem>
                    </Select>
                  </TableCell>
                  <TableCell align="center">
                    <IconButton
                      size="small"
                      color={b.paid ? "success" : "default"}
                      onClick={() => handleTogglePayment(b.id, b.paid || false)}
                    >
                      {b.paid ? <DoneAllIcon /> : <CheckCircleIcon />}
                    </IconButton>
                  </TableCell>
                  <TableCell align="center">{b.servicePrice}฿</TableCell>
                  <TableCell align="center">{b.taxiFee}฿</TableCell>
                  <TableCell align="center" sx={{ fontWeight: "bold" }}>
                    {b.totalPrice}฿
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default AdminReportPage;