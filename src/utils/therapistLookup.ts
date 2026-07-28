// src/utils/therapistLookup.ts
//
// 🆕 Round 28r79 (audit fix) — shared therapist-lookup helper so
//   admin-created practitioners (i.e. therapists that live only in
//   Firestore `therapists/{id}`, not in the hardcoded `therapistsData`
//   array) still resolve on the customer surfaces that previously
//   404'd.
//
// r68 shipped the pattern on BookingFlowPage + TherapistDetailPage
// (hardcoded lookup wins fast for the 12 originals — zero extra
// reads; Firestore falls through only on a miss). r78 audit found
// three callers still using the plain `therapistsData.find` pattern:
//
//   • src/pages/booking/BookingHistoryPage.tsx     (booking row rendering)
//   • src/components/booking/StepService.tsx   (filter services)
//   • src/components/booking/StepDateTime.tsx  (working-hours window)
//
// This helper exposes:
//   • findHardcodedTherapist(id)   — sync fast-path (no I/O)
//   • findTherapistOrFetch(id)     — async fallback (Firestore read)
//
// Neither ever throws. Firestore errors + missing docs both return
// null, letting each caller decide whether to display a default or
// swallow silently.

import therapistsData from "@/data/therapists";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import type { Therapist } from "@/types/therapist";

/**
 * Sync fast-path — matches an id against the 12 hardcoded therapists
 * in `src/data/therapists.ts`. Returns null when the id is unknown
 * (admin-added therapist) or falsy.
 */
export function findHardcodedTherapist(
  id: string | null | undefined
): Therapist | null {
  if (!id) return null;
  return therapistsData.find((t) => t.id === id) ?? null;
}

/**
 * Async fallback — try the hardcoded array first (no I/O for the 12
 * originals), then reach for Firestore `therapists/{id}` if it
 * missed. Coerces the Firestore doc into a `Therapist` with safe
 * defaults for every required field, so downstream consumers don't
 * have to guard against `undefined` on `startTime` / `image` / etc.
 *
 * Fail-closed on any read error (permissions, network, malformed
 * doc) — returns null instead of throwing.
 */
export async function findTherapistOrFetch(
  id: string | null | undefined
): Promise<Therapist | null> {
  if (!id) return null;
  const local = findHardcodedTherapist(id);
  if (local) return local;
  try {
    const snap = await getDoc(doc(db, "therapists", id));
    if (!snap.exists()) return null;
    const data = snap.data() as Partial<Therapist> & Record<string, unknown>;
    // Safe defaults for every required Therapist field — mirrors the
    // r68 BookingFlowPage fallback so downstream consumers can trust
    // startTime/endTime/gallery/features without null-checks.
    const defaults: Omit<Therapist, "id"> = {
      name: id,
      image: "",
      rating: 0,
      reviews: 0,
      startTime: "10:00",
      endTime: "22:00",
      gallery: [],
      features: {
        age: "",
        height: "",
        weight: "",
        bodyType: "",
        language: "",
      },
    };
    return {
      ...defaults,
      ...data,
      id,
    } as Therapist;
  } catch {
    return null;
  }
}
