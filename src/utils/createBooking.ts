// src/utils/createBooking.ts
import { auth, db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

export type CreateBookingInput = {
  therapistId: string;
  therapistName?: string;
  serviceName: string;
  servicePrice: number;
  taxiFee?: number;            // default 0
  total: number;               // servicePrice + taxiFee (รวมแล้ว)
  address: string;
  phone: string;
  date: string;                // "YYYY-MM-DD"
  time: string;                // "HH:mm"
  note?: string;
  status?: "pending" | "confirmed" | "completed" | "cancelled";
  userId?: string;             // ถ้าไม่ส่ง จะพยายามใช้ auth.currentUser?.uid
};

export type CreateBookingResult = {
  bookingId: string;
};

function makeISODateTime(date: string, time: string): string {
  // สมมุติเป็นเวลาท้องถิ่นเครื่องลูกค้า แล้วเก็บเป็น ISO (UTC)
  // "2025-07-15" + "21:00" -> new Date("2025-07-15T21:00:00")
  const iso = new Date(`${date}T${time}:00`);
  if (Number.isNaN(iso.getTime())) {
    throw new Error("Invalid date/time format. Expect date=YYYY-MM-DD, time=HH:mm");
  }
  return iso.toISOString();
}

export const createBooking = async (input: CreateBookingInput): Promise<CreateBookingResult> => {
  const {
    therapistId,
    therapistName,
    serviceName,
    servicePrice,
    taxiFee = 0,
    total,
    address,
    phone,
    date,
    time,
    note = "",
    status = "confirmed",
    userId,
  } = input;

  // validation เบื้องต้น
  if (!therapistId) throw new Error("therapistId is required");
  if (!serviceName) throw new Error("serviceName is required");
  if (!address) throw new Error("address is required");
  if (!phone) throw new Error("phone is required");
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("date must be YYYY-MM-DD");
  if (!time || !/^\d{2}:\d{2}$/.test(time)) throw new Error("time must be HH:mm");
  if (!Number.isFinite(servicePrice)) throw new Error("servicePrice must be a number");
  if (!Number.isFinite(total)) throw new Error("total must be a number");

  // ผูกผู้จองกับ auth ถ้ามี
  const currentUid = auth.currentUser?.uid;
  const finalUserId = userId || currentUid || "anonymous";

  // คีย์ช่วยค้นหา
  const dateTime = makeISODateTime(date, time);
  const yearMonth = date.slice(0, 7); // "YYYY-MM"
  const dateKey = date;               // "YYYY-MM-DD"

  const payload = {
    therapistId,
    therapistName: therapistName ?? null,
    serviceName,
    servicePrice,
    taxiFee,
    total,
    address,
    phone,
    date: dateKey,
    time,
    dateTime,          // ISO string ใช้ sort/query ได้ดี
    yearMonth,         // ไว้สรุปรายเดือน
    note,
    status,            // pending/confirmed/completed/cancelled
    userId: finalUserId,
    createdBy: finalUserId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const ref = await addDoc(collection(db, "bookings"), payload);
  return { bookingId: ref.id };
};