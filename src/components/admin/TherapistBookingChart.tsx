// src/components/admin/TherapistBookingChart.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Paper,
  Typography,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Divider,
  Chip,
} from "@mui/material";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  Timestamp,
  type DocumentData,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import dayjs from "dayjs";

// recharts
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

type RangeKey = "today" | "7d" | "30d" | "all";

type BookingDoc = {
  therapistId?: string;
  therapistName?: string;

  status?: string;

  // money
  totalPrice?: number;
  total?: number;

  // time
  createdAt?: any;
  startAt?: any;

  // other
  serviceName?: string;
};

function toDateSafe(v: any): Date | null {
  if (!v) return null;
  if (v instanceof Date) return v;
  if (typeof v?.toDate === "function") return v.toDate();
  if (v?.seconds) return new Date(v.seconds * 1000);
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

function normalizeStatus(s?: string): "confirmed" | "completed" | "cancelled" | "other" {
  const v = String(s || "").toLowerCase().trim();
  if (["confirmed", "paid", "upcoming"].includes(v)) return "confirmed";
  if (["completed", "done"].includes(v)) return "completed";
  if (["cancelled", "canceled"].includes(v)) return "cancelled";
  return "other";
}

function getTotal(b: BookingDoc): number {
  const a = Number((b as any).totalPrice);
  const c = Number((b as any).total);
  if (!Number.isNaN(a) && a > 0) return a;
  if (!Number.isNaN(c) && c > 0) return c;
  return 0;
}

function getTherapistKey(b: BookingDoc): { key: string; name: string } {
  const tid = (b.therapistId || "").trim();
  const tname = (b.therapistName || "").trim();
  const key = tid || tname || "unknown";
  const name = tname || tid || "Unknown";
  return { key, name };
}

function rangeStart(range: RangeKey): Date | null {
  const now = dayjs();
  if (range === "all") return null;
  if (range === "today") return now.startOf("day").toDate();
  if (range === "7d") return now.subtract(7, "day").startOf("day").toDate();
  if (range === "30d") return now.subtract(30, "day").startOf("day").toDate();
  return null;
}

export default function TherapistBookingChart() {
  const [range, setRange] = useState<RangeKey>("7d");
  const [rows, setRows] = useState<Array<{ id: string; data: BookingDoc }>>([]);

  useEffect(() => {
    // ✅ ดึงทั้งหมดแล้ว filter ฝั่ง client (กัน index/where ซับซ้อน)
    // ถ้าต้องการ filter ใน query เดี๋ยวผมปรับให้ (จะต้องมี composite index)
    const qy = query(collection(db, "bookings"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(
      qy,
      (snap) => {
        const next = snap.docs.map((d) => ({ id: d.id, data: d.data() as DocumentData as BookingDoc }));
        setRows(next);
      },
      (err) => console.error("TherapistBookingChart snapshot error:", err)
    );

    return () => unsub();
  }, []);

  const filtered = useMemo(() => {
    const start = rangeStart(range);
    if (!start) return rows;

    return rows.filter((r) => {
      const d =
        toDateSafe(r.data.createdAt) ||
        toDateSafe(r.data.startAt) ||
        null;
      if (!d) return false;
      return d >= start;
    });
  }, [rows, range]);

  const agg = useMemo(() => {
    const map = new Map<
      string,
      {
        key: string;
        name: string;
        countAll: number;
        countConfirmed: number;
        countCompleted: number;
        countCancelled: number;
        amountAll: number;
        amountCancelled: number;
      }
    >();

    for (const r of filtered) {
      const b = r.data;
      const st = normalizeStatus(b.status);
      const money = getTotal(b);
      const { key, name } = getTherapistKey(b);

      if (!map.has(key)) {
        map.set(key, {
          key,
          name,
          countAll: 0,
          countConfirmed: 0,
          countCompleted: 0,
          countCancelled: 0,
          amountAll: 0,
          amountCancelled: 0,
        });
      }

      const item = map.get(key)!;
      item.countAll += 1;
      item.amountAll += money;

      if (st === "confirmed") item.countConfirmed += 1;
      else if (st === "completed") item.countCompleted += 1;
      else if (st === "cancelled") {
        item.countCancelled += 1;
        item.amountCancelled += money;
      }
    }

    const arr = Array.from(map.values());
    arr.sort((a, b) => b.countAll - a.countAll);
    return arr;
  }, [filtered]);

  const top5 = useMemo(() => agg.slice(0, 5), [agg]);

  const totals = useMemo(() => {
    const sum = {
      bookings: 0,
      confirmed: 0,
      completed: 0,
      cancelled: 0,
      amount: 0,
      cancelledAmount: 0,
    };
    for (const x of agg) {
      sum.bookings += x.countAll;
      sum.confirmed += x.countConfirmed;
      sum.completed += x.countCompleted;
      sum.cancelled += x.countCancelled;
      sum.amount += x.amountAll;
      sum.cancelledAmount += x.amountCancelled;
    }
    return sum;
  }, [agg]);

  return (
    <Paper elevation={3} sx={{ p: 2.5, borderRadius: 4 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
        <Typography fontWeight="bold" fontSize={18}>
          Therapist Booking Chart
        </Typography>

        <ToggleButtonGroup
          size="small"
          value={range}
          exclusive
          onChange={(_, v) => v && setRange(v)}
        >
          <ToggleButton value="today">Today</ToggleButton>
          <ToggleButton value="7d">7D</ToggleButton>
          <ToggleButton value="30d">30D</ToggleButton>
          <ToggleButton value="all">All</ToggleButton>
        </ToggleButtonGroup>
      </Stack>

      <Stack direction="row" spacing={1} flexWrap="wrap" mt={1.5}>
        <Chip label={`Bookings: ${totals.bookings}`} />
        <Chip label={`Confirmed: ${totals.confirmed}`} color="info" />
        <Chip label={`Completed: ${totals.completed}`} color="success" />
        <Chip label={`Cancelled: ${totals.cancelled}`} color="error" />
        <Chip
          label={`Amount: ฿${totals.amount.toLocaleString()}`}
          color="warning"
        />
        {totals.cancelledAmount > 0 && (
          <Chip
            label={`Cancelled Amount: ฿${totals.cancelledAmount.toLocaleString()}`}
            color="error"
            variant="outlined"
          />
        )}
      </Stack>

      <Divider sx={{ my: 2 }} />

      {/* CHART */}
      <Box sx={{ height: 320 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={top5} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 12 }}
              interval={0}
              angle={-10}
              height={50}
            />
            <YAxis allowDecimals={false} />
            <Tooltip
              formatter={(value: any, name: any, props: any) => {
                if (name === "countAll") return [value, "Bookings"];
                if (name === "amountAll") return [`฿${Number(value).toLocaleString()}`, "Amount"];
                return [value, name];
              }}
              labelFormatter={(label: any) => `Therapist: ${label}`}
            />
            <Bar dataKey="countAll" name="Bookings" />
          </BarChart>
        </ResponsiveContainer>
      </Box>

      {/* TOP LIST */}
      <Box mt={2}>
        <Typography fontWeight="bold" mb={1}>
          Top Therapists
        </Typography>

        <Stack spacing={1}>
          {top5.map((t, idx) => (
            <Paper
              key={t.key}
              variant="outlined"
              sx={{ p: 1.5, borderRadius: 3 }}
            >
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography fontWeight="bold">
                  #{idx + 1} {t.name}
                </Typography>
                <Typography fontWeight="bold">
                  {t.countAll} jobs
                </Typography>
              </Stack>

              <Typography fontSize={13} color="text.secondary" mt={0.5}>
                Confirmed: {t.countConfirmed} • Completed: {t.countCompleted} • Cancelled:{" "}
                {t.countCancelled}
              </Typography>

              <Typography fontSize={13} color="text.secondary">
                Amount: ฿{t.amountAll.toLocaleString()}
                {t.amountCancelled > 0 ? ` • Cancelled: ฿${t.amountCancelled.toLocaleString()}` : ""}
              </Typography>
            </Paper>
          ))}
          {top5.length === 0 && (
            <Typography color="text.secondary" textAlign="center">
              No data in selected range.
            </Typography>
          )}
        </Stack>
      </Box>
    </Paper>
  );
}