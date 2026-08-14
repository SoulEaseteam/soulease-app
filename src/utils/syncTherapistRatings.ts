// src/utils/syncTherapistRatings.ts
//
// 🆕 Round 28x.1 (founder: "รีวิวไม่ตรงกันสักที่") — recompute every therapist's
//   headline rating + review count FROM THEIR REAL REVIEWS, and write it back to
//   the therapist doc.
//
// The bug this exists to kill:
//
//   The browse cards (home, map, profile card) render `therapists/{id}.rating`
//   and `.reviews` — fields a human TYPES on /admin/therapists. Nothing ever
//   derived them from actual reviews, so they drifted into fiction. Proof: a card
//   was showing "4.4 · 1 review". A single review is an integer 1-5, so no real
//   average of one review can be 4.4 — the number was simply made up.
//
//   Meanwhile the detail page computed its rating live from the bookings that
//   carry a `rating`. Two sources, never reconciled, so the same practitioner
//   showed a different score on every screen.
//
// Why the doc fields have to WIN rather than be deleted:
//   A logged-out guest cannot read rated bookings (firestore.rules — and that
//   restriction is deliberate: reviews live ON the reservation, which carries the
//   guest's address and phone). So the live aggregation is not available to the
//   very people the rating is for. The denormalised field on the public therapist
//   doc is the only rating a guest can actually see — so it must be the truth,
//   not a hand-typed guess.
//
// Rating uses bayesianRating(), the formula the app already documents to guests
// (/faq) — NOT a raw mean, which would let one 5★ review outrank a veteran.

import { collection, doc, getDocs, query, where, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { bayesianRating } from "@/utils/rating";

export interface RatingSyncRow {
  therapistId: string;
  reviewCount: number;
  /** Bayesian-adjusted, 1 decimal — what every surface will show. */
  rating: number;
  /** What the doc said before, so the caller can show what actually changed. */
  wasRating: number | null;
  wasReviews: number | null;
  changed: boolean;
}

export interface RatingSyncResult {
  rows: RatingSyncRow[];
  /** Rows that differ. With dryRun, nothing was written. */
  updated: number;
  scannedReviews: number;
  dryRun: boolean;
}

/**
 * Recompute, and (unless `dryRun`) persist.
 *
 * Admin-only by Firestore rules — which is exactly right, because this rewrites
 * the star rating customers buy on. `dryRun` exists so the change can be READ
 * before it is applied: a silent mass-overwrite of every therapist's public score
 * is not something anyone should trigger blind.
 */
export async function syncTherapistRatings(
  opts: { dryRun?: boolean } = {},
): Promise<RatingSyncResult> {
  // Every booking that carries a real review.
  const rated = await getDocs(
    query(collection(db, "bookings"), where("rating", ">=", 1)),
  );

  const byTherapist: Record<string, number[]> = {};
  rated.forEach((d) => {
    const b = d.data() as { therapistId?: string; rating?: number; reviewText?: string };
    if (!b.therapistId || typeof b.rating !== "number") return;
    // 2026-08-14 (founder: "รีวิว หน้าเว็บ ไม่ตรงกัน สักอัน", round 2 of this
    // complaint) — count ONLY written reviews, same filter as
    // useTherapistReviews' visible list. A star-only rating fed this count but
    // could never appear in the list, so the card claimed e.g. "36 reviews"
    // over a list of 32 and no two surfaces agreed. One definition now:
    // a review is something the guest can actually read.
    if (!(b.reviewText ?? "").trim()) return;
    (byTherapist[b.therapistId] ??= []).push(b.rating);
  });

  const therapists = await getDocs(collection(db, "therapists"));
  const batch = writeBatch(db);
  const rows: RatingSyncRow[] = [];
  let updated = 0;

  therapists.forEach((t) => {
    const prev = t.data() as { rating?: number; reviews?: number };
    const stars = byTherapist[t.id] ?? [];

    // A therapist with NO reviews gets 0/0, not the 4.5 prior. Showing an
    // unearned 4.5 to a customer is the same lie in a nicer suit — the card
    // already has a "NEW" state for exactly this case.
    const reviewCount = stars.length;
    const rating =
      reviewCount > 0 ? Math.round(bayesianRating(stars.map((r) => ({ rating: r }))) * 10) / 10 : 0;

    const changed =
      Math.abs((prev.rating ?? 0) - rating) > 0.001 || (prev.reviews ?? 0) !== reviewCount;

    rows.push({
      therapistId: t.id,
      reviewCount,
      rating,
      wasRating: prev.rating ?? null,
      wasReviews: prev.reviews ?? null,
      changed,
    });

    if (changed) {
      updated++;
      batch.update(doc(db, "therapists", t.id), { rating, reviews: reviewCount });
    }
  });

  if (updated > 0 && !opts.dryRun) await batch.commit();

  return { rows, updated, scannedReviews: rated.size, dryRun: Boolean(opts.dryRun) };
}
