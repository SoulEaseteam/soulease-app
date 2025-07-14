export interface Booking {
  therapistId: string;
  therapistName: string;
  serviceName: string;
  servicePrice: number;
  date: string;
  time: string;
  address: string;
  phone: string;
  note?: string;
  total: number;
  status: 'upcoming' | 'completed' | 'cancelled';
  createdAt?: any;  // Timestamp หรือ Date
  location?: {
    lat: number;
    lng: number;
  } | null;
  userId?: string;
}