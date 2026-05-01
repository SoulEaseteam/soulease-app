// src/utils/useTherapistBookings.ts
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
import dayjs from "dayjs";
import { db } from "@/lib/firebase";

export interface TherapistBooking {
  id: string;
  startAt: Date;
  endAt: Date;
  durationMin: number;
  /** "confirmed" | "cancelled" | "completed" | …  — completed/cancelled are filtered out by the hook */
  status: string;
}

const ACTIVE_STATUSES = new Set(["confirmed", "pending", "in_progress"]);

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

function fromSnap(doc: QueryDocumentSnapshot<DocumentData>): TherapistBooking | null {
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
  return dayjs(active.endAt).format("HH:mm");
}

/**
 * Does a candidate slot [slotStart, slotStart + durationMin) overlap
 * ANY existing booking? Used to grey-out time-slot pills.
 *
 * Two intervals [a, b) and [c, d) overlap iff a < d AND c < b.
 */
export function isSlotTaken(
  bookings: TherapistBooking[],
  slotStartMs: number,
  durationMin: number
): boolean {
  const slotEndMs = slotStartMs + durationMin * 60_000;
  for (const b of bookings) {
    const bStart = b.startAt.getTime();
    const bEnd = b.endAt.getTime();
    if (slotStartMs < bEnd && bStart < slotEndMs) return true;
  }
  return false;
}
