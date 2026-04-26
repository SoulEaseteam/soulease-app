// src/utils/firebaseHelpers.ts
import { db, storage } from "@/lib/firebase";
import {
  doc,
  getDoc,
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
} from "firebase/firestore";
import type { Therapist, Booking, User } from "@/types/firebaseSchemas";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";

/** ใช้ type ภายในไฟล์ เพื่อเลี่ยงการอ้างถึง Notification ที่ไม่มี export ใน schema ปัจจุบัน */
type AppNotification = {
  id?: string;
  userId: string;
  title: string;
  message: string;
  type?: "info" | "success" | "warning" | "error";
  read?: boolean;
  createdAt?: any;
};

/* -------------------- Therapist Helpers -------------------- */
export const getTherapistById = async (id: string): Promise<Therapist | null> => {
  const ref = doc(db, "therapists", id);
  const snap = await getDoc(ref);
  return snap.exists() ? (snap.data() as Therapist) : null;
};

export const fetchAllTherapists = async (): Promise<Therapist[]> => {
  const ref = collection(db, "therapists");
  const snap = await getDocs(ref);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Therapist[];
};

export const deleteTherapistById = async (id: string) => {
  await deleteDoc(doc(db, "therapists", id));
};

/* -------------------- Booking Helpers -------------------- */
export const createBooking = async (booking: Booking) => {
  try {
    const ref = collection(db, "bookings");
    await addDoc(ref, {
      ...booking,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (e) {
    console.error("createBooking failed:", e);
    throw e;
  }
};

export const getBookingsByUserId = async (userId: string): Promise<Booking[]> => {
  const qRef = query(
    collection(db, "bookings"),
    where("userId", "==", userId),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(qRef);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Booking[];
};

export const listenToBookingsByUserId = (
  userId: string,
  callback: (bookings: Booking[]) => void
) => {
  const qRef = query(
    collection(db, "bookings"),
    where("userId", "==", userId),
    orderBy("createdAt", "desc")
  );
  return onSnapshot(qRef, (snap) => {
    const bookings = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Booking[];
    callback(bookings);
  });
};

export const updateBookingStatus = async (bookingId: string, status: Booking["status"]) => {
  await updateDoc(doc(db, "bookings", bookingId), {
    status,
    updatedAt: serverTimestamp(),
  });
};

/* -------------------- User Helpers -------------------- */
export const getUserById = async (uid: string): Promise<User | null> => {
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  return snap.exists() ? (snap.data() as User) : null;
};

export const updateUserFavorites = async (uid: string, therapistIds: string[]) => {
  await updateDoc(doc(db, "users", uid), { favoriteTherapists: therapistIds, updatedAt: serverTimestamp() });
};

/* -------------------- Notification Helpers -------------------- */
export const sendNotification = async (notif: Omit<AppNotification, "id" | "createdAt">) => {
  try {
    await addDoc(collection(db, "notifications"), {
      ...notif,
      read: false,
      createdAt: serverTimestamp(),
    });
  } catch (e) {
    console.error("sendNotification failed:", e);
    throw e;
  }
};

export const listenToNotifications = (
  userId: string,
  callback: (notifications: AppNotification[]) => void
) => {
  const qRef = query(
    collection(db, "notifications"),
    where("userId", "==", userId),
    orderBy("createdAt", "desc")
  );
  return onSnapshot(qRef, (snap) => {
    const notifications = snap.docs.map(
      (d) => ({ id: d.id, ...(d.data() as any) }) as AppNotification
    );
    callback(notifications);
  });
};

/* -------------------- Upload Helpers -------------------- */
export const uploadImage = async (file: File, path: string): Promise<string> => {
  const imageRef = storageRef(storage, path);
  await uploadBytes(imageRef, file);
  return await getDownloadURL(imageRef);
};