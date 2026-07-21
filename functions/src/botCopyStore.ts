// functions/src/botCopyStore.ts
//
// 🆕 Round 28x.97 (founder: "สนใจ" — self-service edit of Telegram bot
//   message content, no code change/redeploy needed per edit) — a thin
//   read layer over the `botCopy` Firestore collection. Every bot-copy
//   function (welcomeFor, faqEntry, the Promo day/holiday bodies) checks
//   here FIRST; a null return means "no override set" and the caller
//   falls back to its existing hardcoded default. Firestore is an
//   override layer on top of the code, never the only source — so a
//   fresh deploy with an empty botCopy collection sends byte-identical
//   messages to today.
//
// Cloud Functions read this via firebase-admin, which bypasses
// firestore.rules entirely — the rules on `botCopy/*` only gate the
// ADMIN PANEL's client-side read/write, not this server-side read.

import { getFirestore } from "firebase-admin/firestore";

const COLLECTION = "botCopy";

/** Read one language's value from botCopy/{docId}.{field}.{lang}.
 *  Returns null (not throws) on any miss — missing doc, missing field,
 *  missing language, blank string, or a Firestore error — so callers can
 *  treat this as "no override" and fall back to their hardcoded default. */
export async function getBotCopyField(
  docId: string,
  field: string,
  lang: string,
): Promise<string | null> {
  try {
    const snap = await getFirestore().collection(COLLECTION).doc(docId).get();
    if (!snap.exists) return null;
    const data = snap.data();
    const bucket = data?.[field] as Record<string, unknown> | undefined;
    const value = bucket?.[lang];
    return typeof value === "string" && value.trim() ? value : null;
  } catch {
    return null;
  }
}
