// One-shot E2E test, 2026-08-15 (Round 28x.193, founder: "ยิงทดสอบเลย") —
// fires a REAL guest-side booking create so notifyAdminPushOnBooking sends
// a real push to View's enabled devices, then deletes the test doc.
//
// Safety rails:
// • Aborts unless VAPID keys AND ≥1 device subscription actually exist.
// • NO therapistId → the Telegram dispatch path can't ping a practitioner.
// • No createdBy:"admin" → the function's own-booking skip doesn't trip.
// • contactName carries "SUNRED" and the location is the QA test address,
//   so isReservedShopBooking + isTestLocationBooking both exclude it from
//   every customer-facing stat even in the seconds it exists.
// • Deleted 25 s after create (the trigger has long since fired).
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { readFileSync } from "fs";

const sa = JSON.parse(
  readFileSync("/Users/varissarahirunto/sunred-vite/scripts/serviceAccountKey.json", "utf8"),
);
initializeApp({ credential: cert(sa) });
const db = getFirestore();

const [keysSnap, subsSnap] = await Promise.all([
  db.doc("adminSettings/webPush").get(),
  db.doc("adminSettings/webPushSubs").get(),
]);
const keys = keysSnap.data() ?? {};
const subs = subsSnap.data()?.subs ?? {};
const devices = Object.keys(subs).length;
console.log("vapid keys:", keys.vapidPublicKey ? "present" : "MISSING");
console.log("devices subscribed:", devices);
if (!keys.vapidPublicKey || devices === 0) {
  console.error("ABORT — setup incomplete, nothing to test against.");
  process.exit(1);
}

const now = new Date();
const ref = await db.collection("bookings").add({
  serviceName: "PUSH TEST · ลบอัตโนมัติ",
  contactName: "SUNRED PUSH TEST",
  phone: "0000000000",
  date: now.toISOString().slice(0, 10),
  time: now.toTimeString().slice(0, 5),
  locationName: "Aspire Asoke-Ratchada (QA TEST)",
  address: "ซอย พร้อมพันธ์ (QA TEST — 28x.193 push check)",
  status: "pending",
  note: "28x.193 admin-push E2E test — auto-deleted",
  createdAt: FieldValue.serverTimestamp(),
});
console.log("test booking created:", ref.id);
console.log("waiting 25 s for the trigger…");
await new Promise((r) => setTimeout(r, 25000));
await ref.delete();
console.log("test booking deleted:", ref.id);
