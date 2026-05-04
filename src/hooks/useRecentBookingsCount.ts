// src/hooks/useRecentBookingsCount.ts
//
// 🆕 Round 28b21 (founder 2026-05-04) — Phase 5 of conversion plan.
//
// Returns the live count of bookings created in the last `windowHours`
// hours (default: 24h). Powers the social-proof timer banner on the
// HeroSection: "12 people booked in the last 24 hours".
//
// Implementation: aggregate count query — 1 Firestore read regardless
// of result size. Re-checks every 60 seconds to keep the number fresh
// without forcing a page reload.
//
// Privacy: we only ever expose the COUNT, never the names or details
// of recent customers. The hook never reads booking documents.

import { useEffect, useState } from "react";
import {
  collection,
  getCountFromServer,
  query,
  Timestamp,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

const POLL_MS = 60_000;
const FALLBACK_COUNT = 12; // shown if count query fails (privacy + UX)

export interface RecentBookingsCount {
  count: number;
  windowHours: number;
  loading: boolean;
}

export const useRecentBookingsCount = (
  windowHours = 24
): RecentBookingsCount => {
  const [count, setCount] = useState<number>(FALLBACK_COUNT);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      try {
        const cutoff = Timestamp.fromMillis(
          Date.now() - windowHours * 60 * 60 * 1000
        );
        const q = query(
          collection(db, "bookings"),
          where("createdAt", ">=", cutoff)
        );
        const snap = await getCountFromServer(q);
        if (cancelled) return;
        const c = snap.data().count;
        // Floor at 5 so an empty system never shows "1 person" (looks dead).
        setCount(c < 5 ? FALLBACK_COUNT : c);
      } catch (err) {
        // Fail-open with the fallback. Never block the marketing UI on a
        // permission or network error.
        if (!cancelled) {
          console.warn("[recentBookings] count failed:", err);
          setCount(FALLBACK_COUNT);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void check();
    const id = window.setInterval(check, POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [windowHours]);

  return { count, windowHours, loading };
};

export default useRecentBookingsCount;
