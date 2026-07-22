// src/hooks/useTherapistIdentityStats.ts
//
// 🆕 Round 28x.96 — extracted from TherapistProfilePage so TherapistHomePage
// can render the same TherapistIdentityCard (live review count + computed
// Avail status) without a second, possibly-drifting copy of this logic.

//
// 🆕 Round 28x.123 (staff-app performance audit) — the review-count listener
// now shares the one bookings subscription in useOwnBookingsSnapshot instead
// of opening its own. This hook mounts on BOTH Home and Profile, so tapping
// between tabs used to re-stream all ~250 booking docs each time just to
// recount reviews.

import { useMemo } from "react";
import { auth } from "@/lib/firebase";
import type { Avail, Therapist } from "@/types/therapist";
import { calculateTherapistStatus } from "@/utils/calculateTherapistStatus";
import { useOwnBookingsSnapshot } from "@/hooks/useOwnBookingsSnapshot";

interface BookingDoc {
  reviewText?: string;
  status?: string;
}

export function useTherapistIdentityStats(therapist: Therapist | null) {
  // Live review count — completed bookings with a non-empty reviewText.
  const reviewCount = useOwnBookingsSnapshot<number>(
    auth.currentUser?.uid,
    (snap) => {
      let reviewed = 0;
      snap.forEach((d) => {
        const b = d.data() as BookingDoc;
        const status = (b.status ?? "").toLowerCase();
        if (
          ["completed", "done"].includes(status) &&
          typeof b.reviewText === "string" &&
          b.reviewText.trim().length > 0
        ) {
          reviewed += 1;
        }
      });
      return reviewed;
    },
    0,
  );

  // Computed status via the canonical engine — one source of truth.
  const computedStatus: Avail = useMemo(() => {
    if (!therapist) return "resting";
    const { status } = calculateTherapistStatus(therapist);
    /* eslint-disable @typescript-eslint/no-unnecessary-condition */
    return status === "available" || status === "bookable" || status === "resting"
      ? status
      : "resting";
    /* eslint-enable @typescript-eslint/no-unnecessary-condition */
  }, [therapist]);

  return { reviewCount, computedStatus };
}
