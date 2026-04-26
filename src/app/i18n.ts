// src/app/i18n.ts
// Multi-language support for SunRed
// Markets: Thai locals + Asian tourists (Chinese/Japanese/Korean) + Western (English) + Russian
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

// Supported languages with metadata for switcher UI
export const SUPPORTED_LANGUAGES = [
  { code: "en", label: "English", flag: "🇬🇧", htmlLang: "en" },
  { code: "th", label: "ไทย", flag: "🇹🇭", htmlLang: "th" },
  { code: "zh", label: "中文", flag: "🇨🇳", htmlLang: "zh-CN" },
  { code: "ja", label: "日本語", flag: "🇯🇵", htmlLang: "ja" },
  { code: "ko", label: "한국어", flag: "🇰🇷", htmlLang: "ko" },
  { code: "ru", label: "Русский", flag: "🇷🇺", htmlLang: "ru" },
] as const;

export type LanguageCode = typeof SUPPORTED_LANGUAGES[number]["code"];

const resources = {
  // ============================ ENGLISH ============================
  en: {
    translation: {
      // Brand
      brand: "SUNRED",
      tagline: "Outcall Massage • Bangkok",
      heroSubtitle: "Verified therapists at your door in 30–60 min",
      // Status
      bookNow: "Book Now",
      bookable: "Bookable",
      available: "Available",
      resting: "Resting",
      holiday: "Holiday",
      live: "LIVE",
      // CTAs
      viewDetails: "View Details",
      placeOrder: "Confirm Booking",
      contactUs: "Contact Us",
      // Trust signals
      verified: "Verified",
      rating: "Rating",
      reviews: "Reviews",
      liveNow: "Live now",
      open24: "24/7",
      // Filters
      all: "All",
      filterAvailable: "Available Now",
      filterTop: "Top-rated",
      // Search
      search: "Search name or speciality…",
      // Badges
      hot: "🔥 Hot",
      top: "👑 Top",
      new: "🚀 New",
      // Misc
      distance: "Distance",
      image: "Image",
      noTherapists: "No therapists found",
      tryDifferent: "Try a different filter or clear your search",
      payOnArrival: "🔒 Pay on arrival · Cancel anytime before therapist departs",
      // Home subtitle
      "home.escorts": "ESCORTS",
      "home.search": "Search name or speciality…",
      "home.subtitle": "OUTCALL MASSAGE IN BANGKOK",
    },
  },
  // ============================ THAI ============================
  th: {
    translation: {
      brand: "SUNRED",
      tagline: "นวดนอกสถานที่ • กรุงเทพ",
      heroSubtitle: "จองนักนวดมืออาชีพถึงที่พักใน 30–60 นาที",
      bookNow: "จองตอนนี้",
      bookable: "จองได้",
      available: "ว่าง",
      resting: "พัก",
      holiday: "วันหยุด",
      live: "พร้อมจอง",
      viewDetails: "ดูรายละเอียด",
      placeOrder: "ยืนยันการจอง",
      contactUs: "ติดต่อเรา",
      verified: "ยืนยันตัวตน",
      rating: "คะแนน",
      reviews: "รีวิว",
      liveNow: "ออนไลน์",
      open24: "24 ชม.",
      all: "ทั้งหมด",
      filterAvailable: "ว่างตอนนี้",
      filterTop: "ยอดนิยม",
      search: "ค้นหาชื่อหรือบริการ…",
      hot: "🔥 ฮอต",
      top: "👑 ยอดนิยม",
      new: "🚀 ใหม่",
      distance: "ระยะทาง",
      image: "รูปภาพ",
      noTherapists: "ไม่พบนักนวด",
      tryDifferent: "ลองเปลี่ยนตัวกรองหรือล้างคำค้นหา",
      payOnArrival: "🔒 ชำระเงินเมื่อนักนวดมาถึง · ยกเลิกได้ก่อนนักนวดออกเดินทาง",
      "home.escorts": "นักนวด",
      "home.search": "ค้นหาชื่อหรือบริการ…",
      "home.subtitle": "นวดนอกสถานที่ ในกรุงเทพ",
    },
  },
  // ============================ CHINESE ============================
  zh: {
    translation: {
      brand: "SUNRED",
      tagline: "上门按摩 • 曼谷",
      heroSubtitle: "30-60分钟内,认证按摩师上门服务",
      bookNow: "立即预订",
      bookable: "可预订",
      available: "可用",
      resting: "休息中",
      holiday: "休假",
      live: "在线",
      viewDetails: "查看详情",
      placeOrder: "确认预订",
      contactUs: "联系我们",
      verified: "已认证",
      rating: "评分",
      reviews: "评价",
      liveNow: "在线人数",
      open24: "24小时",
      all: "全部",
      filterAvailable: "立即可约",
      filterTop: "高评分",
      search: "搜索名字或服务…",
      hot: "🔥 热门",
      top: "👑 顶级",
      new: "🚀 新品",
      distance: "距离",
      image: "图片",
      noTherapists: "未找到按摩师",
      tryDifferent: "请尝试其他筛选条件或清除搜索",
      payOnArrival: "🔒 按摩师到达后付款 · 出发前可随时取消",
      "home.escorts": "按摩师",
      "home.search": "搜索名字或服务…",
      "home.subtitle": "曼谷上门按摩",
    },
  },
  // ============================ JAPANESE ============================
  ja: {
    translation: {
      brand: "SUNRED",
      tagline: "出張マッサージ • バンコク",
      heroSubtitle: "認定セラピストが30〜60分でお部屋へ",
      bookNow: "今すぐ予約",
      bookable: "予約可能",
      available: "対応可能",
      resting: "休憩中",
      holiday: "休日",
      live: "ライブ",
      viewDetails: "詳細を見る",
      placeOrder: "予約を確定",
      contactUs: "お問い合わせ",
      verified: "認証済み",
      rating: "評価",
      reviews: "レビュー",
      liveNow: "現在対応中",
      open24: "24時間",
      all: "すべて",
      filterAvailable: "今すぐ予約可能",
      filterTop: "高評価",
      search: "名前またはサービスで検索…",
      hot: "🔥 人気",
      top: "👑 トップ",
      new: "🚀 新着",
      distance: "距離",
      image: "画像",
      noTherapists: "セラピストが見つかりません",
      tryDifferent: "フィルターを変更するか検索をクリアしてください",
      payOnArrival: "🔒 到着時に現金払い · セラピスト出発前ならキャンセル可",
      "home.escorts": "セラピスト",
      "home.search": "名前またはサービスで検索…",
      "home.subtitle": "バンコク出張マッサージ",
    },
  },
  // ============================ KOREAN ============================
  ko: {
    translation: {
      brand: "SUNRED",
      tagline: "출장 마사지 • 방콕",
      heroSubtitle: "30-60분 이내 검증된 테라피스트 방문",
      bookNow: "지금 예약",
      bookable: "예약 가능",
      available: "가능",
      resting: "휴식 중",
      holiday: "휴일",
      live: "라이브",
      viewDetails: "자세히 보기",
      placeOrder: "예약 확정",
      contactUs: "문의하기",
      verified: "인증됨",
      rating: "평점",
      reviews: "리뷰",
      liveNow: "현재 가능",
      open24: "24시간",
      all: "전체",
      filterAvailable: "지금 가능",
      filterTop: "인기",
      search: "이름 또는 서비스 검색…",
      hot: "🔥 인기",
      top: "👑 최고",
      new: "🚀 신규",
      distance: "거리",
      image: "이미지",
      noTherapists: "테라피스트를 찾을 수 없습니다",
      tryDifferent: "다른 필터를 시도하거나 검색을 지워주세요",
      payOnArrival: "🔒 도착 후 결제 · 출발 전 취소 가능",
      "home.escorts": "테라피스트",
      "home.search": "이름 또는 서비스 검색…",
      "home.subtitle": "방콕 출장 마사지",
    },
  },
  // ============================ RUSSIAN ============================
  ru: {
    translation: {
      brand: "SUNRED",
      tagline: "Выездной массаж • Бангкок",
      heroSubtitle: "Проверенные мастера приедут к вам за 30–60 минут",
      bookNow: "Забронировать",
      bookable: "Доступно для брони",
      available: "Свободен",
      resting: "Отдыхает",
      holiday: "Выходной",
      live: "В сети",
      viewDetails: "Подробнее",
      placeOrder: "Подтвердить бронь",
      contactUs: "Связаться",
      verified: "Проверено",
      rating: "Рейтинг",
      reviews: "Отзывы",
      liveNow: "Сейчас онлайн",
      open24: "24/7",
      all: "Все",
      filterAvailable: "Свободны сейчас",
      filterTop: "Топ-рейтинг",
      search: "Поиск по имени или услуге…",
      hot: "🔥 Популярный",
      top: "👑 Топ",
      new: "🚀 Новый",
      distance: "Расстояние",
      image: "Фото",
      noTherapists: "Мастера не найдены",
      tryDifferent: "Попробуйте другой фильтр или очистите поиск",
      payOnArrival: "🔒 Оплата при встрече · Отмена в любое время до выезда",
      "home.escorts": "Мастера",
      "home.search": "Поиск по имени или услуге…",
      "home.subtitle": "Выездной массаж в Бангкоке",
    },
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    // Default fallback ถ้าไม่ match ภาษาใดเลย
    fallbackLng: "en",
    // Whitelist เฉพาะภาษาที่เรามี translations
    supportedLngs: SUPPORTED_LANGUAGES.map((l) => l.code),
    // "th-TH" → "th", "ja-JP" → "ja", "zh-CN" → "zh" (ไม่ต้อง match exact)
    load: "languageOnly",
    // ภาษาที่ไม่ใน supportedLngs (เช่น "fr", "vi") → ใช้ fallback "en"
    nonExplicitSupportedLngs: false,
    debug: false,
    detection: {
      // ลำดับการ detect:
      // 1. ?lang=xx ใน URL (สำหรับ paid ads/shareable link) — overrides ทุกอย่าง
      // 2. localStorage — ถ้า user เคยเลือกภาษาเอง
      // 3. navigator — ภาษาในเครื่อง/browser ของผู้ใช้
      // 4. htmlTag, cookie, path — fallback
      order: ["querystring", "localStorage", "navigator", "htmlTag", "cookie", "path"],
      lookupQuerystring: "lang",
      caches: ["localStorage", "cookie"],
      // อย่า cache ค่าจาก querystring ทันที — ให้ user เปลี่ยนเองก่อนถึงจะ save
      excludeCacheFor: ["cimode"],
    },
    interpolation: { escapeValue: false },
    resources,
  });

// อัปเดต <html lang="..."> ทุกครั้งที่เปลี่ยนภาษา — ดีต่อ SEO + screen readers
i18n.on("languageChanged", (lng) => {
  const langMeta = SUPPORTED_LANGUAGES.find((l) => l.code === lng);
  document.documentElement.lang = langMeta?.htmlLang || lng;
});

export default i18n;
