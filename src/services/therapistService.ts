// src/services/therapistService.ts
import { db } from '@/firebase';
import {
  collection,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  QueryConstraint,
} from 'firebase/firestore';
import { Therapist } from '@/types/firebaseSchemas';

const therapistRef = collection(db, 'therapists');

/** ✅ Get a single therapist by ID */
export const getTherapistById = async (id: string): Promise<Therapist | null> => {
  const ref = doc(db, 'therapists', id);
  const snap = await getDoc(ref);
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as Therapist) : null;
};

/** ✅ Get all therapists (optionally filter & sort) */
export const listTherapists = async (options?: {
  onlyAvailable?: boolean;
  orderByField?: keyof Therapist;
  orderDirection?: 'asc' | 'desc';
}): Promise<Therapist[]> => {
  const constraints: QueryConstraint[] = [];

  if (options?.onlyAvailable) {
    constraints.push(where('available', '==', 'available'));
  }
  if (options?.orderByField) {
    constraints.push(orderBy(options.orderByField as string, options.orderDirection || 'asc'));
  }

  const q = constraints.length ? query(therapistRef, ...constraints) : therapistRef;
  const snap = await getDocs(q);
  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Therapist));
};

/** ✅ Real-time listener */
export const subscribeTherapists = (
  callback: (therapists: Therapist[]) => void
) => {
  return onSnapshot(therapistRef, (snap) => {
    const data = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Therapist));
    callback(data);
  });
};

/** ✅ Update therapist availability */
export const updateTherapistStatus = async (
  id: string,
  status: Therapist['available']
) => {
  await updateDoc(doc(db, 'therapists', id), { available: status });
};

/** ✅ Update multiple fields */
export const updateTherapistFields = async (
  id: string,
  fields: Partial<Therapist>
) => {
  await updateDoc(doc(db, 'therapists', id), fields);
};