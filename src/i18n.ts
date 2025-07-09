// src/i18n.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'th',
    interpolation: {
      escapeValue: false,
    },
    resources: {
      th: {
        translation: {
          bookNow: 'จองตอนนี้',
          viewDetails: 'ดูรายละเอียด',
          hot: '🔥 ฮอต',
          top: '👑 ท็อป',
          new: '🚀 ใหม่',
          distance: 'ระยะทาง',
          rating: 'คะแนน',
          reviews: 'รีวิว',
          image: 'รูปภาพ',
          available: 'ว่าง',
          bookable: 'จองได้',
          resting: 'พักอยู่',
        },
      },
      en: {
        translation: {
          bookNow: 'Book Now',
          viewDetails: 'View Details',
          hot: '🔥 Hot',
          top: '👑 Top',
          new: '🚀 New',
          distance: 'Distance',
          rating: 'Rating',
          reviews: 'Reviews',
          image: 'Image',
          available: 'Available',
          bookable: 'Bookable',
          resting: 'Resting',
        },
      },
    },
  });

export default i18n;