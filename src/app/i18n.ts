// src/lib/i18n.ts
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { getLangPref } from "@/utils/langPref";

// 🆕 Round 28b13 (perf) — locales are now lazy-imported per language.
//   Previous: all 5 JSON files were eagerly bundled into main chunk
//   (~25 kB shipped to every visitor regardless of locale). Now: only
//   the active language's JSON loads on init; others fetch lazily on
//   `languageChanged` so t he user pays only for what they use.
//
// Vite parses these dynamic-import expressions and creates one chunk
// per locale automatically, with HTTP cache hashes.
type SupportedLocale = "en" | "th" | "zh" | "ja" | "ko";

async function loadLocaleBundle(lng: SupportedLocale) {
  switch (lng) {
    case "en":
      return (await import("@/locales/en/translation.json")).default;
    case "th":
      return (await import("@/locales/th/translation.json")).default;
    case "zh":
      return (await import("@/locales/zh/translation.json")).default;
    case "ja":
      return (await import("@/locales/ja/translation.json")).default;
    case "ko":
      return (await import("@/locales/ko/translation.json")).default;
  }
}

// i18n.init() return Promise — prefix `void` กัน floating promise warning
// (ไม่ต้อง await เพราะ resources โหลด sync จาก code อยู่แล้ว)
void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: "en",
    supportedLngs: ["en", "th", "zh", "ja", "ko"],
    // Round 28s63 (founder: auto-switch to the visitor's device
    // language) — device locales carry a region ("zh-CN", "zh-TW",
    // "ja-JP", "ko-KR", "en-US", "th-TH"). Our bundles are base
    // codes only. `load: "languageOnly"` strips the region so a
    // Chinese tourist on zh-CN/zh-TW lands on the zh bundle instead
    // of falling through to English; same for ja-JP → ja, ko-KR → ko.
    // `nonExplicitSupportedLngs` is the belt-and-suspenders: it lets
    // a region-coded detection resolve via its base language too.
    load: "languageOnly",
    nonExplicitSupportedLngs: true,
    debug: false,

    // ⚠️ flat keys — keys like "hero.title" / "hero.badge.verified" are stored
    //    as literal strings, not as a nested tree. Required because the inline
    //    `resources` block below uses dotted keys.
    keySeparator: false,
    nsSeparator: false,

    // 🆕 Round 28s223 — Founder report: "มือถือตั้งค่าจีน แต่เว็บไม่เป็น
    //   ภาษาจีน". Root cause: `localStorage` was first in the detection
    //   chain, so a stale "th" cached from any earlier session beat the
    //   visitor's actual device locale (zh-CN / zh-TW / ja-JP / ko-KR).
    //   Reordered to put `querystring` first (so ?lang= still wins for
    //   shared links) and `navigator` SECOND — device locale now wins
    //   over a stale cache on each visit, and the language switcher
    //   still persists an explicit user override via localStorage.
    //   Bumped lookupLocalStorage key to `i18nextLng_v2` so existing
    //   cached values stop applying on this deploy (one-time reset).
    detection: {
      order: ["querystring", "navigator", "localStorage", "htmlTag", "cookie", "path"],
      caches: ["localStorage", "cookie"],
      lookupQuerystring: "lang",
      lookupLocalStorage: "i18nextLng_v2",
    },

    interpolation: {
      escapeValue: false,
    },

    resources: {
      // ───────── English ─────────
      en: {
        translation: {
          bookNow: "Book Now",
          viewDetails: "View Details",
          hot: "🔥 Hot",
          top: "👑 Top",
          new: "🚀 New",
          distance: "Distance",
          rating: "Rating",
          reviews: "Reviews",
          image: "Image",
          available: "Available",
          bookable: "Bookable",
          resting: "Resting",
          holiday: "Holiday",
          // 🆕 Round 28s138 — Shared label for resting + holiday on
          //   the home card. Bookable keeps its own label (orange).
          offline: "Offline",
          // Hero
          "hero.title": "Outcall Massage in Bangkok",
          "hero.subtitle":
            "Verified practitioners • Live availability • English / 中文 / 日本語 / 한국어",
          "hero.badge.verified": "Verified",
          "hero.badge.always": "24 / 7",
          // Service filter chips
          "filter.all": "All",
          "filter.thai": "Thai",
          "filter.aroma": "Aroma",
          // 🆕 Round 28s132 — Therapist card UI
          "therapistCard.startingFrom": "Starting from",
          "therapistCard.bookNow": "Book Now",
          // Home
          "home.escorts": "Practitioners",
          "home.search": "Find your practitioner…",
          "home.subtitle": "Outcall Massage in Bangkok",
          "home.noResults": "No practitioners match your filters.",
          // 🆕 Round 28s224 — Meta rewrite. Search Console showed every
          // top-traffic query is English ("outcall massage bangkok",
          // "bangkok outcall massage", "outcall massage in bangkok",
          // "outcall massage sukhumvit", "massage near me"). Old title
          // led with brand + "#1" (a falsifiable superlative claim,
          // same category as the fake "4.8★ 1,200+" removed in 28s108).
          // New title puts the exact-match phrase first.
          "meta.home.title":
            "Outcall Massage Bangkok — Delivered to Your Hotel 24/7 | SunRed",
          "meta.home.description":
            "Premium outcall massage in Bangkok delivered to your hotel — Sukhumvit, Silom, Asok, Thonglor. Verified Thai practitioners, 24/7 live availability. Book in English, 中文, 日本語, 한국어.",
        },
      },

      // ───────── Thai ─────────
      th: {
        translation: {
          bookNow: "จองตอนนี้",
          viewDetails: "ดูรายละเอียด",
          hot: "🔥 ฮอต",
          top: "👑 ยอดนิยม",
          new: "🚀 ใหม่",
          distance: "ระยะทาง",
          rating: "คะแนน",
          reviews: "รีวิว",
          image: "รูปภาพ",
          available: "ว่าง",
          bookable: "จองได้",
          resting: "ไม่สามารถจองได้",
          holiday: "วันหยุด",
          offline: "ไม่ว่าง",
          "hero.title": "บริการนวดถึงที่ในกรุงเทพ",
          "hero.subtitle":
            "Practitioner ยืนยันตัวตน • จองสด 24 ชม. • รองรับ 5 ภาษา",
          "hero.badge.verified": "ยืนยันตัวตน",
          "hero.badge.always": "24 ชม.",
          "filter.all": "ทั้งหมด",
          "filter.thai": "นวดไทย",
          "filter.aroma": "อโรมา",
          "therapistCard.startingFrom": "ราคาเริ่มต้น",
          "therapistCard.bookNow": "จองเลย",
          "home.escorts": "Practitioner",
          "home.search": "ค้นหา practitioner…",
          "home.subtitle": "นวดถึงที่ในกรุงเทพ",
          "home.noResults": "ไม่พบ practitioner ที่ตรงกับการค้นหา",
          "meta.home.title":
            "บริการนวดถึงที่กรุงเทพ — ส่งถึงโรงแรม 24 ชม. | SunRed",
          "meta.home.description":
            "บริการนวดถึงที่ระดับหรูในกรุงเทพ ส่งถึงโรงแรม — สุขุมวิท สีลม อโศก ทองหล่อ Practitioner ยืนยันตัวตน เวลาว่างสดตลอด 24 ชั่วโมง รองรับ ไทย/EN/中文/日本語/한국어",
        },
      },

      // ───────── Chinese (Simplified — covers tw users via i18next fallback) ─────────
      zh: {
        translation: {
          bookNow: "立即预订",
          viewDetails: "查看详情",
          hot: "🔥 热门",
          top: "👑 顶级",
          new: "🚀 新品",
          distance: "距离",
          rating: "评分",
          reviews: "评价",
          image: "图片",
          available: "可用",
          bookable: "可预订",
          resting: "休息中",
          holiday: "休假",
          offline: "暂停接单",
          "hero.title": "曼谷上门按摩",
          "hero.subtitle":
            "认证技师 • 实时可订 • 支持英语 / 中文 / 日本語 / 한국어",
          "hero.badge.verified": "已认证",
          "hero.badge.always": "24 小时",
          "filter.all": "全部",
          "filter.thai": "泰式",
          "filter.aroma": "精油",
          "therapistCard.startingFrom": "起价",
          "therapistCard.bookNow": "立即预订",
          "home.escorts": "技师",
          "home.search": "搜索技师…",
          "home.subtitle": "曼谷上门按摩",
          "home.noResults": "没有符合条件的技师。",
          "meta.home.title":
            "曼谷上门按摩 24小时 · 送达酒店 — 泰式 / 精油 / 尊享理疗 | SunRed",
          "meta.home.description":
            "SunRed 曼谷上门按摩，认证女性技师送达酒店 — 苏坤蔚、是隆、阿索克、通罗等核心地段。泰式、芳香精油、尊享理疗。实时空闲、24小时可订、支持微信支付与支付宝。",
        },
      },

      // ───────── Japanese ─────────
      ja: {
        translation: {
          bookNow: "今すぐ予約",
          viewDetails: "詳細を見る",
          hot: "🔥 人気",
          top: "👑 トップ",
          new: "🚀 新着",
          distance: "距離",
          rating: "評価",
          reviews: "レビュー",
          image: "画像",
          available: "対応可",
          bookable: "予約可能",
          resting: "休憩中",
          holiday: "休業日",
          offline: "受付停止",
          "hero.title": "バンコク出張マッサージ",
          "hero.subtitle":
            "認定セラピスト • リアルタイム予約 • EN/中文/日本語/한국어 対応",
          "hero.badge.verified": "認証済",
          "hero.badge.always": "24時間",
          "filter.all": "すべて",
          "filter.thai": "タイ式",
          "filter.aroma": "アロマ",
          "therapistCard.startingFrom": "料金",
          "therapistCard.bookNow": "今すぐ予約",
          "home.escorts": "セラピスト",
          "home.search": "セラピストを探す…",
          "home.subtitle": "バンコク出張マッサージ",
          "home.noResults": "条件に合うセラピストが見つかりません。",
          "meta.home.title":
            "バンコク出張マッサージ 24時間 · ホテルへお届け — タイ古式 / アロマ / メンズ | SunRed",
          "meta.home.description":
            "SunRed バンコク高級出張マッサージ。認定セラピストがホテルへ訪問 — スクンビット、シーロム、アソーク、トンロー。タイ古式、アロマ、メンズシグネチャー。日本語OK、リアルタイム予約、24時間対応。",
        },
      },

      // ───────── Korean ─────────
      ko: {
        translation: {
          bookNow: "지금 예약",
          viewDetails: "자세히 보기",
          hot: "🔥 인기",
          top: "👑 최상",
          new: "🚀 신규",
          distance: "거리",
          rating: "평점",
          reviews: "리뷰",
          image: "이미지",
          available: "가능",
          bookable: "예약 가능",
          resting: "휴식 중",
          holiday: "휴일",
          offline: "예약 불가",
          "hero.title": "방콕 출장 마사지",
          "hero.subtitle":
            "인증 테라피스트 • 실시간 예약 • EN/中文/日本語/한국어 지원",
          "hero.badge.verified": "인증됨",
          "hero.badge.always": "24시간",
          "filter.all": "전체",
          "filter.thai": "타이",
          "filter.aroma": "아로마",
          "therapistCard.startingFrom": "가격",
          "therapistCard.bookNow": "지금 예약",
          "home.escorts": "테라피스트",
          "home.search": "테라피스트 검색…",
          "home.subtitle": "방콕 출장 마사지",
          "home.noResults": "조건에 맞는 테라피스트가 없습니다.",
          "meta.home.title":
            "방콕 출장 마사지 24시간 · 호텔로 방문 — 타이 / 아로마 / 시그니처 | SunRed",
          "meta.home.description":
            "SunRed 방콕 프리미엄 출장 마사지. 인증 테라피스트가 호텔·레지던스로 방문 — 수쿰빗, 실롬, 아속, 통러. 타이·아로마·젠틀맨 시그니처. 한국어 가능, 실시간 예약, 24시간 운영.",
        },
      },
    },
  });

// ─────────────────────────────────────────────────────────────────────
// 🆕 Round 28b13 (perf) — locales load lazily.
//   On init: load ONLY the active language. Others fetch on the first
//   `languageChanged` event the user triggers. The inline `resources`
//   block above provides safe fallback strings for every key, so the
//   UI never shows raw key codes during the brief locale-fetch window.
// ─────────────────────────────────────────────────────────────────────
const SUPPORTED: ReadonlySet<SupportedLocale> = new Set([
  "en",
  "th",
  "zh",
  "ja",
  "ko",
]);
const loaded = new Set<SupportedLocale>();

async function ensureLocale(lng: string) {
  const norm = (lng || "en").split("-")[0] as SupportedLocale;
  if (!SUPPORTED.has(norm)) return;
  if (loaded.has(norm)) return;
  try {
    const bundle = await loadLocaleBundle(norm);
    i18n.addResourceBundle(
      norm,
      "translation",
      bundle,
      /*deep*/ true,
      /*overwrite*/ true
    );
    loaded.add(norm);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn("[i18n] failed to load locale", norm, e);
  }
}

// 🆕 Round 28x.57 — apply the guest's EXPLICIT language choice (Profile →
//   Language). It has to happen here, after init, because the detection order
//   above deliberately puts `navigator` ahead of localStorage (28s223), so
//   i18next's own cache can never outrank the device locale. No explicit
//   choice → nothing happens and the device locale still wins.
const explicitLang = getLangPref();
if (explicitLang && explicitLang !== i18n.language) {
  void i18n.changeLanguage(explicitLang);
}

// Kick off active locale load (after init has resolved the language)
void ensureLocale(i18n.language);
// Fetch additional locales on user switch
i18n.on("languageChanged", (lng) => {
  void ensureLocale(lng);
});

export default i18n;
