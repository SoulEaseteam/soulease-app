// scripts/auditOrphanTherapists.ts
//
// 🆕 Round 28b36 (founder 2026-05-04) — Find therapist docs that are
//   "orphan" in either of two senses:
//
//   1. NO AUTH USER LINKED — `uid` field empty/missing AND no auth
//      account matches `email`. The therapist can't sign in to
//      `/therapist/profile` and admin can't grant scoped writes.
//
//   2. NO STATIC DATA REF — doc id isn't in `src/data/therapists.ts`.
//      These tend to be left over from old admin tests; customer
//      cards may render off the static list and skip them entirely.
//
// Usage
//   Dry-run:  npx tsx scripts/auditOrphanTherapists.ts
//   Apply:    npx tsx scripts/auditOrphanTherapists.ts --delete
//             (deletes ONLY orphan-on-both-sides docs that are also
//              empty of bookings — extra safe.)

import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { createRequire } from "module";
const require = createRequire(import.meta.url);

const serviceAccount = require("./serviceAccountKey.json");
initializeApp({ credential: cert(serviceAccount) });

const db = getFirestore();
const auth = getAuth();

// Static therapist IDs — same list as src/data/therapists.ts.
// Update this set if you add a new therapist via static data.
const STATIC_IDS = new Set<string>([
  "BarbieSunRed",
  "HamiSunRed",
  "JiASunRed",
  "JimmySunRed",
  "MiniSunRed",
  "NannySunRed",
  "NickySunRed",
  "RichieSunRed",
  "VivianSunRed",
  "XingXingSunRed",
  "YaYaSunRed",
  "YuriSunRed",
]);

interface TherapistDoc {
  id: string;
  name?: string;
  email?: string;
  uid?: string;
}

const apply = process.argv.includes("--delete");

async function main(): Promise<void> {
  console.log(
    `\n🔍 Auditing orphan therapist docs — mode: ${apply ? "DELETE" : "DRY-RUN"}\n`
  );

  const snap = await db.collection("therapists").get();
  if (snap.empty) {
    console.log("⚠️  No therapists found.");
    return;
  }

  const allClean: TherapistDoc[] = [];
  const noAuth: TherapistDoc[] = [];
  const noStatic: TherapistDoc[] = [];
  const bothOrphan: { doc: TherapistDoc; bookingCount: number }[] = [];

  for (const d of snap.docs) {
    const data = { id: d.id, ...(d.data() as TherapistDoc) };

    // Check static
    const inStatic = STATIC_IDS.has(data.id);

    // Check auth — try uid → email
    let hasAuth = false;
    if (data.uid) {
      try {
        await auth.getUser(data.uid);
        hasAuth = true;
      } catch {
        hasAuth = false;
      }
    }
    if (!hasAuth && data.email) {
      try {
        await auth.getUserByEmail(data.email);
        hasAuth = true;
      } catch {
        hasAuth = false;
      }
    }

    if (!hasAuth) noAuth.push(data);
    if (!inStatic) noStatic.push(data);

    // Both orphan AND no auth → candidate for deletion
    if (!hasAuth && !inStatic) {
      // Count bookings to be EXTRA sure (never delete a doc that has
      // any booking history attached — even if orphaned).
      const bookingsSnap = await db
        .collection("bookings")
        .where("therapistId", "==", data.id)
        .limit(1)
        .get();
      bothOrphan.push({ doc: data, bookingCount: bookingsSnap.size });
    }

    if (hasAuth && inStatic) allClean.push(data);
  }

  console.log(`✅ clean (auth + static)      ${allClean.length}`);
  console.log(`🟡 missing auth user          ${noAuth.length}`);
  console.log(`🟡 missing static data ref    ${noStatic.length}`);
  console.log(`🔴 BOTH orphan                ${bothOrphan.length}`);
  console.log(`────────────────────────────────────`);

  if (noAuth.length > 0) {
    console.log("\n🟡 Missing auth user (can't sign in):");
    for (const n of noAuth) {
      console.log(
        `   • ${n.id} (${n.name ?? "—"}) email=${n.email ?? "—"} uid=${n.uid ?? "—"}`
      );
    }
  }

  if (noStatic.length > 0) {
    console.log("\n🟡 Missing static data ref (not in data/therapists.ts):");
    for (const n of noStatic) {
      console.log(`   • ${n.id} (${n.name ?? "—"})`);
    }
  }

  if (bothOrphan.length > 0) {
    console.log("\n🔴 BOTH orphan (no auth + no static):");
    for (const b of bothOrphan) {
      console.log(
        `   • ${b.doc.id} (${b.doc.name ?? "—"}) bookings=${b.bookingCount}`
      );
    }
  }

  if (apply && bothOrphan.length > 0) {
    console.log("\n🗑  Deleting BOTH-orphan docs with zero bookings…");
    let count = 0;
    for (const b of bothOrphan) {
      if (b.bookingCount > 0) {
        console.log(
          `   ⚠️  ${b.doc.id} has bookings — SKIPPED (manual cleanup needed)`
        );
        continue;
      }
      await db.collection("therapists").doc(b.doc.id).delete();
      count += 1;
      console.log(`   ✓ deleted ${b.doc.id}`);
    }
    console.log(`\n✅ Deleted ${count} orphan therapist docs.`);
  } else if (!apply && bothOrphan.length > 0) {
    console.log("\n💡 Re-run with --delete to remove zero-booking orphans.");
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Audit failed:", err);
    process.exit(1);
  });
