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
 * ⚠️ Campaign dates are NOT set yet — the founder's brief still reads
 * "XX August – XX September 2026". Until she confirms them, the dialog hides
 * the period line rather than printing a placeholder date to guests. Fill both
 * fields (ISO yyyy-mm-dd) to switch the line on.
 */
export const ANNIVERSARY_PERIOD: { startISO: string; endISO: string } | null = null;

/** Formats the campaign window for display, or null while unset. */
export function anniversaryPeriodLabel(): string | null {
  if (!ANNIVERSARY_PERIOD) return null;
  const fmt = (iso: string) =>
    new Date(`${iso}T00:00:00`).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  return `${fmt(ANNIVERSARY_PERIOD.startISO)} – ${fmt(ANNIVERSARY_PERIOD.endISO)}`;
}
