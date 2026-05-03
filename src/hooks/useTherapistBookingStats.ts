// src/hooks/useTherapistBookingStats.ts
//
// 🆕 Round 28af (founder 2026-05-03)
// Live booking statistics for the Loyalty tab on the detail page.
//
// Subscribes to bookings/{...} where therapistId == X (uses the existing
// `therapistId + createdAt` index — no extra index needed). Aggregates
// client-side because:
//   • bookings per therapist are bounded (hundreds, not millions)
//   • aggregation needs custom logic (rebook timing, customer mix)
//     that Firestore aggregate queries don't directly support
//   • onSnapshot keeps it live for free
//
// Returns:
//   • totalCompleted     — completed sessions count (status='completed' or 'done')
//   • uniqueCustomers    — distinct userIds across completed bookings (excludes guest=null)
//   • repeatCustomers    — userIds with ≥2 completed bookings
//   • repeatPct          — repeatCustomers / uniqueCustomers × 100, rounded
//   • avgSessions        — totalCompleted / uniqueCustomers, 1 decimal
//   • timingBuckets      — % of REPEAT customers whose 2nd booking
//                          fell within 7d / 30d / 90d (cumulative)
//
// Privacy: hook never returns userIds — only aggregates. The detail
// page renders only counts and percentages.

import { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
// 🆕 Round 28an — single source of truth for "today" anchored to BKK.
import { startOfTodayBKK, endOfTodayBKK } from "@/utils/time";

export interface TherapistBookingStats {
  /** Total bookings (all valid statuses — excludes cancelled/refunded). */
  totalCompleted: number;
  /** Bookings whose startAt falls inside today (Bangkok wall-clock). */
  todayBookings: number;
  uniqueCustomers: number;
  repeatCustomers: number;
  repeatPct: number;
  avgSessions: number;
  /** Cumulative % of repeat customers who rebooked within window. */
  timingBuckets: {
    within7: number;
    within30: number;
    within90: number;
  };
  loading: boolean;
}

type FirestoreDateLike = Timestamp | Date | string | number | null | undefined;

interface BookingStatsDoc {
  status?: string;
  userId?: string | null;
  /** Guest-checkout customers don't have a uid. Fall back to phone
   *  number as the customer identity key — same person → same number. */
  phone?: string | null;
  startAt?: FirestoreDateLike;
  createdAt?: FirestoreDateLike;
}

/** Normalize a phone string for use as an identity key — strip
 *  whitespace, dashes, parens; keep digits + leading "+" only. */
function normalizePhone(p: unknown): string | null {
  if (typeof p !== "string") return null;
  const cleaned = p.replace(/[^\d+]/g, "");
  return cleaned.length >= 6 ? cleaned : null; // skip nonsense / blank
}

function toMs(v: FirestoreDateLike): number {
  if (!v) return 0;
  if (v instanceof Timestamp) return v.toMillis();
  if (v instanceof Date) return v.getTime();
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const t = Date.parse(v);
    return Number.isFinite(t) ? t : 0;
  }
  return 0;
}

const EMPTY: TherapistBookingStats = {
  totalCompleted: 0,
  todayBookings: 0,
  uniqueCustomers: 0,
  repeatCustomers: 0,
  repeatPct: 0,
  avgSessions: 0,
  timingBuckets: { within7: 0, within30: 0, within90: 0 },
  loading: false,
};

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Live-subscribe to a therapist's booking aggregates. Pass null/empty
 * id to skip subscription.
 */
export function useTherapistBookingStats(
  therapistId: string | null | undefined
): TherapistBookingStats {
  const [stats, setStats] = useState<TherapistBookingStats>(
    therapistId ? { ...EMPTY, loading: true } : EMPTY
  );

  useEffect(() => {
    if (!therapistId) {
      setStats(EMPTY);
      return;
    }

    const q = query(
      collection(db, "bookings"),
      where("therapistId", "==", therapistId)
    );

    // 🆕 Round 28ag — count ALL bookings except cancelled/refunded for
    //    the sales-stimulation display. Pending + confirmed +
    //    in-progress + completed all roll into "total bookings" so the
    //    Loyalty tab reflects real demand pressure (not just past
    //    completed sessions).
    const EXCLUDED = new Set([
      "cancelled",
      "canceled",
      "refunded",
      "failed",
      "rejected",
      "no_show",
      "noshow",
    ]);

    // 🆕 Round 28an — "today" anchored to BKK via shared helpers.
    //   Replaces the manual UTC-offset hack. Same logic, but the
    //   helpers handle DST-edge cases (none in BKK, but the API is
    //   correct anywhere).
    const todayStartMs = startOfTodayBKK().valueOf();
    const todayEndMs = endOfTodayBKK().valueOf();

    const unsub = onSnapshot(
      q,
      (snap) => {
        // Group all valid bookings per identity so we can compute
        // repeat-customer aggregates + first-rebook timing.
        const byUser = new Map<string, number[]>();
        let totalCompleted = 0; // → "valid bookings" total
        let todayBookings = 0;

        snap.forEach((d) => {
          const b = d.data() as BookingStatsDoc;
          const status = (b.status ?? "").toLowerCase();
          if (EXCLUDED.has(status)) return; // skip cancellations
          totalCompleted++;

          // Today's bookings — count valid bookings whose START time is
          // inside today's BKK window. Falls back to createdAt if startAt
          // missing (rare — guest checkout edge case).
          const tsForToday = toMs(b.startAt ?? b.createdAt ?? null);
          if (tsForToday >= todayStartMs && tsForToday < todayEndMs) {
            todayBookings++;
          }

          // Identity key: prefer real auth uid (post-login users), fall
          // back to normalized phone (guest checkout). Anonymous with
          // neither = skip — can't track them as a "customer".
          const idKey =
            (b.userId && b.userId.length > 0 ? b.userId : null) ??
            normalizePhone(b.phone) ??
            null;
          if (!idKey) return;
          const ts = toMs(b.startAt ?? b.createdAt ?? null);
          if (!ts) return;
          if (!byUser.has(idKey)) byUser.set(idKey, []);
          byUser.get(idKey)!.push(ts);
        });

        const uniqueCustomers = byUser.size;
        let repeatCustomers = 0;
        let within7 = 0;
        let within30 = 0;
        let within90 = 0;

        byUser.forEach((tsList) => {
          if (tsList.length < 2) return;
          repeatCustomers++;

          // Sort ascending to find first → second booking gap
          tsList.sort((a, b) => a - b);
          const gapMs = tsList[1] - tsList[0];
          const gapDays = gapMs / ONE_DAY_MS;
          if (gapDays <= 90) within90++;
          if (gapDays <= 30) within30++;
          if (gapDays <= 7) within7++;
        });

        const repeatPct =
          uniqueCustomers > 0
            ? Math.round((repeatCustomers / uniqueCustomers) * 100)
            : 0;

        const avgSessions =
          uniqueCustomers > 0
            ? Math.round((totalCompleted / uniqueCustomers) * 10) / 10
            : 0;

        // Convert timing counts to % of REPEAT customers (cumulative).
        const pct = (n: number) =>
          repeatCustomers > 0
            ? Math.round((n / repeatCustomers) * 100)
            : 0;

        setStats({
          totalCompleted,
          todayBookings,
          uniqueCustomers,
          repeatCustomers,
          repeatPct,
          avgSessions,
          timingBuckets: {
            within7: pct(within7),
            within30: pct(within30),
            within90: pct(within90),
          },
          loading: false,
        });
      },
      (err) => {
        // eslint-disable-next-line no-console
        console.error("[useTherapistBookingStats] snapshot error:", err);
        setStats({ ...EMPTY, loading: false });
      }
    );

    return () => unsub();
  }, [therapistId]);

  return stats;
}
