// src/utils/getMapLink.ts
export const getMapLink = (
  origin: { lat: number; lng: number } | null | undefined,
  destination: { lat: number; lng: number } | null | undefined
): string => {
  if (
    !origin ||
    !destination ||
    isNaN(origin.lat) ||
    isNaN(origin.lng) ||
    isNaN(destination.lat) ||
    isNaN(destination.lng)
  ) {
    console.warn("❌ Invalid coordinates provided to getMapLink");
    return "https://www.google.com/maps"; // default fallback
  }

  return `https://www.google.com/maps/dir/?api=1&origin=${origin.lat},${origin.lng}&destination=${destination.lat},${destination.lng}`;
};