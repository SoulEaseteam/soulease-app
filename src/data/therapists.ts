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
    rating: 4.7,
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

    lat: 13.765336,
    lng: 100.5604635,

    distanceKm: null,

    servicesAvailable: ["thai-massage", "aromatherapy", "gentlemans-recovery"],

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
      language: "Thai / English",
    },
  },

  // =========================================================
  // 2. JIMMY
  // =========================================================
  {
    id: "JimmySunRed",
    name: "Jimmy",
    image: "/images/jinny/IMG_7136.JPG",
    rating: 4.5,
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

    lat: 13.7513099,
    lng: 100.5730255,
    distanceKm: null,

    servicesAvailable: [
      "thai-massage",
      "aromatherapy",
      "gentlemans-recovery",
      "sunred-signature"
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
  },

  // =========================================================
  // 3. HAMI
  // =========================================================
  {
    id: "HamiSunRed",
    name: "Hami",
    image: "/images/Hami/Hami3.jpeg",
    rating: 4.5,
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

    lat: 13.7829994,
    lng: 100.5755031,
    distanceKm: null,

    servicesAvailable: [
      "thai-massage",
      "aromatherapy",
      "gentlemans-recovery"
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
  },

  // =========================================================
  // 4. XING XING
  // =========================================================
  {
    id: "XingXingSunRed",
    name: "XingXing",
    image: "/images/xing/xi.jpeg",
    rating: 4.6,
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

    lat: 13.765336,
    lng: 100.5604635,
    distanceKm: null,

    servicesAvailable: [
      "thai-massage",
      "aromatherapy",
      "gentlemans-recovery"
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
      language: "Thai, English, Chinese",
    },
  },

  // =========================================================
  // 5. BARBIE
  // =========================================================
  {
    id: "BarbieSunRed",
    name: "Barbie",
    image: "/images/Barbie/Barbie2.jpeg",
    rating: 4.5,
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

    lat: 13.765336,
    lng: 100.5604635,
    distanceKm: null,

    servicesAvailable: [
      "thai-massage",
      "aromatherapy",
      "gentlemans-recovery"
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
      language: "Thai / English",
    },
  },
  // =========================================================
  // 6. MINI
  // =========================================================
  {
    id: "MiniSunRed",
    name: "Mini",
    image: "/images/Mini/Mini3.jpeg",
    rating: 4.5,
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

    lat: 13.7513099,
    lng: 100.5730255,
    distanceKm: null,

    servicesAvailable: [
      "thai-massage",
      "aromatherapy",
      "gentlemans-recovery",
      "sunred-signature"
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
      language: "Thai / English / Korean",
    },
  },

  // =========================================================
  // 7. JI-A
  // =========================================================
  {
    id: "JiASunRed",
    name: "Ji A",
    image: "/images/Ji-a (จีอา)/Ji-a2.jpeg",
    rating: 4.5,
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

    lat: 13.7513099,
    lng: 100.5730255,
    distanceKm: null,

    servicesAvailable: [
      "thai-massage",
      "aromatherapy",
      "gentlemans-recovery",
      "sunred-signature"
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
      language: "Thai / English",
    },
  },

  // =========================================================
  // 8. VIVIAN
  // =========================================================
  {
    id: "VivianSunRed",
    name: "Vivian",
    image: "/images/Vivian/Vivian1.jpeg",
    rating: 4.5,
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

    lat: 13.7513099,
    lng: 100.5730255,
    distanceKm: null,

    servicesAvailable: [
      "thai-massage",
      "aromatherapy",
      "gentlemans-recovery",
      "sunred-signature"
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
  },

  // =========================================================
  // 9. NANNY
  // =========================================================
  {
    id: "NannySunRed",
    name: "Nanny",
    image: "/images/nanny/photo_2568-11-23 21.28.47.jpeg",
    rating: 4.5,
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

    lat: 13.7513099,
    lng: 100.5730255,
    distanceKm: null,

    servicesAvailable: [
      "thai-massage",
      "aromatherapy",
      "gentlemans-recovery",
      "sunred-signature"
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
      language: "Thai / English",
    },
  },
];

export default therapists;