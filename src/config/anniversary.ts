// src/config/anniversary.ts
//
// 🆕 Round 28w.88 (founder: "กดบัตรนี้ แล้วขึ้นป๊อปอับ แสดงรายละเอียด และ ปุ่มรับสิท
//   และปุ่มสมัครสามชิก") — the 1st-Anniversary campaign, in one place.
//
// The rewards, the spend floors and the exclusions are DATA, not markup, so the
// dialog, the claim record written to Firestore, and anything the concierge
// reads back all describe the same offer. Change a floor here and every surface
// moves together.

export type AnniversaryRewardId = "off200" | "voucher300" | "points2x";

export interface AnniversaryReward {
  id: AnniversaryRewardId;
  /** English source label — semi-formal register, per founder. */
  label: string;
  /** Minimum booking spend in THB. null = no minimum (any ritual). */
  minSpendTHB: number | null;
  /** Short qualifier shown next to the minimum. */
  note: string;
}

export const ANNIVERSARY_REWARDS: AnniversaryReward[] = [
  { id: "off200",     label: "THB 200 off your next booking", minSpendTHB: 1400, note: "Minimum spend THB 1,400" },
  { id: "voucher300", label: "THB 300 voucher",               minSpendTHB: 2500, note: "Minimum spend THB 2,500" },
  { id: "points2x",   label: "2× reward points",              minSpendTHB: null, note: "Valid on any ritual" },
];

/** Guests may claim exactly ONE of the three. */
export const ANNIVERSARY_MAX_CLAIMS = 1;

export const ANNIVERSARY_EXCLUSIONS: string[] = [
  "Flash Sale",
  "Member Discount",
  "Other vouchers",
  "Referral rewards",
];

/**
 * 🆕 Round 28w.90 — founder set the window: "ตั้งแต่ 15 กค - 15 สค 69".
 * 2569 BE = 2026 CE.
 */
export const ANNIVERSARY_PERIOD: { startISO: string; endISO: string } | null = {
  startISO: "2026-07-15",
  endISO: "2026-08-15",
};

/**
 * 🆕 Round 28w.90 (founder: "สิทธิ์ทั้งหมดจะถูกโชว์ใน my-codes ของคนนั้นๆ ตามสิทธิ
 *   เก่า ใหม่ และให้ไปเก็บโค้ดกันเอง ในนั้น") — which rewards a guest may collect
 *   depends on whether they have booked before.
 *
 *   • New guest       → the welcome offer only (THB 200 off the first booking).
 *   • Returning guest → all three, of which they may collect ONE
 *     (ANNIVERSARY_MAX_CLAIMS). That matches the founder's original brief:
 *     "รับสิทธิ์เลือกอย่างใดอย่างหนึ่ง".
 *
 * Returning-ness is measured from delivered bookings, not from having an
 * account — someone who signed up and never booked is still a new guest.
 */
export function rewardsFor(isReturning: boolean): AnniversaryReward[] {
  if (isReturning) return ANNIVERSARY_REWARDS;
  return ANNIVERSARY_REWARDS.filter((r) => r.id === "off200");
}

/**
 * Formats the campaign window in the GUEST'S language — a Thai guest sees the
 * Buddhist-era year they expect (2569), a Japanese guest sees Japanese months.
 * Hardcoding "15 ก.ค. – 15 ส.ค. 69" would have been Thai-only on a site that
 * auto-translates. Returns null while the window is unset.
 */
export function anniversaryPeriodLabel(locale: string): string | null {
  if (!ANNIVERSARY_PERIOD) return null;
  // th-TH's default calendar IS Buddhist, so 2026 renders as 2569 for Thai
  // guests without us doing the arithmetic ourselves.
  const tag = locale === "th" ? "th-TH" : locale === "en" ? "en-GB" : locale;
  const fmt = (iso: string) =>
    new Date(`${iso}T00:00:00`).toLocaleDateString(tag, {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  return `${fmt(ANNIVERSARY_PERIOD.startISO)} – ${fmt(ANNIVERSARY_PERIOD.endISO)}`;
}

/** True while the campaign window is open (or always, if no window is set). */
export function anniversaryIsLive(nowMs: number = Date.now()): boolean {
  if (!ANNIVERSARY_PERIOD) return true;
  const start = new Date(`${ANNIVERSARY_PERIOD.startISO}T00:00:00`).getTime();
  const end = new Date(`${ANNIVERSARY_PERIOD.endISO}T23:59:59`).getTime();
  return nowMs >= start && nowMs <= end;
}
