// src/hooks/useTherapistOwnBookingStats.ts
//
// 🆕 Round 28x.100 (founder: "Loyalty · ความภักดีของลูกค้า ไม่ขึ้นจ่ะ") — root
//   cause of both this AND the new Revenue Dashboard showing all-zero for a
//   real, signed-in therapist with 91 unique guests / 245 completed jobs:
//
//   firestore.rules' `isAssignedTherapist()` only ever compares
//   `resource.data.therapistUid == request.auth.uid` (rules-engine can't
//   resolve a slug → uid without a get() per doc, which a LIST query blows
//   past — see stampTherapistUid's own header comment). But
//   useTherapistBookingStats queries `where("therapistId", "==", <slug>)` —
//   a field the rule never checks — so for a LIST query Firestore can't
//   prove the rule holds for every possible result and denies the whole
//   query. The hook's error handler treats "permission-denied" as an
//   EXPECTED case (comment: "anonymous guests can't list...") because that
//   assumption held for the public detail page's anonymous visitors — it
//   silently also ate the case of the therapist looking at HER OWN page,
//   who legitimately has permission but was asking the wrong field.
//
//   TherapistJobsPage already proved the fix pattern: query by
//   `therapistUid == auth.currentUser.uid` and the rule matches. This hook
//   does the same for the aggregate stats, reusing the exact SAME
//   `computeBookingStats` pure function useTherapistBookingStats already
//   uses — same math, only the query predicate differs — so a self-service
//   number can never disagree with the public-page number once it's a
//   permitted read.
//
//   Deliberately a SEPARATE hook rather than editing useTherapistBookingStats
//   in place: that hook is also called for anonymous/public contexts (home
//   grid, booking flow) where therapistId really is the only id available
//   and permission-denied really is the expected, harmless case — changing
//   its query field would not fix those callers (they have no uid to pass)
//   and risks regressing behavior nobody asked to change.

//
// 🆕 Round 28x.123 (staff-app performance audit) — the query itself moved to
//   the shared listener in useOwnBookingsSnapshot. This hook opened its own
//   onSnapshot on exactly the same query as useTherapistRevenueRows, and both
//   mount together on /therapist/performance, so ~250 booking docs were
//   downloaded and parsed twice per open. Same math, same result — one
//   transport instead of two.

import { useOwnBookingsSnapshot } from "@/hooks/useOwnBookingsSnapshot";
import {
  computeBookingStats,
  EMPTY_BOOKING_STATS,
  type TherapistBookingStats,
} from "@/hooks/useTherapistBookingStats";

export function useTherapistOwnBookingStats(
  uid: string | null | undefined,
): TherapistBookingStats {
  return useOwnBookingsSnapshot<TherapistBookingStats>(
    uid,
    computeBookingStats,
    uid ? { ...EMPTY_BOOKING_STATS, loading: true } : EMPTY_BOOKING_STATS,
    (err) => {
      // eslint-disable-next-line no-console
      console.warn("[useTherapistOwnBookingStats] snapshot error:", err);
      return { ...EMPTY_BOOKING_STATS, loading: false };
    },
  );
}
