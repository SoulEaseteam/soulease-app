// src/lib/i18n.ts
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: "en",
    debug: false,

    detection: {
      order: ["localStorage", "navigator", "htmlTag", "cookie", "querystring", "path"],
      caches: ["localStorage", "cookie"],
    },

    interpolation: {
      escapeValue: false,
    },

    resources: {
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
        },
      },

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
        },
      },

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
        },
      },
    },
  });

export default i18n;