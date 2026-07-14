// src/config/anniversary.ts
//
// 🆕 Round 28w.88 (founder: "กดบัตรนี้ แล้วขึ้นป๊อปอับ แสดงรายละเอียด และ ปุ่มรับสิท
//   และปุ่มสมัครสามชิก") — the 1st-Anniversary campaign, in one place.
//
// The rewards, the spend floors and the exclusions are DATA, not markup, so the
// dialog, the claim record written to Firestore, and anything the concierge
// reads back all describe the same offer. Change a floor here and every surface
// moves together.

export type AnniversaryRewardId = "off100" | "off200" | "voucher300" | "points2x";

export interface AnniversaryReward {
  id: AnniversaryRewardId;
  /** English source label — semi-formal register, per founder. */
  label: string;
  /** Minimum booking spend in THB. null = no minimum (any ritual). */
  minSpendTHB: number | null;
  /** Short qualifier shown next to the minimum. */
  note: string;
}

// 🆕 Round 28w.93 — founder revised the whole reward table. New and returning
//   guests now get DIFFERENT offers, not the same list filtered down:
//
//     New       · THB 100 off first booking   · min 1,400
//     Returning · THB 200 off                 · min 1,800
//                 THB 300 voucher             · min 2,000
//                 2× SunPoints                · any ritual
//
//   Both audiences: one reward, valid 30 days.
export const NEW_GUEST_REWARDS: AnniversaryReward[] = [
  { id: "off100", label: "THB 100 off your first booking", minSpendTHB: 1400, note: "Minimum spend THB 1,400" },
];

export const RETURNING_GUEST_REWARDS: AnniversaryReward[] = [
  { id: "off200",     label: "THB 200 off your next booking", minSpendTHB: 1800, note: "Minimum spend THB 1,800" },
  { id: "voucher300", label: "THB 300 voucher",               minSpendTHB: 2000, note: "Minimum spend THB 2,000" },
  { id: "points2x",   label: "2× SunPoints",                  minSpendTHB: null, note: "Valid on any ritual · 1 SunPoint = ฿1" },
];

/** Every reward in the campaign — used to resolve a claim back to its terms. */
export const ANNIVERSARY_REWARDS: AnniversaryReward[] = [
  ...NEW_GUEST_REWARDS,
  ...RETURNING_GUEST_REWARDS,
];

/** Guests may claim exactly ONE reward. */
export const ANNIVERSARY_MAX_CLAIMS = 1;

/** 1 SunPoint = ฿1 off. 150 points → ฿150 off. */
export const SUNPOINT_THB = 1;

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
 *   • New guest       → the welcome offer (THB 100 off the first booking).
 *   • Returning guest → the three loyalty rewards, of which they collect ONE
 *     (ANNIVERSARY_MAX_CLAIMS) — "รับสิทธิ์เลือกอย่างใดอย่างหนึ่ง".
 *
 * 28w.93: the two audiences now get DIFFERENT offers, not one list filtered — a
 * new guest's ฿100/1,400 is not a subset of the returning ฿200/1,800.
 *
 * Returning-ness is measured from delivered bookings ON THEIR PHONE (28w.92), so
 * a regular whose reservations the concierge created still counts; someone who
 * merely signed up and never booked is still a new guest.
 */
export function rewardsFor(isReturning: boolean): AnniversaryReward[] {
  return isReturning ? RETURNING_GUEST_REWARDS : NEW_GUEST_REWARDS;
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
