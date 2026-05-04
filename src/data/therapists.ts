// src/data/therapists.ts
import type { Therapist } from "@/types/therapist";

export const therapists: Therapist[] = [
  // =========================================================
  // 1. YURI
  // =========================================================
  {
    id: "YuriSunRed",
    name: "Yuri",
    image: "/images/yuri/yurie.jpeg",
    rating: 0,
    reviews: 0,

    startTime: "19:00",
    endTime: "05:00",

    todayBookings: 0,
    totalBookings: 0,

    isBooked: false,
    statusOverride: "Auto",
    manualStatus: null,
    activeBooking: false,

    busyUntil: null,
    nextAvailable: null,
    badge: "NONE",

    lat: 13.7656,
    lng: 100.5704,

    distanceKm: null,

    servicesAvailable: ["xSR-Thai", "SR-Aroma", "SR-HJ2200"],

    gallery: [
      "/images/yuri/y88.jpeg",
      "/images/yuri/yy3.jpeg",
      "/images/yuri/y2.jpeg",
      "/images/yuri/yr2.jpeg",
      "/images/yuri/yuri2.jpeg",
      "/images/yuri/yr43.jpeg",
      "/images/yuri/yy5.jpeg",
      "/images/yuri/yiyyu.jpeg",
      "/images/yuri/yr3.jpeg",
    ],

    features: {
      employmentType: "Full-time therapist",
      age: "28",
      gender: "Female",
      ethnicity: "Thai",
      height: "160 cm",
      weight: "49 kg",
      skintone: "White skin",
      bodyType: "Slim",
      bustSize: "C Cup",
      hairColor: "Black",
      vaccinated: "Yes",
      smoker: "No",
      language: "Korean,English",
    },
    area: "Din Daeng · Ratchada",
    homeAddress: "889 ซ.รัชดาภิเษก 3, ดินแดง, กรุงเทพฯ 10400",
    languageSkills: [
      { code: "ko", level: "Fluent" },
      { code: "en", level: "Fluent" },
    ],
    /** SunRed-uniform baseline credentials — TRUE for every onboarded
     *  therapist. Per-individual creds (ผ.พ. license, Wat Pho diploma,
     *  certifications) are added by admin after physical verification. */
    credentials: [
      {
        type: "background",
        label: "Background-checked by SunRed",
        meta: "ID + clearance verified at onboarding",
      },
      {
        type: "certification",
        label: "SunRed onboarded therapist",
        meta: "Code of conduct + service standards trained",
      },
    ],
  },

  // =========================================================
  // 2. JIMMY
  // =========================================================
  {
    id: "JimmySunRed",
    name: "Jimmy",
    image: "/images/jinny/IMG_7136.JPG",
    rating: 0,
    reviews: 0,

    startTime: "13:00",
    endTime: "22:00",

    todayBookings: 0,
    totalBookings: 0,

    isBooked: false,
    statusOverride: "Auto",
    manualStatus: null,
    activeBooking: false,

    busyUntil: null,
    nextAvailable: null,
    badge: "NONE",

    lat: 13.7548,
    lng: 100.5656,
    distanceKm: null,

    servicesAvailable: [
      "xSR-Thai",
      "SR-Aroma",
      "SR-HJ2200",
      "SR-B2B3200"
    ],

    gallery: [
      "/images/jinny/IMG_7120.JPG",
      "/images/jinny/IMG_7130.JPG",
      "/images/jinny/IMG_7132.JPG",
      "/images/jinny/IMG_7139.JPG",
      "/images/jinny/IMG_7133.JPG",
      "/images/jinny/IMG_7137.JPG",
      "/images/jinny/IMG_7138.JPG",
      "/images/jinny/jmn.jpeg",
      "/images/jinny/jimmy.jpeg",
    ],

    features: {
      employmentType: "Part-time therapist",
      age: "29",
      gender: "Female",
      ethnicity: "Thai",
      height: "155 cm",
      weight: "45 kg",
      skintone: "White skin",
      bodyType: "Slim",
      bustSize: "C Cup",
      hairColor: "Black",
      vaccinated: "Yes",
      smoker: "No",
      language: "English, Korean, Cantonese",
    },
    area: "Huai Khwang · RCA",
    languageSkills: [
      { code: "en", level: "Fluent" },
      { code: "ko", level: "Conversational" },
      { code: "zh", level: "Conversational" },
    ],
    /** SunRed-uniform baseline credentials — TRUE for every onboarded
     *  therapist. Per-individual creds (ผ.พ. license, Wat Pho diploma,
     *  certifications) are added by admin after physical verification. */
    credentials: [
      {
        type: "background",
        label: "Background-checked by SunRed",
        meta: "ID + clearance verified at onboarding",
      },
      {
        type: "certification",
        label: "SunRed onboarded therapist",
        meta: "Code of conduct + service standards trained",
      },
    ],
  },

  // =========================================================
  // 3. HAMI
  // =========================================================
  {
    id: "HamiSunRed",
    name: "Hami",
    image: "/images/Hami/Hami3.jpeg",
    rating: 0,
    reviews: 0,

    startTime: "18:00",
    endTime: "02:00",

    todayBookings: 0,
    totalBookings: 0,

    isBooked: false,
    statusOverride: "Auto",
    manualStatus: null,
    activeBooking: false,

    busyUntil: null,
    nextAvailable: null,
    badge: "NONE",

    lat: 13.7779,
    lng: 100.574,
    distanceKm: null,

    servicesAvailable: [
      "xSR-Thai",
      "SR-Aroma",
      "SR-HJ2200"
    ],

    gallery: [
      "/images/Hami/hami.jpeg",
      "/images/Hami/mami3.jpeg",
      "/images/Hami/Hami88.jpeg",
      "/images/Hami/hami4.jpeg",
      "/images/Hami/hami5.JPG",
      "/images/Hami/Hami3.jpeg",
    ],

    features: {
      employmentType: "Part-time therapist",
      age: "27",
      gender: "Female",
      ethnicity: "Thai",
      height: "159 cm",
      weight: "49 kg",
      skintone: "Medium skin",
      bodyType: "Slim",
      bustSize: "D Cup",
      hairColor: "Brown",
      vaccinated: "Yes",
      smoker: "No",
      language: "English, Korean",
    },
    area: "Huai Khwang",
    languageSkills: [
      { code: "en", level: "Fluent" },
      { code: "ko", level: "Conversational" },
    ],
    /** SunRed-uniform baseline credentials — TRUE for every onboarded
     *  therapist. Per-individual creds (ผ.พ. license, Wat Pho diploma,
     *  certifications) are added by admin after physical verification. */
    credentials: [
      {
        type: "background",
        label: "Background-checked by SunRed",
        meta: "ID + clearance verified at onboarding",
      },
      {
        type: "certification",
        label: "SunRed onboarded therapist",
        meta: "Code of conduct + service standards trained",
      },
    ],
  },

  // =========================================================
  // 4. XING XING
  // =========================================================
  {
    id: "XingXingSunRed",
    name: "XingXing",
    image: "/images/xing/xi.jpeg",
    rating: 0,
    reviews: 0,

    startTime: "11:00",
    endTime: "03:00",

    todayBookings: 0,
    totalBookings: 0,

    isBooked: false,
    statusOverride: "Auto",
    manualStatus: null,
    activeBooking: false,

    busyUntil: null,
    nextAvailable: null,
    badge: "NONE",

    lat: 13.7656,
    lng: 100.5704,
    distanceKm: null,

    servicesAvailable: [
      "xSR-Thai",
      "SR-Aroma",
      "SR-HJ2200"
    ],

    gallery: [
      "/images/xing/xa.jpeg",
      "/images/xing/xs.jpeg",
      "/images/xing/xingxing2.jpeg",
      "/images/xing/xingxing8.jpg",
      "/images/xing/xingxing4.jpg",
      "/images/xing/xingxing1.jpg",
      "/images/xing/xingxing7.jpg",
      "/images/xing/xxxx.jpeg",
      "/images/xing/xingg.jpg",
    ],

    features: {
      employmentType: "Full-time therapist",
      age: "26",
      gender: "Female",
      ethnicity: "Thai",
      height: "160 cm",
      weight: "56 kg",
      skintone: "Light skin",
      bodyType: "Curvy",
      bustSize: "D Cup",
      hairColor: "Light Brown",
      vaccinated: "Yes",
      smoker: "No",
      language: "English, Chinese",
    },
    area: "Din Daeng · Ratchada",
    homeAddress: "889 ซ.รัชดาภิเษก 3, ดินแดง, กรุงเทพฯ 10400",
    languageSkills: [
      { code: "th", level: "Native" },
      { code: "en", level: "Fluent" },
      { code: "zh", level: "Conversational" },
    ],
    /** SunRed-uniform baseline credentials — TRUE for every onboarded
     *  therapist. Per-individual creds (ผ.พ. license, Wat Pho diploma,
     *  certifications) are added by admin after physical verification. */
    credentials: [
      {
        type: "background",
        label: "Background-checked by SunRed",
        meta: "ID + clearance verified at onboarding",
      },
      {
        type: "certification",
        label: "SunRed onboarded therapist",
        meta: "Code of conduct + service standards trained",
      },
    ],
  },

  // =========================================================
  // 5. BARBIE
  // =========================================================
  {
    id: "BarbieSunRed",
    name: "Barbie",
    image: "/images/Barbie/Barbie2.jpeg",
    rating: 0,
    reviews: 0,

    startTime: "19:00",
    endTime: "05:00",

    todayBookings: 0,
    totalBookings: 0,

    isBooked: false,
    statusOverride: "Auto",
    manualStatus: null,
    activeBooking: false,

    busyUntil: null,
    nextAvailable: null,
    badge: "NONE",

    lat: 13.782,
    lng: 100.608,
    distanceKm: null,

    servicesAvailable: [
      "xSR-Thai",
      "SR-Aroma",
      "SR-HJ2200"
    ],

    gallery: [
      "/images/Barbie/Barbie2.jpeg",
      "/images/Barbie/Barbie3.jpeg",
      "/images/Barbie/Barbie8.jpeg",
      "/images/Barbie/Barbie4.jpeg",
      "/images/Barbie/Barbie6.jpeg",
      "/images/Barbie/Barbie7.jpeg",
      "/images/Barbie/Barbie.jpeg",
      "/images/Barbie/Barbie9.jpeg",
      "/images/Barbie/Barbie5.jpeg",
    ],

    features: {
      employmentType: "Full-time therapist",
      age: "26",
      gender: "Female",
      ethnicity: "Thai",
      height: "154 cm",
      weight: "45 kg",
      skintone: "White skin",
      bodyType: "Slim",
      bustSize: "32B",
      hairColor: "Light Brown",
      vaccinated: "Yes",
      smoker: "No",
      language: "English",
    },
    area: "Lat Phrao · Wang Thonglang",
    homeAddress: "ซอยลาดพร้าว 80/3, วังทองหลาง, กรุงเทพฯ 10310",
    languageSkills: [
      { code: "th", level: "Native" },
      { code: "en", level: "Fluent" },
    ],
    /** SunRed-uniform baseline credentials — TRUE for every onboarded
     *  therapist. Per-individual creds (ผ.พ. license, Wat Pho diploma,
     *  certifications) are added by admin after physical verification. */
    credentials: [
      {
        type: "background",
        label: "Background-checked by SunRed",
        meta: "ID + clearance verified at onboarding",
      },
      {
        type: "certification",
        label: "SunRed onboarded therapist",
        meta: "Code of conduct + service standards trained",
      },
    ],
  },
  // =========================================================
  // 6. MINI
  // =========================================================
  {
    id: "MiniSunRed",
    name: "Mini",
    image: "/images/Mini/Mini3.jpeg",
    rating: 0,
    reviews: 0,

    startTime: "14:00",
    endTime: "01:00",

    todayBookings: 0,
    totalBookings: 0,

   isBooked: false,
    statusOverride: "Auto",
    manualStatus: null,
    activeBooking: false,

    busyUntil: null,
    nextAvailable: null,
    badge: "NONE",

    lat: 13.7548,
    lng: 100.5656,
    distanceKm: null,

    servicesAvailable: [
      "xSR-Thai",
      "SR-Aroma",
      "SR-HJ2200",
      "SR-B2B3200"
    ],

    gallery: [
      "/images/Mini/Mini4.jpeg",
      "/images/Mini/Mini6.jpeg",
      "/images/Mini/Mini4.jpeg",
    ],

    features: {
      employmentType: "Part-time therapist",
      age: "28",
      gender: "Female",
      ethnicity: "Thai",
      height: "155 cm",
      weight: "46 kg",
      skintone: "White skin",
      bodyType: "Slim",
      bustSize: "C Cup",
      hairColor: "Brown",
      vaccinated: "Yes",
      smoker: "No",
      language: "English, Korean",
    },
    area: "Huai Khwang · RCA",
    languageSkills: [
      { code: "th", level: "Native" },
      { code: "en", level: "Fluent" },
      { code: "ko", level: "Conversational" },
    ],
    /** SunRed-uniform baseline credentials — TRUE for every onboarded
     *  therapist. Per-individual creds (ผ.พ. license, Wat Pho diploma,
     *  certifications) are added by admin after physical verification. */
    credentials: [
      {
        type: "background",
        label: "Background-checked by SunRed",
        meta: "ID + clearance verified at onboarding",
      },
      {
        type: "certification",
        label: "SunRed onboarded therapist",
        meta: "Code of conduct + service standards trained",
      },
    ],
  },

  // =========================================================
  // 7. JI-A
  // =========================================================
  {
    id: "JiASunRed",
    name: "Ji A",
    image: "/images/Ji-a (จีอา)/Ji-a2.jpeg",
    rating: 0,
    reviews: 0,

    startTime: "16:00",
    endTime: "01:30",
    
    todayBookings: 0,
    totalBookings: 0,

    isBooked: false,
    statusOverride: "Auto",
    manualStatus: null,
    activeBooking: false,

    busyUntil: null,
    nextAvailable: null,
    badge: "NONE",

    lat: 13.7548,
    lng: 100.5656,
    distanceKm: null,

    servicesAvailable: [
      "xSR-Thai",
      "SR-Aroma",
      "SR-HJ2200",
      "SR-B2B3200"
    ],

    gallery: [
      "/images/Ji-a (จีอา)/Ji-a6.jpeg",
      "/images/Ji-a (จีอา)/Ji-a4.jpeg",
      "/images/Ji-a (จีอา)/2568-11-23 11.57.45.jpg",
    ],

    features: {
      employmentType: "Part-time therapist",
      age: "28",
      gender: "Female",
      ethnicity: "Thai",
      height: "160 cm",
      weight: "48 kg",
      skintone: "White skin",
      bodyType: "Slim",
      bustSize: "C Cup",
      hairColor: "Black",
      vaccinated: "Yes",
      smoker: "No",
      language: "English, Korean",
    },
    area: "Huai Khwang · RCA",
    languageSkills: [
      { code: "en", level: "Fluent" },
      { code: "ko", level: "Conversational" },
    ],
    /** SunRed-uniform baseline credentials — TRUE for every onboarded
     *  therapist. Per-individual creds (ผ.พ. license, Wat Pho diploma,
     *  certifications) are added by admin after physical verification. */
    credentials: [
      {
        type: "background",
        label: "Background-checked by SunRed",
        meta: "ID + clearance verified at onboarding",
      },
      {
        type: "certification",
        label: "SunRed onboarded therapist",
        meta: "Code of conduct + service standards trained",
      },
    ],
  },

  // =========================================================
  // 8. VIVIAN
  // =========================================================
  {
    id: "VivianSunRed",
    name: "Vivian",
    image: "/images/Vivian/Vivian1.jpeg",
    rating: 0,
    reviews: 0,

    startTime: "16:00",
    endTime: "02:00",

    todayBookings: 0,
    totalBookings: 0,

    isBooked: false,
    statusOverride: "Auto",
    manualStatus: null,
    activeBooking: false,

    busyUntil: null,
    nextAvailable: null,
    badge: "NONE",

    lat: 13.7548,
    lng: 100.5656,
    distanceKm: null,

    servicesAvailable: [
      "xSR-Thai",
      "SR-Aroma",
      "SR-HJ2200",
      "SR-B2B3200"
    ],

    gallery: [
      "/images/Vivian/Vivian9.jpeg",
      "/images/Vivian/Vivian7.jpeg",
      "/images/Vivian/Vivian2.jpeg",
      "/images/Vivian/Vivian8.jpeg",
      "/images/Vivian/Vivian4.jpeg",
      "/images/Vivian/Vivian3.jpeg",
    ],

    features: {
      employmentType: "Part-time therapist",
      age: "29",
      gender: "Female",
      ethnicity: "Thai",
      height: "152 cm",
      weight: "44 kg",
      skintone: "White skin",
      bodyType: "Slim",
      bustSize: "C Cup",
      hairColor: "Brown",
      vaccinated: "Yes",
      smoker: "No",
      language: "English(well), Korea(little)",
    },
    area: "Huai Khwang · RCA",
    languageSkills: [
      { code: "en", level: "Fluent" },
      { code: "ko", level: "Basic" },
    ],
    /** SunRed-uniform baseline credentials — TRUE for every onboarded
     *  therapist. Per-individual creds (ผ.พ. license, Wat Pho diploma,
     *  certifications) are added by admin after physical verification. */
    credentials: [
      {
        type: "background",
        label: "Background-checked by SunRed",
        meta: "ID + clearance verified at onboarding",
      },
      {
        type: "certification",
        label: "SunRed onboarded therapist",
        meta: "Code of conduct + service standards trained",
      },
    ],
  },

  // =========================================================
  // 9. NANNY
  // =========================================================
  {
    id: "NannySunRed",
    name: "Nanny",
    image: "/images/nanny/photo_2568-11-23 21.28.47.jpeg",
    rating: 0,
    reviews: 0,

    startTime: "13:00",
    endTime: "22:00",

    todayBookings: 0,
    totalBookings: 0,

    isBooked: false,
    statusOverride: "Auto",
    manualStatus: null,
    activeBooking: false,

    busyUntil: null,
    nextAvailable: null,
    badge: "NONE",

    lat: 13.7548,
    lng: 100.5656,
    distanceKm: null,

    servicesAvailable: [
      "xSR-Thai",
      "SR-Aroma",
      "SR-HJ2200",
      "SR-B2B3200"
    ],
    gallery: [
      "/images/nanny/2568-11-23 11.58.03.jpg",
      "/images/nanny/2568-11-23 11.03.29.jpg",
      "/images/nanny/2568-11-23 11.04.01.jpg",
      "/images/nanny/photo_2568-11-23 11.13.47.jpeg",
    ],

    features: {
      employmentType: "Part-time therapist",
      age: "26",
      gender: "Female",
      ethnicity: "Thai",
      height: "160 cm",
      weight: "48 kg",
      skintone: "White skin",
      bodyType: "Slim",
      bustSize: "32B",
      hairColor: "Black",
      vaccinated: "Yes",
      smoker: "No",
      language: "English",
    },
    area: "Huai Khwang · RCA",
    languageSkills: [
      { code: "th", level: "Native" },
      { code: "en", level: "Fluent" },
    ],
    /** SunRed-uniform baseline credentials — TRUE for every onboarded
     *  therapist. Per-individual creds (ผ.พ. license, Wat Pho diploma,
     *  certifications) are added by admin after physical verification. */
    credentials: [
      {
        type: "background",
        label: "Background-checked by SunRed",
        meta: "ID + clearance verified at onboarding",
      },
      {
        type: "certification",
        label: "SunRed onboarded therapist",
        meta: "Code of conduct + service standards trained",
      },
    ],
  },

  // =========================================================
  // 10. YA YA  — new therapist (starts fresh)
  // =========================================================
  {
    id: "YaYaSunRed",
    name: "YaYa",
    image: "/images/yaya/yaya.jpeg",
    rating: 0,
    reviews: 0,

    startTime: "17:00",
    endTime: "02:00",

    todayBookings: 0,
    totalBookings: 0,

    isBooked: false,
    statusOverride: "Auto",
    manualStatus: null,
    activeBooking: false,

    busyUntil: null,
    nextAvailable: null,
    badge: "NEW",

    // RCA · Huai Khwang (Royal City Avenue area)
    lat: 13.7548,
    lng: 100.5656,
    distanceKm: null,

    servicesAvailable: [
      "xSR-Thai",
      "SR-Aroma",
      "SR-HJ2200",
      "SR-B2B3200",
    ],

    gallery: [
      "/images/yaya/yaya.jpeg",
    ],

    features: {
      employmentType: "Full-time therapist",
      age: "30",
      gender: "Female",
      ethnicity: "Thai",
      height: "168 cm",
      weight: "53 kg",
      skintone: "Fair skin",
      // 34-24-37 (in) — small waist + balanced bust/hip = classic hourglass.
      bodyType: "Hourglass",
      bustSize: "34B",
      hairColor: "Brown",
      vaccinated: "Yes",
      smoker: "No",
      language: "English",
    },

    // Round 28z — new-hire profile. No track record yet, so we omit
    // rebookRate and seed counts at zero. Specialties show "New therapist"
    // labels until the first sessions roll in.
    area: "Huai Khwang · RCA",
    languageSkills: [
      { code: "th", level: "Native" },
      { code: "en", level: "Fluent" },
    ],
    /** SunRed-uniform baseline credentials — TRUE for every onboarded
     *  therapist. Per-individual creds (ผ.พ. license, Wat Pho diploma,
     *  certifications) are added by admin after physical verification. */
    credentials: [
      {
        type: "background",
        label: "Background-checked by SunRed",
        meta: "ID + clearance verified at onboarding",
      },
      {
        type: "certification",
        label: "SunRed onboarded therapist",
        meta: "Code of conduct + service standards trained",
      },
    ],
  },

  // =========================================================
  // 11. NICKY  — new therapist (starts fresh)
  // =========================================================
  {
    id: "NickySunRed",
    name: "Nicky",
    image: "/images/nicky/nicky.jpeg",
    rating: 0,
    reviews: 0,

    startTime: "15:00",
    endTime: "03:00",

    todayBookings: 0,
    totalBookings: 0,

    isBooked: false,
    statusOverride: "Auto",
    manualStatus: null,
    activeBooking: false,

    busyUntil: null,
    nextAvailable: null,
    badge: "NEW",

    // Rama 4 Road · Silom corridor
    lat: 13.7283,
    lng: 100.5374,
    distanceKm: null,

    servicesAvailable: [
      "xSR-Thai",
      "SR-Aroma",
      "SR-HJ2200",
      "SR-B2B3200",
    ],

    gallery: [
      "/images/nicky/nicky.jpeg",
    ],

    features: {
      employmentType: "Full-time therapist",
      age: "27",
      gender: "Female",
      ethnicity: "Thai",
      height: "154 cm",
      weight: "45 kg",
      skintone: "Tan",
      bodyType: "Slim",
      bustSize: "34B",
      hairColor: "Black",
      vaccinated: "Yes",
      smoker: "No",
      language: "English, Korean",
    },

    area: "Rama 4 · Silom",
    languageSkills: [
      { code: "en", level: "Fluent" },
      { code: "ko", level: "Conversational" },
    ],
    /** SunRed-uniform baseline credentials — TRUE for every onboarded
     *  therapist. Per-individual creds (ผ.พ. license, Wat Pho diploma,
     *  certifications) are added by admin after physical verification. */
    credentials: [
      {
        type: "background",
        label: "Background-checked by SunRed",
        meta: "ID + clearance verified at onboarding",
      },
      {
        type: "certification",
        label: "SunRed onboarded therapist",
        meta: "Code of conduct + service standards trained",
      },
    ],
  },

  // =========================================================
  // 12. RICHIE  — new therapist (starts fresh, founder 2026-05-03)
  // =========================================================
  {
    id: "RichieSunRed",
    name: "Richie",
    image: "/images/richie/richie.jpeg",
    rating: 0,
    reviews: 0,

    startTime: "12:00",
    endTime: "00:00",

    todayBookings: 0,
    totalBookings: 0,

    isBooked: false,
    statusOverride: "Auto",
    manualStatus: null,
    activeBooking: false,

    busyUntil: null,
    nextAvailable: null,
    badge: "NEW",

    // Rama 9 · RCA / Central Rama 9 corridor
    lat: 13.7548,
    lng: 100.5656,
    distanceKm: null,

    servicesAvailable: [
      "xSR-Thai",
      "SR-Aroma",
      "SR-HJ2200",
      "SR-B2B3200",
    ],

    gallery: [
      "/images/richie/richie.jpeg",
    ],

    features: {
      employmentType: "Full-time therapist",
      age: "27",
      gender: "Female",
      ethnicity: "Thai",
      height: "155 cm",
      weight: "41 kg",
      skintone: "Fair",
      bodyType: "Slim",
      bustSize: "33A",
      hairColor: "Black",
      vaccinated: "Yes",
      smoker: "No",
      language: "English,Chinese",
    },

    area: "Rama 9",
    languageSkills: [
      { code: "th", level: "Native" },
      { code: "en", level: "Basic" },
      { code: "zh", level: "Basic" },
    ],
    /** SunRed-uniform baseline credentials — TRUE for every onboarded
     *  therapist. Per-individual creds (ผ.พ. license, Wat Pho diploma,
     *  certifications) are added by admin after physical verification. */
    credentials: [
      {
        type: "background",
        label: "Background-checked by SunRed",
        meta: "ID + clearance verified at onboarding",
      },
      {
        type: "certification",
        label: "SunRed onboarded therapist",
        meta: "Code of conduct + service standards trained",
      },
    ],
  },
];

export default therapists;