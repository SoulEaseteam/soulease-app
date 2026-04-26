// src/utils/therapistTimeUtils.ts

import { Timestamp } from "firebase/firestore";
import {
  computeStatus,
  calculateNextAvailable,
  type TherapistStatus,
  type TherapistStatusOverride,
} from "@/utils/therapistStatus";

export type Avail = TherapistStatus;

/** Get current time in Thailand (UTC+7) */
export function nowThai(): Date {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utc + 7 * 3600 * 1000);
}

/** Normalize Firebase Timestamp / Date / number / string to JS Date */
export function toDateLike(v: any): Date | null {
  try {
    if (!v) return null;
    if (typeof v?.toDate === "function") return v.toDate();
    if (v instanceof Date) return v;
    if (typeof v === "number") return new Date(v);
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

/** Parse "HH:mm" string */
export function parseHHMM(hhmm?: string | null) {
  if (!hhmm) return null;
  const m = /^\s*(\d{1,2}):(\d{2})\s*$/.exec(hhmm);
  return m ? { h: +m[1], m: +m[2] } : null;
}

/** Working window in Thai time, including cross-midnight support */
export function workingWindowThai(
  now: Date,
  startHHMM?: string,
  endHHMM?: string
) {
  const s = parseHHMM(startHHMM);
  const e = parseHHMM(endHHMM);

  if (!s || !e) {
    return { start: null as Date | null, end: null as Date | null };
  }

  const start = new Date(now);
  start.setHours(s.h, s.m, 0, 0);

  const end = new Date(now);
  end.setHours(e.h, e.m, 0, 0);

  let startMs = start.getTime();
  let endMs = end.getTime();
  let nowMs = now.getTime();

  if (endMs <= startMs) {
    endMs += 24 * 3600 * 1000;
    if (nowMs < startMs) nowMs += 24 * 3600 * 1000;
  }

  return {
    start: new Date(startMs),
    end: new Date(endMs),
  };
}

/** Check if current time is within an active booking */
export function hasActiveBooking(
  now: Date,
  start?: Date | null,
  end?: Date | null
): boolean {
  return !!(start && end && now >= start && now < end);
}

/**
 * Next available time helper
 * ถ้ามี busyUntil และยังไม่หมด → คืน busyUntil
 * ถ้าไม่งั้นใช้ logic กลางจาก therapistStatus.ts
 */
export function calcNextAvailable(t: {
  serviceDurationMinutes: number;
  startTime?: string;
  endTime?: string;
  busyUntil?: Date | Timestamp | null;
}): string {
  const now = nowThai();
  const busy = toDateLike(t.busyUntil);

  if (busy && busy > now) {
    return busy.toLocaleTimeString("th-TH", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  }

  if (!t.startTime || !t.endTime) return "";

  return calculateNextAvailable(
    t.serviceDurationMinutes,
    t.startTime,
    t.endTime
  );
}

/**
 * ใช้ status engine กลางจาก therapistStatus.ts เท่านั้น
 */
export function computeTherapistAvailability(t: {
  startTime?: string;
  endTime?: string;
  statusOverride?: TherapistStatusOverride;
  activeBooking?: boolean;
  isHoliday?: boolean;
}): Avail {
  return computeStatus({
    startTime: t.startTime,
    endTime: t.endTime,
    isBooked: t.activeBooking,
    isHoliday: t.isHoliday,
    statusOverride: t.statusOverride,
  });
}