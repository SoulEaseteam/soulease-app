// src/services/reviewService.ts

import { db } from '@/firebase';
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  getDocs,
  query,
  where,
  orderBy,
} from 'firebase/firestore';
import { Booking } from '@/types/firebaseSchemas';

/** Add a review to a completed booking */
export const addReviewToBooking = async (
  bookingId: string,
  review: {
    rating: number;
    comment: string;
    createdAt: Date;
  }
) => {
  const ref = doc(db, 'bookings', bookingId);
  await updateDoc(ref, {
    review,
  });
};

/** Get all reviews for a therapist */
export const getReviewsForTherapist = async (
  therapistId: string
): Promise<Booking['review'][]> => {
  const q = query(
    collection(db, 'bookings'),
    where('therapistId', '==', therapistId),
    where('status', '==', 'completed'),
    where('review', '!=', null),
    orderBy('time', 'desc')
  );
  const snap = await getDocs(q);
  const reviews = snap.docs
    .map((doc) => doc.data().review)
    .filter((r) => r !== undefined);

  return reviews;
};