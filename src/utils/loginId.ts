// src/utils/loginId.ts
//
// 🆕 Round 28w.81 (founder 2026-07-14: "หน้าล๊อคอิน มันใช้ระบบ ใส่ เบอกับยูสเซอ
//   แทนได้ไหม") — let guests sign in with a PHONE NUMBER or a USERNAME instead
//   of an email address.
//
// Why not Firebase Phone Auth (SMS OTP)?
//   It bills per SMS, needs the Blaze plan + a reCAPTCHA flow, and our guests
//   are mostly foreign tourists on roaming numbers where OTP delivery is slow
//   and unreliable. That's a real cost + a real drop-off point on the one screen
//   we cannot afford friction on. So we DON'T use it here.
//
// How this works instead — deterministic alias emails:
//   Firebase Auth only understands email+password, so we map the identifier the
//   guest types onto a synthetic address that Auth can hold:
//
//     phone    "081-234-5678"  → normPhone → "0812345678" → 0812345678@phone.sunred.vip
//     username "viewbkk"                                  → viewbkk@user.sunred.vip
//     email    "a@b.com"                                  → used as-is (unchanged)
//
//   The alias is DERIVED, never looked up, so there is no public phone→email
//   mapping doc to leak, and no extra Firestore read on the login path. The
//   alias domains receive no mail and never appear in the UI — they're an
//   internal encoding, not an address.
//
//   Uniqueness comes free: Auth rejects a duplicate address with
//   `auth/email-already-in-use`, so two people can't claim one phone/username
//   without us maintaining any index of our own.
//
// Note the phone alias reuses `normPhone` — the SAME normaliser the membership
// system keys on (adminSettings/members) and that the blocked-phone guard uses.
// So "+66 81 234 5678" and "081-234-5678" are one account AND one member.

import { normPhone } from "@/utils/phoneCountry";

/** Alias domains. No mailbox exists at either — they are an encoding. */
export const PHONE_ALIAS_DOMAIN = "phone.sunred.vip";
export const USERNAME_ALIAS_DOMAIN = "user.sunred.vip";

export type LoginIdKind = "email" | "phone" | "username";

export interface ResolvedLoginId {
  kind: LoginIdKind;
  /** What we actually hand to Firebase Auth. */
  authEmail: string;
  /** Canonical identifier to store on users/{uid} (phone key, handle, or email). */
  canonical: string;
}

/** 3–20 chars, letters/digits/._- — deliberately excludes "@" so a username can
 *  never be mistaken for an email, and excludes a leading digit run so it can
 *  never collide with the phone branch. */
const USERNAME_RE = /^[a-z][a-z0-9._-]{2,19}$/;

/** Digits with the usual human separators: +66 81-234 5678, (081) 234-5678… */
const PHONE_RE = /^\+?[\d\s().-]+$/;

/** Thai mobiles are 10 digits (0XXXXXXXXX); allow a little slack for foreign. */
const MIN_PHONE_DIGITS = 9;

export function isEmailInput(raw: string): boolean {
  return raw.includes("@");
}

/**
 * Turn whatever the guest typed into the address Firebase Auth signs in with.
 * Returns null when the input is not a usable identifier at all — the caller
 * shows a single generic hint rather than telling a prober which form failed.
 */
export function resolveLoginId(raw: string): ResolvedLoginId | null {
  const v = raw.trim();
  if (!v) return null;

  // Email — pass straight through. Existing guests, every therapist, and admin
  // all registered this way and must keep working untouched.
  if (isEmailInput(v)) {
    const email = v.toLowerCase();
    // Cheapest possible sanity check; Auth does the real validation.
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
    return { kind: "email", authEmail: email, canonical: email };
  }

  // Phone — normalise FIRST so +66/0 forms collapse to the membership key.
  if (PHONE_RE.test(v)) {
    const phone = normPhone(v);
    if (phone.length < MIN_PHONE_DIGITS) return null;
    return {
      kind: "phone",
      authEmail: `${phone}@${PHONE_ALIAS_DOMAIN}`,
      canonical: phone,
    };
  }

  // Username.
  const handle = v.toLowerCase();
  if (!USERNAME_RE.test(handle)) return null;
  return {
    kind: "username",
    authEmail: `${handle}@${USERNAME_ALIAS_DOMAIN}`,
    canonical: handle,
  };
}

/** True when this address is one of our internal aliases rather than a real
 *  inbox. Used to decide whether an email-based password reset is even possible
 *  (it isn't — those guests reset via the concierge link on /login). */
export function isAliasEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const lower = email.toLowerCase();
  return (
    lower.endsWith(`@${PHONE_ALIAS_DOMAIN}`) ||
    lower.endsWith(`@${USERNAME_ALIAS_DOMAIN}`)
  );
}
