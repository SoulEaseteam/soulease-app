// src/services/reviewService.ts
import { db } from "@/lib/firebase";
import {
  doc,
  updateDoc,
  serverTimestamp,
  collection,
  getDocs,
  query,
  where,
  orderBy,
} from "firebase/firestore";
import type { BookingReview } from "@/types/firebaseSchemas";

/**
 * ✅ เพิ่มรีวิวเข้า booking ที่ทำเสร็จแล้ว
 */
export const addReviewToBooking = async (
  bookingId: string,
  review: {
    rating: number;
    comment: string;
  }
) => {
  const ref = doc(db, "bookings", bookingId);
  await updateDoc(ref, {
    review: {
      ...review,
      createdAt: serverTimestamp(), // ใช้ Firestore server time
    },
  });
};

/**
 * ✅ ดึงรีวิวทั้งหมดของ therapist
 * - เฉพาะ booking ที่ status = completed
 * - เรียงจากใหม่ → เก่า
 */
export const getReviewsForTherapist = async (
  therapistId: string
): Promise<BookingReview[]> => {
  const q = query(
    collection(db, "bookings"),
    where("therapistId", "==", therapistId),
    where("status", "==", "completed"),
    where("review.rating", ">", 0),
    orderBy("review.createdAt", "desc")
  );

  const snap = await getDocs(q);
  return snap.docs
    .map((doc) => doc.data().review as BookingReview)
    .filter((r) => r !== undefined);
};