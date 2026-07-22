// src/hooks/useTherapistSelf.ts
//
// 🆕 Round 28x.87 — extracted from TherapistProfilePage (Round 28s370's
//   "robust 4-step doc resolution") so the new therapist Home dashboard can
//   read the same live `therapist` doc (Working Status, current location)
//   without a second, drifting copy of the resolution steps.
//
// Resolution order, unchanged from the original:
//   1. therapists/{uid} exists → linkedTherapistId pointer, or IS the
//      profile doc (has a `name`), or an empty role-check stub.
//   2. Fallback: therapists where uid == auth uid.
//   3. Fallback: therapists where email == auth email.
//   Then hand off to a live onSnapshot on the resolved doc id.
//
// 🆕 Round 28x.123 (founder: "ระบบหลังบ้านของพนักงานช้า โหลด กระตุก" → staff-app
//   performance audit) — the audit found this hook was the single biggest
//   contributor to the laggy-on-every-navigation feel, for two reasons:
//
//   1. The three resolution steps ran SEQUENTIALLY (await, await, await)
//      before the live listener could even start — a 4-hop serial chain to
//      first paint. They're mutually exclusive lookups, so they now race in
//      one Promise.all and the priority order is applied to the results.
//   2. Nine staff pages call this hook, and every single tab tap re-ran the
//      whole resolution from scratch. The resolved doc id for a given uid
//      cannot change during a session, so it's now memoised per-uid in a
//      module-level cache: the first page pays the lookup, every later
//      navigation starts its listener immediately.
//
//   The cache is keyed by uid and cleared on sign-out (see clearTherapistSelfCache,
//   called from StaffLayout's sign-out) so a second practitioner signing in on
//   the same device can never inherit the first one's doc id.

import { useEffect, useState } from "react";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import type { Therapist } from "@/types/therapist";

/** uid → resolved therapist doc id (or null when there genuinely isn't one). */
const docIdCache = new Map<string, string | null>();

/** Drop the memoised resolution — call on sign-out. */
export function clearTherapistSelfCache(): void {
  docIdCache.clear();
}

async function resolveTherapistDocId(uid: string, email: string | null): Promise<string | null> {
  // All three lookups are independent; run them together and apply the
  // documented priority to whatever comes back.
  const [directSnap, byUid, byEmail] = await Promise.all([
    getDoc(doc(db, "therapists", uid)),
    getDocs(query(collection(db, "therapists"), where("uid", "==", uid))),
    email
      ? getDocs(query(collection(db, "therapists"), where("email", "==", email)))
      : Promise.resolve(null),
  ]);

  if (directSnap.exists()) {
    const d = directSnap.data() as Record<string, unknown>;
    if (typeof d.linkedTherapistId === "string" && d.linkedTherapistId) {
      return d.linkedTherapistId;
    }
    if (typeof d.name === "string" && d.name) return directSnap.id;
  }
  if (!byUid.empty) return byUid.docs[0].id;
  if (byEmail && !byEmail.empty) return byEmail.docs[0].id;
  return null;
}

export function useTherapistSelf() {
  const [therapist, setTherapist] = useState<Therapist | null>(null);
  // Seed straight from cache so a repeat navigation opens its listener on the
  // first render instead of after a round-trip.
  const [therapistDocId, setTherapistDocId] = useState<string | null>(() => {
    const uid = auth.currentUser?.uid;
    return uid ? docIdCache.get(uid) ?? null : null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const user = auth.currentUser;
      if (!user) {
        setLoading(false);
        return;
      }

      if (docIdCache.has(user.uid)) {
        const cached = docIdCache.get(user.uid) ?? null;
        if (!cancelled) {
          setTherapistDocId(cached);
          if (!cached) setLoading(false);
        }
        return;
      }

      const resolvedId = await resolveTherapistDocId(user.uid, user.email);
      docIdCache.set(user.uid, resolvedId);

      if (!cancelled) {
        setTherapistDocId(resolvedId);
        if (!resolvedId) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!therapistDocId) return;
    const unsub = onSnapshot(doc(db, "therapists", therapistDocId), (snap) => {
      if (snap.exists()) {
        setTherapist({ ...(snap.data() as Therapist), id: snap.id });
      }
      setLoading(false);
    });
    return () => unsub();
  }, [therapistDocId]);

  return { therapist, therapistDocId, loading };
}
