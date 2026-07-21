// src/components/therapist/RevenueDashboard.tsx
//
// 🆕 Round 28x.98 (founder, on the Performance page: "แถบ Dashboard เพิ่ม
//   Lifetime Revenue · Since [start] Period Summary กรองวันที่และสถานะงานได้ ·
//   Monthly Revenue เรียงมาแล้ว 6 เดือน หรือกรองรายวันเดือนปี · By Service") —
//   a practitioner's own revenue dashboard, mirroring AdminDashboardPage's
//   "Lifetime Revenue · Since Opening" hero + Monthly Revenue chart + By
//   Service ranked bars (src/pages/admin/AdminDashboardPage.tsx), but scoped
//   to HER OWN commission (therapistPayoutFor / noShowCompFor — the same
//   shared util the shop's payroll pages use) instead of the shop's net, and
//   restyled in the staff app's light rose theme instead of admin's dark
//   Control Room theme.
//
//   Kept deliberately separate from the Loyalty section above it on the
//   Performance page — loyalty is "how guests feel about you", this is
//   "what you earned"; different questions, different founder asks.

import React, { useMemo, useState } from "react";
import { Box, Typography, CircularProgress, ToggleButtonGroup, ToggleButton, Select, MenuItem } from "@mui/material";
import dayjs, { type Dayjs } from "dayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip } from "recharts";
import { Wallet, CalendarBlank, CheckCircle, ChartBar } from "phosphor-react";

import { useTherapistRevenueRows, type TherapistRevenueRow } from "@/hooks/useTherapistRevenueRows";
import { therapistPayoutFor, noShowCompFor, isPayrollExcluded } from "@/utils/commission";
import { formatTHB } from "@/utils/servicePricing";
import { getServiceLabel } from "@/utils/serviceCatalog";

const SERIF = '"Playfair Display", "Fraunces", Georgia, serif';
const SANS = '"Inter", system-ui, sans-serif';
const ROSE = "#D97C95";
const ROSE_DEEP = "#C96F89";
const GREEN = "#57B88B";

/** Revenue for ONE booking row: her real payout if it's a valid job, her
 *  no-show taxi comp if it isn't — ฿0 for every other excluded status.
 *  Identical logic to AdminDashboardPage's lifetime loop. */
function revenueFor(r: TherapistRevenueRow): number {
  if (isPayrollExcluded(r.status)) return noShowCompFor({ status: r.status, taxiFee: r.taxiFee });
  return therapistPayoutFor({
    serviceId: r.serviceId,
    servicePrice: r.servicePrice,
    discountAmount: r.discountAmount,
    duration: r.duration,
    therapistShare: r.therapistShare,
  });
}

type RangePreset = "all" | "d7" | "d30" | "thismonth" | "custom";
const RANGE_LABEL: Record<RangePreset, string> = {
  all: "All Time",
  d7: "7 Days",
  d30: "30 Days",
  thismonth: "This Month",
  custom: "Custom",
};
type StatusFilter = "__ALL__" | "valid" | "excluded";
const STATUS_LABEL: Record<StatusFilter, string> = {
  __ALL__: "ทุกสถานะ",
  valid: "งานสำเร็จ",
  excluded: "ยกเลิก/ไม่มา",
};
type Granularity = "day" | "month" | "year";

const rowInRange = (r: TherapistRevenueRow, start: number, end: number) =>
  r.createdAt > 0 && r.createdAt >= start && r.createdAt <= end;

const rowMatchesStatus = (r: TherapistRevenueRow, f: StatusFilter) => {
  if (f === "__ALL__") return true;
  const excluded = isPayrollExcluded(r.status);
  return f === "excluded" ? excluded : !excluded;
};

const sectionHeaderSx = { fontFamily: SANS, fontSize: 11, fontWeight: 800, color: "var(--sr-muted)", letterSpacing: "0.1em", textTransform: "uppercase" as const, lineHeight: 1 };

export const RevenueDashboard: React.FC<{ therapistId: string | null }> = ({ therapistId }) => {
  const { rows, loading } = useTherapistRevenueRows(therapistId);

  const [range, setRange] = useState<RangePreset>("thismonth");
  const [customStart, setCustomStart] = useState<Dayjs>(() => dayjs().subtract(30, "day").startOf("day"));
  const [customEnd, setCustomEnd] = useState<Dayjs>(() => dayjs());
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("__ALL__");
  const [granularity, setGranularity] = useState<Granularity>("month");

  // ── lifetime — unfiltered, every row ever. ────────────────────────
  const lifetime = useMemo(() => {
    let revenue = 0;
    let jobs = 0;
    let firstMs = 0;
    for (const r of rows) {
      revenue += revenueFor(r);
      if (!isPayrollExcluded(r.status)) jobs += 1;
      if (r.createdAt > 0 && (firstMs === 0 || r.createdAt < firstMs)) firstMs = r.createdAt;
    }
    return { revenue, jobs, firstMs };
  }, [rows]);

  // ── period summary + by-service — date range + status filter. ─────
  const periodBounds = useMemo(() => {
    if (range === "all") return { start: 0, end: Date.now() };
    if (range === "custom") return { start: customStart.startOf("day").valueOf(), end: customEnd.endOf("day").valueOf() };
    if (range === "thismonth") return { start: dayjs().startOf("month").valueOf(), end: Date.now() };
    const days = range === "d7" ? 7 : 30;
    return { start: dayjs().subtract(days, "day").startOf("day").valueOf(), end: Date.now() };
  }, [range, customStart, customEnd]);

  const periodRows = useMemo(
    () => rows.filter((r) => rowInRange(r, periodBounds.start, periodBounds.end) && rowMatchesStatus(r, statusFilter)),
    [rows, periodBounds, statusFilter],
  );

  const periodSummary = useMemo(() => {
    let revenue = 0;
    let jobs = 0;
    let excludedJobs = 0;
    const byService = new Map<string, { name: string; jobs: number; revenue: number }>();
    for (const r of periodRows) {
      const rev = revenueFor(r);
      revenue += rev;
      if (isPayrollExcluded(r.status)) {
        excludedJobs += 1;
        continue;
      }
      jobs += 1;
      const key = r.serviceId ?? r.serviceName ?? "other";
      const name = getServiceLabel(r.serviceId, r.serviceName);
      const e = byService.get(key) ?? { name, jobs: 0, revenue: 0 };
      e.jobs += 1;
      e.revenue += rev;
      byService.set(key, e);
    }
    const byServiceArr = [...byService.values()].sort((a, b) => b.revenue - a.revenue);
    const maxServiceRevenue = Math.max(1, ...byServiceArr.map((s) => s.revenue));
    return { revenue, jobs, excludedJobs, byService: byServiceArr, maxServiceRevenue };
  }, [periodRows]);

  // ── trend chart — its own trailing window per granularity, always
  //   VALID jobs only (an excluded-job trend of near-zero bars isn't a
  //   useful "how am I earning" signal). Independent of the filters above
  //   on purpose — this is the long trend, not the current period. ─────
  const chart = useMemo(() => {
    const buckets = new Map<string, number>();
    const order: string[] = [];
    const now = dayjs();
    if (granularity === "day") {
      for (let i = 13; i >= 0; i--) {
        const key = now.subtract(i, "day").format("D MMM");
        order.push(key);
        buckets.set(key, 0);
      }
      for (const r of rows) {
        if (isPayrollExcluded(r.status) || r.createdAt <= 0) continue;
        const key = dayjs(r.createdAt).format("D MMM");
        if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + revenueFor(r));
      }
    } else if (granularity === "year") {
      for (let i = 4; i >= 0; i--) {
        const key = now.subtract(i, "year").format("YYYY");
        order.push(key);
        buckets.set(key, 0);
      }
      for (const r of rows) {
        if (isPayrollExcluded(r.status) || r.createdAt <= 0) continue;
        const key = dayjs(r.createdAt).format("YYYY");
        if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + revenueFor(r));
      }
    } else {
      for (let i = 5; i >= 0; i--) {
        const key = now.subtract(i, "month").format("MMM YY");
        order.push(key);
        buckets.set(key, 0);
      }
      for (const r of rows) {
        if (isPayrollExcluded(r.status) || r.createdAt <= 0) continue;
        const key = dayjs(r.createdAt).format("MMM YY");
        if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + revenueFor(r));
      }
    }
    return order.map((label) => ({ label, revenue: Math.round(buckets.get(label) ?? 0) }));
  }, [rows, granularity]);

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
        <CircularProgress size={26} sx={{ color: ROSE }} />
      </Box>
    );
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {/* ── Lifetime Revenue hero — same "since opening" DNA as
          AdminDashboardPage's crown card, scoped to her own take. ──── */}
      <Box
        sx={{
          borderRadius: "22px",
          background: "linear-gradient(135deg, rgba(217,124,149,0.16) 0%, var(--sr-panel) 55%, var(--sr-panel) 100%)",
          border: "1px solid rgba(217,124,149,0.30)",
          boxShadow: "0 10px 32px rgba(217,124,149,0.14)",
          p: "20px 18px 18px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <Box aria-hidden sx={{ position: "absolute", top: -60, right: -60, width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle, rgba(217,124,149,0.22) 0%, transparent 70%)", pointerEvents: "none" }} />

        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, position: "relative" }}>
          <Wallet size={15} color={ROSE_DEEP} weight="fill" />
          <Typography sx={{ fontFamily: SANS, fontSize: 11, fontWeight: 800, color: ROSE_DEEP, letterSpacing: "0.12em", textTransform: "uppercase", lineHeight: 1 }}>
            Lifetime Revenue
          </Typography>
        </Box>
        <Typography sx={{ fontFamily: SANS, fontSize: 10.5, color: "var(--sr-dim)", mt: 0.4, ml: 2.75 }}>
          รายได้สะสมทั้งหมดของคุณ
        </Typography>

        <Box sx={{ display: "flex", alignItems: "center", gap: 2, mt: 2 }}>
          <Box sx={{ width: 56, height: 56, borderRadius: "50%", background: "linear-gradient(135deg, #D97C95, #C96F89)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 6px 18px rgba(217,124,149,0.42)" }}>
            <Wallet size={26} weight="duotone" />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontFamily: SERIF, fontSize: 34, fontWeight: 700, color: "var(--sr-ink)", lineHeight: 1, letterSpacing: "-0.01em" }}>
              {formatTHB(Math.round(lifetime.revenue))}
            </Typography>
            <Typography sx={{ fontFamily: SANS, fontSize: 11.5, fontWeight: 700, color: "var(--sr-muted)", mt: 0.5 }}>
              {lifetime.jobs.toLocaleString()} งานสำเร็จ
            </Typography>
            {lifetime.firstMs > 0 && (() => {
              const days = Math.max(1, Math.round((Date.now() - lifetime.firstMs) / 86400000));
              const avg = Math.round(lifetime.revenue / days);
              return (
                <Typography sx={{ fontFamily: SANS, fontSize: 10.5, color: "var(--sr-dim)", mt: 0.3 }}>
                  ตั้งแต่ {dayjs(lifetime.firstMs).format("D MMM YYYY")} · เฉลี่ย {formatTHB(avg)}/วัน
                </Typography>
              );
            })()}
          </Box>
        </Box>
      </Box>

      {/* ── Period Summary — date range + status filter. ──────────────── */}
      <Box sx={{ borderRadius: "18px", background: "var(--sr-panel)", border: "1px solid var(--sr-hairline)", p: "16px" }}>
        <Typography sx={sectionHeaderSx}>Period Summary</Typography>
        <Typography sx={{ fontFamily: SANS, fontSize: 9.5, color: "var(--sr-dim)", mt: 0.2, mb: 1.5 }}>สรุปตามช่วงเวลาที่เลือก</Typography>

        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 1.5 }}>
          <ToggleButtonGroup
            value={range}
            exclusive
            size="small"
            onChange={(_, v) => v && setRange(v as RangePreset)}
            sx={{
              "& .MuiToggleButton-root": { color: "var(--sr-muted)", borderColor: "var(--sr-hairline)", fontFamily: SANS, fontSize: 11.5, textTransform: "none", px: 1.25, py: 0.5 },
              "& .Mui-selected": { color: "#fff !important", background: `${ROSE} !important` },
            }}
          >
            {(Object.keys(RANGE_LABEL) as RangePreset[]).map((k) => (
              <ToggleButton key={k} value={k}>{RANGE_LABEL[k]}</ToggleButton>
            ))}
          </ToggleButtonGroup>

          <Select
            size="small"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            sx={{ minWidth: 130, fontSize: 12.5, fontFamily: SANS, color: "var(--sr-ink)", "& .MuiOutlinedInput-notchedOutline": { borderColor: "var(--sr-hairline)" } }}
          >
            {(Object.keys(STATUS_LABEL) as StatusFilter[]).map((k) => (
              <MenuItem key={k} value={k} sx={{ fontFamily: SANS, fontSize: 12.5 }}>{STATUS_LABEL[k]}</MenuItem>
            ))}
          </Select>
        </Box>

        {range === "custom" && (
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <Box sx={{ display: "flex", gap: 1, mb: 1.5 }}>
              <DatePicker
                label="From" value={customStart} maxDate={customEnd}
                onChange={(v) => v && setCustomStart(v)}
                slotProps={{ textField: { size: "small", sx: { flex: 1 } } }}
              />
              <DatePicker
                label="To" value={customEnd} minDate={customStart} maxDate={dayjs()}
                onChange={(v) => v && setCustomEnd(v)}
                slotProps={{ textField: { size: "small", sx: { flex: 1 } } }}
              />
            </Box>
          </LocalizationProvider>
        )}

        <Box sx={{ display: "flex", gap: 1, p: 1.25, borderRadius: "14px", background: "var(--sr-panel-2)" }}>
          {[
            { icon: <Wallet size={16} weight="duotone" color={ROSE_DEEP} />, value: formatTHB(Math.round(periodSummary.revenue)), label: "Revenue" },
            { icon: <CheckCircle size={16} weight="duotone" color={GREEN} />, value: periodSummary.jobs.toLocaleString(), label: "Jobs" },
            { icon: <CalendarBlank size={16} weight="duotone" color="var(--sr-muted)" />, value: periodSummary.excludedJobs.toLocaleString(), label: "Cancelled" },
          ].map((s, i) => (
            <Box key={i} sx={{ flex: 1, textAlign: "center" }}>
              <Box sx={{ display: "flex", justifyContent: "center", mb: 0.4 }}>{s.icon}</Box>
              <Typography sx={{ fontFamily: SERIF, fontSize: 17, fontWeight: 700, color: "var(--sr-ink)", lineHeight: 1 }}>{s.value}</Typography>
              <Typography sx={{ fontFamily: SANS, fontSize: 9.5, fontWeight: 700, color: "var(--sr-muted)", mt: 0.4, textTransform: "uppercase", letterSpacing: "0.05em" }}>{s.label}</Typography>
            </Box>
          ))}
        </Box>
      </Box>

      {/* ── Monthly / Day / Year Revenue trend. ────────────────────────── */}
      <Box sx={{ borderRadius: "18px", background: "var(--sr-panel)", border: "1px solid var(--sr-hairline)", p: "16px 16px 12px" }}>
        <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 1, mb: 1.5 }}>
          <Box>
            <Typography sx={sectionHeaderSx}>{granularity === "day" ? "Daily" : granularity === "year" ? "Yearly" : "Monthly"} Revenue</Typography>
            <Typography sx={{ fontFamily: SANS, fontSize: 9.5, color: "var(--sr-dim)", mt: 0.2 }}>
              {granularity === "day" ? "รายได้รายวัน · 14 วันล่าสุด" : granularity === "year" ? "รายได้รายปี" : "รายได้รายเดือน · 6 เดือนล่าสุด"}
            </Typography>
          </Box>
          <ToggleButtonGroup
            value={granularity}
            exclusive
            size="small"
            onChange={(_, v) => v && setGranularity(v as Granularity)}
            sx={{
              "& .MuiToggleButton-root": { color: "var(--sr-muted)", borderColor: "var(--sr-hairline)", fontFamily: SANS, fontSize: 11, textTransform: "none", px: 1, py: 0.3 },
              "& .Mui-selected": { color: "#fff !important", background: `${ROSE} !important` },
            }}
          >
            <ToggleButton value="day">Day</ToggleButton>
            <ToggleButton value="month">Month</ToggleButton>
            <ToggleButton value="year">Year</ToggleButton>
          </ToggleButtonGroup>
        </Box>

        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chart} margin={{ top: 0, right: 4, left: -18, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--sr-hairline)" />
            <XAxis dataKey="label" tick={{ fontFamily: SANS, fontSize: 10.5, fill: "var(--sr-muted)" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontFamily: SANS, fontSize: 10, fill: "var(--sr-dim)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `฿${(Number(v) / 1000).toFixed(0)}k`} />
            <Tooltip
              contentStyle={{ fontFamily: SANS, fontSize: 12, borderRadius: 10, background: "var(--sr-panel)", border: "1px solid var(--sr-hairline)", boxShadow: "0 4px 12px rgba(0,0,0,0.16)", color: "var(--sr-ink)" }}
              formatter={(value) => [formatTHB(Number(value)), "รายได้"]}
            />
            <Bar dataKey="revenue" fill={ROSE} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Box>

      {/* ── By Service — same period filter as Period Summary above. ──── */}
      {periodSummary.byService.length > 0 && (
        <Box sx={{ borderRadius: "18px", background: "var(--sr-panel)", border: "1px solid var(--sr-hairline)", p: "16px" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.6, mb: 1.5 }}>
            <ChartBar size={14} weight="duotone" color={ROSE_DEEP} />
            <Box>
              <Typography sx={sectionHeaderSx}>By Service</Typography>
              <Typography sx={{ fontFamily: SANS, fontSize: 9.5, color: "var(--sr-dim)" }}>แยกตามบริการ · ช่วงเวลาที่เลือกด้านบน</Typography>
            </Box>
          </Box>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
            {periodSummary.byService.map((s) => (
              <Box key={s.name}>
                <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.4 }}>
                  <Typography sx={{ fontFamily: SANS, fontSize: 12, fontWeight: 600, color: "var(--sr-ink)" }}>{s.name} <Box component="span" sx={{ color: "var(--sr-dim)", fontWeight: 500 }}>· {s.jobs} งาน</Box></Typography>
                  <Typography sx={{ fontFamily: SANS, fontSize: 11.5, color: "var(--sr-muted)" }}>{formatTHB(Math.round(s.revenue))}</Typography>
                </Box>
                <Box sx={{ height: 6, borderRadius: 999, background: "var(--sr-panel-2)", overflow: "hidden" }}>
                  <Box sx={{ height: "100%", width: `${(s.revenue / periodSummary.maxServiceRevenue) * 100}%`, background: ROSE, borderRadius: 999 }} />
                </Box>
              </Box>
            ))}
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default RevenueDashboard;
