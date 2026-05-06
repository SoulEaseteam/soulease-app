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
  /** Sessions actually delivered (completed/done). Counts every booking. */
  servedById: ReadonlyMap<string, number>;
  /** 🆕 Round 28b17 — UNIQUE customers served per service.
   *  Counts unique `userId` values among completed bookings. The chip
   *  on ServicesPage uses this so "Used by N customers" reflects real
   *  human count (not session count — same customer booking 3 times
   *  doesn't inflate the figure). */
  customersById: ReadonlyMap<string, number>;
  /** Live reservations (confirmed/paid/in_progress + served). Admin metric. */
  bookedById: ReadonlyMap<string, number>;
  /** Legacy alias for callers using `.countsById` — equals `servedById`. */
  countsById: ReadonlyMap<string, number>;
  /** True until the first snapshot lands (avoids "0" flicker on cold start). */
  loading: boolean;
}

export function useServiceUsageStats(): ServiceUsageStats {
  const [served, setServed] = useState<ReadonlyMap<string, number>>(new Map());
  const [customers, setCustomers] = useState<ReadonlyMap<string, number>>(
    new Map()
  );
  const [booked, setBooked] = useState<ReadonlyMap<string, number>>(new Map());
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const q = query(collection(db, "bookings"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const nextServed = new Map<string, number>();
        const nextBooked = new Map<string, number>();
        // Per-service Set of identity keys (userId, falling back to phone)
        // so we can count unique humans rather than sessions.
        const customerSets = new Map<string, Set<string>>();

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

            // Identity fallback chain: PHONE → userId → docId.
            //
            // Round 28c9 — phone is now the PRIMARY identity (was
            //   userId before). This is essential because some
            //   reservations are placed BY THE CONCIERGE on behalf
            //   of guests who never signed up: in those bookings
            //   `userId` is either null, the concierge's own id, or
            //   the literal string "null"/"undefined" — none of
            //   which represent the actual guest. Phone, by
            //   contrast, is the real guest's phone in every case.
            //
            //   Phone is normalized to canonical Thai form (drop
            //   leading "0" or "66") so the same guest writing
            //   "0812..." and "+66 81 2..." dedupes to one person.
            //
            //   userId is kept as a tertiary identity for the rare
            //   booking that lacks a phone but does have a real
            //   guest userId. docId is the last-resort fallback so
            //   anonymous bookings still contribute ONCE per record.
            let phone = ((data.phone as string) ?? "")
              .toString()
              .replace(/\D/g, "");
            if (phone.startsWith("66") && phone.length >= 11) {
              phone = phone.slice(2);
            } else if (phone.startsWith("0") && phone.length === 10) {
              phone = phone.slice(1);
            }

            const rawUserId = (data.userId ?? "").toString().trim();
            const userIdLow = rawUserId.toLowerCase();
            const validUserId =
              rawUserId &&
              userIdLow !== "null" &&
              userIdLow !== "undefined"
                ? rawUserId
                : "";

            const identity =
              (phone ? `phone:${phone}` : "") ||
              validUserId ||
              `doc:${d.id}`;
            let set = customerSets.get(sid);
            if (!set) {
              set = new Set<string>();
              customerSets.set(sid, set);
            }
            set.add(identity);
          }
        });

        const nextCustomers = new Map<string, number>();
        for (const [sid, set] of customerSets) {
          nextCustomers.set(sid, set.size);
        }

        setServed(nextServed);
        setCustomers(nextCustomers);
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
      customersById: customers,
      bookedById: booked,
      countsById: served, // legacy alias
      loading,
    }),
    [served, customers, booked, loading]
  );
}
