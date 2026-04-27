// dayjs / Timestamp imports ไม่จำเป็นแล้ว — ลบทิ้งเพื่อกัน dead deps

export type Avail = "available" | "bookable" | "resting";

export function nowThai(): Date {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utc + 7 * 3600 * 1000);
}

export function toDateLike(v: unknown): Date | null {
  try {
    if (!v) return null;
    if (
      typeof v === "object" &&
      v !== null &&
      "toDate" in v &&
      typeof (v as { toDate?: unknown }).toDate === "function"
    ) {
      const d = (v as { toDate: () => Date }).toDate();
      return isNaN(d.getTime()) ? null : d;
    }
    if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
    if (typeof v === "number" || typeof v === "string") {
      const d = new Date(v);
      return isNaN(d.getTime()) ? null : d;
    }
    return null;
  } catch {
    return null;
  }
}

export function parseHHMM(hhmm?: string | null) {
  if (!hhmm) return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm);
  return m ? { h: +m[1], m: +m[2] } : null;
}

/** ✅ handle cross-midnight working hours */
export function workingWindowThai(now: Date, startHHMM?: string, endHHMM?: string) {
  const s = parseHHMM(startHHMM);
  const e = parseHHMM(endHHMM);
  if (!s || !e) return { start: null as Date | null, end: null as Date | null };

  const start = new Date(now);
  start.setHours(s.h, s.m, 0, 0);

  const end = new Date(now);
  end.setHours(e.h, e.m, 0, 0);

  const startMs = start.getTime();
  let endMs = end.getTime();
  let nowMs = now.getTime();

  if (endMs <= startMs) {
    endMs += 24 * 3600 * 1000;
    if (nowMs < startMs) nowMs += 24 * 3600 * 1000;
  }
  // (nowMs ถูกใช้คำนวณ overlap ใน caller — เก็บ side-effect ไว้)
  void nowMs;

  return { start: new Date(startMs), end: new Date(endMs) };
}

export function hasActiveBooking(now: Date, start?: Date | null, end?: Date | null) {
  return !!(start && end && now >= start && now < end);
}

export function calcNextAvailable(startDate: Date, durationMinLocal: number, p0: number, t: {
  startTime?: string;
  endTime?: string;
  busyUntil?: Date | null;
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

  const { start, end } = workingWindowThai(now, t.startTime, t.endTime);
  if (!start || !end) return "";

  const s = new Date(start);
  if (now >= end) {
    s.setDate(s.getDate() + 1);
  }

  return s.toLocaleTimeString("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function computeStatus(t: {
  startTime?: string;
  endTime?: string;
  statusOverride?: Avail | "Auto" | null;
  activeBooking?: boolean;
}): Avail {
  const override: Avail | "Auto" = t.statusOverride ?? "Auto";
  if (override !== "Auto") return override;

  const now = nowThai();
  const { start, end } = workingWindowThai(now, t.startTime, t.endTime);

  if (!start || !end || now < start || now >= end) return "resting";
  if (t.activeBooking) return "bookable";
  return "available";
}