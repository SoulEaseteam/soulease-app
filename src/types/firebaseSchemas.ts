// src/types/firebaseSchemas.ts

export interface Therapist {
  id: string;
  name: string;
  image: string;
  rating: number;
  reviews: number;
  available: 'available' | 'bookable' | 'resting' | 'holiday';
  specialty: string;
  experience: string;
  currentLocation?: {
    lat: number;
    lng: number;
  };
  updatedAt?: Date;
  manualStatus?: 'holiday' | 'forceAvailable' | 'offline';
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

export interface Booking {
  id: string;
  userId: string;
  therapistId: string;
  serviceId?: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  time: Date;
  location: {
    address: string;
    lat: number;
    lng: number;
  };
  distanceKm?: number;
  travelCost?: number;
  note?: string;
  review?: {
    rating: number;
    comment: string;
    createdAt: Date;
  };
  createdAt: Date;
  updatedAt?: Date;
}

export interface User {
  uid: string;
  name: string;
  email?: string;
  phone?: string;
  photoURL?: string;
  role: 'user' | 'therapist' | 'admin';
  favoriteTherapists?: string[];
  createdAt: Date;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'bookingConfirmed' | 'newReview' | 'adminMessage';
  content: string;
  read: boolean;
  createdAt: Date;
}