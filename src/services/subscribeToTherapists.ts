import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { Therapist } from '@/types/therapist';

export const subscribeToTherapists = (
  callback: (data: Therapist[]) => void
) => {
  const unsubscribe = onSnapshot(collection(db, 'therapists'), (snapshot) => {
    const data = snapshot.docs.map((doc) => ({
      id: doc.id, // ✅ เอา Document ID มาเป็น id
      ...doc.data(),
    })) as Therapist[];

    callback(data);
  });

  return unsubscribe;
};