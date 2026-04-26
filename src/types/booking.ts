export interface Booking {
  id?: string;

  /** Therapist details */
  therapistId: string;          // ใช้ค้นหา therapist.id หรือ Firestore docId
  therapistDocId?: string;      // fallback: docId ของ therapist ใน Firestore
  therapistName: string;

  /** Service details */
  serviceId?: string;           // เช่น 'thai-massage', 'royal-therapeutic'
  serviceName: string;
  servicePrice: number;
  duration: number;
  amount?: number;              // จำนวนครั้ง / session

  /** Schedule */
  date: string;
  time: string;

  /** Customer details */
  phone: string;
  note?: string;
  userId?: string;

  /** Location */
  address: string;              // ที่อยู่จากลูกค้าเติมเอง หรือ fallback
  formattedAddress?: string;    // address ที่ Google API คืนให้ ชัดเจนกว่า
  placeName?: string;           // เช่น "Mercure Bangkok"
  placeId?: string;             // ใช้เรียก Google Maps preview
  location?: {
    lat: number;
    lng: number;
  } | null;

  /** Cost calculation */
  taxiFee: number;
  total: number;

  /** Security / fraud prevention */
  deviceId?: string;            // ใช้ป้องกันการ spam booking
  ip?: string;                  // เก็บ IP ของผู้จอง

  /** Booking status */
  status: "upcoming" | "completed" | "cancelled";
  paymentStatus?: "pending" | "paid" | "failed";

  /** Cancel reason */
  cancelReason?: string | null;

  /** Timestamps */
  createdAt?: any;
  updatedAt?: any;
}