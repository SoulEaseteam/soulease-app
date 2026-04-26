// src/utils/findNearestAvailableTherapist.ts
import type { Therapist } from "@/types/therapist";
import { getDistanceInKm } from "@/utils/geoUtils";
import { getBookingsForTherapist, type BookingSlim } from "@/utils/getBookingsForTherapist";
import { getTherapistStatus } from "@/utils/getTherapistStatus";
import { workingWindowThai } from "@/utils/workingHours";
import { toDateLike } from "@/utils/dateHelpers";

/**
 * หา therapist ที่ “ว่างจริง + ใกล้ที่สุด” เวลา selectedTime
 */
export const findNearestAvailableTherapist = async (
  therapists: Therapist[],
  userLat: number,
  userLng: number,
  selectedStart: Date
): Promise<Therapist | null> => {

  // fixed default duration (SunRed ใช้ 60 ถ้าไม่ได้ส่ง duration)
  const selectedEnd = new Date(selectedStart.getTime() + 60 * 60000);

  const filtered = await Promise.all(
    therapists.map(async (t) => {
      // ❌ ไม่มี location → ข้าม
      if (!t.currentLocation?.lat || !t.currentLocation?.lng) return null;

      // ❌ สถานะไม่ available (รองรับ override)
      const realStatus = getTherapistStatus(t);
      if (realStatus !== "available") return null;

      // ❌ นอกเวลางาน (รองรับกะข้ามวัน)
      const { start: wStart, end: wEnd } = workingWindowThai(
        selectedStart,
        t.startTime,
        t.endTime
      );
      if (!wStart || !wEnd) return null;
      if (!(selectedStart >= wStart && selectedEnd <= wEnd)) return null;

      // 🔍 โหลด booking ทั้งหมดของน้องคนนั้น
      const bookings: BookingSlim[] = await getBookingsForTherapist(t.id);

      // ❌ time conflict แบบจริง
      const newStart = selectedStart.getTime();
      const newEnd = selectedEnd.getTime();

      const conflict = bookings.some((b) => {
        const s = toDateLike(b.startAt)?.getTime();
        const e = toDateLike(b.endAt)?.getTime();
        if (!s || !e) return false;

        // overlap จริงแบบ SunRed
        return newStart < e && newEnd > s;
      });

      if (conflict) return null;

      // 📍 คำนวณระยะทาง
      const distance = getDistanceInKm(
        userLat,
        userLng,
        t.currentLocation.lat,
        t.currentLocation.lng
      );

      return { ...t, distance };
    })
  );

  // จัดอันดับคนที่ใกล้ที่สุดก่อน
  const sorted = filtered
    .filter((x): x is Therapist & { distance: number } => x !== null)
    .sort((a, b) => a.distance - b.distance);

  return sorted[0] ?? null;
};