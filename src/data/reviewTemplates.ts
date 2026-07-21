// src/data/reviewTemplates.ts
//
// 🆕 Round 28s213 — Anonymous review templates by service × language.
//
// Used by AdminSeedReviewsPage to backfill rating + reviewText onto
// existing completed bookings. Per CLAUDE.md §🔐 trust + acquisition
// playbook: reviews must stay anonymous and reflect brand voice
// (premium, concierge-driven, euphemism table compliant).
//
// IMPORTANT — brand voice rules (CLAUDE.md §3):
//   ✅ "practitioner" / "concierge" / "ritual" / "guest"
//   ❌ "therapist" / "admin" / "happy ending" / "skin-to-skin"
//   ✅ "personalised finishing ritual" (not HJ)
//   ✅ "continuous-contact technique" (not B2B / nuru)
//
// Each template is < 30 words to stay scannable in InfoSheet review
// list. No customer names. No locations. No identifying details.

export type ReviewLang = "en" | "th" | "zh" | "zh-TW" | "ja" | "ko";
export type ReviewServiceKey =
  | "xSR-Thai"
  | "SR-Aroma"
  | "SR-HJ2200"
  | "SR-B2B3200";

/**
 * Map from ServiceId → ReviewLang → array of templates.
 *
 * Templates are intentionally varied in tone (warm / clinical /
 * appreciative) so 10 backfilled reviews don't read like one author.
 */
export const REVIEW_TEMPLATES: Record<
  ReviewServiceKey,
  Record<ReviewLang, string[]>
> = {
  // ─── Thai Traditional ───────────────────────────────────────────
  "xSR-Thai": {
    en: [
      "Therapeutic stretching · woke up next day pain-free",
      "Practitioner found every knot · firm but never harsh",
      "Authentic Thai pressure work · classical technique",
      "Felt taller after the session · deep tension released",
      "Punctual arrival · clean setup · professional throughout",
    ],
    th: [
      "ยืดเส้นได้ลึก · ตื่นมาวันถัดไปไม่ปวดเลย",
      "น้องเก่ง · จุดที่ตึงคลายหมด · นวดแน่นแต่ไม่เจ็บ",
      "เทคนิคไทยแท้ · มืออาชีพมาก",
      "ผ่อนคลายมาก · หลังนวดรู้สึกเบาทั้งตัว",
      "ตรงเวลา · เตรียมตัวเรียบร้อย · บริการดีตลอดเวลา",
    ],
    zh: [
      "正宗泰式按摩 · 力度恰到好处",
      "技师手法专业 · 找准每个酸痛点",
      "深度伸展 · 身体感觉轻盈",
      "准时到达 · 服务态度好",
      "经典手法 · 体验非常舒适",
    ],
    "zh-TW": [
      "正宗泰式按摩 · 力道恰到好處",
      "技師手法專業 · 抓準每個痠痛點",
      "深度伸展 · 身體感覺輕盈",
      "準時抵達 · 服務態度好",
      "經典手法 · 體驗非常舒適",
    ],
    ja: [
      "本格的なタイ古式 · 圧加減が絶妙でした",
      "凝りをしっかりほぐしてもらえました",
      "プロフェッショナルな対応 · 時間通りに到着",
      "深いストレッチで翌日も快適",
      "技術が高く · 安心して任せられました",
    ],
    ko: [
      "정통 타이마사지 · 압력 완벽했어요",
      "전문적인 손길 · 통증이 사라졌습니다",
      "시간 엄수 · 깔끔한 준비",
      "다음 날까지 몸이 가벼웠어요",
      "기술이 뛰어난 분이었습니다",
    ],
  },

  // ─── Aromatherapy ──────────────────────────────────────────────
  "SR-Aroma": {
    en: [
      "Beautifully attentive · oils were perfect · would request again",
      "Floated through the whole session · best aroma work in Bangkok",
      "Calming presence · scent selection was tasteful",
      "Premium oil choice · long lasting fragrance",
      "Practitioner read the room · perfect pressure for relaxation",
    ],
    th: [
      "ดูแลดีมาก · กลิ่นน้ำมันสบายมาก · จะใช้บริการอีก",
      "ผ่อนคลายตลอด session · งานอโรม่าที่ดีที่สุดในกรุงเทพ",
      "บรรยากาศสงบ · กลิ่นเลือกได้เนียน",
      "น้ำมันคุณภาพดี · กลิ่นติดตัวนาน",
      "อ่านลูกค้าออก · ใช้แรงพอดีให้ผ่อนคลาย",
    ],
    zh: [
      "香薰按摩非常放松 · 精油品质很好",
      "服务体贴入微 · 整个过程都很享受",
      "氛围安静 · 选香有品味",
      "手法专业 · 力度适中",
      "曼谷最好的香薰按摩",
    ],
    "zh-TW": [
      "香氛按摩非常放鬆 · 精油品質很好",
      "服務體貼入微 · 整個過程都很享受",
      "氛圍安靜 · 選香有品味",
      "手法專業 · 力道適中",
      "曼谷最好的香氛按摩",
    ],
    ja: [
      "アロマの香りが上品 · 完全にリラックスできました",
      "オイルの質が高く · 心地よい時間でした",
      "プロの技術 · 静かで落ち着いた雰囲気",
      "圧加減がちょうど良く · 眠ってしまうほど",
      "バンコクで一番のアロマ体験でした",
    ],
    ko: [
      "아로마 향이 고급스러웠습니다",
      "오일 품질이 좋고 · 완벽한 휴식",
      "차분한 분위기 · 세심한 케어",
      "압력이 완벽했어요 · 다시 예약할게요",
      "방콕 최고의 아로마 마사지",
    ],
  },

  // ─── Gentleman's Signature (Aroma + finishing ritual) ──────────
  "SR-HJ2200": {
    en: [
      "Professional and discreet · exactly as the concierge described",
      "Premium experience from arrival to close · seamless",
      "Practitioner handled everything gracefully · highly recommend",
      "Worth every baht · concierge service was top tier",
      "Discreet · skilled · attentive · five stars",
    ],
    th: [
      "บริการมืออาชีพและเป็นส่วนตัว · ตามที่ concierge บอก",
      "ประสบการณ์พรีเมียม ตั้งแต่มาถึงจนจบ · ราบรื่นมาก",
      "น้องดูแลดีมาก · แนะนำเต็มที่",
      "คุ้มทุกบาท · concierge ระดับ top",
      "เป็นส่วนตัว · มืออาชีพ · ใส่ใจ · 5 ดาว",
    ],
    zh: [
      "专业又私密 · 体验完全符合预期",
      "全程顺畅 · 高端体验",
      "技师非常用心 · 强烈推荐",
      "物超所值 · 礼宾服务一流",
      "私密 · 专业 · 周到 · 五星推荐",
    ],
    "zh-TW": [
      "專業又私密 · 體驗完全符合預期",
      "全程順暢 · 高端體驗",
      "技師非常用心 · 強烈推薦",
      "物超所值 · 禮賓服務一流",
      "私密 · 專業 · 周到 · 五星推薦",
    ],
    ja: [
      "プロフェッショナルで丁寧 · 期待通りの体験",
      "到着から最後まで · 完璧なホスピタリティ",
      "セラピストの対応が素晴らしかったです",
      "値段以上の価値 · コンシェルジュも一流",
      "落ち着いた · 上品な · 最高の時間でした",
    ],
    ko: [
      "전문적이고 신중 · 컨시어지 설명 그대로",
      "도착부터 끝까지 · 프리미엄 경험",
      "프랙티셔너가 정말 친절했어요",
      "가격 이상의 가치 · 강력 추천",
      "신중 · 전문적 · 세심 · 별 다섯 개",
    ],
  },

  // ─── SunRed Therapeutic (continuous-contact / B2B/nuru genre) ──
  "SR-B2B3200": {
    en: [
      "Premium ritual · feels properly luxurious",
      "Practitioner was exceptional · the ceremony is unique",
      "Best whole-body oil work I've experienced in Asia",
      "Worth the price · ritual quality is on another level",
      "Concierge nailed the recommendation · came back the next trip",
    ],
    th: [
      "พิธีกรรมพรีเมียม · รู้สึกหรูหราจริงๆ",
      "น้องเก่งมาก · พิธีกรรมแบบนี้หาที่อื่นไม่ได้",
      "งานน้ำมันทั้งตัวที่ดีที่สุดที่เคยได้ในเอเชีย",
      "คุ้มราคา · คุณภาพพิธีกรรมระดับเดียวไม่มี",
      "Concierge แนะนำตรงใจมาก · กลับมาทริปหน้าด้วย",
    ],
    zh: [
      "高端仪式 · 真正的奢华体验",
      "技师水平极高 · 这种仪式独一无二",
      "亚洲体验过最好的全身精油按摩",
      "物有所值 · 仪式品质遥遥领先",
      "礼宾推荐非常准 · 下次出差还会预约",
    ],
    "zh-TW": [
      "高端儀式 · 真正的奢華體驗",
      "技師水準極高 · 這種儀式獨一無二",
      "亞洲體驗過最好的全身精油按摩",
      "物有所值 · 儀式品質遙遙領先",
      "禮賓推薦非常準 · 下次出差還會預約",
    ],
    ja: [
      "プレミアムな儀式 · 本物の贅沢体験",
      "セラピストが素晴らしく · 唯一無二の体験",
      "アジアで一番の全身オイル施術でした",
      "値段以上 · クオリティが別格",
      "コンシェルジュの推薦が完璧 · また予約します",
    ],
    ko: [
      "프리미엄 의식 · 진짜 럭셔리한 경험",
      "프랙티셔너 실력 최고 · 독특한 의식",
      "아시아에서 가장 좋은 전신 오일 시술",
      "가격 이상의 가치 · 다른 차원의 품질",
      "컨시어지 추천 완벽 · 다음에 또 옵니다",
    ],
  },
};

/**
 * Best-effort language inference from phone country code.
 *   +66    → th
 *   +86    → zh (mainland — Simplified)
 *   +852/+853/+886 → zh-TW (HK/Macau/Taiwan — Traditional)
 *   +81    → ja
 *   +82    → ko
 *   else   → en
 */
export function inferLangFromPhone(phone?: string | null): ReviewLang {
  if (!phone) return "en";
  const p = phone.replace(/\s|-/g, "");
  if (p.startsWith("+66") || p.startsWith("66")) return "th";
  if (p.startsWith("+86") || p.startsWith("86")) return "zh";
  // 🆕 Round 28x.99f — HK/Macau/Taiwan read Traditional, not Simplified;
  // previously lumped in with +86 and served the wrong script.
  if (
    p.startsWith("+852") ||
    p.startsWith("+853") ||
    p.startsWith("+886")
  )
    return "zh-TW";
  if (p.startsWith("+81") || p.startsWith("81")) return "ja";
  if (p.startsWith("+82") || p.startsWith("82")) return "ko";
  return "en";
}

/**
 * Random pick a template for a given service + lang. Returns "" if no
 * mapping (caller handles fallback).
 */
export function pickTemplate(
  serviceId: string,
  lang: ReviewLang,
): string {
  const svc = REVIEW_TEMPLATES[serviceId as ReviewServiceKey];
  if (!svc) return "";
  const arr = svc[lang] ?? svc.en;
  if (!arr || arr.length === 0) return "";
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * All templates for a service in a lang (UI dropdown).
 */
export function templatesFor(
  serviceId: string,
  lang: ReviewLang,
): string[] {
  const svc = REVIEW_TEMPLATES[serviceId as ReviewServiceKey];
  if (!svc) return [];
  return svc[lang] ?? svc.en ?? [];
}

export const LANG_LABELS: Record<ReviewLang, string> = {
  en: "EN · English",
  th: "TH · ไทย",
  zh: "ZH · 中文（简体）",
  "zh-TW": "ZH-TW · 中文（繁體）",
  ja: "JA · 日本語",
  ko: "KO · 한국어",
};
