// src/pages/admin/AdminReportPage.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Button,
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
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import { db } from "@/lib/firebase";
import {
  collection,
  updateDoc,
  doc,
  query,
  where,
  Timestamp,
  onSnapshot,
  orderBy,
} from "firebase/firestore";
import dayjs, { Dayjs } from "dayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import * as XLSX from "xlsx";

type FBTimestamp =
  | Timestamp
  | { seconds: number; nanoseconds?: number }
  | undefined;

interface Booking {
  id: string;
  therapistId?: string;
  therapistName?: string;
  serviceName?: string;
  servicePrice?: number;
  taxiFee?: number;
  totalPrice?: number;
  paid?: boolean;
  status?: string;
  createdAt?: FBTimestamp | Date | string | null;
  address?: string;
  note?: string;
}

function toDateSafe(v: Booking["createdAt"]): Date | null {
  try {
    if (!v) return null;
    if (typeof (v as any)?.toDate === "function")
      return (v as Timestamp).toDate();
    if (typeof (v as any)?.seconds === "number")
      return new Date((v as any).seconds * 1000);
    if (typeof v === "string") return new Date(v);
    if (v instanceof Date) return v;
    return null;
  } catch {
    return null;
  }
}

type TherapistRow = {
  therapistKey: string;
  therapistName: string;

  // Jobs
  jobs: number; // completed only
  allJobs: number; // all including cancelled
  cancelCount: number;

  // Amounts (completed)
  serviceSum: number;
  taxiSum: number;
  totalSum: number;
  shopShare: number;
  workerShare: number;

  // Amounts (cancelled)
  cancelServiceSum: number;
  cancelTaxiSum: number;
  cancelTotalSum: number;
};

const AdminReportPage: React.FC = () => {
  const [startDate, setStartDate] = useState<Dayjs | null>(
    dayjs().startOf("month")
  );
  const [endDate, setEndDate] = useState<Dayjs | null>(
    dayjs().endOf("month")
  );
  const [filtered, setFiltered] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterTherapist, setFilterTherapist] = useState("all");
  const [previewRow, setPreviewRow] = useState<TherapistRow | null>(null);
  const reportRef = useRef<HTMLDivElement>(null);
  const theme = useTheme();

  const range = useMemo(() => {
    if (!startDate || !endDate) return null;
    const s = Timestamp.fromDate(startDate.startOf("day").toDate());
    const e = Timestamp.fromDate(endDate.endOf("day").toDate());
    return { s, e };
  }, [startDate, endDate]);

  useEffect(() => {
    setLoading(true);
    const col = collection(db, "bookings");

    const qRef = range
      ? query(
          col,
          where("createdAt", ">=", range.s),
          where("createdAt", "<=", range.e),
          orderBy("createdAt", "asc")
        )
      : query(col, orderBy("createdAt", "asc"));

    const unsub = onSnapshot(
      qRef,
      (snap) => {
        const data = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as Booking[];
        setFiltered(data);
        setLoading(false);
      },
      () => setLoading(false)
    );

    return () => unsub();
  }, [range]);

  // ===== CRUD helpers =====
  const updateBooking = async (id: string, patch: Partial<Booking>) =>
    updateDoc(doc(db, "bookings", id), patch as any);

  const setStatus = (id: string, status: string) =>
    updateBooking(id, { status });
  const togglePaid = (id: string, cur: boolean) =>
    updateBooking(id, { paid: !cur });
  const setNote = (id: string, note: string) =>
    updateBooking(id, { note });
  const setTherapistName = (id: string, therapistName: string) =>
    updateBooking(id, { therapistName });
  const setServiceName = (id: string, serviceName: string) =>
    updateBooking(id, { serviceName });
  const setAddress = (id: string, address: string) =>
    updateBooking(id, { address });

  const setServicePrice = (b: Booking, v: string) => {
    const servicePrice = Number(v) || 0;
    updateBooking(b.id, {
      servicePrice,
      totalPrice: servicePrice + (b.taxiFee || 0),
    });
  };

  const setTaxiFee = (b: Booking, v: string) => {
    const taxiFee = Number(v) || 0;
    updateBooking(b.id, {
      taxiFee,
      totalPrice: taxiFee + (b.servicePrice || 0),
    });
  };

  const setTotalPrice = (id: string, v: string) =>
    updateBooking(id, { totalPrice: Number(v) || 0 });

  // ===== Summary per therapist =====
  const therapistRowsAll = useMemo<TherapistRow[]>(() => {
    const map = new Map<string, TherapistRow>();

    for (const b of filtered) {
      if (filterTherapist !== "all" && b.therapistName !== filterTherapist)
        continue;

      const key = b.therapistId || b.therapistName || "Unknown";
      const name = b.therapistName || "Unknown";

      if (!map.has(key)) {
        map.set(key, {
          therapistKey: key,
          therapistName: name,
          jobs: 0,
          allJobs: 0,
          cancelCount: 0,
          serviceSum: 0,
          taxiSum: 0,
          totalSum: 0,
          shopShare: 0,
          workerShare: 0,
          cancelServiceSum: 0,
          cancelTaxiSum: 0,
          cancelTotalSum: 0,
        });
      }

      const row = map.get(key)!;
      row.allJobs += 1;

      const service = b.servicePrice || 0;
      const taxi = b.taxiFee || 0;
      const total = b.totalPrice ?? service + taxi;

      // 👉 Cancelled booking: count + sum separately
      if (b.status === "cancelled") {
        row.cancelCount += 1;
        row.cancelServiceSum += service;
        row.cancelTaxiSum += taxi;
        row.cancelTotalSum += total;
        continue; // do not include in completed jobs
      }

      // Completed / other active jobs
      row.jobs += 1;
      row.serviceSum += service;
      row.taxiSum += taxi;
      row.totalSum += total;

      row.shopShare = row.serviceSum * 0.4;
      row.workerShare = row.serviceSum * 0.6;
    }

    return Array.from(map.values()).sort(
      (a, b) => b.serviceSum - a.serviceSum
    );
  }, [filtered, filterTherapist]);

  const totalServicePrice = therapistRowsAll.reduce(
    (s, r) => s + r.serviceSum,
    0
  );
  const taxiTotal = therapistRowsAll.reduce((s, r) => s + r.taxiSum, 0);
  const shopShare = totalServicePrice * 0.4;
  const workerShare = totalServicePrice * 0.6;

  const totalCancelledAmount = therapistRowsAll.reduce(
    (s, r) => s + r.cancelTotalSum,
    0
  );

  // ===== Export (per therapist) =====
  const handleExportBill = (row: TherapistRow) => {
    const rows = filtered
      .filter(
        (b) =>
          (b.therapistId || b.therapistName || "Unknown") ===
          row.therapistKey
      )
      .map((b) => ({
        Date: dayjs(toDateSafe(b.createdAt) || new Date()).format(
          "YYYY-MM-DD HH:mm"
        ),
        Status: b.status,
        Service: b.serviceName,
        ServicePrice: b.servicePrice,
        TaxiFee: b.taxiFee,
        TotalPrice: b.totalPrice,
      }));

    const summary = {
      AllJobs: row.allJobs,
      CompletedJobs: row.jobs,
      CancelledJobs: row.cancelCount,
      CancelledAmount: row.cancelTotalSum,
      ServiceSum: row.serviceSum,
      TaxiSum: row.taxiSum,
      TotalSum: row.totalSum,
      Worker60: row.workerShare,
      Shop40: row.shopShare,
    };

    const ws = XLSX.utils.json_to_sheet([...rows, {}, summary]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, row.therapistName);
    XLSX.writeFile(wb, `bill_${row.therapistName}.xlsx`);
  };

  // ===== Export (all) =====
  const handleExportAll = () => {
    const wb = XLSX.utils.book_new();

    // Summary sheet
    const summarySheet = XLSX.utils.json_to_sheet([
      {
        Shop40: shopShare,
        Worker60: workerShare,
        Taxi: taxiTotal,
        TotalService: totalServicePrice,
        CancelledAmount: totalCancelledAmount,
      },
    ]);
    XLSX.utils.book_append_sheet(wb, summarySheet, "Summary");

    // Each therapist
    therapistRowsAll.forEach((r) => {
      const rows = filtered
        .filter(
          (b) =>
            (b.therapistId || b.therapistName || "Unknown") ===
            r.therapistKey
        )
        .map((b) => ({
          Date: dayjs(toDateSafe(b.createdAt) || new Date()).format(
            "YYYY-MM-DD HH:mm"
          ),
          Status: b.status,
          Service: b.serviceName,
          ServicePrice: b.servicePrice,
          TaxiFee: b.taxiFee,
          TotalPrice: b.totalPrice,
        }));

      const summary = {
        AllJobs: r.allJobs,
        CompletedJobs: r.jobs,
        CancelledJobs: r.cancelCount,
        CancelledAmount: r.cancelTotalSum,
        ServiceSum: r.serviceSum,
        TaxiSum: r.taxiSum,
        TotalSum: r.totalSum,
        Worker60: r.workerShare,
        Shop40: r.shopShare,
      };

      const ws = XLSX.utils.json_to_sheet([...rows, {}, summary]);
      XLSX.utils.book_append_sheet(wb, ws, r.therapistName);
    });

    XLSX.writeFile(
      wb,
      `monthly_report_${dayjs(startDate).format("YYYYMM")}.xlsx`
    );
  };

  return (
    <Box p={3}>
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        📊 Admin Report
      </Typography>

      {/* Filter */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid size={{ xs: 6, sm: 3 }}>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DatePicker
                label="Start Date"
                value={startDate}
                onChange={(v) => setStartDate(v)}
              />
            </LocalizationProvider>
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DatePicker
                label="End Date"
                value={endDate}
                onChange={(v) => setEndDate(v)}
              />
            </LocalizationProvider>
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <Select
              size="small"
              value={filterTherapist}
              onChange={(e) => setFilterTherapist(e.target.value)}
              fullWidth
            >
              <MenuItem value="all">All Therapists</MenuItem>
              {Array.from(
                new Set(
                  filtered.map((b) => b.therapistName || "Unknown")
                )
              ).map((name) => (
                <MenuItem key={name} value={name}>
                  {name}
                </MenuItem>
              ))}
            </Select>
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <Button
              variant="contained"
              onClick={handleExportAll}
              fullWidth
            >
              ⬇ Download All
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Summary cards */}
      <Box
        display="grid"
        gridTemplateColumns="repeat(auto-fit,minmax(200px,1fr))"
        gap={2}
        mb={3}
      >
        {[
          { label: "🏪 Shop (40%)", value: shopShare },
          { label: "💃 Worker (60%)", value: workerShare },
          { label: "🚖 Taxi", value: taxiTotal },
          { label: "💰 Total Service", value: totalServicePrice },
          {
            label: "❌ Cancelled Amount",
            value: totalCancelledAmount,
          },
        ].map((c) => (
          <Paper
            key={c.label}
            sx={{ p: 2, borderRadius: 2, textAlign: "center" }}
          >
            <Typography fontWeight="bold">{c.label}</Typography>
            <Typography variant="h5">
              {c.value.toLocaleString()}฿
            </Typography>
          </Paper>
        ))}
      </Box>

      {/* Breakdown per therapist */}
      <TableContainer component={Paper} sx={{ borderRadius: 3, mb: 3 }}>
        <Table>
          <TableHead>
            <TableRow>
              {[
                "Therapist",
                "All Jobs",
                "Done Jobs",
                "Cancelled",
                "Cancel ฿",
                "Service",
                "Taxi",
                "Total",
                "Worker 60%",
                "Shop 40%",
                "Export",
              ].map((h) => (
                <TableCell key={h} align="center">
                  {h}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {therapistRowsAll.map((r) => (
              <TableRow key={r.therapistKey}>
                <TableCell align="center">{r.therapistName}</TableCell>
                <TableCell align="center">{r.allJobs}</TableCell>
                <TableCell align="center">{r.jobs}</TableCell>
                <TableCell align="center">{r.cancelCount}</TableCell>
                <TableCell align="center">
                  {r.cancelTotalSum.toLocaleString()}
                </TableCell>
                <TableCell align="center">
                  {r.serviceSum.toLocaleString()}
                </TableCell>
                <TableCell align="center">
                  {r.taxiSum.toLocaleString()}
                </TableCell>
                <TableCell align="center">
                  {r.totalSum.toLocaleString()}
                </TableCell>
                <TableCell align="center">
                  {r.workerShare.toLocaleString()}
                </TableCell>
                <TableCell align="center">
                  {r.shopShare.toLocaleString()}
                </TableCell>
                <TableCell align="center">
                  <Button
                    size="small"
                    onClick={() => setPreviewRow(r)}
                  >
                    🛎️ Preview
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* All bookings list */}
      <Typography variant="h6" fontWeight="bold" gutterBottom>
        📄 All list
      </Typography>
      <TableContainer
        ref={reportRef}
        component={Paper}
        sx={{ borderRadius: 3, overflowX: "auto" }}
      >
        <Table>
          <TableHead
            sx={{
              backgroundColor:
                theme.palette.mode === "dark" ? "#333" : "#f5f5f5",
              "& .MuiTableCell-root": { fontWeight: "bold" },
            }}
          >
            <TableRow>
              {[
                "Date",
                "ID",
                "Therapist",
                "Service",
                "Address",
                "Note",
                "Status",
                "Payment",
                "Service ฿",
                "Taxi ฿",
                "Total ฿",
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
              filtered.map((b) => {
                if (
                  filterTherapist !== "all" &&
                  b.therapistName !== filterTherapist
                )
                  return null;
                const created =
                  toDateSafe(b.createdAt) || new Date();
                return (
                  <TableRow key={b.id}>
                    <TableCell align="center">
                      {dayjs(created).format("YYYY-MM-DD HH:mm")}
                    </TableCell>
                    <TableCell align="center">
                      {b.id.slice(0, 6)}…
                    </TableCell>
                    <TableCell align="center">
                      <TextField
                        size="small"
                        defaultValue={b.therapistName}
                        onBlur={(e) =>
                          setTherapistName(b.id, e.target.value)
                        }
                      />
                    </TableCell>
                    <TableCell align="center">
                      <TextField
                        size="small"
                        defaultValue={b.serviceName}
                        onBlur={(e) =>
                          setServiceName(b.id, e.target.value)
                        }
                      />
                    </TableCell>
                    <TableCell align="center">
                      <TextField
                        size="small"
                        defaultValue={b.address}
                        onBlur={(e) =>
                          setAddress(b.id, e.target.value)
                        }
                      />
                    </TableCell>
                    <TableCell align="center">
                      <TextField
                        size="small"
                        defaultValue={b.note}
                        onBlur={(e) =>
                          setNote(b.id, e.target.value)
                        }
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Select
                        size="small"
                        value={b.status || "pending"}
                        onChange={(e) =>
                          setStatus(b.id, e.target.value)
                        }
                      >
                        <MenuItem value="pending">Pending</MenuItem>
                        <MenuItem value="confirmed">
                          Confirmed
                        </MenuItem>
                        <MenuItem value="completed">
                          Completed
                        </MenuItem>
                        <MenuItem value="cancelled">
                          Cancelled
                        </MenuItem>
                      </Select>
                    </TableCell>
                    <TableCell align="center">
                      <IconButton
                        size="small"
                        onClick={() =>
                          togglePaid(b.id, !!b.paid)
                        }
                      >
                        {b.paid ? (
                          <DoneAllIcon color="success" />
                        ) : (
                          <CheckCircleIcon />
                        )}
                      </IconButton>
                    </TableCell>
                    <TableCell align="center">
                      <TextField
                        size="small"
                        type="number"
                        defaultValue={b.servicePrice}
                        onBlur={(e) =>
                          setServicePrice(b, e.target.value)
                        }
                      />
                    </TableCell>
                    <TableCell align="center">
                      <TextField
                        size="small"
                        type="number"
                        defaultValue={b.taxiFee}
                        onBlur={(e) =>
                          setTaxiFee(b, e.target.value)
                        }
                      />
                    </TableCell>
                    <TableCell align="center">
                      <TextField
                        size="small"
                        type="number"
                        defaultValue={b.totalPrice}
                        onBlur={(e) =>
                          setTotalPrice(b.id, e.target.value)
                        }
                      />
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Preview Modal */}
      <Dialog
        open={!!previewRow}
        onClose={() => setPreviewRow(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          📑 Bill — {previewRow?.therapistName}
        </DialogTitle>
        <DialogContent>
          {previewRow && (
            <Box>
              <Typography mb={1}>
                🗓{" "}
                {dayjs(startDate).format("DD/MM/YYYY")} ➜{" "}
                {dayjs(endDate).format("DD/MM/YYYY")}
              </Typography>

              <Typography>All Jobs: {previewRow.allJobs}</Typography>
              <Typography>
                ✅ Completed: {previewRow.jobs}
              </Typography>

              {previewRow.cancelCount > 0 && (
                <>
                  <Typography color="error">
                    ❌ Cancelled: {previewRow.cancelCount}
                  </Typography>
                  <Typography color="error">
                    Cancelled Amount:{" "}
                    {previewRow.cancelTotalSum.toLocaleString()}
                    ฿
                  </Typography>
                </>
              )}

              <Typography mt={1}>
                Service Total:{" "}
                {previewRow.serviceSum.toLocaleString()}฿
              </Typography>
              <Typography>
                Taxi Total: {previewRow.taxiSum.toLocaleString()}฿
              </Typography>
              <Typography>
                Worker (60%):{" "}
                {previewRow.workerShare.toLocaleString()}฿
              </Typography>
              <Typography color="#093604" fontWeight="bold">
                Shop (40%):{" "}
                {previewRow.shopShare.toLocaleString()}฿
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewRow(null)}>CLOSE</Button>
          <Button
            variant="contained"
            onClick={() => {
              if (previewRow) handleExportBill(previewRow);
              setPreviewRow(null);
            }}
          >
            ⬇ DOWNLOAD EXCEL
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminReportPage;