// functions/src/telegram-concierge-bot/greetings.ts
//
// 🆕 Round 28s117 — Multi-language welcome messages for the customer
//   concierge bot. Triggered on /start and when a new customer first
//   DMs the bot.
//
// Language detection: prefers Telegram's `from.language_code` (ISO
// 639-1), falls back to "en" when unknown. Each greeting is brief and
// warm — purpose is to set expectation (concierge replies in minutes)
// + show that we cover the major service categories. The customer then
// just types their question.

export type Lang = "en" | "th" | "zh" | "ja" | "ko";

const SUPPORTED: Lang[] = ["en", "th", "zh", "ja", "ko"];

/** Telegram passes ISO 639-1 codes (e.g., "zh-hans"). Normalize to 2-char. */
export function normalizeLang(input: string | undefined): Lang {
  if (!input) return "en";
  const v = input.toLowerCase().slice(0, 2) as Lang;
  return SUPPORTED.includes(v) ? v : "en";
}

const WELCOME: Record<Lang, string> = {
  en:
    `Welcome to SunRed 🌙\n` +
    `\n` +
    `Concierge replies in minutes. You can ask about:\n` +
    `— Available practitioners tonight\n` +
    `— Services (Thai · Aromatherapy · Gentleman's · Therapeutic)\n` +
    `— Pricing · Areas we serve · Reservations\n` +
    `\n` +
    `Just send your question — we'll respond.`,
  th:
    `ยินดีต้อนรับสู่ SunRed 🌙\n` +
    `\n` +
    `Concierge ตอบภายในไม่กี่นาที สอบถามได้:\n` +
    `— นักบำบัดที่ว่างคืนนี้\n` +
    `— บริการ (Thai · Aroma · Gentleman's · Therapeutic)\n` +
    `— ราคา · พื้นที่ให้บริการ · จอง\n` +
    `\n` +
    `ส่งข้อความได้เลย`,
  zh:
    `欢迎来到 SunRed 🌙\n` +
    `\n` +
    `管家几分钟内回复。可以咨询:\n` +
    `— 今夜可预约的治疗师\n` +
    `— 服务选项(泰式 · 芳香 · Gentleman's · Therapeutic)\n` +
    `— 价格 · 服务区域 · 预约\n` +
    `\n` +
    `直接发消息即可。`,
  ja:
    `SunRed へようこそ 🌙\n` +
    `\n` +
    `コンシェルジュが数分以内にお返事します。\n` +
    `お気軽にお問合せください:\n` +
    `— 今夜のセラピスト\n` +
    `— サービス(タイ式・アロマ・Gentleman's・Therapeutic)\n` +
    `— 料金・対応エリア・ご予約\n` +
    `\n` +
    `メッセージをお送りください。`,
  ko:
    `SunRed에 오신 것을 환영합니다 🌙\n` +
    `\n` +
    `컨시어지가 몇 분 내로 답변드립니다.\n` +
    `문의 가능한 항목:\n` +
    `— 오늘 밤 예약 가능한 치료사\n` +
    `— 서비스(타이·아로마·Gentleman's·Therapeutic)\n` +
    `— 가격·서비스 지역·예약\n` +
    `\n` +
    `메시지를 보내주세요.`,
};

export function welcomeFor(lang: Lang): string {
  return WELCOME[lang] || WELCOME.en;
}

const AUTOREPLY_AFTER_FORWARD: Record<Lang, string> = {
  en: "Got it — concierge has been notified. We'll reply shortly.",
  th: "รับเรื่องแล้ว · concierge ได้รับการแจ้งแล้ว · ตอบกลับเร็วๆนี้",
  zh: "已收到 · 管家已收到通知 · 即将回复",
  ja: "承知しました · コンシェルジュに通知済み · 間もなくご返答いたします",
  ko: "확인했습니다 · 컨시어지에 전달되었습니다 · 곧 답변드리겠습니다",
};

export function autoReplyAfterForward(lang: Lang): string {
  return AUTOREPLY_AFTER_FORWARD[lang] || AUTOREPLY_AFTER_FORWARD.en;
}
