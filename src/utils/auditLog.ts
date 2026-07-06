// src/utils/auditLog.ts
//
// 🆕 Round 28s234 (Phase 4 — "รื้อ ทำให้ ตกแต่ง และฟังก์ชั่น") — thin helper
//   so admin actions leave a trail. The `auditLogs` collection already
//   existed in firestore.rules but nothing ever wrote to it ("populated by
//   Cloud Functions only" — no function did). Rules now allow an admin to
//   append their OWN actions (see firestore.rules); this never throws so a
//   logging failure can't block the real action it's describing.

import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";

export type AuditAction =
  | "booking.confirm"
  | "booking.cancel"
  | "booking.complete"
  // 🆕 Round 28s252 — customer-payment toggle on AdminBookingListPage is
  //   financially relevant, so it now leaves a trail (distinct from
  //   payout.mark_* which is the therapist-side weekly payout).
  | "booking.mark_paid"
  | "booking.mark_unpaid"
  | "payout.mark_paid"
  | "payout.mark_unpaid"
  | "therapist.relight_all"
  | "therapist.reset_auto"
  | "user.block"
  | "user.unblock";

export async function logAdminAction(
  action: AuditAction,
  detail: Record<string, unknown> = {}
): Promise<void> {
  try {
    const actor = auth.currentUser;
    if (!actor) return; // shouldn't happen behind PrivateRoute, but never block on it
    await addDoc(collection(db, "auditLogs"), {
      action,
      actorId: actor.uid,
      actorEmail: actor.email ?? null,
      detail,
      at: serverTimestamp(),
    });
  } catch (e) {
    console.warn("[auditLog] failed to record", action, e);
  }
}
