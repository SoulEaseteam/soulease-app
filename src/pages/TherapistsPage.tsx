// src/pages/TherapistsPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  CircularProgress,
  Grid,
  Typography,
  FormControl,
  Select,
  MenuItem,
} from "@mui/material";

import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import TherapistProfileCard from "@/components/TherapistProfileCard";

import type { Therapist as TherapistType } from "@/types/therapist";
import { getBadgeForTherapist } from "@/utils/getTherapistBadge";
import dayjs from "dayjs";

/* -----------------------------
 🔥 Helper: เวลาประเทศไทย
------------------------------ */
function nowThai(): Date {
  return dayjs().add(7, "hour").toDate();
}

/* -----------------------------
 🔥 Convert Firestore timestamp
------------------------------ */
function toDate(v: any): Date | null {
  if (!v) return null;
  if (typeof v?.toDate === "function") return v.toDate();
  if (v instanceof Date) return v;
  return new Date(v);
}

/* -----------------------------
 🔥 Parse เวลา 00:00 → {h,m}
------------------------------ */
function parseHHMM(s?: string | null) {
  if (!s) return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(s);
  return m ? { h: +m[1], m: +m[2] } : null;
}

/* -----------------------------
 🔥 คำนวณช่วงเวลางาน (รองรับข้ามคืน)
------------------------------ */
function workingWindow(now: Date, start?: string, end?: string) {
  const s = parseHHMM(start);
  const e = parseHHMM(end);
  if (!s || !e) return { start: null, end: null };

  const st = new Date(now);
  st.setHours(s.h, s.m, 0, 0);

  const ed = new Date(now);
  ed.setHours(e.h, e.m, 0, 0);

  let startMs = st.getTime();
  let endMs = ed.getTime();
  let nowMs = now.getTime();

  // ข้ามวัน เช่น 19:00 → 05:00
  if (endMs <= startMs) {
    endMs += 24 * 3600 * 1000;
    if (nowMs < startMs) nowMs += 24 * 3600 * 1000;
  }

  return {
    start: new Date(startMs),
    end: new Date(endMs),
    now: new Date(nowMs),
  };
}

/* -----------------------------
 🔥 คำนวณสถานะ therapist
------------------------------ */
function computeStatus(t: TherapistType): "available" | "bookable" | "resting" {
  const override = t.statusOverride ?? "Auto";

  // ถ้าตั้ง override → ใช้เลย
  if (override !== "Auto") return override;

  const now = nowThai();
  const { start, end, now: nowAdj } = workingWindow(now, t.startTime, t.endTime);
  if (!start || !end) return "resting";

  if (nowAdj < start || nowAdj >= end) return "resting"; // นอกเวลางาน

  if (t.activeBooking) return "bookable"; // กำลังทำงานอยู่

  return "available"; // อยู่ในเวลางาน และไม่ได้ทำงาน
}

/* -----------------------------
 🔥 nextAvailable เวลา
------------------------------ */
function calcNextAvailable(t: TherapistType): string {
  const now = nowThai();
  const busy = toDate(t.busyUntil);

  if (t.activeBooking && busy && busy > now) {
    return dayjs(busy).format("HH:mm");
  }

  return "";
}

const TherapistsPage: React.FC = () => {
  const [therapists, setTherapists] = useState<TherapistType[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<"name" | "rating" | "popular">("name");

  /* -----------------------------------------
     🔥 Firestore Real-time Fetch
  ----------------------------------------- */
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "therapists"), (snap) => {
      const raw = snap.docs.map((d) => ({
        ...(d.data() as TherapistType),
        id: d.id,
      }));

      const enriched = raw.map((t) => {
        const status = computeStatus(t);
        const next = calcNextAvailable(t);
        const badge = getBadgeForTherapist(t);

        return {
          ...t,
          available: status,
          nextAvailable: next,
          badge: badge?.key ?? null,
        };
      });

      setTherapists(enriched);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  /* -----------------------------------------
     🔥 Sorting
  ----------------------------------------- */
  const sorted = useMemo(() => {
    return [...therapists].sort((a, b) => {
      if (sortBy === "name") return (a.name || "").localeCompare(b.name || "");
      if (sortBy === "rating") return (b.rating || 0) - (a.rating || 0);
      return (b.totalBookings || 0) - (a.totalBookings || 0);
    });
  }, [therapists, sortBy]);

  return (
    <Box p={3}>
      <Typography variant="h4" fontWeight="bold" mb={2}>
        Therapists
      </Typography>

      {/* Sort Menu */}
      <FormControl size="small" sx={{ mb: 2 }}>
        <Select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)}>
          <MenuItem value="name">Sort by Name</MenuItem>
          <MenuItem value="rating">Sort by Rating</MenuItem>
          <MenuItem value="popular">Most Popular</MenuItem>
        </Select>
      </FormControl>

      {loading ? (
        <Box py={6} textAlign="center">
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={3}>
          {sorted.map((t) => (
            <Grid key={t.id} size={{ xs: 12, sm: 6, md: 4 }}>
              <TherapistProfileCard therapist={t} />
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
};

export default TherapistsPage;