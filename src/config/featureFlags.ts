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
export const PROMOS_ENABLED = false;
