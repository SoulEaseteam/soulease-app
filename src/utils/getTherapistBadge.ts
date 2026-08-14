// src/utils/getTherapistBadge.ts
//
// 🆕 Round 28s153 — Founder: "TOP RATED มีแค่รายวัน ตามความขายดี".
//   Adds TOP_RATED — awarded to the practitioner with the highest
//   todayBookings across the active roster. Daily by design (resets
//   the moment todayBookings rolls over at midnight BKK). VIP/HOT
//   lifetime thresholds remain as fallbacks for individual cards
//   that don't get the top spot but are still busy.

export type BadgeKey = "TOP_RATED" | "VIP" | "HOT" | "NEW";

export interface BadgeConfig {
  key: BadgeKey | null;
  label: string;
  priority: number;
  expiresAt?: number;
  shouldUpdateFirestore?: boolean;
}

// ⚠️ DAY_MS and BADGE_TTL are deliberately SEPARATE constants (28x.161).
//   The NEW window used to be written as `21 * BADGE_TTL`, so bumping the
//   TTL from 24h → 48h would have silently doubled "new practitioner" from
//   21 days to 42. Anything measured in days uses DAY_MS; only badge
//   lifetime uses BADGE_TTL.
const DAY_MS = 24 * 60 * 60 * 1000;

// 🆕 28x.161 (founder 2026-08-14: "Badge อื่นๆ ต้องอยู่ 48 ชม") — a badge
//   now lives 48 hours from the moment it was earned/set, instead of 24h
//   (manual) or "until the 06:00 business-day rollover" (auto). See the
//   precedence comment in getBadgeForTherapist for how each kind expires.
const BADGE_TTL = 48 * 60 * 60 * 1000; // 48 ชั่วโมง

const LABEL_FOR: Record<BadgeKey, string> = {
  TOP_RATED: "Top Rated",
  VIP: "VIP Therapist",
  HOT: "Hot Therapist",
  NEW: "New Therapist",
};

const PRIORITY_FOR: Record<BadgeKey, number> = {
  TOP_RATED: 0, // highest — beats VIP
  VIP: 1,
  HOT: 2,
  NEW: 3,
};

function pack(key: BadgeKey | null, opts: { stored?: boolean } = {}): BadgeConfig {
  return {
    key,
    label: key ? LABEL_FOR[key] : "",
    priority: key ? PRIORITY_FOR[key] : 999,
    expiresAt: Date.now() + BADGE_TTL,
    shouldUpdateFirestore: !opts.stored,
  };
}

// 🆕 28s349 — coerce Firestore createdAt (Timestamp / Date / ISO string /
//   epoch ms / {seconds}) to epoch ms; 0 when absent/unparseable.
/**
 * 🆕 28x.161 — coerce whatever the admin dropdown / Firestore holds into a
 * real BadgeKey. Accepts the stored spellings we've used over time
 * ("TOP_RATED", "TOP RATED", "top rated") and returns null for "" / junk,
 * so an unknown value can never render as a mystery chip.
 */
export function normalizeBadgeKey(v: unknown): BadgeKey | null {
  if (typeof v !== "string") return null;
  const k = v.trim().toUpperCase().replace(/[\s-]+/g, "_");
  return k === "TOP_RATED" || k === "VIP" || k === "HOT" || k === "NEW" ? k : null;
}

function toMs(v: unknown): number {
  if (v == null) return 0;
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const t = Date.parse(v);
    return Number.isFinite(t) ? t : 0;
  }
  if (typeof v === "object") {
    const o = v as {
      toMillis?: () => number;
      getTime?: () => number;
      seconds?: number;
      _seconds?: number;
    };
    if (typeof o.toMillis === "function") return o.toMillis();
    if (typeof o.getTime === "function") return o.getTime();
    if (typeof o.seconds === "number") return o.seconds * 1000;
    if (typeof o._seconds === "number") return o._seconds * 1000;
  }
  return 0;
}

/**
 * 🆕 28x.100 — SunRed's business day: rolls at 06:00 BKK, not midnight,
 * so the 22:00–05:00 night counts as ONE day (a 01:30 job belongs to the
 * same night as the 23:00 job before it). Same formula as the Cloud
 * Function writer (functions/src/index.ts syncTherapistDailyCount):
 * epoch + (7h BKK − 6h boundary) = +1h, then the UTC date string.
 */
export function businessDayBKK(nowMs: number = Date.now()): string {
  return new Date(nowMs + 3600_000).toISOString().slice(0, 10);
}

/**
 * Precedence (28x.161) — first match wins:
 *
 *   1. MANUAL PIN — `badge` + `badgeSetAt`, written by the "Badge" dropdown
 *      on /admin/therapists/:id. Beats the auto badges, per the founder rule
 *      already codified for statusOverride at 28x.106b: "ถ้าไม่ใช่ auto ก็
 *      ทำงานตามคำสั่ง". Lives 48h from `badgeSetAt`.
 *   2. LIVE DAILY COUNT — 4+ jobs this business day → TOP_RATED · 3 → VIP ·
 *      2 → HOT (28x.100, founder's explicit thresholds).
 *   3. CARRIED AUTO BADGE — `badgeKey` + `badgeUpdatedAt`, stamped server-side
 *      by syncTherapistDailyCount when a threshold was crossed. This is what
 *      makes an earned badge survive the 06:00 business-day rollover for the
 *      full 48h instead of vanishing with the day counter.
 *   4. NEW by roster age — `createdAt` within 21 days.
 *
 * ⚠️ The manual pin lives in `badge`, the auto badge in `badgeKey`. They are
 *    deliberately DIFFERENT fields: syncTherapistDailyCount overwrites
 *    `badgeKey` on every booking write, so an admin pin stored there would be
 *    silently clobbered the next time she took a job.
 */
export function getBadgeForTherapist(t: {
  todayBookings?: number;
  /** 🆕 28x.100 — business-day stamp written next to the count; counts
   *  from any other day are ignored (auto-expiry, no midnight cron). */
  todayBookingsDate?: string | null;
  totalBookings?: number;
  /** 🆕 28s349 — Firestore createdAt (Timestamp/Date/string/number). Drives
   *  the NEW badge by roster age instead of booking count. */
  createdAt?: unknown;
  /** 🆕 28x.161 — the admin "Badge" dropdown's manual pin. */
  badge?: string | null;
  badgeSetAt?: number | null;
  /** auto badge stamped by syncTherapistDailyCount (NOT admin-set). */
  badgeKey?: string | null;
  badgeUpdatedAt?: number | null;
}): BadgeConfig {
  const now = Date.now();

  // 1) 🚨 28x.161 — MANUAL PIN. This branch is the actual fix for the founder's
  //    "ป้าย New ไม่ขึ้น" (2026-08-14). The admin page has shipped a "Badge"
  //    dropdown (None/VIP/HOT/NEW) since 28s284 writing `therapists.badge` —
  //    but NOTHING in the codebase ever read that field. The engine and the
  //    card both read `badgeKey`, so picking "NEW" in admin wrote a value with
  //    no reader and the chip never appeared. Same class as the 28x.160
  //    dispatchState bug: the displayed state was derived from a field nobody
  //    wrote (there, the reverse — a field nobody read).
  const pinned = normalizeBadgeKey(t.badge);
  if (pinned) {
    const setAt = t.badgeSetAt ?? null;
    // No stamp = a pin saved before 28x.161 existed. Honour it indefinitely
    // rather than hiding it — hiding is exactly the bug being fixed. The next
    // admin save stamps it and the normal 48h clock takes over from there.
    if (setAt == null) {
      const grandfathered = pack(pinned, { stored: true });
      delete grandfathered.expiresAt;
      return grandfathered;
    }
    if (now - setAt < BADGE_TTL) {
      return { ...pack(pinned, { stored: true }), expiresAt: setAt + BADGE_TTL };
    }
    // Expired pin falls through to the automatic badges below.
  }

  // 🆕 28x.100 — only trust a count that (a) carries a day stamp (the
  //   Cloud Function writer always stamps one; unstamped legacy values
  //   were never maintained) and (b) is stamped with TODAY's business
  //   day. Anything else reads as 0.
  const dayFresh = !!t.todayBookingsDate && t.todayBookingsDate === businessDayBKK();
  const today = dayFresh ? (t.todayBookings ?? 0) : 0;

  // 2) Live daily count (founder "เปลี่ยนอัตโนมัติตามยอดจองรายวัน 2 งานHOT
  //    VIP 3 TOP_RATED 4"). Absolute thresholds — several practitioners can
  //    hold TOP_RATED on a strong night.
  if (today >= 4) return pack("TOP_RATED");
  if (today >= 3) return pack("VIP");
  if (today >= 2) return pack("HOT");

  // 3) 🆕 28x.161 — carry an earned badge for 48h past the day it was earned.
  //    Before this, an auto badge died at the 06:00 rollover with the day
  //    counter: a practitioner who worked 4 jobs on a Friday night lost
  //    TOP_RATED at 6am Saturday. TOP_RATED is no longer excluded here — that
  //    exclusion dated from the old single-winner pickTopRatedTherapistId
  //    design, which 28x.100 replaced with absolute thresholds.
  const storedKey = normalizeBadgeKey(t.badgeKey);
  const storedAt = t.badgeUpdatedAt ?? null;
  if (storedKey && storedAt && now - storedAt < BADGE_TTL) {
    return {
      ...pack(storedKey, { stored: true }),
      expiresAt: storedAt + BADGE_TTL,
    };
  }

  // 4) NEW โดยอายุ roster (28s349) — เฉพาะคนที่เพิ่งเข้ามาจริงๆ.
  //    ⚠️ Only practitioners created through /admin/add-therapist carry a
  //    `createdAt`; anyone seeded/migrated before that page existed has none,
  //    so this branch can never fire for them. That's by design (a missing
  //    timestamp is not evidence of being new) — the manual pin in branch 1
  //    is how the founder flags those.
  const NEW_WINDOW_MS = 21 * DAY_MS;
  let newKey: BadgeKey | null = null;
  const createdMs = toMs(t.createdAt);
  if (createdMs > 0 && now - createdMs < NEW_WINDOW_MS) newKey = "NEW";

  return pack(newKey);
}

/**
 * 🆕 Round 28s153 — Picks the single TOP_RATED therapist of the day.
 *
 * Returns the id of the therapist with the highest `todayBookings`,
 * provided they have at least `minBookings` for the day. Ties broken
 * by `totalBookings` (lifetime) so a chronic top performer wins over
 * a one-off spike. Returns null if no one qualifies — keeps the badge
 * honest on quiet days.
 *
 * Caller (HomeTherapistGrid) overrides that therapist's badgeKey to
 * "TOP_RATED" after the per-therapist getBadgeForTherapist pass.
 */
export function pickTopRatedTherapistId(
  therapists: ReadonlyArray<{
    id: string;
    todayBookings?: number;
    totalBookings?: number;
  }>,
  minBookings = 1,
): string | null {
  let bestId: string | null = null;
  let bestToday = -1;
  let bestTotal = -1;
  for (const t of therapists) {
    const today = t.todayBookings ?? 0;
    const total = t.totalBookings ?? 0;
    if (today < minBookings) continue;
    if (today > bestToday || (today === bestToday && total > bestTotal)) {
      bestId = t.id;
      bestToday = today;
      bestTotal = total;
    }
  }
  return bestId;
}