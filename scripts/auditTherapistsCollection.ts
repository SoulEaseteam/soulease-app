// scripts/auditTherapistsCollection.ts
//
// 🔍 Round 28aj — audit the live `therapists` Firestore collection
// against the canonical `src/data/therapists.ts`.
//
// What it does:
//   1. Reads all docs in /therapists
//   2. Cross-references with src/data/therapists ids
//   3. Buckets each doc as:
//        ✅ in-sync     — exists in both
//        ⚠️ orphan       — in Firestore, NOT in data file (stale)
//        🆕 missing     — in data file, NOT in Firestore (need migrate)
//   4. Prints a clean report. Doesn't modify anything.
//
// Usage:
//   cd ~/sunred-vite/scripts
//   npx tsx auditTherapistsCollection.ts
//
// To delete orphans automatically, re-run with --delete flag:
//   npx tsx auditTherapistsCollection.ts --delete

import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { createRequire } from "module";

import therapists from "../src/data/therapists";

const require = createRequire(import.meta.url);
const serviceAccount = require("./serviceAccountKey.json");

initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

const DELETE_MODE = process.argv.includes("--delete");

async function audit() {
  console.log("🔍 Auditing /therapists collection...\n");

  // 1. Pull live Firestore docs
  const snap = await db.collection("therapists").get();
  const liveIds = new Map<string, { docId: string; name?: string }>();
  snap.forEach((d) => {
    const data = d.data() as { name?: string; id?: string };
    // Track by docId (the canonical Firestore key)
    liveIds.set(d.id, { docId: d.id, name: data.name });
  });

  // 2. Pull canonical data file ids
  const canonicalIds = new Set(therapists.map((t) => t.id));

  // 3. Bucket
  const inSync: string[] = [];
  const orphans: { docId: string; name?: string }[] = [];
  const missing: string[] = [];

  liveIds.forEach((info, docId) => {
    if (canonicalIds.has(docId)) {
      inSync.push(docId);
    } else {
      orphans.push(info);
    }
  });

  for (const t of therapists) {
    if (!liveIds.has(t.id)) missing.push(t.id);
  }

  // 4. Report
  console.log(`📊 Summary:`);
  console.log(`   Firestore docs: ${liveIds.size}`);
  console.log(`   Data file:      ${therapists.length}`);
  console.log("");

  console.log(`✅ In sync (${inSync.length}):`);
  inSync.forEach((id) => console.log(`   • ${id}`));
  console.log("");

  console.log(`⚠️  Orphan (in Firestore only — ${orphans.length}):`);
  orphans.forEach((o) =>
    console.log(`   • ${o.docId.padEnd(28)} name=${o.name ?? "—"}`)
  );
  console.log("");

  console.log(`🆕 Missing (in data file only — ${missing.length}):`);
  missing.forEach((id) => console.log(`   • ${id}`));
  console.log("");

  if (DELETE_MODE && orphans.length > 0) {
    console.log(`🗑  Deleting ${orphans.length} orphan(s)...`);
    for (const o of orphans) {
      await db.collection("therapists").doc(o.docId).delete();
      console.log(`   - deleted ${o.docId}`);
    }
    console.log("\n✅ Orphans deleted.");
  } else if (orphans.length > 0) {
    console.log(
      `💡 Re-run with --delete to remove the ${orphans.length} orphan doc(s):`
    );
    console.log(`   npx tsx auditTherapistsCollection.ts --delete\n`);
  }

  if (missing.length > 0) {
    console.log(
      `💡 Run migrateTherapistProfiles.ts to push the ${missing.length} missing therapist(s):`
    );
    console.log(`   npx tsx migrateTherapistProfiles.ts\n`);
  }
}

audit()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Audit failed:", err);
    process.exit(1);
  });
