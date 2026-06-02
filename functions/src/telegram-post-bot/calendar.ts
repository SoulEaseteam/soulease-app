// functions/src/telegram-post-bot/calendar.ts
//
// 🆕 Round 28s225 — BKK-timezone date helpers for the promo scheduler.
//
// Provides two routing keys:
//   • dayKey(date)        — "mon" | "tue" | ... | "sun"  (7-day rotation)
//   • activeHoliday(date) — Holiday key or null          (override flag)
//
// All decisions happen in Asia/Bangkok local time so the cron's UTC
// firing window translates to the visitor's perception of "today".

export type DayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

export type Holiday =
  | "valentine"   // Feb 14
  | "songkran"    // Apr 13-15 (extended national holiday)
  | "halloween"   // Oct 31
  | "christmas"   // Dec 24-25
  | "newyear";    // Dec 30 - Jan 2

/** Pull year/month/day in Asia/Bangkok TZ regardless of server TZ. */
function bkkParts(d: Date): { y: number; m: number; day: number; dow: number } {
  // toLocaleString with timezone gives us the BKK wall clock; parse it back.
  const s = d.toLocaleString("en-US", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  // "MM/DD/YYYY, HH:mm" → parse
  const match = s.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (!match) {
    // Fallback to UTC parts if locale string is unexpected.
    return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, day: d.getUTCDate(), dow: d.getUTCDay() };
  }
  const m = Number(match[1]);
  const day = Number(match[2]);
  const y = Number(match[3]);
  // Derive day-of-week from a UTC anchor (cheaper than parsing the locale dow).
  const anchor = new Date(Date.UTC(y, m - 1, day));
  return { y, m, day, dow: anchor.getUTCDay() };
}

const DOW_KEYS: DayKey[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

export function dayKey(date: Date = new Date()): DayKey {
  const { dow } = bkkParts(date);
  return DOW_KEYS[dow];
}

/**
 * Return the active SunRed promo holiday for `date` in BKK time, or
 * null if no holiday applies. When two ranges overlap (rare), the
 * earlier-declared key wins by switch order.
 */
export function activeHoliday(date: Date = new Date()): Holiday | null {
  const { m, day } = bkkParts(date);

  // Songkran extended window (Apr 12-16 covers travel days)
  if (m === 4 && day >= 12 && day <= 16) return "songkran";

  // Valentine's Day window (Feb 13-14 catches early-evening prep)
  if (m === 2 && (day === 13 || day === 14)) return "valentine";

  // Halloween (Oct 30-31)
  if (m === 10 && (day === 30 || day === 31)) return "halloween";

  // Christmas (Dec 23-26 — Eve, Day, Boxing Day buffer)
  if (m === 12 && day >= 23 && day <= 26) return "christmas";

  // New Year cluster (Dec 30 - Jan 2)
  if (m === 12 && day >= 30) return "newyear";
  if (m === 1 && day <= 2) return "newyear";

  return null;
}
