// scripts/repairTherapistAuth.ts
//
// 🔧 One-shot repair: align Auth user ↔ therapist doc ↔ users doc
//    after partial onboarding (e.g. user created Auth account before the
//    therapist doc had its `email` field set, so `setRoleOnSignup` couldn't
//    auto-link).
//
// What it does (per email):
//   1. Look up the Auth user by email                → uid
//   2. Look up the therapist doc by email            → therapistId
//   3. Find ALL users docs that mention this email
//        — delete any whose docId ≠ uid (orphans)
//        — overwrite users/{uid} with the canonical shape
//   4. Set custom claim   role: "therapist"          on the Auth user
//   5. Write `uid` field back into the therapist doc
//
// Usage from project root:
//
//   cd scripts
//   npx tsx repairTherapistAuth.ts <email>
//
//   e.g.:  npx tsx repairTherapistAuth.ts xingxing@sunred.app
//
// Idempotent: safe to re-run if anything is already correct.
// Requires `scripts/serviceAccountKey.json` (Admin SDK creds).

import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const serviceAccount = require("./serviceAccountKey.json");

initializeApp({ credential: cert(serviceAccount) });

const db = getFirestore();
const auth = getAuth();

async function repair(rawEmail: string) {
  const email = rawEmail.toLowerCase().trim();
  if (!email) {
    console.error("❌ usage: npx tsx repairTherapistAuth.ts <email>");
    process.exit(1);
  }

  console.log(`🔧 Repairing auth-link for ${email}\n`);

  // ── 1. Auth user ──────────────────────────────────────────────────
  let uid: string;
  try {
    const userRecord = await auth.getUserByEmail(email);
    uid = userRecord.uid;
    console.log(`  ✓ Auth user found — uid: ${uid}`);
  } catch (err) {
    console.error(`  ✗ No Auth user with email ${email}`, err);
    process.exit(1);
  }

  // ── 2. Therapist doc by email ─────────────────────────────────────
  const therapistSnap = await db
    .collection("therapists")
    .where("email", "==", email)
    .limit(1)
    .get();

  if (therapistSnap.empty) {
    console.error(
      `  ✗ No therapist doc with email "${email}" — set field 'email' on the therapist doc first`
    );

    // Debug dump — show all existing emails so the user can spot
    // case-mismatch / whitespace / typo issues at a glance.
    const all = await db.collection("therapists").get();
    console.log(`\n  📋 Existing therapist docs (${all.size}):`);
    all.forEach((d) => {
      const data = d.data() as { name?: string; email?: unknown };
      console.log(
        `     ${d.id.padEnd(28)}  name=${(data.name ?? "—").padEnd(14)}  email=${JSON.stringify(data.email ?? null)}`
      );
    });
    console.log(
      `\n  💡 Fix the email field on the matching doc, then re-run.`
    );
    process.exit(1);
  }
  const therapistDoc = therapistSnap.docs[0];
  const therapistId = therapistDoc.id;
  console.log(`  ✓ Therapist doc found — id: ${therapistId}`);

  // ── 3. Sweep stale users docs ──────────────────────────────────────
  // Delete any users docs that reference this email but whose docId
  // doesn't match the current Auth uid (orphans from old/deleted users).
  const matchByEmail = await db
    .collection("users")
    .where("email", "==", email)
    .get();

  let orphansDeleted = 0;
  for (const d of matchByEmail.docs) {
    if (d.id !== uid) {
      console.log(`  · deleting orphan users/${d.id}`);
      await d.ref.delete();
      orphansDeleted++;
    }
  }
  if (orphansDeleted === 0) {
    console.log("  · no orphan users docs to delete");
  }

  // ── 4. Canonical users/{uid} ───────────────────────────────────────
  await db.collection("users").doc(uid).set(
    {
      uid,
      email,
      role: "therapist",
      therapistId,
      createdAt: FieldValue.serverTimestamp(),
      repairedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
  console.log(`  ✓ users/${uid} written (role=therapist, therapistId=${therapistId})`);

  // ── 5. Custom claim ────────────────────────────────────────────────
  await auth.setCustomUserClaims(uid, { role: "therapist" });
  console.log(`  ✓ custom claim role:"therapist" set on uid=${uid}`);

  // ── 6. Link therapist doc → uid ────────────────────────────────────
  await therapistDoc.ref.update({
    uid,
    updatedAt: FieldValue.serverTimestamp(),
  });
  console.log(`  ✓ therapists/${therapistId}.uid = ${uid}`);

  console.log(`\n✅ Done. ${email} now linked end-to-end.`);
  console.log(
    `   → ask the user to sign out + sign in (or call getIdToken(true)) so the new claim takes effect.`
  );
}

const email = process.argv[2];
if (!email) {
  console.error("❌ usage: npx tsx repairTherapistAuth.ts <email>");
  process.exit(1);
}

repair(email)
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Repair failed:", err);
    process.exit(1);
  });
