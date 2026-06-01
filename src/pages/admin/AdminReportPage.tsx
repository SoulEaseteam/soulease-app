// src/pages/admin/AdminReportPage.tsx
//
// 🆕 Round 28c20 (founder 2026-05-06) — focused rewrite.
//   Core use case: จ่ายค่าแรงนวดแต่ละคน.
//   Filter → totals → per-therapist pay cards → export.
//   ตัดทิ้ง: all-bookings table, preview modal ซับซ้อน.

import React, { useEffect, useMemo, useState } from "react";
import {
  Box, Typography, Select, MenuItem, CircularProgress,
  Dialog, DialogContent, DialogActions, Button,
} from "@mui/material";
import { motion } from "framer-motion";
import { db } from "@/lib/firebase";
import {
  collection, query, where, orderBy, onSnapshot, Timestamp,
} from "firebase/firestore";
import dayjs, { Dayjs } from "dayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { ExportMultiSheetExcel, type SheetSpec } from "@/utils/exportTools";
import {
  Export, CalendarBlank, Buildings, User, Taxi, XCircle, CheckCircle, Table,
} from "phosphor-react";

const SANS  = '"Inter", system-ui, sans-serif';
const SERIF = '"Fraunces", Georgia, serif';

// ── types ─────────────────────────────────────────────────────────────
type FBTS = Timestamp | { seconds: number } | Date | string | null | undefined;

interface Booking {
  id: string;
  therapistId?: string;
  therapistName?: string;
  serviceName?: string;
  servicePrice?: number;
  taxiFee?: number;
  totalPrice?: number;
  status?: string;
  createdAt?: FBTS;
}

interface TherapistSummary {
  key: string;
  name: string;
  jobs: number;
  cancelled: number;
  serviceTotal: number;
  taxiTotal: number;
  worker: number;   // 60%
  shop: number;     // 40%
  bookings: Booking[];
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

const thb = (n: number) => `฿${Number(n || 0).toLocaleString()}`;

// ──────────────────────────────────────────────────────────────────────
const AdminReportPage: React.FC = () => {
  const [start,    setStart]    = useState<Dayjs>(dayjs().startOf("month"));
  const [end,      setEnd]      = useState<Dayjs>(dayjs().endOf("month"));
  const [rows,     setRows]     = useState<Booking[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [filter,   setFilter]   = useState("__ALL__");
  const [preview,    setPreview]    = useState<TherapistSummary | null>(null);
  const [showTable,  setShowTable]  = useState(false);

  // ── load bookings in range ────────────────────────────────────────
  useEffect(() => {
    setLoading(true);
    const s = Timestamp.fromDate(start.startOf("day").toDate());
    const e = Timestamp.fromDate(end.endOf("day").toDate());
    return onSnapshot(
      query(collection(db, "bookings"), where("createdAt", ">=", s), where("createdAt", "<=", e), orderBy("createdAt", "asc")),
      (snap) => { setRows(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Booking))); setLoading(false); },
      () => setLoading(false),
    );
  }, [start, end]);

  // ── per-therapist summary ─────────────────────────────────────────
  const summaries = useMemo<TherapistSummary[]>(() => {
    const map = new Map<string, TherapistSummary>();
    for (const b of rows) {
      const k    = b.therapistId || b.therapistName || "Unknown";
      const name = b.therapistName || "Unknown";
      if (!map.has(k)) map.set(k, { key: k, name, jobs: 0, cancelled: 0, serviceTotal: 0, taxiTotal: 0, worker: 0, shop: 0, bookings: [] });
      const r       = map.get(k)!;
      const svc     = b.servicePrice || 0;
      const taxi    = b.taxiFee || 0;
      r.bookings.push(b);
      if (b.status === "cancelled") { r.cancelled++; continue; }
      r.jobs++;
      r.serviceTotal += svc;
      r.taxiTotal    += taxi;
      r.worker        = r.serviceTotal * 0.6;
      r.shop          = r.serviceTotal * 0.4;
    }
    return Array.from(map.values()).sort((a, b) => b.serviceTotal - a.serviceTotal);
  }, [rows]);

  // ── totals ────────────────────────────────────────────────────────
  const totals = useMemo(() => {
    const all = filter === "__ALL__" ? summaries : summaries.filter((s) => s.key === filter);
    return {
      jobs:    all.reduce((n, s) => n + s.jobs, 0),
      service: all.reduce((n, s) => n + s.serviceTotal, 0),
      taxi:    all.reduce((n, s) => n + s.taxiTotal, 0),
      worker:  all.reduce((n, s) => n + s.worker, 0),
      shop:    all.reduce((n, s) => n + s.shop, 0),
    };
  }, [summaries, filter]);

  const visible = filter === "__ALL__" ? summaries : summaries.filter((s) => s.key === filter);

  // ── export helpers ────────────────────────────────────────────────
  const buildSheet = (s: TherapistSummary) => {
    const detailRows = s.bookings
      .filter((b) => b.status !== "cancelled")
      .map((b) => ({
        Date:         dayjs(toDate(b.createdAt) || new Date()).format("YYYY-MM-DD"),
        Service:      b.serviceName || "",
        "Service ฿":  b.servicePrice || 0,
        "Taxi ฿":     b.taxiFee || 0,
        "Total ฿":    b.totalPrice ?? (b.servicePrice || 0) + (b.taxiFee || 0),
      }));
    const summary = { Jobs: s.jobs, Cancelled: s.cancelled, "Service Total": s.serviceTotal, "Taxi Total": s.taxiTotal, "Worker 60%": s.worker, "Shop 40%": s.shop };
    return [...detailRows, {}, summary];
  };

  const exportOne = (s: TherapistSummary) =>
    ExportMultiSheetExcel([{ name: s.name, rows: buildSheet(s) }], `pay_${s.name}_${start.format("YYYYMM")}.xlsx`);

  const exportAll = () => {
    const sheets: SheetSpec[] = [
      { name: "Summary", rows: [{ Period: `${start.format("D MMM")} – ${end.format("D MMM YYYY")}`, TotalJobs: totals.jobs, ServiceTotal: totals.service, Worker60: totals.worker, Shop40: totals.shop }] },
      ...visible.map((s) => ({ name: s.name, rows: buildSheet(s) })),
    ];
    return ExportMultiSheetExcel(sheets, `report_${start.format("YYYYMM")}.xlsx`);
  };

  const periodLabel = `${start.format("D MMM")} – ${end.format("D MMM YYYY")}`;

  return (
    <Box sx={{ fontFamily: SANS, minHeight: "100vh", background: "#F7F3F1", pb: 12 }}>

      {/* ── hero header ─────────────────────────────────────────────── */}
      <Box
        sx={{
          background: "#1A0805",
          px: { xs: 2, md: 3 }, pt: 3, pb: 2.5,
          display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 2, flexWrap: "wrap",
        }}
      >
        <Box>
          <Typography sx={{ fontFamily: SERIF, fontSize: { xs: 22, md: 26 }, fontWeight: 700, color: "#fff", letterSpacing: "-0.02em" }}>
            Reports
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mt: 0.4 }}>
            <CalendarBlank size={12} color="rgba(255,255,255,0.40)" />
            <Typography sx={{ fontFamily: SANS, fontSize: 12, color: "rgba(255,255,255,0.40)" }}>{periodLabel}</Typography>
          </Box>
        </Box>
        <Box sx={{ display: "flex", gap: 1 }}>
          <motion.button
            whileTap={{ scale: 0.93 }}
            onClick={() => setShowTable(true)}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              height: 36, padding: "0 14px", borderRadius: 999,
              background: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,255,255,0.15)",
              color: "#fff", fontFamily: SANS, fontSize: 13, fontWeight: 600, cursor: "pointer",
            }}
          >
            <Table size={14} /> ตาราง
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.93 }}
            onClick={() => void exportAll()}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              height: 36, padding: "0 14px", borderRadius: 999,
              background: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,255,255,0.15)",
              color: "#fff", fontFamily: SANS, fontSize: 13, fontWeight: 600, cursor: "pointer",
            }}
          >
            <Export size={14} /> Export All
          </motion.button>
        </Box>
      </Box>

      {/* ── filter bar ──────────────────────────────────────────────── */}
      <Box
        sx={{
          background: "#fff", borderBottom: "1px solid rgba(15,23,42,0.06)",
          px: { xs: 2, md: 3 }, py: 1.75,
          display: "flex", gap: 1.25, flexWrap: "wrap", alignItems: "center",
        }}
      >
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <DatePicker label="From" value={start} onChange={(v) => v && setStart(v)}
            slotProps={{ textField: { size: "small", sx: { width: 135 } } }} />
          <DatePicker label="To"   value={end}   onChange={(v) => v && setEnd(v)}
            slotProps={{ textField: { size: "small", sx: { width: 135 } } }} />
        </LocalizationProvider>
        <Select size="small" value={filter} onChange={(e) => setFilter(e.target.value)} sx={{ minWidth: 160, fontSize: 13 }}>
          <MenuItem value="__ALL__">All therapists</MenuItem>
          {summaries.map((s) => <MenuItem key={s.key} value={s.key}>{s.name}</MenuItem>)}
        </Select>
        {loading && <CircularProgress size={16} sx={{ color: "#B4000A" }} />}
      </Box>

      <Box sx={{ px: { xs: 2, md: 3 }, pt: 2.5, display: "flex", flexDirection: "column", gap: 2 }}>

        {/* ── period totals ────────────────────────────────────────────── */}
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", sm: "repeat(4,1fr)" }, gap: 1.25 }}>
          {[
            { icon: <User      size={16} weight="duotone" />, label: "Pay Workers",  value: thb(totals.worker), accent: true  },
            { icon: <Buildings size={16} weight="duotone" />, label: "Shop 40%",     value: thb(totals.shop),   accent: false },
            { icon: <Taxi      size={16} weight="duotone" />, label: "Taxi",         value: thb(totals.taxi),   accent: false },
            { icon: <CalendarBlank size={16} weight="duotone" />, label: "Jobs Done", value: String(totals.jobs), accent: false },
          ].map((c) => (
            <Box key={c.label} sx={{ borderRadius: "14px", background: c.accent ? "#B4000A" : "#fff", border: c.accent ? "none" : "1px solid rgba(15,23,42,0.06)", p: "14px 16px", boxShadow: c.accent ? "0 4px 14px rgba(15, 23, 42, 0.22)" : "0 1px 4px rgba(15,23,42,0.04)" }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 0.75, color: c.accent ? "rgba(255,255,255,0.70)" : "rgba(15, 23, 42,0.45)" }}>
                {c.icon}
                <Typography sx={{ fontFamily: SANS, fontSize: 10.5, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "inherit" }}>{c.label}</Typography>
              </Box>
              <Typography sx={{ fontFamily: SERIF, fontSize: 20, fontWeight: 700, color: c.accent ? "#fff" : "#1a0805", letterSpacing: "-0.02em", lineHeight: 1 }}>
                {c.value}
              </Typography>
            </Box>
          ))}
        </Box>

        {/* ── per-therapist pay cards ─────────────────────────────────── */}
        <Typography sx={{ fontFamily: SANS, fontSize: 11, fontWeight: 700, color: "rgba(15, 23, 42,0.45)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
          Pay per therapist — {visible.length} staff
        </Typography>

        {visible.length === 0 && !loading && (
          <Box sx={{ textAlign: "center", py: 6 }}>
            <Typography sx={{ fontFamily: SANS, fontSize: 13, color: "rgba(15, 23, 42,0.35)" }}>No bookings in this period</Typography>
          </Box>
        )}

        {visible.map((s, i) => (
          <motion.div key={s.key} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Box sx={{ borderRadius: "18px", background: "#fff", border: "1px solid rgba(15,23,42,0.06)", overflow: "hidden", boxShadow: "0 2px 8px rgba(15,23,42,0.05)" }}>
              {/* stripe */}
              <Box sx={{ height: 3, background: "#B4000A" }} />

              <Box sx={{ p: "14px 16px" }}>
                {/* name + badges */}
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5 }}>
                  <Typography sx={{ fontFamily: SERIF, fontSize: 16, fontWeight: 700, color: "#1a0805" }}>
                    {s.name}
                  </Typography>
                  <Box sx={{ display: "flex", gap: 0.75 }}>
                    <Box sx={{ px: "9px", py: "3px", borderRadius: 999, background: "rgba(22,163,74,0.10)", display: "flex", alignItems: "center", gap: 0.4 }}>
                      <CheckCircle size={11} color="#16a34a" weight="fill" />
                      <Typography sx={{ fontFamily: SANS, fontSize: 11, fontWeight: 700, color: "#16a34a" }}>{s.jobs} งาน</Typography>
                    </Box>
                    {s.cancelled > 0 && (
                      <Box sx={{ px: "9px", py: "3px", borderRadius: 999, background: "rgba(15, 23, 42,0.06)", display: "flex", alignItems: "center", gap: 0.4 }}>
                        <XCircle size={11} color="rgba(15, 23, 42,0.45)" />
                        <Typography sx={{ fontFamily: SANS, fontSize: 11, fontWeight: 700, color: "rgba(15, 23, 42,0.45)" }}>{s.cancelled} ยกเลิก</Typography>
                      </Box>
                    )}
                  </Box>
                </Box>

                {/* money breakdown */}
                <Box sx={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 0.5, p: "10px 12px", borderRadius: "12px", background: "#EDE8E4", mb: 1.5 }}>
                  {[
                    { label: "รับทั้งหมด", value: thb(s.serviceTotal), highlight: false },
                    { label: "Taxi",       value: thb(s.taxiTotal),    highlight: false },
                    { label: "Shop 40%",   value: thb(s.shop),         highlight: false },
                    { label: "จ่ายนวด 60%", value: thb(s.worker),    highlight: true  },
                  ].map((c) => (
                    <Box key={c.label} sx={{ textAlign: "center" }}>
                      <Typography sx={{ fontFamily: SANS, fontSize: 9.5, fontWeight: 700, color: "rgba(15, 23, 42,0.45)", letterSpacing: "0.05em", textTransform: "uppercase", mb: 0.3 }}>
                        {c.label}
                      </Typography>
                      <Typography sx={{ fontFamily: SERIF, fontSize: { xs: 13, sm: 14 }, fontWeight: 700, color: c.highlight ? "#B4000A" : "#1a0805" }}>
                        {c.value}
                      </Typography>
                    </Box>
                  ))}
                </Box>

                {/* actions */}
                <Box sx={{ display: "flex", gap: 1 }}>
                  <motion.button
                    whileTap={{ scale: 0.93 }}
                    onClick={() => setPreview(s)}
                    style={{
                      flex: 1, height: 36, borderRadius: 999,
                      background: "rgba(15, 23, 42,0.05)", border: "1px solid rgba(15,23,42,0.08)",
                      fontFamily: SANS, fontSize: 12, fontWeight: 600, color: "rgba(15, 23, 42,0.60)",
                      cursor: "pointer",
                    }}
                  >
                    ดูสลิป
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.93 }}
                    onClick={() => void exportOne(s)}
                    style={{
                      flex: 1, height: 36, borderRadius: 999,
                      background: "#B4000A", border: "none",
                      fontFamily: SANS, fontSize: 12, fontWeight: 700, color: "#fff",
                      cursor: "pointer", boxShadow: "0 3px 10px rgba(248, 248, 248, 0.25)",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                    }}
                  >
                    <Export size={13} /> Excel
                  </motion.button>
                </Box>
              </Box>
            </Box>
          </motion.div>
        ))}
      </Box>

      {/* ── comparison table dialog ─────────────────────────────────── */}
      <Dialog
        open={showTable}
        onClose={() => setShowTable(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: "20px", overflow: "hidden", m: { xs: 1, sm: 2 } } }}
      >
        <Box sx={{ background: "#1A0805", px: 3, pt: 3, pb: 2.5 }}>
          <Typography sx={{ fontFamily: SANS, fontSize: 10.5, fontWeight: 700, color: "rgba(255,255,255,0.40)", letterSpacing: "0.1em", textTransform: "uppercase", mb: 0.5 }}>
            เปรียบเทียบรายได้
          </Typography>
          <Typography sx={{ fontFamily: SERIF, fontSize: 20, fontWeight: 700, color: "#fff" }}>
            พนักงานทุกคน
          </Typography>
          <Typography sx={{ fontFamily: SANS, fontSize: 12, color: "rgba(255,255,255,0.40)", mt: 0.3 }}>
            {periodLabel} · {visible.length} คน
          </Typography>
          <Box sx={{ display: "flex", gap: 1, mt: 2, p: 1.5, borderRadius: "14px", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.08)" }}>
            {[
              { label: "งานรวม",      value: String(totals.jobs)  },
              { label: "รายได้รวม",   value: thb(totals.service)  },
              { label: "จ่ายนวดรวม", value: thb(totals.worker)   },
              { label: "ร้านได้รวม", value: thb(totals.shop)     },
            ].map((s, i) => (
              <Box key={i} sx={{ flex: 1, textAlign: "center", borderRight: i < 3 ? "1px solid rgba(255,255,255,0.08)" : "none" }}>
                <Typography sx={{ fontFamily: SERIF, fontSize: 15, fontWeight: 700, color: "#fff", lineHeight: 1 }}>{s.value}</Typography>
                <Typography sx={{ fontFamily: SANS, fontSize: 9.5, color: "rgba(255,255,255,0.38)", mt: 0.3, textTransform: "uppercase", letterSpacing: "0.06em" }}>{s.label}</Typography>
              </Box>
            ))}
          </Box>
        </Box>

        <DialogContent sx={{ p: 0, overflow: "auto" }}>
          <Box sx={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: SANS }}>
              <thead>
                <tr style={{ background: "#F7F3F1", borderBottom: "2px solid #EDE8E4" }}>
                  {[
                    { label: "#",          align: "center" as const },
                    { label: "พนักงาน",    align: "left"   as const },
                    { label: "งาน",        align: "center" as const },
                    { label: "ยกเลิก",     align: "center" as const },
                    { label: "ค่าบริการ",  align: "right"  as const },
                    { label: "Taxi",        align: "right"  as const },
                    { label: "ร้าน 40%",   align: "right"  as const },
                    { label: "นวด 60%",    align: "right"  as const },
                    { label: "% ของรวม",   align: "center" as const },
                  ].map((h) => (
                    <th key={h.label} style={{ padding: "10px 14px", textAlign: h.align, fontFamily: SANS, fontSize: 10.5, fontWeight: 700, color: "rgba(15, 23, 42,0.50)", letterSpacing: "0.06em", textTransform: "uppercase", whiteSpace: "nowrap" }}>
                      {h.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.map((s, i) => {
                  const pct  = totals.service > 0 ? ((s.serviceTotal / totals.service) * 100).toFixed(1) : "0.0";
                  const barW = totals.service > 0 ? (s.serviceTotal / totals.service) * 100 : 0;
                  return (
                    <tr key={s.key} style={{ borderBottom: "1px solid #F0EBE8", background: i % 2 === 0 ? "#fff" : "#FAFAF8" }}>
                      <td style={{ padding: "10px 14px", textAlign: "center", fontSize: 12, color: "rgba(15, 23, 42,0.30)", fontWeight: 600 }}>{i + 1}</td>
                      <td style={{ padding: "10px 14px" }}>
                        <Typography sx={{ fontFamily: SERIF, fontSize: 14, fontWeight: 700, color: "#1a0805" }}>{s.name}</Typography>
                      </td>
                      <td style={{ padding: "10px 14px", textAlign: "center" }}>
                        <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.4, px: "8px", py: "3px", borderRadius: 999, background: "rgba(22,163,74,0.09)" }}>
                          <CheckCircle size={11} color="#16a34a" weight="fill" />
                          <Typography sx={{ fontFamily: SANS, fontSize: 12, fontWeight: 700, color: "#16a34a" }}>{s.jobs}</Typography>
                        </Box>
                      </td>
                      <td style={{ padding: "10px 14px", textAlign: "center" }}>
                        {s.cancelled > 0
                          ? <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.4, px: "8px", py: "3px", borderRadius: 999, background: "rgba(180,0,10,0.07)" }}>
                              <XCircle size={11} color="#B4000A" />
                              <Typography sx={{ fontFamily: SANS, fontSize: 12, fontWeight: 700, color: "#B4000A" }}>{s.cancelled}</Typography>
                            </Box>
                          : <Typography sx={{ fontFamily: SANS, fontSize: 12, color: "rgba(15, 23, 42,0.25)" }}>—</Typography>}
                      </td>
                      <td style={{ padding: "10px 14px", textAlign: "right" }}>
                        <Typography sx={{ fontFamily: SERIF, fontSize: 13, fontWeight: 600, color: "#1a0805" }}>{thb(s.serviceTotal)}</Typography>
                      </td>
                      <td style={{ padding: "10px 14px", textAlign: "right" }}>
                        <Typography sx={{ fontFamily: SANS, fontSize: 12, color: "rgba(15, 23, 42,0.55)" }}>{thb(s.taxiTotal)}</Typography>
                      </td>
                      <td style={{ padding: "10px 14px", textAlign: "right" }}>
                        <Typography sx={{ fontFamily: SANS, fontSize: 13, fontWeight: 600, color: "#7c3aed" }}>{thb(s.shop)}</Typography>
                      </td>
                      <td style={{ padding: "10px 14px", textAlign: "right" }}>
                        <Typography sx={{ fontFamily: SERIF, fontSize: 14, fontWeight: 800, color: "#B4000A" }}>{thb(s.worker)}</Typography>
                      </td>
                      <td style={{ padding: "10px 20px", minWidth: 110 }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <Box sx={{ flex: 1, height: 6, borderRadius: 999, background: "#EDE8E4", overflow: "hidden" }}>
                            <Box sx={{ width: `${barW}%`, height: "100%", background: "#B4000A", borderRadius: 999 }} />
                          </Box>
                          <Typography sx={{ fontFamily: SANS, fontSize: 11, fontWeight: 700, color: "rgba(15, 23, 42,0.55)", minWidth: 34, textAlign: "right" }}>{pct}%</Typography>
                        </Box>
                      </td>
                    </tr>
                  );
                })}
                {/* totals row */}
                <tr style={{ background: "#F7F3F1", borderTop: "2px solid #EDE8E4" }}>
                  <td colSpan={2} style={{ padding: "12px 14px", fontFamily: SANS, fontSize: 12, fontWeight: 700, color: "rgba(15, 23, 42,0.60)" }}>รวมทั้งหมด</td>
                  <td style={{ padding: "12px 14px", textAlign: "center" }}>
                    <Typography sx={{ fontFamily: SANS, fontSize: 13, fontWeight: 800, color: "#16a34a" }}>{totals.jobs}</Typography>
                  </td>
                  <td />
                  <td style={{ padding: "12px 14px", textAlign: "right" }}>
                    <Typography sx={{ fontFamily: SERIF, fontSize: 14, fontWeight: 800, color: "#1a0805" }}>{thb(totals.service)}</Typography>
                  </td>
                  <td style={{ padding: "12px 14px", textAlign: "right" }}>
                    <Typography sx={{ fontFamily: SANS, fontSize: 13, fontWeight: 700, color: "rgba(15, 23, 42,0.55)" }}>{thb(totals.taxi)}</Typography>
                  </td>
                  <td style={{ padding: "12px 14px", textAlign: "right" }}>
                    <Typography sx={{ fontFamily: SERIF, fontSize: 14, fontWeight: 800, color: "#7c3aed" }}>{thb(totals.shop)}</Typography>
                  </td>
                  <td style={{ padding: "12px 14px", textAlign: "right" }}>
                    <Typography sx={{ fontFamily: SERIF, fontSize: 15, fontWeight: 800, color: "#B4000A" }}>{thb(totals.worker)}</Typography>
                  </td>
                  <td style={{ padding: "12px 14px" }}>
                    <Box sx={{ width: "100%", height: 6, borderRadius: 999, background: "#B4000A" }} />
                  </td>
                </tr>
              </tbody>
            </table>
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2.5, pt: 1.5, gap: 1, borderTop: "1px solid #EDE8E4" }}>
          <Button onClick={() => setShowTable(false)} sx={{ borderRadius: 999, fontFamily: SANS, fontSize: 13, textTransform: "none", color: "rgba(15, 23, 42,0.45)" }}>
            ปิด
          </Button>
          <motion.button
            whileTap={{ scale: 0.93 }}
            onClick={() => { void exportAll(); setShowTable(false); }}
            style={{
              height: 40, padding: "0 20px", borderRadius: 999,
              background: "#B4000A", border: "none",
              fontFamily: SANS, fontSize: 13, fontWeight: 700, color: "#fff",
              cursor: "pointer", boxShadow: "0 4px 12px rgba(15, 23, 42, 0.28)",
              display: "flex", alignItems: "center", gap: 6,
            }}
          >
            <Export size={14} /> Export Excel
          </motion.button>
        </DialogActions>
      </Dialog>

      {/* ── bill preview dialog ──────────────────────────────────────── */}
      <Dialog
        open={!!preview}
        onClose={() => setPreview(null)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: "20px", overflow: "hidden" } }}
      >
        {preview && (
          <>
            {/* hero strip */}
            <Box sx={{ background: "#1A0805", px: 3, pt: 3, pb: 2.5 }}>
              <Typography sx={{ fontFamily: SANS, fontSize: 10.5, fontWeight: 700, color: "rgba(255,255,255,0.40)", letterSpacing: "0.1em", textTransform: "uppercase", mb: 0.5 }}>
                สลิปค่าแรง
              </Typography>
              <Typography sx={{ fontFamily: SERIF, fontSize: 22, fontWeight: 700, color: "#fff" }}>
                {preview.name}
              </Typography>
              <Typography sx={{ fontFamily: SANS, fontSize: 12, color: "rgba(255,255,255,0.40)", mt: 0.3 }}>
                {periodLabel}
              </Typography>
              <Box sx={{ display: "flex", gap: 1, mt: 2, p: 1.5, borderRadius: "14px", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.08)" }}>
                {[
                  { label: "งาน",       value: String(preview.jobs) },
                  { label: "รับรวม",    value: thb(preview.serviceTotal) },
                  { label: "จ่ายนวด",  value: thb(preview.worker) },
                ].map((s, i) => (
                  <Box key={i} sx={{ flex: 1, textAlign: "center", borderRight: i < 2 ? "1px solid rgba(255,255,255,0.08)" : "none" }}>
                    <Typography sx={{ fontFamily: SERIF, fontSize: 17, fontWeight: 700, color: i === 2 ? "#D62828" : "#fff", lineHeight: 1 }}>{s.value}</Typography>
                    <Typography sx={{ fontFamily: SANS, fontSize: 10, color: "rgba(255,255,255,0.38)", mt: 0.3, textTransform: "uppercase", letterSpacing: "0.06em" }}>{s.label}</Typography>
                  </Box>
                ))}
              </Box>
            </Box>

            <DialogContent sx={{ px: 3, py: 2 }}>
              {[
                { label: "ค่าบริการรวม",       value: thb(preview.serviceTotal) },
                { label: "Taxi รวม",           value: thb(preview.taxiTotal) },
                { label: "ร้านได้ (40%)",       value: thb(preview.shop),    color: "rgba(15, 23, 42,0.55)" },
                { label: "จ่ายนวด (60%)",      value: thb(preview.worker),  color: "#B4000A", bold: true },
                ...(preview.cancelled > 0 ? [{ label: "ยกเลิก", value: `${preview.cancelled} ครั้ง`, color: "rgba(15, 23, 42,0.40)" }] : []),
              ].map((row) => (
                <Box key={row.label} sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", py: 0.75, borderBottom: "1px solid rgba(15,23,42,0.05)" }}>
                  <Typography sx={{ fontFamily: SANS, fontSize: 13, color: "rgba(15, 23, 42,0.55)" }}>{row.label}</Typography>
                  <Typography sx={{ fontFamily: SERIF, fontSize: 15, fontWeight: (row as any).bold ? 800 : 600, color: (row as any).color || "#1a0805" }}>{row.value}</Typography>
                </Box>
              ))}
            </DialogContent>

            <DialogActions sx={{ px: 3, pb: 2.5, pt: 0, gap: 1 }}>
              <Button onClick={() => setPreview(null)} sx={{ borderRadius: 999, fontFamily: SANS, fontSize: 13, textTransform: "none", color: "rgba(15, 23, 42,0.45)" }}>
                ปิด
              </Button>
              <motion.button
                whileTap={{ scale: 0.93 }}
                onClick={() => { void exportOne(preview); setPreview(null); }}
                style={{
                  height: 40, padding: "0 20px", borderRadius: 999,
                  background: "#B4000A", border: "none",
                  fontFamily: SANS, fontSize: 13, fontWeight: 700, color: "#fff",
                  cursor: "pointer", boxShadow: "0 4px 12px rgba(15, 23, 42, 0.28)",
                  display: "flex", alignItems: "center", gap: 6,
                }}
              >
                <Export size={14} /> Download
              </motion.button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
};

export default AdminReportPage;
