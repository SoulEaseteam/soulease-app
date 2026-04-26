// src/utils/schedule.ts
import dayjs from "dayjs";
import { Timestamp } from "firebase/firestore";
import isBetween from "dayjs/plugin/isBetween";
dayjs.extend(isBetween);

/** -----------------------------------------
 * Basic helpers
 * ----------------------------------------*/
export const nowThai = () => {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utc + 7 * 3600 * 1000);
};

export const toDate = (v: any): dayjs.Dayjs | null => {
  try {
    if (!v) return null;
    if (v instanceof Date) return dayjs(v);
    if (typeof v?.toDate === "function") return dayjs(v.toDate());
    if (typeof v === "number") return dayjs(v);
    if (typeof v === "string") return dayjs(v);
    return null;
  } catch {
    return null;
  }
};

/** -----------------------------------------
 * Working shift (support cross-midnight)
 * ----------------------------------------*/
export const parseHHMM = (s?: string | null) => {
  if (!s) return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(s);
  if (!m) return null;
  return { h: +m[1], m: +m[2] };
};

export const getWorkingWindow = (startHHMM?: string, endHHMM?: string) => {
  const now = nowThai();
  const startP = parseHHMM(startHHMM);
  const endP = parseHHMM(endHHMM);

  if (!startP || !endP) return { start: null, end: null };

  let start = dayjs(now).hour(startP.h).minute(startP.m).second(0).millisecond(0);
  let end = dayjs(now).hour(endP.h).minute(endP.m).second(0).millisecond(0);

  if (end.isBefore(start)) {
    end = end.add(1, "day"); // cross-midnight
    if (dayjs(now).isBefore(start)) now.setDate(now.getDate() + 1);
  }

  return { start, end };
};

/** -----------------------------------------
 * Booking Type
 * ----------------------------------------*/
export interface BookingLike {
  therapistId: string;
  status: string;
  startAt?: any;
  endAt?: any;
}

/** -----------------------------------------
 * Status and Next Available (PRO VERSION)
 * ----------------------------------------*/
export const calcStatusAndNext = (
  now: Date,
  bookings: BookingLike[],
  opts: { startHHMM?: string; endHHMM?: string }
) => {
  const nowD = dayjs(now);
  const { start, end } = getWorkingWindow(opts.startHHMM, opts.endHHMM);

  // ❌ not working
  if (!start || !end || nowD.isBefore(start) || nowD.isAfter(end)) {
    return { status: "resting" as const, nextAvailable: "" };
  }

  const list = bookings
    .map((b) => ({
      start: toDate(b.startAt),
      end: toDate(b.endAt),
      status: (b.status || "").toLowerCase(),
    }))
    .filter((b) => b.start && b.end) as {
      start: dayjs.Dayjs;
      end: dayjs.Dayjs;
      status: string;
    }[];

  // filter only valid working-shift bookings
  const withinShift = list
    .map((b) => ({
      start: b.start!.isBefore(start!) ? start! : b.start!,
      end: b.end!.isAfter(end!) ? end! : b.end!,
      status: b.status,
    }))
    .sort((a, b) => a.start.valueOf() - b.start.valueOf());

  // ------------------------------------------------
  // 1) Active booking?
  // ------------------------------------------------
  for (const b of withinShift) {
    if (nowD.isBetween(b.start, b.end, null, "[)")) {
      return {
        status: "bookable" as const,
        nextAvailable: b.end.format("HH:mm"),
      };
    }
  }

  // ------------------------------------------------
  // 2) If not active, find the next booking
  // ------------------------------------------------
  const future = withinShift.find((b) => b.start.isAfter(nowD));

  if (!future) {
    // no more bookings → AVAILABLE
    return { status: "available" as const, nextAvailable: "" };
  }

  // ------------------------------------------------
  // 3) Find gaps between bookings
  // ------------------------------------------------
  let cursor = dayjs(nowD);

  for (const b of withinShift) {
    if (cursor.isBefore(b.start)) {
      // มีช่องว่างก่อน booking ต่อไป
      return {
        status: "available" as const,
        nextAvailable: "",
      };
    }

    if (cursor.isBetween(b.start, b.end, null, "[)")) {
      cursor = b.end;
    }
  }

  // ------------------------------------------------
  // 4) Cursor now points to earliest free slot
  // ------------------------------------------------
  if (cursor.isSameOrAfter(end)) {
    // end of shift
    return {
      status: "resting" as const,
      nextAvailable: start.add(1, "day").format("HH:mm"),
    };
  }

  return {
    status: "available" as const,
    nextAvailable: cursor.isAfter(nowD) ? cursor.format("HH:mm") : "",
  };
};