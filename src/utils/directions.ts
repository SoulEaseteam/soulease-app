// src/utils/directions.ts
type LatLng = { lat: number; lng: number };

type FareOptions = {
  baseFare?: number;      // ค่าเปิดเครื่อง (เริ่มต้น)
  perKm?: number;         // บาท/กม.
  roundTrip?: boolean;    // คิดไป-กลับไหม
  minFare?: number;       // ต่ำสุด
};

type FareResult = { distanceKm: number; taxiFare: number };

/** Haversine ระยะเส้นตรง (กม.) */
function haversineKm(a: LatLng, b: LatLng): number {
  const R = 6371; // km
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** คิดราคาแบบยืดหยุ่นจากระยะ (กม.) */
function computeFare(distanceKm: number, opts: FareOptions = {}): number {
  const {
    baseFare = 40,
    perKm = 12,
    roundTrip = true,
    minFare = 80,
  } = opts;

  const billDistance = roundTrip ? distanceKm * 2 : distanceKm;
  const fare = baseFare + billDistance * perKm;
  return Math.max(Math.round(fare), minFare);
}

/**
 * คำนวณระยะ & ค่าแท็กซี่
 * - พยายามใช้ Google Maps JS DirectionsService ถ้ามี (ไม่ติด CORS)
 * - ถ้าไม่มี/ล้มเหลว → ใช้ Haversine เป็น fallback
 */
export const calculateTaxiFareFromDirections = async (
  origin: LatLng,
  destination: LatLng,
  options?: FareOptions
): Promise<FareResult> => {
  // กันพัง input
  if (
    !origin || !destination ||
    typeof origin.lat !== "number" || typeof origin.lng !== "number" ||
    typeof destination.lat !== "number" || typeof destination.lng !== "number"
  ) {
    // fallback ปลอดภัย
    const distanceKm = 10;
    return { distanceKm, taxiFare: computeFare(distanceKm, options) };
  }

  // DEV: mock เพื่อความเร็ว/ไม่เผาโควต้า
  if (import.meta.env.DEV && import.meta.env.VITE_USE_MOCK_DIST === "1") {
    const distanceKm = 8.5;
    return { distanceKm, taxiFare: computeFare(distanceKm, options) };
  }

  // ถ้ามี Google Maps JS API ในหน้า → ใช้ DirectionsService (ไม่ติด CORS)
  const gmaps = (globalThis as any)?.google?.maps;
  if (gmaps?.DirectionsService) {
    try {
      const svc = new gmaps.DirectionsService();
      const response: any = await svc.route({
        origin,
        destination,
        travelMode: gmaps.TravelMode.DRIVING,
      });

      const leg = response?.routes?.[0]?.legs?.[0];
      const meters: number | undefined = leg?.distance?.value;

      if (typeof meters === "number") {
        const distanceKm = meters / 1000;
        return { distanceKm, taxiFare: computeFare(distanceKm, options) };
      }
    } catch {
      // ตกไปใช้ fallback ข้างล่าง
    }
  }

  // Fallback: Haversine (เส้นตรง) — เชื่อถือได้น้อยกว่าแต่ไม่มี CORS
  const distanceKm = haversineKm(origin, destination);
  return { distanceKm, taxiFare: computeFare(distanceKm, options) };
};