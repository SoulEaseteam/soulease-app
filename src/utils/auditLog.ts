import { adminColor } from "@/theme/adminTheme";
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
  | "member.edit"
  | "member.remove"
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
  | "promo.print_card"
  // 🆕 28w.96 — the Anniversary campaign is admin-editable; its terms are money,
  //   so an edit belongs in the audit trail like every other price change.
  | "promo.anniversary_edit"
  | "membership.sunpoints_edit"
  // 🆕 28x.1 — recomputing the public star rating changes what customers buy on.
  | "therapist.rating_sync"
  // 🆕 28x.2 — an admin changing their own password is a security event.
  | "admin.password_change"
  // 🆕 28x.58/59 — who can reach the back office is the highest-stakes change
  //   in the system. These three are written server-side by setMemberAdmin /
  //   createAdminAccount (the client can't be trusted to log its own grants),
  //   and are listed here so the audit viewer can label them.
  | "user.admin_granted"
  | "user.admin_revoked"
  | "user.admin_created"
  // 🆕 28x.70 — issuing a link code and a practitioner redeeming it both change
  //   who receives guest addresses, so both belong in the trail.
  | "therapist.link_code"
  | "therapist.linked";

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


/**
 * 🆕 28x.4 — human label + colour per action. Lives HERE, beside the AuditAction
 * union it describes, so the audit page and the admin account page read the same
 * map. A second copy is how one of them ends up showing a raw action string.
 */
export const ACTION_LABEL: Record<string, { label: string; color: string }> = {
  // 🆕 28w.96 — campaign + loyalty-rate edits are money changes; label them.
  "promo.anniversary_edit": { label: "แก้แคมเปญครบรอบ", color: "#FF9999" },
  "membership.sunpoints_edit": { label: "ตั้งค่า SunPoints", color: "#E3BE55" },
  "therapist.rating_sync": { label: "ซิงก์คะแนนหมอนวด", color: "#F5A623" },
  "admin.password_change": { label: "แอดมินเปลี่ยนรหัสผ่าน", color: "#DC2626" },
  "user.admin_granted":      { label: "ให้สิทธิ์แอดมิน",        color: "#DC2626" },
  "user.admin_revoked":      { label: "ถอดสิทธิ์แอดมิน",       color: "#DC2626" },
  "user.admin_created":      { label: "สร้างบัญชีแอดมิน",      color: "#DC2626" },
  "therapist.link_code":     { label: "ออกรหัสเชื่อมบัญชี",     color: "#4E7E8C" },
  "therapist.linked":        { label: "พนักงานเชื่อมบัญชีแล้ว",  color: "#16A34A" },
  "booking.confirm":         { label: "ยืนยันออเดอร์",        color: adminColor.green },
  "booking.cancel":          { label: "ยกเลิกออเดอร์",        color: adminColor.red },
  "booking.complete":        { label: "ปิดงานเสร็จ",          color: adminColor.green },
  "booking.mark_paid":       { label: "ลูกค้าจ่ายแล้ว",       color: adminColor.green },
  "booking.mark_unpaid":     { label: "ยกเลิกสถานะจ่าย",      color: adminColor.dim },
  "booking.status_change":   { label: "เปลี่ยนสถานะ",         color: adminColor.blue },
  "booking.edit_details":    { label: "แก้ไขรายละเอียดจอง",    color: adminColor.blue },
  "booking.mark_reviewed":   { label: "เคลียร์รอรีวิว",        color: adminColor.dim },
  "payout.mark_paid":        { label: "จ่ายค่าตอบแทนแล้ว",     color: adminColor.highlight },
  "payout.mark_unpaid":      { label: "ยกเลิกสถานะจ่ายแล้ว",   color: adminColor.dim },
  "therapist.relight_all":   { label: "เปิดร้านทั้งหมด",       color: adminColor.green },
  "therapist.reset_auto":    { label: "รีเซ็ตเป็น Auto",       color: adminColor.blue },
  "therapist.create":        { label: "เพิ่มหมอนวดใหม่",       color: adminColor.green },
  "therapist.update":        { label: "แก้ไขข้อมูลหมอนวด",     color: adminColor.blue },
  "therapist.delete":        { label: "ลบหมอนวด",             color: adminColor.red },
  "user.block":              { label: "บล็อกผู้ใช้",          color: adminColor.red },
  "user.unblock":            { label: "ปลดบล็อกผู้ใช้",       color: adminColor.green },
  "review.edit":             { label: "แก้ไขรีวิว",           color: adminColor.blue },
  "review.hide":             { label: "ซ่อนรีวิว",            color: adminColor.red },
  "phone.block":             { label: "บล็อกเบอร์โทร",         color: adminColor.red },
  "phone.unblock":           { label: "ปลดบล็อกเบอร์โทร",      color: adminColor.green },
  "settings.update":         { label: "แก้ไขการตั้งค่า",       color: adminColor.blue },
  "promo.toggle":            { label: "เปิด/ปิดโค้ดโปรโมชั่น",  color: adminColor.blue },
  "promo.create":            { label: "สร้างโค้ดโปรโมชั่น",     color: adminColor.green },
  "promo.delete":            { label: "ลบโค้ดโปรโมชั่น",        color: adminColor.red },
  "promo.builtin_edit":      { label: "แก้ไขโค้ดมาตรฐาน",       color: adminColor.blue },
  "promo.builtin_delete":    { label: "ลบโค้ดมาตรฐาน",          color: adminColor.red },
  "promo.builtin_restore":   { label: "กู้คืนโค้ดมาตรฐาน",       color: adminColor.green },
  "service.update":          { label: "แก้ไขราคา/บริการ",       color: adminColor.blue },
  // 🆕 Round 28r50 (Promotions Phase 1)
  "service.bulk_edit":       { label: "แก้ราคาแบบยกชุด",         color: adminColor.blue },
  "bundle.create":           { label: "สร้างแพ็คเกจ",           color: adminColor.green },
  "bundle.update":           { label: "แก้ไขแพ็คเกจ",           color: adminColor.blue },
  "bundle.delete":           { label: "ลบแพ็คเกจ",             color: adminColor.red },
  "promo.print_card":        { label: "พิมพ์การ์ดโปรโมชั่น",     color: adminColor.dim },
  // 🆕 28w.78 — 10 actions were being logged but had no label, so they fell
  //   through to the raw "therapist_payout.mark_paid_batch" string in the UI.
  "therapist_payout.mark_paid":       { label: "จ่ายหมอนวดแล้ว",        color: adminColor.highlight },
  "therapist_payout.mark_paid_batch": { label: "จ่ายหมอนวด (ยกชุด)",     color: adminColor.highlight },
  "therapist_payout.mark_unpaid":     { label: "ยกเลิกสถานะจ่ายหมอนวด",  color: adminColor.dim },
  "review.check":            { label: "ตรวจรีวิว",             color: adminColor.blue },
  "review.restore":          { label: "กู้คืนรีวิว",            color: adminColor.green },
  "member.enroll":           { label: "สมัครสมาชิก",           color: adminColor.green },
  "member.reset":            { label: "รีเซตรหัสสมาชิก",        color: adminColor.blue },
  "member.upgrade":          { label: "อัปเกรด Level สมาชิก",        color: adminColor.green },
  "member.edit":             { label: "แก้ไขข้อมูลสมาชิก",      color: adminColor.blue },
  "member.remove":           { label: "ยกเลิกสมาชิก",           color: adminColor.red },
};
