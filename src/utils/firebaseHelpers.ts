// src/utils/firebaseHelpers.ts

import { db, storage } from '@/firebase';
import {
  doc,
  getDoc,
  setDoc,
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  onSnapshot,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';

import {
  Therapist,
  Booking,
  User,
  Notification,
} from '@/types/firebaseSchemas';

import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';

/**
 * Therapist Helpers
 */
export const getTherapistById = async (id: string): Promise<Therapist | null> => {
  const ref = doc(db, 'therapists', id);
  const snap = await getDoc(ref);
  return snap.exists() ? (snap.data() as Therapist) : null;
};

export const fetchAllTherapists = async (): Promise<Therapist[]> => {
  const ref = collection(db, 'therapists');
  const snap = await getDocs(ref);
  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Therapist[];
};

export const deleteTherapistById = async (id: string) => {
  const ref = doc(db, 'therapists', id);
  await deleteDoc(ref);
};

/**
 * Booking Helpers
 */
export const createBooking = async (booking: Booking) => {
  const ref = collection(db, 'bookings');
  await addDoc(ref, {
    ...booking,
    createdAt: serverTimestamp(),
  });
};

export const getBookingsByUserId = async (userId: string): Promise<Booking[]> => {
  const ref = query(collection(db, 'bookings'), where('userId', '==', userId), orderBy('time', 'desc'));
  const snap = await getDocs(ref);
  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Booking[];
};

export const listenToBookingsByUserId = (
  userId: string,
  callback: (bookings: Booking[]) => void
) => {
  const ref = query(collection(db, 'bookings'), where('userId', '==', userId), orderBy('time', 'desc'));
  return onSnapshot(ref, (snap) => {
    const bookings = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Booking[];
    callback(bookings);
  });
};

export const updateBookingStatus = async (bookingId: string, status: Booking['status']) => {
  const ref = doc(db, 'bookings', bookingId);
  await updateDoc(ref, { status, updatedAt: serverTimestamp() });
};

/**
 * User Helpers
 */
export const getUserById = async (uid: string): Promise<User | null> => {
  const ref = doc(db, 'users', uid);
  const snap = await getDoc(ref);
  return snap.exists() ? (snap.data() as User) : null;
};

export const updateUserFavorites = async (uid: string, therapistIds: string[]) => {
  const ref = doc(db, 'users', uid);
  await updateDoc(ref, { favoriteTherapists: therapistIds });
};

/**
 * Notification Helpers
 */
export const sendNotification = async (notif: Omit<Notification, 'createdAt'>) => {
  const ref = collection(db, 'notifications');
  await addDoc(ref, {
    ...notif,
    createdAt: serverTimestamp(),
  });
};

export const listenToNotifications = (
  userId: string,
  callback: (notifications: Notification[]) => void
) => {
  const ref = query(collection(db, 'notifications'), where('userId', '==', userId), orderBy('createdAt', 'desc'));
  return onSnapshot(ref, (snap) => {
    const notifications = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Notification[];
    callback(notifications);
  });
};

/**
 * Upload Helpers
 */
export const uploadImage = async (file: File, path: string): Promise<string> => {
  const imageRef = storageRef(storage, path);
  await uploadBytes(imageRef, file);
  return await getDownloadURL(imageRef);
};