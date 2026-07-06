// src/pages/admin/AdminReportPage.tsx
//
// 🆕 Round 28c20 (founder 2026-05-06) — focused rewrite.
//   Core use case: จ่ายค่าแรงนวดแต่ละคน.
//   Filter → totals → per-therapist pay cards → export.
//
// 🆕 Round 28s247 (audit) — two correctness fixes + Ocean Study restyle:
//   1. PAYROLL MATH now uses the shared `@/utils/commission` tier-aware split
//      (65% Gentleman's / 70% B2B, on the post-discount price), identical to
//      AdminEarningsPage. Was flat 60/40 over full price → premium therapists
//      were under-paid and discounted bookings over-paid on this very page
//      View uses to hand out wages.
//   2. EXCLUDED STATUSES now the full set {cancelled, canceled, refunded,
//      failed, rejected, no_show} — was only the exact string "cancelled", so
//      refunds / no-shows / pending / US-spelling "canceled" were all being
//      counted as payable jobs.
//   Plus: brought onto the shared Ocean Study light tokens (was still the old
//   #1A2B2E/#B4000A brand theme with a stray #7c3aed purple + a near-white
//   invisible button shadow).

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
import { adminColor, adminFont, adminFigureSx } from "@/theme/adminTheme";
import {
  isPayrollExcluded, therapistPayoutFor, commissionBaseFor,
} from "@/utils/commission";

const SANS  = adminFont.sans;
const SERIF = adminFont.serif;

// ── types ─────────────────────────────────────────────────────────────
type FBTS = Timestamp | { seconds: number } | Date | string | null | undefined;

interface Booking {
  id: string;
  therapistId?: string;
  therapistName?: string;
  serviceId?: string;        // 🆕 28s247 — needed for the tier-aware split
  serviceName?: string;
  servicePrice?: number;
  discountAmount?: number;   // 🆕 28s247 — commission is on the post-discount price
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
  serviceTotal: number;   // gross service revenue (pre-discount)
  discountTotal: number;  // promo absorbed on this therapist's jobs
  taxiTotal: number;
  worker: number;         // tier-aware payout on post-discount price
  shop: number;           // shop's share of the post-discount service revenue
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
      if (!map.has(k)) map.set(k, { key: k, name, jobs: 0, cancelled: 0, serviceTotal: 0, discountTotal: 0, taxiTotal: 0, worker: 0, shop: 0, bookings: [] });
      const r = map.get(k)!;
      r.bookings.push(b);
      // 🆕 28s247 — full excluded-status set, not just the exact "cancelled".
      if (isPayrollExcluded(b.status)) { r.cancelled++; continue; }
      const svc  = b.servicePrice || 0;
      const disc = b.discountAmount || 0;
      const base = commissionBaseFor(b);   // max(0, svc - disc)
      const pay  = therapistPayoutFor(b);  // tier % × base — matches Earnings
      r.jobs++;
      r.serviceTotal  += svc;
      r.discountTotal += disc;
      r.taxiTotal     += b.taxiFee || 0;
      r.worker        += pay;
      r.shop          += base - pay;       // shop's share of net service revenue
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
      .filter((b) => !isPayrollExcluded(b.status))
      .map((b) => ({
        Date:         dayjs(toDate(b.createdAt) || new Date()).format("YYYY-MM-DD"),
        Service:      b.serviceName || "",
        "Service ฿":  b.servicePrice || 0,
        "Discount ฿": b.discountAmount || 0,
        "Taxi ฿":     b.taxiFee || 0,
        "Pay ฿":      therapistPayoutFor(b),
        "Total ฿":    b.totalPrice ?? (b.servicePrice || 0) + (b.taxiFee || 0),
      }));
    const summary = { Jobs: s.jobs, Cancelled: s.cancelled, "Service Total": s.serviceTotal, "Discount Total": s.discountTotal, "Taxi Total": s.taxiTotal, "Therapist Pay": s.worker, "Shop Share": s.shop };
    return [...detailRows, {}, summary];
  };

  const exportOne = (s: TherapistSummary) =>
    ExportMultiSheetExcel([{ name: s.name, rows: buildSheet(s) }], `pay_${s.name}_${start.format("YYYYMM")}.xlsx`);

  const exportAll = () => {
    const sheets: SheetSpec[] = [
      { name: "Summary", rows: [{ Period: `${start.format("D MMM")} – ${end.format("D MMM YYYY")}`, TotalJobs: totals.jobs, ServiceTotal: totals.service, TherapistPay: totals.worker, ShopShare: totals.shop }] },
      ...visible.map((s) => ({ name: s.name, rows: buildSheet(s) })),
    ];
    return ExportMultiSheetExcel(sheets, `report_${start.format("YYYYMM")}.xlsx`);
  };

  const periodLabel = `${start.format("D MMM")} – ${end.format("D MMM YYYY")}`;

  return (
    <Box sx={{ fontFamily: SANS, minHeight: "100vh", background: adminColor.bg, pb: 12 }}>

      {/* ── header ──────────────────────────────────────────────────── */}
      <Box
        sx={{
          background: adminColor.bg,
          px: { xs: 2, md: 3 }, pt: 3, pb: 2.5,
          display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 2, flexWrap: "wrap",
        }}
      >
        <Box>
          <Typography sx={{ fontFamily: SERIF, fontSize: { xs: 22, md: 26 }, fontWeight: 600, color: adminColor.text, letterSpacing: "-0.01em" }}>
            Reports
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mt: 0.4 }}>
            <CalendarBlank size={12} color={adminColor.dim} />
            <Typography sx={{ fontFamily: SANS, fontSize: 12, color: adminColor.muted }}>{periodLabel}</Typography>
          </Box>
        </Box>
        <Box sx={{ display: "flex", gap: 1 }}>
          <motion.button
            whileTap={{ scale: 0.93 }}
            onClick={() => setShowTable(true)}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              height: 36, padding: "0 14px", borderRadius: 999,
              background: adminColor.panel, border: `1px solid ${adminColor.line2}`,
              color: adminColor.text, fontFamily: SANS, fontSize: 13, fontWeight: 600, cursor: "pointer",
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
              background: adminColor.accent, border: "none",
              color: "#fff", fontFamily: SANS, fontSize: 13, fontWeight: 700, cursor: "pointer",
            }}
          >
            <Export size={14} /> Export All
          </motion.button>
        </Box>
      </Box>

      {/* ── filter bar ──────────────────────────────────────────────── */}
      <Box
        sx={{
          background: adminColor.panel, borderTop: `1px solid ${adminColor.line}`, borderBottom: `1px solid ${adminColor.line}`,
          px: { xs: 2, md: 3 }, py: 1.75,
          display: "flex", gap: 1.25, flexWrap: "wrap", alignItems: "center",
          "& .MuiInputBase-root": { color: adminColor.text },
          "& .MuiInputLabel-root": { color: adminColor.muted },
          "& .MuiOutlinedInput-notchedOutline": { borderColor: adminColor.line2 },
          "& .MuiSvgIcon-root": { color: adminColor.muted },
        }}
      >
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <DatePicker label="From" value={start} onChange={(v) => v && setStart(v)}
            slotProps={{ textField: { size: "small", sx: { width: 135 } } }} />
          <DatePicker label="To"   value={end}   onChange={(v) => v && setEnd(v)}
            slotProps={{ textField: { size: "small", sx: { width: 135 } } }} />
        </LocalizationProvider>
        <Select size="small" value={filter} onChange={(e) => setFilter(e.target.value)} sx={{ minWidth: 160, fontSize: 13 }}
          MenuProps={{ PaperProps: { sx: { background: adminColor.panel2, color: adminColor.text, borderRadius: "12px" } } }}>
          <MenuItem value="__ALL__">All therapists</MenuItem>
          {summaries.map((s) => <MenuItem key={s.key} value={s.key}>{s.name}</MenuItem>)}
        </Select>
        {loading && <CircularProgress size={16} sx={{ color: adminColor.accent }} />}
      </Box>

      <Box sx={{ px: { xs: 2, md: 3 }, pt: 2.5, display: "flex", flexDirection: "column", gap: 2 }}>

        {/* ── period totals ────────────────────────────────────────────── */}
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", sm: "repeat(4,1fr)" }, gap: 1.25 }}>
          {[
            { icon: <User      size={16} weight="duotone" />, label: "Pay Workers",  value: thb(totals.worker), accent: true  },
            { icon: <Buildings size={16} weight="duotone" />, label: "Shop Share",    value: thb(totals.shop),   accent: false },
            { icon: <Taxi      size={16} weight="duotone" />, label: "Taxi",          value: thb(totals.taxi),   accent: false },
            { icon: <CalendarBlank size={16} weight="duotone" />, label: "Jobs Done", value: String(totals.jobs), accent: false },
          ].map((c) => (
            <Box key={c.label} sx={{ borderRadius: "14px", background: c.accent ? adminColor.accent : adminColor.panel, border: c.accent ? "none" : `1px solid ${adminColor.line}`, p: "14px 16px", boxShadow: c.accent ? "0 6px 16px rgba(78,126,140,0.25)" : "0 1px 2px rgba(31,41,51,0.04)" }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 0.75, color: c.accent ? "rgba(255,255,255,0.85)" : adminColor.muted }}>
                {c.icon}
                <Typography sx={{ fontFamily: SANS, fontSize: 10.5, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "inherit" }}>{c.label}</Typography>
              </Box>
              <Typography sx={{ ...adminFigureSx, fontSize: 20, color: c.accent ? "#fff" : adminColor.text, lineHeight: 1 }}>
                {c.value}
              </Typography>
            </Box>
          ))}
        </Box>

        {/* ── per-therapist pay cards ─────────────────────────────────── */}
        <Typography sx={{ fontFamily: SANS, fontSize: 11, fontWeight: 700, color: adminColor.muted, letterSpacing: "0.1em", textTransform: "uppercase" }}>
          Pay per therapist — {visible.length} staff
        </Typography>

        {visible.length === 0 && !loading && (
          <Box sx={{ textAlign: "center", py: 6 }}>
            <Typography sx={{ fontFamily: SANS, fontSize: 13, color: adminColor.dim }}>No bookings in this period</Typography>
          </Box>
        )}

        {visible.map((s, i) => (
          <motion.div key={s.key} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Box sx={{ borderRadius: "18px", background: adminColor.panel, border: `1px solid ${adminColor.line}`, overflow: "hidden", boxShadow: "0 1px 2px rgba(31,41,51,0.04), 0 6px 16px rgba(31,41,51,0.07)" }}>
              {/* stripe */}
              <Box sx={{ height: 3, background: adminColor.accent }} />

              <Box sx={{ p: "14px 16px" }}>
                {/* name + badges */}
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5 }}>
                  <Typography sx={{ fontFamily: SERIF, fontSize: 16, fontWeight: 600, color: adminColor.text }}>
                    {s.name}
                  </Typography>
                  <Box sx={{ display: "flex", gap: 0.75 }}>
                    <Box sx={{ px: "9px", py: "3px", borderRadius: 999, background: `${adminColor.green}1A`, display: "flex", alignItems: "center", gap: 0.4 }}>
                      <CheckCircle size={11} color={adminColor.green} weight="fill" />
                      <Typography sx={{ fontFamily: SANS, fontSize: 11, fontWeight: 700, color: adminColor.green }}>{s.jobs} งาน</Typography>
                    </Box>
                    {s.cancelled > 0 && (
                      <Box sx={{ px: "9px", py: "3px", borderRadius: 999, background: adminColor.panel2, display: "flex", alignItems: "center", gap: 0.4 }}>
                        <XCircle size={11} color={adminColor.dim} />
                        <Typography sx={{ fontFamily: SANS, fontSize: 11, fontWeight: 700, color: adminColor.dim }}>{s.cancelled} ยกเลิก</Typography>
                      </Box>
                    )}
                  </Box>
                </Box>

                {/* money breakdown */}
                <Box sx={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 0.5, p: "10px 12px", borderRadius: "12px", background: adminColor.panel2, mb: 1.5 }}>
                  {[
                    { label: "รับทั้งหมด", value: thb(s.serviceTotal), highlight: false },
                    { label: "Taxi",       value: thb(s.taxiTotal),    highlight: false },
                    { label: "ส่วนร้าน",   value: thb(s.shop),         highlight: false },
                    { label: "จ่ายนวด",    value: thb(s.worker),       highlight: true  },
                  ].map((c) => (
                    <Box key={c.label} sx={{ textAlign: "center" }}>
                      <Typography sx={{ fontFamily: SANS, fontSize: 9.5, fontWeight: 700, color: adminColor.muted, letterSpacing: "0.05em", textTransform: "uppercase", mb: 0.3 }}>
                        {c.label}
                      </Typography>
                      <Typography sx={{ ...adminFigureSx, fontSize: { xs: 13, sm: 14 }, color: c.highlight ? adminColor.accent : adminColor.text }}>
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
                      background: adminColor.panel2, border: `1px solid ${adminColor.line2}`,
                      fontFamily: SANS, fontSize: 12, fontWeight: 600, color: adminColor.muted,
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
                      background: adminColor.accent, border: "none",
                      fontFamily: SANS, fontSize: 12, fontWeight: 700, color: "#fff",
                      cursor: "pointer", boxShadow: "0 3px 10px rgba(78,126,140,0.25)",
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
        PaperProps={{ sx: { borderRadius: "20px", overflow: "hidden", m: { xs: 1, sm: 2 }, background: adminColor.panel } }}
      >
        <Box sx={{ background: adminColor.panel2, px: 3, pt: 3, pb: 2.5, borderBottom: `1px solid ${adminColor.line}` }}>
          <Typography sx={{ fontFamily: SANS, fontSize: 10.5, fontWeight: 700, color: adminColor.muted, letterSpacing: "0.1em", textTransform: "uppercase", mb: 0.5 }}>
            เปรียบเทียบรายได้
          </Typography>
          <Typography sx={{ fontFamily: SERIF, fontSize: 20, fontWeight: 600, color: adminColor.text }}>
            พนักงานทุกคน
          </Typography>
          <Typography sx={{ fontFamily: SANS, fontSize: 12, color: adminColor.muted, mt: 0.3 }}>
            {periodLabel} · {visible.length} คน
          </Typography>
          <Box sx={{ display: "flex", gap: 1, mt: 2, p: 1.5, borderRadius: "14px", background: adminColor.panel, border: `1px solid ${adminColor.line}` }}>
            {[
              { label: "งานรวม",      value: String(totals.jobs)  },
              { label: "รายได้รวม",   value: thb(totals.service)  },
              { label: "จ่ายนวดรวม", value: thb(totals.worker)   },
              { label: "ร้านได้รวม", value: thb(totals.shop)     },
            ].map((s, i) => (
              <Box key={i} sx={{ flex: 1, textAlign: "center", borderRight: i < 3 ? `1px solid ${adminColor.line}` : "none" }}>
                <Typography sx={{ ...adminFigureSx, fontSize: 15, color: adminColor.text, lineHeight: 1 }}>{s.value}</Typography>
                <Typography sx={{ fontFamily: SANS, fontSize: 9.5, color: adminColor.dim, mt: 0.3, textTransform: "uppercase", letterSpacing: "0.06em" }}>{s.label}</Typography>
              </Box>
            ))}
          </Box>
        </Box>

        <DialogContent sx={{ p: 0, overflow: "auto" }}>
          <Box sx={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: SANS }}>
              <thead>
                <tr style={{ background: adminColor.panel2, borderBottom: `2px solid ${adminColor.line}` }}>
                  {[
                    { label: "#",          align: "center" as const },
                    { label: "พนักงาน",    align: "left"   as const },
                    { label: "งาน",        align: "center" as const },
                    { label: "ยกเลิก",     align: "center" as const },
                    { label: "ค่าบริการ",  align: "right"  as const },
                    { label: "Taxi",        align: "right"  as const },
                    { label: "ส่วนร้าน",   align: "right"  as const },
                    { label: "จ่ายนวด",    align: "right"  as const },
                    { label: "% ของรวม",   align: "center" as const },
                  ].map((h) => (
                    <th key={h.label} style={{ padding: "10px 14px", textAlign: h.align, fontFamily: SANS, fontSize: 10.5, fontWeight: 700, color: adminColor.muted, letterSpacing: "0.06em", textTransform: "uppercase", whiteSpace: "nowrap" }}>
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
                    <tr key={s.key} style={{ borderBottom: `1px solid ${adminColor.line}`, background: i % 2 === 0 ? adminColor.panel : adminColor.panel2 }}>
                      <td style={{ padding: "10px 14px", textAlign: "center", fontSize: 12, color: adminColor.dim, fontWeight: 600 }}>{i + 1}</td>
                      <td style={{ padding: "10px 14px" }}>
                        <Typography sx={{ fontFamily: SERIF, fontSize: 14, fontWeight: 600, color: adminColor.text }}>{s.name}</Typography>
                      </td>
                      <td style={{ padding: "10px 14px", textAlign: "center" }}>
                        <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.4, px: "8px", py: "3px", borderRadius: 999, background: `${adminColor.green}17` }}>
                          <CheckCircle size={11} color={adminColor.green} weight="fill" />
                          <Typography sx={{ fontFamily: SANS, fontSize: 12, fontWeight: 700, color: adminColor.green }}>{s.jobs}</Typography>
                        </Box>
                      </td>
                      <td style={{ padding: "10px 14px", textAlign: "center" }}>
                        {s.cancelled > 0
                          ? <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.4, px: "8px", py: "3px", borderRadius: 999, background: `${adminColor.red}12` }}>
                              <XCircle size={11} color={adminColor.red} />
                              <Typography sx={{ fontFamily: SANS, fontSize: 12, fontWeight: 700, color: adminColor.red }}>{s.cancelled}</Typography>
                            </Box>
                          : <Typography sx={{ fontFamily: SANS, fontSize: 12, color: adminColor.dim }}>—</Typography>}
                      </td>
                      <td style={{ padding: "10px 14px", textAlign: "right" }}>
                        <Typography sx={{ ...adminFigureSx, fontWeight: 600, fontSize: 13, color: adminColor.text }}>{thb(s.serviceTotal)}</Typography>
                      </td>
                      <td style={{ padding: "10px 14px", textAlign: "right" }}>
                        <Typography sx={{ fontFamily: SANS, fontSize: 12, color: adminColor.muted }}>{thb(s.taxiTotal)}</Typography>
                      </td>
                      <td style={{ padding: "10px 14px", textAlign: "right" }}>
                        <Typography sx={{ ...adminFigureSx, fontWeight: 600, fontSize: 13, color: adminColor.dim }}>{thb(s.shop)}</Typography>
                      </td>
                      <td style={{ padding: "10px 14px", textAlign: "right" }}>
                        <Typography sx={{ ...adminFigureSx, fontSize: 14, color: adminColor.accent }}>{thb(s.worker)}</Typography>
                      </td>
                      <td style={{ padding: "10px 20px", minWidth: 110 }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <Box sx={{ flex: 1, height: 6, borderRadius: 999, background: adminColor.panel3, overflow: "hidden" }}>
                            <Box sx={{ width: `${barW}%`, height: "100%", background: adminColor.accent, borderRadius: 999 }} />
                          </Box>
                          <Typography sx={{ fontFamily: SANS, fontSize: 11, fontWeight: 700, color: adminColor.muted, minWidth: 34, textAlign: "right" }}>{pct}%</Typography>
                        </Box>
                      </td>
                    </tr>
                  );
                })}
                {/* totals row */}
                <tr style={{ background: adminColor.panel2, borderTop: `2px solid ${adminColor.line}` }}>
                  <td colSpan={2} style={{ padding: "12px 14px", fontFamily: SANS, fontSize: 12, fontWeight: 700, color: adminColor.muted }}>รวมทั้งหมด</td>
                  <td style={{ padding: "12px 14px", textAlign: "center" }}>
                    <Typography sx={{ ...adminFigureSx, fontSize: 13, color: adminColor.green }}>{totals.jobs}</Typography>
                  </td>
                  <td />
                  <td style={{ padding: "12px 14px", textAlign: "right" }}>
                    <Typography sx={{ ...adminFigureSx, fontSize: 14, color: adminColor.text }}>{thb(totals.service)}</Typography>
                  </td>
                  <td style={{ padding: "12px 14px", textAlign: "right" }}>
                    <Typography sx={{ fontFamily: SANS, fontSize: 13, fontWeight: 700, color: adminColor.muted }}>{thb(totals.taxi)}</Typography>
                  </td>
                  <td style={{ padding: "12px 14px", textAlign: "right" }}>
                    <Typography sx={{ ...adminFigureSx, fontSize: 14, color: adminColor.dim }}>{thb(totals.shop)}</Typography>
                  </td>
                  <td style={{ padding: "12px 14px", textAlign: "right" }}>
                    <Typography sx={{ ...adminFigureSx, fontSize: 15, color: adminColor.accent }}>{thb(totals.worker)}</Typography>
                  </td>
                  <td style={{ padding: "12px 14px" }}>
                    <Box sx={{ width: "100%", height: 6, borderRadius: 999, background: adminColor.accent }} />
                  </td>
                </tr>
              </tbody>
            </table>
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2.5, pt: 1.5, gap: 1, borderTop: `1px solid ${adminColor.line}` }}>
          <Button onClick={() => setShowTable(false)} sx={{ borderRadius: 999, fontFamily: SANS, fontSize: 13, textTransform: "none", color: adminColor.muted }}>
            ปิด
          </Button>
          <motion.button
            whileTap={{ scale: 0.93 }}
            onClick={() => { void exportAll(); setShowTable(false); }}
            style={{
              height: 40, padding: "0 20px", borderRadius: 999,
              background: adminColor.accent, border: "none",
              fontFamily: SANS, fontSize: 13, fontWeight: 700, color: "#fff",
              cursor: "pointer", boxShadow: "0 4px 12px rgba(78,126,140,0.28)",
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
        PaperProps={{ sx: { borderRadius: "20px", overflow: "hidden", background: adminColor.panel } }}
      >
        {preview && (
          <>
            {/* header strip */}
            <Box sx={{ background: adminColor.panel2, px: 3, pt: 3, pb: 2.5, borderBottom: `1px solid ${adminColor.line}` }}>
              <Typography sx={{ fontFamily: SANS, fontSize: 10.5, fontWeight: 700, color: adminColor.muted, letterSpacing: "0.1em", textTransform: "uppercase", mb: 0.5 }}>
                สลิปค่าแรง
              </Typography>
              <Typography sx={{ fontFamily: SERIF, fontSize: 22, fontWeight: 600, color: adminColor.text }}>
                {preview.name}
              </Typography>
              <Typography sx={{ fontFamily: SANS, fontSize: 12, color: adminColor.muted, mt: 0.3 }}>
                {periodLabel}
              </Typography>
              <Box sx={{ display: "flex", gap: 1, mt: 2, p: 1.5, borderRadius: "14px", background: adminColor.panel, border: `1px solid ${adminColor.line}` }}>
                {[
                  { label: "งาน",       value: String(preview.jobs) },
                  { label: "รับรวม",    value: thb(preview.serviceTotal) },
                  { label: "จ่ายนวด",  value: thb(preview.worker) },
                ].map((s, i) => (
                  <Box key={i} sx={{ flex: 1, textAlign: "center", borderRight: i < 2 ? `1px solid ${adminColor.line}` : "none" }}>
                    <Typography sx={{ ...adminFigureSx, fontSize: 17, color: i === 2 ? adminColor.accent : adminColor.text, lineHeight: 1 }}>{s.value}</Typography>
                    <Typography sx={{ fontFamily: SANS, fontSize: 10, color: adminColor.dim, mt: 0.3, textTransform: "uppercase", letterSpacing: "0.06em" }}>{s.label}</Typography>
                  </Box>
                ))}
              </Box>
            </Box>

            <DialogContent sx={{ px: 3, py: 2 }}>
              {[
                { label: "ค่าบริการรวม",   value: thb(preview.serviceTotal) },
                ...(preview.discountTotal > 0 ? [{ label: "ส่วนลดโปร", value: `− ${thb(preview.discountTotal)}`, color: adminColor.dim }] : []),
                { label: "Taxi รวม",       value: thb(preview.taxiTotal) },
                { label: "ร้านได้",        value: thb(preview.shop),    color: adminColor.dim },
                { label: "จ่ายนวด",        value: thb(preview.worker),  color: adminColor.accent, bold: true },
                ...(preview.cancelled > 0 ? [{ label: "ยกเลิก", value: `${preview.cancelled} ครั้ง`, color: adminColor.dim }] : []),
              ].map((row) => (
                <Box key={row.label} sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", py: 0.75, borderBottom: `1px solid ${adminColor.line}` }}>
                  <Typography sx={{ fontFamily: SANS, fontSize: 13, color: adminColor.muted }}>{row.label}</Typography>
                  <Typography sx={{ ...adminFigureSx, fontSize: 15, fontWeight: (row as any).bold ? 800 : 600, color: (row as any).color || adminColor.text }}>{row.value}</Typography>
                </Box>
              ))}
            </DialogContent>

            <DialogActions sx={{ px: 3, pb: 2.5, pt: 0, gap: 1 }}>
              <Button onClick={() => setPreview(null)} sx={{ borderRadius: 999, fontFamily: SANS, fontSize: 13, textTransform: "none", color: adminColor.muted }}>
                ปิด
              </Button>
              <motion.button
                whileTap={{ scale: 0.93 }}
                onClick={() => { void exportOne(preview); setPreview(null); }}
                style={{
                  height: 40, padding: "0 20px", borderRadius: 999,
                  background: adminColor.accent, border: "none",
                  fontFamily: SANS, fontSize: 13, fontWeight: 700, color: "#fff",
                  cursor: "pointer", boxShadow: "0 4px 12px rgba(78,126,140,0.28)",
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
