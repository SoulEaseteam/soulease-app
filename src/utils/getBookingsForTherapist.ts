// src/utils/getBookingsForTherapist.ts
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";

export type BookingSlim = {
  therapistId: string;
  startAt?: string; // ISO string
  endAt?: string;   // ISO string
  status: string;
};

/** ---------- Helpers ---------- */
const toIso = (v: any): string | undefined => {
  if (!v) return undefined;
  if (typeof v === "string") return new Date(v).toISOString();
  if (typeof v === "number") return new Date(v).toISOString();
  if (v instanceof Date) return v.toISOString();
  if (v?.toDate && typeof v.toDate === "function") {
    try {
      return v.toDate().toISOString();
    } catch {
      return undefined;
    }
  }
  return undefined;
};

/** ---------- Main ---------- */
export const getBookingsForTherapist = async (
  therapistId: string
): Promise<BookingSlim[]> => {
  if (!therapistId) return [];

  const qy = query(
    collection(db, "bookings"),
    where("therapistId", "==", therapistId)
  );

  const snap = await getDocs(qy);

  return snap.docs.map((doc) => {
    const data = doc.data() as any;
    return {
      therapistId,
      startAt: toIso(data.startAt ?? data.startTime ?? data.start),
      endAt: toIso(data.endAt ?? data.endTime ?? data.end),
      status: (data.status as string) || "confirmed",
    };
  });
};