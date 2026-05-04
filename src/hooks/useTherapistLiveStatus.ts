// src/hooks/useTherapistLiveStatus.ts
//
// 🆕 Round 28b35 (founder 2026-05-04) — CRITICAL bug fix.
//
// Reported issue: Hami was toggled `Holiday` in admin Therapist Manager
//   (Firestore: therapists/{id}.isHoliday = true), but customer-facing
//   pages still showed "Currently Available!" and the booking flow let
//   a customer place a confirmed booking for her.
//
// Root cause: TherapistDetailPage + BookingFlowPage read static
//   `data/therapists.ts` to build the record passed to
//   `calculateTherapistStatus()`. Static data has no isHoliday /
//   statusOverride / busyUntil — so the engine always returned
//   "available" no matter what admin did in Firestore.
//
// This hook fixes that by subscribing to the live therapist doc and
// returning ONLY the status-relevant fields. Callers merge those into
// the static record before invoking `calculateTherapistStatus`.
//
// We don't replace the entire therapist record on purpose — the static
// file still owns name / image / specialty / services / pricing /
// gallery (low-churn presentation data). Mixing those with Firestore
// would risk visual flicker on slow networks. Status fields are the
// only piece that needs live sync for booking correctness.

import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { StatusOverride, FirestoreDateLike } from "@/types/therapist";

const VALID_OVERRIDES = new Set<string>([
  "available",
  "bookable",
  "resting",
  "Auto",
]);

const narrowOverride = (v: unknown): StatusOverride | undefined => {
  if (v === null) return null;
  if (typeof v !== "string") return undefined;
  return VALID_OVERRIDES.has(v) ? (v as StatusOverride) : undefined;
};

export interface TherapistLiveStatus {
  /** When true → engine returns "resting", booking submit must reject. */
  isHoliday?: boolean;
  /** Manual override — narrowed to the canonical StatusOverride union. */
  statusOverride?: StatusOverride;
  /** Active booking flag — engine uses to flip to "bookable". */
  activeBooking?: boolean;
  /** Timestamp/string — engine reads to decide "busy until X". */
  busyUntil?: FirestoreDateLike;
  /** Working window — admin can edit live so engine respects shift. */
  startTime?: string;
  endTime?: string;
  /** Convenience flag for callers who only need a yes/no gate. */
  exists: boolean;
  /** True while the doc is loading (first snapshot). UI can show skeleton. */
  loading: boolean;
}

const EMPTY: TherapistLiveStatus = { exists: false, loading: true };

export function useTherapistLiveStatus(
  therapistId: string | null | undefined
): TherapistLiveStatus {
  const [state, setState] = useState<TherapistLiveStatus>(EMPTY);

  useEffect(() => {
    if (!therapistId) {
      setState({ exists: false, loading: false });
      return;
    }
    setState({ exists: false, loading: true });
    const unsub = onSnapshot(
      doc(db, "therapists", therapistId),
      (snap) => {
        if (!snap.exists()) {
          setState({ exists: false, loading: false });
          return;
        }
        const data = snap.data() as TherapistLiveStatus & Record<string, unknown>;
        const busyUntilRaw = data.busyUntil as unknown;
        const isFirestoreDateLike = (v: unknown): v is FirestoreDateLike =>
          v === null ||
          typeof v === "string" ||
          typeof v === "number" ||
          v instanceof Date ||
          (typeof v === "object" &&
            v !== null &&
            "toDate" in (v as Record<string, unknown>));
        setState({
          isHoliday: !!data.isHoliday,
          statusOverride: narrowOverride(data.statusOverride),
          activeBooking:
            typeof data.activeBooking === "boolean"
              ? data.activeBooking
              : undefined,
          busyUntil: isFirestoreDateLike(busyUntilRaw)
            ? busyUntilRaw
            : undefined,
          startTime:
            typeof data.startTime === "string" ? data.startTime : undefined,
          endTime:
            typeof data.endTime === "string" ? data.endTime : undefined,
          exists: true,
          loading: false,
        });
      },
      (err) => {
        console.warn("[useTherapistLiveStatus] snapshot error:", err);
        setState({ exists: false, loading: false });
      }
    );
    return () => unsub();
  }, [therapistId]);

  return state;
}

export default useTherapistLiveStatus;
