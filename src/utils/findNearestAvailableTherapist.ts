// src/utils/findNearestAvailableTherapist.ts

import { Therapist } from '@/types/therapist';
import { getDistanceInKm } from './geoUtils';
import { getBookingsForTherapist } from './bookingUtils';

interface Booking {
  dateTime: string;
}

export const findNearestAvailableTherapist = async (
  therapists: Therapist[],
  userLat: number,
  userLng: number,
  selectedTime: Date
): Promise<Therapist | null> => {
  const filteredTherapists = await Promise.all(
    therapists.map(async (t) => {
      // เงื่อนไขเบื้องต้น: ต้อง available และมีพิกัดล่าสุด
      if (t.available !== 'available' || !t.currentLocation) return null;

      const bookings: Booking[] = await getBookingsForTherapist(t.id);

      // ตรวจสอบเวลาจองซ้ำ (ภายใน 1 ชม.)
      const hasConflict = bookings.some((b) => {
        const bookedTime = new Date(b.dateTime).getTime();
        const targetTime = selectedTime.getTime();
        return Math.abs(bookedTime - targetTime) < 60 * 60 * 1000;
      });

      if (hasConflict) return null;

      // เรียกใช้งาน getDistanceInKm แบบ 4 อาร์กิวเมนต์
      const distance = getDistanceInKm(
        userLat,
        userLng,
        t.currentLocation.lat,
        t.currentLocation.lng
      );

      return { ...t, distance };
    })
  );

  // เรียงตามระยะทางจากใกล้ไปไกล
  const sorted = filteredTherapists
    .filter((t): t is Therapist & { distance: number } => t !== null)
    .sort((a, b) => a.distance - b.distance);

  return sorted[0] || null;
};