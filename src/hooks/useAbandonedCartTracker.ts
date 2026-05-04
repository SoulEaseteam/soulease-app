// src/hooks/useAbandonedCartTracker.ts
//
// 🆕 Round 28b21 (founder 2026-05-04) — Phase 4 of the conversion plan.
//
// Persists a partial booking to `abandoned_bookings/{cartId}` whenever
// the customer fills out enough of the form to be reachable (we have
// at least their phone number) but hasn't yet hit "Confirm".
//
// Why
//  • If they walk away mid-checkout, the recoverAbandonedBookings
//    Cloud Function (every 5 min) will Telegram admin so we can chase
//    the lead manually with a "Hi, saw you started booking…" LINE.
//
// When the booking is finally confirmed, the BookingFlowPage MUST call
// `markCartConfirmed(cartId)` so the recovery alert doesn't fire after
// a successful confirm.
//
// Storage strategy
//  • One cartId per browser per therapist, persisted in localStorage as
//    `sunred_cart:{therapistId}`. Reusing the id lets us debounce-merge
//    rather than create new docs on every keystroke.
//  • All writes are debounced 1.2s. Lots of typing = 1 write, not 100.
//  • lastActivityAt updates so the 15-min staleness check works.
//
// Privacy
//  • Phone is mandatory. Without phone we don't write anything.
//  • Admin reads via Firestore rules (isAdmin only).

import { useEffect, useRef } from "react";
import {
  doc,
  setDoc,
  serverTimestamp,
  collection,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

const DEBOUNCE_MS = 1200;
const STORAGE_PREFIX = "sunred_cart:";

interface CartSnapshot {
  therapistId: string;
  therapistName?: string | null;
  serviceName?: string | null;
  serviceId?: string | null;
  duration?: number | null;
  date?: string | null;
  time?: string | null;
  contactName?: string | null;
  phone?: string | null;
  language?: string | null;
  /** Optional address (kept short — full lat/lng not needed for follow-up) */
  locationName?: string | null;
}

const cartIdFor = (therapistId: string): string => {
  const key = STORAGE_PREFIX + therapistId;
  let id = localStorage.getItem(key);
  if (!id) {
    // Use Firestore-style auto-id by allocating a doc ref now.
    const ref = doc(collection(db, "abandoned_bookings"));
    id = ref.id;
    localStorage.setItem(key, id);
  }
  return id;
};

/**
 * Records a debounced abandoned-cart write whenever `snapshot` changes.
 * Pass `null`/`undefined` to disable (e.g. after confirm).
 */
export const useAbandonedCartTracker = (
  snapshot: CartSnapshot | null | undefined,
  enabled = true
): { cartId: string | null } => {
  const timerRef = useRef<number | null>(null);
  const cartIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    if (!snapshot || !snapshot.therapistId) return;
    // Need phone to be useful (otherwise admin can't follow up)
    if (!snapshot.phone || snapshot.phone.trim().length < 8) return;

    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(async () => {
      try {
        const cartId = cartIdFor(snapshot.therapistId);
        cartIdRef.current = cartId;
        await setDoc(
          doc(db, "abandoned_bookings", cartId),
          {
            ...snapshot,
            status: "open",
            lastActivityAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            createdAt: serverTimestamp(), // overwritten only on first write via merge
          },
          { merge: true }
        );
      } catch (err) {
        // Fail-open — abandoned cart tracking is purely a nice-to-have.
        console.warn("[abandonedCart] write failed:", err);
      }
    }, DEBOUNCE_MS);

    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [enabled, snapshot]);

  return { cartId: cartIdRef.current };
};

/**
 * Mark the abandoned-cart doc as confirmed so the recovery scheduler
 * doesn't ping admin for a customer who already finished.
 *
 * Safe to call even if no cart was ever written (no-op).
 */
export const markCartConfirmed = async (therapistId: string): Promise<void> => {
  try {
    const key = STORAGE_PREFIX + therapistId;
    const cartId = localStorage.getItem(key);
    if (!cartId) return;
    await setDoc(
      doc(db, "abandoned_bookings", cartId),
      {
        status: "confirmed",
        confirmedAt: serverTimestamp(),
      },
      { merge: true }
    );
    localStorage.removeItem(key);
  } catch (err) {
    console.warn("[abandonedCart] mark-confirmed failed:", err);
  }
};

export default useAbandonedCartTracker;
