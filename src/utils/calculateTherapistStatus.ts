// src/utils/calculateTherapistStatus.ts
import type { Therapist } from "@/types/therapist";

export type Avail = "available" | "bookable" | "resting";

/** Convert "HH:MM" to hours/minutes safely */
function parseHHMM(hhmm?: string | null) {
  if (!hhmm) return null;
  const m = /^([0-9]{1,2}):([0-9]{2})$/.exec(hhmm);
  if (!m) return null;
  return {
    h: Math.min(23, Number(m[1])),
    m: Math.min(59, Number(m[2])),
  };
}

/** Convert timestamp → JS Date safely */
function toDateSafe(v: any): Date | null {
  if (!v) return null;

  if (typeof v?.toDate === "function") {
    const d = v.toDate();
    return isNaN(d.getTime()) ? null : d;
  }

  if (v instanceof Date) return isNaN(v.getTime()) ? null : v;

  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

/** Format hh:mm (24hr) */
function formatHHMM(d: Date): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes()
  ).padStart(2, "0")}`;
}

/** Handle working window + overnight logic robustly */
export function getWorkingWindow(
  now: Date,
  startHHMM?: string,
  endHHMM?: string
) {
  const s = parseHHMM(startHHMM);
  const e = parseHHMM(endHHMM);

  if (!s || !e) return { start: null, end: null };

  const start = new Date(now);
  start.setHours(s.h, s.m, 0, 0);

  const end = new Date(now);
  end.setHours(e.h, e.m, 0, 0);

  // Overnight (end next day)
  if (end <= start) {
    // If now is before start → means we are already past midnight window
    if (now < start) {
      start.setDate(start.getDate() - 1);
      end.setDate(start.getDate() + 1);
    } else {
      end.setDate(end.getDate() + 1);
    }
  }

  return { start, end };
}

/** MASTER LOGIC — SunRed Official Therapist Engine */
export function calculateTherapistStatus(t: Therapist): {
  status: Avail;
  nextAvailable: string | null;
} {
  const now = new Date();

  // ---------------------------------------------------------
  // 1) ADMIN OVERRIDE
  // ---------------------------------------------------------
  if (t.statusOverride && t.statusOverride !== "Auto") {
    const override = t.statusOverride as Avail;

    return {
      status: override,
      nextAvailable: override === "available" ? "Now" : null,
    };
  }

  // ---------------------------------------------------------
  // 2) HOLIDAY
  // ---------------------------------------------------------
  if (t.isHoliday) {
    return {
      status: "resting",
      nextAvailable: null,
    };
  }

  // ---------------------------------------------------------
  // 3) WORKING HOURS
  // ---------------------------------------------------------
  const { start, end } = getWorkingWindow(now, t.startTime, t.endTime);
  const isInShift = !!(start && end && now >= start && now <= end);

  if (!isInShift) {
    return {
      status: "resting",
      nextAvailable: start ? formatHHMM(start) : null,
    };
  }

  // ---------------------------------------------------------
  // 4) BUSY UNTIL
  // ---------------------------------------------------------
  const busyUntil = toDateSafe(t.busyUntil);

  if (busyUntil && busyUntil > now) {
    return {
      status: "bookable",
      nextAvailable: formatHHMM(busyUntil),
    };
  }

  // ---------------------------------------------------------
  // 5) ACTIVE BOOKING (fallback)
  // ---------------------------------------------------------
  if (t.activeBooking || t.isBooked) {
    let next = null;

    // If booking has endAt → set nextAvailable
    if ((t as any).activeBooking?.endAt) {
      const endAt = toDateSafe((t as any).activeBooking.endAt);
      if (endAt) next = formatHHMM(endAt);
    }

    return {
      status: "bookable",
      nextAvailable: next,
    };
  }

  // ---------------------------------------------------------
  // 6) DEFAULT AVAILABLE
  // ---------------------------------------------------------
  return {
    status: "available",
    nextAvailable: "Now",
  };
}