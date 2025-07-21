import { getCurrentPosition } from './getCurrentPosition';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/firebase';
import { getCurrentPosition } from './getCurrentPosition';

export const updateUserLocation = async (uid: string, collection: 'therapists' | 'users') => {
  try {
    const position = await getCurrentPosition();
    const { latitude, longitude } = position.coords;

    await updateDoc(doc(db, collection, uid), {
      currentLocation: { lat: latitude, lng: longitude },
      updatedAt: new Date(),
    });

    return { lat: latitude, lng: longitude };
  } catch (error) {
    console.error('Failed to update location:', error);
    throw error;
  }
};