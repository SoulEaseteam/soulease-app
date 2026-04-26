// src/utils/subscribeToTherapists.ts
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Therapist } from "@/types/therapist";
import { computeStatus } from "./therapistStatus";

type Options = {
  onlyAvailable?: boolean;
  minRating?: number;
  maxDistanceKm?: number;
  userLocation?: { lat: number; lng: number };
  callback: (data: Therapist[]) => void;
};

export const subscribeToTherapists = ({
  onlyAvailable = true,
  minRating,
  maxDistanceKm,
  userLocation,
  callback,
}: Options) => {
  const col = collection(db, "therapists");

  const unsubscribe = onSnapshot(col, (snapshot) => {
    let data = snapshot.docs.map((doc) => {
      const raw = doc.data() as Therapist;
      const merged = Object.assign({}, raw, {
        id: doc.id,
        available: computeStatus(raw),
      }) as Therapist;
      return merged;
    });

    if (onlyAvailable) data = data.filter((t) => t.available === "available");
    if (minRating != null) data = data.filter((t) => (t.rating ?? 0) >= minRating);

    if (userLocation && maxDistanceKm != null) {
      data = data.filter((t) => {
        if (!t.currentLocation) return false;
        const d = haversine(userLocation, t.currentLocation);
        return d <= maxDistanceKm;
      });
    }

    callback(data);
  });

  return unsubscribe;
};

const getComputedStatus = (t: Therapist): Therapist['available'] => {
  if (t.statusOverride === 'resting') return 'resting';

  const now = new Date();

  // ทำงานช่วงเวลา?
  const [sh = 0, sm = 0] = t.startTime?.split(':').map(Number) || [];
  const [eh = 0, em = 0] = t.endTime?.split(':').map(Number) || [];
  const start = new Date(now); start.setHours(sh, sm, 0, 0);
  const end = new Date(now);   end.setHours(eh, em, 0, 0);
  if (end <= start) end.setDate(end.getDate() + 1); // ข้ามคืน

  const inWorkingHours = now >= start && now <= end;

  // ยังติดงานอยู่ไหม (busyUntil > now)
  let busy = false;
  if (t.busyUntil) {
    const bu = (typeof t.busyUntil === 'string')
      ? new Date(t.busyUntil)
      : ('toDate' in (t.busyUntil as any) ? (t.busyUntil as any).toDate() : new Date(t.busyUntil as any));
    busy = bu > now;
  }

  if (!inWorkingHours) return 'resting';
  return busy ? 'bookable' : 'available';
};

const haversine = (
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number => {
  const toRad = (x: number) => (x * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const A =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return R * (2 * Math.atan2(Math.sqrt(A), Math.sqrt(1 - A)));
};