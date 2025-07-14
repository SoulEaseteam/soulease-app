import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/firebase'; // ปรับ path ให้ถูกต้องกับโปรเจกต์คุณ
import { Therapist } from '@/types/therapist';

interface Options {
  onlyAvailable?: boolean;
  minRating?: number;
  maxDistanceKm?: number;
  userLocation?: { lat: number; lng: number };
  callback: (data: Therapist[]) => void;
}

export const subscribeToTherapists = ({
  onlyAvailable = false, // แสดงทุกคนเสมอ
  minRating,
  maxDistanceKm,
  userLocation,
  callback,
}: Options) => {
  const q = collection(db, 'therapists');

  const unsubscribe = onSnapshot(q, (snapshot) => {
    let data = snapshot.docs.map((doc) => {
      const t = doc.data() as Therapist;
      return { ...t, available: 'available' } as Therapist; // แสดงพนักงานทุกคนเสมอ
    });

    if (onlyAvailable) {
      data = data.filter((t) => t.available === 'available');
    }

    if (minRating !== undefined) {
      data = data.filter((t) => t.rating >= minRating);
    }

    if (userLocation && maxDistanceKm !== undefined) {
      data = data.filter((t) => {
        if (!t.currentLocation || typeof t.currentLocation.lat !== 'number' || typeof t.currentLocation.lng !== 'number') {
          return false;
        }
        const distance = getDistanceInKm(userLocation, t.currentLocation);
        return distance <= maxDistanceKm;
      });
    }

    callback(data);
  });

  return unsubscribe;
};

// ตัวอย่างฟังก์ชันคำนวณระยะทาง
export function getDistanceInKm(
  coord1: { lat: number; lng: number },
  coord2: { lat: number; lng: number }
): number {
  const toRad = (x: number) => (x * Math.PI) / 180;
  const R = 6371; // รัศมีโลกเป็นกิโลเมตร
  const dLat = toRad(coord2.lat - coord1.lat);
  const dLng = toRad(coord2.lng - coord1.lng);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(coord1.lat)) * Math.cos(toRad(coord2.lat)) * Math.sin(dLng / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}