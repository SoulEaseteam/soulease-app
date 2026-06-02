// functions/src/telegram-post-bot/templates.ts
//
// 🆕 Round 28s224 — Founder pivot: drop all therapist-specific posts
//   (privacy-first per CLAUDE.md §🔐) and use 3 brand-level promo posts
//   that fire at fixed BKK prime times (18:00 / 22:00 / 01:00). No
//   individual practitioner names ever leak through the channel.
//
// Three renderers in 5 languages each:
//   1. renderEveningOpen  — 18:00 BKK, warm-up / planning hour
//   2. renderPrimeTime    — 22:00 BKK, official open / call-to-action
//   3. renderLateNight    — 01:00 BKK, last-call / "still open"
//
// All posts close with the per-lang Reserve via DM link (CN → YuNiSpaBkk,
// others → SunRedvip_bkk).

import type { Lang } from "./rotation";

// Per-language reserve target (CN gets dedicated handle).
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

/** Website link, plain HTML. */
function websiteLine(): string {
  return `<a href="https://${WEBSITE}">${WEBSITE}</a>`;
}

// ─────────────────────────────────────────────────────────────
// 1. Evening Opening · 18:00 BKK · warm-up / planning hour
// ─────────────────────────────────────────────────────────────

const EVENING: Record<Lang, string> = {
  en:
    `<b>EVENING UNFURLS · BANGKOK</b> ✦\n` +
    `\n` +
    `Premium outcall therapies now opening for tonight.\n` +
    `Sukhumvit · Silom · Asok · Sathorn · Thonglor.\n` +
    `\n` +
    `Verified female practitioners on standby. Reserve early to lock ` +
    `your preferred hour.\n` +
    `\n` +
    `From ฿1,200 · concierge 24/7`,
  th:
    `<b>เย็นนี้ที่กรุงเทพ</b> ✦\n` +
    `\n` +
    `เปิดบริการนวดถึงที่ระดับพรีเมียมสำหรับคืนนี้\n` +
    `สุขุมวิท · สีลม · อโศก · สาทร · ทองหล่อ\n` +
    `\n` +
    `นักบำบัดหญิงผ่านการยืนยัน พร้อมเข้าทำงาน · จองไว้ก่อนเพื่อ` +
    `ล็อกเวลาที่คุณต้องการ\n` +
    `\n` +
    `จาก ฿1,200 · concierge 24/7`,
  zh:
    `<b>曼谷夜幕初启</b> ✦\n` +
    `\n` +
    `高端外送按摩今晚正式开放预约\n` +
    `苏坤蔚 · 是隆 · 阿索 · 沙吞 · 通罗\n` +
    `\n` +
    `认证女性治疗师待命 · 提前预约可锁定您理想的时段\n` +
    `\n` +
    `฿1,200 起 · 24小时管家服务`,
  ja:
    `<b>夕暮れのバンコク</b> ✦\n` +
    `\n` +
    `本日のプレミアム出張マッサージ受付開始\n` +
    `スクンビット · シーロム · アソーク · サートーン · トンロー\n` +
    `\n` +
    `認証済み女性セラピストが待機中 · ご希望の時間を` +
    `早めにご予約ください\n` +
    `\n` +
    `฿1,200〜 · 24時間コンシェルジュ`,
  ko:
    `<b>방콕의 저녁</b> ✦\n` +
    `\n` +
    `오늘 밤 프리미엄 출장 마사지 예약 시작\n` +
    `수쿰빗 · 실롬 · 아속 · 사톤 · 통러\n` +
    `\n` +
    `인증된 여성 치료사 대기 중 · 원하시는 시간을 미리 예약하세요\n` +
    `\n` +
    `฿1,200부터 · 24/7 컨시어지`,
};

export function renderEveningOpen(lang: Lang = "en"): string {
  const body = EVENING[lang] || EVENING.en;
  return `${body}\n\n${reserveLine(lang)}`;
}

// ─────────────────────────────────────────────────────────────
// 2. Prime Time · 22:00 BKK · official open / call-to-action
// ─────────────────────────────────────────────────────────────

const PRIME: Record<Lang, string> = {
  en:
    `<b>TONIGHT · 22:00–04:00 BKK</b> ✦\n` +
    `\n` +
    `Premium outcall massage delivered to your hotel suite or ` +
    `residence — Sukhumvit · Silom · Asok · Sathorn · Thonglor.\n` +
    `\n` +
    `Verified female practitioners on standby. Late-night arrivals ` +
    `welcomed. Discreet · 24/7 concierge.\n` +
    `\n` +
    `From ฿1,200 · pay on arrival`,
  th:
    `<b>คืนนี้ · 22:00–04:00 BKK</b> ✦\n` +
    `\n` +
    `บริการนวดถึงที่ระดับพรีเมียม ส่งถึงห้องโรงแรมหรือที่พักของคุณ — ` +
    `สุขุมวิท · สีลม · อโศก · สาทร · ทองหล่อ\n` +
    `\n` +
    `นักบำบัดหญิงผ่านการยืนยัน รับงานช่วงดึก · privacy-first · ` +
    `concierge 24/7\n` +
    `\n` +
    `จาก ฿1,200 · จ่ายตอนเสร็จงาน`,
  zh:
    `<b>今夜 · 22:00–04:00 曼谷</b> ✦\n` +
    `\n` +
    `精品外送按摩送达您的酒店套房或住所 — ` +
    `苏坤蔚 · 是隆 · 阿索 · 沙吞 · 通罗\n` +
    `\n` +
    `认证女性治疗师待命 · 接受深夜预约 · 私密 · 24小时管家\n` +
    `\n` +
    `฿1,200 起 · 现场结算`,
  ja:
    `<b>今夜 · 22:00–04:00 バンコク</b> ✦\n` +
    `\n` +
    `プレミアム出張マッサージ · ご宿泊のスイートまたはご住所まで ` +
    `お届け — スクンビット · シーロム · アソーク · サートーン · トンロー\n` +
    `\n` +
    `認証済み女性セラピスト待機中 · 深夜対応可 · ` +
    `プライバシー重視 · 24時間コンシェルジュ\n` +
    `\n` +
    `฿1,200〜 · 到着時お支払い`,
  ko:
    `<b>오늘 밤 · 22:00–04:00 방콕</b> ✦\n` +
    `\n` +
    `프리미엄 출장 마사지 · 호텔 스위트 또는 거주지로 직접 방문 — ` +
    `수쿰빗 · 실롬 · 아속 · 사톤 · 통러\n` +
    `\n` +
    `인증된 여성 치료사 대기 중 · 늦은 시간 환영 · 프라이버시 우선 · ` +
    `24/7 컨시어지\n` +
    `\n` +
    `฿1,200부터 · 도착 시 결제`,
};

export function renderPrimeTime(lang: Lang = "en"): string {
  const body = PRIME[lang] || PRIME.en;
  return `${body}\n\n${reserveLine(lang)}`;
}

// ─────────────────────────────────────────────────────────────
// 3. Late Night · 01:00 BKK · still-open / last-call
// ─────────────────────────────────────────────────────────────

const LATE: Record<Lang, string> = {
  en:
    `<b>STILL OPEN · LATE NIGHT BKK</b> ✦\n` +
    `\n` +
    `Outcall practitioners continue through the early hours.\n` +
    `Sukhumvit · Silom · Asok · Sathorn · Thonglor — discreet ` +
    `delivery to your hotel suite or residence.\n` +
    `\n` +
    `From ฿1,200 · concierge replies fast`,
  th:
    `<b>ยังเปิด · ดึกที่กรุงเทพ</b> ✦\n` +
    `\n` +
    `นักบำบัดยังรับงานต่อช่วงเช้ามืด\n` +
    `สุขุมวิท · สีลม · อโศก · สาทร · ทองหล่อ — ส่งถึงห้องโรงแรม` +
    `หรือที่พักของคุณแบบ privacy-first\n` +
    `\n` +
    `จาก ฿1,200 · concierge ตอบเร็ว`,
  zh:
    `<b>仍在营业 · 曼谷深夜</b> ✦\n` +
    `\n` +
    `治疗师继续接受凌晨时段预约\n` +
    `苏坤蔚 · 是隆 · 阿索 · 沙吞 · 通罗 — 私密送达您的酒店套房或住所\n` +
    `\n` +
    `฿1,200 起 · 管家快速回复`,
  ja:
    `<b>営業中 · バンコク深夜</b> ✦\n` +
    `\n` +
    `セラピストは早朝までご対応継続\n` +
    `スクンビット · シーロム · アソーク · サートーン · トンロー — ` +
    `ご宿泊先のスイートまたはご住所までプライバシー重視でお届け\n` +
    `\n` +
    `฿1,200〜 · コンシェルジュ即返信`,
  ko:
    `<b>영업 중 · 방콕 심야</b> ✦\n` +
    `\n` +
    `치료사가 새벽 시간대까지 계속 대응\n` +
    `수쿰빗 · 실롬 · 아속 · 사톤 · 통러 — 호텔 스위트 또는 거주지로 ` +
    `프라이버시 우선으로 방문\n` +
    `\n` +
    `฿1,200부터 · 컨시어지 빠른 응답`,
};

export function renderLateNight(lang: Lang = "en"): string {
  const body = LATE[lang] || LATE.en;
  return `${body}\n\n${reserveLine(lang)}\n${websiteLine()}`;
}
