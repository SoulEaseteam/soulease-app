// src/utils/therapistIdentity.ts
//
// 🆕 Round 28s324 — one therapist, one row (everywhere).
//
// Problem: bookings stored `therapistId` / `therapistName` inconsistently over
// time — casing variants ("XingXing" vs "xingxing"), trailing spaces, a legacy
// id on some rows and a name-only value on others, and staff who were later
// removed from the roster but still own historical bookings. Grouping by the
// raw id (or id||name) therefore split ONE person into several rows — the
// founder saw "Yuri" and "Mini" twice on /admin/reports.
//
// Fix: derive a stable identity KEY from the therapist's NAME (letters+digits
// only, case-folded — same normalization the dashboard by-service dedup uses).
// The roster has unique names (14 docs, no dup names), so a name-key never
// collides two real people, and it happily merges every id/casing variant.

/** Normalized identity key for a therapist — merges casing / spacing / punctuation
 *  variants of the same name. Falls back to a normalized id, then "unknown". */
export function therapistKey(name?: string | null, id?: string | null): string {
  const n = (name ?? "").replace(/[^\p{L}\p{N}]+/gu, "").toLowerCase();
  if (n) return n;
  const i = (id ?? "").replace(/[^\p{L}\p{N}]+/gu, "").toLowerCase();
  return i || "unknown";
}

export interface RosterEntry { id: string; name: string }

/** Build key → canonical {id,name} from the therapists roster, so booking rows
 *  with a variant id/casing resolve to the current roster label + doc id
 *  (the doc id is what `payoutAccounts` / bank details are keyed by). */
export function buildRosterIndex(
  roster: RosterEntry[]
): Map<string, RosterEntry> {
  const m = new Map<string, RosterEntry>();
  for (const r of roster) {
    const k = therapistKey(r.name, r.id);
    if (!m.has(k)) m.set(k, r);
  }
  return m;
}
