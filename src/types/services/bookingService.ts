export interface Booking {
  /* ---------------------------
     Identity
  --------------------------- */
  id?: string;

  /* Therapist */
  therapistId: string;        // custom id เช่น YuriSunRed
  therapistDocId?: string;    // Firestore docId (สำคัญมาก)
  therapistName: string;

  /* Service */
  serviceId?: string;         // เช่น 'thai-massage'
  serviceName: string;
  servicePrice: number;       // ราคาตั้งต้น
  duration: number;

  /* Pricing & Payment */
  amount?: number;            // ราคาที่ลูกค้าจ่ายจริง (อาจลด/เพิ่ม)
  discount?: number;          // ส่วนลด (optional)
  taxiFee: number;
  total: number;              // ราคา final (servicePrice + taxiFee - discount)
  paymentStatus?: "pending" | "paid" | "failed";

  /* Schedule */
  date: string;
  time: string;

  /* Customer info */
  phone: string;
  note?: string;
  userId?: string;

  /* Address + Google Place API */
  address: string;            // ที่ลูกค้ากรอกเอง
  formattedAddress?: string;  // จาก Google geocoder
  placeName?: string;         // เช่น "Mercure Bangkok"
  placeId?: string;           // ใช้สร้าง Google Maps preview

  location?: {
    lat: number;
    lng: number;
  } | null;

  /* Security */
  deviceId?: string;          // ป้องกัน spam booking
  ip?: string;

  /* Status */
  status: "upcoming" | "completed" | "cancelled";
  cancelReason?: string | null;

  /* Meta */
  createdAt?: any;
  updatedAt?: any;
}