export interface Booking {
  id?: string;
  therapistId: string;
  therapistName: string;
  serviceName: string;
  servicePrice: number;  // ราคาตั้งต้นของบริการ
  amount?: number;       // ✅ จำนวนเงินที่ลูกค้าจ่ายจริง (หลังหักส่วนลด/รวมค่าบริการ)
  date: string;
  time: string;
  address: string;
  phone: string;
  note?: string;
  total: number;         // ✅ หรือใช้แทน amount ถ้าไม่แยก
  status: 'upcoming' | 'completed' | 'cancelled';
  createdAt?: any;
  updatedAt?: any;
  location?: {
    lat: number;
    lng: number;
  } | null;
  userId?: string;
}