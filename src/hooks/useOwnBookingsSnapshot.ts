// src/hooks/useOwnBookingsSnapshot.ts
//
// 🆕 Round 28x.123 (founder: "ระบบหลังบ้านของพนักงานช้า โหลด กระตุก" → staff-app
//   performance audit) — ONE shared Firestore listener for
//   `bookings where therapistUid == <her uid>`.
//
//   The audit found four separate places opening that byte-identical query,
//   each with its own onSnapshot and no shared cache:
//     • useTherapistOwnBookingStats  (Performance — Loyalty numbers)
//     • useTherapistRevenueRows      (Performance — Revenue dashboard)
//     • useTherapistIdentityStats    (Home + Profile — review count)
//     • TherapistJobsPage            (My Jobs — the job list)
//   Opening /therapist/performance ran TWO of them at once, so a therapist
//   with ~250 bookings downloaded and parsed all 250 docs twice on open, and
//   again — twice — on every booking write. Tab-switching Home→Jobs re-streamed
//   the same 250 docs a third time because nothing was cached between routes.
//
//   This module holds one listener per uid, ref-counted: the first subscriber
//   opens it, later ones attach to the same snapshot (and get the last one
//   immediately, so a repeat navigation paints with no round-trip), and it
//   closes when the last subscriber leaves. Each consumer still applies its
//   OWN transform to the shared QuerySnapshot, so no behaviour changes — this
//   is purely deduplication of the transport.
//
//   Deliberately NOT a React context: these hooks are called from pages
//   mounted under different subtrees (and one of them from a component inside
//   a lazy chunk), so a module-level registry is what actually spans them.

import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  query,
  where,
  type DocumentData,
  type QuerySnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

type Snap = QuerySnapshot<DocumentData>;
type Listener = (snap: Snap) => void;
type ErrListener = (err: unknown) => void;

interface Entry {
  listeners: Set<Listener>;
  errListeners: Set<ErrListener>;
  unsub: () => void;
  /** Last snapshot seen — replayed to a late subscriber so it paints instantly. */
  last: Snap | null;
}

const entries = new Map<string, Entry>();

/**
 * Attach to the shared bookings snapshot for `uid`.
 * Returns an unsubscribe that also tears down the underlying Firestore
 * listener once the last subscriber detaches.
 */
export function subscribeOwnBookings(
  uid: string,
  onNext: Listener,
  onError?: ErrListener,
): () => void {
  let entry = entries.get(uid);

  if (!entry) {
    const created: Entry = {
      listeners: new Set(),
      errListeners: new Set(),
      unsub: () => undefined,
      last: null,
    };
    entries.set(uid, created);
    created.unsub = onSnapshot(
      query(collection(db, "bookings"), where("therapistUid", "==", uid)),
      (snap) => {
        created.last = snap;
        created.listeners.forEach((fn) => fn(snap));
      },
      (err) => {
        created.errListeners.forEach((fn) => fn(err));
      },
    );
    entry = created;
  }

  entry.listeners.add(onNext);
  if (onError) entry.errListeners.add(onError);
  // Replay the newest snapshot to whoever just joined.
  if (entry.last) onNext(entry.last);

  return () => {
    const e = entries.get(uid);
    if (!e) return;
    e.listeners.delete(onNext);
    if (onError) e.errListeners.delete(onError);
    if (e.listeners.size === 0 && e.errListeners.size === 0) {
      e.unsub();
      entries.delete(uid);
    }
  };
}

/** Drop every shared listener — call on sign-out. */
export function clearOwnBookingsCache(): void {
  entries.forEach((e) => e.unsub());
  entries.clear();
}

/**
 * Hook form: the shared snapshot, mapped through `select`.
 * `select` must be a stable/pure transform — it runs on every snapshot.
 */
export function useOwnBookingsSnapshot<T>(
  uid: string | null | undefined,
  select: (snap: Snap) => T,
  empty: T,
  onErrorValue: (err: unknown) => T = () => empty,
): T {
  const [value, setValue] = useState<T>(empty);

  useEffect(() => {
    if (!uid) {
      setValue(empty);
      return;
    }
    return subscribeOwnBookings(
      uid,
      (snap) => setValue(select(snap)),
      (err) => setValue(onErrorValue(err)),
    );
    // `select`/`empty`/`onErrorValue` are intentionally excluded: callers pass
    // inline functions, and including them would tear down and rebuild the
    // subscription on every render — the exact churn this module exists to stop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  return value;
}
