// src/utils/updateLocation.ts
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

type CollectionName = "therapists" | "users";
type LatLng = { lat: number; lng: number };

function getCurrentPosition(options?: PositionOptions): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      reject(new Error("Geolocation is not supported by this browser."));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, options);
  });
}

/**
 * อัปเดตพิกัดผู้ใช้/พนักงานลง Firestore
 * @returns true เมื่อสำเร็จ, false เมื่อผิดพลาด (ไม่โยน alert)
 */
export async function updateUserLocation(
  userId: string,
  collectionName: CollectionName,
  coords?: LatLng
): Promise<boolean> {
  if (!userId) {
    console.warn("[updateUserLocation] Missing userId");
    return false;
  }

  let position: LatLng | null = null;

  try {
    if (coords) {
      // ใช้พิกัดที่ส่งเข้ามา (เช่น จากแผนที่/ทดสอบ)
      position = coords;
    } else {
      // ใช้ Geolocation ของเบราว์เซอร์
      const pos = await getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 15_000,
      });
      position = { lat: pos.coords.latitude, lng: pos.coords.longitude };
    }

    if (!position) {
      console.warn("[updateUserLocation] No position resolved");
      return false;
    }

    await updateDoc(doc(db, collectionName, userId), {
      currentLocation: position,
      updatedAt: serverTimestamp(),
    });

    console.info("[updateUserLocation] Location updated:", position);
    return true;
  } catch (err: any) {
    // เคสที่เจอบ่อย: PERMISSION_DENIED, POSITION_UNAVAILABLE, TIMEOUT
    console.error("[updateUserLocation] Failed:", err?.message || err);
    return false;
  }
}