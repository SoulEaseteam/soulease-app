// src/utils/workingHours.ts
import { toDateLike } from "@/utils/dateHelpers";

/** เวลาไทย */
export function nowThai(): Date {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utc + 7 * 3600 * 1000);
}

/** แปลง HH:mm → {h, m} */
export function parseHHMM(hhmm?: string | null) {
  if (!hhmm) return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  return m ? { h: +m[1], m: +m[2] } : null;
}

/**
 * ⭐ ฟังก์ชัน Core สำหรับจัดการ “เวลาทำงานข้ามวัน”
 * เช่น start=19:00, end=05:00
 */
export function workingWindowThai(
  base: Date,
  startHHMM?: string,
  endHHMM?: string
) {
  const s = parseHHMM(startHHMM);
  const e = parseHHMM(endHHMM);

  if (!s || !e) return { start: null as Date | null, end: null as Date | null };

  const start = new Date(base);
  start.setHours(s.h, s.m, 0, 0);

  const end = new Date(base);
  end.setHours(e.h, e.m, 0, 0);

  let startMs = start.getTime();
  let endMs = end.getTime();
  let nowMs = base.getTime();

  if (endMs <= startMs) {
    // ⭐ ข้ามคืน เช่น 19:00 → 05:00
    endMs += 24 * 3600 * 1000;

    // ถ้าเวลาปัจจุบันยังไม่ถึง start ต้องเลื่อนไปวันถัดไป
    if (nowMs < startMs) nowMs += 24 * 3600 * 1000;
  }

  return { start: new Date(startMs), end: new Date(endMs) };
}

/** ตรวจว่า now อยู่ในเวลางานไหม */
export function inWorkingHours(
  now: Date,
  startHHMM?: string,
  endHHMM?: string
): boolean {
  const { start, end } = workingWindowThai(now, startHHMM, endHHMM);
  if (!start || !end) return false;
  return now >= start && now < end;
}

/** ตรวจว่า booking overlap ไหม */
export function hasBookingOverlap(
  newStart: Date,
  newEnd: Date,
  existStart: any,
  existEnd: any
): boolean {
  const s = toDateLike(existStart)?.getTime();
  const e = toDateLike(existEnd)?.getTime();
  if (!s || !e) return false;

  return newStart.getTime() < e && newEnd.getTime() > s;
}