// Founder call 2026-08-14: "ปล่อยจบ ลบออก ได้" — end the 1st-anniversary
// campaign now instead of letting it lapse tomorrow. Sets enabled:false
// EXPLICITLY rather than deleting the field: applyLiveAnniversaryConfig
// falls back to code DEFAULTS (enabled:true) when the field is absent, so
// deletion would resurrect the banner, not remove it.
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync } from "fs";

const sa = JSON.parse(
  readFileSync("/Users/varissarahirunto/sunred-vite/scripts/serviceAccountKey.json", "utf8"),
);
initializeApp({ credential: cert(sa) });
const db = getFirestore();

const ref = db.doc("adminSettings/publicRules");
await ref.set({ anniversary: { enabled: false } }, { merge: true });
const after = (await ref.get()).data();
console.log("anniversary.enabled =", after.anniversary?.enabled, "| endISO =", after.anniversary?.endISO);
