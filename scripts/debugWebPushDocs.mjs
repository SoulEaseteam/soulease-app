// Read-only debug, 2026-08-15: founder's machine says the VAPID keys were
// stored and a device subscribed, but testAdminPush's pre-check reads both
// docs as missing. List every adminSettings doc id + the exact fields of
// webPush/webPushSubs to see where the write actually landed.
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync } from "fs";

const sa = JSON.parse(
  readFileSync("/Users/varissarahirunto/sunred-vite/scripts/serviceAccountKey.json", "utf8"),
);
initializeApp({ credential: cert(sa) });
const db = getFirestore();

console.log("project:", sa.project_id);
const list = await db.collection("adminSettings").listDocuments();
console.log("adminSettings docs:", list.map((d) => d.id));
for (const id of ["webPush", "webPushSubs"]) {
  const s = await db.doc(`adminSettings/${id}`).get();
  const d = s.data();
  console.log(
    id,
    "exists:", s.exists,
    "keys:", d ? Object.keys(d) : null,
    id === "webPushSubs" && d?.subs ? `devices:${Object.keys(d.subs).length}` : "",
  );
}
