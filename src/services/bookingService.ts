import { db } from '@/firebase';
import { addDoc, collection, Timestamp } from 'firebase/firestore';
import { Booking } from '@/firebase';

/**
 * Create a booking in Firestore.
 * If the user is not logged in, userId will be 'guest'.
 */
export const createBooking = async (bookingData: Omit<Booking, 'createdAt'>) => {
  try {
    const docRef = await addDoc(collection(db, 'bookings'), {
      ...bookingData,
      createdAt: Timestamp.now(),
    });

    console.log('Booking created with ID:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('Error creating booking:', error);
    throw error;
  }
};