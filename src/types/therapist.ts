export interface Features {
  age: string;
  gender?: string;
  ethnicity?: string;
  height: string;
  weight: string;
  bodyType: string;
  bustSize?: string;
  bust?: string;
  hairColor?: string;
  vaccinated?: string;
  smoker?: string;
  language: string;
  style: string;
  skintone?: string;
  [key: string]: string | undefined; // รองรับ key ใหม่ในอนาคต
}

export interface Therapist {
  id: string;
  name: string;
  image: string;
  rating: number;
  reviews: number;
  specialty: string;
  experience: string;
  lat: number;
  lng: number;
  currentLocation?: { lat: number; lng: number };
  todayBookings?: number;
  totalBookings?: number;
  nextAvailable?: string;
  startTime?: string;
  endTime?: string;
  updatedAt?: string;
  gallery?: string[];
  available: 'available' | 'bookable' | 'resting' | 'holiday';
  manualStatus?: 'holiday';
  isHolidayManual?: boolean;
  isAvailableNow?: boolean;
  badge?: TherapistBadge;
  features: Features;
  distance?: number;
}

export interface TherapistBadge {
  key: string;
  image: string;
  priority: number;
  animation?: 'pulse' | 'float' | 'none';
  size: number;
  position: {
    top: number;
    left: number;
  };
}