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

// 🆕 28s388 — Bayesian (confidence-weighted) rating so a lucky single-review
//   5.0 can't outrank a proven 7-review 4.9 (founder: "4.9 ดูน้อยกว่า 5.0").
//   adjusted = (n·avg + m·C) / (n + m). A practitioner's own average only
//   dominates once they pass ~m reviews; below that it's pulled toward C.
//   Tuned so Yuri (7 reviews) is the clear top and single 5.0s sit below her.
//   Standard method (IMDb Top 250); endorsed in CLAUDE.md §🔐 "Bayesian aggregate".
// 2026-08-14 — constants moved to src/utils/rating.ts (this script's local
//   4.6/3 had silently diverged from the app's 4.5/10, so the review section
//   disagreed with the card it sat under). One owner; both import it.
import { bayesianRatingFromAggregate } from "../src/utils/rating";
const round1 = (x: number) => Math.round(x * 10) / 10;

async function main() {
  // Aggregate real bookings once.
  const bSnap = await db.collection("bookings").get();
  const served = new Map<string, number>();
  const ratedCount = new Map<string, number>();
  const ratingSum = new Map<string, number>();
  // 2026-08-14 — PII-free public copy of each written review, denormalized
  // onto the (publicly readable) therapist doc. Rules deliberately hide
  // booking docs from anonymous guests (they carry address/phone), which
  // made the detail page's live review query permission-denied for every
  // guest — "No reviews yet." under a header claiming N reviews. Only these
  // five fields leave the booking doc; capped newest-40 per therapist.
  type PublicReview = { bookingId: string; rating: number; body: string; service: string; ts: number };
  const publicReviews = new Map<string, PublicReview[]>();
  const toMs = (v: unknown): number => {
    const t = v as { toMillis?: () => number } | string | number | null | undefined;
    if (!t) return 0;
    if (typeof t === "number") return t;
    if (typeof t === "string") { const p = Date.parse(t); return Number.isFinite(p) ? p : 0; }
    if (typeof t.toMillis === "function") return t.toMillis();
    return 0;
  };
  bSnap.forEach((d) => {
    const b = d.data() as {
      therapistId?: string; status?: string; rating?: number; reviewText?: string;
      serviceName?: string; duration?: number; createdAt?: unknown; startAt?: unknown;
    };
    const tid = b.therapistId;
    if (!tid) return;
    if (b.status && SERVED.has(b.status)) served.set(tid, (served.get(tid) ?? 0) + 1);
    // 2026-08-14 — WRITTEN reviews only (rating + non-empty reviewText), the
    // same filter as useTherapistReviews' visible list and the in-app
    // src/utils/syncTherapistRatings.ts. Star-only ratings inflated the card
    // count past what the detail list could ever show ("36 reviews" over a
    // list of 32) — one definition everywhere now.
    const body = (b.reviewText ?? "").trim();
    if (typeof b.rating === "number" && b.rating >= 1 && body) {
      ratedCount.set(tid, (ratedCount.get(tid) ?? 0) + 1);
      ratingSum.set(tid, (ratingSum.get(tid) ?? 0) + b.rating);
      const svc = [b.serviceName ?? "", typeof b.duration === "number" ? `${b.duration} min` : ""]
        .filter(Boolean).join(" · ");
      (publicReviews.get(tid) ?? publicReviews.set(tid, []).get(tid)!).push({
        bookingId: d.id, rating: b.rating, body, service: svc,
        ts: toMs(b.createdAt) || toMs(b.startAt),
      });
    }
  });
  for (const list of publicReviews.values()) {
    list.sort((a, b) => b.ts - a.ts);
    list.splice(40);
  }

  const tSnap = await db.collection("therapists").get();
  console.log(`\n${COMMIT ? "✍️  COMMITTING" : "🔎 DRY RUN"} — ${tSnap.size} therapist docs\n`);
  console.log(
    "name".padEnd(14),
    "raw→shown".padEnd(12),
    "reviews".padEnd(9),
    "totalSessions"
  );

  let writes = 0;
  for (const doc of tSnap.docs) {
    const cur = doc.data() as { name?: string; rating?: number; ratingRaw?: number; reviews?: number; totalSessions?: number };
    const tid = doc.id;
    const rServed = served.get(tid) ?? 0;
    const rRated = ratedCount.get(tid) ?? 0;
    const rawAvg = rRated ? ratingSum.get(tid)! / rRated : 0;
    // Bayesian-weighted rating = what the card shows; ratingRaw = true average.
    const weighted = rRated ? bayesianRatingFromAggregate(ratingSum.get(tid)!, rRated) : 0;
    const rating = round1(weighted);
    const ratingRaw = round1(rawAvg);

    // ⚠️ 2026-08-14 — totalSessions is NO LONGER written by this script.
    //   The bookings collection is not full history anymore (~78 docs were
    //   deleted around Aug 2026, and old sessions predate the collection),
    //   so re-deriving totalSessions from it UNDERCOUNTS badly — a dry run
    //   showed it would slash public counts like Barbie 79→36, Vivian 77→11,
    //   YaYa 55→2. Those counts are also the deliberately-boosted public
    //   social proof (displaySessionBonus model). rServed stays printed for
    //   reference only.
    const pubList = publicReviews.get(tid) ?? [];
    const next = { rating, ratingRaw, reviews: rRated, publicReviews: pubList };
    const curPub = (cur as { publicReviews?: unknown[] }).publicReviews;
    const changed =
      (cur.rating ?? 0) !== next.rating ||
      (cur.ratingRaw ?? 0) !== next.ratingRaw ||
      (cur.reviews ?? 0) !== next.reviews ||
      JSON.stringify(curPub ?? []) !== JSON.stringify(pubList);

    const fmt = (from: unknown, to: unknown) =>
      from === to ? String(to) : `${from ?? 0}→${to}`;
    console.log(
      String(cur.name ?? tid).padEnd(14),
      `${ratingRaw}→${rating}`.padEnd(12),
      fmt(cur.reviews, next.reviews).padEnd(9),
      `${cur.totalSessions ?? 0} (kept; served=${rServed})`,
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
