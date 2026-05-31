// src/utils/paymentSurcharge.ts
//
// 🆕 Round 28s77 (founder 2026-05-31) — Transfer surcharge for the
//   Chinese e-wallet rails (WeChat Pay / Alipay).
//
//   Founder: "we chat กะ alipay … มีค่าธรรมเนียม การโอน อิงตามเรท
//   และเพิ่มชาจอีก 200". When a guest pays via WeChat / Alipay we
//   incur an FX + processing cost on the CNY→THB settlement, so a
//   surcharge is added to the order total:
//
//       surcharge = round(total × 5%) + ฿200 flat
//
//   The 5% stands in for the exchange-rate / processor markup ("อิง
//   เรท"); the ฿200 is the fixed handling charge on top. Cash /
//   PromptPay / others have no surcharge.
//
//   Single source of truth — imported by both PaymentMethodsPage (for
//   the "+5% + ฿200" badge) and BookingFlowPage (to add it to the
//   Confirm Order total + the booking doc + the Telegram payload).

/** Percentage markup (whole number, e.g. 5 = 5%). */
export const SURCHARGE_PCT = 5;
/** Flat handling charge in THB, added on top of the percentage. */
export const SURCHARGE_FLAT = 200;
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
