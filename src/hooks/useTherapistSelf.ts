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

export function useTherapistSelf() {
  const [therapist, setTherapist] = useState<Therapist | null>(null);
  const [therapistDocId, setTherapistDocId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const user = auth.currentUser;
      if (!user) {
        setLoading(false);
        return;
      }

      let resolvedId: string | null = null;

      const directRef = doc(db, "therapists", user.uid);
      const directSnap = await getDoc(directRef);
      if (directSnap.exists()) {
        const d = directSnap.data() as Record<string, unknown>;
        if (typeof d.linkedTherapistId === "string" && d.linkedTherapistId) {
          resolvedId = d.linkedTherapistId;
        } else if (typeof d.name === "string" && d.name) {
          resolvedId = directSnap.id;
        }
      }

      if (!resolvedId) {
        const q = query(collection(db, "therapists"), where("uid", "==", user.uid));
        const snap = await getDocs(q);
        if (!snap.empty) resolvedId = snap.docs[0].id;
      }

      if (!resolvedId && user.email) {
        const q = query(collection(db, "therapists"), where("email", "==", user.email));
        const snap = await getDocs(q);
        if (!snap.empty) resolvedId = snap.docs[0].id;
      }

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
