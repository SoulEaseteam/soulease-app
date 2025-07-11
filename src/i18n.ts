import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

i18n
  .use(LanguageDetector) // Detect user's preferred language
  .use(initReactI18next) // Pass i18n instance to react-i18next
  .init({
    fallbackLng: 'en',  // Default language if none detected
    debug: false,       // Set to true for debugging during development
    interpolation: {
      escapeValue: false, // React already escapes by default
    },
    resources: {
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
          holiday: 'Holiday',
        },
      },
      th: {
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
          holiday: 'Holiday',
        },
      },
    },
  });

export default i18n;