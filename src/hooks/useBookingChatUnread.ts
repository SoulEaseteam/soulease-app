// src/hooks/useBookingChatUnread.ts
//
// 🆕 Round 28x.140 — which of a practitioner's jobs have a guest message she
// hasn't opened yet.
//
// WHY THIS ISN'T A LISTENER PER JOB:
//   The obvious build is to subscribe to each job's `messages` subcollection
//   and count. On a list of ~60 jobs that is 60 concurrent listeners on a
//   phone, which is exactly the class of problem the 28x.123 performance audit
//   spent a round undoing ("ระบบหลังบ้านของพนักงานช้า โหลด กระตุก"). Instead the
//   onBookingChatMessage function maintains one summary document per thread,
//   and this is a SINGLE query over those.
//
// WHY "SEEN" IS LOCAL:
//   Read-receipts would need a client write path into the summary doc, which
//   would mean either loosening its admin-only write rule or another callable.
//   For a dot on a job card that isn't worth it — the practitioner reads her
//   own jobs on her own phone. localStorage per booking, written when she
//   opens the thread (see chatSeenKey in src/lib/bookingChatShared.ts), and
//   a blocked localStorage simply leaves the dot on, which is the harmless
//   direction.
//
// 🚨 HOTFIX (28x.167) — the dot used to only recompute on a FRESH Firestore
//   snapshot. Reading a thread writes `chatSeenKey` to localStorage, which
//   fires no React update on its own — so the dot she just cleared stayed
//   lit until some UNRELATED job's message happened to re-trigger this
//   query, not when she actually read it. Raw summary data is now kept in
//   state and the "unread" Set is DERIVED from it, so a `bookingChatSeen`
//   event (dispatched by BookingChatThread the moment it marks a thread
//   seen) can force an immediate recompute against the same data with no
//   network round-trip.

import { useEffect, useMemo, useState } from "react";
import {
  collection,
  onSnapshot,
  query,
  where,
  type DocumentData,
} from "firebase/firestore";

import { db } from "@/lib/firebase";
import { chatSeenKey, BOOKING_CHAT_SEEN_EVENT } from "@/lib/bookingChatShared";

function toMillis(raw: unknown): number {
  if (raw && typeof raw === "object" && typeof (raw as { toMillis?: () => number }).toMillis === "function") {
    return (raw as { toMillis: () => number }).toMillis();
  }
  return 0;
}

function seenAt(bookingId: string): number {
  try {
    return Number(window.localStorage.getItem(chatSeenKey(bookingId)) ?? 0);
  } catch {
    return 0;
  }
}

/**
 * Set of booking ids whose newest GUEST message is newer than the last time
 * this device opened that thread.
 */
export function useBookingChatUnread(uid: string | undefined): Set<string> {
  // bookingId -> lastGuestMessageAt (millis). Raw server data only — "seen"
  // is derived below so a local seen-write can force a recompute without
  // waiting on a new snapshot.
  const [lastGuestMessageAt, setLastGuestMessageAt] = useState<Map<string, number>>(
    () => new Map()
  );
  const [seenTick, setSeenTick] = useState(0);

  useEffect(() => {
    if (!uid) {
      setLastGuestMessageAt(new Map());
      return;
    }
    const q = query(
      collection(db, "bookingChatMeta"),
      where("therapistUid", "==", uid)
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const next = new Map<string, number>();
        snap.docs.forEach((d) => {
          const last = toMillis((d.data() as DocumentData).lastGuestMessageAt);
          if (last > 0) next.set(d.id, last);
        });
        setLastGuestMessageAt(next);
      },
      (err) => {
        // A practitioner with no threads yet, or rules mid-deploy — the dot is
        // an enhancement, never a reason to break the job list.
        console.warn("[bookingChat] unread listen failed", err);
        setLastGuestMessageAt(new Map());
      }
    );
    return () => unsub();
  }, [uid]);

  useEffect(() => {
    const onSeen = () => setSeenTick((n) => n + 1);
    window.addEventListener(BOOKING_CHAT_SEEN_EVENT, onSeen);
    return () => window.removeEventListener(BOOKING_CHAT_SEEN_EVENT, onSeen);
  }, []);

  return useMemo(() => {
    const next = new Set<string>();
    lastGuestMessageAt.forEach((last, bookingId) => {
      if (last > seenAt(bookingId)) next.add(bookingId);
    });
    return next;
    // seenTick has no value of its own — it exists purely to force this
    // memo to re-read localStorage the instant a thread is marked seen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastGuestMessageAt, seenTick]);
}
