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
//   opens the thread (see chatSeenKey in BookingChatThread), and a blocked
//   localStorage simply leaves the dot on, which is the harmless direction.

import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  query,
  where,
  type DocumentData,
} from "firebase/firestore";

import { db } from "@/lib/firebase";
import { chatSeenKey } from "@/components/chat/BookingChatThread";

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
  const [unread, setUnread] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    if (!uid) {
      setUnread(new Set());
      return;
    }
    const q = query(
      collection(db, "bookingChatMeta"),
      where("therapistUid", "==", uid)
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const next = new Set<string>();
        snap.docs.forEach((d) => {
          const data = d.data() as DocumentData;
          const last = toMillis(data.lastGuestMessageAt);
          if (last > 0 && last > seenAt(d.id)) next.add(d.id);
        });
        setUnread(next);
      },
      (err) => {
        // A practitioner with no threads yet, or rules mid-deploy — the dot is
        // an enhancement, never a reason to break the job list.
        console.warn("[bookingChat] unread listen failed", err);
        setUnread(new Set());
      }
    );
    return () => unsub();
  }, [uid]);

  return unread;
}
