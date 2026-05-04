// src/hooks/useFirstBookingDiscount.ts
//
// 🆕 Round 28b21 (founder 2026-05-04) — Phase 5 of conversion plan.
//
// Returns whether the current customer qualifies for the first-booking
// discount (10% off — admin applies manually after seeing the booking).
//
// Eligibility rules (any one is enough → eligible):
//   1. Signed-out / anonymous (we can't prove they've booked before).
//   2. Signed-in user with `bookingsCount` field === 0 OR missing.
//
// Once they hit "confirmed", set `users/{uid}.bookingsCount = 1` via the
// onBookingConfirmed function (TODO future) so the discount auto-hides
// next time. For now we just rely on a Firestore count query.
//
// Used by: HeroSection (homepage), DetailHero (therapist profile).

import { useEffect, useState } from "react";
import { collection, getCountFromServer, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/providers/AuthProvider";

export interface FirstBookingDiscount {
  /** True if we should show a 10% off banner */
  eligible: boolean;
  /** Discount code to copy/paste in the booking form */
  code: string;
  /** Plain-text label, ready to render */
  label: string;
  loading: boolean;
}

const DISCOUNT_CODE = "FIRST10";
const DISCOUNT_LABEL = "First booking · 10% off · code FIRST10";

export const useFirstBookingDiscount = (): FirstBookingDiscount => {
  const { user, loading: authLoading } = useAuth();
  const [eligible, setEligible] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;

    const check = async () => {
      // Guest? Always eligible. Don't burn a Firestore read.
      if (!user) {
        if (!cancelled) {
          setEligible(true);
          setLoading(false);
        }
        return;
      }

      // Signed-in: count past confirmed bookings server-side. Aggregate
      // queries are 1 read regardless of result size — efficient.
      try {
        const q = query(
          collection(db, "bookings"),
          where("userId", "==", user.uid),
          where("status", "in", ["confirmed", "completed"])
        );
        const snap = await getCountFromServer(q);
        if (cancelled) return;
        setEligible(snap.data().count === 0);
      } catch (err) {
        // Fail OPEN — better to show the discount than to hide it on
        // a transient error. This is a marketing message, not a payment.
        console.warn("[firstBookingDiscount] count failed:", err);
        if (!cancelled) setEligible(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void check();
    return () => {
      cancelled = true;
    };
  }, [authLoading, user]);

  return { eligible, code: DISCOUNT_CODE, label: DISCOUNT_LABEL, loading };
};

export default useFirstBookingDiscount;
