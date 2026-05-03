// src/hooks/useTherapistReviews.ts
//
// 🆕 Round 28ae (founder 2026-05-03)
// Subscribes to live booking reviews for a single therapist.
//
// Source-of-truth: reviews are stored as `reviewText` + `rating` fields
// directly on `bookings/{id}` docs (not a separate `reviews` collection).
// Same pattern used by ReviewListPage.tsx — kept consistent so the
// detail-page sheet and the full review list page never disagree.
//
// Returns:
//   • reviews        — sorted newest first, with privacy-safe shape
//                      (booking id only, no userName/userEmail/avatar)
//   • reviewCount    — total reviews
//   • avgRating      — simple arithmetic mean of real reviews (1-5)
//   • buckets        — 5/4/3/2/1 star counts + pct
//   • loading        — true until first snapshot lands
//
// Privacy: detail-page sheet must never expose customer identity, so
// this hook strips userName/email/avatar at the boundary. Full
// ReviewListPage uses its own enrichment for the customer dashboard.

import { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface ReviewLite {
  /** Firestore booking docId — display only as "Booking #XXXX". */
  bookingId: string;
  rating: number;
  /** Review body — already trimmed at write time. */
  body: string;
  /** Service summary — "Thai 90min" style. Empty when missing. */
  service: string;
  /** Human-friendly relative time, e.g. "2 days ago". */
  ago: string;
  /** True for reviews tied to a real Firestore booking (always true here). */
  verified: boolean;
  /** epoch ms — used for sorting. */
  ts: number;
}

export interface ReviewBucket {
  stars: number;
  count: number;
  pct: number;
}

export interface UseTherapistReviewsResult {
  reviews: ReviewLite[];
  reviewCount: number;
  avgRating: number;
  buckets: ReviewBucket[];
  loading: boolean;
}

type FirestoreDateLike = Timestamp | Date | string | number | null | undefined;

interface BookingReviewDoc {
  rating?: number;
  reviewText?: string;
  serviceName?: string;
  duration?: number;
  startAt?: FirestoreDateLike;
  createdAt?: FirestoreDateLike;
}

/** Convert various Firestore date shapes to epoch ms. */
function toMs(v: FirestoreDateLike): number {
  if (!v) return 0;
  if (v instanceof Timestamp) return v.toMillis();
  if (v instanceof Date) return v.getTime();
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const t = Date.parse(v);
    return Number.isFinite(t) ? t : 0;
  }
  return 0;
}

/** Lightweight "X days ago" formatter — avoids pulling dayjs into the
 *  hook just for relativeTime. Matches how ReviewListPage labels rows. */
function formatAgo(ms: number): string {
  if (!ms) return "";
  const diffSec = Math.max(0, (Date.now() - ms) / 1000);
  if (diffSec < 60) return "just now";
  const min = Math.round(diffSec / 60);
  if (min < 60) return `${min} minute${min === 1 ? "" : "s"} ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr} hour${hr === 1 ? "" : "s"} ago`;
  const d = Math.round(hr / 24);
  if (d < 30) return `${d} day${d === 1 ? "" : "s"} ago`;
  const mo = Math.round(d / 30);
  if (mo < 12) return `${mo} month${mo === 1 ? "" : "s"} ago`;
  const yr = Math.round(mo / 12);
  return `${yr} year${yr === 1 ? "" : "s"} ago`;
}

/**
 * Live-subscribe to a therapist's reviews from `bookings/{...}` docs.
 * Pass `null` / empty id to skip the subscription (returns loading=false).
 */
export function useTherapistReviews(
  therapistId: string | null | undefined
): UseTherapistReviewsResult {
  const [reviews, setReviews] = useState<ReviewLite[]>([]);
  const [loading, setLoading] = useState<boolean>(Boolean(therapistId));

  useEffect(() => {
    if (!therapistId) {
      setReviews([]);
      setLoading(false);
      return;
    }

    // Query just by therapistId — uses the existing composite index
    // (therapistId + createdAt). Filter empty reviewText client-side to
    // avoid needing a separate `!=` index (which Firestore would silently
    // reject without one). Bookings per therapist are bounded, so the
    // overfetch is cheap (and the snapshot is incremental anyway).
    const q = query(
      collection(db, "bookings"),
      where("therapistId", "==", therapistId)
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const list: ReviewLite[] = [];
        snap.forEach((d) => {
          const b = d.data() as BookingReviewDoc;
          const text = (b.reviewText ?? "").trim();
          if (!text) return; // skip bookings without a written review
          const ts = toMs(b.createdAt ?? b.startAt ?? null);
          const svc = b.serviceName ?? "";
          const dur = typeof b.duration === "number" ? `${b.duration} min` : "";
          const service = [svc, dur].filter(Boolean).join(" · ");
          list.push({
            bookingId: d.id,
            rating: typeof b.rating === "number" ? b.rating : 5,
            body: text,
            service,
            ago: formatAgo(ts),
            verified: true,
            ts,
          });
        });

        // Sort newest first
        list.sort((a, b) => b.ts - a.ts);
        setReviews(list);
        setLoading(false);
      },
      (err) => {
        // eslint-disable-next-line no-console
        console.error("[useTherapistReviews] snapshot error:", err);
        setReviews([]);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [therapistId]);

  // Derived aggregates — recompute on every render (reviews list is small).
  const reviewCount = reviews.length;
  const avgRating =
    reviewCount > 0
      ? reviews.reduce((s, r) => s + r.rating, 0) / reviewCount
      : 0;

  const counts: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  for (const r of reviews) {
    const k = Math.max(1, Math.min(5, Math.round(r.rating)));
    counts[k] += 1;
  }
  const buckets: ReviewBucket[] = [5, 4, 3, 2, 1].map((stars) => ({
    stars,
    count: counts[stars],
    pct: reviewCount > 0 ? Math.round((counts[stars] / reviewCount) * 100) : 0,
  }));

  return { reviews, reviewCount, avgRating, buckets, loading };
}
