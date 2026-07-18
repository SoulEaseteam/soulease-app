// src/config/reservedIdentity.ts
//
// 🆕 Round 28x.60 (founder: "บล๊อค ชื่อ และเบอร์ นี้ ห้าม ใครแอบอ้าง") — the shop's
//   own identity, reserved so no guest can book, sign up, or set a profile name
//   that reads as SunRed itself.
//
//   Why this matters here specifically: a booking's contact name is what the
//   concierge and the practitioner see on the dispatch card at 2am. A guest
//   calling themselves "SunRed" with the shop's own number on the slip is not a
//   cosmetic problem — it is the exact shape a social-engineering attempt takes
//   against an outcall business.
//
// ⚠️ KEEP IN SYNC WITH firestore.rules (`isReservedName` / `isReservedPhone`).
//   The checks here are the friendly ones — they run before the write and can
//   explain themselves in the guest's language. The rules are the ones that
//   actually cannot be bypassed: everything in this file is client code and a
//   determined caller talks to the Firestore SDK directly.
//
//   Split of duties, deliberately:
//     • here  — full normalisation (separators, +66/0, casing) → good messages
//     • rules — the canonical unseparated forms only, because rules-language
//               has no phone normalisation. Coarser, but unforgeable.
//   Admins are exempt in both: View's own account legitimately carries this
//   name and number.

import { normPhone } from "@/utils/phoneCountry";

/** Names that read as the business itself. Compared case- and space-insensitively. */
export const RESERVED_NAMES = ["sunred", "sun red", "sunred.vip", "sunredbkk"];

/** The shop's own numbers, in any format a guest could type. */
export const RESERVED_PHONES = ["0634350987"];

/** Strip case, spaces and punctuation so "S U N-R E D" can't walk past. */
function foldName(raw: string): string {
  return raw.toLowerCase().replace(/[\s._·\-–—]/g, "");
}

/** True if this display/contact name impersonates the shop. */
export function isReservedName(raw: string | null | undefined): boolean {
  if (!raw) return false;
  const folded = foldName(raw);
  if (!folded) return false;
  // Substring, not equality: "SunRed Concierge" and "SUNRED official" are the
  // impersonation attempts worth stopping, and no real guest name contains it.
  return RESERVED_NAMES.some((n) => folded.includes(foldName(n)));
}

/** True if this is one of the shop's own phone numbers. */
export function isReservedPhone(raw: string | null | undefined): boolean {
  if (!raw) return false;
  const norm = normPhone(raw);          // handles +66… / 66… / 0… and separators
  if (!norm) return false;
  return RESERVED_PHONES.some((p) => normPhone(p) === norm);
}

/** One check for a name+phone pair. */
export function isReservedIdentity(args: {
  name?: string | null;
  phone?: string | null;
}): boolean {
  return isReservedName(args.name) || isReservedPhone(args.phone);
}

/**
 * The message a guest sees. Deliberately vague about WHY — telling a prober
 * "that's the shop's own number" confirms what they were testing for.
 */
export const RESERVED_IDENTITY_MESSAGE =
  "This name or phone number can't be used for a reservation. Please use your own contact details, or message the concierge.";

export const RESERVED_IDENTITY_MESSAGE_TH =
  "ชื่อหรือเบอร์นี้ใช้จองไม่ได้ กรุณาใช้ข้อมูลติดต่อของคุณเอง หรือทักหาคอนเซียร์จ";
