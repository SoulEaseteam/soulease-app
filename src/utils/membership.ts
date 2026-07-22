// src/utils/membership.ts
//
// 🆕 Round 28w.59 (founder 2026-07-14 "ทำเมนู Membership + ติดป้ายในออเดอ") —
//   SINGLE SOURCE OF TRUTH for customer membership tiers, shared by the
//   Membership admin page (threshold editor) and the Bookings page (order
//   badges). Kept in one file so the two surfaces can never disagree — same
//   pattern as commission.ts.
//
//   Founder rules (answered in-session):
//   • Tier is earned by BOTH visits AND spend — a customer gets the HIGHEST
//     tier they qualify for by EITHER metric ("1กับ2").
//   • DEMOTE one tier if the customer hasn't visited in > N days
//     ("ลดขั้นหากมากกว่า 3 เดือน" → default 90 days). Floored at Bronze.
//   • "With no-shows" is a SEPARATE, stacking flag — any no-show in history
//     shows the badge regardless of tier ("มีได้ทุกป้ายหากผิดเงื่อนไข").
//
//   Thresholds are code DEFAULTS; the Membership page overrides them live via
//   adminSettings/membership (loaded by applyMembershipConfig).

export type MembershipTier = "Bronze" | "Silver" | "Gold" | "BlackVIP";

/** Ascending rank order — index = rank strength (Bronze weakest). */
export const MEMBERSHIP_TIERS: MembershipTier[] = ["Bronze", "Silver", "Gold", "BlackVIP"];

export const MEMBERSHIP_COLORS: Record<MembershipTier, string> = {
  Bronze:   "#A97142", // warm bronze
  Silver:   "#8A8F98", // cool grey
  Gold:     "#C9A227", // gold
  BlackVIP: "#1F2530", // near-black
};

export const MEMBERSHIP_LABELS_TH: Record<MembershipTier, string> = {
  Bronze:   "บรอนซ์",
  Silver:   "ซิลเวอร์",
  Gold:     "โกลด์",
  BlackVIP: "แบล็ค VIP",
};

export interface MembershipThresholds {
  /** minimum served (completed/done) visits to REACH each tier */
  minVisits: Record<MembershipTier, number>;
  /** minimum total spend (฿, realized) to REACH each tier */
  minSpend: Record<MembershipTier, number>;
  /** inactivity in days that drops the customer one tier (0 = never demote) */
  demoteAfterDays: number;
}

export const MEMBERSHIP_DEFAULTS: MembershipThresholds = {
  minVisits: { Bronze: 1,    Silver: 3,    Gold: 6,     BlackVIP: 12 },
  minSpend:  { Bronze: 1000, Silver: 6000, Gold: 15000, BlackVIP: 40000 },
  demoteAfterDays: 90,
};

// Live admin override (from adminSettings/membership), merged over defaults.
let cfg: MembershipThresholds = MEMBERSHIP_DEFAULTS;

/** Apply the admin-edited thresholds. Pass null/undefined to reset to defaults. */
export function applyMembershipConfig(next: Partial<MembershipThresholds> | null | undefined): void {
  if (!next) { cfg = MEMBERSHIP_DEFAULTS; return; }
  cfg = {
    minVisits: { ...MEMBERSHIP_DEFAULTS.minVisits, ...(next.minVisits ?? {}) },
    minSpend:  { ...MEMBERSHIP_DEFAULTS.minSpend,  ...(next.minSpend ?? {}) },
    demoteAfterDays: typeof next.demoteAfterDays === "number" ? next.demoteAfterDays : MEMBERSHIP_DEFAULTS.demoteAfterDays,
  };
}

/** The effective thresholds (defaults + admin overrides), for the editor. */
export function effectiveMembershipConfig(): MembershipThresholds {
  return {
    minVisits: { ...cfg.minVisits },
    minSpend:  { ...cfg.minSpend },
    demoteAfterDays: cfg.demoteAfterDays,
  };
}

/** Highest tier index a single metric value qualifies for, or -1 if none. */
function tierIndexByMetric(value: number, mins: Record<MembershipTier, number>): number {
  let idx = -1;
  for (let i = 0; i < MEMBERSHIP_TIERS.length; i++) {
    if (value >= mins[MEMBERSHIP_TIERS[i]]) idx = i;
  }
  return idx;
}

// ── Member code (SRD-…) ────────────────────────────────────────────────
// 🆕 28w.60 (founder) — an enrolled member gets a code that starts with "SRD-"
//   and embeds their tier letter, so it can be re-issued ("upgraded") when they
//   reach Gold/BlackVIP, or reset if they forget it.
export const MEMBER_TIER_LETTER: Record<MembershipTier, string> = {
  Bronze: "B", Silver: "S", Gold: "G", BlackVIP: "V",
};
// No ambiguous chars (0/O, 1/I) so codes read cleanly over the phone.
const MEMBER_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** Generate a member code: `SRD-<tierLetter><5 random chars>`, e.g. SRD-G7K2F9.
 *  `rand` is injectable for tests; defaults to Math.random (app runtime only). */
export function generateMemberCode(tier: MembershipTier, rand: () => number = Math.random): string {
  let body = "";
  for (let i = 0; i < 5; i++) body += MEMBER_CODE_CHARS[Math.floor(rand() * MEMBER_CODE_CHARS.length)];
  return `SRD-${MEMBER_TIER_LETTER[tier]}${body}`;
}

/** Rank helper — higher index = stronger tier; -1 for null/unknown. */
export function tierRank(tier: MembershipTier | null | undefined): number {
  return tier ? MEMBERSHIP_TIERS.indexOf(tier) : -1;
}

export interface MembershipResult {
  tier: MembershipTier | null; // null = below Bronze (not a member yet)
  demoted: boolean;            // inactivity knocked them down a tier
  hasNoShow: boolean;          // stacking flag — any no-show in history
}

/**
 * Resolve a customer's membership from their aggregate stats.
 * tier = max(visit-tier, spend-tier); then −1 if inactive past demoteAfterDays.
 */
export function membershipFor(
  c: { served?: number; totalSpent?: number; lastVisitMs?: number | null; noShowCount?: number },
  nowMs: number,
  conf: MembershipThresholds = cfg,
): MembershipResult {
  const served = c.served ?? 0;
  const spent = c.totalSpent ?? 0;
  const hasNoShow = (c.noShowCount ?? 0) > 0;

  let idx = Math.max(
    tierIndexByMetric(served, conf.minVisits),
    tierIndexByMetric(spent, conf.minSpend),
  );

  let demoted = false;
  if (idx > 0 && c.lastVisitMs && conf.demoteAfterDays > 0) {
    const days = (nowMs - c.lastVisitMs) / 86_400_000;
    if (days > conf.demoteAfterDays) { idx -= 1; demoted = true; } // floored at Bronze (idx>0 guard)
  }

  return { tier: idx >= 0 ? MEMBERSHIP_TIERS[idx] : null, demoted, hasNoShow };
}

/**
 * 🆕 28x.99u (audit "Audit หน้าเว็บ แอดมินปัจจุบัน แบบเจาะลึก") — the ONE
 * correct way to turn a booking doc into membership-eligible spend. Round
 * 28x.38 (founder: "ยอดสะสมคือยอดตามเมนู ไม่รวมค่าเทกซี่") decided tier +
 * SunPoints accrue on the MENU amount only, excluding taxi and the
 * WeChat/Alipay surcharge — but that formula was only ever written inline in
 * AdminMembersPage.tsx. Three other surfaces (AdminBookingListPage's booking
 * badges, AdminMembershipPage's live threshold preview, AdminUsersPage's
 * suggested-tier column) each re-typed `b.totalPrice ?? b.servicePrice ?? 0`
 * instead — which INCLUDES taxi/surcharge, so a guest with a lot of taxi
 * spend could show a higher tier on those three pages than what
 * AdminMembersPage (the real roster) actually enrolls them at. Every call
 * site should use this function instead of re-deriving spend inline.
 */
export function menuSpendForBooking(b: {
  servicePrice?: number;
  totalPrice?: number;
  taxiFee?: number;
  paymentFee?: number;
}): number {
  return typeof b.servicePrice === "number"
    ? b.servicePrice
    : Math.max(0, (b.totalPrice ?? 0) - (b.taxiFee ?? 0) - (b.paymentFee ?? 0));
}

/**
 * 🆕 28x.99u (audit) — mirrors firestore.rules' isReservedName()/
 * isReservedPhone() (contactName/customerName containing "sunred", or phone
 * containing admin's own "634350987"). Those rules already treat this as
 * "not a real customer identity" on WRITE; nothing mirrored that on READ.
 * Root cause: when a guest's real phone isn't bookable (foreign number,
 * contact via Telegram/WhatsApp only), admin has long typed her own phone
 * as a placeholder and put the guest's real contact in the booking note —
 * a real, ~1-year-old operational pattern, not test data (126 real bookings
 * found in an audit, Aug 2025–Jul 2026, real revenue). Every guest-stats
 * aggregation (Customer Insights, Members roster, Membership preview,
 * booking-card tier badge) must skip these or the shop's own placeholder
 * identity shows up as a fake top-spending "VIP customer".
 */
export function isReservedShopBooking(b: {
  contactName?: string | null;
  customerName?: string | null;
  phone?: string | null;
}): boolean {
  const name = (b.contactName ?? b.customerName ?? "").toLowerCase();
  const phone = b.phone ?? "";
  return name.includes("sunred") || phone.includes("634350987");
}
