// src/services/notificationService.ts

import { db } from '@/firebase';
import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { Notification } from '@/types/firebaseSchemas';

/** Send a notification to a user */
export const sendLineNotify = async (message: string) => {
  const token = import.meta.env.VITE_LINE_NOTIFY_TOKEN;
  try {
    await fetch('https://notify-api.line.me/api/notify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Bearer ${token}`,
      },
      body: new URLSearchParams({ message }),
    });
  } catch (err) {
    console.error('Line Notify Error:', err);
  }
};

/** Listen to real-time notifications for a user */
export const listenToNotifications = (
  userId: string,
  callback: (notifications: Notification[]) => void
) => {
  const q = query(
    collection(db, 'notifications'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(q, (snap) => {
    const notifications = snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Notification[];
    callback(notifications);
  });
};