// src/hooks/useMemberTier.ts
//
// 🆕 Round 28x.84 — the signed-in customer's own membership tier, shared by
//   every surface that needs it (Profile hero artwork, Booking History hero
//   colors). Reads users/{uid}.membership.tier — the mirror
//   syncMembershipMirror (AdminMembersPage) writes onto the guest's OWN doc
//   on every enrol/upgrade, since the member roster itself
//   (adminSettings/members) is admin-only by firestore.rules and a customer
//   can't read it directly.
//
//   Live (onSnapshot), not a one-time read, so an admin upgrading someone
//   mid-session updates the hero without a reload — matches the pattern
//   useAnniversaryClaim already uses for the same field.

import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { MembershipTier } from "@/utils/membership";

export function useMemberTier(uid: string | null | undefined): MembershipTier | null {
  const [tier, setTier] = useState<MembershipTier | null>(null);

  useEffect(() => {
    if (!uid) {
      setTier(null);
      return;
    }
    const unsub = onSnapshot(
      doc(db, "users", uid),
      (snap) => {
        const t = (snap.data() as { membership?: { tier?: MembershipTier } } | undefined)
          ?.membership?.tier;
        setTier(t ?? null);
      },
      () => setTier(null),
    );
    return () => unsub();
  }, [uid]);

  return tier;
}
