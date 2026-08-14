// src/utils/rating.ts
//
// ⭐ Bayesian rating — fair, transparent, decay-resistant.
//
// Why not a plain mean?
//   • A new therapist with one 5★ review would outrank a veteran with
//     200 reviews averaging 4.85★ — that's not informative for buyers.
//   • A new therapist with one 1★ review would crash to 1.0 and
//     never recover — that's not fair to the therapist.
//
// Bayesian average folds in a "prior" — the rating we'd assume the
// therapist has before any reviews land. As real reviews accumulate,
// the prior's influence shrinks and the displayed rating converges to
// the actual mean.
//
// Formula:
//   displayed = (priorMean × priorWeight + sumOfRealRatings)
//             ÷ (priorWeight + realReviewCount)
//
// Tuning constants (confirmed with founder 2026-05-01):
//   PRIOR_MEAN   = 4.5    — new therapists open at 4.5★
//   PRIOR_WEIGHT = 10     — equivalent to 10 hypothetical reviews at 4.5
//
// Sample trajectories with these constants:
//   0   reviews                → 4.50
//   5   reviews × 5★           → 4.67
//   10  reviews × 5★           → 4.75
//   20  reviews × 5★           → 4.83
//   50  reviews × 5★           → 4.92
//   100 reviews × 5★           → 4.95
//   1   review  × 1★ only      → 4.18  (drops slowly, recoverable)
//
// Documented for the customer in /faq so the rating is auditable.

// 2026-08-14 — retuned to match scripts/syncTherapistRatings.ts (28s388,
// the later founder-approved tuning: "Yuri clear top, single 5.0s below
// her"). The codebase briefly held TWO Bayesian priors — 4.5/10 here (and
// copy-pasted into TherapistProfileCard + HomeMapBrowse) vs 4.6/3 in the
// sync script — so the review section could show 4.6 while the card and
// header showed 4.8 for the same practitioner. This file is now the ONLY
// owner of these constants; every consumer imports.
export const PRIOR_MEAN = 4.6;
export const PRIOR_WEIGHT = 3;

export interface ReviewLike {
  /** Star rating, 1-5 (integers or decimals both accepted). */
  rating: number;
}

/**
 * Compute the Bayesian-adjusted rating for a therapist given their list
 * of real reviews.
 *
 * @returns Rating in the [1, 5] range, rounded to 2 decimal places.
 *          Always returns PRIOR_MEAN when reviews is empty.
 */
export function bayesianRating(reviews: ReviewLike[]): number {
  const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
  const adjusted =
    (PRIOR_MEAN * PRIOR_WEIGHT + sum) / (PRIOR_WEIGHT + reviews.length);
  return Math.round(adjusted * 100) / 100;
}

/**
 * Same calculation, but accepting pre-aggregated values — useful when
 * the sum + count are stored on the therapist doc as denormalized
 * counters (avoids reading the full review subcollection on every page).
 */
export function bayesianRatingFromAggregate(
  realRatingSum: number,
  realReviewCount: number
): number {
  const adjusted =
    (PRIOR_MEAN * PRIOR_WEIGHT + realRatingSum) /
    (PRIOR_WEIGHT + realReviewCount);
  return Math.round(adjusted * 100) / 100;
}

/**
 * Format a rating for display — always 1 decimal place ("4.7", "4.50"
 * → "4.5"). Use this everywhere a rating is shown so the format stays
 * consistent across cards, profiles, and search.
 */
export function formatRating(value: number): string {
  return value.toFixed(1);
}
