// src/hooks/useAnniversaryClaim.ts
//
// 🆕 Round 28w.88 — membership state + Anniversary reward claim for the SIGNED-IN
//   guest.
//
// Two Firestore facts, both readable by the guest themselves:
//
//   • users/{uid}.membership   — stamped by the concierge when she enrols the
//     guest from /admin/members. The member roster itself lives in
//     `adminSettings/members`, which is admin-only by rule, so the guest can't
//     read it — this mirror on their OWN doc is the bridge. No mirror ⇒ we treat
//     them as not-yet-a-member and route them to the concierge.
//
//   • rewardClaims/*          — the claim itself. The guest can CREATE one
//     (status "pending") but cannot update or approve it; the rules bar that.
//     They also cannot write the reward onto their own user doc: `users` only
//     accepts a whitelist (displayName/phone/photoURL/language), so a guest
//     cannot grant themselves anything. The concierge honours the claim at
//     booking time.
//
// Returns everything the Anniversary dialog needs to decide which button to show.

import { useEffect, useState, useCallback } from "react";
import {
  addDoc,
  collection,
  doc,
  getCountFromServer,
  onSnapshot,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/providers/AuthProvider";
import type { AnniversaryRewardId } from "@/config/anniversary";
import { ANNIVERSARY_REWARDS, rewardsFor } from "@/config/anniversary";

export interface AnniversaryClaim {
  id: string;
  rewardId: AnniversaryRewardId;
  rewardLabel: string;
  minSpendTHB: number | null;
  status: "pending" | "approved" | "used" | "rejected";
  createdAtMs: number | null;
}

export interface MembershipMirror {
  code: string;
  tier: string;
}

export function useAnniversaryClaim() {
  const { user, loading: authLoading } = useAuth();
  const [membership, setMembership] = useState<MembershipMirror | null>(null);
  const [claims, setClaims] = useState<AnniversaryClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // membership mirror on the guest's own user doc
  useEffect(() => {
    if (!user) {
      setMembership(null);
      setLoading(authLoading);
      return;
    }
    const unsub = onSnapshot(
      doc(db, "users", user.uid),
      (snap) => {
        const m = snap.data()?.membership as MembershipMirror | undefined;
        setMembership(m?.code ? m : null);
        setLoading(false);
      },
      (err) => {
        console.warn("[anniversary] membership read failed:", err.code);
        setMembership(null);
        setLoading(false);
      },
    );
    return () => unsub();
  }, [user, authLoading]);

  // this guest's own claims
  useEffect(() => {
    if (!user) {
      setClaims([]);
      return;
    }
    const unsub = onSnapshot(
      query(collection(db, "rewardClaims"), where("userId", "==", user.uid)),
      (snap) => {
        setClaims(
          snap.docs.map((d) => {
            const v = d.data();
            return {
              id: d.id,
              rewardId: v.rewardId as AnniversaryRewardId,
              rewardLabel: String(v.rewardLabel ?? ""),
              minSpendTHB: typeof v.minSpendTHB === "number" ? v.minSpendTHB : null,
              status: (v.status ?? "pending") as AnniversaryClaim["status"],
              createdAtMs: v.createdAt?.toMillis?.() ?? null,
            };
          }),
        );
      },
      (err) => console.warn("[anniversary] claims read failed:", err.code),
    );
    return () => unsub();
  }, [user]);

  // 🆕 28w.90 — new vs returning decides WHICH rewards they may collect
  //   (config/anniversary rewardsFor). Measured from DELIVERED bookings, not
  //   from having an account: someone who signed up and never booked is still a
  //   new guest, and would otherwise be handed the returning-guest menu.
  const [isReturning, setIsReturning] = useState(false);
  useEffect(() => {
    if (!user) {
      setIsReturning(false);
      return;
    }
    let cancelled = false;
    void getCountFromServer(
      query(
        collection(db, "bookings"),
        where("userId", "==", user.uid),
        where("status", "in", ["completed", "done"]),
      ),
    )
      .then((snap) => {
        if (!cancelled) setIsReturning(snap.data().count > 0);
      })
      .catch((err) => {
        console.warn("[anniversary] booking count failed:", err?.code);
        // Fail CLOSED: treat as a new guest. Wrongly handing a first-timer the
        // returning-guest menu gives away a reward they haven't earned.
        if (!cancelled) setIsReturning(false);
      });
    return () => { cancelled = true; };
  }, [user]);

  /** The Anniversary reward is one-per-guest; a rejected claim doesn't burn it. */
  const activeClaim =
    claims.find((c) => c.status !== "rejected") ?? null;

  /** The rewards THIS guest is entitled to collect. */
  const eligibleRewards = rewardsFor(isReturning);

  const claimReward = useCallback(
    async (rewardId: AnniversaryRewardId): Promise<boolean> => {
      if (!user) return false;
      const reward = ANNIVERSARY_REWARDS.find((r) => r.id === rewardId);
      if (!reward) return false;
      setSubmitting(true);
      try {
        await addDoc(collection(db, "rewardClaims"), {
          userId: user.uid,
          campaign: "anniversary-1",
          rewardId: reward.id,
          rewardLabel: reward.label,
          minSpendTHB: reward.minSpendTHB,
          // The guest can only ever create a PENDING claim — the rules reject any
          // other status on create, and block update entirely. Approval is the
          // concierge's call, not the client's.
          status: "pending",
          createdAt: serverTimestamp(),
        });
        return true;
      } catch (err) {
        console.error("[anniversary] claim failed:", err);
        return false;
      } finally {
        setSubmitting(false);
      }
    },
    [user],
  );

  return {
    signedIn: Boolean(user),
    isMember: Boolean(membership),
    isReturning,
    eligibleRewards,
    membership,
    activeClaim,
    claims,
    loading: authLoading || loading,
    submitting,
    claimReward,
  };
}
