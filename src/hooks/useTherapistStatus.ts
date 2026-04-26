// src/hooks/useTherapistStatus.ts
import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { calcStatusAndNext, type BookingLike } from "@/utils/schedule";

export const useTherapistStatus = (therapist: any) => {
  const [bookings, setBookings] = useState<BookingLike[]>([]);

  useEffect(() => {
    if (!therapist?.id) return;

    const q = query(
      collection(db, "bookings"),
      where("therapistId", "==", therapist.id)
    );

    const unsub = onSnapshot(q, (snap) => {
      const list: BookingLike[] = snap.docs.map((d) => d.data() as any);
      setBookings(list);
    });

    return () => unsub();
  }, [therapist?.id]);

  const { status, nextAvailable } = useMemo(() => {
    return calcStatusAndNext(new Date(), bookings, {
      startHHMM: therapist.startTime,
      endHHMM: therapist.endTime,
    });
  }, [bookings, therapist?.startTime, therapist?.endTime]);

  return { status, nextAvailable };
};