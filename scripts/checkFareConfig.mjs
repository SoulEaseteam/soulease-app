// Read-only audit: does adminSettings/publicRules carry a motoFareCheckpoints
// override that would mask the old fare curve in the rolled-back prod bundle?
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync } from "fs";

const sa = JSON.parse(
  readFileSync("/Users/varissarahirunto/sunred-vite/scripts/serviceAccountKey.json", "utf8"),
);
initializeApp({ credential: cert(sa) });
const db = getFirestore();

const snap = await db.doc("adminSettings/publicRules").get();
const d = snap.data() || {};
console.log(
  JSON.stringify(
    {
      exists: snap.exists,
      motoFareCheckpoints: d.motoFareCheckpoints ?? null,
      maxDistance: d.maxDistance ?? null,
      roundTripMultiplier: d.roundTripMultiplier ?? null,
      promosEnabled: d.promosEnabled ?? null,
      anniversary: d.anniversary ?? null,
    },
    null,
    1,
  ),
);
