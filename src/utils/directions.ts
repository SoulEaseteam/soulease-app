// src/utils/directions.ts
export const calculateTaxiFareFromDirections = async (
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number }
): Promise<{ distanceKm: number; taxiFare: number }> => {
  const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.lat},${origin.lng}&destination=${destination.lat},${destination.lng}&key=${key}`;

  const res = await fetch(url);
  const data = await res.json();

  if (!data.routes?.[0]) throw new Error('No route found');

  const meters = data.routes[0].legs[0].distance.value;
  const distanceKm = meters / 1000;

  const ratePerKm = 10; // สมมุติ
  const fare = Math.round(distanceKm * ratePerKm * 2); // ไป-กลับ

  return { distanceKm, taxiFare: fare };
};