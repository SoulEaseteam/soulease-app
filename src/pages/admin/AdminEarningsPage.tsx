// src/pages/admin/AdminEarningsPage.tsx
//
// 🆕 Round 28r26 (founder 2026-05-07) — Earnings calculator.
//
// Founder direction: "ขอเมนูคำนวณรายได้ด้วยนะ" — a dedicated
// admin page that computes income from completed bookings, split
// across the standard 60/40 therapist-shop share, with period
// filters + per-therapist + per-service breakdowns + CSV export.
//
// Data source: Firestore `bookings` collection. Excludes any doc
// whose `status` is in {cancelled, canceled, refunded, failed,
// rejected, no_show}. The tier split + excluded-status set now live in
// `@/utils/commission` and are shared with AdminReportPage, so the
// payroll numbers stay identical across both surfaces (they had drifted
// — Reports was still flat 60/40 over full price until round 28s247).
//
// What this page deliberately does NOT do:
//   • Track payouts (which therapist has been paid which week)
//   • Compute taxes / VAT — out of scope for v1
//   • Forecast future revenue
// Those would live in a separate /admin/finance page if needed.

import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Typography,
  CircularProgress,
  ToggleButton,
  ToggleButtonGroup,
  Button,
  Select,
  MenuItem,
} from "@mui/material";
import {
  collection,
  onSnapshot,
  query,
  where,
  Timestamp,
  type DocumentData,
} from "firebase/firestore";
import dayjs, { type Dayjs } from "dayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
// 🆕 Round 28s245 (founder: "ลองเปลี่ยนดีไซน์ ให้สวยขึ้น") — icons for the
//   Dashboard-style (28s241) widget treatment.
import { ChartBar, UserCircle, Receipt, XCircle, Medal } from "phosphor-react";

import { db } from "@/lib/firebase";
import { formatTHB } from "@/utils/servicePricing";
import { getServiceLabel } from "@/utils/serviceCatalog";
// 🆕 Round 28s234 (Phase 4 — Payout tracking) — Control Room tokens for the
//   new Payout Tracker section.
// 🆕 Round 28s246 (founder: "ปรับตัวเลข ให้ดูง่าย") — adminFigureSx for every
//   money/count figure; Hoefler's old-style digits stay on titles only.
import { adminColor, adminFont, adminFigureSx } from "@/theme/adminTheme";
// 🆕 Round 28s247 (audit of /admin/reports) — the tier-split + excluded-status
//   logic moved to a shared util so Earnings and Reports can't drift apart
//   (they had: Reports was still flat 60/40 over full price). Same values as
//   before, so Earnings behaviour is unchanged.
import { therapistPctFor, PAYROLL_EXCLUDED_STATUSES as EXCLUDED_STATUSES } from "@/utils/commission";

// 🆕 Round 28s245 — this page predates adminTheme.ts and still carried its
//   own Federo/Inter stacks; aliased onto the shared admin fonts so Earnings
//   typography matches AdminLayout/Dashboard/Analytics.
const SERIF = adminFont.serif;
const SANS = adminFont.sans;

// Per-booking cost estimates (founder spec image). These are
// AVERAGES the calculator subtracts to show NET margin — actual
// shop cost will vary. View can tune the numbers as the business
// learns its real cost structure.
const COST_PER_BOOKING_THB = {
  /** Payment processor fee — assume PromptPay (free) avg with cards. */
  payment: 0,
  /** Supplies (oils, towels, condoms if applicable). */
  supplies: 70,
  /** Admin / ops overhead per booking. */
  ops: 150,
};

interface BookingRow {
  id: string;
  therapistId?: string | null;
  therapistName?: string | null;
  serviceId?: string | null;
  serviceName?: string | null;
  totalPrice?: number | null;
  servicePrice?: number | null;
  taxiFee?: number | null;
  status?: string;
  startAt?: Timestamp | null;
  createdAt?: Timestamp | null;
  // 🆕 Round 28r27 — Round 28r14 booking docs carry these so the
  //   earnings calc can show how much discount the shop absorbed.
  discountAmount?: number | null;
  discountCode?: string | null;
  // 🆕 Round 28s312 — surfaced in the per-job shop-revenue list.
  customerName?: string | null;
}

// 🆕 Round 28s244 (founder: "เพิ่มตัวกรอง" on AdminEarningsPage, same as the
//   Analytics filters round) — "custom" is a distinct case from the 4 fixed
//   presets since it needs an upper bound + explicit From/To state, not a
//   pure function of "now".
type PresetRange = "today" | "week" | "month" | "year";
type Range = PresetRange | "custom";

const RANGE_LABEL: Record<Range, string> = {
  today: "Today",
  week: "Last 7 days",
  month: "Last 30 days",
  year: "Last 12 months",
  custom: "Custom",
};

function rangeStart(range: PresetRange): Dayjs {
  const now = dayjs();
  switch (range) {
    case "today":
      return now.startOf("day");
    case "week":
      return now.subtract(7, "day").startOf("day");
    case "month":
      return now.subtract(30, "day").startOf("day");
    case "year":
      return now.subtract(12, "month").startOf("day");
  }
}

const selectSx = {
  minWidth: 160, fontSize: 13,
  "& .MuiOutlinedInput-notchedOutline": { borderColor: adminColor.line2 },
  color: adminColor.text,
};
const selectMenuProps = {
  PaperProps: { sx: { background: adminColor.panel2, color: adminColor.text, borderRadius: "12px", boxShadow: "0 8px 24px rgba(31,41,51,0.15)" } },
};

// 🆕 Round 28s245 — same lightweight CSS conic-gradient ring used on the
//   Dashboard (28s241); duplicated locally, it's a tiny presentational bit,
//   not shared logic.
const DonutRing: React.FC<{ percent: number; color: string; size?: number; thickness?: number }> = ({
  percent, color, size = 88, thickness = 9,
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

const AdminEarningsPage: React.FC = () => {
  const [range, setRange] = useState<Range>("month");
  const [customStart, setCustomStart] = useState<Dayjs>(() => dayjs().subtract(30, "day").startOf("day"));
  const [customEnd, setCustomEnd] = useState<Dayjs>(() => dayjs());
  const [therapistFilter, setTherapistFilter] = useState("__ALL__");
  const [serviceFilter, setServiceFilter] = useState("__ALL__");
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    let cutoff: Timestamp;
    let upper: Timestamp | null = null;
    if (range === "custom") {
      cutoff = Timestamp.fromDate(customStart.startOf("day").toDate());
      upper = Timestamp.fromDate(customEnd.endOf("day").toDate());
    } else {
      cutoff = Timestamp.fromDate(rangeStart(range).toDate());
    }
    // Filter on createdAt server-side; status filter happens client-side
    const filters: Parameters<typeof query>[1][] = [where("createdAt", ">=", cutoff)];
    if (upper) filters.push(where("createdAt", "<=", upper));
    const q = query(collection(db, "bookings"), ...filters);
    const unsub = onSnapshot(
      q,
      (snap) => {
        const arr: BookingRow[] = [];
        snap.forEach((doc) => {
          const d = doc.data() as DocumentData;
          arr.push({
            id: doc.id,
            therapistId: d.therapistId ?? null,
            therapistName: d.therapistName ?? null,
            serviceId: d.serviceId ?? null,
            serviceName: d.serviceName ?? null,
            totalPrice: d.totalPrice ?? null,
            servicePrice: d.servicePrice ?? null,
            taxiFee: d.taxiFee ?? null,
            status: d.status ?? "",
            startAt: d.startAt ?? null,
            createdAt: d.createdAt ?? null,
            discountAmount: d.discountAmount ?? null,
            discountCode: d.discountCode ?? null,
          });
        });
        setBookings(arr);
        setLoading(false);
      },
      (err) => {
        console.error("[earnings] snapshot error:", err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [range, customStart, customEnd]);

  // 🆕 Round 28s244 — therapist/service option lists derived from the
  //   date-range-filtered set (NOT further narrowed by the other filter),
  //   so switching one filter never collapses the other's choices.
  const therapistOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const b of bookings) {
      if (b.therapistId) map.set(b.therapistId, b.therapistName || b.therapistId);
    }
    return [...map.entries()];
  }, [bookings]);

  const serviceOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const b of bookings) {
      const key = b.serviceId ?? b.serviceName ?? null;
      if (key) map.set(key, getServiceLabel(b.serviceId, b.serviceName));
    }
    return [...map.entries()];
  }, [bookings]);

  const filteredBookings = useMemo(() => {
    if (therapistFilter === "__ALL__" && serviceFilter === "__ALL__") return bookings;
    return bookings.filter((b) => {
      if (therapistFilter !== "__ALL__" && b.therapistId !== therapistFilter) return false;
      if (serviceFilter !== "__ALL__" && (b.serviceId ?? b.serviceName) !== serviceFilter) return false;
      return true;
    });
  }, [bookings, therapistFilter, serviceFilter]);

  // ── Aggregations (🆕 Round 28r27 — tier-aware split + costs +
  //   discount-absorbed transparency) ──
  const stats = useMemo(() => {
    let totalCollected = 0;          // what customers actually paid (sum of totalPrice)
    let totalServicePrice = 0;       // pre-discount service price
    let totalDiscountAbsorbed = 0;   // promo discount the shop ate
    let totalTaxi = 0;
    let totalTherapistPayout = 0;    // weighted by per-service tier (full price base)
    let totalSupplies = 0;
    let totalOps = 0;
    let totalPayment = 0;
    let countCompleted = 0;
    let countCancelled = 0;

    const byTherapist: Record<
      string,
      { name: string; jobs: number; gross: number; service: number; payout: number }
    > = {};
    const byService: Record<
      string,
      { name: string; jobs: number; gross: number; service: number; therapistPct: number }
    > = {};
    const byDay: Record<string, number> = {};

    for (const b of filteredBookings) {
      if (b.status && EXCLUDED_STATUSES.has(b.status)) {
        countCancelled += 1;
        continue;
      }
      countCompleted += 1;
      const collected = b.totalPrice ?? (b.servicePrice ?? 0) + (b.taxiFee ?? 0);
      const service = b.servicePrice ?? 0;
      const taxi = b.taxiFee ?? 0;
      const discount = b.discountAmount ?? 0;
      const tPct = therapistPctFor(b.serviceId);
      // 🆕 Round 28r27 (founder 2026-05-07) — Therapist commission
      //   now applies on the DISCOUNTED service price, not the full
      //   list price. Founder said "ไม่คุ่มเสี่ยงเกินไป" — under the
      //   old rule (full-price commission) the shop absorbed 100% of
      //   every promo's cost. The new rule splits the promo cost
      //   proportionally:
      //     therapist loses: tPct × discount
      //     shop loses:      (1 − tPct) × discount
      //   E.g. ฿330 promo on Gentleman tier 65% → therapist −฿215,
      //   shop −฿115. Same fair share that retail / commission
      //   businesses use everywhere.
      const commissionBase = Math.max(0, service - discount);
      const payout = Math.round(commissionBase * tPct);

      totalCollected += collected;
      totalServicePrice += service;
      totalDiscountAbsorbed += discount;
      totalTaxi += taxi;
      totalTherapistPayout += payout;
      totalSupplies += COST_PER_BOOKING_THB.supplies;
      totalOps += COST_PER_BOOKING_THB.ops;
      totalPayment += COST_PER_BOOKING_THB.payment;

      // Per-therapist
      const tKey = b.therapistId ?? "(no therapist)";
      const tName = b.therapistName ?? tKey;
      if (!byTherapist[tKey]) {
        byTherapist[tKey] = { name: tName, jobs: 0, gross: 0, service: 0, payout: 0 };
      }
      byTherapist[tKey].jobs += 1;
      byTherapist[tKey].gross += collected;
      byTherapist[tKey].service += service;
      byTherapist[tKey].payout += payout;

      // Per-service
      const sKey = b.serviceId ?? "(no service)";
      const sName = getServiceLabel(b.serviceId, b.serviceName);
      if (!byService[sKey]) {
        byService[sKey] = { name: sName, jobs: 0, gross: 0, service: 0, therapistPct: tPct };
      }
      byService[sKey].jobs += 1;
      byService[sKey].gross += collected;
      byService[sKey].service += service;

      // Per-day bucket
      if (b.createdAt?.toDate) {
        const day = dayjs(b.createdAt.toDate()).format("YYYY-MM-DD");
        byDay[day] = (byDay[day] ?? 0) + collected;
      }
    }

    // 🆕 Round 28r27 — Shop net using the new fair-share rule.
    //   Shop revenue = what we collected (after discount applied)
    //                  minus therapist payout (after discount applied)
    //                  minus taxi pass-through
    //                  minus per-booking costs.
    //   This now reflects the founder's "ไม่คุ่มเสี่ยงเกินไป" rule
    //   where therapist + shop share the promo cost proportionally.
    const shopGross = totalCollected - totalTherapistPayout - totalTaxi;
    const totalCosts = totalSupplies + totalOps + totalPayment;
    const shopNet = shopGross - totalCosts;

    return {
      totalGross: totalCollected,           // alias for older UI refs
      totalCollected,
      totalServicePrice,
      totalDiscountAbsorbed,
      totalTaxi,
      totalTherapistPayout,
      shopGross,
      shopNet,
      totalSupplies,
      totalOps,
      totalPayment,
      totalCosts,
      countCompleted,
      countCancelled,
      byTherapist,
      byService,
      byDay,
    };
  }, [filteredBookings]);

  // Daily trend keys (for chart)
  const trendDates = useMemo(() => {
    let days: number;
    let anchor = dayjs();
    if (range === "custom") {
      days = customEnd.startOf("day").diff(customStart.startOf("day"), "day") + 1;
      anchor = customEnd;
    } else {
      days = range === "today" ? 1 : range === "week" ? 7 : range === "month" ? 30 : 365;
    }
    const cap = Math.min(Math.max(1, days), 60); // cap chart at 60 days for readability
    const out: string[] = [];
    for (let i = cap - 1; i >= 0; i--) {
      out.push(anchor.subtract(i, "day").format("YYYY-MM-DD"));
    }
    return out;
  }, [range, customStart, customEnd]);

  const trendMax = useMemo(
    () => Math.max(1, ...trendDates.map((d) => stats.byDay[d] ?? 0)),
    [stats.byDay, trendDates]
  );

  // ── 🆕 Round 28s316 (founder: "period comparison") — previous equal-length
  //   window, so every headline number can show a ▲/▼ delta vs the period
  //   before. Same date math the main feed uses, shifted back one span, with
  //   the same therapist/service filters applied for a like-for-like compare.
  const prevWindow = useMemo(() => {
    if (range === "custom") {
      const span = customEnd.endOf("day").diff(customStart.startOf("day"), "day") + 1;
      const end = customStart.startOf("day").subtract(1, "day").endOf("day");
      const start = end.subtract(span - 1, "day").startOf("day");
      return { start, end };
    }
    const cur = rangeStart(range);
    if (range === "today") return { start: cur.subtract(1, "day"), end: cur.subtract(1, "millisecond") };
    if (range === "week") return { start: cur.subtract(7, "day"), end: cur.subtract(1, "millisecond") };
    if (range === "month") return { start: cur.subtract(30, "day"), end: cur.subtract(1, "millisecond") };
    return { start: cur.subtract(12, "month"), end: cur.subtract(1, "millisecond") };
  }, [range, customStart, customEnd]);

  const [prevBookings, setPrevBookings] = useState<BookingRow[]>([]);
  useEffect(() => {
    const s = Timestamp.fromDate(prevWindow.start.toDate());
    const e = Timestamp.fromDate(prevWindow.end.toDate());
    const q = query(
      collection(db, "bookings"),
      where("createdAt", ">=", s),
      where("createdAt", "<=", e)
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const arr: BookingRow[] = [];
        snap.forEach((d0) => {
          const d = d0.data() as DocumentData;
          arr.push({
            id: d0.id,
            therapistId: d.therapistId ?? null,
            therapistName: d.therapistName ?? null,
            serviceId: d.serviceId ?? null,
            serviceName: d.serviceName ?? null,
            totalPrice: d.totalPrice ?? null,
            servicePrice: d.servicePrice ?? null,
            taxiFee: d.taxiFee ?? null,
            status: d.status ?? "",
            startAt: d.startAt ?? null,
            createdAt: d.createdAt ?? null,
            discountAmount: d.discountAmount ?? null,
            discountCode: d.discountCode ?? null,
          });
        });
        setPrevBookings(arr);
      },
      () => setPrevBookings([])
    );
    return () => unsub();
  }, [prevWindow]);

  // Shop-net + gross for the previous window (same tier math, same filters),
  // so the hero can show the growth delta.
  const prevStats = useMemo(() => {
    let collected = 0;
    let payout = 0;
    let taxi = 0;
    let costs = 0;
    let jobs = 0;
    for (const b of prevBookings) {
      if (b.status && EXCLUDED_STATUSES.has(b.status)) continue;
      if (therapistFilter !== "__ALL__" && b.therapistId !== therapistFilter) continue;
      if (serviceFilter !== "__ALL__" && (b.serviceId ?? b.serviceName) !== serviceFilter) continue;
      const service = b.servicePrice ?? 0;
      const t = b.taxiFee ?? 0;
      const c = b.totalPrice ?? service + t;
      const discount = b.discountAmount ?? 0;
      const p = Math.round(Math.max(0, service - discount) * therapistPctFor(b.serviceId));
      collected += c;
      payout += p;
      taxi += t;
      costs += COST_PER_BOOKING_THB.supplies + COST_PER_BOOKING_THB.ops + COST_PER_BOOKING_THB.payment;
      jobs += 1;
    }
    return {
      shopNet: collected - payout - taxi - costs,
      totalCollected: collected,
      totalTherapistPayout: payout,
      countCompleted: jobs,
    };
  }, [prevBookings, therapistFilter, serviceFilter]);

  const handleExportCSV = () => {
    const headers = [
      "Date",
      "BookingID",
      "Therapist",
      "Service",
      "ServicePrice",
      "Taxi",
      "Gross",
      "TherapistShare",
      "ShopShare",
      "TherapistPct",
      "Status",
    ];
    const rows = filteredBookings
      .filter((b) => !EXCLUDED_STATUSES.has(b.status ?? ""))
      .map((b) => {
        const gross = b.totalPrice ?? (b.servicePrice ?? 0) + (b.taxiFee ?? 0);
        const service = b.servicePrice ?? 0;
        // 🆕 Round 28r27 — tier-aware split per row
        const tPct = therapistPctFor(b.serviceId);
        const therapistShare = Math.round(service * tPct);
        const shopShare = service - therapistShare;
        return [
          b.createdAt?.toDate
            ? dayjs(b.createdAt.toDate()).format("YYYY-MM-DD HH:mm")
            : "",
          `SR-${b.id.slice(0, 8).toUpperCase()}`,
          b.therapistName ?? "",
          getServiceLabel(b.serviceId, b.serviceName),
          service,
          b.taxiFee ?? 0,
          gross,
          therapistShare,
          shopShare,
          `${Math.round(tPct * 100)}%`,
          b.status ?? "",
        ];
      });
    const csv = [headers, ...rows]
      .map((r) =>
        r
          .map((cell) => {
            const s = String(cell ?? "");
            return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
          })
          .join(",")
      )
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sunred-earnings-${range}-${dayjs().format("YYYY-MM-DD")}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  };

  return (
    <Box sx={{ padding: { xs: 2, md: 3 }, maxWidth: 1200, margin: "0 auto" }}>
      {/* Header */}
      <Box
        sx={{
          mb: 3,
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 2,
          flexWrap: "wrap",
        }}
      >
        <Box>
          <Typography
            sx={{
              fontFamily: SERIF,
              fontSize: { xs: 24, md: 30 },
              fontWeight: 600,
              color: adminColor.text,
              letterSpacing: "-0.02em",
              "& em": { fontStyle: "italic", color: adminColor.highlight },
            }}
          >
            Earnings <em>calculator</em>
          </Typography>
          <Typography
            sx={{
              fontFamily: SANS,
              fontSize: 13,
              color: adminColor.muted,
              marginTop: "4px",
            }}
          >
            Live booking revenue · tier-based therapist split ·
            excludes cancelled / refunded
          </Typography>
        </Box>

        <Button
          variant="outlined"
          onClick={handleExportCSV}
          disabled={loading || filteredBookings.length === 0}
          sx={{
            textTransform: "none",
            borderRadius: "10px",
            fontFamily: SANS,
            fontSize: 13,
            fontWeight: 600,
            borderColor: adminColor.accent,
            color: adminColor.highlight,
            "&:hover": {
              borderColor: adminColor.accent,
              background: "rgba(78,126,140,0.10)",
            },
          }}
        >
          ⬇ Export CSV
        </Button>
      </Box>

      {/* 🆕 Round 28s244 — filter bar: range (with custom From/To) +
          therapist filter + service filter. All narrow `filteredBookings`,
          which feeds stats, the CSV export, and the daily trend chart. */}
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, alignItems: "center", mb: 3 }}>
        <ToggleButtonGroup
          value={range}
          exclusive
          size="small"
          onChange={(_, v) => v && setRange(v as Range)}
          sx={{
            "& .MuiToggleButton-root": {
              color: adminColor.muted,
              borderColor: adminColor.line2,
              fontFamily: SANS,
              textTransform: "none",
              "&.Mui-selected": {
                color: adminColor.text,
                background: adminColor.accent,
                "&:hover": { background: adminColor.accentDeep },
              },
            },
          }}
        >
          {(Object.keys(RANGE_LABEL) as Range[]).map((r) => (
            <ToggleButton key={r} value={r}>
              {RANGE_LABEL[r]}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>

        {range === "custom" && (
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <DatePicker
              label="From"
              value={customStart}
              maxDate={customEnd}
              onChange={(v) => v && setCustomStart(v)}
              slotProps={{ textField: { size: "small", sx: { width: 130, "& .MuiInputBase-root": { color: adminColor.text }, "& .MuiInputLabel-root": { color: adminColor.muted }, "& .MuiOutlinedInput-notchedOutline": { borderColor: adminColor.line2 }, "& .MuiSvgIcon-root": { color: adminColor.muted } } } }}
            />
            <DatePicker
              label="To"
              value={customEnd}
              minDate={customStart}
              maxDate={dayjs()}
              onChange={(v) => v && setCustomEnd(v)}
              slotProps={{ textField: { size: "small", sx: { width: 130, "& .MuiInputBase-root": { color: adminColor.text }, "& .MuiInputLabel-root": { color: adminColor.muted }, "& .MuiOutlinedInput-notchedOutline": { borderColor: adminColor.line2 }, "& .MuiSvgIcon-root": { color: adminColor.muted } } } }}
            />
          </LocalizationProvider>
        )}

        {therapistOptions.length > 0 && (
          <Select size="small" value={therapistFilter} onChange={(e) => setTherapistFilter(e.target.value)} sx={selectSx} MenuProps={selectMenuProps}>
            <MenuItem value="__ALL__">All therapists</MenuItem>
            {therapistOptions.map(([id, name]) => (
              <MenuItem key={id} value={id}>{name}</MenuItem>
            ))}
          </Select>
        )}

        {serviceOptions.length > 0 && (
          <Select size="small" value={serviceFilter} onChange={(e) => setServiceFilter(e.target.value)} sx={selectSx} MenuProps={selectMenuProps}>
            <MenuItem value="__ALL__">All services</MenuItem>
            {serviceOptions.map(([id, name]) => (
              <MenuItem key={id} value={id}>{name}</MenuItem>
            ))}
          </Select>
        )}
      </Box>

      {loading ? (
        <Box sx={{ textAlign: "center", py: 6 }}>
          <CircularProgress size={28} sx={{ color: adminColor.accent }} />
        </Box>
      ) : filteredBookings.length === 0 ? (
        <Card>
          <Typography sx={{ fontFamily: SANS, fontSize: 14, color: adminColor.muted }}>
            {bookings.length === 0
              ? "No bookings in this period."
              : "No bookings match this therapist/service filter for the selected period."}
          </Typography>
        </Card>
      ) : (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {/* 🆕 Round 28s245 — hero card: Shop net is THE number this page
              exists to answer, so it gets the headline treatment — big serif
              figure + margin donut + a money-flow bar showing where every
              baht collected went. All real values from `stats`. */}
          <Card>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2, flexWrap: "wrap" }}>
              <Box sx={{ minWidth: 0 }}>
                <Eyebrow>Shop net · this period</Eyebrow>
                <Typography
                  sx={{
                    ...adminFigureSx, fontSize: { xs: 32, md: 40 },
                    color: adminColor.text, letterSpacing: "-0.02em", lineHeight: 1.1, mt: 0.75,
                  }}
                >
                  {formatTHB(stats.shopNet)}
                </Typography>
                <Typography sx={{ fontFamily: SANS, fontSize: 12.5, color: adminColor.muted, mt: 0.5 }}>
                  of {formatTHB(stats.totalCollected)} collected · {stats.countCompleted} bookings
                  {stats.totalDiscountAbsorbed > 0 && ` · promo absorbed ${formatTHB(stats.totalDiscountAbsorbed)} (shared)`}
                </Typography>
                {/* 🆕 Round 28s316 — growth vs the previous equal-length period */}
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mt: 0.75 }}>
                  <Delta cur={stats.shopNet} prev={prevStats.shopNet} />
                  <Typography sx={{ fontFamily: SANS, fontSize: 11.5, color: adminColor.dim }}>
                    vs ก่อนหน้า ({formatTHB(prevStats.shopNet)})
                  </Typography>
                </Box>
              </Box>
              <DonutRing
                percent={stats.totalCollected > 0 ? Math.round((Math.max(0, stats.shopNet) / stats.totalCollected) * 100) : 0}
                color={adminColor.accent}
              />
            </Box>

            {/* money-flow bar — where each collected baht went */}
            {stats.totalCollected > 0 && (
              <Box sx={{ mt: 2.5 }}>
                <Box sx={{ display: "flex", height: 12, borderRadius: 999, overflow: "hidden", background: adminColor.panel3 }}>
                  {[
                    { key: "Therapist", value: stats.totalTherapistPayout, color: adminColor.accent },
                    { key: "Taxi", value: stats.totalTaxi, color: adminColor.dim },
                    { key: "Costs", value: stats.totalCosts, color: adminColor.amber },
                    { key: "Shop net", value: Math.max(0, stats.shopNet), color: adminColor.green },
                  ].map((seg) => (
                    <Box
                      key={seg.key}
                      title={`${seg.key}: ${formatTHB(seg.value)}`}
                      sx={{ width: `${(seg.value / stats.totalCollected) * 100}%`, background: seg.color }}
                    />
                  ))}
                </Box>
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, mt: 1.25 }}>
                  {[
                    { key: "Therapist", value: stats.totalTherapistPayout, color: adminColor.accent },
                    { key: "Taxi", value: stats.totalTaxi, color: adminColor.dim },
                    { key: "Costs", value: stats.totalCosts, color: adminColor.amber },
                    { key: "Shop net", value: stats.shopNet, color: adminColor.green },
                  ].map((seg) => (
                    <Box key={seg.key} sx={{ display: "inline-flex", alignItems: "center", gap: 0.75 }}>
                      <Box sx={{ width: 9, height: 9, borderRadius: "3px", background: seg.color, flexShrink: 0 }} />
                      <Typography sx={{ fontFamily: SANS, fontSize: 11.5, color: adminColor.muted }}>
                        {seg.key}{" "}
                        <Box component="span" sx={{ fontWeight: 700, color: adminColor.text, fontVariantNumeric: "tabular-nums" }}>
                          {formatTHB(seg.value)}
                        </Box>
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            )}
          </Card>

          {/* 🆕 Round 28s245 — circular-icon stat row, same widget style as
              the Dashboard's period summary (28s241). Absorbs the old
              Cancelled/Average cards so the page loses a row of noise. */}
          <Card>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(4,1fr)" }, gap: 2 }}>
              {[
                { icon: <ChartBar   size={20} weight="duotone" />, label: "Gross revenue",    value: formatTHB(stats.totalGross), sub: `${stats.countCompleted} bookings`, color: adminColor.accent, delta: <Delta cur={stats.totalGross} prev={prevStats.totalCollected} /> },
                { icon: <UserCircle size={20} weight="duotone" />, label: "Therapist payout", value: formatTHB(stats.totalTherapistPayout), sub: stats.totalDiscountAbsorbed > 0 ? "tier split · post-discount" : "tier-aware split", color: adminColor.green, delta: <Delta cur={stats.totalTherapistPayout} prev={prevStats.totalTherapistPayout} neutral /> },
                { icon: <Receipt    size={20} weight="duotone" />, label: "Avg per booking",  value: formatTHB(stats.countCompleted ? Math.round(stats.totalGross / stats.countCompleted) : 0), sub: "gross / completed", color: adminColor.highlight, delta: null },
                { icon: <XCircle    size={20} weight="duotone" />, label: "Cancelled",        value: String(stats.countCancelled), sub: "excluded from totals", color: adminColor.red, delta: null },
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
                  <Box sx={{ display: "flex", alignItems: "baseline", gap: 0.5 }}>
                    <Typography sx={{ ...adminFigureSx, fontSize: 16, color: adminColor.text, lineHeight: 1 }}>
                      {c.value}
                    </Typography>
                    {c.delta}
                  </Box>
                  <Box>
                    <Typography sx={{ fontFamily: SANS, fontSize: 10.5, color: adminColor.muted, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      {c.label}
                    </Typography>
                    <Typography sx={{ fontFamily: SANS, fontSize: 10, color: adminColor.dim, mt: 0.2 }}>
                      {c.sub}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Box>
          </Card>

          {/* Daily trend */}
          <Card>
            <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 1, flexWrap: "wrap" }}>
              <Box>
                <Eyebrow>Daily revenue</Eyebrow>
                <Typography
                  sx={{
                    fontFamily: SERIF,
                    fontSize: 18,
                    fontWeight: 600,
                    color: adminColor.text,
                    mt: 0.5,
                  }}
                >
                  Gross by day · {trendDates.length} days
                </Typography>
              </Box>
              {/* 🆕 Round 28s245 — surface the peak day so the tallest bar
                  answers "which night was that?" without hovering. */}
              {trendMax > 1 && (
                <Box sx={{ textAlign: "right" }}>
                  <Typography sx={{ fontFamily: SANS, fontSize: 10.5, fontWeight: 700, color: adminColor.muted, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    Peak
                  </Typography>
                  <Typography sx={{ ...adminFigureSx, fontSize: 14.5, color: adminColor.highlight }}>
                    {formatTHB(trendMax)}
                  </Typography>
                </Box>
              )}
            </Box>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: `repeat(${trendDates.length}, 1fr)`,
                gap: "3px",
                alignItems: "end",
                height: 110,
                mt: 2,
              }}
            >
              {trendDates.map((d) => {
                const v = stats.byDay[d] ?? 0;
                const pct = (v / trendMax) * 100;
                const isPeak = v > 0 && v === trendMax;
                return (
                  <Box
                    key={d}
                    title={`${d}: ${formatTHB(v)}`}
                    sx={{
                      height: `${pct}%`,
                      // peak day in ink for emphasis; the rest in accent
                      background: isPeak
                        ? adminColor.highlight
                        : v > 0
                          ? adminColor.accent
                          : adminColor.panel3,
                      borderRadius: "4px 4px 0 0",
                      minHeight: 2,
                      transition: "opacity 0.15s ease",
                      "&:hover": { opacity: 0.75 },
                    }}
                  />
                );
              })}
            </Box>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                mt: 1,
                fontFamily: SANS,
                fontSize: 10,
                color: adminColor.dim,
              }}
            >
              <span>{dayjs(trendDates[0]).format("D MMM")}</span>
              <span>
                {dayjs(trendDates[trendDates.length - 1]).format("D MMM")}
              </span>
            </Box>
          </Card>

          {/* Per-therapist + per-service breakdown */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
              gap: 2,
            }}
          >
            <Card>
              <Eyebrow>By therapist</Eyebrow>
              <Typography
                sx={{
                  fontFamily: SERIF,
                  fontSize: 18,
                  fontWeight: 600,
                  color: adminColor.text,
                  mt: 0.5,
                  mb: 1.5,
                }}
              >
                Top earners
              </Typography>
              <RankedRows
                rows={Object.values(stats.byTherapist)
                  .sort((a, b) => b.gross - a.gross)
                  .slice(0, 8)
                  .map((r) => ({
                    label: r.name,
                    // 🆕 Round 28r27 — payout uses the per-row tier
                    //   accumulated payout (already accounts for
                    //   discount + tier %). Truer than recomputing.
                    sub: `${r.jobs} job${r.jobs === 1 ? "" : "s"} · payout ${formatTHB(r.payout)}`,
                    value: formatTHB(r.gross),
                    pct: r.gross / Math.max(1, stats.totalGross),
                  }))}
              />
            </Card>

            <Card>
              <Eyebrow>By service</Eyebrow>
              <Typography
                sx={{
                  fontFamily: SERIF,
                  fontSize: 18,
                  fontWeight: 600,
                  color: adminColor.text,
                  mt: 0.5,
                  mb: 1.5,
                }}
              >
                Service mix
              </Typography>
              <RankedRows
                rows={Object.values(stats.byService)
                  .sort((a, b) => b.gross - a.gross)
                  .map((r) => ({
                    label: r.name,
                    sub: `${r.jobs} booking${r.jobs === 1 ? "" : "s"}`,
                    value: formatTHB(r.gross),
                    pct: r.gross / Math.max(1, stats.totalGross),
                  }))}
              />
            </Card>
          </Box>
        </Box>
      )}
    </Box>
  );
};

// ─── Subcomponents ─────────────────────────────────────────────────────

// 🆕 Round 28s316 — period-over-period delta chip. Green up / red down for
// "more is better" metrics (revenue); pass neutral for informational ones
// (e.g. therapist payout) so the arrow shows direction without a value
// judgment. Renders nothing when there's no prior baseline to compare against.
const Delta: React.FC<{ cur: number; prev: number; neutral?: boolean }> = ({ cur, prev, neutral }) => {
  if (prev <= 0 && cur <= 0) return null;
  const pct = prev > 0 ? Math.round(((cur - prev) / prev) * 100) : cur > 0 ? 100 : 0;
  const up = cur >= prev;
  const color = neutral ? adminColor.muted : up ? adminColor.green : adminColor.red;
  return (
    <Box
      component="span"
      sx={{
        display: "inline-flex", alignItems: "center", gap: "2px",
        fontFamily: SANS, fontSize: 11, fontWeight: 700, color,
        fontVariantNumeric: "tabular-nums",
      }}
    >
      {up ? "▲" : "▼"} {Math.abs(pct)}%
    </Box>
  );
};

const Card: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Box
    sx={{
      padding: "20px 22px",
      borderRadius: "16px",
      background: adminColor.panel,
      border: `1px solid ${adminColor.line}`,
      // 🆕 Round 28s245 — the 0.25-alpha black shadow was tuned for the dark
      //   theme; on the light surface it read as a heavy smudge. Soft
      //   ink-tinted elevation instead (31,41,51 = #1F2933).
      boxShadow: "0 1px 2px rgba(31,41,51,0.04), 0 6px 16px rgba(31,41,51,0.07)",
    }}
  >
    {children}
  </Box>
);

const Eyebrow: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Box
    sx={{
      fontSize: 10,
      letterSpacing: "0.18em",
      textTransform: "uppercase",
      color: adminColor.muted,
      fontWeight: 700,
      fontFamily: SANS,
    }}
  >
    {children}
  </Box>
);

// (BigStat removed in 28s245 — the headline grid it served was replaced by
//  the hero Shop-net card + icon stat row.)

const RankedRows: React.FC<{
  rows: { label: string; sub: string; value: string; pct: number }[];
}> = ({ rows }) => {
  if (rows.length === 0) {
    return (
      <Typography
        sx={{
          fontFamily: SANS,
          fontSize: 12,
          color: adminColor.dim,
          fontStyle: "italic",
        }}
      >
        No data.
      </Typography>
    );
  }
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
      {rows.map((r, i) => (
        <Box key={r.label}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              mb: 0.5,
            }}
          >
            {/* 🆕 Round 28s245 — rank badge, medal on #1 (same treatment as
                the Dashboard's By Therapist widget). */}
            <Box
              sx={{
                width: 20, height: 20, borderRadius: "50%", flexShrink: 0,
                background: i === 0 ? `${adminColor.accent}22` : adminColor.panel2,
                color: i === 0 ? adminColor.accent : adminColor.dim,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              {i === 0 ? <Medal size={12} weight="fill" /> : (
                <Typography sx={{ fontSize: 10, fontWeight: 700 }}>{i + 1}</Typography>
              )}
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                sx={{
                  fontFamily: SANS,
                  fontSize: 13,
                  fontWeight: 600,
                  color: adminColor.text,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {r.label}
              </Typography>
              <Typography
                sx={{
                  fontFamily: SANS,
                  fontSize: 11,
                  color: adminColor.dim,
                }}
              >
                {r.sub}
              </Typography>
            </Box>
            <Typography
              sx={{
                ...adminFigureSx,
                fontSize: 13.5,
                color: adminColor.highlight,
                flexShrink: 0,
              }}
            >
              {r.value}
            </Typography>
          </Box>
          <Box
            sx={{
              height: 4,
              background: adminColor.panel3,
              borderRadius: "999px",
              overflow: "hidden",
              ml: "28px",
            }}
          >
            <Box
              sx={{
                height: "100%",
                width: `${Math.max(2, r.pct * 100)}%`,
                background: adminColor.accent,
                borderRadius: "999px",
              }}
            />
          </Box>
        </Box>
      ))}
    </Box>
  );
};

export default AdminEarningsPage;
