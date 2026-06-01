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

export function getBadgeForTherapist(t: {
  todayBookings?: number;
  totalBookings?: number;
  badgeKey?: string | null;
  badgeUpdatedAt?: number | null;
}): BadgeConfig {
  const today = t.todayBookings ?? 0;
  const total = t.totalBookings ?? 0;

  const storedKey = (t.badgeKey ?? null) as BadgeKey | null;
  const storedAt = t.badgeUpdatedAt ?? null;
  const now = Date.now();

  // 1) ถ้ามี badge เดิม + ยังไม่หมดอายุ → ใช้อันเดิม
  //    (TOP_RATED ไม่ cache เพราะถูก override นอกฟังก์ชันรายวัน)
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

  // 2) คำนวณ badge ใหม่ (สำหรับเงื่อนไข lifetime/threshold)
  //    TOP_RATED ไม่ตัดสินใจที่นี่ — assignTopRated() จัดการ
  //    เพราะต้องเทียบทั้ง roster.
  let newKey: BadgeKey | null = null;
  if (today >= 5) newKey = "VIP";
  else if (today >= 3) newKey = "HOT";
  else if (total < 50) newKey = "NEW";

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