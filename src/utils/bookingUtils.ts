import { db } from '@/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';

export interface Booking {
  dateTime: string;
  therapistId: string;
}

export const getBookingsForTherapist = async (therapistId: string): Promise<Booking[]> => {
  const bookingsRef = collection(db, 'bookings');
  const q = query(bookingsRef, where('therapistId', '==', therapistId));

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    ...(doc.data() as Booking),
  }));
};