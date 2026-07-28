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
  // 1) REAL ACTIVE BOOKING — checked FIRST, wins over everything below.
  //
  //   🆕 Round 28x.117 (founder: "พนักงานที่เปลี่ยนสถานะเอง ต่อให้เปลี่ยนเอง
  //   เวลามีจอง สถานะก็จะเปลี่ยนไปตามอยู่ดีเช่นกัน") — a genuine active job
  //   must always show as busy, even if the therapist (or admin) has a
  //   manual statusOverride sitting on the doc saying otherwise. Before
  //   this round, statusOverride was checked FIRST and was sticky-forever
  //   with no auto-clear on booking accept/start (grepped every writer —
  //   none reset it), so a therapist who self-flagged "Available" or
  //   "Resting" earlier in the day could keep showing that stale status
  //   straight through an actual live job — a real double-booking /
  //   trust risk, not just a display quirk. Ground truth for "is she
  //   physically on a job right now" is busyUntil/activeBooking, not a
  //   flag either side set by hand hours earlier.
  //
  //   `activeBooking` is typed as boolean but some legacy paths store
  //   an object with `endAt` — support both shapes defensively.
  //
  //   🆕 28x.99y (founder "Milo ทำไมขึ้น Bookable ทั้งที่ว่าง") — CORRECTION
  //   (28x.102): activeBooking/busyUntil DO have a live writer — the
  //   syncTherapistBusyStatus reconciler (functions/src/index.ts, 28x.31,
  //   every 2 min). But Milo + Pare still sat with activeBooking:true and
  //   a busyUntil 8 days expired, so the reconciler's clear branch has a
  //   real gap for some end-of-job path. This guard is the client-side
  //   defense: when the doc's busyUntil has ALREADY expired, treat the
  //   activeBooking flag as part of that same finished job and ignore it
  //   (self-heals whatever the reconciler misses, no migration). A flag
  //   with NO busyUntil keeps the legacy sticky behaviour — there's no
  //   window to judge staleness against.
  // ---------------------------------------------------------
  const busyUntil = toBKK(t.busyUntil);

  if (busyUntil?.isAfter(now)) {
    return {
      status: "bookable",
      nextAvailable: busyUntil.format("HH:mm"),
    };
  }

  const busyWindowExpired = !!busyUntil && !busyUntil.isAfter(now);
  if ((t.activeBooking ?? t.isBooked) && !busyWindowExpired) {
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
  // 2) ADMIN / SELF OVERRIDE — only reached when NOT actively on a job.
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
  // 3) HOLIDAY
  // ---------------------------------------------------------
  if (t.isHoliday) {
    return {
      status: "holiday",
      nextAvailable: null,
    };
  }

  // ---------------------------------------------------------
  // 4) WORKING HOURS — anchored to BKK, handles overnight shifts
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
  // 5) DEFAULT AVAILABLE
  // ---------------------------------------------------------
  return {
    status: "available",
    nextAvailable: "Now",
  };
}
