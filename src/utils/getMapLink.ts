// src/utils/getMapLink.ts
export const getMapLink = (
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number }
): string => {
  return `https://www.google.com/maps/dir/?api=1&origin=${origin.lat},${origin.lng}&destination=${destination.lat},${destination.lng}`;
};