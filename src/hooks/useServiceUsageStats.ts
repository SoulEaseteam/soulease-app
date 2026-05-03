// src/hooks/useServiceUsageStats.ts
//
// 🆕 Round 28b11 (founder 2026-05-03) — live booking aggregates per
//    service, sourced from real Firestore bookings instead of the
//    static `svc.count` field.
//
// Round 28b12 — split into two counts so the public-facing tile shows
//   ONLY actually-served sessions (real social proof) and admin /
//   future analytics surfaces can read the live booked count too:
//
//     • bookedCount   = active reservations (confirmed/paid/in_progress)
//     • servedCount   = sessions ACTUALLY DELIVERED (completed/done)
//
// Why split?
//   "62 booked" includes draft + future + en-route reservations — some
//   of which will fall through. "62 served" is the trustworthy figure
//   to show on the marketing chip (every count is a customer who got
//   the service). The `servedCount` is what we surface as
//   "Used by X customers".
//
// Excluded from BOTH counts (pure noise):
//   cancelled · canceled · refunded · failed · rejected · no_show · pending

import { useEffect, useMemo, useState } from "react";
import {
  collection,
  onSnapshot,
  query,
  type DocumentData,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

const EXCLUDED = new Set([
  "cancelled",
  "canceled",
  "refunded",
  "failed",
  "rejected",
  "no_show",
  "pending",
]);

const SERVED_STATUSES = new Set(["completed", "done"]);
const BOOKED_STATUSES = new Set([
  "confirmed",
  "paid",
  "in_progress",
  "completed",
  "done",
]);

export interface ServiceUsageStats {
  /** Sessions actually delivered (completed/done). Public chip metric. */
  servedById: ReadonlyMap<string, number>;
  /** Live reservations (confirmed/paid/in_progress + served). Admin metric. */
  bookedById: ReadonlyMap<string, number>;
  /** Legacy alias for callers using `.countsById` — equals `servedById`. */
  countsById: ReadonlyMap<string, number>;
  /** True until the first snapshot lands (avoids "0" flicker on cold start). */
  loading: boolean;
}

export function useServiceUsageStats(): ServiceUsageStats {
  const [served, setServed] = useState<ReadonlyMap<string, number>>(new Map());
  const [booked, setBooked] = useState<ReadonlyMap<string, number>>(new Map());
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const q = query(collection(db, "bookings"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const nextServed = new Map<string, number>();
        const nextBooked = new Map<string, number>();
        snap.docs.forEach((d: QueryDocumentSnapshot<DocumentData>) => {
          const data = d.data();
          const status = (data.status ?? "").toString().toLowerCase();
          if (EXCLUDED.has(status)) return;
          const sid = (data.serviceId ?? data.service ?? "").toString();
          if (!sid) return;
          if (BOOKED_STATUSES.has(status)) {
            nextBooked.set(sid, (nextBooked.get(sid) ?? 0) + 1);
          }
          if (SERVED_STATUSES.has(status)) {
            nextServed.set(sid, (nextServed.get(sid) ?? 0) + 1);
          }
        });
        setServed(nextServed);
        setBooked(nextBooked);
        setLoading(false);
      },
      (err) => {
        // eslint-disable-next-line no-console
        console.warn("[useServiceUsageStats] snapshot error:", err);
        setLoading(false);
      }
    );
    return unsub;
  }, []);

  return useMemo(
    () => ({
      servedById: served,
      bookedById: booked,
      countsById: served, // legacy alias
      loading,
    }),
    [served, booked, loading]
  );
}
