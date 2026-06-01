// functions/src/telegram-post-bot/templates.ts
//
// 🆕 Round 28s116 — Multi-language post text builders (EN/TH/ZH/JA/KO).
//
// Renderers ONLY — no I/O, no state. Each function takes a `lang`
// argument and falls back to EN when the requested locale is missing.
// Source of truth for editorial copy: docs/telegram-templates.md (5
// language variants per category). Ported here so the bot can serve
// WeChat OA / LINE OA traffic in the visitor's native language.
//
// Mode: HTML — see client.ts parse_mode. Use <b>/<i>/<a>. Escape any
// stray angle brackets in user data with `esc()`.

import type { TherapistRecord, Lang } from "./rotation";
import { bioFor } from "./rotation";

// 🆕 Round 28s120 — Per-language reserve target. CN customers seeing
//   posts in @manguyujianniSPA (曼谷遇你SPA) should DM the dedicated
//   Chinese-speaking account @YuNiSpaBkk, not the main @SunRedvip_bkk.
//   Brand consistency · plus View's separate Chinese account lives on
//   a separate device/login so messages don't drown out the main inbox.
const RESERVE_HANDLES: Record<Lang, string> = {
  en: "@SunRedvip_bkk",
  th: "@SunRedvip_bkk",
  ja: "@SunRedvip_bkk",
  ko: "@SunRedvip_bkk",
  zh: "@YuNiSpaBkk",
};
const RESERVE_URLS: Record<Lang, string> = {
  en: "https://t.me/SunRedvip_bkk",
  th: "https://t.me/SunRedvip_bkk",
  ja: "https://t.me/SunRedvip_bkk",
  ko: "https://t.me/SunRedvip_bkk",
  zh: "https://t.me/YuNiSpaBkk",
};
const WEBSITE = "sunred.vip";

/** Escape arbitrary text before inserting into HTML body. */
function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** "Reserve via DM" link, localized. Falls back to EN. */
function reserveLine(lang: Lang): string {
  const labels: Record<Lang, string> = {
    en: "Reserve via DM",
    th: "DM ติดต่อ",
    zh: "预约请私信",
    ja: "DMにてご予約",
    ko: "DM으로 예약",
  };
  const handle = RESERVE_HANDLES[lang] || RESERVE_HANDLES.en;
  const url = RESERVE_URLS[lang] || RESERVE_URLS.en;
  return `${labels[lang] || labels.en} → <a href="${url}">${handle}</a>`;
}

// ─────────────────────────────────────────────────────────────
// 1. Practitioner Spotlight — Monday weekly rotation.
// ─────────────────────────────────────────────────────────────

const SPOTLIGHT_HEADERS: Record<Lang, string> = {
  en: "PRACTITIONER SPOTLIGHT · this week",
  th: "นักบำบัดประจำสัปดาห์",
  zh: "本周推荐治疗师",
  ja: "今週のセラピスト",
  ko: "이번 주 추천 치료사",
};

export function renderSpotlight(t: TherapistRecord, lang: Lang = "en"): string {
  const header = SPOTLIGHT_HEADERS[lang] || SPOTLIGHT_HEADERS.en;
  return (
    `<b>${header}</b>\n` +
    `\n` +
    `<b>${esc(t.name)}</b>\n` +
    `${esc(t.area)}\n` +
    `\n` +
    `${esc(bioFor(t, lang))}\n` +
    `\n` +
    `${reserveLine(lang)}`
  );
}

// ─────────────────────────────────────────────────────────────
// 2. Tonight Special — single therapist (manual).
// ─────────────────────────────────────────────────────────────

const TONIGHT_HEADERS: Record<Lang, string> = {
  en: "TONIGHT · 22:00–04:00 BKK",
  th: "คืนนี้ · 22:00–04:00 BKK",
  zh: "今夜 · 22:00–04:00 曼谷",
  ja: "今夜 · 22:00–04:00 バンコク",
  ko: "오늘 밤 · 22:00–04:00 방콕",
};

const TONIGHT_BODY_TEMPLATES: Record<Lang, (name: string, area: string) => string> = {
  en: (n, a) => `${n} available for outcall in ${a}.`,
  th: (n, a) => `${n} เข้าทำงาน · ย่าน ${a}`,
  zh: (n, a) => `${n} 今晚可预约 · ${a} 区域`,
  ja: (n, a) => `${n} 本日対応可能 · ${a} エリア`,
  ko: (n, a) => `${n} 오늘 밤 예약 가능 · ${a} 지역`,
};

export function renderTonightSpecial(t: TherapistRecord, lang: Lang = "en"): string {
  const header = TONIGHT_HEADERS[lang] || TONIGHT_HEADERS.en;
  const body = (TONIGHT_BODY_TEMPLATES[lang] || TONIGHT_BODY_TEMPLATES.en)(
    esc(t.name),
    esc(t.area),
  );
  return (
    `<b>${header}</b> 🌙\n` +
    `\n` +
    `${body}\n` +
    `\n` +
    `${esc(bioFor(t, lang))}\n` +
    `\n` +
    `${reserveLine(lang)}`
  );
}

// ─────────────────────────────────────────────────────────────
// 3. Tonight Lineup — multiple therapists (manual).
// ─────────────────────────────────────────────────────────────

const LINEUP_HEADERS: Record<Lang, string> = {
  en: "TONIGHT'S LINEUP · 22:00–04:00",
  th: "คืนนี้ · 22:00–04:00",
  zh: "今夜阵容 · 22:00–04:00",
  ja: "今夜のラインナップ · 22:00–04:00",
  ko: "오늘 밤 라인업 · 22:00–04:00",
};

const LINEUP_INTRO: Record<Lang, (n: number) => string> = {
  en: (n) => `${n} practitioners ready for outcall:`,
  th: (n) => `นักบำบัด ${n} ท่านพร้อมเข้าทำงาน:`,
  zh: (n) => `${n} 位治疗师今晚可预约:`,
  ja: (n) => `${n}名のセラピストが対応可能:`,
  ko: (n) => `${n}명의 치료사 예약 가능:`,
};

export function renderTonightLineup(ts: TherapistRecord[], lang: Lang = "en"): string {
  const header = LINEUP_HEADERS[lang] || LINEUP_HEADERS.en;
  const intro = (LINEUP_INTRO[lang] || LINEUP_INTRO.en)(ts.length);
  const lines = ts
    .slice(0, 4)
    .map((t) => `— ${esc(t.name)} · ${esc(t.area)}`)
    .join("\n");
  return (
    `<b>${header}</b>\n` +
    `\n` +
    `${intro}\n` +
    `\n` +
    `${lines}\n` +
    `\n` +
    `${reserveLine(lang)}`
  );
}

// ─────────────────────────────────────────────────────────────
// 4. Weekend Forecast — Friday static post.
// ─────────────────────────────────────────────────────────────

const WEEKEND: Record<Lang, string> = {
  en:
    `<b>WEEKEND IN BANGKOK</b> ✦\n` +
    `\n` +
    `Saturday + Sunday outcall available across Sukhumvit, ` +
    `Silom, Asok, Sathorn, and Thonglor.\n` +
    `\n` +
    `Premium therapies from ฿1,200 · Late-night arrivals ` +
    `welcomed · 24/7 concierge.`,
  th:
    `<b>สุดสัปดาห์ที่กรุงเทพ</b> ✦\n` +
    `\n` +
    `เสาร์ + อาทิตย์ เปิดบริการนวดถึงที่ · สุขุมวิท · สีลม · ` +
    `อโศก · สาทร · ทองหล่อ\n` +
    `\n` +
    `จาก ฿1,200 · รับงานช่วงดึก · concierge 24/7`,
  zh:
    `<b>曼谷周末</b> ✦\n` +
    `\n` +
    `周六周日可预约 · 苏坤蔚、是隆、阿索、沙吞、通罗\n` +
    `\n` +
    `精品按摩 ฿1,200 起 · 接受深夜预约 · 24小时管家服务`,
  ja:
    `<b>バンコクの週末</b> ✦\n` +
    `\n` +
    `土日対応可能 · スクンビット・シーロム・アソーク・` +
    `サートーン・トンロー\n` +
    `\n` +
    `プレミアム施術 ฿1,200〜 · 深夜対応 · 24時間コンシェルジュ`,
  ko:
    `<b>방콕의 주말</b> ✦\n` +
    `\n` +
    `토요일+일요일 출장 가능 · 수쿰빗·실롬·아속·사톤·통러\n` +
    `\n` +
    `프리미엄 테라피 ฿1,200부터 · 늦은 시간 환영 · 24/7 컨시어지`,
};

export function renderWeekendForecast(lang: Lang = "en"): string {
  const body = WEEKEND[lang] || WEEKEND.en;
  return `${body}\n\n${reserveLine(lang)}`;
}

// ─────────────────────────────────────────────────────────────
// 5. Welcome Back — after channel-quiet stretch.
// ─────────────────────────────────────────────────────────────

const WELCOME_BACK: Record<Lang, string> = {
  en:
    `<b>A QUIET MOMENT, RESTORED</b> ✦\n` +
    `\n` +
    `SunRed concierge is open and curating tonight's roster.\n` +
    `\n` +
    `Premium outcall massage delivered to your hotel suite or ` +
    `residence — Sukhumvit, Silom, Asok, Sathorn, Thonglor.\n` +
    `\n` +
    `Verified female practitioners · Discreet · 24/7`,
  th:
    `<b>กลับมาอีกครั้ง</b> ✦\n` +
    `\n` +
    `SunRed concierge เปิดบริการ · กำลังจัดนักบำบัดประจำคืนนี้\n` +
    `\n` +
    `บริการนวดถึงที่ระดับพรีเมียม · ส่งถึงห้องโรงแรมหรือ` +
    `ที่พักของคุณ — สุขุมวิท · สีลม · อโศก · สาทร · ทองหล่อ\n` +
    `\n` +
    `นักบำบัดหญิงผ่านการยืนยัน · privacy-first · 24/7`,
  zh:
    `<b>静谧时光,优雅回归</b> ✦\n` +
    `\n` +
    `SunRed管家服务持续为您甄选今夜的治疗师阵容。\n` +
    `\n` +
    `精品外送按摩 · 送达您的酒店套房或住所 · ` +
    `苏坤蔚、是隆、阿索、沙吞、通罗\n` +
    `\n` +
    `认证女性治疗师 · 私密 · 24/7`,
  ja:
    `<b>静寂のひととき、再び</b> ✦\n` +
    `\n` +
    `SunRed コンシェルジュがオープン、今夜のセラピスト編成を` +
    `準備中です。\n` +
    `\n` +
    `プレミアム出張マッサージ · ご宿泊先のスイートまたは住所まで` +
    `お届け — スクンビット・シーロム・アソーク・サートーン・` +
    `トンロー\n` +
    `\n` +
    `認証済み女性セラピスト · プライバシー重視 · 24時間対応`,
  ko:
    `<b>고요한 순간, 다시</b> ✦\n` +
    `\n` +
    `SunRed 컨시어지가 오픈했습니다 · 오늘 밤 치료사 라인업 ` +
    `준비 중\n` +
    `\n` +
    `프리미엄 출장 마사지 · 호텔 스위트 또는 거주지로 직접 방문 ` +
    `— 수쿰빗·실롬·아속·사톤·통러\n` +
    `\n` +
    `인증된 여성 치료사 · 프라이버시 우선 · 24/7`,
};

export function renderWelcomeBack(lang: Lang = "en"): string {
  const body = WELCOME_BACK[lang] || WELCOME_BACK.en;
  return (
    `${body}\n\n` +
    `${reserveLine(lang)}\n` +
    `<a href="https://${WEBSITE}">${WEBSITE}</a>`
  );
}
