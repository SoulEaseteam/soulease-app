// src/types/therapist.ts

export type Avail = "available" | "bookable" | "resting";
export type StatusOverride = Avail | "Auto" | null;

/** ---------- Sub Types ---------- */
export interface Features {
  employmentType?: string | null;
  age: string;
  gender?: string;
  ethnicity?: string;
  height: string;
  weight: string;
  skintone?: string;
  bodyType: string;
  bustSize?: string;
  hairColor?: string;
  vaccinated?: string;
  smoker?: string;
  language: string;
}

export interface Location {
  lat: number;
  lng: number;
}

/** ---------- Main Therapist Type (SunRed v3.0) ---------- */
export interface Therapist {
  /** identity */
  id: string;          // Firestore docId หรือ custom ID
  name: string;
  image: string;

  /** rating */
  rating: number;
  reviews: number;     // review count

  /** experience */
  experience?: number;

  /** working hours */
  startTime: string;   // "HH:mm"
  endTime: string;     // "HH:mm"

  /** --- Availability System (Official Engine Inputs) --- */
  statusOverride?: StatusOverride;     // Admin override: "Auto" | Avail
  isHoliday?: boolean;                 // force resting
  isBooked?: boolean;                  // legacy flag
  busyUntil?: Date | any | null;       // Timestamp or Date
  activeBooking?: boolean;             // true if job ongoing

  /** computed by Engine (DO NOT STORE in Firestore) */
  nextAvailable?: string | null;       // "Now" | "10:30" | null
  available?: Avail | null;            // optional legacy field (safe)

  /** bookings counting */
  todayBookings?: number;
  totalBookings?: number;

  /** location and distance */
  homeLocation?: Location | null;      // ค่าเริ่มต้นของ therapist
  currentLocation?: Location | null;   // real-time location
  distanceKm?: number | null;          // computed client-side

  /** gallery & features */
  gallery: string[];
  features: Features;
  specialty?: string;

  /** services available */
  servicesAvailable?: string[];

  /** badge system */
  badgeKey?: "VIP" | "HOT" | "NEW" | null;
  badgeUpdatedAt?: number | null;

  /** extra fields */
  employmentType?: string | null;
  serviceCount?: string;

  /** fallback for smooth upgrades */
  [key: string]: any;
}

/** Badge Configuration UI */
export interface BadgeConfig {
  key: "VIP" | "HOT" | "NEW" | null;
  image: string;
  priority: number;
  animation: "pulse" | "float" | "none";
  size: number;
  position: { top: number; left: number };
  condition: (t: Therapist) => boolean;
}