// src/hooks/useTherapistBookings.ts
//
// 🆕 Phase 5 (founder 2026-05-01): subscribe to live Firestore bookings
// for a given therapist so the UI can react in real-time after a booking
// is placed:
//
//   • StatusPill on TherapistDetailPage flips green → orange ("Currently
//     Busy. Available from 17:30") whenever an active booking covers the
//     current moment, with the next-available time derived from the
//     latest booking's `endAt`.
//
//   • Time-slot grid in StepDateTime greys out any slot whose
//     [slotStart, slotStart + durationMin) window overlaps an existing
//     booking, so the same therapist never gets double-booked.
//
// All times are kept as native Date so callers can mix with dayjs/Date
// freely.

import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  query,
  where,
  type DocumentData,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
// 🆕 Round 28an — BKK-anchored display formatting.
import { fmtBKK } from "@/utils/time";
// Round 28s55 — shared stats aggregation so the combined feed hook
// can derive loyalty stats from the same snapshot it uses for the
// active-booking status engine (one listener instead of two).
import {
  computeBookingStats,
  EMPTY_BOOKING_STATS,
  type TherapistBookingStats,
} from "@/hooks/useTherapistBookingStats";

export interface TherapistBooking {
  id: string;
  startAt: Date;
  endAt: Date;
  durationMin: number;
  /** "confirmed" | "cancelled" | "completed" | …  — completed/cancelled are filtered out by the hook */
  status: string;
}

// 🆕 Round 28s267 — exported so AdminTherapistsPage can run ONE shop-wide
// active-bookings listener (bounded by status, not by a `limit()`) instead
// of duplicating this set or spinning up a listener per therapist.
export const ACTIVE_STATUSES = new Set(["confirmed", "pending", "in_progress"]);

function readDate(v: unknown): Date | null {
  if (v === null || v === undefined) return null;
  if (
    typeof v === "object" &&
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
}

// 🆕 Round 28s267 — exported so AdminTherapistsPage can parse booking docs
// from a shop-wide query the same way this file already does per-therapist.
export function fromSnap(doc: QueryDocumentSnapshot<DocumentData>): TherapistBooking | null {
  const data = doc.data();
  const startAt = readDate(data.startAt);
  let endAt = readDate(data.endAt);
  const durationMin =
    typeof data.duration === "number"
      ? data.duration
      : typeof data.durationMin === "number"
        ? data.durationMin
        : 60;
  if (!startAt) return null;
  if (!endAt) endAt = new Date(startAt.getTime() + durationMin * 60_000);
  return {
    id: doc.id,
    startAt,
    endAt,
    durationMin,
    status: typeof data.status === "string" ? data.status : "confirmed",
  };
}

/**
 * Live subscription to confirmed/pending bookings for one therapist.
 * Returns [] while loading or if `therapistId` is null.
 */
export function useTherapistBookings(
  therapistId: string | null
): TherapistBooking[] {
  const [bookings, setBookings] = useState<TherapistBooking[]>([]);

  useEffect(() => {
    if (!therapistId) {
      setBookings([]);
      return;
    }
    const q = query(
      collection(db, "bookings"),
      where("therapistId", "==", therapistId)
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs
          .map(fromSnap)
          .filter((b): b is TherapistBooking => b !== null)
          .filter((b) => ACTIVE_STATUSES.has(b.status))
          .sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
        setBookings(list);
      },
      (err) => {
        // Fail-soft: surface in console but never block the UI.
        console.warn("useTherapistBookings: snapshot error", err);
        setBookings([]);
      }
    );
    return unsub;
  }, [therapistId]);

  return bookings;
}

/**
 * Round 28s55 — Combined feed. One `bookings where therapistId == X`
 * listener that yields BOTH the active-booking list (for the status
 * engine) AND the loyalty stats (for the Loyalty tab) from the same
 * snapshot. Replaces the previous pair of identical listeners
 * (useTherapistBookings + useTherapistBookingStats) on the detail
 * page — halving the bookings-collection subscriptions there.
 *
 * The standalone `useTherapistBookings` / `useTherapistBookingStats`
 * hooks remain for their other callers (home grid, booking flow,
 * etc.) — this feed is detail-page-specific.
 */
export function useTherapistBookingFeed(therapistId: string | null): {
  active: TherapistBooking[];
  stats: TherapistBookingStats;
} {
  const [active, setActive] = useState<TherapistBooking[]>([]);
  const [stats, setStats] = useState<TherapistBookingStats>(
    therapistId
      ? { ...EMPTY_BOOKING_STATS, loading: true }
      : EMPTY_BOOKING_STATS,
  );

  useEffect(() => {
    if (!therapistId) {
      setActive([]);
      setStats(EMPTY_BOOKING_STATS);
      return;
    }
    const q = query(
      collection(db, "bookings"),
      where("therapistId", "==", therapistId),
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        // Active list — same filter/shape useTherapistBookings produces.
        const list = snap.docs
          .map(fromSnap)
          .filter((b): b is TherapistBooking => b !== null)
          .filter((b) => ACTIVE_STATUSES.has(b.status))
          .sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
        setActive(list);
        // Loyalty stats — derived from the SAME snapshot.
        setStats(computeBookingStats(snap));
      },
      (err) => {
        console.warn("useTherapistBookingFeed: snapshot error", err);
        setActive([]);
        setStats({ ...EMPTY_BOOKING_STATS, loading: false });
      },
    );
    return () => unsub();
  }, [therapistId]);

  return { active, stats };
}

// ─── Pure helpers (no React, no Firestore) ────────────────────────────

/** The booking currently covering `now`, if any. */
export function findActiveBooking(
  bookings: TherapistBooking[],
  now: Date = new Date()
): TherapistBooking | null {
  const t = now.getTime();
  for (const b of bookings) {
    if (b.startAt.getTime() <= t && t < b.endAt.getTime()) return b;
  }
  return null;
}

/** Earliest booking that starts at or after `now`. */
export function findNextBooking(
  bookings: TherapistBooking[],
  now: Date = new Date()
): TherapistBooking | null {
  const t = now.getTime();
  for (const b of bookings) {
    if (b.startAt.getTime() >= t) return b;
  }
  return null;
}

/**
 * Returns HH:mm at which the therapist is next free, or null if they're
 * already free now. Uses the active booking's `endAt`; if no active
 * booking, returns null (caller can render "Currently Available").
 */
export function nextAvailableHHMM(
  bookings: TherapistBooking[],
  now: Date = new Date()
): string | null {
  const active = findActiveBooking(bookings, now);
  if (!active) return null;
  // 🆕 Round 28an — always format in BKK so travelers / wrong-TZ
  //    devices see the correct local Bangkok wall-clock time.
  return fmtBKK(active.endAt, "HH:mm", "");
}

/**
 * Does a candidate slot [slotStart, slotStart + durationMin) overlap
 * ANY existing booking (extended by `bufferMin` so the therapist has
 * time to wrap up + travel between sessions)?
 *
 * Two intervals [a, b) and [c, d) overlap iff a < d AND c < b.
 *
 * Round 28ao — `bufferMin` defaults to 0 for callers that don't care
 * about the gap; StepDateTime passes BOOKING_BUFFER_MIN to enforce the
 * founder rule "พนักงานต้องมีเวลาเตรียมตัวระหว่างงาน".
 *
 * Round 28s69 (founder 2026-05-31: "เวลาอื่นๆ เผื่อเวลา 20นาที") — the
 * buffer is now applied SYMMETRICALLY, around both the start AND end of
 * every booking. Previously it only padded the end (endAt + buffer),
 * which guarded the therapist's travel AWAY from a session but not
 * travel TO it. For outcall the practitioner must reach the next guest,
 * so a slot that ends exactly when a booking starts (zero travel gap)
 * must also be blocked. Now `[bStart - buffer, bEnd + buffer)` is
 * reserved, giving a full 20-min cushion on each side.
 */
export function isSlotTaken(
  bookings: TherapistBooking[],
  slotStartMs: number,
  durationMin: number,
  bufferMin = 0
): boolean {
  const slotEndMs = slotStartMs + durationMin * 60_000;
  const bufferMs = bufferMin * 60_000;
  for (const b of bookings) {
    const bStart = b.startAt.getTime() - bufferMs; // travel-to cushion
    const bEnd = b.endAt.getTime() + bufferMs; // wrap-up + travel-away
    if (slotStartMs < bEnd && bStart < slotEndMs) return true;
  }
  return false;
}
