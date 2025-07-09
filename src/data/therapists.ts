import { Therapist } from '@/types/therapist';
import { getTherapistBadge } from '@/utils/therapistBadge';
import { isNowInRange } from '@/utils/time';
import { collection, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '@/firebase';

const therapistData: Omit<Therapist, 'sticker' | 'badge' | 'isAvailableNow' | 'available'>[] = [


  {
    id: 'pYk6cbMkTFd4dC4EupnK',
    name: 'Yuri',
    image: '/images/yuri/yuri.jpeg',
    rating: 0,
    reviews: 0,
    experience: '3 years',
    lat: 13.7563,
    lng: 100.5018,
    todayBookings: 0,
    totalBookings: 0,
    nextAvailable: 'N/A',
    startTime: '20:00',
    endTime: '05:00',
    manualStatus: 'holiday', // ✅ เพิ่มไว้เพื่อให้ admin ปรับเองได้
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
      age: '27',
      gender: 'Female',
      ethnicity: 'Thai',
      height: '160 cm',
      weight: '47 kg',
      skintone: 'Olive Skin',
      bodyType: 'Slim',
      bustSize: 'D Cup',
      hairColor: 'Black',
      vaccinated: 'Yes',
      smoker: 'No',
      language: 'Thai / English',
      style: 'Gentle',
    },
    specialty: ''
  },
  {
    id: 'ONcJq0zIHyLCja8GPGHr',
    name: 'Emily',
    image: '/images/mint/mint.jpg',
    rating: 0,
    reviews: 0,
    experience: '4 years',
    lat: 13.7563,
    lng: 100.5018,
    todayBookings: 0,
    totalBookings: 0,
    nextAvailable: 'N/A',
    startTime: '20:00',
    endTime: '03:00',
    manualStatus: 'holiday', // ✅ เพิ่มไว้เพื่อให้ admin ปรับเองได้
    gallery: [
      '/images/mint/m7.jpeg',
      '/images/mint/m3.jpeg',
      '/images/mint/m6.jpeg',
      '/images/mint/m5.jpeg',
      '/images/mint/m5.JPG',
      '/images/mint/m1.jpeg',
      '/images/mint/m2.jpeg',
    ],
    features: {
      age: '28',
      gender: 'Female',
      ethnicity: 'Thai',
      height: '162 cm',
      weight: '47 kg',
      skintone: 'Light skin',
      bodyType: 'Slim',
      bustSize: 'D Cup',
      hairColor: 'Light Brown',
      vaccinated: 'Yes',
      smoker: 'No',
      language: 'Thai / English',
      style: 'Friendly',
    },
    specialty: ''
  },
  {
    id: 'q6hitQiCqkimj9zKk9jK',
    name: 'Ji A',
    image: 'jimin/jimin.JPG',
    rating: 0,
    reviews: 0,
    experience: '2 years',
    lat: 13.7563,
    lng: 100.5018,
    todayBookings: 0,
    totalBookings: 0,
    nextAvailable: 'N/A',
    startTime: '20:00',
    endTime: '03:00',
    manualStatus: 'holiday', // ✅ เพิ่มไว้เพื่อให้ admin ปรับเองได้
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
      height: '160 cm',
      weight: '53 kg',
      skintone: 'Medium skin',
      bodyType: 'Curvy',
      bustSize: '34B',
      hairColor: 'Black',
      vaccinated: 'Yes',
      smoker: 'No',
      language: 'Thai / English',
      style: 'Energetic',
    },
    specialty: ''
  },
  {
    id: 'gj6HpvcMumOvJEfitg6W',
    name: 'xingxing',
    image: '/servid/IMG_1551.jpg',
    rating: 0,
    reviews: 0,
    experience: '3 years',
    lat: 13.7563,
    lng: 100.5018,
    todayBookings: 0,
    totalBookings: 0,
    nextAvailable: 'N/A',
    startTime: '07:00',
    endTime: '18:00',
    manualStatus: 'holiday', // ✅ เพิ่มไว้เพื่อให้ admin ปรับเองได้
    gallery: [
      '/images',
      '/images',
      '/images',
      '/images',
      '/images',
      '/images',
    ],
    features: {
      age: '28',
      gender: 'Female',
      ethnicity: 'Thai',
      height: '160 cm',
      weight: '47 kg',
      skintone: 'Light skin',
      bodyType: 'Curvy',
      bustSize: 'E Cup',
      hairColor: 'Black',
      vaccinated: 'Yes',
      smoker: 'No',
      language: 'Thai / English',
      style: 'Gentle',
    },
    specialty: ''
  },
  {
    id: 'PzImxKgA4vNPaojJTXal',
    name: 'Popy',
    image: '/servid/IMG_1562.JPG',
    rating: 0,
    reviews: 0,
    experience: '3 years',
    lat: 13.7563,
    lng: 100.5018,
    todayBookings: 0,
    totalBookings: 0,
    nextAvailable: 'N/A',
    startTime: '12:00',
    endTime: '22:00',
    manualStatus: 'holiday', // ✅ เพิ่มไว้เพื่อให้ admin ปรับเองได้
    gallery: [
      '/images',
      '/images',
      '/images',
      '/images',
      '/images',
      '/images',
    ],
    features: {
      age: '28',
      gender: 'Female',
      ethnicity: 'Thai',
      height: '160 cm',
      weight: '47 kg',
      skintone: 'Medium skin',
      bodyType: 'Slim',
      bustSize: '34B',
      hairColor: 'Black',
      vaccinated: 'Yes',
      smoker: 'No',
      language: 'Thai / English',
      style: 'Gentle',
    },
    specialty: ''
  },
  {
    id: 'LaxxviS487VEUuT5GV0F',
    name: 'Yomi',
    image: 'therapists_demo/ti.JPG',
    rating: 0,
    reviews: 0,
    experience: '3 years',
    lat: 13.7563,
    lng: 100.5018,
    todayBookings: 0,
    totalBookings: 0,
    nextAvailable: 'N/A',
    startTime: '20:00',
    endTime: '03:00',
    manualStatus: 'holiday', // ✅ เพิ่มไว้เพื่อให้ admin ปรับเองได้
    gallery: [
      '/images',
      '/images',
      '/images',
      '/images',
      '/images',
      '/images',
    ],
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
      style: 'Gentle',
    },
    specialty: ''
  },
];

export const fetchTherapists = async (): Promise<Therapist[]> => {
  const snapshot = await getDocs(collection(db, 'therapists'));

  return snapshot.docs.map((doc) => {
    const t = doc.data() as Therapist;
    return processTherapist(t);
  });
};

// ✅ ใช้สำหรับ HomePage realtime
export const subscribeToTherapists = (callback: (data: Therapist[]) => void) => {
  return onSnapshot(collection(db, 'therapists'), (snapshot) => {
    const result = snapshot.docs.map((doc) => {
      const t = doc.data() as Therapist;
      return processTherapist(t);
    });
    callback(result);
  });
};

// ✅ ฟังก์ชันช่วยจัด format แต่ละ Therapist
const processTherapist = (t: Therapist): Therapist => {
  const isAvailableNow = isNowInRange(t.startTime ?? '', t.endTime ?? '');

  let available: Therapist['available'];
  if (typeof window !== 'undefined') {
    const holidayOverrides = JSON.parse(localStorage.getItem('holidayOverrides') || '{}');
    if (holidayOverrides[t.id] || t.manualStatus === 'holiday') {
      available = 'holiday';
    } else {
      available = (t.todayBookings ?? 0) >= 5 ? 'resting' : 'available';
    }
  } else {
    available = (t.todayBookings ?? 0) >= 5 ? 'resting' : 'available';
  }

  return {
    ...t,
    isAvailableNow,
    available,
    badge: getTherapistBadge({ ...t, available }),
  };
};

// ✅ default export เพื่อให้ import ได้ง่าย
const therapists = therapistData.map((t) => processTherapist(t as Therapist));
export default therapists;