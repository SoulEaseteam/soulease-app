// src/utils/getAvailableNearbyTherapists.ts

import { Therapist } from '@/types/therapist';
import { calculateDistanceKm } from './calculateDistance';

interface UserLocation {
  lat: number;
  lng: number;
}

/**
 * ✅ Filter therapists who are available/bookable and within X km distance
 * @param therapists All therapists from Firestore
 * @param userLocation Current location of user
 * @param maxDistanceKm Max allowed distance (default: 15km)
 */
export async function getAvailableNearbyTherapists(
  therapists: Therapist[],
  userLocation: UserLocation,
  maxDistanceKm: number = 15
): Promise<Therapist[]> {
  const results: Therapist[] = [];

  for (const t of therapists) {
    // ✅ เงื่อนไข: รับเฉพาะ available/bookable, ไม่รับ holiday/resting
    if (!['available', 'bookable'].includes(t.available) || t.manualStatus === 'holiday') continue;

    const current = t.currentLocation || { lat: t.lat, lng: t.lng };
    const distance = await calculateDistanceKm(userLocation, current);

    if (distance <= maxDistanceKm) {
      results.push({ ...t, distance });
    }
  }

  // 🔃 Sort by distance (nearest first)
  return results.sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0));
}