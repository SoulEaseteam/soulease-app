// src/utils/calculateTherapistStatus.ts
//
// 🆕 Round 28an — fully anchored to Asia/Bangkok via /utils/time.
//
// All time math previously used JS `new Date()` + `.setHours()` (which
// reads the user's device timezone). For an outcall service that runs
// strictly on Bangkok wall-clock — that was a bug for any user whose
// phone was set to a different TZ (or had clock drift).
//
// Now: every comparison is done in BKK. Results stay identical for a
// user already in BKK, but become correct for travelers / wrong-TZ
// devices.

import type { Therapist } from "@/types/therapist";
import {
  nowBKK,
  toBKK,
  fmtBKK,
  workingWindowBKK,
} from "@/utils/time";

export type Avail = "available" | "bookable" | "resting" | "holiday";

/** 🆕 Round 28s267/28s271 — shared so every surface that displays or
 *  writes `overrideUntil` agrees on what "expired" means. */
export function isOverrideExpired(overrideUntil: unknown): boolean {
  const expiry = toBKK(overrideUntil as never);
  return !!expiry && expiry.isBefore(nowBKK());
}

/** Re-export for backwards compatibility with code that imports from here. */
export function getWorkingWindow(
  now: Date,
  startHHMM?: string,
  endHHMM?: string
) {
  // Convert to BKK Dayjs objects internally, then back to Date so older
  // callers (using .getTime() / Date methods) keep working unchanged.
  const w = workingWindowBKK(now, startHHMM, endHHMM);
  return {
    start: w.start ? w.start.toDate() : null,
    end: w.end ? w.end.toDate() : null,
  };
}

/** MASTER LOGIC — SunRed Official Therapist Engine (BKK-anchored) */
export function calculateTherapistStatus(t: Therapist): {
  status: Avail;
  nextAvailable: string | null;
} {
  const now = nowBKK();

  // ---------------------------------------------------------
  // 1) ADMIN OVERRIDE
  //
  //   🆕 Round 28s267 — an override past its `overrideUntil` stamp is
  //   treated as expired and falls through to the normal engine below.
  //   Overrides with no `overrideUntil` (legacy writes, or any future
  //   caller that doesn't stamp one) keep the old sticky-forever
  //   behaviour — this is additive, not a breaking change.
  // ---------------------------------------------------------
  const overrideExpiry = toBKK(t.overrideUntil);
  const overrideExpired = !!overrideExpiry && overrideExpiry.isBefore(now);
  if (t.statusOverride && t.statusOverride !== "Auto" && !overrideExpired) {
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
      status: "holiday",
      nextAvailable: null,
    };
  }

  // ---------------------------------------------------------
  // 3) WORKING HOURS — anchored to BKK, handles overnight shifts
  // ---------------------------------------------------------
  const { start, end } = workingWindowBKK(now, t.startTime, t.endTime);
  const isInShift = !!(
    start &&
    end &&
    now.isSameOrAfter(start) &&
    now.isSameOrBefore(end)
  );

  if (!isInShift) {
    return {
      status: "resting",
      nextAvailable: start ? start.format("HH:mm") : null,
    };
  }

  // ---------------------------------------------------------
  // 4) BUSY UNTIL
  // ---------------------------------------------------------
  const busyUntil = toBKK(t.busyUntil);

  if (busyUntil?.isAfter(now)) {
    return {
      status: "bookable",
      nextAvailable: busyUntil.format("HH:mm"),
    };
  }

  // ---------------------------------------------------------
  // 5) ACTIVE BOOKING (fallback)
  //
  //   `activeBooking` is typed as boolean but some legacy paths store
  //   an object with `endAt` — support both shapes defensively.
  // ---------------------------------------------------------
  if (t.activeBooking ?? t.isBooked) {
    let next: string | null = null;
    const ab = t.activeBooking as unknown;
    if (ab && typeof ab === "object" && "endAt" in ab) {
      const endAt = (ab as { endAt?: unknown }).endAt;
      next = fmtBKK(endAt as never, "HH:mm", "");
      if (!next) next = null;
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
