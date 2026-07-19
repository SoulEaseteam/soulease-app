// functions/src/telegram-concierge-bot/faq.ts
//
// 🆕 Round 28s125 — FAQ content for the concierge bot. Customers tap a
//   button on the welcome menu → bot replies in-place with the right
//   FAQ entry in their language. Lets View off-load ~80% of routine
//   inquiries (pricing · services · areas · how-to-book) without ever
//   personally typing a response.
//
// All copy maintained here so editorial updates don't require a code
// hunt. Pricing is hardcoded — kept in sync with CLAUDE.md §2 and
// src/utils/servicePricing.ts. When prices change, update both.

import type { Lang } from "./greetings";

export type FaqKey = "pricing" | "services" | "areas" | "howto" | "membership";

export interface FaqEntry {
  title: string;
  body: string;
}

// ─────────────────────────────────────────────────────────────
// PRICING — kept in sync with src/utils/servicePricing.ts
//   DURATION_PRICE_OVERRIDES (Round 28w.36, replaced the old
//   ×1.5/×2.0 multiplier — Thai & Aroma keep 60/90/120, Gentleman's
//   & Therapeutic moved to 70/120 only, no 60/90 tier).
//   🆕 28x.82 (founder screenshot: bot quoting stale ×1.5/×2.0
//   prices) — this block had never been updated after 28w.36 shipped.
//   Thai     1,200 / 1,600 / 2,000  (60 · 90 · 120)
//   Aroma    1,400 / 1,800 / 2,400  (60 · 90 · 120)
//   Gent     2,200 / 3,000          (70 · 120 — no 60/90)
//   Thrptc   3,200 / 4,000          (70 · 120 — no 60/90)
// ─────────────────────────────────────────────────────────────
const PRICING: Record<Lang, FaqEntry> = {
  en: {
    title: "💰 Pricing",
    body:
      `<b>SunRed Pricing</b>\n` +
      `\n` +
      `🌿 Thai Massage (60 · 90 · 120 min)\n` +
      `฿1,200 · ฿1,600 · ฿2,000\n` +
      `\n` +
      `🌸 Aromatherapy (60 · 90 · 120 min)\n` +
      `฿1,400 · ฿1,800 · ฿2,400\n` +
      `\n` +
      `💎 Gentleman's Signature (70 · 120 min)\n` +
      `฿2,200 · ฿3,000\n` +
      `\n` +
      `✨ SunRed Therapeutic (70 · 120 min)\n` +
      `฿3,200 · ฿4,000\n` +
      `\n` +
      `<i>Travel surcharge may apply for areas beyond central Bangkok.\n` +
      `Cash · PromptPay · WeChat Pay · Alipay accepted (+5%+฿200 surcharge for WeChat / Alipay).</i>`,
  },
  th: {
    title: "💰 ราคา",
    body:
      `<b>ราคา SunRed</b>\n` +
      `\n` +
      `🌿 นวดไทย (60 · 90 · 120 นาที)\n` +
      `฿1,200 · ฿1,600 · ฿2,000\n` +
      `\n` +
      `🌸 อโรมา (60 · 90 · 120 นาที)\n` +
      `฿1,400 · ฿1,800 · ฿2,400\n` +
      `\n` +
      `💎 Gentleman's Signature (70 · 120 นาที)\n` +
      `฿2,200 · ฿3,000\n` +
      `\n` +
      `✨ SunRed Therapeutic (70 · 120 นาที)\n` +
      `฿3,200 · ฿4,000\n` +
      `\n` +
      `<i>ค่าเดินทางอาจเพิ่มถ้านอกพื้นที่กลางกรุง\n` +
      `รับ เงินสด · PromptPay · WeChat Pay · Alipay (WeChat/Alipay +5%+฿200)</i>`,
  },
  zh: {
    title: "💰 价格",
    body:
      `<b>SunRed 价格</b>\n` +
      `\n` +
      `🌿 泰式按摩 (60 · 90 · 120分钟)\n` +
      `฿1,200 · ฿1,600 · ฿2,000\n` +
      `\n` +
      `🌸 芳香疗法 (60 · 90 · 120分钟)\n` +
      `฿1,400 · ฿1,800 · ฿2,400\n` +
      `\n` +
      `💎 绅士尊享 (70 · 120分钟)\n` +
      `฿2,200 · ฿3,000\n` +
      `\n` +
      `✨ SunRed Therapeutic (70 · 120分钟)\n` +
      `฿3,200 · ฿4,000\n` +
      `\n` +
      `<i>偏远地区可能加收交通费\n` +
      `现金 · PromptPay · 微信支付 · 支付宝 (微信/支付宝加收 5%+฿200 手续费)</i>`,
  },
  ja: {
    title: "💰 料金",
    body:
      `<b>SunRed 料金</b>\n` +
      `\n` +
      `🌿 タイマッサージ (60分 · 90分 · 120分)\n` +
      `฿1,200 · ฿1,600 · ฿2,000\n` +
      `\n` +
      `🌸 アロマセラピー (60分 · 90分 · 120分)\n` +
      `฿1,400 · ฿1,800 · ฿2,400\n` +
      `\n` +
      `💎 ジェントルマンズ・シグネチャー (70分 · 120分)\n` +
      `฿2,200 · ฿3,000\n` +
      `\n` +
      `✨ SunRed セラピューティック (70分 · 120分)\n` +
      `฿3,200 · ฿4,000\n` +
      `\n` +
      `<i>中心地以外は交通費別途\n` +
      `現金 · PromptPay · WeChat Pay · Alipay (WeChat/Alipay は +5%+฿200 手数料)</i>`,
  },
  ko: {
    title: "💰 가격",
    body:
      `<b>SunRed 가격</b>\n` +
      `\n` +
      `🌿 타이 마사지 (60분 · 90분 · 120분)\n` +
      `฿1,200 · ฿1,600 · ฿2,000\n` +
      `\n` +
      `🌸 아로마테라피 (60분 · 90분 · 120분)\n` +
      `฿1,400 · ฿1,800 · ฿2,400\n` +
      `\n` +
      `💎 젠틀맨즈 시그니처 (70분 · 120분)\n` +
      `฿2,200 · ฿3,000\n` +
      `\n` +
      `✨ SunRed 테라퓨틱 (70분 · 120분)\n` +
      `฿3,200 · ฿4,000\n` +
      `\n` +
      `<i>중심부 외 지역 교통비 별도\n` +
      `현금 · PromptPay · 위챗페이 · 알리페이 (위챗/알리페이 5%+฿200 추가)</i>`,
  },
};

// ─────────────────────────────────────────────────────────────
// SERVICES
// ─────────────────────────────────────────────────────────────
const SERVICES: Record<Lang, FaqEntry> = {
  en: {
    title: "📋 Services",
    body:
      `<b>SunRed Services</b>\n` +
      `\n` +
      `✓ Premium outcall massage (to your hotel/residence)\n` +
      `✓ 60 · 90 · 120 minute sessions\n` +
      `✓ Verified female practitioners only\n` +
      `✓ 5 languages: EN · 中文 · 日本語 · 한국어 · Thai\n` +
      `✓ 24/7 concierge\n` +
      `\n` +
      `<b>4 therapy options:</b>\n` +
      `🌿 Thai Massage — deep muscle tension work\n` +
      `🌸 Aromatherapy — relaxing aromatic oil\n` +
      `💎 Gentleman's Signature — focused aromatic ritual for men\n` +
      `✨ SunRed Therapeutic — signature flowing oil ceremony\n` +
      `\n` +
      `Browse all therapists at <a href="https://sunred.vip">sunred.vip</a>`,
  },
  th: {
    title: "📋 บริการ",
    body:
      `<b>บริการ SunRed</b>\n` +
      `\n` +
      `✓ นวดส่งถึงที่ (โรงแรม · คอนโด · ที่พัก)\n` +
      `✓ 60 · 90 · 120 นาที\n` +
      `✓ นักบำบัดหญิงผ่านการตรวจสอบ\n` +
      `✓ 5 ภาษา: ไทย · EN · 中文 · 日本語 · 한국어\n` +
      `✓ Concierge 24/7\n` +
      `\n` +
      `<b>4 บริการ:</b>\n` +
      `🌿 นวดไทย — แก้เมื่อยกล้ามเนื้อลึก\n` +
      `🌸 อโรมา — น้ำมันหอมระเหยผ่อนคลาย\n` +
      `💎 Gentleman's Signature — บริการเฉพาะสุภาพบุรุษ\n` +
      `✨ SunRed Therapeutic — ทรีตเมนต์ระดับสูง\n` +
      `\n` +
      `ดูนักบำบัดทั้งหมด: <a href="https://sunred.vip">sunred.vip</a>`,
  },
  zh: {
    title: "📋 服务",
    body:
      `<b>SunRed 服务</b>\n` +
      `\n` +
      `✓ 高端外送按摩 (送达酒店/住所)\n` +
      `✓ 60 · 90 · 120 分钟\n` +
      `✓ 仅认证女性治疗师\n` +
      `✓ 5 语言: 中文 · EN · 日本語 · 한국어 · ไทย\n` +
      `✓ 24/7 管家服务\n` +
      `\n` +
      `<b>4 项疗法:</b>\n` +
      `🌿 泰式按摩 — 深层肌肉舒缓\n` +
      `🌸 芳香疗法 — 放松精油\n` +
      `💎 绅士尊享 — 男士专属芳香仪式\n` +
      `✨ SunRed Therapeutic — 招牌全身精油仪式\n` +
      `\n` +
      `查看所有治疗师: <a href="https://sunred.vip">sunred.vip</a>`,
  },
  ja: {
    title: "📋 サービス",
    body:
      `<b>SunRed サービス</b>\n` +
      `\n` +
      `✓ プレミアム出張マッサージ (ホテル/住居)\n` +
      `✓ 60 · 90 · 120 分\n` +
      `✓ 認証済み女性セラピストのみ\n` +
      `✓ 5 か国語: 日本語 · EN · 中文 · 한국어 · ไทย\n` +
      `✓ 24時間コンシェルジュ\n` +
      `\n` +
      `<b>4 つのセラピー:</b>\n` +
      `🌿 タイマッサージ — 深層筋肉ケア\n` +
      `🌸 アロマセラピー — リラックスアロマオイル\n` +
      `💎 ジェントルマンズ — 男性向け専門ケア\n` +
      `✨ SunRed セラピューティック — 究極のオイル儀式\n` +
      `\n` +
      `全セラピストを見る: <a href="https://sunred.vip">sunred.vip</a>`,
  },
  ko: {
    title: "📋 서비스",
    body:
      `<b>SunRed 서비스</b>\n` +
      `\n` +
      `✓ 프리미엄 출장 마사지 (호텔/거주지)\n` +
      `✓ 60 · 90 · 120분\n` +
      `✓ 인증된 여성 치료사만\n` +
      `✓ 5개 국어: 한국어 · EN · 中文 · 日本語 · ไทย\n` +
      `✓ 24/7 컨시어지\n` +
      `\n` +
      `<b>4가지 테라피:</b>\n` +
      `🌿 타이 마사지 — 깊은 근육 이완\n` +
      `🌸 아로마테라피 — 편안한 아로마 오일\n` +
      `💎 젠틀맨즈 — 남성 전용 아로마 의식\n` +
      `✨ SunRed 테라퓨틱 — 시그니처 전신 오일 의식\n` +
      `\n` +
      `전체 치료사 보기: <a href="https://sunred.vip">sunred.vip</a>`,
  },
};

// ─────────────────────────────────────────────────────────────
// AREAS
// ─────────────────────────────────────────────────────────────
const AREAS: Record<Lang, FaqEntry> = {
  en: {
    title: "📍 Service Area",
    body:
      `<b>Bangkok Coverage</b>\n` +
      `\n` +
      `Central core:\n` +
      `• Sukhumvit · Asok · Phrom Phong · Thonglor · Ekkamai\n` +
      `• Silom · Sathorn · Surawong\n` +
      `• Siam · Pratunam · Ratchada\n` +
      `• Huai Khwang · Din Daeng · RCA\n` +
      `• Rama 4 · Rama 9 · Lat Phrao\n` +
      `\n` +
      `Travel time: <b>30-60 min</b> for central Bangkok\n` +
      `Surcharge may apply for areas beyond.`,
  },
  th: {
    title: "📍 พื้นที่บริการ",
    body:
      `<b>พื้นที่ในกรุงเทพ</b>\n` +
      `\n` +
      `ใจกลางเมือง:\n` +
      `• สุขุมวิท · อโศก · พร้อมพงษ์ · ทองหล่อ · เอกมัย\n` +
      `• สีลม · สาทร · สุรวงศ์\n` +
      `• สยาม · ประตูน้ำ · รัชดา\n` +
      `• ห้วยขวาง · ดินแดง · RCA\n` +
      `• พระราม 4 · พระราม 9 · ลาดพร้าว\n` +
      `\n` +
      `เวลาเดินทาง: <b>30-60 นาที</b> ในพื้นที่กลางกรุง\n` +
      `ค่าเดินทางอาจเพิ่มถ้านอกพื้นที่`,
  },
  zh: {
    title: "📍 服务区域",
    body:
      `<b>曼谷覆盖范围</b>\n` +
      `\n` +
      `中心区:\n` +
      `• 苏坤蔚 · 阿索克 · 帕蓬 · 通罗 · 艾卡迈\n` +
      `• 是隆 · 沙吞 · 苏里翁\n` +
      `• 暹罗 · 帕图南 · 拉差达\n` +
      `• 华伊街 · 迪丹丁 · RCA\n` +
      `• 拉玛四世 · 拉玛九世 · 拉抛\n` +
      `\n` +
      `到达时间: 中心地区 <b>30-60 分钟</b>\n` +
      `偏远地区可能加收交通费`,
  },
  ja: {
    title: "📍 対応エリア",
    body:
      `<b>バンコク対応エリア</b>\n` +
      `\n` +
      `中心エリア:\n` +
      `• スクンビット · アソーク · プロンポン · トンロー · エカマイ\n` +
      `• シーロム · サートーン · スラウォン\n` +
      `• サイアム · プラトゥナム · ラチャダー\n` +
      `• フアイクワーン · ディンデーン · RCA\n` +
      `• ラマ4世 · ラマ9世 · ラップラオ\n` +
      `\n` +
      `到着時間: 中心地は <b>30-60分</b>\n` +
      `中心地以外は交通費別途`,
  },
  ko: {
    title: "📍 서비스 지역",
    body:
      `<b>방콕 커버리지</b>\n` +
      `\n` +
      `중심부:\n` +
      `• 수쿰빗 · 아속 · 프롬퐁 · 통러 · 에카마이\n` +
      `• 실롬 · 사톤 · 수라웡\n` +
      `• 사이암 · 프라투남 · 라차다\n` +
      `• 후아이콴 · 딘다엥 · RCA\n` +
      `• 라마4세 · 라마9세 · 랏프라오\n` +
      `\n` +
      `이동 시간: 중심부 <b>30-60분</b>\n` +
      `중심부 외 지역은 교통비 추가`,
  },
};

// ─────────────────────────────────────────────────────────────
// HOW TO BOOK
// ─────────────────────────────────────────────────────────────
const HOW_TO_BOOK: Record<Lang, FaqEntry> = {
  en: {
    title: "📖 How to book",
    body:
      `<b>Booking Process</b>\n` +
      `\n` +
      `1. Tap <b>💬 Open concierge chat</b> below\n` +
      `2. Tell us:\n` +
      `   • Service (Thai · Aroma · Gentleman's · Therapeutic)\n` +
      `   • Duration (60 · 90 · 120 min)\n` +
      `   • Practitioner (or "any")\n` +
      `   • Your hotel/address\n` +
      `   • Time tonight\n` +
      `3. Concierge confirms availability\n` +
      `4. Practitioner arrives 30-60 min later\n` +
      `5. Payment after service (cash · PromptPay · etc.)\n` +
      `\n` +
      `Need to browse therapists first? <a href="https://sunred.vip">sunred.vip</a>`,
  },
  th: {
    title: "📖 ขั้นตอนจอง",
    body:
      `<b>ขั้นตอนการจอง</b>\n` +
      `\n` +
      `1. กด <b>💬 คุยกับ concierge</b> ด้านล่าง\n` +
      `2. บอกเรา:\n` +
      `   • บริการ (ไทย · อโรมา · Gentleman's · Therapeutic)\n` +
      `   • ระยะเวลา (60 · 90 · 120 นาที)\n` +
      `   • นักบำบัด (หรือ "คนไหนก็ได้")\n` +
      `   • โรงแรม/ที่อยู่\n` +
      `   • เวลาคืนนี้\n` +
      `3. Concierge ยืนยันว่าง\n` +
      `4. นักบำบัดมาภายใน 30-60 นาที\n` +
      `5. ชำระเงินหลังเสร็จ (เงินสด · PromptPay · ฯลฯ)\n` +
      `\n` +
      `อยากดูนักบำบัดก่อน? <a href="https://sunred.vip">sunred.vip</a>`,
  },
  zh: {
    title: "📖 预约流程",
    body:
      `<b>预约步骤</b>\n` +
      `\n` +
      `1. 点击下方 <b>💬 联系管家</b>\n` +
      `2. 告诉我们:\n` +
      `   • 服务 (泰式 · 芳香 · 绅士尊享 · Therapeutic)\n` +
      `   • 时长 (60 · 90 · 120 分钟)\n` +
      `   • 治疗师 (或 "任何")\n` +
      `   • 您的酒店/地址\n` +
      `   • 今晚的时间\n` +
      `3. 管家确认可预约\n` +
      `4. 治疗师 30-60 分钟内到达\n` +
      `5. 服务后付款 (现金 · 微信支付 等)\n` +
      `\n` +
      `先浏览治疗师? <a href="https://sunred.vip">sunred.vip</a>`,
  },
  ja: {
    title: "📖 予約方法",
    body:
      `<b>予約の流れ</b>\n` +
      `\n` +
      `1. 下の <b>💬 コンシェルジュとチャット</b> をタップ\n` +
      `2. 以下をお伝えください:\n` +
      `   • サービス (タイ式 · アロマ · ジェントルマンズ · Therapeutic)\n` +
      `   • 時間 (60 · 90 · 120 分)\n` +
      `   • セラピスト (または「お任せ」)\n` +
      `   • ホテル/住所\n` +
      `   • 今夜の時間\n` +
      `3. コンシェルジュが空き状況を確認\n` +
      `4. セラピストが 30-60 分以内に到着\n` +
      `5. 施術後にお支払い (現金 · PromptPay 等)\n` +
      `\n` +
      `先にセラピストを見る? <a href="https://sunred.vip">sunred.vip</a>`,
  },
  ko: {
    title: "📖 예약 방법",
    body:
      `<b>예약 절차</b>\n` +
      `\n` +
      `1. 아래 <b>💬 컨시어지와 채팅</b> 누르기\n` +
      `2. 다음 정보 알려주세요:\n` +
      `   • 서비스 (타이 · 아로마 · 젠틀맨즈 · Therapeutic)\n` +
      `   • 시간 (60 · 90 · 120분)\n` +
      `   • 치료사 (또는 "아무나")\n` +
      `   • 호텔/주소\n` +
      `   • 오늘 밤 시간\n` +
      `3. 컨시어지가 예약 가능 확인\n` +
      `4. 치료사 30-60분 내 도착\n` +
      `5. 서비스 후 결제 (현금 · PromptPay 등)\n` +
      `\n` +
      `먼저 치료사 보기? <a href="https://sunred.vip">sunred.vip</a>`,
  },
};

// ─────────────────────────────────────────────────────────────
// MEMBERSHIP — kept in sync with src/utils/membership.ts (thresholds)
//   + src/components/membership/MembershipCard.tsx (TIER_META % off).
//   🆕 28x.83 (founder: "เพิ่มปุ่ม/เมนู Membership") — tier discount is
//   DISPLAY-ONLY in the app (not auto-applied at checkout — see
//   MembershipCard.tsx comment), so this copy says the concierge
//   applies it, matching how every other discount actually works here.
// ─────────────────────────────────────────────────────────────
const MEMBERSHIP: Record<Lang, FaqEntry> = {
  en: {
    title: "👑 Membership",
    body:
      `<b>SunRed Membership</b>\n` +
      `\n` +
      `Your tier is automatic, based on visits + spend on an account\n` +
      `(not guest checkout) — no separate sign-up needed.\n` +
      `\n` +
      `🥉 Bronze — 5% off · from 1 visit or ฿1,000\n` +
      `🥈 Silver — 10% off · from 3 visits or ฿6,000\n` +
      `🥇 Gold — 15% off · from 6 visits or ฿15,000\n` +
      `⚫ Black VIP — 20% off · from 12 visits or ฿40,000\n` +
      `\n` +
      `<i>Priority booking · points toward rewards.\n` +
      `Your concierge applies your tier discount at reservation.</i>`,
  },
  th: {
    title: "👑 สมาชิก",
    body:
      `<b>สมาชิก SunRed</b>\n` +
      `\n` +
      `ระดับสมาชิกคำนวณอัตโนมัติ จากจำนวนครั้ง + ยอดใช้จ่ายของบัญชี\n` +
      `(ต้องมีบัญชี ไม่ใช่จองแบบ guest) ไม่ต้องสมัครแยก\n` +
      `\n` +
      `🥉 บรอนซ์ — ลด 5% · ตั้งแต่ 1 ครั้ง หรือ ฿1,000\n` +
      `🥈 ซิลเวอร์ — ลด 10% · ตั้งแต่ 3 ครั้ง หรือ ฿6,000\n` +
      `🥇 โกลด์ — ลด 15% · ตั้งแต่ 6 ครั้ง หรือ ฿15,000\n` +
      `⚫ แบล็ค VIP — ลด 20% · ตั้งแต่ 12 ครั้ง หรือ ฿40,000\n` +
      `\n` +
      `<i>จองก่อนใคร · สะสมแต้มแลกรางวัล\n` +
      `Concierge จะใส่ส่วนลดให้ตอนยืนยันการจอง</i>`,
  },
  zh: {
    title: "👑 会员",
    body:
      `<b>SunRed 会员</b>\n` +
      `\n` +
      `会员等级根据账户的到访次数+消费金额自动计算\n` +
      `(需要账户，非访客预约) 无需另外申请\n` +
      `\n` +
      `🥉 青铜 — 优惠5% · 1次或฿1,000起\n` +
      `🥈 白银 — 优惠10% · 3次或฿6,000起\n` +
      `🥇 黄金 — 优惠15% · 6次或฿15,000起\n` +
      `⚫ 黑金VIP — 优惠20% · 12次或฿40,000起\n` +
      `\n` +
      `<i>优先预约 · 积分兑换礼品\n` +
      `礼宾会在确认预约时为您使用等级折扣</i>`,
  },
  ja: {
    title: "👑 メンバーシップ",
    body:
      `<b>SunRed メンバーシップ</b>\n` +
      `\n` +
      `会員ランクはアカウントの来店回数+利用金額で自動計算されます\n` +
      `(ゲスト予約ではなくアカウントが必要) 別途申込不要\n` +
      `\n` +
      `🥉 ブロンズ — 5%オフ · 1回または฿1,000から\n` +
      `🥈 シルバー — 10%オフ · 3回または฿6,000から\n` +
      `🥇 ゴールド — 15%オフ · 6回または฿15,000から\n` +
      `⚫ ブラックVIP — 20%オフ · 12回または฿40,000から\n` +
      `\n` +
      `<i>優先予約 · ポイント還元\n` +
      `予約確定時にコンシェルジュが割引を適用します</i>`,
  },
  ko: {
    title: "👑 멤버십",
    body:
      `<b>SunRed 멤버십</b>\n` +
      `\n` +
      `등급은 계정의 방문 횟수+이용 금액으로 자동 계산됩니다\n` +
      `(게스트 예약이 아닌 계정 필요) 별도 가입 불필요\n` +
      `\n` +
      `🥉 브론즈 — 5% 할인 · 1회 또는 ฿1,000부터\n` +
      `🥈 실버 — 10% 할인 · 3회 또는 ฿6,000부터\n` +
      `🥇 골드 — 15% 할인 · 6회 또는 ฿15,000부터\n` +
      `⚫ 블랙 VIP — 20% 할인 · 12회 또는 ฿40,000부터\n` +
      `\n` +
      `<i>우선 예약 · 포인트 적립\n` +
      `예약 확정 시 컨시어지가 등급 할인을 적용합니다</i>`,
  },
};

const ENTRIES: Record<FaqKey, Record<Lang, FaqEntry>> = {
  pricing: PRICING,
  services: SERVICES,
  areas: AREAS,
  howto: HOW_TO_BOOK,
  membership: MEMBERSHIP,
};

export function faqEntry(key: FaqKey, lang: Lang): FaqEntry {
  const langs = ENTRIES[key];
  return langs[lang] || langs.en;
}

// ─────────────────────────────────────────────────────────────
// Menu titles (used for inline keyboard labels) + back button
// ─────────────────────────────────────────────────────────────
export function menuTitleFor(key: FaqKey | "available" | "concierge", lang: Lang): string {
  const titles: Record<typeof key, Record<Lang, string>> = {
    pricing: {
      en: "💰 Pricing",
      th: "💰 ราคา",
      zh: "💰 价格",
      ja: "💰 料金",
      ko: "💰 가격",
    },
    services: {
      en: "📋 Services",
      th: "📋 บริการ",
      zh: "📋 服务",
      ja: "📋 サービス",
      ko: "📋 서비스",
    },
    areas: {
      en: "📍 Area",
      th: "📍 พื้นที่",
      zh: "📍 区域",
      ja: "📍 エリア",
      ko: "📍 지역",
    },
    howto: {
      en: "📖 How to book",
      th: "📖 ขั้นตอนจอง",
      zh: "📖 预约流程",
      ja: "📖 予約方法",
      ko: "📖 예약 방법",
    },
    membership: {
      en: "👑 Membership",
      th: "👑 สมาชิก",
      zh: "👑 会员",
      ja: "👑 メンバーシップ",
      ko: "👑 멤버십",
    },
    available: {
      en: "🌙 Available now",
      th: "🌙 ว่างตอนนี้",
      zh: "🌙 现在可预约",
      ja: "🌙 今すぐ対応可",
      ko: "🌙 지금 가능",
    },
    concierge: {
      en: "💬 Chat with concierge",
      th: "💬 คุยกับ concierge",
      zh: "💬 联系管家",
      ja: "💬 コンシェルジュへ",
      ko: "💬 컨시어지와 채팅",
    },
  };
  return titles[key][lang] || titles[key].en;
}

export function backLabel(lang: Lang): string {
  const m: Record<Lang, string> = {
    en: "◀ Back to menu",
    th: "◀ กลับเมนู",
    zh: "◀ 返回菜单",
    ja: "◀ メニューに戻る",
    ko: "◀ 메뉴로",
  };
  return m[lang] || m.en;
}

// ─────────────────────────────────────────────────────────────
// 🆕 28x.84 (founder: "กดแต่ละเมนู ลิ้งไปเว็บหน้านั้นๆ ได้ไหม") — each FAQ
//   reply keeps its in-Telegram text (so the bot still answers instantly)
//   but ALSO offers a button straight to the matching live page, for
//   guests who want the full visual site. Routes verified against
//   src/app/App.tsx; "membership" and "available" have no dedicated
//   route (both live as sections on home), so they point at "/".
// ─────────────────────────────────────────────────────────────
export function websiteUrlFor(key: FaqKey | "available"): string {
  const base = "https://sunred.vip";
  const paths: Record<FaqKey | "available", string> = {
    pricing: "/pricing",
    services: "/services",
    areas: "/near-me",
    howto: "/services?tab=how",
    membership: "/",
    available: "/",
  };
  return `${base}${paths[key]}`;
}

export function websiteLabel(lang: Lang): string {
  const m: Record<Lang, string> = {
    en: "🌐 View on website",
    th: "🌐 ดูบนเว็บ",
    zh: "🌐 网站查看",
    ja: "🌐 サイトで見る",
    ko: "🌐 웹사이트에서 보기",
  };
  return m[lang] || m.en;
}

// ─────────────────────────────────────────────────────────────
// AVAILABILITY — header text + empty state
// ─────────────────────────────────────────────────────────────
const AVAILABILITY_HEADERS: Record<Lang, string> = {
  en: "<b>🌙 Available right now</b>",
  th: "<b>🌙 ว่างตอนนี้</b>",
  zh: "<b>🌙 现在可预约</b>",
  ja: "<b>🌙 今すぐ対応可</b>",
  ko: "<b>🌙 지금 가능</b>",
};

const AVAILABILITY_EMPTY: Record<Lang, string> = {
  en:
    "<b>🌙 No one is on standby right now</b>\n\n" +
    "Tap <b>💬 Chat with concierge</b> below to ask about " +
    "tonight's roster or schedule for later.",
  th:
    "<b>🌙 ตอนนี้ยังไม่มีคน standby</b>\n\n" +
    "กด <b>💬 คุยกับ concierge</b> ด้านล่าง เพื่อสอบถามคิวคืนนี้",
  zh:
    "<b>🌙 目前没人 standby</b>\n\n" +
    "点击下方 <b>💬 联系管家</b> 询问今晚或之后的安排",
  ja:
    "<b>🌙 現在スタンバイ中のセラピストはいません</b>\n\n" +
    "下の <b>💬 コンシェルジュとチャット</b> から本日の予定をご相談ください",
  ko:
    "<b>🌙 현재 대기 중인 치료사가 없습니다</b>\n\n" +
    "아래 <b>💬 컨시어지와 채팅</b>으로 오늘 일정을 문의해주세요",
};

export function availabilityHeaderFor(lang: Lang): string {
  return AVAILABILITY_HEADERS[lang] || AVAILABILITY_HEADERS.en;
}

export function availabilityEmptyFor(lang: Lang): string {
  return AVAILABILITY_EMPTY[lang] || AVAILABILITY_EMPTY.en;
}
