// src/utils/timeUtils.ts
import dayjs from "dayjs";

export type Avail = "available" | "bookable" | "resting";

/** 🇹🇭 เวลาไทย */
export function nowThai(): Date {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utc + 7 * 3600 * 1000);
}

/** แปลงค่าต่าง ๆ เป็น Date */
export function toDateLike(v: any): Date | null {
  try {
    if (!v) return null;
    if (typeof v?.toDate === "function") return v.toDate();
    if (v instanceof Date) return v;
    return new Date(v);
  } catch {
    return null;
  }
}

export function parseHHMM(hhmm?: string | null) {
  if (!hhmm) return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  return m ? { h: +m[1], m: +m[2] } : null;
}

/**
 * 🕒 รองรับเวลาข้ามวันแบบ 100%
 * เช่น 19:00–05:00
 */
export function workingWindowThai(now: Date, startHHMM?: string, endHHMM?: string) {
  const s = parseHHMM(startHHMM);
  const e = parseHHMM(endHHMM);
  if (!s || !e) {
    return { start: null, end: null, inWork: false };
  }

  const start = new Date(now);
  start.setHours(s.h, s.m, 0, 0);

  const end = new Date(now);
  end.setHours(e.h, e.m, 0, 0);

  let sMs = start.getTime();
  let eMs = end.getTime();
  let nMs = now.getTime();

  // ข้ามวัน เช่น 19:00–05:00
  if (eMs <= sMs) {
    eMs += 86400_000; // +1 วัน
    if (nMs < sMs) nMs += 86400_000; // เวลาอยู่ก่อน start → เลื่อนไปวันถัดไป
  }

  return {
    start: new Date(sMs),
    end: new Date(eMs),
    inWork: nMs >= sMs && nMs <= eMs,
  };
}

/** กำลังทำ booking อยู่ไหม */
export function hasActiveBooking(now: Date, start?: Date | null, end?: Date | null) {
  return !!(start && end && now >= start && now < end);
}

/**
 * 🔮 nextAvailable แบบ PRO
 * รองรับ:
 * - busyUntil
 * - เวลาข้ามวัน
 * - จองเสร็จกลางดึก → ข้ามไปวันถัดไป
 */
export function calcNextAvailable(
  startDate: Date,
  duration: number,
  _padding: number,
  t: { startTime?: string; endTime?: string; busyUntil?: any }
): string {
  const now = nowThai();

  // 1) ถ้ามี busyUntil → จบที่เวลานั้น
  const busy = toDateLike(t.busyUntil);
  if (busy && busy > now) {
    return dayjs(busy).format("HH:mm");
  }

  // 2) เวลางานของวันนี้ (รองรับข้ามวัน)
  const { start, end } = workingWindowThai(now, t.startTime, t.endTime);
  if (!start || !end) return "";

  // 3) ถ้าตอนนี้เลยเวลางานไปแล้ว → next = start ของวันถัดไป
  if (now > end) {
    const next = dayjs(start).add(1, "day");
    return next.format("HH:mm");
  }

  // 4) ถ้าเรายังอยู่ในเวลางาน แต่ไม่มีงาน → available now
  if (now >= start && now <= end) {
    return dayjs(now).format("HH:mm");
  }

  // 5) นอกเวลางาน → next = start กะถัดไป
  if (now < start) {
    return dayjs(start).format("HH:mm");
  }

  return "";
}

/**
 * 🧠 สถานะของ Therapist
 * auto = ทำงานเต็มระบบ เหมือน sunred.vip เวอร์ชันล่าสุด
 */
export function computeStatus(t: {
  startTime?: string;
  endTime?: string;
  statusOverride?: Avail | "Auto" | null;
  activeBooking?: boolean;
}): Avail {
  const override = t.statusOverride ?? "Auto";
  if (override !== "Auto") return override as Avail;

  const now = nowThai();
  const { start, end, inWork } = workingWindowThai(now, t.startTime, t.endTime);

  if (!start || !end || !inWork) return "resting";

  if (t.activeBooking) return "bookable";

  return "available";
}