// src/pages/admin/AdminDashboardPage.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Button,
  Divider,
  Grid,
  Stack,
  MenuItem,
  Select,
  CircularProgress,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { db } from "@/lib/firebase";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  where,
  getDocs,
} from "firebase/firestore";
import dayjs, { Dayjs } from "dayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";

import PrintIcon from "@mui/icons-material/Print";
import DescriptionIcon from "@mui/icons-material/Description";
import TableViewIcon from "@mui/icons-material/TableView";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import PublicIcon from "@mui/icons-material/Public";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";

import { ExportToExcel, ExportToPDF } from "@/utils/exportTools";
import QuickStatusToggle from "@/components/admin/QuickStatusToggle";

// ---------- helpers ----------
type FBTS =
  | Timestamp
  | { seconds: number; nanoseconds?: number }
  | Date
  | string
  | null
  | undefined;

function toDateSafe(v: FBTS): Date | null {
  try {
    if (!v) return null;
    // @ts-ignore
    if (typeof v?.toDate === "function") return (v as any).toDate();
    if (typeof (v as any)?.seconds === "number") {
      return new Date((v as any).seconds * 1000);
    }
    if (typeof v === "string") return new Date(v);
    if (v instanceof Date) return v;
    return null;
  } catch {
    return null;
  }
}

interface BookingRow {
  createdAt?: FBTS;
  status?: string;
  therapistId?: string;
  therapistName?: string;
  servicePrice?: number;
  taxiFee?: number;
  totalPrice?: number;
}

interface StatCardProps {
  title: string;
  value: number | string;
  subtext?: string;
  color: string;
}
const StatCard: React.FC<StatCardProps> = ({ title, value, subtext, color }) => (
  <Paper
    elevation={3}
    sx={{
      p: 2,
      borderRadius: 2,
      background: color,
      color: "#fff",
      textAlign: "center",
      minHeight: 100,
    }}
  >
    <Typography variant="subtitle2">{title}</Typography>
    <Typography variant="h5" fontWeight="bold">
      {value}
    </Typography>
    {subtext && (
      <Typography variant="body2" sx={{ opacity: 0.85 }}>
        {subtext}
      </Typography>
    )}
  </Paper>
);

// ---------- page ----------
const AdminDashboardPage: React.FC = () => {
  // Filters
  const [startDate, setStartDate] = useState<Dayjs>(dayjs().startOf("year"));
  const [endDate, setEndDate] = useState<Dayjs>(dayjs().endOf("year"));
  const [statusFilter, setStatusFilter] = useState("__ALL__");
  const [therapistFilter, setTherapistFilter] = useState("__ALL__");

  const [therapistOptions, setTherapistOptions] = useState<
    { key: string; name: string }[]
  >([{ key: "__ALL__", name: "All employees" }]);

  const [loading, setLoading] = useState(true);

  // Stats
  const [bookingsToday, setBookingsToday] = useState(0);
  const [serviceToday, setServiceToday] = useState(0);
  const [shopShareToday, setShopShareToday] = useState(0);
  const [cancelledToday, setCancelledToday] = useState(0);

  const [bookingsCount, setBookingsCount] = useState(0);
  const [serviceTotal, setServiceTotal] = useState(0);
  const [shopShareTotal, setShopShareTotal] = useState(0);
  const [cancelledCount, setCancelledCount] = useState(0);

  const [usersCount, setUsersCount] = useState(0);
  const [therapistsCount, setTherapistsCount] = useState(0);
  const [adminsCount, setAdminsCount] = useState(0);
  const [servicesCount, setServicesCount] = useState(0);

  // Chart Data
  const [monthlyData, setMonthlyData] = useState<
    { month: string; bookings: number; total: number; revenue: number }[]
  >([]);
  const [yearlyData, setYearlyData] = useState<
    { year: string; bookings: number; total: number; revenue: number }[]
  >([]);

  const todayStart = useMemo(() => dayjs().startOf("day").toDate(), []);
  const reportRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Count collections
  useEffect(() => {
    (async () => {
      const [usersSnap, therapistsSnap, adminsSnap, servicesSnap] =
        await Promise.all([
          getDocs(collection(db, "users")),
          getDocs(collection(db, "therapists")),
          getDocs(collection(db, "admins")),
          getDocs(collection(db, "services")),
        ]);
      setUsersCount(usersSnap.size);
      setTherapistsCount(therapistsSnap.size);
      setAdminsCount(adminsSnap.size);
      setServicesCount(servicesSnap.size);
    })();
  }, []);

  // Load bookings realtime
  useEffect(() => {
    const col = collection(db, "bookings");
    const s = Timestamp.fromDate(startDate.startOf("day").toDate());
    const e = Timestamp.fromDate(endDate.endOf("day").toDate());

    const filters: any[] = [where("createdAt", ">=", s), where("createdAt", "<=", e)];
    if (statusFilter !== "__ALL__") filters.push(where("status", "==", statusFilter));
    if (therapistFilter !== "__ALL__") filters.push(where("therapistId", "==", therapistFilter));

    const qy = query(col, ...filters, orderBy("createdAt", "asc"));

    setLoading(true);
    const unsub = onSnapshot(qy, (snap) => {
      const rows = snap.docs.map((d) => d.data() as BookingRow);
      aggregate(rows);
      setLoading(false);
    });

    return () => unsub();
  }, [startDate, endDate, statusFilter, therapistFilter]);

  // Load therapist options
  useEffect(() => {
    const col = collection(db, "bookings");
    const s = Timestamp.fromDate(startDate.startOf("day").toDate());
    const e = Timestamp.fromDate(endDate.endOf("day").toDate());
    const qy = query(col, where("createdAt", ">=", s), where("createdAt", "<=", e));

    const unsub = onSnapshot(qy, (snap) => {
      const map = new Map<string, string>();
      snap.docs.forEach((d) => {
        const r = d.data() as BookingRow;
        const key = r.therapistId || r.therapistName || "";
        if (!key) return;
        map.set(
          String(r.therapistId || r.therapistName),
          String(r.therapistName || r.therapistId)
        );
      });
      const opts = [
        { key: "__ALL__", name: "All employees" },
        ...Array.from(map, ([key, name]) => ({ key, name })),
      ];
      setTherapistOptions(opts);
    });
    return () => unsub();
  }, [startDate, endDate]);

  // Aggregate
  function aggregate(rows: BookingRow[]) {
    let _bookings = 0,
      _service = 0,
      _cancelled = 0;
    let _bookingsToday = 0,
      _serviceToday = 0,
      _cancelledToday = 0;

    const monthMap: Record<
      string,
      { bookings: number; total: number; revenue: number }
    > = {};
    const yearMap: Record<
      string,
      { bookings: number; total: number; revenue: number }
    > = {};

    for (const r of rows) {
      const created = toDateSafe(r.createdAt);
      if (!created) continue;

      const service = Number(r.servicePrice || 0);
      const taxi = Number(r.taxiFee || 0);
      const total = r.totalPrice ?? service + taxi;
      const revenue = service * 0.4;

      _bookings += 1;
      _service += service;
      if (String(r.status || "").toLowerCase() === "cancelled") _cancelled += 1;

      const mKey = dayjs(created).format("YYYY-MM");
      if (!monthMap[mKey]) monthMap[mKey] = { bookings: 0, total: 0, revenue: 0 };
      monthMap[mKey].bookings += 1;
      monthMap[mKey].total += total;
      monthMap[mKey].revenue += revenue;

      const yKey = dayjs(created).format("YYYY");
      if (!yearMap[yKey]) yearMap[yKey] = { bookings: 0, total: 0, revenue: 0 };
      yearMap[yKey].bookings += 1;
      yearMap[yKey].total += total;
      yearMap[yKey].revenue += revenue;

      if (created >= todayStart) {
        _bookingsToday += 1;
        _serviceToday += service;
        if (String(r.status || "").toLowerCase() === "cancelled") _cancelledToday += 1;
      }
    }

    setBookingsCount(_bookings);
    setServiceTotal(_service);
    setShopShareTotal(_service * 0.4);
    setCancelledCount(_cancelled);

    setBookingsToday(_bookingsToday);
    setServiceToday(_serviceToday);
    setShopShareToday(_serviceToday * 0.4);
    setCancelledToday(_cancelledToday);

    setMonthlyData(Object.entries(monthMap).map(([month, v]) => ({ month, ...v })));
    setYearlyData(Object.entries(yearMap).map(([year, v]) => ({ year, ...v })));
  }

  const money = (n: number) => `฿${Number(n || 0).toLocaleString()}`;

  const handlePrint = () => {
    if (!reportRef.current) return;
    const html = reportRef.current.innerHTML;
    const win = window.open("", "", "width=1024,height=768");
    if (!win) return;
    win.document.write(
      `<html><head><title>Dashboard Report</title></head><body>${html}</body></html>`
    );
    win.document.close();
    win.focus();
    win.print();
    win.close();
  };

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom fontWeight="bold">
        📊 Admin Dashboard
      </Typography>

      {/* 🔴 Quick status toggle — เปิดปิด availability ของพนักงาน real-time */}
      <Box sx={{ mb: 3 }}>
        <QuickStatusToggle />
      </Box>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems="center">
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <DatePicker label="Start Date" value={startDate} onChange={(v) => v && setStartDate(v)} />
          </LocalizationProvider>
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <DatePicker label="End Date" value={endDate} onChange={(v) => v && setEndDate(v)} />
          </LocalizationProvider>

          <Select size="small" value={statusFilter} onChange={(e) => setStatusFilter(String(e.target.value))} sx={{ minWidth: 160 }}>
            <MenuItem value="__ALL__">All status</MenuItem>
            <MenuItem value="pending">Pending</MenuItem>
            <MenuItem value="confirmed">Confirmed</MenuItem>
            <MenuItem value="completed">Completed</MenuItem>
            <MenuItem value="cancelled">Cancelled</MenuItem>
          </Select>

          <Select size="small" value={therapistFilter} onChange={(e) => setTherapistFilter(String(e.target.value))} sx={{ minWidth: 220 }}>
            {therapistOptions.map((o) => (
              <MenuItem key={o.key} value={o.key}>{o.name}</MenuItem>
            ))}
          </Select>

          {loading && <CircularProgress size={20} />}
        </Stack>
      </Paper>

      <Box ref={reportRef}>
        {/* Stats */}
        <Grid container spacing={2}>
          {[
            { title: "📅 Bookings Today", value: bookingsToday, subtext: money(shopShareToday), color: "linear-gradient(135deg,#6a11cb,#2575fc)" },
            { title: "💈 Service Today", value: money(serviceToday), subtext: "Service only", color: "linear-gradient(135deg,#5C6BC0,#3949AB)" },
            { title: "🏪 Shop 40% (Today)", value: money(shopShareToday), subtext: money(serviceToday), color: "linear-gradient(135deg,#26A69A,#00796B)" },
            { title: "❌ Cancelled Today", value: cancelledToday, color: "linear-gradient(135deg,#e53935,#e35d5b)" },

            { title: "📦 Bookings (Filtered)", value: bookingsCount, subtext: money(shopShareTotal), color: "linear-gradient(135deg,#ff416c,#ff4b2b)" },
            { title: "💈 Service (Filtered)", value: money(serviceTotal), subtext: "Service only", color: "linear-gradient(135deg,#8e44ad,#4a00e0)" },
            { title: "🏪 Shop 40% (Filtered)", value: money(shopShareTotal), subtext: money(serviceTotal), color: "linear-gradient(135deg,#1abc9c,#16a085)" },
            { title: "❌ Cancelled (Filtered)", value: cancelledCount, color: "linear-gradient(135deg,#c62828,#ef5350)" },

            { title: "👥 Users", value: usersCount, color: "linear-gradient(135deg,#11998e,#38ef7d)" },
            { title: "🧖 Therapists", value: therapistsCount, color: "linear-gradient(135deg,#f7971e,#ffd200)" },
            { title: "👑 Admins", value: adminsCount, color: "linear-gradient(135deg,#2980b9,#6dd5fa)" },
            { title: "🛎️ Services", value: servicesCount, color: "linear-gradient(135deg,#8e2de2,#4a00e0)" },
          ].map((card, i) => (
            <Grid key={i} size={{ xs: 6, sm: 4, md: 3 }}>
              <StatCard {...card} />
            </Grid>
          ))}
        </Grid>

        {/* Monthly Chart */}
        <Paper sx={{ p: 3, borderRadius: 2, mt: 3 }}>
          <Typography variant="h6" fontWeight="bold" gutterBottom>
            📊 Monthly Revenue & Bookings
          </Typography>
          <ResponsiveContainer width="80%" height={300}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="bookings" fill="#82ca9d" name="Bookings" />
              <Bar dataKey="total" fill="#8884d8" name="Total Amount" />
              <Bar dataKey="revenue" fill="#ff9800" name="Revenue (Shop)" />
            </BarChart>
          </ResponsiveContainer>
        </Paper>

        {/* Yearly Chart */}
        <Paper sx={{ p: 3, borderRadius: 2, mt: 3 }}>
          <Typography variant="h6" fontWeight="bold" gutterBottom>
            📆 Yearly Revenue & Bookings
          </Typography>
          <ResponsiveContainer width="80%" height={300}>
            <BarChart data={yearlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="year" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="bookings" fill="#4caf50" name="Bookings" />
              <Bar dataKey="total" fill="#2196f3" name="Total Amount" />
              <Bar dataKey="revenue" fill="#f44336" name="Revenue (Shop)" />
            </BarChart>
          </ResponsiveContainer>
        </Paper>
        
      </Box>

      <Divider sx={{ my: 3 }}>
        <Typography variant="subtitle1" color="text.secondary">
          🛠 Admin Tools
        </Typography>
      </Divider>

      <Box display="flex" flexWrap="wrap" gap={1.5} justifyContent="center">
        <Button variant="contained" size="small" startIcon={<PrintIcon />} onClick={handlePrint}>
          Print
        </Button>
        <Button variant="outlined" size="small" startIcon={<DescriptionIcon />} onClick={() => navigate("/admin/reports")}>
          Full Reports
        </Button>
        <Button variant="outlined" size="small" startIcon={<TableViewIcon />} onClick={() => ExportToExcel(monthlyData, "dashboard_monthly.xlsx")}>
          Excel
        </Button>
        <Button variant="outlined" size="small" startIcon={<PictureAsPdfIcon />} onClick={() => reportRef.current && ExportToPDF(reportRef.current)}>
          PDF
        </Button>
        <Button variant="outlined" size="small" startIcon={<PublicIcon />} onClick={() => window.open("/", "_blank")}>
          View Public
        </Button>
        
      </Box>
      
    </Box>
    
  );
};

export default AdminDashboardPage;