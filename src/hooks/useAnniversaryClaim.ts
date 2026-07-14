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
  /** 🆕 28w.92 — phone the concierge enrolled them under. */
  phone?: string;
  /** Delivered sessions on that phone, stamped by /admin/members. */
  visits?: number;
  lastVisitMs?: number;
  /** 🆕 28w.95 — lifetime spend on delivered sessions, and the SunPoints
   *  back-credited from it. Both computed by /admin/members from bookings the
   *  shop actually delivered (status completed/done), so the credit is always
   *  backed by real history. */
  totalSpentTHB?: number;
  points?: number;
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

  // 🆕 28w.92 (founder: "ลูกค้าที่มีเบอร์กับเราแล้วถือว่าเป็นลูกค้าเก่าทันที")
  //   — if the shop already has your number, you are a returning guest. Full stop.
  //
  //   28w.90 measured this from bookings carrying `userId == uid`, which was
  //   wrong for how SunRed actually operates: most reservations are created by
  //   the concierge, so they land with `userId: null` and only a phone. A real
  //   regular who signs in would have shown ZERO bookings under their uid and
  //   been handed the first-timer offer instead of the returning-guest menu.
  //
  //   The guest cannot look this up for themselves — Firestore rules only let
  //   them list bookings by their own uid, never by phone — so the answer is
  //   delivered to them: the concierge's membership mirror (written by phone in
  //   /admin/members) carries the fact. Holding a membership record IS "the shop
  //   has my number".
  //
  //   Confirmed with the founder: returning means they have BOOKED with us before
  //   (their phone appears on a reservation) — not merely that they hold an
  //   account. So the test is the delivered-session count carried on the mirror,
  //   which /admin/members computes from bookings BY PHONE, catching every
  //   concierge-created reservation the uid check missed. A member the concierge
  //   just enrolled but who has never had a session is still a new guest and
  //   correctly gets the welcome offer.
  //
  //   The uid-booking count is kept as a second route in, for a guest who booked
  //   through the site while signed in but is not on the roster yet.
  const [hasOwnBookings, setHasOwnBookings] = useState(false);
  useEffect(() => {
    if (!user) {
      setHasOwnBookings(false);
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
        if (!cancelled) setHasOwnBookings(snap.data().count > 0);
      })
      .catch((err) => {
        console.warn("[anniversary] booking count failed:", err?.code);
        if (!cancelled) setHasOwnBookings(false);
      });
    return () => { cancelled = true; };
  }, [user]);

  /** Has had at least one delivered session with us — by phone OR by uid. */
  const isReturning = (membership?.visits ?? 0) > 0 || hasOwnBookings;

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
    /** SunPoints back-credited from verified past sessions. */
    points: membership?.points ?? 0,
    totalSpentTHB: membership?.totalSpentTHB ?? 0,
    visits: membership?.visits ?? 0,
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
