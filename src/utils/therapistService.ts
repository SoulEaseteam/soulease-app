import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { Therapist } from '@/types/therapist';

interface SubscribeOptions {
  onlyAvailable?: boolean;
  callback: (therapists: Therapist[]) => void;
}

export const subscribeToTherapists = ({ onlyAvailable = false, callback }: SubscribeOptions) => {
  const col = collection(db, 'therapists');
  const q = onlyAvailable
    ? query(col, where('available', 'in', ['available', 'bookable']))
    : query(col);

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const data: Therapist[] = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Therapist[];

    callback(data);
  });

  return unsubscribe;
};