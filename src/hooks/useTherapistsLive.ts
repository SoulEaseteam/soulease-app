// src/hooks/useTherapistsLive.ts
// Real-time subscription to `therapists` collection — single source of truth
// for both customer-facing HomePage and admin holiday toggle.
//
// Falls back to hardcoded data if Firestore is empty or fails (offline-friendly).
//
// Listens to:
//   - therapist profile changes
//   - manualStatus toggles (holiday / available / resting / bookable)
//   - any field mutation
import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Therapist } from "@/types/therapist";
import therapistsHardcoded from "@/data/therapists";

interface Options {
  // ถ้า Firestore ว่าง ให้ fallback ใช้ hardcoded data
  fallbackToHardcoded?: boolean;
}

export function useTherapistsLive(options: Options = {}) {
  const { fallbackToHardcoded = true } = options;
  const [therapists, setTherapists] = useState<Therapist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    const unsub = onSnapshot(
      collection(db, "therapists"),
      (snapshot) => {
        if (cancelled) return;
        const data: Therapist[] = snapshot.docs.map((doc) => {
          const raw = doc.data() as any;
          return {
            ...raw,
            id: raw.id || doc.id, // ใช้ custom id ถ้ามี ไม่งั้น fallback docId
          } as Therapist;
        });

        if (data.length === 0 && fallbackToHardcoded) {
          // Firestore ยังไม่มี data — ใช้ hardcoded ชั่วคราว
          setTherapists(therapistsHardcoded as Therapist[]);
        } else {
          setTherapists(data);
        }
        setLoading(false);
      },
      (err) => {
        if (cancelled) return;
        console.error("[useTherapistsLive] subscribe error:", err);
        setError(err);
        // ถ้า Firestore rules block หรือ network fail → fallback hardcoded
        if (fallbackToHardcoded) {
          setTherapists(therapistsHardcoded as Therapist[]);
        }
        setLoading(false);
      }
    );

    return () => {
      cancelled = true;
      unsub();
    };
  }, [fallbackToHardcoded]);

  return { therapists, loading, error };
}

export default useTherapistsLive;
