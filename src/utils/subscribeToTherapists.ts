// src/utils/subscribeToTherapists.ts

import { collection, onSnapshot } from 'firebase/firestore';
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
  onlyAvailable = true,
  minRating,
  maxDistanceKm,
  userLocation,
  callback,
}: Options) => {
  const q = collection(db, 'therapists');

  const unsubscribe = onSnapshot(q, (snapshot) => {
    let data = snapshot.docs.map((doc) => {
      const raw = doc.data() as Therapist;

      return {
        ...raw,
        id: doc.id,
        available: getComputedStatus(raw), // ✅ คำนวณสถานะแบบอัตโนมัติ
      };
    });

    if (onlyAvailable) {
      data = data.filter((t) => t.available === 'available');
    }

    if (minRating !== undefined) {
      data = data.filter((t) => t.rating >= minRating);
    }

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

// ✅ คำนวณสถานะอัตโนมัติจากเวลา, การจอง, และ override
const getComputedStatus = (t: Therapist): Therapist['available'] => {
  if (t.statusOverride === 'resting') return 'resting'; // แอดมินสั่งพัก

  const now = new Date();
  const [startHour = 0, startMin = 0] = t.startTime?.split(':').map(Number) || [];
  const [endHour = 0, endMin = 0] = t.endTime?.split(':').map(Number) || [];

  const start = new Date(now);
  const end = new Date(now);
  start.setHours(startHour, startMin, 0);
  end.setHours(endHour, endMin, 0);

  // รองรับกรณีข้ามคืน เช่น 20:00 - 03:00
  if (end <= start) end.setDate(end.getDate() + 1);

  const inWorkingHours = now >= start && now <= end;

  if (inWorkingHours) {
    return t.isBooked === true ? 'bookable' : 'available';
  }

  return 'resting';
};
// ✅ Haversine formula คำนวณระยะทาง (km)
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