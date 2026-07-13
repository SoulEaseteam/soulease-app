// src/utils/paymentSurcharge.ts
//
// 🆕 Round 28s77 (founder 2026-05-31) — Transfer surcharge for the
//   Chinese e-wallet rails (WeChat Pay / Alipay).
//
// 🆕 Round 28r121 (founder 2026-07-13) — simplified to a flat 7%
//   after margin analysis showed the CNY→THB settlement spread +
//   processor fee + delay risk fit comfortably inside a 7% net
//   (yields ~5.5% real margin after FX).  Removed the ฿200 flat
//   handling charge — the % component alone scales cleanly across
//   all price points and reads cleaner to guests than "5% + ฿200".
//
//       surcharge = round(total × 7%)
//
//   Cash / PromptPay / others have no surcharge.
//
//   Single source of truth — imported by both PaymentMethodsPage (for
//   the "+7%" badge) and BookingFlowPage (to add it to the Confirm
//   Order total + the booking doc + the Telegram payload).

/** Percentage markup (whole number, e.g. 7 = 7%). */
export const SURCHARGE_PCT = 7;
/** 🆕 28r121 — kept exported at 0 for backward compatibility with any
 *  legacy call site expecting the constant; the flat charge is retired. */
export const SURCHARGE_FLAT = 0;
/** Payment-method ids that carry the transfer surcharge. */
export const SURCHARGE_METHOD_IDS = ["wechat", "alipay"] as const;

export function hasPaymentSurcharge(
  methodId: string | null | undefined
): boolean {
  return (
    !!methodId &&
    (SURCHARGE_METHOD_IDS as readonly string[]).includes(methodId)
  );
}

/**
 * Surcharge in THB for the given method + pre-surcharge total.
 * Returns 0 for non-surcharged methods or a non-positive base.
 */
export function paymentSurcharge(
  methodId: string | null | undefined,
  baseTotal: number
): number {
  if (!hasPaymentSurcharge(methodId)) return 0;
  if (!Number.isFinite(baseTotal) || baseTotal <= 0) return 0;
  return Math.round(baseTotal * (SURCHARGE_PCT / 100)) + SURCHARGE_FLAT;
}
