// functions/src/telegram-post-bot/availability.ts
//
// 🆕 Round 28s119 — Live availability lookup from the same Firestore
//   `therapists` collection the admin dashboard reads. The bot can now
//   auto-detect who's actually standby right now (statusOverride +
//   working hours + busyUntil) instead of relying on a static rotation.
//
// Used by postToChannelManual when kind = "tonight"/"lineup" and the
// caller omits therapistId(s) — the bot fetches who's available now
// and assembles the post automatically. Saves View from picking
// manually every time concierge fires a Tonight post.
//
// Compatibility with the frontend availability engine
// (src/utils/availability.ts) is intentional but not enforced — this
// is a simplified server-side version. If View tweaks the rules in the
// admin dashboard, mirror the change here too.

import { getFirestore } from "firebase-admin/firestore";
import { POST_ROSTER, type TherapistRecord } from "./rotation";

// ─────────────────────────────────────────────────────────────
// Live therapist data shape — only the fields we actually check.
// Mirrors src/types/therapist.ts but kept loose to handle legacy docs.
// ─────────────────────────────────────────────────────────────
interface LiveTherapist {
  statusOverride?:
    | "available"
    | "bookable"
    | "resting"
    | "holiday"
    | "Auto"
    | null;
  isHoliday?: boolean;
  isBooked?: boolean;
  activeBooking?: boolean;
  busyUntil?: { _seconds?: number; seconds?: number } | string | number | null;
  startTime?: string; // "HH:mm" in BKK time
  endTime?: string; // "HH:mm" in BKK time
}

// ─────────────────────────────────────────────────────────────
// Current BKK time helpers (UTC+7).
// ─────────────────────────────────────────────────────────────
function nowBkkTotalMin(now: Date = new Date()): number {
  // UTC time → BKK = UTC+7, wrap at midnight.
  const utcMin = now.getUTCHours() * 60 + now.getUTCMinutes();
  return (utcMin + 7 * 60) % (24 * 60);
}

function parseHHMM(s: string): number | null {
  const m = s.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = Number(m[1]);
  const mm = Number(m[2]);
  if (h < 0 || h > 23 || mm < 0 || mm > 59) return null;
  return h * 60 + mm;
}

function isWithinWorkingHours(
  startTime: string,
  endTime: string,
  bkkMinNow: number,
): boolean {
  const start = parseHHMM(startTime);
  const end = parseHHMM(endTime);
  if (start === null || end === null) return false;
  if (end >= start) {
    // Same-day window (e.g., 13:00–22:00).
    return bkkMinNow >= start && bkkMinNow <= end;
  }
  // Overnight window (e.g., 19:00–05:00) — wraps past midnight.
  return bkkMinNow >= start || bkkMinNow <= end;
}

function parseTimestamp(
  v: { _seconds?: number; seconds?: number } | string | number | null | undefined,
): number | null {
  if (v == null) return null;
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const t = Date.parse(v);
    return Number.isFinite(t) ? t : null;
  }
  const sec = v._seconds ?? v.seconds;
  return typeof sec === "number" ? sec * 1000 : null;
}

// ─────────────────────────────────────────────────────────────
// Core availability rule. Returns true when the therapist is BOTH
// (a) within working hours / admin-flagged available AND
// (b) not actively booked / busyUntil in the future.
// ─────────────────────────────────────────────────────────────
function isAvailableNow(
  live: LiveTherapist,
  bkkMinNow: number,
  nowMs: number,
): boolean {
  // Hard NO conditions first.
  if (live.isHoliday === true) return false;
  if (live.activeBooking === true) return false;

  // Admin override takes priority over computed hours.
  const override = live.statusOverride;
  if (override === "resting" || override === "holiday") return false;
  if (override === "available" || override === "bookable") {
    // Still respect busyUntil even when admin says "available".
    const busyMs = parseTimestamp(live.busyUntil);
    if (busyMs !== null && busyMs > nowMs) return false;
    return true;
  }

  // override === "Auto" / null → compute from schedule.
  if (!live.startTime || !live.endTime) return false;
  if (!isWithinWorkingHours(live.startTime, live.endTime, bkkMinNow)) {
    return false;
  }

  const busyMs = parseTimestamp(live.busyUntil);
  if (busyMs !== null && busyMs > nowMs) return false;

  return true;
}

// ─────────────────────────────────────────────────────────────
// Public API.
// ─────────────────────────────────────────────────────────────
/**
 * Fetch all therapists currently available — joins live Firestore
 * status with POST_ROSTER metadata (name, area, bios). Order matches
 * POST_ROSTER (manual editorial order) so deterministic.
 */
export async function fetchAvailableTherapists(): Promise<TherapistRecord[]> {
  const db = getFirestore();
  const snap = await db.collection("therapists").get();

  const liveById = new Map<string, LiveTherapist>();
  snap.forEach((doc) => {
    liveById.set(doc.id, doc.data() as LiveTherapist);
  });

  const bkkMinNow = nowBkkTotalMin();
  const nowMs = Date.now();

  return POST_ROSTER.filter((t) => {
    const live = liveById.get(t.id);
    if (!live) return false;
    return isAvailableNow(live, bkkMinNow, nowMs);
  });
}
