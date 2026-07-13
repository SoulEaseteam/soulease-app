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
  // 🆕 Round 28s259 — DetailPanel gained: a full status-override dropdown
  //   (for transitions Confirm/Complete/Cancel don't already cover, e.g.
  //   un-cancelling, marking refunded/no_show), an edit-details form
  //   (customer name/phone/date/time/location/therapist), and a "mark
  //   reviewed" dismiss action (the old "Awaiting review" badge had no
  //   onClick at all — looked like a button, did nothing).
  | "booking.status_change"
  | "booking.edit_details"
  | "booking.mark_reviewed"
  | "payout.mark_paid"
  | "payout.mark_unpaid"
  // 🆕 Round 28s313 — per-booking therapist payout on the Pay-Therapists
  //   queue (non-cash bookings). Distinct from payout.mark_* (the old
  //   weekly per-therapist tracker, since removed): these mark ONE job's
  //   therapist share paid, stored on the booking doc.
  | "therapist_payout.mark_paid"
  | "therapist_payout.mark_unpaid"
  | "therapist_payout.mark_paid_batch"
  | "therapist.relight_all"
  | "therapist.reset_auto"
  // 🆕 Round 28s267 — individual roster edits (holiday/override/session/
  //   working hours) and deletion had zero audit trail before, unlike
  //   every other consequential admin action this session.
  | "therapist.create"
  | "therapist.update"
  | "therapist.delete"
  | "user.block"
  | "user.unblock"
  // 🆕 Round 28s291 — Edit/Hide on AdminReviewListPage had zero audit trail,
  //   unlike every other consequential admin write this session.
  | "review.edit"
  | "review.hide"
  | "review.restore"
  | "review.check"
  // 🆕 Round 28s293 — blocking a phone number now actually enforces
  //   something (BookingFlowPage submit guard), so it needs a trail like
  //   every other consequential admin action. Distinct from user.block/
  //   unblock, which toggles a signed-up `users` account, not a phone.
  | "phone.block"
  | "phone.unblock"
  // 🆕 28w.60 — membership enrollment (SRD- code) on Customer Insights.
  | "member.enroll"
  | "member.reset"
  | "member.upgrade"
  // 🆕 Round 28s296 — AdminAdvancedSettingsPage now actually enforces
  //   maintenanceMode/minAdvanceMins/maxFutureDays; saving a change to
  //   live booking-eligibility rules deserves a trail like every other
  //   consequential admin write.
  | "settings.update"
  // 🆕 Round 28s298 — new /admin/promotions page: toggling a hardcoded
  //   code on/off or creating/deleting a custom code changes what a
  //   customer actually gets charged at checkout, same trail bar as
  //   every other pricing-relevant write this session.
  | "promo.toggle"
  | "promo.create"
  | "promo.delete"
  // 🆕 Round 28r49 (founder 2026-07-08 — "Built-in Codes · โค้ดมาตรฐาน
  //   แก้ไขและลบได้") — full edit + delete on the 7 hardcoded discount
  //   codes now writes per-code overrides to publicRules.builtinCodeOverrides
  //   (distinct from promo.toggle, which flips enable via the older
  //   disabledBuiltinCodes gate). Restore reverses a delete.
  | "promo.builtin_edit"
  | "promo.builtin_delete"
  | "promo.builtin_restore"
  // 🆕 Round 28s300 — editing live service prices / names / availability
  //   from /admin/promotions changes what NEW bookings are charged.
  | "service.update"
  // 🆕 Round 28r50 (Promotions Phase 1) — bulk service price adjustments
  //   from /admin/promotions (multi-select + +/-%/฿ or fixed). Distinct
  //   from service.update (which is a single-service save) so an audit
  //   scan can distinguish "one row edited" from "batch swept".
  | "service.bulk_edit"
  // 🆕 Round 28r50 — bundle packages (prepaid multi-session discounts).
  //   Create/update/delete on `publicRules.bundles`.
  | "bundle.create"
  | "bundle.update"
  | "bundle.delete"
  // 🆕 Round 28r50 — print/share promo card audit trail (light-weight —
  //   admin generated a printable handout for a code; doesn't change any
  //   customer-facing data, but useful for correlating "who handed out
  //   which code where" if a promo overshoots redemptions).
  | "promo.print_card";

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
