// src/types/firebaseSchemas.ts

/** Therapist ข้อมูลพนักงาน */
export interface Therapist {
  id: string;
  name: string;
  image: string;
  rating: number;
  reviews: number; // จำนวนรีวิวทั้งหมด
  available: "available" | "bookable" | "resting" | "holiday";
  specialty: string;
  experience: string;
  currentLocation?: {
    lat: number;
    lng: number;
  };
  updatedAt?: Date;
  manualStatus?: "holiday" | "forceAvailable" | "offline";
  badge?: string;
  isNew?: boolean;
  todayBookings: number;
  totalBookings: number;
  nextAvailable: string;
  features?: {
    age?: string;
    gender?: string;
    height?: string;
    weight?: string;
    style?: string;
    language?: string;
    skill?: string;
    [key: string]: any;
  };
}

/** Review ที่ฝังอยู่ใน Booking */
export interface BookingReview {
  rating: number;
  comment: string;
  createdAt: Date | { seconds: number; nanoseconds: number }; // Firestore timestamp
}

/** Booking การจอง */
export interface Booking {
  id: string;
  userId: string;
  therapistId: string;
  serviceId?: string;
  status: "pending" | "confirmed" | "completed" | "cancelled";
  time: Date | { seconds: number; nanoseconds: number }; // Firestore timestamp
  location: {
    address: string;
    lat: number;
    lng: number;
  };
  distanceKm?: number;
  travelCost?: number;
  note?: string;
  review?: BookingReview;
  createdAt: Date | { seconds: number; nanoseconds: number };
  updatedAt?: Date | { seconds: number; nanoseconds: number };
}

/** User ผู้ใช้งาน */
export interface User {
  uid: string;
  name: string;
  email?: string;
  phone?: string;
  photoURL?: string;
  role: "user" | "therapist" | "admin";
  favoriteTherapists?: string[];
  createdAt: Date | { seconds: number; nanoseconds: number };
}

/** Notification แจ้งเตือน */
export interface Notification {
  id: string;
  userId: string;
  type: "bookingConfirmed" | "newReview" | "adminMessage";
  content: string;
  read: boolean;
  createdAt: Date | { seconds: number; nanoseconds: number };
  title?: string;
  link?: string;
  priority?: "low" | "normal" | "high";
}
// src/types/firebaseSchemas.ts
export interface Notification {
  id: string;
  userId: string;          // ใครเป็นคนรับ notification
  message: string;         // เนื้อหา
  link?: string;           // ลิงก์ (optional)
  meta?: Record<string, any>; // ข้อมูลเพิ่มเติม เช่น bookingId
         // วันที่สร้าง
}