// scripts/syncTherapistRatings.ts
//
// 🔄 Round 28s385 — denormalize REAL rating / review / session stats from the
// `bookings` collection onto each `therapists` doc, so the customer cards can
// show the honest ratings that already exist (they were never synced — every
// doc sat at rating:0/reviews:0 even though guests had rated).
//
// Computes per therapist, from bookings:
//   • totalSessions = # bookings with status completed|done  (served)
//   • reviews       = # bookings with rating >= 1            (real ratings)
//   • rating        = avg of those ratings, rounded to 1 dp  (0 if none)
// Leaves rebookRate UNTOUCHED (that's a separate unique-customer computation).
// Nothing is fabricated — a therapist with 0 real ratings stays at rating:0
// (card hides the chip). Milo/Pare (0 sessions) correctly stay clean/NEW.
//
// Usage:
//   cd ~/sunred-vite/scripts
//   npx tsx syncTherapistRatings.ts            # DRY RUN — prints planned writes
//   npx tsx syncTherapistRatings.ts --commit   # writes to Firestore
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const serviceAccount = require("./serviceAccountKey.json");
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

const COMMIT = process.argv.includes("--commit");
const SERVED = new Set(["completed", "done"]);

async function main() {
  // Aggregate real bookings once.
  const bSnap = await db.collection("bookings").get();
  const served = new Map<string, number>();
  const ratedCount = new Map<string, number>();
  const ratingSum = new Map<string, number>();
  bSnap.forEach((d) => {
    const b = d.data() as { therapistId?: string; status?: string; rating?: number };
    const tid = b.therapistId;
    if (!tid) return;
    if (b.status && SERVED.has(b.status)) served.set(tid, (served.get(tid) ?? 0) + 1);
    if (typeof b.rating === "number" && b.rating >= 1) {
      ratedCount.set(tid, (ratedCount.get(tid) ?? 0) + 1);
      ratingSum.set(tid, (ratingSum.get(tid) ?? 0) + b.rating);
    }
  });

  const tSnap = await db.collection("therapists").get();
  console.log(`\n${COMMIT ? "✍️  COMMITTING" : "🔎 DRY RUN"} — ${tSnap.size} therapist docs\n`);
  console.log(
    "name".padEnd(14),
    "rating".padEnd(8),
    "reviews".padEnd(9),
    "totalSessions"
  );

  let writes = 0;
  for (const doc of tSnap.docs) {
    const cur = doc.data() as { name?: string; rating?: number; reviews?: number; totalSessions?: number };
    const tid = doc.id;
    const rServed = served.get(tid) ?? 0;
    const rRated = ratedCount.get(tid) ?? 0;
    const rating = rRated ? Math.round((ratingSum.get(tid)! / rRated) * 10) / 10 : 0;

    const next = { rating, reviews: rRated, totalSessions: rServed };
    const changed =
      (cur.rating ?? 0) !== next.rating ||
      (cur.reviews ?? 0) !== next.reviews ||
      (cur.totalSessions ?? 0) !== next.totalSessions;

    const fmt = (from: unknown, to: unknown) =>
      from === to ? String(to) : `${from ?? 0}→${to}`;
    console.log(
      String(cur.name ?? tid).padEnd(14),
      fmt(cur.rating, next.rating).padEnd(8),
      fmt(cur.reviews, next.reviews).padEnd(9),
      fmt(cur.totalSessions, next.totalSessions),
      changed ? "" : "  (no change)"
    );

    if (COMMIT && changed) {
      await doc.ref.set(next, { merge: true });
      writes++;
    }
  }

  console.log(
    `\n${COMMIT ? `✅ wrote ${writes} doc(s).` : "💡 re-run with --commit to write."}\n`
  );
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
