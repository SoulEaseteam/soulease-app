// src/utils/findNearestAvailableTherapist.ts
import type { Therapist } from "@/types/therapist";
import { getDistanceInKm } from "@/utils/geoUtils";
import { getBookingsForTherapist, type BookingSlim } from "@/utils/getBookingsForTherapist";
import { getTherapistStatus } from "@/utils/getTherapistStatus";
import { workingWindowThai } from "@/utils/workingHours";
import { toDateLike } from "@/utils/dateHelpers";

/**
 * หาน้องที่ “ว่างจริง + ใกล้ที่สุด”
 */
export const findNearestAvailableTherapist = async (
  therapists: Therapist[],
  userLat: number,
  userLng: number,
  selectedStart: Date,
  durationMin: number
): Promise<Therapist | null> => {

  const selectedEnd = new Date(selectedStart.getTime() + durationMin * 60000);

  const list = await Promise.all(
    therapists.map(async (t) => {
      // ❌ ไม่มี location → ข้าม
      if (!t.currentLocation?.lat || !t.currentLocation?.lng) return null;

      // ❌ ไม่ available จริง → ข้าม
      const realStatus = getTherapistStatus(t);
      if (realStatus !== "available") return null;

      // ❌ นอกเวลางาน → ข้าม
      const { start: ws, end: we } = workingWindowThai(selectedStart, t.startTime, t.endTime);
      if (!ws || !we) return null;
      if (!(selectedStart >= ws && selectedEnd <= we)) return null;

      // 🔍 ดึงงานใน Firestore
      const bookings: BookingSlim[] = await getBookingsForTherapist(t.id);

      // ❌ ชนงานเก่า → ข้าม
      let conflict = false;
      const newStart = selectedStart.getTime();
      const newEnd = selectedEnd.getTime();

      for (const b of bookings) {
        const s = toDateLike(b.startAt)?.getTime();
        const e = toDateLike(b.endAt)?.getTime();
        if (!s || !e) continue;

        if (newStart < e && newEnd > s) {
          conflict = true;
          break;
        }
      }

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

  const sorted = list
    .filter((x): x is Therapist & { distance: number } => x !== null)
    .sort((a, b) => a.distance - b.distance);

  return sorted[0] ?? null;
};