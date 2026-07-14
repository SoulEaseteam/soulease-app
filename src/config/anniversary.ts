// src/config/anniversary.ts
//
// 🆕 Round 28w.88 → 28w.95 — the 1st-Anniversary campaign, in one place.
// 🆕 Round 28w.96 (founder: "admin/promotions เพิ่มประวัติไปด้วยให้โปรนี้ใช้ได้จริง
//   แก้ไขและเปลี่ยนเองได้โดยไม่ต้องป้องคำสั่งซ้ำๆ") — every number below is now
//   ADMIN-EDITABLE. It used to be hardcoded, so each change to a spend floor or a
//   date meant asking me and shipping a build. Now /admin/promotions writes the
//   campaign into `adminSettings/publicRules.anniversary` and MaintenanceGate
//   pushes it in here at boot + on every live update — the same live-binding
//   pattern discount.ts and taxiFare.ts already use.
//
// The values written below stay as the DEFAULTS. With no admin doc present the
// app behaves exactly as it did before, so an empty/erroring config can never
// take the campaign down — it just falls back to the founder's current terms.

export type AnniversaryRewardId = "off100" | "off200" | "voucher300" | "points2x";

export interface AnniversaryReward {
  id: AnniversaryRewardId;
  /** English source label — semi-formal register, per founder. */
  label: string;
  /** Minimum booking spend in THB. null = no minimum (any ritual). */
  minSpendTHB: number | null;
  /** Short qualifier shown next to the minimum. */
  note: string;
  /**
   * 🆕 28w.94 — days the reward stays usable after it is collected.
   * NOT a single campaign-wide number: the founder gave the ฿300 voucher 60 days
   * while everything else keeps 30 ("คูปอง ฿300 · ขั้นต่ำ ฿2,000 แก้ อันนี้ ให้ 60วัน").
   */
  validityDays: number;
}

// ── Defaults (founder's current terms) ───────────────────────────────
const DEFAULT_NEW_REWARDS: AnniversaryReward[] = [
  { id: "off100", label: "THB 100 off your first booking", minSpendTHB: 1400, note: "Minimum spend THB 1,400", validityDays: 30 },
];

const DEFAULT_RETURNING_REWARDS: AnniversaryReward[] = [
  { id: "off200",     label: "THB 200 off your next booking", minSpendTHB: 1800, note: "Minimum spend THB 1,800", validityDays: 30 },
  { id: "voucher300", label: "THB 300 voucher",               minSpendTHB: 2000, note: "Minimum spend THB 2,000", validityDays: 60 },
  { id: "points2x",   label: "2× SunPoints",                  minSpendTHB: null, note: "Valid on any ritual",     validityDays: 30 },
];

const DEFAULT_EXCLUSIONS = ["Flash Sale", "Member Discount", "Other vouchers", "Referral rewards"];

/** 2569 BE = 2026 CE — founder: "ตั้งแต่ 15 กค - 15 สค 69". */
const DEFAULT_PERIOD = { startISO: "2026-07-15", endISO: "2026-08-15" };

/** ฿100 spent → 1 SunPoint · 1 SunPoint → ฿1 off. */
const DEFAULT_EARN_PER_THB = 100;
const DEFAULT_REDEEM_THB = 1;

/** Guests may claim exactly ONE reward. */
export const ANNIVERSARY_MAX_CLAIMS = 1;

// ── Live config (pushed in by MaintenanceGate) ───────────────────────

export interface AnniversaryConfig {
  /** Master switch. Off ⇒ the banner dialog still explains, nothing is collectable. */
  enabled: boolean;
  startISO: string;
  endISO: string;
  newRewards: AnniversaryReward[];
  returningRewards: AnniversaryReward[];
  exclusions: string[];
  /** Baht of spend that earns ONE SunPoint. */
  earnPerTHB: number;
  /** Baht a single SunPoint is worth when redeemed. */
  redeemTHB: number;
}

const DEFAULTS: AnniversaryConfig = {
  enabled: true,
  startISO: DEFAULT_PERIOD.startISO,
  endISO: DEFAULT_PERIOD.endISO,
  newRewards: DEFAULT_NEW_REWARDS,
  returningRewards: DEFAULT_RETURNING_REWARDS,
  exclusions: DEFAULT_EXCLUSIONS,
  earnPerTHB: DEFAULT_EARN_PER_THB,
  redeemTHB: DEFAULT_REDEEM_THB,
};

let live: AnniversaryConfig = DEFAULTS;

/** True when the value is a usable reward row (guards a half-typed admin edit). */
function cleanRewards(raw: unknown, fallback: AnniversaryReward[]): AnniversaryReward[] {
  if (!Array.isArray(raw)) return fallback;
  const out = raw
    .filter((r): r is AnniversaryReward =>
      Boolean(r) && typeof (r as AnniversaryReward).id === "string" &&
      typeof (r as AnniversaryReward).label === "string")
    .map((r) => ({
      id: r.id,
      label: r.label,
      minSpendTHB: typeof r.minSpendTHB === "number" && r.minSpendTHB > 0 ? r.minSpendTHB : null,
      note: typeof r.note === "string" ? r.note : "",
      validityDays: typeof r.validityDays === "number" && r.validityDays > 0 ? r.validityDays : 30,
    }));
  // An admin who deletes every row shouldn't silently leave guests a reward list
  // of length zero with a Collect button that can't do anything — fall back.
  return out.length ? out : fallback;
}

export function applyLiveAnniversaryConfig(raw: Partial<AnniversaryConfig> | null | undefined): void {
  if (!raw) { live = DEFAULTS; return; }
  live = {
    enabled: raw.enabled !== false,
    startISO: typeof raw.startISO === "string" && raw.startISO ? raw.startISO : DEFAULTS.startISO,
    endISO: typeof raw.endISO === "string" && raw.endISO ? raw.endISO : DEFAULTS.endISO,
    newRewards: cleanRewards(raw.newRewards, DEFAULTS.newRewards),
    returningRewards: cleanRewards(raw.returningRewards, DEFAULTS.returningRewards),
    exclusions: Array.isArray(raw.exclusions) && raw.exclusions.length
      ? raw.exclusions.filter((e): e is string => typeof e === "string" && Boolean(e.trim()))
      : DEFAULTS.exclusions,
    // Guard the two loyalty rates hard. A zero earn-rate would divide the whole
    // programme by zero; a mistyped redeem rate is the difference between a 1%
    // and a 100% giveaway.
    earnPerTHB: typeof raw.earnPerTHB === "number" && raw.earnPerTHB > 0 ? raw.earnPerTHB : DEFAULTS.earnPerTHB,
    redeemTHB: typeof raw.redeemTHB === "number" && raw.redeemTHB > 0 ? raw.redeemTHB : DEFAULTS.redeemTHB,
  };
}

/** The live campaign — what the admin has configured, or the defaults. */
export function anniversaryConfig(): AnniversaryConfig {
  return live;
}

// ── Derived (everything below reads the LIVE config) ─────────────────

export const NEW_GUEST_REWARDS = DEFAULT_NEW_REWARDS;
export const RETURNING_GUEST_REWARDS = DEFAULT_RETURNING_REWARDS;

/** Every reward in the campaign — used to resolve a claim back to its terms. */
export function allRewards(): AnniversaryReward[] {
  return [...live.newRewards, ...live.returningRewards];
}
export const ANNIVERSARY_REWARDS: AnniversaryReward[] = [
  ...DEFAULT_NEW_REWARDS,
  ...DEFAULT_RETURNING_REWARDS,
];

export function anniversaryExclusions(): string[] {
  return live.exclusions;
}

/** Baht of spend needed to earn ONE SunPoint. */
export function sunPointEarnPerTHB(): number { return live.earnPerTHB; }
/** Baht a single SunPoint is worth when redeemed. */
export function sunPointTHB(): number { return live.redeemTHB; }

// Back-compat constants (defaults). Prefer the functions above — they follow the
// admin's live settings; these do not.
export const SUNPOINT_EARN_PER_THB = DEFAULT_EARN_PER_THB;
export const SUNPOINT_THB = DEFAULT_REDEEM_THB;

/**
 * SunPoints earned on a booking. Partial units do not earn — at the default rate
 * ฿1,250 earns 12, the same as ฿1,200 — matching the founder's table exactly
 * (1,200→12 · 1,800→18 · 2,400→24 · 4,000→40).
 */
export function pointsFor(spendTHB: number, multiplier = 1): number {
  if (!Number.isFinite(spendTHB) || spendTHB <= 0) return 0;
  const per = live.earnPerTHB || DEFAULT_EARN_PER_THB;
  return Math.floor(spendTHB / per) * multiplier;
}

/** Baht value of a SunPoints balance. */
export function pointsValueTHB(points: number): number {
  if (!Number.isFinite(points) || points <= 0) return 0;
  return Math.round(points * (live.redeemTHB || DEFAULT_REDEEM_THB));
}

/**
 * 🆕 Round 28w.90 (founder: "สิทธิ์ทั้งหมดจะถูกโชว์ใน my-codes ของคนนั้นๆ ตามสิทธิ
 *   เก่า ใหม่") — which rewards a guest may collect depends on whether they have
 *   booked before.
 *
 * 28w.93: the two audiences get DIFFERENT offers, not one list filtered — a new
 * guest's ฿100/1,400 is not a subset of the returning ฿200/1,800.
 *
 * Returning-ness is measured from delivered bookings ON THEIR PHONE (28w.92), so
 * a regular whose reservations the concierge created still counts.
 */
export function rewardsFor(isReturning: boolean): AnniversaryReward[] {
  return isReturning ? live.returningRewards : live.newRewards;
}

/**
 * Formats the campaign window in the GUEST'S language — a Thai guest sees the
 * Buddhist-era year they expect (2569), a Japanese guest sees Japanese months.
 */
export function anniversaryPeriodLabel(locale: string): string | null {
  const { startISO, endISO } = live;
  if (!startISO || !endISO) return null;
  const tag = locale === "th" ? "th-TH" : locale === "en" ? "en-GB" : locale;
  const fmt = (iso: string) =>
    new Date(`${iso}T00:00:00`).toLocaleDateString(tag, {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  return `${fmt(startISO)} – ${fmt(endISO)}`;
}

/** True while the campaign is switched on AND inside its window. */
export function anniversaryIsLive(nowMs: number = Date.now()): boolean {
  if (!live.enabled) return false;
  const start = new Date(`${live.startISO}T00:00:00`).getTime();
  const end = new Date(`${live.endISO}T23:59:59`).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end)) return true;
  return nowMs >= start && nowMs <= end;
}
