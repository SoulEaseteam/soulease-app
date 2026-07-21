// functions/src/telegram-concierge-bot/greetings.ts
//
// 🆕 Round 28s123 — Greeting bot now acts as a multilingual ROUTER
//   instead of a forwarding relay. The previous design (R28s117)
//   forwarded customer messages into the admin Telegram group; the
//   simpler approach for View's "2 personal accounts" workflow is:
//
//     • Customer DMs bot
//     • Bot detects language (Telegram from.language_code)
//     • Bot replies with welcome + tap-button to the right concierge:
//         ZH      → @YuNiSpaBkk  (曼谷遇你SPA personal)
//         others  → @SunRedvip_bkk (main concierge personal)
//     • Customer taps → opens direct chat with View
//     • View replies natively in her personal Telegram account
//
//   This keeps View on her familiar 2-account flow but adds a 24/7
//   instant auto-greet that the personal accounts can't provide.

import { getBotCopyField } from "../botCopyStore";

export type Lang = "en" | "th" | "zh" | "ja" | "ko";

const SUPPORTED: Lang[] = ["en", "th", "zh", "ja", "ko"];

/** Telegram passes ISO 639-1 codes (e.g., "zh-hans"). Normalize to 2-char. */
export function normalizeLang(input: string | undefined): Lang {
  if (!input) return "en";
  const v = input.toLowerCase().slice(0, 2) as Lang;
  return SUPPORTED.includes(v) ? v : "en";
}

/** Where to route each language. ZH → 曼谷遇你SPA · others → main. */
export function conciergeHandleFor(lang: Lang): { handle: string; url: string } {
  if (lang === "zh") {
    return { handle: "@YuNiSpaBkk", url: "https://t.me/YuNiSpaBkk" };
  }
  return { handle: "@SunRedvip_bkk", url: "https://t.me/SunRedvip_bkk" };
}

// ─────────────────────────────────────────────────────────────
// Welcome messages — kept short. Lead with brand · then expectation
// (concierge replies in minutes) · close with tap-button route.
// The button is rendered separately via sendMessage's inlineKeyboard.
// ─────────────────────────────────────────────────────────────
const WELCOME: Record<Lang, string> = {
  en:
    `<b>Welcome to SunRed 🌙</b>\n` +
    `\n` +
    `Premium outcall massage in Bangkok · 24/7 concierge.\n` +
    `\n` +
    `For booking, pricing, or availability — tap the button below ` +
    `to chat with our concierge directly.\n` +
    `\n` +
    `sunred.vip`,
  th:
    `<b>ยินดีต้อนรับสู่ SunRed 🌙</b>\n` +
    `\n` +
    `บริการนวดถึงที่ระดับพรีเมียม กรุงเทพฯ · concierge 24/7\n` +
    `\n` +
    `จอง · ราคา · เวลาว่าง — แตะปุ่มด้านล่างเพื่อคุยกับ concierge ` +
    `โดยตรง\n` +
    `\n` +
    `sunred.vip`,
  zh:
    `<b>欢迎来到 SunRed 🌙</b>\n` +
    `\n` +
    `曼谷高端外送按摩 · 24/7 管家服务\n` +
    `\n` +
    `预约 · 价格 · 今夜可预约 — 点击下方按钮直接联系管家\n` +
    `\n` +
    `sunred.vip`,
  ja:
    `<b>SunRed へようこそ 🌙</b>\n` +
    `\n` +
    `バンコク プレミアム出張マッサージ · 24時間コンシェルジュ\n` +
    `\n` +
    `ご予約・料金・本日のご対応 — 下のボタンをタップして` +
    `コンシェルジュと直接お話しください\n` +
    `\n` +
    `sunred.vip`,
  ko:
    `<b>SunRed에 오신 것을 환영합니다 🌙</b>\n` +
    `\n` +
    `방콕 프리미엄 출장 마사지 · 24/7 컨시어지\n` +
    `\n` +
    `예약 · 가격 · 오늘 밤 가능 여부 — 아래 버튼을 눌러 컨시어지와 ` +
    `직접 채팅하세요\n` +
    `\n` +
    `sunred.vip`,
};

// 🆕 Round 28x.97 — Firestore override layer (botCopy/greeter.welcome.{lang}),
//   checked first so an admin edit takes effect immediately with no redeploy.
export async function welcomeFor(lang: Lang): Promise<string> {
  const override = await getBotCopyField("greeter", "welcome", lang);
  return override ?? WELCOME[lang] ?? WELCOME.en;
}

// ─────────────────────────────────────────────────────────────
// Button labels — what shows on the tap-to-route inline button.
// ─────────────────────────────────────────────────────────────
const BUTTON_LABELS: Record<Lang, string> = {
  en: "💬 Open concierge chat",
  th: "💬 เปิดแชท concierge",
  zh: "💬 联系管家 (中文)",
  ja: "💬 コンシェルジュとチャット",
  ko: "💬 컨시어지와 채팅",
};

export async function buttonLabelFor(lang: Lang): Promise<string> {
  const override = await getBotCopyField("greeter", "button", lang);
  return override ?? BUTTON_LABELS[lang] ?? BUTTON_LABELS.en;
}

// ─────────────────────────────────────────────────────────────
// Follow-up message when customer keeps typing instead of tapping
// the button — gentle nudge to use the concierge handle.
// ─────────────────────────────────────────────────────────────
const NUDGE: Record<Lang, string> = {
  en: "For a faster reply, please tap the button above to reach our concierge directly.",
  th: "เพื่อให้ตอบเร็วขึ้น · แตะปุ่มด้านบนเพื่อคุยกับ concierge ได้ตรงๆ",
  zh: "为了更快回复 · 请点击上方按钮直接联系管家",
  ja: "より早くお返事するため · 上のボタンをタップしてコンシェルジュと直接お話しください",
  ko: "더 빠른 답변을 위해 위의 버튼을 눌러 컨시어지와 직접 채팅해주세요",
};

export async function nudgeFor(lang: Lang): Promise<string> {
  const override = await getBotCopyField("greeter", "nudge", lang);
  return override ?? NUDGE[lang] ?? NUDGE.en;
}
