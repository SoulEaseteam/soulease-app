// scripts/backfillPublicReviews.mjs
// ────────────────────────────────────────────────────────────────────────
// 🆕 Round 28x.165 — one-off backfill of the `reviewsPublic` collection.
//
// WHY: reviews are stored as `rating` + `reviewText` on the booking doc.
// 28w.91 removed anonymous `allow list` on `bookings` (correctly — a booking
// carries the guest's address, phone and GPS, and a LIST returns whole
// documents), which silently made every existing review invisible to
// logged-out visitors. 28x.165 introduces `reviewsPublic`, a redacted mirror
// carrying only rating + text + service, written by the
// onBookingWriteSyncPublicReview trigger.
//
// That trigger only fires on FUTURE writes. Every review that already exists
// — including everything AdminSeedReviewsPage produced — needs copying once.
// This script does that. After it runs, the trigger keeps the two in step.
//
// Copies ONLY these fields. Do not add more:
//   bookingId · therapistId · rating · text · serviceName · duration · createdAt
//
// Idempotent (doc id = booking id, writes are `set`), so re-running is safe.
//
// Run:  node scripts/backfillPublicReviews.mjs           (dry run — shows plan)
//       node scripts/backfillPublicReviews.mjs --apply   (writes docs)
// ────────────────────────────────────────────────────────────────────────

import { createRequire } from "node:module";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const require = createRequire(import.meta.url);
const APPLY = process.argv.includes("--apply");

initializeApp({ credential: cert(require("./serviceAccountKey.json")) });
const db = getFirestore();

const snap = await db.collection("bookings").get();

const plan = [];
let skippedNoReview = 0;
let skippedNoTherapist = 0;

snap.forEach((doc) => {
  const b = doc.data();
  const rating = typeof b.rating === "number" ? b.rating : 0;
  const text = String(b.reviewText ?? "").trim();
  if (rating < 1 || !text) {
    skippedNoReview++;
    return;
  }
  // A review with no practitioner has nothing to attach to publicly.
  if (typeof b.therapistId !== "string" || !b.therapistId) {
    skippedNoTherapist++;
    return;
  }
  plan.push({
    bookingId: doc.id,
    therapistId: b.therapistId,
    rating,
    text,
    serviceName: b.serviceName ?? "",
    duration: typeof b.duration === "number" ? b.duration : null,
    createdAt: b.reviewedAt ?? b.createdAt ?? b.startAt ?? null,
  });
});

console.log(`bookings scanned      : ${snap.size}`);
console.log(`  no review           : ${skippedNoReview}`);
console.log(`  review, no therapist: ${skippedNoTherapist}`);
console.log(`to mirror             : ${plan.length}`);

const byTherapist = new Map();
for (const r of plan) {
  byTherapist.set(r.therapistId, (byTherapist.get(r.therapistId) ?? 0) + 1);
}
console.log("\nper practitioner:");
for (const [tid, n] of [...byTherapist.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${tid.padEnd(24)} ${n}`);
}

if (!APPLY) {
  console.log("\nDRY RUN — nothing written. Re-run with --apply to write.");
  process.exit(0);
}

// Firestore caps a batch at 500 writes.
let written = 0;
for (let i = 0; i < plan.length; i += 400) {
  const chunk = plan.slice(i, i + 400);
  const batch = db.batch();
  for (const r of chunk) {
    batch.set(db.collection("reviewsPublic").doc(r.bookingId), r);
  }
  await batch.commit();
  written += chunk.length;
  console.log(`  committed ${written}/${plan.length}`);
}

console.log(`\nDone — ${written} public review doc(s) written.`);
process.exit(0);
