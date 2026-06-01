// functions/src/telegram-post-bot/rotation.ts
//
// 🆕 Round 28s116 — Multi-language bios per therapist.
//
// Previously TherapistRecord had a single `bioEN` string; now `bios` is
// keyed by ISO 639-1 code so the templates can render the appropriate
// language when WeChat OA / LINE OA traffic starts flowing in. Content
// stays terse (1 line) — TG channel posts shouldn't be long, and
// docs/therapist-profiles-i18n.md is the source of truth for richer
// in-app prose.
//
// Strategic rule (View 2026-06-07) preserved: the star therapist (Yuri)
// is EXCLUDED from the recurring spotlight rotation; she can still be
// spotlighted via the manual callable when concierge has availability.

import { getFirestore, FieldValue } from "firebase-admin/firestore";

export type Lang = "en" | "th" | "zh" | "ja" | "ko";

/**
 * Lean shape of what the templates need from a therapist record.
 * Kept here so Functions code doesn't have to import from
 * `src/data/therapists.ts` (which carries frontend-only fields).
 */
export interface TherapistRecord {
  id: string;
  name: string;
  area: string;
  /** Concise 1-line bio per language. Sourced from
   *  docs/therapist-profiles-i18n.md, compressed for channel posts. */
  bios: Record<Lang, string>;
}

const STAR_THERAPIST_ID = "YuriSunRed";
const ROT_DOC = "system/telegramRotation";

/**
 * Roster snapshot for posting. Hand-maintained (small list,
 * infrequent changes) to avoid coupling Functions to the
 * client-side data file. Reconcile whenever a new practitioner
 * joins or leaves.
 */
export const POST_ROSTER: TherapistRecord[] = [
  {
    id: "YuriSunRed",
    name: "Yuri",
    area: "Din Daeng · Ratchada",
    bios: {
      en: "Korean and English fluent. Late-night specialist (19:00–05:00).",
      th: "เกาหลีและอังกฤษคล่อง · ช่วงดึก 19:00–05:00",
      zh: "韩英流利 · 深夜班 · 19:00–05:00",
      ja: "韓国語と英語流暢、深夜帯 19:00–05:00。",
      ko: "한국어와 영어 능통, 심야 19:00–05:00.",
    },
  },
  {
    id: "JimmySunRed",
    name: "Jimmy",
    area: "Huai Khwang",
    bios: {
      en: "Trilingual EN / KO / Cantonese. Full menu including SunRed Therapeutic.",
      th: "3 ภาษา อังกฤษ/เกาหลี/กวางตุ้ง · ครบทุกเมนูรวม Therapeutic",
      zh: "三语 英/韩/粤 · 全菜单含 Therapeutic · 午后至傍晚",
      ja: "3か国語(英・韓・広東語)、Therapeutic 含む全メニュー対応。",
      ko: "3개 국어(영/한/광동어), Therapeutic 포함 전 메뉴.",
    },
  },
  {
    id: "HamiSunRed",
    name: "Hami",
    area: "Huai Khwang",
    bios: {
      en: "English + Korean conversational. Evening specialist with attentive presence.",
      th: "อังกฤษ + เกาหลีได้ · ช่วงค่ำ บุคลิกใส่ใจ",
      zh: "英语韩语可沟通 · 晚间专门 · 专注存在感",
      ja: "英語と韓国語、夕方の集中した存在感。",
      ko: "영어와 한국어, 저녁 시간대 세심한 존재감.",
    },
  },
  {
    id: "XingXingSunRed",
    name: "XingXing",
    area: "Din Daeng",
    bios: {
      en: "Thai native + English + Chinese. Distinctive curvier build. Long shift 11:00–03:00.",
      th: "ไทย/อังกฤษคล่อง/จีนใช้งานได้ · รูปร่างอวบ · 11:00–03:00",
      zh: "泰语母语英语流利,中文可沟通 · 丰盈体态 · 11:00–03:00",
      ja: "タイ語ネイティブ・英語流暢・中国語会話、豊かな体型、11:00–03:00。",
      ko: "태국어 원어민·영어 능통·중국어 회화, 풍만한 체형, 11:00–03:00.",
    },
  },
  {
    id: "BarbieSunRed",
    name: "Barbie",
    area: "Lat Phrao · Wang Thonglang",
    bios: {
      en: "Our only Northeast-Bangkok option. Thai native, fluent English. Late-night premium window.",
      th: "นักบำบัดคนเดียวประจำลาดพร้าว/วังทองหลาง · ไทย/อังกฤษคล่อง · ดึกพรีเมียม",
      zh: "唯一驻拉抛/Wang Thonglang · 泰语母语英语流利 · 深夜豪华",
      ja: "ラップラオ/ワントーンラン地区唯一、タイ語ネイティブ・英語流暢、深夜枠。",
      ko: "랏프라오/왕통랑 유일 치료사, 태국어 원어민·영어 능통, 심야 프리미엄.",
    },
  },
  {
    id: "MiniSunRed",
    name: "Mini",
    area: "Huai Khwang",
    bios: {
      en: "English + Korean. Full menu including SunRed Therapeutic. Long flexible shift.",
      th: "อังกฤษ + เกาหลี · ครบทุกเมนูรวม Therapeutic · ช่วงเวลายืดหยุ่น",
      zh: "英语韩语 · 全菜单含 Therapeutic · 长班灵活",
      ja: "英語と韓国語、Therapeutic 含む全メニュー、長時間の柔軟シフト。",
      ko: "영어와 한국어, Therapeutic 포함 전 메뉴, 길고 유연한 시간대.",
    },
  },
  {
    id: "JiASunRed",
    name: "Ji A",
    area: "Huai Khwang",
    bios: {
      en: "English + Korean. Full menu. Evening into early morning.",
      th: "อังกฤษ + เกาหลี · ครบทุกเมนู · ค่ำถึงเช้ามืด",
      zh: "英语韩语 · 全菜单 · 傍晚至清晨",
      ja: "英語と韓国語、全メニュー、夕方から明け方。",
      ko: "영어와 한국어, 전 메뉴, 저녁부터 새벽.",
    },
  },
  {
    id: "VivianSunRed",
    name: "Vivian",
    area: "Huai Khwang",
    bios: {
      en: "The gentlest touch on our evening roster. English fluent, basic Korean.",
      th: "สัมผัสนุ่มเบาที่สุด · อังกฤษคล่อง เกาหลีพื้นฐาน",
      zh: "晚间班最轻柔触感 · 英语流利,韩语基础",
      ja: "夕方シフトで最も軽やかなタッチ。英語流暢、韓国語基本。",
      ko: "저녁 시간대 가장 부드러운 터치. 영어 능통, 한국어 기초.",
    },
  },
  {
    id: "NannySunRed",
    name: "Nanny",
    area: "Huai Khwang",
    bios: {
      en: "Thai native with fluent English. Afternoon-to-evening shift. Full menu.",
      th: "ไทยเป็นภาษาแม่ อังกฤษคล่อง · บ่ายถึงค่ำ · ครบทุกเมนู",
      zh: "泰语母语英语流利 · 午后至晚间 · 全菜单",
      ja: "タイ語ネイティブ・英語流暢、午後〜夕方、全メニュー対応。",
      ko: "태국어 원어민·영어 능통, 오후-저녁, 전 메뉴.",
    },
  },
  {
    id: "YaYaSunRed",
    name: "YaYa",
    area: "Huai Khwang",
    bios: {
      en: "✦ NEW · Taller (168cm) hourglass. Thai native, fluent English. Full menu.",
      th: "✦ ใหม่ · สูง 168cm หุ่นนาฬิกาทราย · ไทย/อังกฤษคล่อง · ครบทุกเมนู",
      zh: "✦ 新加入 · 身高 168cm 沙漏体型 · 泰语母语英语流利 · 全菜单",
      ja: "✦ 新加入 · 168cm 砂時計体型、タイ語ネイティブ・英語流暢、全メニュー。",
      ko: "✦ 신규 · 168cm 모래시계 체형, 태국어 원어민·영어 능통, 전 메뉴.",
    },
  },
  {
    id: "NickySunRed",
    name: "Nicky",
    area: "Silom · Rama 4",
    bios: {
      en: "✦ NEW · Our only Silom-corridor practitioner. English + Korean conversational.",
      th: "✦ ใหม่ · นักบำบัดคนเดียวประจำสีลม · อังกฤษ + เกาหลีได้",
      zh: "✦ 新加入 · 唯一是隆走廊治疗师 · 英语韩语可沟通",
      ja: "✦ 新加入 · シーロム走廊唯一のセラピスト、英語と韓国語対応。",
      ko: "✦ 신규 · 실롬 회랑 유일 치료사, 영어와 한국어 가능.",
    },
  },
  {
    id: "RichieSunRed",
    name: "Richie",
    area: "Rama 9",
    bios: {
      en: "✦ NEW · The most petite (155cm). Basic Chinese + English. Midday to midnight.",
      th: "✦ ใหม่ · ตัวเล็กที่สุด 155cm · จีน + อังกฤษพื้นฐาน · เที่ยงถึงเที่ยงคืน",
      zh: "✦ 新加入 · 队中最娇小 155cm · 中英文基础 · 正午至午夜",
      ja: "✦ 新加入 · ロスター最小柄 155cm、中国語と英語基本、正午〜深夜。",
      ko: "✦ 신규 · 로스터 최소형 155cm, 중국어·영어 기초, 정오-자정.",
    },
  },
];

/**
 * Pick the next therapist for the recurring spotlight cron.
 * Star therapist excluded by design — see file header comment.
 *
 * Round-robin over the remaining 11 practitioners; idx persists in
 * Firestore so each new run advances exactly one slot.
 */
export async function pickNextSpotlight(): Promise<TherapistRecord> {
  const candidates = POST_ROSTER.filter(
    (t) => t.id !== STAR_THERAPIST_ID,
  );
  if (candidates.length === 0) {
    return POST_ROSTER[0];
  }

  const db = getFirestore();
  const ref = db.doc(ROT_DOC);
  const snap = await ref.get();
  const idx = (snap.exists ? Number(snap.data()?.idx ?? 0) : 0) || 0;

  const picked = candidates[idx % candidates.length];

  await ref.set(
    {
      idx: idx + 1,
      lastPickedAt: FieldValue.serverTimestamp(),
      lastId: picked.id,
      lastName: picked.name,
    },
    { merge: true },
  );

  return picked;
}

/**
 * Find a therapist by ID — used by the manual callable to honour
 * explicit picks (View can override the rotation when she has
 * availability of someone specific to push).
 */
export function findInRoster(id: string): TherapistRecord | undefined {
  return POST_ROSTER.find((t) => t.id === id);
}

/**
 * Bio lookup with fallback chain: requested lang → en → first available.
 * Defensive against missing translations.
 */
export function bioFor(t: TherapistRecord, lang: Lang): string {
  return t.bios[lang] || t.bios.en || Object.values(t.bios)[0] || "";
}
