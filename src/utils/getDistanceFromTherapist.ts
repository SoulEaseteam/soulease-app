import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { getDistanceInKm } from "@/utils/geoUtils";

export type LatLng = { lat: number; lng: number };

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

/** 
 * 🔥 ใช้ Directions API เพื่อหาระยะทางจริงตามถนน 
 * ถ้า quota หมด / ใช้ไม่ได้ → return null 
 */
async function distanceKmByDirections(origin: LatLng, dest: LatLng): Promise<number | null> {
  if (!API_KEY) return null;

  const url = new URL("https://maps.googleapis.com/maps/api/directions/json");
  url.searchParams.set("origin", `${origin.lat},${origin.lng}`);
  url.searchParams.set("destination", `${dest.lat},${dest.lng}`);
  url.searchParams.set("mode", "driving");
  url.searchParams.set("key", API_KEY);

  try {
    const res = await fetch(url.toString());
    const data = await res.json();

    // Check status
    if (data.status !== "OK") {
      console.warn("Directions API failed:", data.status);
      return null;
    }

    const meters = data?.routes?.[0]?.legs?.[0]?.distance?.value;

    if (typeof meters === "number" && meters > 0) {
      return meters / 1000;
    }
  } catch (err) {
    console.error("Directions API error:", err);
  }

  return null;
}

/** 
 * 📌 ดึงตำแหน่งล่าสุดของนักบำบัดจาก Firestore 
 */
export async function getTherapistLatestLocation(
  therapistId: string
): Promise<LatLng | null> {
  try {
    const ref = doc(db, "therapists", therapistId);
    const snap = await getDoc(ref);

    if (!snap.exists()) return null;

    const loc = snap.data()?.currentLocation;
    if (!loc) return null;

    if (typeof loc.lat !== "number" || typeof loc.lng !== "number") return null;

    return { lat: loc.lat, lng: loc.lng };
  } catch (err) {
    console.error("Get therapist location failed:", err);
    return null;
  }
}

/**
 * ⭐ ฟังก์ชันหลัก → คืนค่าระยะทาง (กม.) จาก therapist → customer
 * - ใช้ Directions ก่อน (แม่นสุด)
 * - ถ้าล้มเหลว → ใช้ Haversine
 */
export async function getDistanceFromTherapist(
  therapistId: string,
  customerDest: LatLng
): Promise<number> {
  const origin = await getTherapistLatestLocation(therapistId);

  if (!origin) return 0; // no location → 0 km

  // 1) ใช้ Directions API ก่อน (แม่นสุด)
  const viaRoad = await distanceKmByDirections(origin, customerDest);
  if (viaRoad && isFinite(viaRoad)) return viaRoad;

  // 2) ถ้า Directions ไม่สำเร็จ → Haversine fallback
  return getDistanceInKm(origin.lat, origin.lng, customerDest.lat, customerDest.lng);
}