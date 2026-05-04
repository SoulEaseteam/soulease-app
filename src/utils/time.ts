// src/utils/time.ts
//
// 🕐 Round 28an — single source of truth for time across SunRed.
//
// All times in SunRed are anchored to **Asia/Bangkok** (UTC+7, no DST).
// This file exports thin helpers so every component / hook reads time
// the same way regardless of:
//   • the user's device clock (could be wrong / in another TZ)
//   • the user's locale (their browser may format with weird AM/PM)
//   • whether the data is a Firestore Timestamp, JS Date, ISO string,
//     or epoch number
//
// Why dayjs?
//   • Already installed (~3kb gzipped)
//   • UTC + timezone plugins handle "convert this UTC moment to its
//     BKK wall-clock representation" without messing with raw setHours
//
// Usage:
//   import { nowBKK, fmtBKK, sameDayBKK, parseHHMMatBKK } from "@/utils/time";
//   const now = nowBKK();                    // dayjs in Asia/Bangkok
//   fmtBKK(booking.startAt, "HH:mm");        // "23:05"
//   fmtBKK(booking.startAt, "DD MMM YYYY");  // "16 Aug 2025"
//   sameDayBKK(a, b);                        // boolean
//   parseHHMMatBKK("19:00", new Date());     // dayjs at 19:00 BKK today

import dayjs, { type Dayjs } from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import customParseFormat from "dayjs/plugin/customParseFormat";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import { Timestamp } from "firebase/firestore";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(customParseFormat);
dayjs.extend(isSameOrBefore);
dayjs.extend(isSameOrAfter);

/** Canonical SunRed timezone — never read from process.env or user
 *  locale. Bangkok is always UTC+7 with no DST shift. */
export const SUNRED_TZ = "Asia/Bangkok" as const;

/** Anything that can stand in for a moment in time. */
export type TimeLike =
  | Timestamp
  | Date
  | Dayjs
  | string
  | number
  | null
  | undefined;

/** Coerce any TimeLike into a Dayjs anchored at Asia/Bangkok.
 *  Returns `null` for unparseable / nullish input. */
export function toBKK(v: TimeLike): Dayjs | null {
  if (v === null || v === undefined) return null;

  // Already a Dayjs
  if (dayjs.isDayjs(v)) {
    return (v as Dayjs).isValid() ? (v as Dayjs).tz(SUNRED_TZ) : null;
  }

  // Firestore Timestamp → Date
  if (
    typeof v === "object" &&
    v !== null &&
    "toDate" in v &&
    typeof (v as { toDate?: unknown }).toDate === "function"
  ) {
    const d = (v as { toDate: () => Date }).toDate();
    if (Number.isNaN(d.getTime())) return null;
    return dayjs(d).tz(SUNRED_TZ);
  }

  if (v instanceof Date) {
    if (Number.isNaN(v.getTime())) return null;
    return dayjs(v).tz(SUNRED_TZ);
  }

  if (typeof v === "number") {
    return dayjs(v).tz(SUNRED_TZ);
  }

  if (typeof v === "string") {
    const d = dayjs(v);
    if (!d.isValid()) return null;
    return d.tz(SUNRED_TZ);
  }

  return null;
}

/** "Now" pinned to Asia/Bangkok regardless of the device clock's TZ. */
export function nowBKK(): Dayjs {
  return dayjs().tz(SUNRED_TZ);
}

/** Format any TimeLike in Bangkok wall-clock with a dayjs format string.
 *  Examples:
 *    fmtBKK(booking.startAt, "HH:mm")          → "23:05"
 *    fmtBKK(booking.startAt, "DD MMM YYYY")    → "16 Aug 2025"
 *    fmtBKK(booking.startAt, "YYYY-MM-DD")     → "2025-08-16"
 *  Returns the `fallback` (default "—") for null/invalid input. */
export function fmtBKK(
  v: TimeLike,
  format: string,
  fallback = "—"
): string {
  const d = toBKK(v);
  return d ? d.format(format) : fallback;
}

/** 🆕 Round 28b15 (founder spec) — pretty time format showing both
 *  Single canonical format `HH:mm A` (e.g. `20:30 PM`, `09:00 AM`).
 *  Round 28b28 (founder 2026-05-04) — collapsed previous parens form
 *  `21:00 (9:00 PM)` to `21:00 PM` for consistency across the app. */
export function fmtBKKTime(v: TimeLike, fallback = "—"): string {
  const d = toBKK(v);
  if (!d) return fallback;
  return d.format("HH:mm A");
}

/** Compact pretty time — single hour with AM/PM, no parentheses.
 *  Use in tight spaces (small chips, table cells): `9 PM`, `2:30 PM`. */
export function fmtBKKTimeShort(v: TimeLike, fallback = "—"): string {
  const d = toBKK(v);
  if (!d) return fallback;
  // Drop ":00" so a round hour reads "9 PM" not "9:00 PM"
  const m = d.minute();
  return m === 0 ? d.format("h A") : d.format("h:mm A");
}

/**
 * 🆕 Round 28b28 (founder 2026-05-04) — Single canonical user-facing
 * time format: `HH:mm A` → "20:30 PM" / "09:00 AM".
 *
 * Why the unusual mix of 24h hour + AM/PM tag?
 *   • 24h `HH:mm` removes 12h ambiguity for Thai customers reading
 *     receipts late at night.
 *   • The trailing AM/PM tag matches Western expectations on
 *     iOS/Android lock-screen notifications (where bookings preview).
 *
 * Format an "HH:mm" string (e.g. "21:00") into "21:00 PM" form.
 * Used by status pills that already hold HH:mm and don't need a
 * full date. Falls back to the input if it can't parse.
 *
 * Previous form was "21:00 (9 PM)" with parens — founder dropped
 * the parens 2026-05-04 ("กระชับขึ้น เปลี่ยนตัวรายงานให้สม่ำเสมอ").
 */
export function prettyHHMM(hhmm: string | null | undefined): string {
  if (!hhmm) return "";
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm);
  if (!m) return hhmm;
  const hh = parseInt(m[1]!, 10);
  const mm = parseInt(m[2]!, 10);
  if (Number.isNaN(hh) || Number.isNaN(mm)) return hhmm;
  const period = hh >= 12 ? "PM" : "AM";
  const hhStr = hh.toString().padStart(2, "0");
  const mmStr = mm.toString().padStart(2, "0");
  return `${hhStr}:${mmStr} ${period}`;
}

/** True when both moments fall on the same Bangkok calendar day. */
export function sameDayBKK(a: TimeLike, b: TimeLike): boolean {
  const da = toBKK(a);
  const db = toBKK(b);
  if (!da || !db) return false;
  return da.format("YYYY-MM-DD") === db.format("YYYY-MM-DD");
}

/** True when `v` is on the current Bangkok calendar day. */
export function isTodayBKK(v: TimeLike): boolean {
  return sameDayBKK(v, nowBKK());
}

/** Parse "HH:mm" into a Dayjs anchored at the same Bangkok calendar
 *  day as `anchor` (default = now BKK). Returns null on invalid input.
 *  Useful for working-hours arithmetic.
 *
 *  Example: parseHHMMatBKK("19:00") → today 19:00 BKK */
export function parseHHMMatBKK(
  hhmm: string | null | undefined,
  anchor: TimeLike = nowBKK()
): Dayjs | null {
  if (!hhmm) return null;
  const m = /^([0-9]{1,2}):([0-9]{2})$/.exec(hhmm);
  if (!m) return null;
  const h = Math.min(23, Number(m[1]));
  const min = Math.min(59, Number(m[2]));
  const a = toBKK(anchor) ?? nowBKK();
  return a.hour(h).minute(min).second(0).millisecond(0);
}

/** Working-window resolver — handles overnight shifts (19:00 → 05:00).
 *  Returns the start/end Dayjs in BKK that contain `now`, or
 *  null/null when input is invalid.
 *
 *  Logic:
 *    same-day  shift: start ≤ end       → window = [start, end]
 *    overnight shift: end ≤ start       →
 *      if now ≥ start  → window = [start, end+1d]
 *      if now < start  → window = [start-1d, end]   (we're in the
 *                                                    tail of yesterday)
 */
export function workingWindowBKK(
  now: TimeLike,
  startHHMM: string | null | undefined,
  endHHMM: string | null | undefined
): { start: Dayjs | null; end: Dayjs | null } {
  const nowB = toBKK(now);
  if (!nowB) return { start: null, end: null };

  const s = parseHHMMatBKK(startHHMM, nowB);
  const e = parseHHMMatBKK(endHHMM, nowB);
  if (!s || !e) return { start: null, end: null };

  if (e.isAfter(s)) {
    // Same-day shift
    return { start: s, end: e };
  }

  // Overnight shift
  if (nowB.isSameOrAfter(s)) {
    return { start: s, end: e.add(1, "day") };
  }
  return { start: s.subtract(1, "day"), end: e };
}

/** Start of today (00:00) anchored to BKK — useful for "today" filters. */
export function startOfTodayBKK(): Dayjs {
  return nowBKK().startOf("day");
}

/** End of today (23:59:59.999) anchored to BKK. */
export function endOfTodayBKK(): Dayjs {
  return nowBKK().endOf("day");
}

/** Human-friendly "X minutes ago" / "in 2 hours" / "tomorrow at 19:00"
 *  — built on dayjs but anchored to BKK so the relative phrasing
 *  doesn't drift across timezones. Falls back to a plain BKK timestamp. */
export function relativeBKK(v: TimeLike): string {
  const d = toBKK(v);
  if (!d) return "—";
  const now = nowBKK();
  const diffMin = d.diff(now, "minute");
  if (diffMin > -1 && diffMin < 1) return "now";
  if (diffMin >= 1 && diffMin < 60) return `in ${diffMin} min`;
  if (diffMin <= -1 && diffMin > -60) return `${Math.abs(diffMin)} min ago`;
  if (sameDayBKK(d, now)) return d.format("HH:mm");
  if (sameDayBKK(d, now.add(1, "day"))) return `tomorrow ${d.format("HH:mm")}`;
  if (sameDayBKK(d, now.subtract(1, "day"))) return `yesterday ${d.format("HH:mm")}`;
  return d.format("DD MMM HH:mm");
}
