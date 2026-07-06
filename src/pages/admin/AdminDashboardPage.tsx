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
  limit,
  Timestamp,
  where,
  getDocs,
  updateDoc,
  doc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import dayjs, { Dayjs } from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
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
  TrendUp,
  TrendDown,
  ClockCounterClockwise,
  Medal,
} from "phosphor-react";
import { fmtBKK } from "@/utils/time";
import { formatTHB } from "@/utils/servicePricing";
import { getServiceLabel } from "@/utils/serviceCatalog";
// 🆕 Round 28s234 — Control Room redesign (shared dark tokens).
import { adminColor, adminFont, adminFigureSx } from "@/theme/adminTheme";
import { logAdminAction } from "@/utils/auditLog";

dayjs.extend(relativeTime);

const SANS  = adminFont.sans;
const SERIF = adminFont.serif;

// 🆕 Round 28s241 (founder: "Dashboard แบบนี้" — reference screenshot of a
//   widget-rich SaaS admin template) — same labels used by AdminAuditLogPage,
//   duplicated here (not imported) since it's just a tiny display map for a
//   5-row dashboard widget, not shared logic.
const ACTIVITY_LABEL: Record<string, { label: string; color: string }> = {
  "booking.confirm":       { label: "ยืนยันออเดอร์",       color: adminColor.green },
  "booking.cancel":        { label: "ยกเลิกออเดอร์",       color: adminColor.red },
  "booking.complete":      { label: "ปิดงานเสร็จ",         color: adminColor.green },
  "payout.mark_paid":      { label: "จ่ายค่าตอบแทนแล้ว",    color: adminColor.highlight },
  "payout.mark_unpaid":    { label: "ยกเลิกสถานะจ่ายแล้ว",  color: adminColor.dim },
  "therapist.relight_all": { label: "เปิดร้านทั้งหมด",      color: adminColor.green },
  "therapist.reset_auto":  { label: "รีเซ็ตเป็น Auto",      color: adminColor.blue },
  "user.block":            { label: "บล็อกผู้ใช้",         color: adminColor.red },
  "user.unblock":          { label: "ปลดบล็อกผู้ใช้",      color: adminColor.green },
};

function activityDetailLine(detail?: Record<string, unknown>): string {
  if (!detail) return "";
  const parts: string[] = [];
  if (detail.therapistName) parts.push(String(detail.therapistName));
  if (typeof detail.amount === "number") parts.push(`฿${detail.amount.toLocaleString()}`);
  if (detail.bookingId) parts.push(`#${String(detail.bookingId).slice(0, 6)}`);
  return parts.join(" · ");
}

/** Lightweight CSS conic-gradient ring — no chart-library overhead for a single %. */
const DonutRing: React.FC<{ percent: number; color: string; size?: number; thickness?: number }> = ({
  percent, color, size = 84, thickness = 9,
}) => {
  const pct = Math.max(0, Math.min(100, percent));
  return (
    <Box
      sx={{
        position: "relative", width: size, height: size, borderRadius: "50%", flexShrink: 0,
        background: `conic-gradient(${color} ${pct * 3.6}deg, ${adminColor.panel3} 0deg)`,
      }}
    >
      <Box
        sx={{
          position: "absolute", inset: thickness, borderRadius: "50%",
          background: adminColor.panel,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        <Typography sx={{ ...adminFigureSx, fontSize: size / 4.6, color: adminColor.text, lineHeight: 1 }}>
          {pct}%
        </Typography>
      </Box>
    </Box>
  );
};

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
  // 🆕 Round 28s230 — real customer name/phone live on contactName (customer
  //   flow) / customerName (admin add); userName was always blank.
  contactName?: string;
  customerName?: string;
  phone?: string;
  needsAdminReview?: boolean;
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
  // 🆕 Round 28s241 — "Recent Activity" widget, live from the auditLogs
  //   collection (built 28s234, previously only surfaced on /admin/audit-log).
  const [recentActivity, setRecentActivity] = useState<
    { id: string; action: string; actorEmail?: string | null; detail?: Record<string, unknown>; at?: Timestamp | null }[]
  >([]);

  const todayStart = useMemo(() => dayjs().startOf("day").toDate(), []);

  // ── recent admin activity (dashboard widget) ─────────────────────
  useEffect(() => {
    const q = query(collection(db, "auditLogs"), orderBy("at", "desc"), limit(6));
    return onSnapshot(q, (snap) => {
      setRecentActivity(snap.docs.map((d) => ({ id: d.id, ...d.data() } as any)));
    });
  }, []);

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
    // 🆕 Round 28s241 — ranked breakdowns for the "By Therapist" / "By Service"
    //   widgets (Sales-Report / Browser-Stats style rows in the reference).
    const byTherapistMap: Record<string, { name: string; bookings: number; revenue: number }> = {};
    const byServiceMap: Record<string, { name: string; bookings: number; revenue: number }> = {};

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

      if (!isCancelled) {
        const tName = r.therapistName || "Unassigned";
        if (!byTherapistMap[tName]) byTherapistMap[tName] = { name: tName, bookings: 0, revenue: 0 };
        byTherapistMap[tName].bookings++;
        byTherapistMap[tName].revenue += service;

        const sKey = r.serviceId || r.serviceName || "other";
        if (!byServiceMap[sKey]) byServiceMap[sKey] = { name: getServiceLabel(r.serviceId, r.serviceName), bookings: 0, revenue: 0 };
        byServiceMap[sKey].bookings++;
        byServiceMap[sKey].revenue += service;
      }
    }

    const monthlyData = Object.entries(monthMap).map(([month, v]) => ({ month, ...v }));

    // Real month-over-month deltas (only shown when there's a prior month to
    // compare against — never fabricate a trend number without a baseline).
    let momBookingsChange: number | null = null;
    let momRevenueChange: number | null = null;
    if (monthlyData.length >= 2) {
      const prev = monthlyData[monthlyData.length - 2];
      const last = monthlyData[monthlyData.length - 1];
      if (prev.bookings > 0) momBookingsChange = Math.round(((last.bookings - prev.bookings) / prev.bookings) * 100);
      if (prev.revenue  > 0) momRevenueChange  = Math.round(((last.revenue  - prev.revenue)  / prev.revenue)  * 100);
    }

    const byTherapist = Object.values(byTherapistMap).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
    const byService   = Object.values(byServiceMap).sort((a, b) => b.revenue - a.revenue).slice(0, 6);
    const completionRate = periodBookings > 0
      ? Math.round(((periodBookings - periodCancelled) / periodBookings) * 100)
      : 0;
    const maxServiceRevenue = Math.max(1, ...byService.map((s) => s.revenue));

    return {
      todayBookings, todayRevenue, todayCancelled,
      periodBookings, periodService,
      periodShop:   periodService * 0.4,
      periodWorker: periodService * 0.6,
      periodCancelled,
      monthlyData,
      momBookingsChange, momRevenueChange,
      byTherapist, byService, maxServiceRevenue,
      completionRate,
    };
  }, [allRows, todayStart]);

  // ── confirm booking ──────────────────────────────────────────────
  const confirmBooking = async (id: string) => {
    // 🆕 Round 28s230 (FIX D) — settle the hold on confirm so the scheduler
    //   can't later mark the accepted order "expired".
    await updateDoc(doc(db, "bookings", id), {
      status: "confirmed",
      holdState: "confirmed",
      holdExpiresAt: null,
    });
    void logAdminAction("booking.confirm", { bookingId: id });
  };

  const todayLabel = dayjs().format("ddd D MMM YYYY");

  return (
    <Box sx={{ fontFamily: SANS, minHeight: "100vh", pb: 10 }}>

      {/* ── header + today strip — Round 28s234 Control Room ─────────── */}
      <Box sx={{ px: { xs: 2, md: 3 }, pt: 3, pb: 2.5 }}>
        <motion.div {...fadeUp(0)}>
          <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 1, mb: 0.4 }}>
            <Typography sx={{ fontFamily: adminFont.serif, fontSize: { xs: 22, md: 26 }, fontWeight: 600, color: adminColor.text, letterSpacing: "0.01em" }}>
              Dashboard
            </Typography>
            {loading && <CircularProgress size={18} sx={{ color: adminColor.dim, mt: 0.5 }} />}
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
            <CalendarBlank size={13} color={adminColor.dim} />
            <Typography sx={{ fontFamily: SANS, fontSize: 13, color: adminColor.muted }}>
              {todayLabel}
            </Typography>
          </Box>
        </motion.div>

        {/* today strip */}
        <motion.div {...fadeUp(0.07)}>
          <Box sx={{ display: "flex", gap: 1, mt: 2.5, p: 1.5, borderRadius: "16px", background: adminColor.panel, border: `1px solid ${adminColor.line}` }}>
            {[
              { label: "Today",   value: stats.todayBookings,            unit: "bookings" },
              { label: "Revenue", value: money(stats.todayRevenue),      unit: "service"  },
              { label: "Pending", value: pendingBookings.length,         unit: "need action", accent: pendingBookings.length > 0 },
            ].map((s, i) => (
              <Box key={i} sx={{ flex: 1, textAlign: "center", borderRight: i < 2 ? `1px solid ${adminColor.line}` : "none" }}>
                <Typography sx={{ ...adminFigureSx, fontSize: 19, color: s.accent ? adminColor.accent : adminColor.text, lineHeight: 1 }}>
                  {s.value}
                </Typography>
                <Typography sx={{ fontFamily: SANS, fontSize: 10, color: adminColor.dim, mt: 0.4, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  {s.label}
                </Typography>
              </Box>
            ))}
          </Box>
        </motion.div>
      </Box>

      <Box sx={{ px: { xs: 2, md: 3 }, display: "flex", flexDirection: "column", gap: 2.5 }}>

        {/* 🆕 Round 28s232 — Tonight ops board entry (dispatch control room). */}
        <Box
          onClick={() => navigate("/admin/tonight")}
          sx={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            px: 2, py: 1.5, borderRadius: 3, cursor: "pointer",
            // 🆕 Round 28s237 — anchor the gradient's dark end to the exact
            //   palette bg instead of a separately invented hex.
            background: `linear-gradient(135deg, ${adminColor.panel2}, ${adminColor.bg})`,
            border: `1px solid ${adminColor.accent}44`,
            color: adminColor.text,
            boxShadow: "0 6px 18px rgba(0,0,0,0.3)",
          }}
        >
          <Box>
            <Typography sx={{ fontFamily: SANS, fontWeight: 800, fontSize: 16 }}>🌙 คืนนี้ — ห้องคุมงาน</Typography>
            <Typography sx={{ fontFamily: SANS, fontSize: 12, color: adminColor.muted }}>ส่งงาน · ติดตามหมอนวด · เช็กเวลา</Typography>
          </Box>
          <Typography sx={{ fontSize: 22, color: adminColor.highlight }}>→</Typography>
        </Box>

        {/* ── pending quick actions ────────────────────────────────────── */}
        {pendingBookings.length > 0 && (
          <motion.div {...fadeUp(0.05)}>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.25 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                <Box sx={{ width: 8, height: 8, borderRadius: "50%", background: adminColor.accent, boxShadow: `0 0 0 3px ${adminColor.accent}33` }} />
                <Typography sx={{ fontFamily: SANS, fontSize: 11, fontWeight: 700, color: adminColor.accent, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                  Needs Confirmation — {pendingBookings.length}
                </Typography>
              </Box>
              <Box
                onClick={() => navigate("/admin/bookings")}
                sx={{ display: "flex", alignItems: "center", gap: 0.4, cursor: "pointer" }}
              >
                <Typography sx={{ fontFamily: SANS, fontSize: 12, fontWeight: 600, color: adminColor.muted }}>View all</Typography>
                <ArrowRight size={13} color={adminColor.dim} />
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
                        background: adminColor.panel,
                        border: `1px solid ${adminColor.accent}33`,
                        boxShadow: "0 4px 14px rgba(0,0,0,0.25)",
                      }}
                    >
                      {/* red dot */}
                      <Box sx={{ width: 8, height: 8, borderRadius: "50%", background: adminColor.accent, flexShrink: 0 }} />

                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography sx={{ fontFamily: SANS, fontSize: 14, fontWeight: 700, color: adminColor.text, lineHeight: 1.2, mb: 0.2 }}>
                          {b.therapistName}
                        </Typography>
                        <Typography sx={{ fontFamily: SANS, fontSize: 12, color: adminColor.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {getServiceLabel(b.serviceId, b.serviceName)} · {dateLabel}
                        </Typography>
                        <Typography sx={{ fontFamily: SANS, fontSize: 11, color: adminColor.dim, mt: 0.1 }}>
                          👤 {b.userName || b.contactName || b.customerName || "—"}
                          {b.phone && (
                            <>
                              {" · "}
                              <Box
                                component="a"
                                href={`tel:${b.phone}`}
                                onClick={(e) => e.stopPropagation()}
                                sx={{ color: adminColor.green, fontWeight: 700, textDecoration: "none" }}
                              >
                                📞 {b.phone}
                              </Box>
                            </>
                          )}
                        </Typography>
                        {b.needsAdminReview && (
                          <Typography sx={{ fontFamily: SANS, fontSize: 11, fontWeight: 700, color: adminColor.accent, mt: 0.2 }}>
                            ⚠️ เช็คก่อนยืนยัน — หมอนวดอาจไม่ว่าง
                          </Typography>
                        )}
                      </Box>

                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, flexShrink: 0 }}>
                        {(b.totalPrice || b.servicePrice) && (
                          <Typography sx={{ ...adminFigureSx, fontSize: 13.5, color: adminColor.highlight }}>
                            {formatTHB(b.totalPrice ?? b.servicePrice ?? 0)}
                          </Typography>
                        )}
                        <motion.button
                          whileTap={{ scale: 0.97 }}
                          onClick={() => b.id && void confirmBooking(b.id)}
                          style={{
                            height: 34, padding: "0 14px", borderRadius: 999,
                            background: adminColor.accent,
                            color: "#fff", fontFamily: SANS, fontSize: 12, fontWeight: 700,
                            border: "none", cursor: "pointer",
                            boxShadow: "0 3px 10px rgba(0,0,0,0.35)",
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
              background: adminColor.panel,
              border: `1px solid ${adminColor.line}`,
              p: "14px 16px",
              display: "flex",
              gap: 1.5,
              flexWrap: "wrap",
              alignItems: "center",
              "& .MuiInputBase-root": { color: adminColor.text },
              "& .MuiInputLabel-root": { color: adminColor.muted },
              "& .MuiOutlinedInput-notchedOutline": { borderColor: adminColor.line2 },
              "& .MuiSvgIcon-root": { color: adminColor.muted },
            }}
          >
            <Typography sx={{ fontFamily: SANS, fontSize: 11, fontWeight: 700, color: adminColor.muted, letterSpacing: "0.08em", textTransform: "uppercase", mr: 0.5 }}>
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

            <Select size="small" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} sx={{ minWidth: 130, fontSize: 13 }} MenuProps={{ PaperProps: { sx: { background: adminColor.panel2, color: adminColor.text, borderRadius: "12px", boxShadow: "0 8px 24px rgba(0,0,0,0.4)" } } }}>
              <MenuItem value="__ALL__">All status</MenuItem>
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="confirmed">Confirmed</MenuItem>
              <MenuItem value="completed">Completed</MenuItem>
              <MenuItem value="cancelled">Cancelled</MenuItem>
            </Select>

            {therapistOptions.length > 0 && (
              <Select size="small" value={therapistFilter} onChange={(e) => setTherapistFilter(e.target.value)} sx={{ minWidth: 150, fontSize: 13 }} MenuProps={{ PaperProps: { sx: { background: adminColor.panel2, color: adminColor.text, borderRadius: "12px", boxShadow: "0 8px 24px rgba(0,0,0,0.4)" } } }}>
                <MenuItem value="__ALL__">All therapists</MenuItem>
                {therapistOptions.map((n) => <MenuItem key={n} value={n}>{n}</MenuItem>)}
              </Select>
            )}
          </Box>
        </motion.div>

        {/* ── period stat icon row — 🆕 Round 28s241, circular-icon widget
             style borrowed from the reference "Statistics" section ────── */}
        <motion.div {...fadeUp(0.10)}>
          <Typography sx={{ fontFamily: SANS, fontSize: 11, fontWeight: 700, color: adminColor.muted, letterSpacing: "0.1em", textTransform: "uppercase", mb: 1.25 }}>
            Period Summary — {startDate.format("D MMM")} to {endDate.format("D MMM YYYY")}
          </Typography>
          <Box
            sx={{
              borderRadius: "16px", background: adminColor.panel,
              border: `1px solid ${adminColor.line}`,
              p: "16px 14px",
              display: "grid", gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(4,1fr)" }, gap: 2,
            }}
          >
            {[
              { icon: <CalendarBlank size={20} weight="duotone" />, label: "Bookings",    value: String(stats.periodBookings), color: adminColor.accent },
              { icon: <ChartBar      size={20} weight="duotone" />, label: "Service Rev", value: money(stats.periodService),   color: adminColor.green },
              { icon: <Buildings     size={20} weight="duotone" />, label: "Shop 40%",    value: money(stats.periodShop),      color: adminColor.highlight },
              { icon: <XCircle       size={20} weight="duotone" />, label: "Cancelled",   value: String(stats.periodCancelled), color: adminColor.red },
            ].map((c) => (
              <Box key={c.label} sx={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 0.75 }}>
                <Box
                  sx={{
                    width: 44, height: 44, borderRadius: "50%",
                    background: `${c.color}1A`, color: c.color,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}
                >
                  {c.icon}
                </Box>
                <Typography sx={{ ...adminFigureSx, fontSize: 17, color: adminColor.text, lineHeight: 1 }}>
                  {c.value}
                </Typography>
                <Typography sx={{ fontFamily: SANS, fontSize: 10.5, color: adminColor.muted, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  {c.label}
                </Typography>
              </Box>
            ))}
          </Box>
        </motion.div>

        {/* ── revenue chart + completion ring + orders — 🆕 Round 28s241,
             mirrors the reference's "Revenue Report / Budget / Orders" row */}
        {stats.monthlyData.length > 0 && (
          <motion.div {...fadeUp(0.12)}>
            <Box sx={{ display: "flex", flexDirection: { xs: "column", md: "row" }, gap: 1.5 }}>
              <Box sx={{ flex: { md: "2 1 0" }, borderRadius: "18px", background: adminColor.panel, border: `1px solid ${adminColor.line}`, p: "16px 16px 12px" }}>
                <Typography sx={{ fontFamily: SANS, fontSize: 11, fontWeight: 700, color: adminColor.muted, letterSpacing: "0.1em", textTransform: "uppercase", mb: 1.5 }}>
                  Monthly Revenue
                </Typography>
                <ResponsiveContainer width="100%" height={isMobile ? 180 : 240}>
                  <BarChart data={stats.monthlyData} margin={{ top: 0, right: 4, left: -18, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={adminColor.line} />
                    <XAxis dataKey="month" tick={{ fontFamily: SANS, fontSize: 11, fill: adminColor.muted }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontFamily: SANS, fontSize: 10, fill: adminColor.dim }} axisLine={false} tickLine={false} tickFormatter={(v) => `฿${(v/1000).toFixed(0)}k`} />
                    <Tooltip
                      contentStyle={{ fontFamily: SANS, fontSize: 12, borderRadius: 10, background: adminColor.panel2, border: `1px solid ${adminColor.line2}`, boxShadow: "0 4px 12px rgba(0,0,0,0.4)", color: adminColor.text }}
                      formatter={(value, name) => [name === "revenue" ? money(Number(value)) : value, name === "revenue" ? "Revenue" : "Bookings"]}
                    />
                    <Bar dataKey="bookings" fill={adminColor.panel3} radius={[4,4,0,0]} name="bookings" />
                    <Bar dataKey="revenue"  fill={adminColor.accent} radius={[4,4,0,0]} name="revenue" />
                  </BarChart>
                </ResponsiveContainer>
              </Box>

              <Box sx={{ flex: { md: "1 1 0" }, display: "flex", flexDirection: "column", gap: 1.5 }}>
                {/* completion-rate ring */}
                <Box sx={{ flex: 1, borderRadius: "18px", background: adminColor.panel, border: `1px solid ${adminColor.line}`, p: "16px", display: "flex", alignItems: "center", gap: 1.5 }}>
                  <DonutRing percent={stats.completionRate} color={adminColor.accent} />
                  <Box>
                    <Typography sx={{ fontFamily: SANS, fontSize: 10.5, fontWeight: 700, color: adminColor.muted, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                      Completion Rate
                    </Typography>
                    <Typography sx={{ fontFamily: SANS, fontSize: 11, color: adminColor.dim, mt: 0.4 }}>
                      {stats.periodBookings - stats.periodCancelled} of {stats.periodBookings} bookings
                    </Typography>
                  </Box>
                </Box>

                {/* orders sparkline */}
                <Box sx={{ flex: 1, borderRadius: "18px", background: adminColor.panel, border: `1px solid ${adminColor.line}`, p: "16px" }}>
                  <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                    <Box>
                      <Typography sx={{ fontFamily: SANS, fontSize: 10.5, fontWeight: 700, color: adminColor.muted, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                        Orders Today
                      </Typography>
                      <Typography sx={{ ...adminFigureSx, fontSize: 23, color: adminColor.text, lineHeight: 1.2, mt: 0.4 }}>
                        {stats.todayBookings}
                      </Typography>
                    </Box>
                    {stats.momBookingsChange !== null && (
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.3, color: stats.momBookingsChange >= 0 ? adminColor.green : adminColor.red }}>
                        {stats.momBookingsChange >= 0 ? <TrendUp size={13} weight="bold" /> : <TrendDown size={13} weight="bold" />}
                        <Typography sx={{ fontFamily: SANS, fontSize: 11, fontWeight: 700 }}>
                          {Math.abs(stats.momBookingsChange)}%
                        </Typography>
                      </Box>
                    )}
                  </Box>
                  <ResponsiveContainer width="100%" height={44}>
                    <AreaChart data={stats.monthlyData} margin={{ top: 6, right: 0, left: 0, bottom: 0 }}>
                      <Area type="monotone" dataKey="bookings" stroke={adminColor.accent} strokeWidth={2} fill={`${adminColor.accent}22`} />
                    </AreaChart>
                  </ResponsiveContainer>
                </Box>
              </Box>
            </Box>
          </motion.div>
        )}

        {/* ── by therapist + by service — 🆕 Round 28s241, Sales-Report /
             Browser-Stats style ranked breakdown rows ─────────────────── */}
        {(stats.byTherapist.length > 0 || stats.byService.length > 0) && (
          <motion.div {...fadeUp(0.13)}>
            <Box sx={{ display: "flex", flexDirection: { xs: "column", md: "row" }, gap: 1.5 }}>
              <Box sx={{ flex: 1, borderRadius: "18px", background: adminColor.panel, border: `1px solid ${adminColor.line}`, p: "16px" }}>
                <Typography sx={{ fontFamily: SANS, fontSize: 11, fontWeight: 700, color: adminColor.muted, letterSpacing: "0.1em", textTransform: "uppercase", mb: 1.5 }}>
                  By Therapist
                </Typography>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1.1 }}>
                  {stats.byTherapist.map((t, i) => (
                    <Box key={t.name} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Box sx={{ width: 20, height: 20, borderRadius: "50%", background: i === 0 ? `${adminColor.accent}22` : adminColor.panel2, color: i === 0 ? adminColor.accent : adminColor.dim, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        {i === 0 ? <Medal size={12} weight="fill" /> : <Typography sx={{ fontSize: 10, fontWeight: 700 }}>{i + 1}</Typography>}
                      </Box>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography sx={{ fontFamily: SANS, fontSize: 12.5, fontWeight: 700, color: adminColor.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {t.name}
                        </Typography>
                        <Typography sx={{ fontFamily: SANS, fontSize: 10.5, color: adminColor.dim }}>
                          {t.bookings} bookings
                        </Typography>
                      </Box>
                      <Typography sx={{ ...adminFigureSx, fontSize: 12.5, color: adminColor.highlight, flexShrink: 0 }}>
                        {money(t.revenue)}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Box>

              <Box sx={{ flex: 1, borderRadius: "18px", background: adminColor.panel, border: `1px solid ${adminColor.line}`, p: "16px" }}>
                <Typography sx={{ fontFamily: SANS, fontSize: 11, fontWeight: 700, color: adminColor.muted, letterSpacing: "0.1em", textTransform: "uppercase", mb: 1.5 }}>
                  By Service
                </Typography>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
                  {stats.byService.map((s) => (
                    <Box key={s.name}>
                      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.4 }}>
                        <Typography sx={{ fontFamily: SANS, fontSize: 12, fontWeight: 600, color: adminColor.text }}>{s.name}</Typography>
                        <Typography sx={{ fontFamily: SANS, fontSize: 11.5, color: adminColor.dim }}>{money(s.revenue)}</Typography>
                      </Box>
                      <Box sx={{ height: 6, borderRadius: 999, background: adminColor.panel3, overflow: "hidden" }}>
                        <Box sx={{ height: "100%", width: `${(s.revenue / stats.maxServiceRevenue) * 100}%`, background: adminColor.accent, borderRadius: 999 }} />
                      </Box>
                    </Box>
                  ))}
                </Box>
              </Box>
            </Box>
          </motion.div>
        )}

        {/* ── recent activity — 🆕 Round 28s241, Transactions-style feed
             pulled live from the auditLogs collection (built 28s234) ───── */}
        {recentActivity.length > 0 && (
          <motion.div {...fadeUp(0.14)}>
            <Box sx={{ borderRadius: "18px", background: adminColor.panel, border: `1px solid ${adminColor.line}`, p: "16px" }}>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5 }}>
                <Typography sx={{ fontFamily: SANS, fontSize: 11, fontWeight: 700, color: adminColor.muted, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                  Recent Activity
                </Typography>
                <Box onClick={() => navigate("/admin/audit-log")} sx={{ display: "flex", alignItems: "center", gap: 0.4, cursor: "pointer" }}>
                  <Typography sx={{ fontFamily: SANS, fontSize: 12, fontWeight: 600, color: adminColor.muted }}>View all</Typography>
                  <ArrowRight size={13} color={adminColor.dim} />
                </Box>
              </Box>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                {recentActivity.map((r) => {
                  const cfg = ACTIVITY_LABEL[r.action] ?? { label: r.action, color: adminColor.muted };
                  const detail = activityDetailLine(r.detail);
                  const at = r.at?.toDate ? r.at.toDate() : null;
                  return (
                    <Box key={r.id} sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
                      <Box sx={{ width: 30, height: 30, borderRadius: "50%", background: `${cfg.color}1A`, color: cfg.color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <ClockCounterClockwise size={14} weight="bold" />
                      </Box>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography sx={{ fontFamily: SANS, fontSize: 12.5, fontWeight: 700, color: adminColor.text }}>
                          {cfg.label}
                        </Typography>
                        {detail && (
                          <Typography sx={{ fontFamily: SANS, fontSize: 11, color: adminColor.dim }}>
                            {detail}
                          </Typography>
                        )}
                      </Box>
                      {at && (
                        <Typography sx={{ fontFamily: SANS, fontSize: 10.5, color: adminColor.dim, flexShrink: 0 }}>
                          {dayjs(at).fromNow()}
                        </Typography>
                      )}
                    </Box>
                  );
                })}
              </Box>
            </Box>
          </motion.div>
        )}

        {/* ── platform counts ─────────────────────────────────────────── */}
        <motion.div {...fadeUp(0.15)}>
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
                  borderRadius: "14px", background: adminColor.panel,
                  border: `1px solid ${adminColor.line}`,
                  p: "12px 14px",
                  cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 1,
                  "&:active": { background: adminColor.panel2 },
                }}
              >
                <Box sx={{ color: adminColor.accent }}>{c.icon}</Box>
                <Box>
                  <Typography sx={{ ...adminFigureSx, fontSize: 17, color: adminColor.text, lineHeight: 1 }}>{c.value}</Typography>
                  <Typography sx={{ fontFamily: SANS, fontSize: 10.5, color: adminColor.muted, textTransform: "uppercase", letterSpacing: "0.06em" }}>{c.label}</Typography>
                </Box>
              </Box>
            ))}
          </Box>
        </motion.div>

        {/* ── quick action tiles ───────────────────────────────────────── */}
        <motion.div {...fadeUp(0.16)}>
          <Typography sx={{ fontFamily: SANS, fontSize: 11, fontWeight: 700, color: adminColor.muted, letterSpacing: "0.1em", textTransform: "uppercase", mb: 1.25 }}>
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
                  background: t.accent ? adminColor.accent : adminColor.panel,
                  border: t.accent ? "none" : `1px solid ${adminColor.line}`,
                  cursor: "pointer",
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
                  boxShadow: t.accent ? "0 4px 14px rgba(0,0,0,0.35)" : "0 1px 4px rgba(0,0,0,0.15)",
                }}
              >
                <Box sx={{ color: t.accent ? "#fff" : adminColor.accent }}>{t.icon}</Box>
                <Typography sx={{ fontFamily: SANS, fontSize: 12, fontWeight: 700, color: t.accent ? "#fff" : adminColor.text }}>
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
