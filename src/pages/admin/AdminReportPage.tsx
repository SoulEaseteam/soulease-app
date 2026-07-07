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
  collection, query, where, orderBy, onSnapshot, Timestamp, getDocs,
} from "firebase/firestore";
import { therapistKey, buildRosterIndex, type RosterEntry } from "@/utils/therapistIdentity";
import dayjs, { Dayjs } from "dayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { ExportMultiSheetExcel, type SheetSpec } from "@/utils/exportTools";
import {
  Export, CalendarBlank, Buildings, User, Taxi, XCircle, CheckCircle, Table,
  Coins, ChartBar,
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

  // 🆕 Round 28s324 — therapist roster (canonical id+name), so booking rows
  //   that stored a variant id/casing resolve to one clean label.
  const [rosterIdx, setRosterIdx] = useState<Map<string, RosterEntry>>(new Map());
  useEffect(() => {
    void getDocs(collection(db, "therapists")).then((snap) => {
      const roster: RosterEntry[] = snap.docs.map((d) => ({
        id: d.id,
        name: (d.data().name as string) ?? d.id,
      }));
      setRosterIdx(buildRosterIndex(roster));
    });
  }, []);

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
      // 🆕 Round 28s324 — group by normalized name key (merges variant ids /
      //   casing for the same person → no more "Yuri" twice); prefer the
      //   canonical roster name for display.
      const k    = therapistKey(b.therapistName, b.therapistId);
      const name = rosterIdx.get(k)?.name || b.therapistName || "Unknown";
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
  }, [rows, rosterIdx]);

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
          <Typography sx={{ fontFamily: SERIF, fontSize: { xs: 22, md: 26 }, fontWeight: 600, color: adminColor.text, letterSpacing: "-0.01em", lineHeight: 1 }}>
            Reports
          </Typography>
          <Typography sx={{ fontFamily: SANS, fontSize: 11, color: adminColor.dim, mt: 0.4, letterSpacing: "0.02em" }}>
            รายงาน
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
            <Table size={14} /> Table · ตาราง
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
            <Export size={14} /> Download Excel · ทั้งหมด
          </motion.button>
        </Box>
      </Box>

      {/* ── 🆕 Round 28r42 — TOTAL PAYROLL HERO CARD.
           Same DNA as AdminDashboardPage's "Lifetime Revenue" hero
           (r35/r36): gradient bg, dual radial glows, Coins eyebrow,
           60px accent-gradient plate, 36–44px hero figure, 3-column
           split.  Zero data-logic change — reuses the SAME totals
           the per-therapist breakdown already computes via the shared
           therapistPayoutFor / commissionBaseFor helpers from
           @/utils/commission (no separate math path). */}
      <Box sx={{ px: { xs: 2, md: 3 } }}>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 }}>
          <Box
            sx={{
              mt: 2.25,
              borderRadius: "22px",
              background: `linear-gradient(135deg, ${adminColor.accent}26 0%, ${adminColor.panel} 55%, ${adminColor.panel} 100%)`,
              border: `1px solid ${adminColor.accent}44`,
              boxShadow: `0 10px 32px ${adminColor.accent}1E, 0 2px 4px rgba(0,0,0,0.06)`,
              p: { xs: "20px 18px 18px", md: "26px 28px 22px" },
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* corner glow — top-right */}
            <Box
              aria-hidden
              sx={{
                position: "absolute",
                top: -60,
                right: -60,
                width: 200,
                height: 200,
                borderRadius: "50%",
                background: `radial-gradient(circle, ${adminColor.accent}30 0%, transparent 70%)`,
                pointerEvents: "none",
              }}
            />
            {/* corner glow — bottom-left, subtler */}
            <Box
              aria-hidden
              sx={{
                position: "absolute",
                bottom: -80,
                left: -80,
                width: 220,
                height: 220,
                borderRadius: "50%",
                background: `radial-gradient(circle, ${adminColor.accent}15 0%, transparent 70%)`,
                pointerEvents: "none",
              }}
            />

            {/* eyebrow — bilingual (no MoM chip: page has no prior-period
                 query and we don't fabricate a delta) */}
            <Box sx={{ mb: 1.5, position: "relative" }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                <Coins size={15} color={adminColor.accent} weight="fill" />
                <Typography sx={{ fontFamily: SANS, fontSize: 11, fontWeight: 800, color: adminColor.accent, letterSpacing: "0.14em", textTransform: "uppercase", lineHeight: 1 }}>
                  Total Payroll · Selected Period
                </Typography>
              </Box>
              <Typography sx={{ fontFamily: SANS, fontSize: 10.5, color: adminColor.dim, mt: 0.4, ml: 2.75 }}>
                จ่ายหมอนวดรวม · ช่วงเวลานี้
              </Typography>
            </Box>

            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1.6fr 1fr 1fr" }, gap: { xs: 2.5, sm: 2.5 }, alignItems: "center", position: "relative" }}>
              {/* hero payroll column */}
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <Box sx={{ width: 60, height: 60, borderRadius: "50%", background: `linear-gradient(135deg, ${adminColor.accent}, ${adminColor.accentDeep})`, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: `0 6px 18px ${adminColor.accent}66, inset 0 1px 0 rgba(255,255,255,0.28)` }}>
                  <Coins size={28} weight="duotone" />
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ ...adminFigureSx, fontSize: { xs: 36, md: 44 }, color: adminColor.text, lineHeight: 1, letterSpacing: "-0.015em" }}>
                    {thb(totals.worker)}
                  </Typography>
                  <Typography sx={{ fontFamily: SANS, fontSize: 12, fontWeight: 700, color: adminColor.muted, mt: 0.55 }}>
                    Total Paid to Therapists
                  </Typography>
                  <Typography sx={{ fontFamily: SANS, fontSize: 10, color: adminColor.dim, mt: 0.1 }}>
                    จ่ายหมอสะสม · {periodLabel}
                  </Typography>
                </Box>
              </Box>

              {/* gross service revenue */}
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, borderLeft: { sm: `1px solid ${adminColor.accent}33` }, pl: { sm: 2 } }}>
                <Box sx={{ width: 38, height: 38, borderRadius: "50%", background: `${adminColor.highlight}18`, color: adminColor.highlight, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: `inset 0 1px 0 rgba(255,255,255,0.5)` }}>
                  <ChartBar size={18} weight="duotone" />
                </Box>
                <Box>
                  <Typography sx={{ ...adminFigureSx, fontSize: { xs: 20, md: 23 }, color: adminColor.text, lineHeight: 1 }}>
                    {thb(totals.service)}
                  </Typography>
                  <Typography sx={{ fontFamily: SANS, fontSize: 10.5, fontWeight: 700, color: adminColor.muted, mt: 0.4, textTransform: "uppercase", letterSpacing: "0.06em", lineHeight: 1 }}>
                    Gross Service
                  </Typography>
                  <Typography sx={{ fontFamily: SANS, fontSize: 9.5, color: adminColor.dim, mt: 0.15 }}>
                    ค่าบริการรวม
                  </Typography>
                </Box>
              </Box>

              {/* payable jobs */}
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, borderLeft: { sm: `1px solid ${adminColor.accent}33` }, pl: { sm: 2 } }}>
                <Box sx={{ width: 38, height: 38, borderRadius: "50%", background: `${adminColor.green}18`, color: adminColor.green, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: `inset 0 1px 0 rgba(255,255,255,0.5)` }}>
                  <CheckCircle size={18} weight="duotone" />
                </Box>
                <Box>
                  <Typography sx={{ ...adminFigureSx, fontSize: { xs: 20, md: 23 }, color: adminColor.text, lineHeight: 1 }}>
                    {totals.jobs.toLocaleString()}
                  </Typography>
                  <Typography sx={{ fontFamily: SANS, fontSize: 10.5, fontWeight: 700, color: adminColor.muted, mt: 0.4, textTransform: "uppercase", letterSpacing: "0.06em", lineHeight: 1 }}>
                    Payable Jobs
                  </Typography>
                  <Typography sx={{ fontFamily: SANS, fontSize: 9.5, color: adminColor.dim, mt: 0.15 }}>
                    งานที่จ่าย
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Box>
        </motion.div>
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
          <DatePicker label="From · ตั้งแต่" value={start} onChange={(v) => v && setStart(v)}
            slotProps={{ textField: { size: "small", sx: { width: 160 } } }} />
          <DatePicker label="To · ถึง"   value={end}   onChange={(v) => v && setEnd(v)}
            slotProps={{ textField: { size: "small", sx: { width: 160 } } }} />
        </LocalizationProvider>
        <Select size="small" value={filter} onChange={(e) => setFilter(e.target.value)} sx={{ minWidth: 200, fontSize: 13 }}
          MenuProps={{ PaperProps: { sx: { background: adminColor.panel2, color: adminColor.text, borderRadius: "12px" } } }}>
          <MenuItem value="__ALL__">All Therapists · หมอทุกคน</MenuItem>
          {summaries.map((s) => <MenuItem key={s.key} value={s.key}>{s.name}</MenuItem>)}
        </Select>
        {loading && <CircularProgress size={16} sx={{ color: adminColor.accent }} />}
      </Box>

      <Box sx={{ px: { xs: 2, md: 3 }, pt: 2.5, display: "flex", flexDirection: "column", gap: 2 }}>

        {/* ── period totals — 🆕 Round 28r42 polished:
             46px icon plates with inner highlight (Dashboard DNA),
             radius 14 → 16, micro-shadow bumped to
             `0 2px 10px rgba(31,41,51,0.04)`, hover lift + subtle
             accent bg tint on non-accent tiles. */}
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", sm: "repeat(4,1fr)" }, gap: 1.25 }}>
          {[
            { icon: User,          en: "Paid to Therapist", th: "จ่ายนวด",    value: thb(totals.worker), accent: true  },
            { icon: Buildings,     en: "Shop Take",         th: "ร้านได้",    value: thb(totals.shop),   accent: false },
            { icon: Taxi,          en: "Total Taxi",        th: "ค่าเดินทาง", value: thb(totals.taxi),   accent: false },
            { icon: CalendarBlank, en: "Jobs Done",         th: "จำนวนงาน",  value: String(totals.jobs), accent: false },
          ].map((c) => {
            const Icon = c.icon;
            return (
              <Box
                key={c.en}
                sx={{
                  borderRadius: "16px",
                  background: c.accent ? adminColor.accent : adminColor.panel,
                  border: c.accent ? "none" : `1px solid ${adminColor.line}`,
                  p: "14px 16px",
                  boxShadow: c.accent
                    ? "0 6px 16px rgba(78,126,140,0.25)"
                    : "0 2px 10px rgba(31,41,51,0.04)",
                  transition: "background 160ms, transform 160ms, box-shadow 160ms",
                  "&:hover": c.accent
                    ? {}
                    : {
                        transform: "translateY(-1px)",
                        background: `${adminColor.accent}0A`,
                        boxShadow: "0 6px 16px rgba(31,41,51,0.06)",
                      },
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, mb: 0.75 }}>
                  <Box
                    sx={{
                      width: 46,
                      height: 46,
                      borderRadius: "50%",
                      background: c.accent
                        ? "rgba(255,255,255,0.18)"
                        : `${adminColor.accent}14`,
                      color: c.accent ? "#fff" : adminColor.accent,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      boxShadow: c.accent
                        ? "inset 0 1px 0 rgba(255,255,255,0.3)"
                        : `inset 0 1px 0 rgba(255,255,255,0.6), 0 1px 2px ${adminColor.accent}22`,
                    }}
                  >
                    <Icon size={20} weight="duotone" />
                  </Box>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontFamily: SANS, fontSize: 10.5, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: c.accent ? "rgba(255,255,255,0.9)" : adminColor.muted, lineHeight: 1 }}>{c.en}</Typography>
                    <Typography sx={{ fontFamily: SANS, fontSize: 9, color: c.accent ? "rgba(255,255,255,0.7)" : adminColor.dim, mt: 0.25 }}>{c.th}</Typography>
                  </Box>
                </Box>
                <Typography sx={{ ...adminFigureSx, fontSize: 22, color: c.accent ? "#fff" : adminColor.text, lineHeight: 1 }}>
                  {c.value}
                </Typography>
              </Box>
            );
          })}
        </Box>

        {/* ── per-therapist pay cards ─────────────────────────────────── */}
        <Box>
          <Typography sx={{ fontFamily: SANS, fontSize: 11, fontWeight: 800, color: adminColor.muted, letterSpacing: "0.1em", textTransform: "uppercase", lineHeight: 1 }}>
            Pay per Therapist — {visible.length} Staff
          </Typography>
          <Typography sx={{ fontFamily: SANS, fontSize: 9.5, color: adminColor.dim, mt: 0.2 }}>
            ค่าแรงหมอนวด · {visible.length} คน
          </Typography>
        </Box>

        {visible.length === 0 && !loading && (
          <Box sx={{ textAlign: "center", py: 6 }}>
            <Typography sx={{ fontFamily: SANS, fontSize: 13, color: adminColor.dim }}>No data yet · ยังไม่มีข้อมูล</Typography>
          </Box>
        )}

        {visible.map((s, i) => (
          <motion.div key={s.key} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} whileHover={{ y: -1 }}>
            <Box
              sx={{
                borderRadius: "18px",
                background: adminColor.panel,
                border: `1px solid ${adminColor.line}`,
                overflow: "hidden",
                boxShadow: "0 2px 10px rgba(31,41,51,0.04), 0 8px 20px rgba(31,41,51,0.06)",
                transition: "background 160ms, box-shadow 160ms",
                "&:hover": {
                  background: `${adminColor.accent}0A`,
                  boxShadow: `0 4px 14px rgba(31,41,51,0.06), 0 12px 26px ${adminColor.accent}18`,
                },
              }}
            >
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
                      <Typography sx={{ fontFamily: SANS, fontSize: 11, fontWeight: 700, color: adminColor.green }}>{s.jobs} jobs</Typography>
                    </Box>
                    {s.cancelled > 0 && (
                      <Box sx={{ px: "9px", py: "3px", borderRadius: 999, background: adminColor.panel2, display: "flex", alignItems: "center", gap: 0.4 }}>
                        <XCircle size={11} color={adminColor.dim} />
                        <Typography sx={{ fontFamily: SANS, fontSize: 11, fontWeight: 700, color: adminColor.dim }}>{s.cancelled} cancelled</Typography>
                      </Box>
                    )}
                  </Box>
                </Box>

                {/* money breakdown */}
                <Box sx={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 0.5, p: "10px 12px", borderRadius: "12px", background: adminColor.panel2, mb: 1.5 }}>
                  {[
                    { en: "Gross Service", th: "รับทั้งหมด", value: thb(s.serviceTotal), highlight: false },
                    { en: "Total Taxi",    th: "เดินทาง",    value: thb(s.taxiTotal),    highlight: false },
                    { en: "Shop Take",     th: "ส่วนร้าน",    value: thb(s.shop),         highlight: false },
                    { en: "Paid",          th: "จ่ายนวด",    value: thb(s.worker),       highlight: true  },
                  ].map((c) => (
                    <Box key={c.en} sx={{ textAlign: "center" }}>
                      <Typography sx={{ fontFamily: SANS, fontSize: 9.5, fontWeight: 800, color: adminColor.muted, letterSpacing: "0.05em", textTransform: "uppercase", lineHeight: 1 }}>
                        {c.en}
                      </Typography>
                      <Typography sx={{ fontFamily: SANS, fontSize: 8.5, color: adminColor.dim, mt: 0.15, mb: 0.3 }}>
                        {c.th}
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
                    Payslip · สลิป
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
          <Typography sx={{ fontFamily: SANS, fontSize: 10.5, fontWeight: 800, color: adminColor.muted, letterSpacing: "0.1em", textTransform: "uppercase", lineHeight: 1 }}>
            Staff Comparison
          </Typography>
          <Typography sx={{ fontFamily: SANS, fontSize: 9.5, color: adminColor.dim, mt: 0.2, mb: 0.6 }}>
            เปรียบเทียบรายได้
          </Typography>
          <Typography sx={{ fontFamily: SERIF, fontSize: 20, fontWeight: 600, color: adminColor.text }}>
            All Therapists
          </Typography>
          <Typography sx={{ fontFamily: SANS, fontSize: 11, color: adminColor.dim, mt: 0.3 }}>
            พนักงานทุกคน
          </Typography>
          <Typography sx={{ fontFamily: SANS, fontSize: 12, color: adminColor.muted, mt: 0.3 }}>
            {periodLabel} · {visible.length} people · คน
          </Typography>
          <Box sx={{ display: "flex", gap: 1, mt: 2, p: 1.5, borderRadius: "14px", background: adminColor.panel, border: `1px solid ${adminColor.line}` }}>
            {[
              { en: "Total Jobs",       th: "งานรวม",       value: String(totals.jobs)  },
              { en: "Booking Total",    th: "รายได้รวม",    value: thb(totals.service)  },
              { en: "Paid to Therapist",th: "จ่ายนวดรวม",   value: thb(totals.worker)   },
              { en: "Shop Take",        th: "ร้านได้รวม",    value: thb(totals.shop)     },
            ].map((s, i) => (
              <Box key={i} sx={{ flex: 1, textAlign: "center", borderRight: i < 3 ? `1px solid ${adminColor.line}` : "none" }}>
                <Typography sx={{ ...adminFigureSx, fontSize: 15, color: adminColor.text, lineHeight: 1 }}>{s.value}</Typography>
                <Typography sx={{ fontFamily: SANS, fontSize: 9.5, color: adminColor.muted, mt: 0.3, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700, lineHeight: 1 }}>{s.en}</Typography>
                <Typography sx={{ fontFamily: SANS, fontSize: 8.5, color: adminColor.dim, mt: 0.15 }}>{s.th}</Typography>
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
                    { en: "#",          th: "",           align: "center" as const },
                    { en: "Therapist",  th: "พนักงาน",    align: "left"   as const },
                    { en: "Jobs",       th: "งาน",        align: "center" as const },
                    { en: "Cancelled",  th: "ยกเลิก",     align: "center" as const },
                    { en: "Service",    th: "ค่าบริการ",  align: "right"  as const },
                    { en: "Taxi",       th: "เดินทาง",    align: "right"  as const },
                    { en: "Shop Take",  th: "ส่วนร้าน",    align: "right"  as const },
                    { en: "Paid",       th: "จ่ายนวด",    align: "right"  as const },
                    { en: "Share",      th: "% ของรวม",   align: "center" as const },
                  ].map((h) => (
                    <th key={h.en} style={{ padding: "10px 14px", textAlign: h.align, fontFamily: SANS, fontSize: 10.5, fontWeight: 800, color: adminColor.muted, letterSpacing: "0.06em", textTransform: "uppercase", whiteSpace: "nowrap", lineHeight: 1 }}>
                      {h.en}
                      {h.th && (
                        <Box component="span" sx={{ display: "block", fontFamily: SANS, fontSize: 8.5, color: adminColor.dim, mt: 0.3, fontWeight: 400, letterSpacing: 0, textTransform: "none" }}>
                          {h.th}
                        </Box>
                      )}
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
                  <td colSpan={2} style={{ padding: "12px 14px", fontFamily: SANS, fontSize: 12, fontWeight: 800, color: adminColor.muted, letterSpacing: "0.06em", textTransform: "uppercase" }}>TOTALS · รวมทั้งหมด</td>
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
            Close · ปิด
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
            <Export size={14} /> Download Excel
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
              <Typography sx={{ fontFamily: SANS, fontSize: 10.5, fontWeight: 800, color: adminColor.muted, letterSpacing: "0.14em", textTransform: "uppercase", lineHeight: 1 }}>
                Payslip
              </Typography>
              <Typography sx={{ fontFamily: SANS, fontSize: 9.5, color: adminColor.dim, mt: 0.2, mb: 0.5 }}>
                สลิปเงินเดือน
              </Typography>
              <Typography sx={{ fontFamily: SERIF, fontSize: 22, fontWeight: 600, color: adminColor.text }}>
                {preview.name}
              </Typography>
              <Typography sx={{ fontFamily: SANS, fontSize: 12, color: adminColor.muted, mt: 0.3 }}>
                {periodLabel}
              </Typography>
              <Box sx={{ display: "flex", gap: 1, mt: 2, p: 1.5, borderRadius: "14px", background: adminColor.panel, border: `1px solid ${adminColor.line}` }}>
                {[
                  { en: "Jobs",  th: "งาน",     value: String(preview.jobs) },
                  { en: "Gross", th: "รับรวม",  value: thb(preview.serviceTotal) },
                  { en: "Paid",  th: "จ่ายนวด", value: thb(preview.worker) },
                ].map((s, i) => (
                  <Box key={i} sx={{ flex: 1, textAlign: "center", borderRight: i < 2 ? `1px solid ${adminColor.line}` : "none" }}>
                    <Typography sx={{ ...adminFigureSx, fontSize: 17, color: i === 2 ? adminColor.accent : adminColor.text, lineHeight: 1 }}>{s.value}</Typography>
                    <Typography sx={{ fontFamily: SANS, fontSize: 10, color: adminColor.muted, mt: 0.35, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700, lineHeight: 1 }}>{s.en}</Typography>
                    <Typography sx={{ fontFamily: SANS, fontSize: 8.5, color: adminColor.dim, mt: 0.15 }}>{s.th}</Typography>
                  </Box>
                ))}
              </Box>
            </Box>

            <DialogContent sx={{ px: 3, py: 2 }}>
              {[
                { label: "Gross Service · ค่าบริการรวม",   value: thb(preview.serviceTotal) },
                ...(preview.discountTotal > 0 ? [{ label: "Promo Discount · ส่วนลดโปร", value: `− ${thb(preview.discountTotal)}`, color: adminColor.dim }] : []),
                { label: "Total Taxi · Taxi รวม",          value: thb(preview.taxiTotal) },
                { label: "Shop Take · ร้านได้",             value: thb(preview.shop),    color: adminColor.dim },
                { label: "Paid to Therapist · จ่ายนวด",    value: thb(preview.worker),  color: adminColor.accent, bold: true },
                ...(preview.cancelled > 0 ? [{ label: "Cancelled · ยกเลิก", value: `${preview.cancelled} times`, color: adminColor.dim }] : []),
              ].map((row) => (
                <Box key={row.label} sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", py: 0.75, borderBottom: `1px solid ${adminColor.line}` }}>
                  <Typography sx={{ fontFamily: SANS, fontSize: 13, color: adminColor.muted }}>{row.label}</Typography>
                  <Typography sx={{ ...adminFigureSx, fontSize: 15, fontWeight: (row as any).bold ? 800 : 600, color: (row as any).color || adminColor.text }}>{row.value}</Typography>
                </Box>
              ))}

              {/* 🆕 28s305 (founder: "ดูสลิป บอกรายละเอียดบริการ") — the slip
                   only showed aggregate totals; therapists couldn't see WHICH
                   jobs made up the pay. Per-job list from preview.bookings
                   (same data the Excel export already itemises), payout per
                   job + the service price it came from, cancelled jobs greyed. */}
              <Box sx={{ mt: 2 }}>
                <Typography sx={{ fontFamily: SANS, fontSize: 10.5, fontWeight: 800, color: adminColor.muted, letterSpacing: "0.1em", textTransform: "uppercase", lineHeight: 1 }}>
                  Job List · {preview.bookings.length}
                </Typography>
                <Typography sx={{ fontFamily: SANS, fontSize: 9.5, color: adminColor.dim, mt: 0.2, mb: 1 }}>
                  รายการงาน
                </Typography>
                {[...preview.bookings]
                  .sort((a, b) => (toDate(a.createdAt)?.getTime() ?? 0) - (toDate(b.createdAt)?.getTime() ?? 0))
                  .map((b) => {
                    const excluded = isPayrollExcluded(b.status);
                    const d = toDate(b.createdAt);
                    const meta = [
                      d ? dayjs(d).format("D MMM") : null,
                      b.taxiFee ? `Taxi ${thb(b.taxiFee)}` : null,
                      b.discountAmount ? `Discount ${thb(b.discountAmount)}` : null,
                    ].filter(Boolean).join(" · ");
                    return (
                      <Box key={b.id} sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 1.5, py: 0.85, borderBottom: `1px solid ${adminColor.line}`, opacity: excluded ? 0.5 : 1 }}>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography sx={{ fontFamily: SANS, fontSize: 12.5, fontWeight: 600, color: adminColor.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {b.serviceName || "—"}
                          </Typography>
                          {meta && (
                            <Typography sx={{ fontFamily: SANS, fontSize: 11, color: adminColor.dim, mt: 0.2 }}>
                              {meta}
                            </Typography>
                          )}
                        </Box>
                        <Box sx={{ textAlign: "right", flexShrink: 0 }}>
                          {excluded ? (
                            <Typography sx={{ fontFamily: SANS, fontSize: 11, fontWeight: 700, color: adminColor.dim }}>Cancelled</Typography>
                          ) : (
                            <>
                              <Typography sx={{ ...adminFigureSx, fontSize: 13.5, fontWeight: 800, color: adminColor.accent, lineHeight: 1.1 }}>{thb(therapistPayoutFor(b))}</Typography>
                              <Typography sx={{ fontFamily: SANS, fontSize: 10.5, color: adminColor.dim }}>from {thb(b.servicePrice || 0)}</Typography>
                            </>
                          )}
                        </Box>
                      </Box>
                    );
                  })}
              </Box>
            </DialogContent>

            <DialogActions sx={{ px: 3, pb: 2.5, pt: 0, gap: 1 }}>
              <Button onClick={() => setPreview(null)} sx={{ borderRadius: 999, fontFamily: SANS, fontSize: 13, textTransform: "none", color: adminColor.muted }}>
                Close · ปิด
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
                <Export size={14} /> Download Excel
              </motion.button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
};

export default AdminReportPage;
