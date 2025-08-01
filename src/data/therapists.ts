import { Therapist } from '@/types/therapist';

const therapists: Omit<Therapist, 'badge'>[] = [
  {
    id: 'erYKvEtJSRoC2eWqn89U',
    name: 'Yuri',
    image: '/images/yuri/yuri.jpeg',
    rating: 4.5,
    reviews: 0,
    lat: 13.765336,
    lng: 100.5604635,
    todayBookings: 0,
    totalBookings: 0,
    nextAvailable: 'N/A',
    startTime: '18:00',
    endTime: '05:00',
    specialty: '',
    gallery: [
      '/images/yuri/y9.jpeg',
      '/images/yuri/y10.jpeg',
      '/images/yuri/y7.jpeg',
      '/images/yuri/y8.jpeg',
      '/images/yuri/y5.jpeg',
      '/images/yuri/y4.jpeg',
      '/images/yuri/y11.jpeg',
      '/images/yuri/y6.jpeg',
      '/images/yuri/Y1.jpeg',
    ],
    features: {
      age: '28',
      gender: 'Female',
      ethnicity: 'Thai',
      height: '160 cm',
      weight: '49 kg',
      skintone: 'White skin',
      bodyType: 'Slim',
      bustSize: 'C Cup',
      hairColor: 'Black',
      vaccinated: 'Yes',
      smoker: 'No',
      language: 'Thai / English',
    },
    status: 'available',
  },
  {
    id: '3mxMYv5wMNHmOqQmXY6u',
    name: 'Jenny',
    image: '/images/mint/mint.jpg',
    rating: 4.5,
    reviews: 0,
    lat: 13.7563,
    lng: 100.5018,
    todayBookings: 0,
    totalBookings: 0,
    nextAvailable: 'N/A',
    startTime: '19:00',
    endTime: '05:00',
    specialty: '',
    gallery: [
      '/images/mint/m7.jpeg',
      '/images/mint/m3.jpeg',
      '/images/mint/m6.jpeg',
      '/images/mint/m5.jpeg',
      '/images/mint/m5.JPG',
      '/images/mint/m1.jpeg',
      '/images/mint/m2.jpeg',
      '/images/mint/mint4.JPG',
    ],
    features: {
      age: '28',
      gender: 'Female',
      ethnicity: 'Thai',
      height: '160 cm',
      weight: '49 kg',
      skintone: 'White skin',
      bodyType: 'Slim',
      bustSize: 'C Cup',
      hairColor: 'Brown',
      vaccinated: 'Yes',
      smoker: 'No',
      language: 'Thai English Korea',
    },
    status: 'available',
  },
  {
    id: 'HntS3ZEcgtxkTn114lTT',
    name: 'Ji A',
    image: '/images/jimin/jimin.JPG',
    rating: 4.5,
    reviews: 0,
    lat: 13.765336,
    lng: 100.5604635,
    todayBookings: 0,
    totalBookings: 0,
    nextAvailable: 'N/A',
    startTime: '19:00',
    endTime: '04:00',
    specialty: '',
    gallery: [
      '/images/jimin/j3.jpg',
      '/images/jimin/j5.jpg',
      '/images/jimin/j4.jpg',
      '/images/jimin/j2.jpg',
      '/images/jimin/j1.jpg',
    ],
    features: {
      age: '27',
      gender: 'Female',
      ethnicity: 'Thai',
      height: '159 cm',
      weight: '57 kg',
      skintone: 'White skin',
      bodyType: 'Curvy',
      bustSize: '34B',
      hairColor: 'Black',
      vaccinated: 'Yes',
      smoker: 'No',
      language: 'Thai English Korea',
    },
    status: 'available',
  },
  {
    id: '1Sn1TSppDCFTwChknxsi',
    name: 'XingXing',
    image: '/images/xing/Xing.jpeg',
    rating: 4.5,
    reviews: 0,
    lat: 13.765336,
    lng: 100.5604635,
    todayBookings: 0,
    totalBookings: 0,
    nextAvailable: 'N/A',
    startTime: '06:00',
    endTime: '23:00',
    specialty: '',
   gallery: [
      '/images/xing/IMG_4817.JPG',
      '/images',
      '/images',
      '/images',
      '/images',
    ],
    features: {
      age: '26',
      gender: 'Female',
      ethnicity: 'Thai',
      height: '160 cm',
      weight: '56 kg',
      skintone: 'Light skin',
      bodyType: 'Curvy',
      bustSize: 'D Cup',
      hairColor: 'Light Brown',
      vaccinated: 'Yes',
      smoker: 'No',
      language: 'Thai English Chinese',
    },
    status: 'available',
  },
  {
    id: 'sIvv3y5uPh4QSulzUWcn',
    name: 'Popy',
    image: '/images/popy/ti.JPG',
    rating: 4.5,
    reviews: 0,
    lat: 13.7563,
    lng: 100.5018,
    todayBookings: 0,
    totalBookings: 0,
    nextAvailable: 'N/A',
    startTime: '19:00',
    endTime: '03:00',
    specialty: '',
    gallery: [],

    features: {
      age: '28',
      gender: 'Female',
      ethnicity: 'Thai',
      height: '160 cm',
      weight: '49 kg',
      skintone: 'White skin',
      bodyType: 'Slim',
      bustSize: '34B',
      hairColor: 'Black',
      vaccinated: 'Yes',
      smoker: 'No',
      language: 'Thai / English',
    },
    status: 'resting',
  },
  {
    id: 'MpJgtiJeWNumxOO7L7X3',
    name: 'Yomi',
    image: '/images/yomi/ii.JPG',
    rating: 4.5,
    reviews: 0,
    lat: 13.7563,
    lng: 100.5018,
    todayBookings: 0,
    totalBookings: 0,
    nextAvailable: 'N/A',
    startTime: '21:00',
    endTime: '03:00',
    specialty: '',
    gallery: [],
    features: {
      age: '28',
      gender: 'Female',
      ethnicity: 'Thai',
      height: '160 cm',
      weight: '47 kg',
      bodyType: 'Slim',
      skintone: 'Medium skin',
      bustSize: '34B',
      hairColor: 'Black',
      vaccinated: 'Yes',
      smoker: 'No',
      language: 'Thai / English',
    },
    status: 'resting',
  },
];

export default therapists;