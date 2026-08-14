// One-shot setup, 2026-08-15 (Round 28x.193 admin web push): store the
// self-generated VAPID key pair in adminSettings/webPush. That doc is
// admin-only by the existing `adminSettings/{settingId}` rule (its own
// comment anticipates holding secrets), and the notify function reads it
// via the Admin SDK. Chosen over `firebase functions:secrets:set` so the
// whole setup stays scriptable; threat model is acceptable because both
// the keys AND the push subscriptions live behind isAdmin().
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { readFileSync } from "fs";

const sa = JSON.parse(
  readFileSync("/Users/varissarahirunto/sunred-vite/scripts/serviceAccountKey.json", "utf8"),
);
initializeApp({ credential: cert(sa) });
const db = getFirestore();

// No-argument mode generates a fresh pair in-process (web-push lives in
// functions/node_modules). Re-running rotates the keys — existing device
// subscriptions keep working because the subscription itself is stored,
// but pushes signed with the NEW private key are only valid for
// subscriptions created against the NEW public key, so re-enable on the
// device after a rotation.
let keys;
if (process.argv[2]) {
  keys = JSON.parse(readFileSync(process.argv[2], "utf8"));
} else {
  const { default: webPush } = await import(
    "/Users/varissarahirunto/sunred-vite/functions/node_modules/web-push/src/index.js"
  );
  keys = webPush.generateVAPIDKeys();
}
if (!keys.publicKey || !keys.privateKey) {
  console.error("no keys — pass a vapid.json or run with no args to self-generate");
  process.exit(1);
}

await db.doc("adminSettings/webPush").set(
  {
    vapidPublicKey: keys.publicKey,
    vapidPrivateKey: keys.privateKey,
    // Web Push requires a contact for the push service operator.
    subject: "mailto:sunredbkk@gmail.com",
    updatedAt: FieldValue.serverTimestamp(),
  },
  { merge: true },
);
const after = (await db.doc("adminSettings/webPush").get()).data();
console.log("stored. publicKey:", after.vapidPublicKey.slice(0, 16) + "…");
