// src/utils/therapists/computeTherapistStatus.ts
import dayjs from "dayjs";

export type Avail = "available" | "bookable" | "resting";

export type FirestoreTS = any; // Firebase Timestamp compatible

export type TherapistDoc = {
  id?: string;
  name?: string;

  startTime?: string;
  endTime?: string;

  statusOverride?: "Auto" | Avail | null;
  mode?: "auto" | "manual";
  manualOpen?: boolean;
  manualStatus?: Avail | "booked" | null;
  isHoliday?: boolean;

  isBooked?: boolean;
  busyUntil?: FirestoreTS | Date | string | null;

  online?: boolean;
  lastActive?: FirestoreTS | Date | string | null;

  currentLocation?: { lat: number; lng: number } | null;
  lat?: number | string | null;
  lng?: number | string | null;
};

// ---------------- Utils ----------------
export function toDateSafe(v: any): Date | null {
  try {
    if (!v) return null;
    if (typeof v?.toDate === "function") return v.toDate();
    if (typeof v?.seconds === "number") return new Date(v.seconds * 1000);
    if (v instanceof Date) return v;
    return new Date(v);
  } catch {
    return null;
  }
}

export function parseHHMM(hhmm?: string | null) {
  if (!hhmm) return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) return null;
  return {
    h: Math.min(23, Math.max(0, +m[1])),
    i: Math.min(59, Math.max(0, +m[2])),
  };
}

/** รองรับกะทำงานที่ข้ามคืนจริง */
export function workingWindow(now: Date, startHHMM?: string, endHHMM?: string) {
  const s = parseHHMM(startHHMM);
  const e = parseHHMM(endHHMM);
  if (!s || !e) return { start: null, end: null };

  let start = new Date(now);
  start.setHours(s.h, s.i, 0, 0);

  let end = new Date(now);
  end.setHours(e.h, e.i, 0, 0);

  // ถ้าเวลาเลิก <= เวลาเริ่ม → ถือว่าข้ามคืน
  if (end <= start) {
    if (now < start) start.setDate(start.getDate() - 1);
    end.setDate(start.getDate() + 1);
  }

  return { start, end };
}

/** ออนไลน์ถ้า explicit online หรือ lastActive ภายใน 3 นาที */
export function isOnline(t: TherapistDoc): boolean {
  if (t.online === true) return true;
  const la = toDateSafe(t.lastActive);
  if (!la) return false;
  return Date.now() - la.getTime() <= 3 * 60 * 1000;
}

// ---------------- Core Status Logic ----------------
export function computeTherapistStatus(t: TherapistDoc, now = new Date()): Avail {
  // 1. Manual override มาก่อน
  if (t.statusOverride && t.statusOverride !== "Auto") {
    return t.statusOverride as Avail;
  }

  // Manual mode แบบใหม่
  if (t.mode === "manual") {
    if (t.manualOpen === false) return "resting";

    if (t.manualStatus) {
      const ms = t.manualStatus === "booked"
        ? "bookable"
        : (t.manualStatus as Avail);
      return ms;
    }
  }

  // วันหยุด
  if (t.isHoliday) return "resting";

  // 2. ตรวจว่าปัจจุบันอยู่ในกะไหม
  const { start, end } = workingWindow(now, t.startTime, t.endTime);
  const inShift = start && end ? now >= start && now <= end : false;
  if (!inShift) return "resting";

  // 3. ถ้าติด booking หรือ busyUntil ยังไม่หมดเวลา → bookable
  const busy = toDateSafe(t.busyUntil);
  if ((busy && busy > now) || t.isBooked) {
    return "bookable";
  }

  // 4. ว่างจริง
  return "available";
}

export function computeNextAvailable(t: TherapistDoc, now = new Date()): string | null {
  const busy = toDateSafe(t.busyUntil);
  if (busy && busy > now) return dayjs(busy).format("HH:mm");

  const { start, end } = workingWindow(now, t.startTime, t.endTime);
  const inShift = start && end ? now >= start && now <= end : false;

  if (inShift) return "Now";
  if (!start) return null;

  let s = new Date(start);
  if (now > s) s.setDate(s.getDate() + 1);

  return dayjs(s).format("HH:mm");
}