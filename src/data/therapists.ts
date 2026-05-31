// src/data/therapists.ts
import type { Therapist } from "@/types/therapist";

export const therapists: Therapist[] = [
  // =========================================================
  // 1. YURI
  // =========================================================
  {
    id: "YuriSunRed",
    name: "Yuri",
    // 🆕 Round 28s113 — Multi-locale bio surfaced on TherapistDetailPage
    //   via buildFromReal(real, lang). Source: docs/therapist-profiles.md
    //   + docs/therapist-profiles-i18n.md (both reviewed against the
    //   euphemism table in CLAUDE.md §3).
    bios: {
      en: "The most frequently requested practitioner among returning guests. Calm, unhurried rhythm. Fluent Korean and English. Late-night specialist from Din Daeng.",
      th: "นักบำบัดที่แขกประจำกล่าวถึงบ่อยที่สุด · จังหวะนุ่มเงียบ · เกาหลีและอังกฤษคล่อง · ช่วงดึกจากย่านดินแดง",
      zh: "回头客最常指定的治疗师 · 节奏安宁不催促 · 韩英流利 · 深夜班 · 迪丹丁区",
      ja: "リピーターから最も多く指名されるセラピスト。穏やかなリズム、韓国語と英語流暢、深夜帯担当、ディンデーン地区。",
      ko: "재방문 고객이 가장 자주 지명하는 치료사. 평온한 리듬, 한국어와 영어 능통, 심야 전문, 딘다엥 지역.",
    },
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
    bios: {
      en: "One of very few trilingual practitioners — English, Korean, and Cantonese. Full menu including SunRed Therapeutic. Huai Khwang afternoons to evenings.",
      th: "นักบำบัดที่สนทนา 3 ภาษา — อังกฤษ เกาหลี กวางตุ้ง · ครบทุกเมนูรวม SunRed Therapeutic · ห้วยขวาง บ่ายถึงค่ำ",
      zh: "极少数三语治疗师 — 英语、韩语、粤语 · 全菜单含 Therapeutic · 华伊街午后至傍晚",
      ja: "三か国語(英語・韓国語・広東語)対応の稀少なセラピスト。Therapeutic 含む全メニュー対応。フアイクワーン午後〜夕方。",
      ko: "3개 국어(영어·한국어·광동어) 가능한 드문 치료사. Therapeutic 포함 전 메뉴. 후아이콴 오후-저녁.",
    },
    image: "/images/jinny/IMG_7136.JPG",
    rating: 0,
    reviews: 0,

    // 🆕 Round 28b40 — 13:00 → 22:00 (was "10:00PM" — ambiguous;
    //   stripped of suffix the legacy parser read it as 10 AM).
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
    bios: {
      en: "Focused, attentive presence for evening sessions in Huai Khwang. English and Korean conversational. Preferred by guests who appreciate steady, unhurried pressure.",
      th: "บุคลิกที่ใส่ใจในเซสชั่นช่วงค่ำของย่านห้วยขวาง · สนทนาภาษาอังกฤษและเกาหลีได้ · เหมาะกับแขกที่ชื่นชอบแรงกดที่นุ่มและไม่รีบ",
      zh: "华伊街晚间班的专注存在感 · 英语韩语可沟通 · 偏好稳定不急压力的客人会选她",
      ja: "フアイクワーン夕方シフトの集中した存在感。英語と韓国語に対応。穏やかな圧をお好みのゲストに人気。",
      ko: "후아이콴 저녁 시간대의 집중된 존재감. 영어와 한국어 가능. 안정적이고 부드러운 압력을 선호하는 고객에게 인기.",
    },
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
    bios: {
      en: "Softer, fuller physique with a distinctive trilingual range — native Thai, fluent English, conversational Chinese. Din Daeng afternoons to late-night.",
      th: "รูปร่างนุ่มอวบกว่านักบำบัดทั่วไป · ไทยภาษาแม่ อังกฤษคล่อง จีนใช้งานได้ · ดินแดง บ่ายถึงดึก",
      zh: "柔和丰盈体态,泰语母语英语流利,中文可沟通 · 迪丹丁午后至深夜",
      ja: "柔らかく豊かな体型と三か国語対応(タイ語ネイティブ、英語流暢、中国語会話)。ディンデーン午後〜深夜。",
      ko: "부드러운 풍만한 체형, 태국어 원어민·영어 능통·중국어 회화. 딘다엥 오후-심야.",
    },
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
    bios: {
      en: "Our only practitioner in the Lat Phrao / Wang Thonglang corridor. Thai native, fluent English. Late-night premium window 19:00–05:00.",
      th: "นักบำบัดคนเดียวที่ประจำลาดพร้าว/วังทองหลาง · ไทยภาษาแม่ อังกฤษคล่อง · ดึกพรีเมียม 19:00–05:00",
      zh: "唯一驻拉抛/Wang Thonglang 治疗师 · 泰语母语英语流利 · 19:00–05:00 深夜豪华",
      ja: "ラップラオ/ワントーンラン地区唯一のセラピスト。タイ語ネイティブ、英語流暢。19:00–05:00 深夜プレミアム。",
      ko: "랏프라오/왕통랑 유일 치료사. 태국어 원어민, 영어 능통. 19:00–05:00 심야 프리미엄.",
    },
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
    bios: {
      en: "Long, flexible shift from afternoon to past midnight. English and Korean. Full menu including SunRed Therapeutic. Huai Khwang and RCA coverage.",
      th: "ทำงานช่วงเวลายาวยืดหยุ่นจากบ่ายถึงดึก · อังกฤษและเกาหลีได้ · ครบทุกเมนูรวม Therapeutic · ห้วยขวางและ RCA",
      zh: "长班灵活,午后至午夜后 · 英语韩语 · 全菜单含 Therapeutic · 华伊街与 RCA",
      ja: "午後から深夜過ぎまでの長時間柔軟シフト。英語と韓国語、Therapeutic 含む全メニュー。フアイクワーン・RCA カバー。",
      ko: "오후부터 자정 이후까지 길고 유연한 시간대. 영어와 한국어, Therapeutic 포함 전 메뉴. 후아이콴·RCA 커버.",
    },
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
      { code: "en", level: "Fluent" },
      { code: "ko", level: "Conversational" },
    ],

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
    bios: {
      en: "Evening practitioner in Huai Khwang. English and Korean conversational. Works from late afternoon into early morning. Full menu including SunRed Therapeutic.",
      th: "นักบำบัดช่วงค่ำของห้วยขวาง · อังกฤษและเกาหลีได้ · บ่ายปลายถึงเช้ามืด · ครบทุกเมนูรวม Therapeutic",
      zh: "华伊街晚间治疗师 · 英语韩语可沟通 · 傍晚至清晨 · 全菜单含 Therapeutic",
      ja: "フアイクワーン夕方セラピスト。英語と韓国語、夕方から明け方、Therapeutic 含む全メニュー。",
      ko: "후아이콴 저녁 치료사. 영어와 한국어, 늦은 오후-새벽, Therapeutic 포함 전 메뉴.",
    },
    image: "/images/Ji-a (จีอา)/Ji-a2.jpeg",
    rating: 0,
    reviews: 0,

    startTime: "16:00",
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
    bios: {
      en: "The most petite frame on our evening roster, with a naturally light, unhurried touch. English fluent, basic Korean. Preferred by guests who find deeper pressure too intense.",
      th: "ตัวเล็กที่สุดในนักบำบัดช่วงค่ำ · สัมผัสนุ่มเบาตามธรรมชาติ · อังกฤษคล่อง เกาหลีพื้นฐาน · เหมาะกับแขกที่รู้สึกแรงกดลึกแรงเกินไป",
      zh: "晚间班最娇小体型,自然轻盈不急触感 · 英语流利,韩语基础 · 适合觉得深压力强烈的客人",
      ja: "夕方シフトで最も小柄、自然に軽やかなタッチ。英語流暢、韓国語基本。深いプレッシャーが強すぎるゲストに人気。",
      ko: "저녁 시간대 가장 작은 체형, 자연스럽게 가벼운 터치. 영어 능통, 한국어 기초. 깊은 압력이 부담스러운 고객에게 선호.",
    },
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
    // 🆕 Round 28b40 — endTime "10:00PM" → "22:00" (24h, was ambiguous).
    id: "NannySunRed",
    name: "Nanny",
    bios: {
      en: "Thai native with fluent English, working the afternoon-to-evening shift in Huai Khwang. Natural fit for international guests who value a comfortable two-language conversation. Full menu.",
      th: "ไทยภาษาแม่ อังกฤษคล่อง · บ่ายถึงค่ำในห้วยขวาง · เหมาะกับแขกต่างชาติที่อยากคุยสองภาษาสบายๆ · ครบทุกเมนู",
      zh: "泰语母语英语流利 · 华伊街午后至晚间 · 适合重视双语沟通的国际客人 · 全菜单",
      ja: "タイ語ネイティブ・英語流暢、フアイクワーン午後〜夕方。両言語で快適に会話したい国際的なゲストに最適。全メニュー対応。",
      ko: "태국어 원어민·영어 능통, 후아이콴 오후-저녁. 두 언어로 편안한 대화를 원하는 국제 고객에 최적. 전 메뉴.",
    },
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
    bios: {
      en: "NEW to the roster — a distinctive silhouette: taller (168cm) and hourglass-figured. Thai native, fluent English. Late-afternoon to early-morning shift in Huai Khwang. Full menu.",
      th: "ใหม่ในทีม — รูปร่างโดดเด่น สูง 168cm หุ่นนาฬิกาทราย · ไทยภาษาแม่ อังกฤษคล่อง · เย็นถึงเช้ามืดในห้วยขวาง · ครบทุกเมนู",
      zh: "新加入 — 独特剪影:身高 168cm,沙漏体型 · 泰语母语英语流利 · 华伊街傍晚至清晨 · 全菜单",
      ja: "新加入 — 特徴的シルエット:168cm 砂時計体型。タイ語ネイティブ、英語流暢。フアイクワーン午後遅く〜明け方、全メニュー対応。",
      ko: "신규 합류 — 독특한 실루엣: 168cm 모래시계 체형. 태국어 원어민, 영어 능통. 후아이콴 늦은 오후-새벽, 전 메뉴.",
    },
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

    area: "Huai Khwang · RCA",
    languageSkills: [
      { code: "th", level: "Native" },
      { code: "en", level: "Fluent" },
    ],

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
    bios: {
      en: "NEW — our only Silom corridor practitioner. The most direct choice for guests staying in Silom, Sathorn, or along Rama 4. English and Korean conversational. Full menu.",
      th: "ใหม่ — นักบำบัดคนเดียวประจำสีลม · เหมาะที่สุดสำหรับแขกพักสีลม สาทร พระราม 4 · อังกฤษและเกาหลีได้ · ครบทุกเมนู",
      zh: "新 — 唯一是隆走廊治疗师 · 是隆、沙吞、拉玛四世入住客人最直接选项 · 英语韩语可沟通 · 全菜单",
      ja: "新 — シーロム走廊唯一のセラピスト。シーロム・サートーン・ラマ4世沿いに滞在のゲストに最も直接的な選択肢。英語と韓国語、全メニュー対応。",
      ko: "신규 — 실롬 회랑 유일 치료사. 실롬·사톤·라마4세 인근 고객에 최적. 영어와 한국어, 전 메뉴.",
    },
    image: "/images/nicky/nicky.JPG",
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
      "/images/nicky/nicky.JPG",
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
    bios: {
      en: "NEW — the most petite practitioner on our roster (155cm) and our only Rama 9 option. Basic Chinese and English — suited for concise sessions with mainland Chinese guests visiting Bangkok's eastern business district. Midday to midnight.",
      th: "ใหม่ — ตัวเล็กที่สุดในทีม (155cm) ประจำพระราม 9 · จีนและอังกฤษพื้นฐาน · เหมาะกับเซสชั่นกระชับกับแขกจีนแผ่นดินใหญ่ในย่านศูนย์ราชการ · เที่ยงถึงเที่ยงคืน",
      zh: "新 — 队中最娇小 (155cm) 唯一拉玛九选项 · 中英文基础 · 适合与拉玛九商务区中国大陆访客简明会话 · 正午至午夜",
      ja: "新 — ロスター最小柄(155cm)、ラマ9世唯一の選択肢。中国語と英語基本 — バンコク東部ビジネス地区を訪れる中国本土ゲストとの簡潔なセッションに最適。正午〜深夜。",
      ko: "신규 — 로스터 최소형(155cm), 라마9 유일 옵션. 중국어와 영어 기초 — 방콕 동부 비즈니스 지구를 방문하는 중국 본토 고객과의 간결한 세션에 적합. 정오-자정.",
    },
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
      { code: "en", level: "Basic" },
      { code: "zh", level: "Basic" },
    ],

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