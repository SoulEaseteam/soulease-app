// functions/src/telegram-post-bot/templates.ts
//
// 🆕 Round 28s225 — 7-day rotation + holiday overrides on top of the
//   3-slot daily structure (founder ask: "ครีเอท 7 วันไม่ซ้ำ + วันสำคัญ
//   ที่เอามาทำโปรได้ เช่น วันหยุดยาว วันความรัก วันฮาโลวีน วันปีใหม่
//   สงกรานต์").
//
// Routing:
//   activeHoliday(date) ?? dailyTheme(dayKey(date))  →  body text
//   slot                                           →  header text
//   lang                                           →  pick localized
//
// Per-day vibe stays consistent across the 3 slots; only the slot header
// changes (evening / prime / late). Holidays override the whole body
// and post the same vibe across all 3 slots that day.
//
// Privacy-first per CLAUDE.md §🔐 — no practitioner names ever surface.

import type { Lang } from "./rotation";
import { activeHoliday, dayKey, type DayKey, type Holiday } from "./calendar";
import { getBotCopyField } from "../botCopyStore";

export type Slot = "evening" | "prime" | "late";

// ─────────────────────────────────────────────────────────────
// Reserve / website helpers
// ─────────────────────────────────────────────────────────────

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

function reserveLine(lang: Lang): string {
  const labels: Record<Lang, string> = {
    en: "Reserve via DM",
    th: "DM ติดต่อ",
    zh: "预约请私信",
    ja: "DMにてご予約",
    ko: "DM으로 예약",
  };
  return `${labels[lang] || labels.en} → <a href="${RESERVE_URLS[lang] || RESERVE_URLS.en}">${RESERVE_HANDLES[lang] || RESERVE_HANDLES.en}</a>`;
}

function websiteLine(): string {
  return `<a href="https://${WEBSITE}">${WEBSITE}</a>`;
}

// ─────────────────────────────────────────────────────────────
// Slot HEADERS (3 × 5 langs)
// ─────────────────────────────────────────────────────────────

const SLOT_HEADERS: Record<Slot, Record<Lang, string>> = {
  evening: {
    en: "EVENING UNFURLS · BANGKOK ✦",
    th: "เย็นนี้ที่กรุงเทพ ✦",
    zh: "曼谷夜幕初启 ✦",
    ja: "夕暮れのバンコク ✦",
    ko: "방콕의 저녁 ✦",
  },
  prime: {
    en: "TONIGHT · 22:00–04:00 BKK ✦",
    th: "คืนนี้ · 22:00–04:00 BKK ✦",
    zh: "今夜 · 22:00–04:00 曼谷 ✦",
    ja: "今夜 · 22:00–04:00 バンコク ✦",
    ko: "오늘 밤 · 22:00–04:00 방콕 ✦",
  },
  late: {
    en: "STILL OPEN · LATE NIGHT BKK ✦",
    th: "ยังเปิด · ดึกที่กรุงเทพ ✦",
    zh: "仍在营业 · 曼谷深夜 ✦",
    ja: "営業中 · バンコク深夜 ✦",
    ko: "영업 중 · 방콕 심야 ✦",
  },
};

// ─────────────────────────────────────────────────────────────
// 7 daily themed BODIES (one per DayKey × 5 langs)
//
// Each body is 2-3 short paragraphs in the brand voice. Reserve line +
// area list + price are appended by the composer below so we don't
// duplicate them in every variant.
// ─────────────────────────────────────────────────────────────

const DAILY_BODIES: Record<DayKey, Record<Lang, string>> = {
  mon: {
    en:
      `Quiet start to the week. Restorative outcall therapies for unwinding ` +
      `after the Monday reset — slow pressure, premium oils, and discreet ` +
      `concierge handling from arrival to close.`,
    th:
      `เปิดสัปดาห์อย่างเงียบสงบ บริการนวดถึงที่แนวฟื้นฟู คลายความเหนื่อย ` +
      `จากต้นสัปดาห์ — แรงนวดนุ่ม น้ำมันพรีเมียม concierge ดูแลแบบส่วนตัว ` +
      `ตั้งแต่มาถึงจนเสร็จงาน`,
    zh:
      `周一静谧开启 · 周末后恢复身心的外送按摩 · 力度舒缓 · 精油优质 · ` +
      `礼宾全程私密照应。`,
    ja:
      `月曜の静かな始まり · 週末明けの心身を整える出張マッサージ · ` +
      `ゆっくりとした圧 · プレミアムオイル · プライベートなコンシェルジュ対応。`,
    ko:
      `조용한 한 주의 시작 · 회복을 위한 출장 마사지 · 부드러운 압력 · ` +
      `프리미엄 오일 · 도착부터 마무리까지 컨시어지 케어.`,
  },
  tue: {
    en:
      `Mid-week respite. A practiced hour of full-body work to take you ` +
      `out of the inbox and into something better — verified practitioners, ` +
      `delivered to your hotel suite or residence.`,
    th:
      `กลางสัปดาห์ผ่อนคลาย · นวดทั่วตัวหนึ่งชั่วโมงพาคุณออกจากหน้าจอ ` +
      `เข้าสู่ช่วงเวลาที่ดีกว่า · นักบำบัดผ่านการยืนยัน · ส่งถึงห้องพัก ` +
      `หรือที่พักของคุณ`,
    zh:
      `周中静思 · 一小时全身舒缓让您远离工作 · 认证治疗师送达您的酒店或住所。`,
    ja:
      `週中の安らぎ · 1時間のフルボディトリートメントで仕事から離れる時間 · ` +
      `認証済みセラピストがホテルまたはご住所までお伺いします。`,
    ko:
      `주중의 휴식 · 1시간 전신 케어로 일상에서 벗어나는 시간 · 인증 ` +
      `치료사가 호텔이나 거주지로 방문합니다.`,
  },
  wed: {
    en:
      `Half-way relief. A late-Wednesday hour eases the second half of ` +
      `the week — premium outcall therapies across central Bangkok, ` +
      `discreet from concierge to checkout.`,
    th:
      `กลางสัปดาห์ใกล้ผ่าน · นวดดึกพุธคลายความเหนื่อยให้พร้อมรับครึ่ง ` +
      `สัปดาห์หลัง · บริการพรีเมียมในย่านใจกลางกรุงเทพ · privacy-first ` +
      `ตั้งแต่ concierge จนจ่ายเงิน`,
    zh:
      `周中之半 · 周三深夜按摩为下半周减压 · 曼谷市中心高端外送 · ` +
      `从礼宾到结账全程私密。`,
    ja:
      `週の折り返し · 水曜深夜の施術で後半に備える · バンコク中心部の ` +
      `プレミアム出張 · コンシェルジュから精算まで完全プライベート。`,
    ko:
      `한 주의 절반 · 수요일 늦은 시간의 마사지로 후반을 준비 · ` +
      `방콕 중심부 프리미엄 출장 · 컨시어지부터 결제까지 완전 비공개.`,
  },
  thu: {
    en:
      `Approaching the weekend. Tonight begins the slow tilt toward Friday — ` +
      `outcall practitioners on standby for Sukhumvit, Silom, Asok, Sathorn, ` +
      `Thonglor.`,
    th:
      `ใกล้สุดสัปดาห์ · คืนนี้คือจุดเริ่มต้นที่ค่อยๆ เลื่อนเข้าสู่วันศุกร์ · ` +
      `นักบำบัดพร้อมเข้าทำงาน · สุขุมวิท · สีลม · อโศก · สาทร · ทองหล่อ`,
    zh:
      `周末将至 · 今夜悄然倾向周五 · 治疗师待命 · 苏坤蔚 · 是隆 · 阿索 · 沙吞 · 通罗。`,
    ja:
      `週末間近 · 今夜から金曜への傾きが始まる · セラピスト待機中 · ` +
      `スクンビット · シーロム · アソーク · サートーン · トンロー。`,
    ko:
      `주말이 다가옵니다 · 오늘 밤부터 금요일로 향하는 시간 · 치료사 ` +
      `대기 중 · 수쿰빗 · 실롬 · 아속 · 사톤 · 통러.`,
  },
  fri: {
    en:
      `Weekend opens. Premium outcall therapies welcome the Friday crowd — ` +
      `arrival anywhere central, discreet from first hello to final pour.`,
    th:
      `เปิดสุดสัปดาห์ · บริการนวดถึงที่ระดับพรีเมียมต้อนรับชาวศุกร์ · ` +
      `ส่งทั่วใจกลางกรุงเทพ · privacy-first ตั้งแต่ทักทายจนปิดงาน`,
    zh:
      `周末开启 · 高端外送按摩迎接周五人潮 · 送达市中心任何地点 · ` +
      `从问候到结束全程私密。`,
    ja:
      `週末の幕開け · 金曜のお客様を迎えるプレミアム出張マッサージ · ` +
      `中心部どこでもお届け · 最初のご挨拶から最後まで完全プライベート。`,
    ko:
      `주말의 시작 · 금요일을 환영하는 프리미엄 출장 마사지 · 중심부 ` +
      `어디든 방문 · 처음 인사부터 마지막까지 완전 비공개.`,
  },
  sat: {
    en:
      `Saturday night premium. Bangkok's longest concierge hours are open — ` +
      `book ahead to lock in your preferred practitioner and hour, late ` +
      `arrivals welcomed.`,
    th:
      `คืนเสาร์ระดับพรีเมียม · concierge เปิดยาวที่สุดในกรุงเทพ · ` +
      `จองล่วงหน้าเพื่อล็อกนักบำบัดและเวลาที่ต้องการ · รับงานช่วงดึก`,
    zh:
      `周六之夜 · 曼谷营业时间最长的礼宾服务 · 提前预约锁定理想治疗师与 ` +
      `时段 · 深夜接受预约。`,
    ja:
      `土曜の夜 · バンコク最長のコンシェルジュ時間 · 事前予約でご希望の ` +
      `セラピストと時間を確保 · 深夜対応可。`,
    ko:
      `토요일 밤 프리미엄 · 방콕에서 가장 긴 컨시어지 시간 · 사전 예약 ` +
      `으로 원하는 치료사와 시간을 확보 · 늦은 시간 환영.`,
  },
  sun: {
    en:
      `Sunday wind-down. The week closes quietly — slow oil ceremonies, ` +
      `gentle pressure work, and concierge handling that keeps the night ` +
      `discreet.`,
    th:
      `ปิดสัปดาห์อย่างผ่อนคลาย · พิธีน้ำมันแบบช้า · นวดแรงนุ่ม · ` +
      `concierge ดูแลให้ทุกอย่างเป็นส่วนตัว`,
    zh:
      `周日缓行收尾 · 缓慢的精油仪式 · 轻柔的压力 · 礼宾保持整晚私密。`,
    ja:
      `日曜の終演 · ゆったりとしたオイルセレモニー · 優しい圧 · ` +
      `コンシェルジュが夜を静かに保ちます。`,
    ko:
      `일요일의 마무리 · 느린 오일 의식 · 부드러운 압력 · 컨시어지가 ` +
      `밤을 조용하게 지킵니다.`,
  },
};

// ─────────────────────────────────────────────────────────────
// HOLIDAY OVERRIDES — themed copy that REPLACES the daily body
// for the entire day across all 3 slots.
// ─────────────────────────────────────────────────────────────

const HOLIDAY_BODIES: Record<Holiday, Record<Lang, string>> = {
  valentine: {
    en:
      `💝 <b>Valentine's at Sunred</b>\n` +
      `\n` +
      `Outcall therapies arranged for the most intimate evening of ` +
      `the year — couples-friendly options, candle-lit oil rituals, and ` +
      `concierge handling that keeps the night entirely yours.`,
    th:
      `💝 <b>วาเลนไทน์กับ SunRed</b>\n` +
      `\n` +
      `บริการนวดถึงที่จัดเตรียมไว้สำหรับคืนพิเศษที่สุดของปี · มีตัวเลือก ` +
      `สำหรับคู่ · พิธีน้ำมันแสงเทียน · concierge ดูแลให้คืนนี้เป็นของคุณ ` +
      `ทั้งหมด`,
    zh:
      `💝 <b>SunRed 情人节</b>\n` +
      `\n` +
      `为一年中最亲密的夜晚准备的外送按摩 · 提供情侣方案 · 烛光精油 ` +
      `仪式 · 礼宾让整晚完全属于你们。`,
    ja:
      `💝 <b>SunRed バレンタイン</b>\n` +
      `\n` +
      `一年で最もロマンティックな夜にご提案する出張マッサージ · カップル ` +
      `向けオプション · キャンドルのオイル儀式 · コンシェルジュがすべて ` +
      `お二人の時間に。`,
    ko:
      `💝 <b>SunRed 발렌타인</b>\n` +
      `\n` +
      `한 해 가장 친밀한 밤을 위한 출장 마사지 · 커플 옵션 · 촛불 ` +
      `오일 의식 · 컨시어지가 두 분만의 밤을 지킵니다.`,
  },
  songkran: {
    en:
      `🌊 <b>Songkran in Bangkok</b>\n` +
      `\n` +
      `Long-weekend therapies for the festival crowd — recover from the ` +
      `streets with a cool-room oil session, premium aromatherapy, and ` +
      `late-night concierge through the holiday week.`,
    th:
      `🌊 <b>สงกรานต์ที่กรุงเทพ</b>\n` +
      `\n` +
      `บริการนวดถึงที่สำหรับเทศกาลและวันหยุดยาว · ฟื้นพลังจากท้องถนน · ` +
      `อโรมาพรีเมียม · concierge เปิดดึกตลอดเทศกาล`,
    zh:
      `🌊 <b>曼谷宋干节</b>\n` +
      `\n` +
      `为长假人潮准备的外送疗程 · 街头狂欢后的冷气房精油按摩 · 高端芳疗 · ` +
      `节日期间深夜礼宾持续服务。`,
    ja:
      `🌊 <b>バンコクのソンクラーン</b>\n` +
      `\n` +
      `連休のお客様向け出張施術 · 街歩きの後に冷房ルームでオイル · ` +
      `プレミアムアロマ · 祝日中の深夜コンシェルジュ対応。`,
    ko:
      `🌊 <b>방콕 송끄란</b>\n` +
      `\n` +
      `긴 연휴를 위한 출장 마사지 · 축제 후 시원한 방의 오일 세션 · ` +
      `프리미엄 아로마 · 휴일 기간 심야 컨시어지.`,
  },
  halloween: {
    en:
      `🎃 <b>Halloween in Bangkok</b>\n` +
      `\n` +
      `Discreet wind-down after the party — premium outcall therapies for ` +
      `the costume-night crowd, late-hour concierge keeping it private ` +
      `through the small hours.`,
    th:
      `🎃 <b>ฮาโลวีนที่กรุงเทพ</b>\n` +
      `\n` +
      `ผ่อนคลายแบบเป็นส่วนตัวหลังปาร์ตี้ · บริการพรีเมียมสำหรับชาวคืน ` +
      `แต่งคอสตูม · concierge เปิดดึกตลอดคืน`,
    zh:
      `🎃 <b>曼谷万圣夜</b>\n` +
      `\n` +
      `派对后的私密放松 · 为化装夜的客人准备的高端外送按摩 · 深夜礼宾 ` +
      `让小时光保持私密。`,
    ja:
      `🎃 <b>バンコクのハロウィン</b>\n` +
      `\n` +
      `パーティー後のプライベートな安らぎ · コスチュームナイトのお客様 ` +
      `向けプレミアム出張 · 深夜コンシェルジュが朝方まで対応。`,
    ko:
      `🎃 <b>방콕 핼러윈</b>\n` +
      `\n` +
      `파티 후의 사적인 휴식 · 코스튬 나이트를 위한 프리미엄 출장 ` +
      `마사지 · 새벽까지 컨시어지가 사적인 시간을 지킵니다.`,
  },
  christmas: {
    en:
      `🎄 <b>Christmas in Bangkok</b>\n` +
      `\n` +
      `Warm winter therapies for the holiday traveller — slow pressure ` +
      `work, premium oils, late-arrival welcomed. Concierge open through ` +
      `the season.`,
    th:
      `🎄 <b>คริสต์มาสที่กรุงเทพ</b>\n` +
      `\n` +
      `บริการอบอุ่นสำหรับนักท่องเที่ยวช่วงเทศกาล · นวดนุ่ม · น้ำมัน ` +
      `พรีเมียม · รับงานช่วงดึก · concierge เปิดตลอดเทศกาล`,
    zh:
      `🎄 <b>曼谷圣诞</b>\n` +
      `\n` +
      `为节日旅客准备的温暖冬季疗程 · 缓慢的压力 · 高端精油 · 接受深夜 ` +
      `预约 · 节日期间礼宾持续开放。`,
    ja:
      `🎄 <b>バンコクのクリスマス</b>\n` +
      `\n` +
      `年末旅行のお客様向け温かな冬の施術 · ゆっくりとした圧 · ` +
      `プレミアムオイル · 深夜到着歓迎 · 期間中コンシェルジュ対応。`,
    ko:
      `🎄 <b>방콕 크리스마스</b>\n` +
      `\n` +
      `연말 여행객을 위한 따뜻한 겨울 케어 · 부드러운 압력 · 프리미엄 ` +
      `오일 · 늦은 도착 환영 · 시즌 내내 컨시어지 운영.`,
  },
  newyear: {
    en:
      `✨ <b>New Year in Bangkok</b>\n` +
      `\n` +
      `Outcall therapies through the countdown and beyond — restore after ` +
      `the rooftops, premium oil rituals, late-night concierge keeping the ` +
      `holiday entirely yours.`,
    th:
      `✨ <b>ปีใหม่ที่กรุงเทพ</b>\n` +
      `\n` +
      `บริการนวดถึงที่ตลอดช่วง countdown · ฟื้นพลังหลัง rooftop · พิธี ` +
      `น้ำมันพรีเมียม · concierge ดึกให้เทศกาลนี้เป็นของคุณ`,
    zh:
      `✨ <b>曼谷新年</b>\n` +
      `\n` +
      `跨年期间持续的外送按摩 · 屋顶派对后的恢复 · 高端精油仪式 · ` +
      `深夜礼宾让假期完全属于你。`,
    ja:
      `✨ <b>バンコクのお正月</b>\n` +
      `\n` +
      `カウントダウン期間の出張マッサージ · ルーフトップ後のリカバリー · ` +
      `プレミアムオイル儀式 · 深夜コンシェルジュが休日をあなたのものに。`,
    ko:
      `✨ <b>방콕의 새해</b>\n` +
      `\n` +
      `카운트다운 기간의 출장 마사지 · 루프탑 후의 회복 · 프리미엄 ` +
      `오일 의식 · 심야 컨시어지가 휴일을 온전히 당신의 것으로.`,
  },
};

// ─────────────────────────────────────────────────────────────
// Footer line shared across all bodies (areas + price + reserve)
// ─────────────────────────────────────────────────────────────

const FOOTER: Record<Lang, string> = {
  en: `Sukhumvit · Silom · Asok · Sathorn · Thonglor — from ฿1,200`,
  th: `สุขุมวิท · สีลม · อโศก · สาทร · ทองหล่อ — จาก ฿1,200`,
  zh: `苏坤蔚 · 是隆 · 阿索 · 沙吞 · 通罗 — ฿1,200 起`,
  ja: `スクンビット · シーロム · アソーク · サートーン · トンロー — ฿1,200〜`,
  ko: `수쿰빗 · 실롬 · 아속 · 사톤 · 통러 — ฿1,200부터`,
};

// ─────────────────────────────────────────────────────────────
// Composer — picks header + body + footer + reserve and joins.
// ─────────────────────────────────────────────────────────────

// 🆕 Round 28x.97 — Firestore override layer: promo_{dayKey|holiday}.body
//   and promo_footer.text, checked first so an admin edit takes effect on
//   the very next scheduled post with no redeploy.
async function compose(
  slot: Slot,
  body: string,
  lang: Lang,
  includeWebsite: boolean,
): Promise<string> {
  const header = SLOT_HEADERS[slot][lang] || SLOT_HEADERS[slot].en;
  const footer = await rawFooter(lang);
  const lines = [
    `<b>${header}</b>`,
    "",
    body,
    "",
    footer,
    "",
    reserveLine(lang),
  ];
  if (includeWebsite) lines.push(websiteLine());
  return lines.join("\n");
}

// 🆕 Round 28x.97 — raw per-key lookups (Firestore-first, code fallback),
//   exported so the admin edit UI can read/save exactly the stored unit
//   (one day/holiday's body, or the shared footer) instead of a fully
//   composed message that bundles header+body+footer+reserve together.
export async function rawDailyBody(dk: DayKey, lang: Lang): Promise<string> {
  const override = await getBotCopyField(`promo_${dk}`, "body", lang);
  if (override) return override;
  const map = DAILY_BODIES[dk];
  return map[lang] || map.en;
}

export async function rawHolidayBody(holiday: Holiday, lang: Lang): Promise<string> {
  const override = await getBotCopyField(`promo_${holiday}`, "body", lang);
  if (override) return override;
  const map = HOLIDAY_BODIES[holiday];
  return map[lang] || map.en;
}

export async function rawFooter(lang: Lang): Promise<string> {
  const override = await getBotCopyField("promo_footer", "text", lang);
  return override ?? (FOOTER[lang] || FOOTER.en);
}

async function pickBody(date: Date, lang: Lang): Promise<string> {
  const holiday = activeHoliday(date);
  if (holiday) return rawHolidayBody(holiday, lang);
  return rawDailyBody(dayKey(date), lang);
}

/** Compose a full preview message from a raw body — same header/footer/
 *  reserve wrapping as the live "prime" slot, for the admin edit UI to
 *  show "here's what this will actually look like when sent". */
export async function previewPromoMessage(body: string, lang: Lang): Promise<string> {
  return compose("prime", body, lang, /* website */ false);
}

// ─────────────────────────────────────────────────────────────
// Public renderers — take a Date (BKK-aware) + Lang.
// ─────────────────────────────────────────────────────────────

export async function renderEveningOpen(date: Date, lang: Lang = "en"): Promise<string> {
  return compose("evening", await pickBody(date, lang), lang, /* website */ false);
}

export async function renderPrimeTime(date: Date, lang: Lang = "en"): Promise<string> {
  return compose("prime", await pickBody(date, lang), lang, /* website */ false);
}

export async function renderLateNight(date: Date, lang: Lang = "en"): Promise<string> {
  return compose("late", await pickBody(date, lang), lang, /* website */ true);
}

// Re-exports so callers (admin panel preview) can branch on the routing
// decision without duplicating logic.
export { activeHoliday, dayKey };
export type { DayKey, Holiday };
