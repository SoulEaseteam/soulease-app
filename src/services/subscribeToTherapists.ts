import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { Therapist } from '@/types/therapist';

interface Options {
  onlyAvailable?: boolean;
  minRating?: number;
  maxDistanceKm?: number;
  userLocation?: { lat: number; lng: number };
  callback: (data: Therapist[]) => void;
}

export const subscribeToTherapists = ({
  onlyAvailable,
  minRating,
  maxDistanceKm,
  userLocation,
  callback,
}: Options) => {
  const q = collection(db, 'therapists');

  const unsubscribe = onSnapshot(q, (snapshot) => {
    let data = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Therapist[];

    // ✅ 1. Filter เฉพาะสถานะ available
    if (onlyAvailable) {
      data = data.filter((t) => t.available === 'available');
    }

    // ✅ 2. Filter ด้วย rating ขั้นต่ำ
    if (minRating !== undefined) {
      data = data.filter((t) => t.rating >= minRating);
    }

    // ✅ 3. คำนวณระยะทางจากตำแหน่งผู้ใช้
    if (userLocation && maxDistanceKm !== undefined) {
      data = data.filter((t) => {
        if (!t.currentLocation) return false;
        const distance = getDistanceInKm(userLocation, t.currentLocation);
        return distance <= maxDistanceKm;
      });
    }

    callback(data);
  });

  return unsubscribe;
};

// 🔍 เครื่องมือวัดระยะทางแบบ Haversine
const getDistanceInKm = (
  coord1: { lat: number; lng: number },
  coord2: { lat: number; lng: number }
): number => {
  const toRad = (x: number) => (x * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(coord2.lat - coord1.lat);
  const dLng = toRad(coord2.lng - coord1.lng);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(coord1.lat)) *
      Math.cos(toRad(coord2.lat)) *
      Math.sin(dLng / 2) ** 2;

  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
};