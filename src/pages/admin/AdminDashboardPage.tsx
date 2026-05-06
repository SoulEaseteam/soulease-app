// src/pages/admin/AdminDashboardPage.tsx
//
// 🆕 Round 28c19 (founder 2026-05-06) — full SunRed redesign.
//   Dark hero + today strip + period cards + pending quick-confirm +
//   responsive charts + quick-link tiles. Matches Bookings/Reports style.

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Typography,
  CircularProgress,
  Select,
  MenuItem,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  where,
  getDocs,
  updateDoc,
  doc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import dayjs, { Dayjs } from "dayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import {
  CalendarBlank,
  CheckCircle,
  XCircle,
  ChartBar,
  Buildings,
  Taxi,
  Users,
  UserCircle,
  Sparkle,
  ArrowRight,
  PlusCircle,
  ClipboardText,
  Eye,
} from "phosphor-react";
import { fmtBKK } from "@/utils/time";
import { formatTHB } from "@/utils/servicePricing";
import { getServiceLabel } from "@/utils/serviceCatalog";

const SANS  = '"Inter", system-ui, sans-serif';
const SERIF = '"Fraunces", Georgia, serif';

// ── types ─────────────────────────────────────────────────────────────
type FBTS = Timestamp | { seconds: number } | Date | string | null | undefined;

interface BookingRow {
  id?: string;
  createdAt?: FBTS;
  startAt?: Timestamp;
  date?: string;
  time?: string;
  status?: string;
  therapistId?: string;
  therapistName?: string;
  serviceId?: string;
  serviceName?: string;
  userName?: string;
  locationName?: string;
  address?: string;
  servicePrice?: number;
  taxiFee?: number;
  totalPrice?: number;
  duration?: number;
}

function toDate(v: FBTS): Date | null {
  try {
    if (!v) return null;
    if (typeof (v as any).toDate === "function") return (v as any).toDate();
    if (typeof (v as any).seconds === "number") return new Date((v as any).seconds * 1000);
    if (typeof v === "string") return new Date(v);
    if (v instanceof Date) return v;
    return null;
  } catch { return null; }
}

const money = (n: number) => `฿${Number(n || 0).toLocaleString()}`;

// ── fade animation helper ──────────────────────────────────────────────
const fadeUp = (delay = 0) => ({
  initial:    { opacity: 0 },
  animate:    { opacity: 1 },
  transition: { duration: 0.22, ease: "easeOut" as const, delay },
});

// ──────────────────────────────────────────────────────────────────────
// Page
// ──────────────────────────────────────────────────────────────────────
const AdminDashboardPage: React.FC = () => {
  const navigate  = useNavigate();
  const theme     = useTheme();
  const isMobile  = useMediaQuery(theme.breakpoints.down("sm"));

  // ── filters ─────────────────────────────────────────────────────
  const [startDate,       setStartDate]       = useState<Dayjs>(dayjs().startOf("month"));
  const [endDate,         setEndDate]         = useState<Dayjs>(dayjs().endOf("month"));
  const [statusFilter,    setStatusFilter]    = useState("__ALL__");
  const [therapistFilter, setTherapistFilter] = useState("__ALL__");

  // ── data ─────────────────────────────────────────────────────────
  const [loading,          setLoading]         = useState(true);
  const [allRows,          setAllRows]         = useState<BookingRow[]>([]);
  const [pendingBookings,  setPendingBookings] = useState<BookingRow[]>([]);
  const [counts,           setCounts]          = useState({ users: 0, therapists: 0, services: 0 });
  const [therapistOptions, setTherapistOptions] = useState<string[]>([]);

  const todayStart = useMemo(() => dayjs().startOf("day").toDate(), []);

  // ── collection counts ────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const [u, t, s] = await Promise.all([
        getDocs(collection(db, "users")),
        getDocs(collection(db, "therapists")),
        getDocs(collection(db, "services")),
      ]);
      setCounts({ users: u.size, therapists: t.size, services: s.size });
    })();
  }, []);

  // ── pending bookings (always fresh, not date-filtered) ───────────
  useEffect(() => {
    const q = query(collection(db, "bookings"), where("status", "==", "pending"), orderBy("createdAt", "desc"));
    return onSnapshot(q, (snap) => {
      setPendingBookings(snap.docs.map((d) => ({ id: d.id, ...d.data() } as BookingRow)));
    });
  }, []);

  // ── range bookings ───────────────────────────────────────────────
  useEffect(() => {
    const s = Timestamp.fromDate(startDate.startOf("day").toDate());
    const e = Timestamp.fromDate(endDate.endOf("day").toDate());
    const filters: Parameters<typeof query>[1][] = [
      where("createdAt", ">=", s),
      where("createdAt", "<=", e),
    ];
    if (statusFilter    !== "__ALL__") filters.push(where("status",      "==", statusFilter));
    if (therapistFilter !== "__ALL__") filters.push(where("therapistId", "==", therapistFilter));

    setLoading(true);
    return onSnapshot(
      query(collection(db, "bookings"), ...filters, orderBy("createdAt", "asc")),
      (snap) => {
        const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() } as BookingRow));
        setAllRows(rows);
        setTherapistOptions([...new Set(rows.map((r) => r.therapistName || "").filter(Boolean))]);
        setLoading(false);
      },
      () => setLoading(false),
    );
  }, [startDate, endDate, statusFilter, therapistFilter]);

  // ── derived stats ────────────────────────────────────────────────
  const stats = useMemo(() => {
    let todayBookings = 0, todayRevenue = 0, todayCancelled = 0;
    let periodBookings = 0, periodService = 0, periodCancelled = 0;
    const monthMap: Record<string, { bookings: number; revenue: number }> = {};

    for (const r of allRows) {
      const created = toDate(r.createdAt);
      if (!created) continue;
      const service = r.servicePrice || 0;
      const isCancelled = r.status === "cancelled";

      periodBookings++;
      if (!isCancelled) periodService += service;
      if (isCancelled)  periodCancelled++;

      if (created >= todayStart) {
        todayBookings++;
        if (!isCancelled) todayRevenue += service;
        if (isCancelled)  todayCancelled++;
      }

      const mKey = dayjs(created).format("MMM");
      if (!monthMap[mKey]) monthMap[mKey] = { bookings: 0, revenue: 0 };
      monthMap[mKey].bookings++;
      if (!isCancelled) monthMap[mKey].revenue += service;
    }

    return {
      todayBookings, todayRevenue, todayCancelled,
      periodBookings, periodService,
      periodShop:   periodService * 0.4,
      periodWorker: periodService * 0.6,
      periodCancelled,
      monthlyData: Object.entries(monthMap).map(([month, v]) => ({ month, ...v })),
    };
  }, [allRows, todayStart]);

  // ── confirm booking ──────────────────────────────────────────────
  const confirmBooking = async (id: string) => {
    await updateDoc(doc(db, "bookings", id), { status: "confirmed" });
  };

  const todayLabel = dayjs().format("ddd D MMM YYYY");

  return (
    <Box sx={{ fontFamily: SANS, minHeight: "100vh", background: "#F7F3F1", pb: 10 }}>

      {/* ── dark hero ───────────────────────────────────────────────── */}
      <Box
        sx={{
          background: "linear-gradient(160deg,#1a0805 0%,#3c1010 55%,#2d0909 100%)",
          px: { xs: 2, md: 3 },
          pt: 3, pb: 2.5,
          position: "relative",
          overflow: "hidden",
          "&::after": {
            content: '""', position: "absolute",
            bottom: -32, left: "50%", transform: "translateX(-50%)",
            width: 300, height: 80, borderRadius: "50%",
            background: "rgba(254,9,68,0.10)", filter: "blur(32px)",
            pointerEvents: "none",
          },
        }}
      >
        <motion.div {...fadeUp(0)}>
          <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 1, mb: 0.4 }}>
            <Typography sx={{ fontFamily: SERIF, fontSize: { xs: 24, md: 28 }, fontWeight: 700, color: "#fff", letterSpacing: "-0.02em" }}>
              Dashboard
            </Typography>
            {loading && <CircularProgress size={18} sx={{ color: "rgba(255,255,255,0.40)", mt: 0.5 }} />}
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
            <CalendarBlank size={13} color="rgba(255,255,255,0.40)" />
            <Typography sx={{ fontFamily: SANS, fontSize: 13, color: "rgba(255,255,255,0.40)" }}>
              {todayLabel}
            </Typography>
          </Box>
        </motion.div>

        {/* today strip */}
        <motion.div {...fadeUp(0.07)}>
          <Box sx={{ display: "flex", gap: 1, mt: 2.5, p: 1.5, borderRadius: "16px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}>
            {[
              { label: "Today",   value: stats.todayBookings,            unit: "bookings" },
              { label: "Revenue", value: money(stats.todayRevenue),      unit: "service"  },
              { label: "Pending", value: pendingBookings.length,         unit: "need action", accent: pendingBookings.length > 0 },
            ].map((s, i) => (
              <Box key={i} sx={{ flex: 1, textAlign: "center", borderRight: i < 2 ? "1px solid rgba(255,255,255,0.08)" : "none" }}>
                <Typography sx={{ fontFamily: SERIF, fontSize: 20, fontWeight: 700, color: s.accent ? "#FE7A52" : "#fff", lineHeight: 1 }}>
                  {s.value}
                </Typography>
                <Typography sx={{ fontFamily: SANS, fontSize: 10, color: "rgba(255,255,255,0.40)", mt: 0.4, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  {s.label}
                </Typography>
              </Box>
            ))}
          </Box>
        </motion.div>
      </Box>

      <Box sx={{ px: { xs: 2, md: 3 }, pt: 2.5, display: "flex", flexDirection: "column", gap: 2.5 }}>

        {/* ── pending quick actions ────────────────────────────────────── */}
        {pendingBookings.length > 0 && (
          <motion.div {...fadeUp(0.05)}>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.25 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                <Box sx={{ width: 8, height: 8, borderRadius: "50%", background: "#FE0944", boxShadow: "0 0 0 3px rgba(254,9,68,0.20)" }} />
                <Typography sx={{ fontFamily: SANS, fontSize: 11, fontWeight: 700, color: "#FE0944", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                  Needs Confirmation — {pendingBookings.length}
                </Typography>
              </Box>
              <Box
                onClick={() => navigate("/admin/bookings")}
                sx={{ display: "flex", alignItems: "center", gap: 0.4, cursor: "pointer" }}
              >
                <Typography sx={{ fontFamily: SANS, fontSize: 12, fontWeight: 600, color: "rgba(60,30,20,0.45)" }}>View all</Typography>
                <ArrowRight size={13} color="rgba(60,30,20,0.40)" />
              </Box>
            </Box>

            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {pendingBookings.slice(0, 5).map((b, i) => {
                const dateLabel = b.startAt?.toDate
                  ? fmtBKK(b.startAt.toDate(), "ddd D MMM · HH:mm")
                  : b.date && b.time ? `${fmtBKK(b.date, "ddd D MMM")} · ${b.time}`
                  : b.date ? fmtBKK(b.date, "ddd D MMM") : "—";

                return (
                  <motion.div key={b.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.06 }}>
                    <Box
                      sx={{
                        display: "flex", alignItems: "center", gap: 1.5,
                        p: "12px 14px",
                        borderRadius: "14px",
                        background: "#fff",
                        border: "1px solid rgba(254,9,68,0.12)",
                        boxShadow: "0 2px 8px rgba(254,9,68,0.06)",
                      }}
                    >
                      {/* red dot */}
                      <Box sx={{ width: 8, height: 8, borderRadius: "50%", background: "#FE0944", flexShrink: 0 }} />

                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography sx={{ fontFamily: SERIF, fontSize: 14, fontWeight: 700, color: "#1a0805", lineHeight: 1.2, mb: 0.2 }}>
                          {b.therapistName}
                        </Typography>
                        <Typography sx={{ fontFamily: SANS, fontSize: 12, color: "rgba(60,30,20,0.55)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {getServiceLabel(b.serviceId, b.serviceName)} · {dateLabel}
                        </Typography>
                        {b.userName && (
                          <Typography sx={{ fontFamily: SANS, fontSize: 11, color: "rgba(60,30,20,0.40)", mt: 0.1 }}>
                            👤 {b.userName}
                          </Typography>
                        )}
                      </Box>

                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, flexShrink: 0 }}>
                        {(b.totalPrice || b.servicePrice) && (
                          <Typography sx={{ fontFamily: SERIF, fontSize: 14, fontWeight: 700, color: "#FE0944" }}>
                            {formatTHB(b.totalPrice ?? b.servicePrice ?? 0)}
                          </Typography>
                        )}
                        <motion.button
                          whileTap={{ scale: 0.97 }}
                          onClick={() => b.id && void confirmBooking(b.id)}
                          style={{
                            height: 34, padding: "0 14px", borderRadius: 999,
                            background: "linear-gradient(135deg,#FE0944,#FE7A52)",
                            color: "#fff", fontFamily: SANS, fontSize: 12, fontWeight: 700,
                            border: "none", cursor: "pointer",
                            boxShadow: "0 3px 10px rgba(254,9,68,0.28)",
                            display: "flex", alignItems: "center", gap: 4,
                          }}
                        >
                          <CheckCircle size={13} weight="fill" /> Confirm
                        </motion.button>
                      </Box>
                    </Box>
                  </motion.div>
                );
              })}
            </Box>
          </motion.div>
        )}

        {/* ── filter bar ───────────────────────────────────────────────── */}
        <motion.div {...fadeUp(0.08)}>
          <Box
            sx={{
              borderRadius: "16px",
              background: "#fff",
              border: "1px solid rgba(15,23,42,0.06)",
              p: "14px 16px",
              display: "flex",
              gap: 1.5,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <Typography sx={{ fontFamily: SANS, fontSize: 11, fontWeight: 700, color: "rgba(60,30,20,0.45)", letterSpacing: "0.08em", textTransform: "uppercase", mr: 0.5 }}>
              Period
            </Typography>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DatePicker
                label="From"
                value={startDate}
                onChange={(v) => v && setStartDate(v)}
                slotProps={{ textField: { size: "small", sx: { width: 130 } } }}
              />
              <DatePicker
                label="To"
                value={endDate}
                onChange={(v) => v && setEndDate(v)}
                slotProps={{ textField: { size: "small", sx: { width: 130 } } }}
              />
            </LocalizationProvider>

            <Select size="small" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} sx={{ minWidth: 130, fontSize: 13 }} MenuProps={{ PaperProps: { sx: { background: "#fff", borderRadius: "12px", boxShadow: "0 8px 24px rgba(0,0,0,0.12)" } } }}>
              <MenuItem value="__ALL__">All status</MenuItem>
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="confirmed">Confirmed</MenuItem>
              <MenuItem value="completed">Completed</MenuItem>
              <MenuItem value="cancelled">Cancelled</MenuItem>
            </Select>

            {therapistOptions.length > 0 && (
              <Select size="small" value={therapistFilter} onChange={(e) => setTherapistFilter(e.target.value)} sx={{ minWidth: 150, fontSize: 13 }} MenuProps={{ PaperProps: { sx: { background: "#fff", borderRadius: "12px", boxShadow: "0 8px 24px rgba(0,0,0,0.12)" } } }}>
                <MenuItem value="__ALL__">All therapists</MenuItem>
                {therapistOptions.map((n) => <MenuItem key={n} value={n}>{n}</MenuItem>)}
              </Select>
            )}
          </Box>
        </motion.div>

        {/* ── period stat cards ────────────────────────────────────────── */}
        <motion.div {...fadeUp(0.10)}>
          <Typography sx={{ fontFamily: SANS, fontSize: 11, fontWeight: 700, color: "rgba(60,30,20,0.45)", letterSpacing: "0.1em", textTransform: "uppercase", mb: 1.25 }}>
            Period Summary — {startDate.format("D MMM")} to {endDate.format("D MMM YYYY")}
          </Typography>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(4,1fr)" }, gap: 1.5 }}>
            {[
              { icon: <CalendarBlank size={18} weight="duotone" />, label: "Bookings",    value: String(stats.periodBookings),       color: "#FE0944" },
              { icon: <ChartBar      size={18} weight="duotone" />, label: "Service Rev", value: money(stats.periodService),        color: "#16a34a" },
              { icon: <Buildings     size={18} weight="duotone" />, label: "Shop 40%",    value: money(stats.periodShop),          color: "#7c3aed" },
              { icon: <XCircle       size={18} weight="duotone" />, label: "Cancelled",   value: String(stats.periodCancelled),     color: "rgba(60,30,20,0.40)" },
            ].map((c) => (
              <Box
                key={c.label}
                sx={{
                  borderRadius: "16px", background: "#fff",
                  border: "1px solid rgba(15,23,42,0.06)",
                  boxShadow: "0 1px 4px rgba(15,23,42,0.04)",
                  p: "14px 16px",
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 0.75, color: c.color }}>
                  {c.icon}
                  <Typography sx={{ fontFamily: SANS, fontSize: 10.5, fontWeight: 700, color: "rgba(60,30,20,0.45)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                    {c.label}
                  </Typography>
                </Box>
                <Typography sx={{ fontFamily: SERIF, fontSize: 22, fontWeight: 700, color: c.color, letterSpacing: "-0.02em", lineHeight: 1 }}>
                  {c.value}
                </Typography>
              </Box>
            ))}
          </Box>
        </motion.div>

        {/* ── platform counts ─────────────────────────────────────────── */}
        <motion.div {...fadeUp(0.12)}>
          <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 1.5 }}>
            {[
              { icon: <Users       size={16} weight="duotone" />, label: "Customers",   value: counts.users,      onClick: () => navigate("/admin/users") },
              { icon: <UserCircle  size={16} weight="duotone" />, label: "Therapists",  value: counts.therapists, onClick: () => navigate("/admin/therapists") },
              { icon: <Sparkle     size={16} weight="duotone" />, label: "Services",    value: counts.services,   onClick: () => navigate("/admin/pages-list") },
            ].map((c) => (
              <Box
                key={c.label}
                onClick={c.onClick}
                sx={{
                  borderRadius: "14px", background: "#fff",
                  border: "1px solid rgba(15,23,42,0.06)",
                  p: "12px 14px",
                  cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 1,
                  "&:active": { background: "rgba(254,9,68,0.04)" },
                }}
              >
                <Box sx={{ color: "#FE0944" }}>{c.icon}</Box>
                <Box>
                  <Typography sx={{ fontFamily: SERIF, fontSize: 18, fontWeight: 700, color: "#1a0805", lineHeight: 1 }}>{c.value}</Typography>
                  <Typography sx={{ fontFamily: SANS, fontSize: 10.5, color: "rgba(60,30,20,0.45)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{c.label}</Typography>
                </Box>
              </Box>
            ))}
          </Box>
        </motion.div>

        {/* ── monthly chart ────────────────────────────────────────────── */}
        {stats.monthlyData.length > 0 && (
          <motion.div {...fadeUp(0.14)}>
            <Box
              sx={{
                borderRadius: "18px", background: "#fff",
                border: "1px solid rgba(15,23,42,0.06)",
                p: "16px 16px 12px",
              }}
            >
              <Typography sx={{ fontFamily: SANS, fontSize: 11, fontWeight: 700, color: "rgba(60,30,20,0.45)", letterSpacing: "0.1em", textTransform: "uppercase", mb: 1.5 }}>
                Monthly Revenue
              </Typography>
              <ResponsiveContainer width="100%" height={isMobile ? 180 : 240}>
                <BarChart data={stats.monthlyData} margin={{ top: 0, right: 4, left: -18, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,23,42,0.05)" />
                  <XAxis dataKey="month" tick={{ fontFamily: SANS, fontSize: 11, fill: "rgba(60,30,20,0.50)" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontFamily: SANS, fontSize: 10, fill: "rgba(60,30,20,0.40)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `฿${(v/1000).toFixed(0)}k`} />
                  <Tooltip
                    contentStyle={{ fontFamily: SANS, fontSize: 12, borderRadius: 10, border: "1px solid rgba(15,23,42,0.08)", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
                    formatter={(value, name) => [name === "revenue" ? money(Number(value)) : value, name === "revenue" ? "Revenue" : "Bookings"]}
                  />
                  <Bar dataKey="bookings" fill="rgba(254,9,68,0.15)" radius={[4,4,0,0]} name="bookings" />
                  <Bar dataKey="revenue"  fill="#FE0944"              radius={[4,4,0,0]} name="revenue" />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </motion.div>
        )}

        {/* ── quick action tiles ───────────────────────────────────────── */}
        <motion.div {...fadeUp(0.16)}>
          <Typography sx={{ fontFamily: SANS, fontSize: 11, fontWeight: 700, color: "rgba(60,30,20,0.45)", letterSpacing: "0.1em", textTransform: "uppercase", mb: 1.25 }}>
            Quick Actions
          </Typography>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", sm: "repeat(4,1fr)" }, gap: 1.25 }}>
            {[
              { icon: <PlusCircle   size={22} weight="duotone" />, label: "New Booking",   path: "/admin/bookings/add",  accent: true  },
              { icon: <ClipboardText size={22} weight="duotone" />, label: "Bookings",     path: "/admin/bookings",      accent: false },
              { icon: <ChartBar     size={22} weight="duotone" />, label: "Reports",       path: "/admin/reports",       accent: false },
              { icon: <Eye          size={22} weight="duotone" />, label: "View Website",  path: "/",                    accent: false, blank: true },
            ].map((t) => (
              <motion.button
                key={t.label}
                whileTap={{ scale: 0.97 }}
                onClick={() => t.blank ? window.open(t.path, "_blank") : navigate(t.path)}
                style={{
                  borderRadius: 16, padding: "16px 12px",
                  background: t.accent ? "linear-gradient(135deg,#FE0944,#FE7A52)" : "#fff",
                  border: t.accent ? "none" : "1px solid rgba(15,23,42,0.07)",
                  cursor: "pointer",
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
                  boxShadow: t.accent ? "0 4px 14px rgba(254,9,68,0.28)" : "0 1px 4px rgba(15,23,42,0.05)",
                }}
              >
                <Box sx={{ color: t.accent ? "#fff" : "#FE0944" }}>{t.icon}</Box>
                <Typography sx={{ fontFamily: SANS, fontSize: 12, fontWeight: 700, color: t.accent ? "#fff" : "#1a0805" }}>
                  {t.label}
                </Typography>
              </motion.button>
            ))}
          </Box>
        </motion.div>
      </Box>
    </Box>
  );
};

export default AdminDashboardPage;
