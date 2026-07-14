// src/utils/referral.ts
//
// 🆕 Round 28r7 (founder 2026-05-06) — Phase 1 referral plumbing.
//
// Goal: prove there's real demand for the referral feature BEFORE we
// build automatic Firestore tracking + Cloud Functions. Phase 1 is
// fully manual:
//   1. Friend lands on https://sunred.vip/?ref=SUN-XXXXXX
//   2. captureReferralFromURL() pulls the code into localStorage
//   3. The Hero + BookingFlow surface a tiny "Referral active" hint
//   4. When the friend books, the hint nudges them to mention the
//      code in concierge chat → View applies discount manually
//   5. View also tells the original referrer to claim their credit
//
// No Firestore, no Cloud Functions, no auto-credit logic. If Phase 1
// drives real traffic, Phase 2 wires automatic tracking.

const LS_KEY = "sunred.referral.code";
const LS_TS_KEY = "sunred.referral.ts";

/** Format guard — codes look like SUN-A4F2K9. Tolerant of case. */
const CODE_RE = /^SUN-[A-Z0-9]{4,8}$/i;

/**
 * Reads `?ref=…` from the current URL, validates it, and stashes it
 * in localStorage with a capture timestamp. Safe to call on every
 * page load — does nothing if there's no `?ref=`.
 */
export function captureReferralFromURL(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const params = new URLSearchParams(window.location.search);
    const raw = params.get("ref");
    if (!raw) return null;
    const code = raw.trim().toUpperCase();
    if (!CODE_RE.test(code)) return null;
    window.localStorage.setItem(LS_KEY, code);
    window.localStorage.setItem(LS_TS_KEY, String(Date.now()));
    return code;
  } catch {
    // Private mode / quota / SSR — non-fatal.
    return null;
  }
}

/**
 * Returns the currently-active referral code, or `null` if none was
 * captured. Auto-expires after 30 days so a stale code from an old
 * link doesn't haunt the user forever.
 */
export function getActiveReferralCode(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const code = window.localStorage.getItem(LS_KEY);
    const tsStr = window.localStorage.getItem(LS_TS_KEY);
    if (!code || !tsStr) return null;
    const ts = Number(tsStr);
    if (!Number.isFinite(ts)) return null;
    const ageMs = Date.now() - ts;
    const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
    if (ageMs > THIRTY_DAYS_MS) {
      clearReferralCode();
      return null;
    }
    return code;
  } catch {
    return null;
  }
}

/**
 * Clears the captured referral. Call after a booking completes (so
 * the hint doesn't follow the user into their next session) or when
 * an admin manually applies the discount.
 */
export function clearReferralCode(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(LS_KEY);
    window.localStorage.removeItem(LS_TS_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * 🆕 Round 28w.89 — the guest's OWN referral code, to share.
 *
 * Moved here from ReferralDialog: the new "My discount codes" page needs the
 * same code, and two independent derivations of a code the guest hands to a
 * friend is exactly the kind of thing that silently drifts apart. One function.
 *
 * Stable + human-readable: `SUN-XXXXXX` (6 chars, base36 hash of the uid).
 * Swap for a backend-issued code when a /referrals API exists.
 */
export function deriveReferralCode(seed: string | null | undefined): string {
  if (!seed) return "SUN-WELCOME";
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) | 0;
  }
  const code = Math.abs(h).toString(36).toUpperCase().padStart(6, "0").slice(0, 6);
  return `SUN-${code}`;
}
