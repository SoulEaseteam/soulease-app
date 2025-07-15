// src/services/userService.ts

import { db } from '@/firebase';
import {
  doc,
  getDoc,
  updateDoc,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { User } from '@/types/firebaseSchemas';

/** Get user by ID */
export const getUserById = async (uid: string): Promise<User | null> => {
  const ref = doc(db, 'users', uid);
  const snap = await getDoc(ref);
  return snap.exists() ? (snap.data() as User) : null;
};

/** Update favorite therapist list */
export const updateFavoriteTherapists = async (
  uid: string,
  therapistIds: string[]
) => {
  const ref = doc(db, 'users', uid);
  await updateDoc(ref, { favoriteTherapists: therapistIds });
};

/** Update user profile */
export const updateUserProfile = async (
  uid: string,
  data: Partial<User>
) => {
  const ref = doc(db, 'users', uid);
  await updateDoc(ref, {
    ...data,
    updatedAt: serverTimestamp(),
  });
};

/** Create user document if not exists (e.g. after sign up) */
export const createUserIfNotExists = async (
  uid: string,
  data: Omit<User, 'uid'>
) => {
  const ref = doc(db, 'users', uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      ...data,
      createdAt: serverTimestamp(),
    });
  }
};