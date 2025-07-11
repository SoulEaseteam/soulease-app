// src/utils/fetchTherapists.ts

import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '../firebase';

export interface Therapist {
  id: string;
  name: string;
  image: string;
  rating: number;
  reviews: number;
  available: 'available' | 'bookable' | 'resting' | 'holiday';
  specialty: string;
  experience: string;
  lat: number;
  lng: number;
  updatedAt?: any;
  [key: string]: any;
}

export const subscribeToTherapists = (
  callback: (therapists: Therapist[]) => void
) => {
  const q = query(collection(db, 'therapists'));
  const unsubscribe = onSnapshot(q, (snapshot) => {
    const therapists: Therapist[] = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Therapist[];
    callback(therapists);
  });

  return unsubscribe; // call this to stop listening
};