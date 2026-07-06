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
// rejected, no_show}. The computation matches AdminReportPage's
// existing 60/40 rule so finance numbers stay consistent across
// the two surfaces.
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
  doc,
  setDoc,
  serverTimestamp,
  type DocumentData,
} from "firebase/firestore";
import dayjs, { type Dayjs } from "dayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";

import { db, auth } from "@/lib/firebase";
import { formatTHB } from "@/utils/servicePricing";
import { getServiceLabel } from "@/utils/serviceCatalog";
// 🆕 Round 28s234 (Phase 4 — Payout tracking) — Control Room tokens for the
//   new Payout Tracker section.
import { adminColor, adminFont } from "@/theme/adminTheme";
import { logAdminAction } from "@/utils/auditLog";

const SERIF = '"Federo", "Italiana", "Cinzel", "Fraunces", Georgia, "Times New Roman", serif';
const SANS = '"Inter", system-ui, -apple-system, sans-serif';

// 🆕 Round 28r27 (founder 2026-05-07) — Tier-based commission split.
// Founder strategy: higher commission on premium tiers attracts
// better talent + reflects the harder skill required.
//
//   Entry (Thai/Aroma)         → 60% therapist · 40% shop
//   Mid (Gentleman's Signature) → 65% therapist · 35% shop
//   Premium (B2B Therapeutic)   → 70% therapist · 30% shop
//
// Fallback for unmapped services = 60/40 (legacy default).
const TIER_THERAPIST_PCT: Record<string, number> = {
  "xSR-Thai": 0.6,
  "SR-Aroma": 0.6,
  "SR-HJ2200": 0.65,
  "SR-B2B3200": 0.7,
};
const DEFAULT_THERAPIST_PCT = 0.6;

const therapistPctFor = (serviceId: string | null | undefined): number => {
  if (!serviceId) return DEFAULT_THERAPIST_PCT;
  return TIER_THERAPIST_PCT[serviceId] ?? DEFAULT_THERAPIST_PCT;
};

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

const EXCLUDED_STATUSES = new Set([
  "cancelled",
  "canceled",
  "refunded",
  "failed",
  "rejected",
  "no_show",
]);

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
  PaperProps: { sx: { background: adminColor.panel2, color: adminColor.text, borderRadius: "12px", boxShadow: "0 8px 24px rgba(0,0,0,0.4)" } },
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

  // ── 🆕 Round 28s234 (Phase 4) — Payout tracker ────────────────────────
  // Founder's original TODO on this page: "Track payouts (which therapist
  // has been paid which week)". Independent of the `range` filter above
  // (which is a rolling window and not a stable payout period) — this uses
  // a fixed calendar week so "mark paid" persists against the SAME week
  // every time the page loads. Stores one doc per therapist per week in a
  // new `payouts` collection (admin-only, see firestore.rules).
  const [payoutWeekStart, setPayoutWeekStart] = useState<Dayjs>(() => dayjs().startOf("week"));
  const [payoutBookings, setPayoutBookings] = useState<BookingRow[]>([]);
  const [payoutRecords, setPayoutRecords] = useState<Record<string, { paid: boolean; paidAt?: Timestamp | null }>>({});
  const [payoutLoading, setPayoutLoading] = useState(true);
  const [payoutBusy, setPayoutBusy] = useState<string | null>(null);

  const payoutWeekEnd = useMemo(() => payoutWeekStart.add(7, "day"), [payoutWeekStart]);
  const payoutWeekKey = useMemo(() => payoutWeekStart.format("YYYY-MM-DD"), [payoutWeekStart]);

  // Bookings created within the selected week.
  useEffect(() => {
    setPayoutLoading(true);
    const s = Timestamp.fromDate(payoutWeekStart.toDate());
    const e = Timestamp.fromDate(payoutWeekEnd.toDate());
    const q = query(
      collection(db, "bookings"),
      where("createdAt", ">=", s),
      where("createdAt", "<", e)
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
        setPayoutBookings(arr);
        setPayoutLoading(false);
      },
      () => setPayoutLoading(false)
    );
    return () => unsub();
  }, [payoutWeekStart, payoutWeekEnd]);

  // Existing payout records for this week (paid/unpaid state).
  useEffect(() => {
    const q = query(collection(db, "payouts"), where("weekKey", "==", payoutWeekKey));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const rec: Record<string, { paid: boolean; paidAt?: Timestamp | null }> = {};
        snap.forEach((d) => {
          const data = d.data() as DocumentData;
          rec[data.therapistId ?? d.id] = { paid: !!data.paid, paidAt: data.paidAt ?? null };
        });
        setPayoutRecords(rec);
      },
      () => setPayoutRecords({})
    );
    return () => unsub();
  }, [payoutWeekKey]);

  // Per-therapist payout for the selected week (same tier math as `stats`).
  const payoutByTherapist = useMemo(() => {
    const acc: Record<string, { name: string; jobs: number; payout: number }> = {};
    for (const b of payoutBookings) {
      if (b.status && EXCLUDED_STATUSES.has(b.status)) continue;
      const service = b.servicePrice ?? 0;
      const discount = b.discountAmount ?? 0;
      const tPct = therapistPctFor(b.serviceId);
      const commissionBase = Math.max(0, service - discount);
      const payout = Math.round(commissionBase * tPct);
      const tKey = b.therapistId ?? "(no therapist)";
      const tName = b.therapistName ?? tKey;
      if (!acc[tKey]) acc[tKey] = { name: tName, jobs: 0, payout: 0 };
      acc[tKey].jobs += 1;
      acc[tKey].payout += payout;
    }
    return acc;
  }, [payoutBookings]);

  const markPayout = async (therapistId: string, name: string, amount: number, jobs: number, paid: boolean) => {
    const payoutId = `${payoutWeekKey}__${therapistId}`;
    setPayoutBusy(payoutId);
    try {
      await setDoc(doc(db, "payouts", payoutId), {
        weekKey: payoutWeekKey,
        weekStart: payoutWeekStart.format("YYYY-MM-DD"),
        weekEnd: payoutWeekEnd.format("YYYY-MM-DD"),
        therapistId,
        therapistName: name,
        amount,
        jobs,
        paid,
        paidAt: paid ? serverTimestamp() : null,
        paidBy: paid ? (auth.currentUser?.email ?? null) : null,
      });
      void logAdminAction(paid ? "payout.mark_paid" : "payout.mark_unpaid", {
        therapistId, therapistName: name, amount, weekKey: payoutWeekKey,
      });
    } catch (e) {
      console.error("[payout] mark failed", e);
      window.alert("บันทึกไม่สำเร็จ ลองใหม่");
    } finally {
      setPayoutBusy(null);
    }
  };

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
            Live booking revenue · 60/40 therapist-shop split ·
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

      {/* 🆕 Round 28s234 (Phase 4) — Payout Tracker. Independent of the range
          filter above; tracks "paid this calendar week" per therapist. */}
      <Box
        sx={{
          mb: 3, borderRadius: "16px", background: adminColor.panel,
          border: `1px solid ${adminColor.line}`, p: "18px 20px",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1, mb: 1.5 }}>
          <Box>
            <Typography sx={{ fontFamily: adminFont.serif, fontSize: 17, fontWeight: 600, color: adminColor.text }}>
              Payout tracker
            </Typography>
            <Typography sx={{ fontFamily: SANS, fontSize: 12, color: adminColor.muted, mt: 0.25 }}>
              Week of {payoutWeekStart.format("D MMM")} – {payoutWeekEnd.subtract(1, "day").format("D MMM YYYY")}
            </Typography>
          </Box>
          <Box sx={{ display: "flex", gap: 0.75 }}>
            <Button
              size="small"
              onClick={() => setPayoutWeekStart((w) => w.subtract(7, "day"))}
              sx={{ minWidth: 0, color: adminColor.text, border: `1px solid ${adminColor.line2}`, borderRadius: "8px", textTransform: "none" }}
            >
              ← Prev
            </Button>
            <Button
              size="small"
              disabled={payoutWeekStart.isSame(dayjs().startOf("week"), "day")}
              onClick={() => setPayoutWeekStart(dayjs().startOf("week"))}
              sx={{ minWidth: 0, color: adminColor.highlight, border: `1px solid ${adminColor.line2}`, borderRadius: "8px", textTransform: "none" }}
            >
              This week
            </Button>
            <Button
              size="small"
              disabled={payoutWeekEnd.isAfter(dayjs())}
              onClick={() => setPayoutWeekStart((w) => w.add(7, "day"))}
              sx={{ minWidth: 0, color: adminColor.text, border: `1px solid ${adminColor.line2}`, borderRadius: "8px", textTransform: "none" }}
            >
              Next →
            </Button>
          </Box>
        </Box>

        {payoutLoading ? (
          <Box sx={{ py: 3, textAlign: "center" }}>
            <CircularProgress size={22} sx={{ color: adminColor.accent }} />
          </Box>
        ) : Object.keys(payoutByTherapist).length === 0 ? (
          <Typography sx={{ fontFamily: SANS, fontSize: 13, color: adminColor.dim }}>
            No completed jobs this week.
          </Typography>
        ) : (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
            {Object.entries(payoutByTherapist)
              .sort((a, b) => b[1].payout - a[1].payout)
              .map(([tKey, row]) => {
                const rec = payoutRecords[tKey];
                const paid = !!rec?.paid;
                const busyId = `${payoutWeekKey}__${tKey}`;
                return (
                  <Box
                    key={tKey}
                    sx={{
                      display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1.5,
                      p: "10px 12px", borderRadius: "12px",
                      background: paid ? "rgba(22,163,74,0.08)" : adminColor.panel2,
                      border: `1px solid ${paid ? "rgba(22,163,74,0.3)" : adminColor.line}`,
                    }}
                  >
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ fontFamily: SANS, fontSize: 13.5, fontWeight: 700, color: adminColor.text }}>
                        {row.name}
                      </Typography>
                      <Typography sx={{ fontFamily: SANS, fontSize: 11.5, color: adminColor.muted }}>
                        {row.jobs} job{row.jobs === 1 ? "" : "s"}
                        {paid && rec?.paidAt?.toDate && ` · paid ${dayjs(rec.paidAt.toDate()).format("D MMM")}`}
                      </Typography>
                    </Box>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexShrink: 0 }}>
                      <Typography sx={{ fontFamily: adminFont.serif, fontSize: 15, fontWeight: 700, color: adminColor.highlight }}>
                        {formatTHB(row.payout)}
                      </Typography>
                      <Button
                        size="small"
                        disabled={payoutBusy === busyId}
                        onClick={() => void markPayout(tKey, row.name, row.payout, row.jobs, !paid)}
                        sx={{
                          minWidth: 84, borderRadius: "8px", textTransform: "none", fontWeight: 700, fontSize: 12,
                          background: paid ? "transparent" : adminColor.green,
                          color: paid ? adminColor.green : "#052012",
                          border: paid ? `1px solid ${adminColor.green}` : "none",
                          "&:hover": { background: paid ? "rgba(22,163,74,0.1)" : adminColor.green },
                        }}
                      >
                        {paid ? "✓ Paid" : "Mark paid"}
                      </Button>
                    </Box>
                  </Box>
                );
              })}
          </Box>
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
          {/* Headline numbers */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr 1fr", sm: "1fr 1fr 1fr" },
              gap: 2,
            }}
          >
            <BigStat
              label="Gross revenue"
              value={formatTHB(stats.totalGross)}
              sub={`${stats.countCompleted} bookings`}
              accent="brand"
            />
            <BigStat
              label="Therapist payout (60%)"
              value={formatTHB(stats.totalTherapistPayout)}
              sub={
                stats.totalDiscountAbsorbed > 0
                  ? `tier-aware split · post-discount`
                  : `from service price ${formatTHB(stats.totalServicePrice)}`
              }
            />
            <BigStat
              label="Shop net"
              value={formatTHB(stats.shopNet)}
              sub={
                stats.totalDiscountAbsorbed > 0
                  ? `after promo cost ${formatTHB(stats.totalDiscountAbsorbed)} (shared)`
                  : `after costs ${formatTHB(stats.totalCosts)}`
              }
              accent="brand"
            />
          </Box>

          {/* Cancelled + average per booking */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr 1fr", sm: "1fr 1fr" },
              gap: 2,
            }}
          >
            <Card>
              <Eyebrow>Cancelled / refunded</Eyebrow>
              <Typography
                sx={{
                  fontFamily: SERIF,
                  fontSize: 22,
                  fontWeight: 600,
                  color: adminColor.text,
                  mt: 1,
                }}
              >
                {stats.countCancelled} bookings
              </Typography>
              <Typography
                sx={{
                  fontFamily: SANS,
                  fontSize: 11,
                  color: adminColor.dim,
                  mt: 0.5,
                }}
              >
                Excluded from totals above.
              </Typography>
            </Card>
            <Card>
              <Eyebrow>Average per booking</Eyebrow>
              <Typography
                sx={{
                  fontFamily: SERIF,
                  fontSize: 22,
                  fontWeight: 600,
                  color: adminColor.text,
                  mt: 1,
                }}
              >
                {formatTHB(
                  stats.countCompleted
                    ? Math.round(stats.totalGross / stats.countCompleted)
                    : 0
                )}
              </Typography>
              <Typography
                sx={{
                  fontFamily: SANS,
                  fontSize: 11,
                  color: adminColor.dim,
                  mt: 0.5,
                }}
              >
                Gross / completed bookings.
              </Typography>
            </Card>
          </Box>

          {/* Daily trend */}
          <Card>
            <Eyebrow>Daily revenue</Eyebrow>
            <Typography
              sx={{
                fontFamily: SERIF,
                fontSize: 18,
                fontWeight: 600,
                color: adminColor.text,
                mt: 0.5,
                mb: 2,
              }}
            >
              Gross by day · {trendDates.length} days
            </Typography>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: `repeat(${trendDates.length}, 1fr)`,
                gap: "3px",
                alignItems: "end",
                height: 110,
              }}
            >
              {trendDates.map((d) => {
                const v = stats.byDay[d] ?? 0;
                const pct = (v / trendMax) * 100;
                return (
                  <Box
                    key={d}
                    title={`${d}: ${formatTHB(v)}`}
                    sx={{
                      height: `${pct}%`,
                      background:
                        v > 0
                          ? adminColor.accent
                          : adminColor.panel2,
                      borderRadius: "3px 3px 0 0",
                      minHeight: 2,
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

const Card: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Box
    sx={{
      padding: "20px 22px",
      borderRadius: "16px",
      background: adminColor.panel,
      border: `1px solid ${adminColor.line}`,
      boxShadow: "0 4px 14px rgba(0,0,0,0.25)",
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

const BigStat: React.FC<{
  label: string;
  value: string;
  sub: string;
  accent?: "brand" | "neutral";
}> = ({ label, value, sub, accent = "neutral" }) => (
  <Card>
    <Eyebrow>{label}</Eyebrow>
    <Typography
      sx={{
        fontFamily: SERIF,
        fontSize: { xs: 24, md: 28 },
        fontWeight: 700,
        color: accent === "brand" ? adminColor.highlight : adminColor.text,
        letterSpacing: "-0.02em",
        marginTop: "6px",
        lineHeight: 1.05,
        fontVariantNumeric: "tabular-nums",
      }}
    >
      {value}
    </Typography>
    <Typography
      sx={{
        fontFamily: SANS,
        fontSize: 11.5,
        color: adminColor.dim,
        marginTop: "4px",
      }}
    >
      {sub}
    </Typography>
  </Card>
);

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
      {rows.map((r) => (
        <Box key={r.label}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              gap: 1,
              mb: 0.5,
            }}
          >
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
                fontFamily: SERIF,
                fontSize: 14,
                fontWeight: 700,
                color: adminColor.highlight,
                fontVariantNumeric: "tabular-nums",
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
