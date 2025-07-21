// src/utils/updateLocation.ts
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

export const updateUserLocation = async (
  userId: string,
  role: 'therapist' | 'customer'
) => {
  if (!navigator.geolocation) {
    alert('Geolocation is not supported on this device');
    return;
  }

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const { latitude, longitude } = position.coords;

      await setDoc(doc(db, 'locations', `${role}_${userId}`), {
        userId,
        role,
        lat: latitude,
        lng: longitude,
        updatedAt: serverTimestamp(),
      }, { merge: true });

      alert('📍 Location updated successfully!');
    },
    (error) => {
      alert(`❌ Failed to get location: ${error.message}`);
    },
    { enableHighAccuracy: true }
  );
};