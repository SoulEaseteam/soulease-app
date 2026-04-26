// src/utils/therapists/distance.ts
export type LatLng = { lat: number; lng: number };

export function getPoint(t: any): LatLng | null {
  const c = t?.currentLocation;
  if (c && typeof c.lat === "number" && typeof c.lng === "number") return c;
  if (t?.lat != null && t?.lng != null) return { lat: Number(t.lat), lng: Number(t.lng) };
  return null;
}

export function haversineKm(a: LatLng, b: LatLng) {
  const R = 6371;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const la1 = toRad(a.lat), la2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}