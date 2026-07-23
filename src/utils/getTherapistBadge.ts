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

const BADGE_TTL = 24 * 60 * 60 * 1000; // 24 ชั่วโมง

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

export function getBadgeForTherapist(t: {
  todayBookings?: number;
  /** 🆕 28x.100 — business-day stamp written next to the count; counts
   *  from any other day are ignored (auto-expiry, no midnight cron). */
  todayBookingsDate?: string | null;
  totalBookings?: number;
  /** 🆕 28s349 — Firestore createdAt (Timestamp/Date/string/number). Drives
   *  the NEW badge by roster age instead of booking count. */
  createdAt?: unknown;
  badgeKey?: string | null;
  badgeUpdatedAt?: number | null;
}): BadgeConfig {
  // 🆕 28x.100 — only trust a count that (a) carries a day stamp (the
  //   Cloud Function writer always stamps one; unstamped legacy values
  //   were never maintained) and (b) is stamped with TODAY's business
  //   day. Anything else reads as 0.
  const dayFresh = !!t.todayBookingsDate && t.todayBookingsDate === businessDayBKK();
  const today = dayFresh ? (t.todayBookings ?? 0) : 0;

  const storedKey = (t.badgeKey ?? null) as BadgeKey | null;
  const storedAt = t.badgeUpdatedAt ?? null;
  const now = Date.now();

  // 1) 🆕 28x.100 (founder "เปลี่ยนอัตโนมัติตามยอดจองรายวัน 2 งานHOT
  //    VIP 3 TOP_RATED 4") — live daily-count badge wins over everything:
  //      4+ jobs today → TOP_RATED · 3 → VIP · 2 → HOT
  //    Absolute thresholds per the founder's spec — several practitioners
  //    can hold TOP_RATED on a strong night (this replaces the old
  //    single-winner pickTopRatedTherapistId comparison, and the old
  //    5→VIP/3→HOT ladder).
  if (today >= 4) return pack("TOP_RATED");
  if (today >= 3) return pack("VIP");
  if (today >= 2) return pack("HOT");

  // 2) ถ้ามี badge เดิม (แอดมินตั้งมือ) + ยังไม่หมดอายุ → ใช้อันเดิม
  if (
    storedKey &&
    storedKey !== "TOP_RATED" &&
    storedAt &&
    now - storedAt < BADGE_TTL
  ) {
    return {
      ...pack(storedKey, { stored: true }),
      expiresAt: storedAt + BADGE_TTL,
    };
  }

  // 3) NEW โดยอายุ roster (28s349) — คงเดิม: เฉพาะคนที่เพิ่งเข้ามาจริงๆ
  const NEW_WINDOW_MS = 21 * BADGE_TTL; // 21 days (BADGE_TTL = 1 day in ms)
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