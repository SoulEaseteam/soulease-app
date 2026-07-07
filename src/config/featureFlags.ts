// src/config/featureFlags.ts
//
// 🆕 Round 28s84 (founder 2026-05-31: "โปรโมชั่น ยังไม่ต้องโชว์ … ยังไม่
//   ได้คิด โปร กัน เสี่ยง") — single source of truth for whether ANY
//   promotional surface is shown.
//
//   While OFF (false):
//     • Home hero rotating promo banner (WELCOME OFFER / FIRST10 …) hidden
//     • Confirm Order discount-code field hidden + no code can apply a
//       discount (forced ฿0)
//
//   Flip to `true` to bring all promo UI + discount-code logic back once
//   promos are actually designed. Keeping it in one place means we never
//   accidentally re-expose a promo on one surface but not another.
// 🆕 Round 28s298 (founder: "เพิ่ม เมนู โปรโมชั่น") — the new admin
// Promotions page needs a REAL master switch, or every other control on
// that page (enable/disable a code, create a new one) would do nothing
// visible on the live site while this stays hardcoded false. Switched
// to `export let` + `applyLivePromosEnabled()`, set once at boot and on
// every live update by MaintenanceGate.tsx's `publicRules` listener —
// same live-binding pattern as taxiFare.ts's pricing overrides. Default
// stays `false`, UNCHANGED from the founder's original decision, until
// she explicitly flips the switch on /admin/promotions.
export let PROMOS_ENABLED = false;

export function applyLivePromosEnabled(enabled: boolean): void {
  PROMOS_ENABLED = enabled;
}
