// 🌐 Round 28x.231 — service CONTENT translation (founder: "แปลภาษาไม่แปล
// หน้าเหล่านี้ แก้ด้วย … แปลได้ทั้งเว็บ คือทั้งเว็บจริงๆ ทุกจุด").
//
// src/data/services.ts holds name/desc/detail/benefit in English only, so
// every surface that rendered them stayed English in all 6 locales. These
// helpers look up per-SKU keys (svcData.<id>.<field>, authored in every
// src/locales/*/translation.json) and FALL BACK to the value passed in —
// which is the live catalog value, so an admin rename (28s300 overrides)
// still shows for locales that lack a key, and unknown ids degrade to
// their English source instead of a raw key.
//
// ⚠️ Scope rule: DISPLAY surfaces only. Booking payloads, Telegram
// messages, and analytics keep the canonical English `service.name` so
// the concierge always recognises what was ordered — don't "fix" those
// call sites with these helpers.
import type { TFunction } from "i18next";

export const svcName = (t: TFunction, id: string, fallback: string): string =>
  t(`svcData.${id}.name`, fallback);

export const svcDesc = (t: TFunction, id: string, fallback: string): string =>
  t(`svcData.${id}.desc`, fallback);

export const svcDetail = (t: TFunction, id: string, fallback: string): string =>
  t(`svcData.${id}.detail`, fallback);

/** Benefit lines are keyed b1..bN; any line without a key falls back. */
export const svcBenefits = (
  t: TFunction,
  id: string,
  fallback: string[]
): string[] =>
  fallback.map((line, i) => t(`svcData.${id}.b${i + 1}`, line));
