import { Timestamp } from "firebase/firestore";

const defaultTherapistFields = {
  statusOverride: "Auto",
  isAvailableNow: false,
  isBooked: false,
  isHoliday: false,
  nextAvailable: "N/A",
  todayBookings: 0,
  totalBookings: 0,
  rating: 4.5,
  reviews: 0,
  updatedAt: Timestamp.now(),
};

export function normalizeTherapist(raw: any): any {
  const data = { ...raw };

  // ลบ field ที่ไม่จำเป็น
  delete data.manualStatus;
  delete data.manualOpen;
  delete data.mode;

  // เติม field ที่ขาดด้วยค่า default
  for (const key in defaultTherapistFields) {
    if (!(key in data)) {
      data[key] = defaultTherapistFields[key as keyof typeof defaultTherapistFields];
    }
  }

  return data;
}