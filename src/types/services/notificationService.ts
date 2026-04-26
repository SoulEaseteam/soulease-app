// src/services/notificationService.ts
import { db } from "@/lib/firebase";
import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  where,
  doc,
  updateDoc,
  deleteDoc,
  getDocs,
} from "firebase/firestore";

// ใช้ type ภายในไฟล์ให้ยืดหยุ่น ไม่ผูกกับที่อื่น (ป้องกันบิลด์พังเพราะ type export)
export type NotificationDoc = {
  id?: string;
  userId: string;                 // ผู้รับการแจ้งเตือน
  type: "booking" | "payment" | "review" | "system" | string;
  message: string;
  link?: string | null;
  meta?: Record<string, unknown> | null;
  createdAt?: any;                // Firestore Timestamp
  read?: boolean;                 // สำหรับทำเป็นอ่านข้อความแล้ว
};

/**
 * ส่ง/สร้าง Notification 1 รายการ
 */
export async function sendNotification(
  notif: Omit<NotificationDoc, "id" | "createdAt" | "read">
) {
  const col = collection(db, "notifications");
  await addDoc(col, {
    ...notif,
    read: false,
    createdAt: serverTimestamp(),
  });
}

/**
 * Subscribe การแจ้งเตือนของผู้ใช้แบบ realtime
 * คืนค่าเป็นฟังก์ชันยกเลิกการติดตาม (unsubscribe)
 */
export function listenToNotifications(
  userId: string,
  callback: (items: NotificationDoc[]) => void
) {
  const col = collection(db, "notifications");
  const q = query(
    col,
    where("userId", "==", userId),
    orderBy("createdAt", "desc")
  );

  const unsub = onSnapshot(q, (snap) => {
    const list: NotificationDoc[] = snap.docs.map((d) => {
      const data = d.data() as NotificationDoc;
      return {
        id: d.id,
        userId: data.userId,
        type: data.type,
        message: data.message,
        link: data.link ?? null,
        meta: data.meta ?? null,
        createdAt: data.createdAt ?? null,
        read: data.read ?? false,
      };
    });
    callback(list);
  });

  return unsub;
}

/**
 * ทำเครื่องหมายว่าอ่านข้อความแล้ว
 */
export async function markNotificationRead(id: string, read = true) {
  const ref = doc(db, "notifications", id);
  await updateDoc(ref, { read });
}

/**
 * ลบ Notification รายการเดียว
 */
export async function deleteNotification(id: string) {
  const ref = doc(db, "notifications", id);
  await deleteDoc(ref);
}

/**
 * ลบ Notification ทั้งหมดของผู้ใช้ (ระวังการใช้งานจริง)
 */
export async function clearAllNotificationsForUser(userId: string) {
  const col = collection(db, "notifications");
  const q = query(col, where("userId", "==", userId));
  const snap = await getDocs(q);
  const tasks = snap.docs.map((d) => deleteDoc(doc(db, "notifications", d.id)));
  await Promise.all(tasks);
}