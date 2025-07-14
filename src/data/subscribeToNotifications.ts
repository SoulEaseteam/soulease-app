import { collection, onSnapshot, query, where, orderBy, Query, DocumentData } from 'firebase/firestore';
import { db } from '@/firebase';

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  isRead: boolean;
  type: string;
  createdAt: any;
}

interface SubscribeOptions {
  userId?: string;
  onlyUnread?: boolean;
  callback: (notifications: Notification[]) => void;
}

export const subscribeToNotifications = ({
  userId,
  onlyUnread = false,
  callback,
}: SubscribeOptions) => {
  // กำหนดให้ q เป็น Query<DocumentData> ตั้งแต่แรก
  let q: Query<DocumentData> = collection(db, 'notifications');

  if (userId) {
    q = query(q, where('userId', '==', userId));
  }
  if (onlyUnread) {
    q = query(q, where('isRead', '==', false));
  }

  q = query(q, orderBy('createdAt', 'desc'));

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const notifications: Notification[] = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as Omit<Notification, 'id'>),
    }));
    callback(notifications);
  });

  return unsubscribe;
};