// scripts/backfillRoleClaims.mjs
// ────────────────────────────────────────────────────────────────────────
// 🆕 Round 28x.107 (founder security audit) — one-off backfill of the
// `role` / `tid` custom claims on every existing account.
//
// WHY: storage.rules now gates every write on request.auth.token.role.
// The claim was only ever stamped at ACCOUNT CREATION (setRoleOnSignup),
// so accounts that were promoted to admin afterwards — including the
// founder's own, and anyone added via setMemberAdmin or by hand in the
// Firebase console — still carry role:"customer" (or no claim at all).
// Ship the rules without running this first and admins lose their own
// photo uploads.
//
// Idempotent: skips any account whose claim already matches, so it's safe
// to re-run after adding staff.
//
// Run:  node scripts/backfillRoleClaims.mjs           (dry run — shows plan)
//       node scripts/backfillRoleClaims.mjs --apply   (writes claims)
// ────────────────────────────────────────────────────────────────────────

import { createRequire } from "node:module";
import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const require = createRequire(import.meta.url);
const APPLY = process.argv.includes("--apply");

initializeApp({ credential: cert(require("./serviceAccountKey.json")) });
const db = getFirestore();
const auth = getAuth();

// ── 1. Build the desired claim map from Firestore ───────────────────────
/** @type {Map<string, {role: string, tid?: string, why: string}>} */
const want = new Map();

// Practitioners first, so an account that is BOTH gets overwritten to admin
// by the pass below (admin is the strictly higher privilege).
const therapists = await db.collection("therapists").get();
for (const doc of therapists.docs) {
  const uid = doc.data()?.uid;
  if (typeof uid === "string" && uid) {
    want.set(uid, { role: "therapist", tid: doc.id, why: `therapists/${doc.id}` });
  }
}

const admins = await db.collection("admins").get();
for (const doc of admins.docs) {
  const prev = want.get(doc.id);
  want.set(doc.id, {
    role: "admin",
    // An admin who is also a practitioner keeps her tid — she may still
    // upload to her own folder as herself.
    ...(prev?.tid ? { tid: prev.tid } : {}),
    why: `admins/${doc.id}`,
  });
}

console.log(`Found ${therapists.size} therapist docs, ${admins.size} admin docs`);
console.log(`→ ${want.size} accounts should carry a staff claim\n`);

// ── 2. Compare against the live tokens ──────────────────────────────────
let changed = 0;
let already = 0;
let missing = 0;

for (const [uid, target] of want) {
  const user = await auth.getUser(uid).catch(() => null);
  if (!user) {
    console.log(`  ⚠️  no auth account for ${uid}  (${target.why})`);
    missing++;
    continue;
  }
  const cur = user.customClaims ?? {};
  const same = cur.role === target.role && (cur.tid ?? null) === (target.tid ?? null);
  if (same) {
    already++;
    continue;
  }

  const label = user.email ?? user.displayName ?? uid;
  console.log(
    `  ${APPLY ? "✍️ " : "→ "} ${label}: role ${cur.role ?? "(none)"} → ${target.role}` +
      (target.tid ? ` · tid ${cur.tid ?? "(none)"} → ${target.tid}` : "")
  );

  if (APPLY) {
    await auth.setCustomUserClaims(uid, {
      ...cur,
      role: target.role,
      ...(target.tid ? { tid: target.tid } : {}),
    });
    // Same marker the syncAdminClaim trigger writes, so an app that is
    // already open force-refreshes its ID token instead of waiting an hour.
    await db
      .collection("users")
      .doc(uid)
      .set(
        { role: target.role, claimsUpdatedAt: new Date() },
        { merge: true }
      );
  }
  changed++;
}

console.log(
  `\n${APPLY ? "APPLIED" : "DRY RUN"} — ${changed} to change · ${already} already correct · ${missing} with no auth account`
);
if (!APPLY && changed > 0) console.log("Re-run with --apply to write.");
process.exit(0);
