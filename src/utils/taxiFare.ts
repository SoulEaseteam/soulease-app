import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { getDistanceInKm } from "@/utils/geoUtils";

export type LatLng = { lat: number; lng: number };
const GOOGLE_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

// คำนวนด้วย Directions ถ้ามีคีย์ (ได้ระยะทางแม่นกว่า)
async function distanceKmByDirections(origin: LatLng, dest: LatLng): Promise<number | null> {
  if (!GOOGLE_KEY) return null;
  const url =
    `https://maps.googleapis.com/maps/api/directions/json?` +
    `origin=${origin.lat},${origin.lng}&destination=${dest.lat},${dest.lng}&key=${GOOGLE_KEY}`;

  try {
    const res = await fetch(url);
    const data = await res.json();
    const meters = data?.routes?.[0]?.legs?.[0]?.distance?.value;
    if (typeof meters === "number") return meters / 1000;
  } catch {}
  return null;
}

export async function getTherapistLatestLocation(therapistId: string): Promise<LatLng | null> {
  const ref = doc(db, "therapists", therapistId);
  const snap = await getDoc(ref);
  const data = snap.exists() ? (snap.data() as any) : null;
  const loc = data?.currentLocation;
  return (loc && typeof loc.lat === "number" && typeof loc.lng === "number")
    ? { lat: loc.lat, lng: loc.lng }
    : null;
}

/** ดึงพิกัดล่าสุดของนักบำบัด แล้วคำนวณระยะทาง (กม.) ไปยังปลายทางลูกค้า */
export async function getDistanceFromTherapist(
  therapistId: string,
  customerDest: LatLng
): Promise<number> {
  const origin = await getTherapistLatestLocation(therapistId);
  if (!origin) return 0;

  // พยายามใช้ Directions ก่อน
  const viaDirections = await distanceKmByDirections(origin, customerDest);
  if (viaDirections && isFinite(viaDirections)) return viaDirections;

  // ไม่สำเร็จ → ใช้ Haversine
  return getDistanceInKm(origin.lat, origin.lng, customerDest.lat, customerDest.lng);
}