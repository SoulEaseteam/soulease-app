// src/hooks/useSavedTherapist.ts
//
// 🆕 Round 28x.177 (founder reference screenshot, a pet-adoption app's
//   heart + CTA footer: "ปุ่มนี้ล่าา ช่วยออกแบบ ให้เข้ากับที่เรามี") —
//   a real "save for later" toggle, not the no-op stub DetailHero removed
//   in 28t.18. That removal's own comment is explicit about why a Firestore
//   `users/{uid}/favorites` write path doesn't work here: SunRed guests are
//   anonymous by design, so `user` is almost never set. localStorage needs
//   no login and persists per browser — the honest version of "save" for
//   guests who never sign in.

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "sunred_saved_therapists";

function readSaved(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const arr = raw ? (JSON.parse(raw) as unknown) : [];
    return new Set(Array.isArray(arr) ? arr.filter((v) => typeof v === "string") : []);
  } catch {
    return new Set();
  }
}

function writeSaved(ids: Set<string>) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(ids)));
  } catch {
    // storage blocked (private mode etc.) — toggle still works for this
    // render, it just won't persist across reloads.
  }
}

export function useSavedTherapist(therapistId: string) {
  const [isSaved, setIsSaved] = useState(() => readSaved().has(therapistId));

  useEffect(() => {
    setIsSaved(readSaved().has(therapistId));
  }, [therapistId]);

  const toggle = useCallback(() => {
    const current = readSaved();
    if (current.has(therapistId)) {
      current.delete(therapistId);
      setIsSaved(false);
    } else {
      current.add(therapistId);
      setIsSaved(true);
    }
    writeSaved(current);
  }, [therapistId]);

  return { isSaved, toggle };
}
