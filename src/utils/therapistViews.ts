// src/utils/therapistViews.ts
//
// 🆕 28s387 — honest, anonymous view tracking (founder "สร้าง view-tracking
//   จริง"). Records a profile open by incrementing therapists/{id}.viewCount
//   by exactly 1. Privacy-first (no PII, no user id — matches the CLAUDE.md
//   §🔐 anonymous-by-default playbook), abuse-resistant (the Firestore rule
//   only permits a +1 bump), and best-effort (never throws into the UI).
//   Deduped per browser so a re-open (or a React StrictMode double-mount)
//   within the window doesn't double-count. Counts grow from 0 as REAL
//   visits arrive — no fake backfill.
import { doc, updateDoc, increment } from "firebase/firestore";
import { db } from "@/lib/firebase";

const DEDUPE_MS = 6 * 60 * 60 * 1000; // one counted view / practitioner / 6h / browser

export async function recordTherapistView(
  id: string | null | undefined
): Promise<void> {
  if (!id) return;
  const key = `sr_viewed_${id}`;
  try {
    const last = Number(localStorage.getItem(key) || 0);
    const now = Date.now();
    if (last && now - last < DEDUPE_MS) return; // already counted recently
    // Stamp BEFORE the await so a StrictMode double-mount (or rapid re-open)
    // reads the fresh stamp and skips the second increment.
    localStorage.setItem(key, String(now));
    await updateDoc(doc(db, "therapists", id), { viewCount: increment(1) });
  } catch {
    // Best-effort: view tracking must never break the profile page.
  }
}
