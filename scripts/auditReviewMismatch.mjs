// Read-only audit, 2026-08-14 (founder: "รีวิว หน้าเว็บ ไม่ตรงกัน สักอัน").
// Compares, per therapist:
//   • card numbers  — therapists/{id}.reviews + .rating (denormalized by
//     scripts/syncTherapistRatings.ts: reviews = bookings with rating>=1,
//     rating = Bayesian-weighted average)
//   • detail page   — useTherapistReviews live query: rating>=1 AND
//     non-empty reviewText, simple mean
// to quantify which definition drift / staleness the founder is seeing.
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync } from "fs";

const sa = JSON.parse(
  readFileSync("/Users/varissarahirunto/sunred-vite/scripts/serviceAccountKey.json", "utf8"),
);
initializeApp({ credential: cert(sa) });
const db = getFirestore();

const [thSnap, bkSnap] = await Promise.all([
  db.collection("therapists").get(),
  db.collection("bookings").get(),
]);

const rated = new Map(); // tid -> {count, sum}
const withText = new Map(); // tid -> {count, sum}
bkSnap.forEach((d) => {
  const b = d.data();
  const tid = b.therapistId;
  if (!tid || typeof b.rating !== "number" || b.rating < 1) return;
  const r = rated.get(tid) ?? { count: 0, sum: 0 };
  r.count += 1;
  r.sum += b.rating;
  rated.set(tid, r);
  if ((b.reviewText ?? "").trim()) {
    const t = withText.get(tid) ?? { count: 0, sum: 0 };
    t.count += 1;
    t.sum += b.rating;
    withText.set(tid, t);
  }
});

const rows = [];
thSnap.forEach((d) => {
  const t = d.data();
  const r = rated.get(d.id) ?? { count: 0, sum: 0 };
  const w = withText.get(d.id) ?? { count: 0, sum: 0 };
  rows.push({
    id: d.id,
    name: t.name ?? d.id,
    card_reviews: t.reviews ?? null,
    card_rating: t.rating ?? null,
    real_rated: r.count,
    real_rated_avg: r.count ? +(r.sum / r.count).toFixed(2) : 0,
    detail_withText: w.count,
    detail_avg: w.count ? +(w.sum / w.count).toFixed(2) : 0,
  });
});
rows.sort((a, b) => (b.card_reviews ?? 0) - (a.card_reviews ?? 0));
console.table(rows);
