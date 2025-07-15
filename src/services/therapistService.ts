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
} from 'firebase/firestore';
import { Therapist } from '@/types/firebaseSchemas';

/** Get a single therapist by ID */
export const getTherapistById = async (id: string): Promise<Therapist | null> => {
  const ref = doc(db, 'therapists', id);
  const snap = await getDoc(ref);
  return snap.exists() ? (snap.data() as Therapist) : null;
};

/** Get all therapists, optionally filtered by availability */
export const listTherapists = async (onlyAvailable = true): Promise<Therapist[]> => {
  const ref = collection(db, 'therapists');
  const snap = await getDocs(ref);
  let therapists = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Therapist[];
  if (onlyAvailable) {
    therapists = therapists.filter((t) => t.available === 'available');
  }
  return therapists;
};

/** Listen to real-time updates */
export const subscribeTherapists = (
  callback: (therapists: Therapist[]) => void
) => {
  const ref = query(collection(db, 'therapists'));
  return onSnapshot(ref, (snap) => {
    const data = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Therapist[];
    callback(data);
  });
};

/** Update availability status */
export const updateTherapistStatus = async (
  id: string,
  status: Therapist['available']
) => {
  const ref = doc(db, 'therapists', id);
  await updateDoc(ref, { available: status });
};

/** Update badge or any field */
export const updateTherapistFields = async (
  id: string,
  fields: Partial<Therapist>
) => {
  const ref = doc(db, 'therapists', id);
  await updateDoc(ref, fields);
};
