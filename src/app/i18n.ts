// src/lib/i18n.ts
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

// 🌐 Phase-1 (redesign/foundation) hero locales — source of truth for hero
//    keys. Loaded after init via addResourceBundle so they OVERRIDE the
//    older inline keys below. Other (non-hero) keys keep their existing
//    inline values until they're migrated to JSON in Task 7 (i18n sweep).
import heroEn from "@/locales/en/translation.json";
import heroTh from "@/locales/th/translation.json";
import heroZh from "@/locales/zh/translation.json";
import heroJa from "@/locales/ja/translation.json";
import heroKo from "@/locales/ko/translation.json";

// i18n.init() return Promise — prefix `void` กัน floating promise warning
// (ไม่ต้อง await เพราะ resources โหลด sync จาก code อยู่แล้ว)
void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: "en",
    supportedLngs: ["en", "th", "zh", "ja", "ko"],
    debug: false,

    // ⚠️ flat keys — keys like "hero.title" / "hero.badge.verified" are stored
    //    as literal strings, not as a nested tree. Required because the inline
    //    `resources` block below uses dotted keys.
    keySeparator: false,
    nsSeparator: false,

    detection: {
      order: ["localStorage", "querystring", "navigator", "htmlTag", "cookie", "path"],
      caches: ["localStorage", "cookie"],
      lookupQuerystring: "lang",
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
          // Hero
          "hero.title": "Bangkok's #1 Outcall Massage",
          "hero.subtitle":
            "Verified therapists • Live availability • English / 中文 / 日本語 / 한국어",
          "hero.badge.verified": "Verified",
          "hero.badge.always": "24 / 7",
          "hero.badge.rating": "4.8 ★ • 1,200+",
          // Service filter chips
          "filter.all": "All",
          "filter.thai": "Thai",
          "filter.aroma": "Aroma",
          "filter.couple": "Couple",
          // Home
          "home.escorts": "Escorts",
          "home.search": "Search name…",
          "home.subtitle": "Outcall Massage in Bangkok",
          "home.noResults": "No therapists match your filters.",
          // Meta (per-page)
          "meta.home.title":
            "SUNRED Bangkok • #1 Luxury Outcall Massage • EN/中文/日本語/한국어",
          "meta.home.description":
            "Bangkok's #1 luxury outcall massage. Verified therapists delivered to your hotel — Sukhumvit, Silom, Asok, Thonglor & all major areas. English, 中文, 日本語, 한국어. 24/7 live availability.",
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
          "hero.title": "นวดถึงที่ระดับหรู #1 กรุงเทพ",
          "hero.subtitle":
            "หมอนวดยืนยันตัวตน • จองสด 24 ชม. • รองรับ 5 ภาษา",
          "hero.badge.verified": "ยืนยันตัวตน",
          "hero.badge.always": "24 ชม.",
          "hero.badge.rating": "4.8 ★ • 1,200+",
          "filter.all": "ทั้งหมด",
          "filter.thai": "นวดไทย",
          "filter.aroma": "อโรมา",
          "filter.couple": "นวดคู่",
          "home.escorts": "นักบำบัด",
          "home.search": "ค้นหาชื่อ…",
          "home.subtitle": "นวดถึงที่ในกรุงเทพ",
          "home.noResults": "ไม่พบนักบำบัดที่ตรงกับการค้นหา",
          "meta.home.title":
            "SUNRED Bangkok • บริการนวดถึงที่หรูระดับ #1 • EN/ไทย/中文/日本語/한국어",
          "meta.home.description":
            "บริการนวดถึงที่ระดับหรูในกรุงเทพ — สุขุมวิท สีลม อโศก ทองหล่อ พร้อมรองรับ 5 ภาษา ดูเวลาว่างสด ๆ ตลอด 24 ชั่วโมง",
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
          "hero.title": "曼谷第一外送按摩",
          "hero.subtitle":
            "认证按摩师 • 实时可订 • 支持英语 / 中文 / 日本語 / 한국어",
          "hero.badge.verified": "已认证",
          "hero.badge.always": "24 小时",
          "hero.badge.rating": "4.8 ★ • 1,200+",
          "filter.all": "全部",
          "filter.thai": "泰式",
          "filter.aroma": "精油",
          "filter.couple": "情侣",
          "home.escorts": "按摩师",
          "home.search": "搜索姓名…",
          "home.subtitle": "曼谷外送按摩",
          "home.noResults": "没有符合条件的按摩师。",
          "meta.home.title":
            "SUNRED 曼谷 • 第一外送按摩 • 多语言客服 EN/中文/日本語/한국어",
          "meta.home.description":
            "曼谷第一外送按摩 — 苏坤蔚、是隆、阿索克、通罗等核心地段。认证按摩师 24 小时实时可订。支持微信支付、支付宝、人民币结算。",
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
          "hero.title": "バンコク No.1 出張マッサージ",
          "hero.subtitle":
            "認定セラピスト • リアルタイム予約 • EN/中文/日本語/한국어 対応",
          "hero.badge.verified": "認証済",
          "hero.badge.always": "24時間",
          "hero.badge.rating": "4.8 ★ • 1,200+",
          "filter.all": "すべて",
          "filter.thai": "タイ式",
          "filter.aroma": "アロマ",
          "filter.couple": "カップル",
          "home.escorts": "セラピスト",
          "home.search": "名前で検索…",
          "home.subtitle": "バンコク出張マッサージ",
          "home.noResults": "条件に合うセラピストが見つかりません。",
          "meta.home.title":
            "SUNRED バンコク • No.1 出張マッサージ • EN/中文/日本語/한국어",
          "meta.home.description":
            "バンコク No.1 高級出張マッサージ。スクンビット・シーロム・アソーク・トンローのホテルへセラピストが直接訪問。日本語OK、認定済セラピスト、リアルタイム予約 24時間対応。",
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
          "hero.title": "방콕 1위 출장 마사지",
          "hero.subtitle":
            "인증 테라피스트 • 실시간 예약 • EN/中文/日本語/한국어 지원",
          "hero.badge.verified": "인증됨",
          "hero.badge.always": "24시간",
          "hero.badge.rating": "4.8 ★ • 1,200+",
          "filter.all": "전체",
          "filter.thai": "타이",
          "filter.aroma": "아로마",
          "filter.couple": "커플",
          "home.escorts": "테라피스트",
          "home.search": "이름 검색…",
          "home.subtitle": "방콕 출장 마사지",
          "home.noResults": "조건에 맞는 테라피스트가 없습니다.",
          "meta.home.title":
            "SUNRED 방콕 • 1위 출장 마사지 • EN/中文/日本語/한국어",
          "meta.home.description":
            "방콕 1위 럭셔리 출장 마사지. 수쿰빗·실롬·아속·통러 호텔로 인증 테라피스트가 방문. 한국어 가능, 24시간 실시간 예약, 안전한 결제(원화·달러).",
        },
      },
    },
  });

// ─────────────────────────────────────────────────────────────────────
// 🌐 Override hero keys with the canonical JSON locales (Phase 1).
//    This MUST come after init — `addResourceBundle(deep=true, overwrite=true)`
//    deep-merges and lets the JSON values win for matching keys (hero.*),
//    while every other inline key (services, filter, home.*, meta.*) is
//    untouched.
// ─────────────────────────────────────────────────────────────────────
i18n.addResourceBundle("en", "translation", heroEn, /*deep*/ true, /*overwrite*/ true);
i18n.addResourceBundle("th", "translation", heroTh, /*deep*/ true, /*overwrite*/ true);
i18n.addResourceBundle("zh", "translation", heroZh, /*deep*/ true, /*overwrite*/ true);
i18n.addResourceBundle("ja", "translation", heroJa, /*deep*/ true, /*overwrite*/ true);
i18n.addResourceBundle("ko", "translation", heroKo, /*deep*/ true, /*overwrite*/ true);

export default i18n;
