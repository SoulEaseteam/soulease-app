// src/hooks/usePhotoViews.ts
//
// 🆕 Round 28x.113 — live per-photo view counts for the public Photos tab.
// Reads therapists/{id}/photoViews (see utils/photoViews.ts for the write
// path + the photoKeyFor() hash), returned as a map keyed by the exact same
// `src` string the caller renders/clicks — no need for the caller to know
// about the hash at all.
import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

export function usePhotoViews(therapistId: string | null | undefined): Record<string, number> {
  const [views, setViews] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!therapistId) {
      setViews({});
      return;
    }
    const unsub = onSnapshot(
      collection(db, "therapists", therapistId, "photoViews"),
      (snap) => {
        const next: Record<string, number> = {};
        snap.forEach((d) => {
          const data = d.data() as { src?: string; views?: number };
          if (data.src) next[data.src] = data.views ?? 0;
        });
        setViews(next);
      },
      () => setViews({}),
    );
    return () => unsub();
  }, [therapistId]);

  return views;
}
