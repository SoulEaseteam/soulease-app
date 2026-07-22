// src/utils/photoViews.ts
//
// 🆕 Round 28x.113 (founder: option 3 — "ทำระบบนับวิวแยกรายรูปจริงๆ", after
//   she asked how the eye-icon count under each photo was computed) — real
//   per-photo view tracking. The Photos tab used to show `therapist.viewCount`
//   (the whole-PROFILE counter, 28s387) duplicated under EVERY photo — the
//   same number everywhere, not a per-photo count at all; that's the bug she
//   caught. This tracks a REAL count per photo, one doc per photo in
//   therapists/{id}/photoViews/{photoKey}.
//
//   photoKey = a short deterministic hash of the photo's RENDERED `src` (the
//   exact string shown/clicked in the grid — already Cloudinary-enhanced via
//   enhanceImage(), not the raw Firestore gallery URL, since only the
//   enhanced string survives onto the display object built by
//   TherapistDetailPage's buildFromReal()). Firestore subcollection doc IDs
//   can't contain "/", so a raw URL can't be used as the ID directly; hashing
//   also keeps IDs short. If the Cloudinary variant/logic changes later, a
//   photo's key changes and its count starts over — acceptable, matches the
//   "real data only, no synthetic backfill" rule recordTherapistView (28s387)
//   already established.
//
//   Mirrors recordTherapistView's exact pattern: client writes directly (no
//   Cloud Function — see firestore.rules' isPhotoViewCreate/isPhotoViewBump),
//   deduped 6h/photo/browser via localStorage, best-effort (never throws
//   into the UI).
import { doc, getDoc, setDoc, updateDoc, increment, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

const DEDUPE_MS = 6 * 60 * 60 * 1000; // one counted view / photo / 6h / browser

/** Short, deterministic, Firestore-doc-id-safe hash (djb2 variant). */
export function photoKeyFor(src: string): string {
  let h = 5381;
  for (let i = 0; i < src.length; i++) h = (h * 33) ^ src.charCodeAt(i);
  return (h >>> 0).toString(36);
}

export async function recordPhotoView(
  therapistId: string | null | undefined,
  src: string | null | undefined,
): Promise<void> {
  if (!therapistId || !src) return;
  const key = photoKeyFor(src);
  const dedupeKey = `sr_photoviewed_${therapistId}_${key}`;
  try {
    const last = Number(localStorage.getItem(dedupeKey) || 0);
    const now = Date.now();
    if (last && now - last < DEDUPE_MS) return; // already counted recently
    // Stamp BEFORE the await, same reasoning as recordTherapistView: a rapid
    // re-open reads the fresh stamp and skips the second increment.
    localStorage.setItem(dedupeKey, String(now));

    const ref = doc(db, "therapists", therapistId, "photoViews", key);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      await updateDoc(ref, { views: increment(1), updatedAt: serverTimestamp() });
    } else {
      await setDoc(ref, { src, views: 1, updatedAt: serverTimestamp() });
    }
  } catch {
    // Best-effort: view tracking must never break the lightbox.
  }
}
