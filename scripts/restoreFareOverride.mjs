// One-shot mitigation, 2026-08-14: today's 16:57 GitHub-triggered Vercel deploy
// (PR #20 merge) shipped a frontend that predates the 28x.166 fare re-anchor,
// so the OLD inflated moto curve ([10 km, ฿450]) is live in the prod bundle
// again. adminSettings/publicRules.motoFareCheckpoints was never set (null),
// so nothing masks it. This writes the founder-approved 28x.166 checkpoints
// as the live override — MaintenanceGate's onSnapshot picks it up without a
// deploy. Reversible: delete the field to fall back to bundle defaults.
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync } from "fs";

const sa = JSON.parse(
  readFileSync("/Users/varissarahirunto/sunred-vite/scripts/serviceAccountKey.json", "utf8"),
);
initializeApp({ credential: cert(sa) });
const db = getFirestore();

// {km, thb} maps, NOT [km, thb] pairs — Firestore rejects nested arrays
// ("Nested arrays are not allowed"), which is why the first version of this
// script failed and why the admin Save had never persisted this field.
// Requires a bundle with deserializeFareCheckpoints (28x.187+) to be read.
const CHECKPOINTS_28X166 = [
  { km: 0, thb: 50 },
  { km: 3, thb: 70 },
  { km: 6, thb: 100 },
  { km: 10, thb: 140 },
  { km: 15, thb: 200 },
];

const ref = db.doc("adminSettings/publicRules");
await ref.set({ motoFareCheckpoints: CHECKPOINTS_28X166 }, { merge: true });
const after = (await ref.get()).data();
console.log("written:", JSON.stringify(after.motoFareCheckpoints));
