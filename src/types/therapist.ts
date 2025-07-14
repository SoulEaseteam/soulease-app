export interface Features {
  age: string;
  gender?: string;
  ethnicity?: string;
  height: string;
  weight: string;
  skintone?: string;
  bodyType: string;
  bustSize?: string;
  bust?: string;
  hairColor?: string;
  vaccinated?: string;
  smoker?: string;
  language: string;
}

export type AvailableStatus = 'available' | 'bookable' | 'resting';

export interface Therapist {
  id: string;
  name: string;
  image: string;
  rating: number;
  reviews: number;
  todayBookings: number;
  totalBookings: number;
  nextAvailable: string;
  startTime: string;
  endTime: string;
  gallery: string[];
  features: Features;  // ใช้ interface Features ที่ประกาศไว้
  available: AvailableStatus;
  distance?: number;
  hot?: boolean;
  new?: boolean;
  topRated?: boolean;
  serviceCount?: string;
   // 👇 เพิ่มบรรทัดนี้เข้าไป
  currentLocation?: {
    lat: number;
    lng: number;
  };
  // 👇 ถ้ามี field อื่นอยู่แล้วให้ใส่ไว้ล่างสุดได้เลย
  [key: string]: any;
}
export interface BadgeConfig {
  key: 'VIP' | 'HOT' | 'NEW' | string;
  image: string;
  priority: number;
  animation: 'pulse' | 'float' | 'none';
  size: number;
  position: { top: number; left: number };
  condition: (therapist: Therapist) => boolean;
}
