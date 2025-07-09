// src/utils/calculateDistance.ts
export async function calculateDistanceKm(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number }
): Promise<number> {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  // ✅ ตรวจสอบค่าที่รับเข้ามา
  if (!origin || !destination || !apiKey) {
    console.warn('❌ Invalid input or missing API key');
    return 10; // fallback default
  }

  // mock ขณะ dev
  if (import.meta.env.DEV) {
    return 8.5; // mock ค่าใน local dev
  }

  const originStr = `${origin.lat},${origin.lng}`;
  const destinationStr = `${destination.lat},${destination.lng}`;
  const endpoint = `https://maps.googleapis.com/maps/api/distancematrix/json?units=metric&origins=${originStr}&destinations=${destinationStr}&key=${apiKey}`;

  try {
    const response = await fetch(endpoint);
    const data = await response.json();

    const status = data?.rows?.[0]?.elements?.[0]?.status;
    const distanceValue = data?.rows?.[0]?.elements?.[0]?.distance?.value;

    if (status === 'OK' && typeof distanceValue === 'number') {
      return distanceValue / 1000; // ✅ meters → km
    } else {
      console.warn(`❌ Distance Matrix returned bad status: ${status}`);
      return 10;
    }
  } catch (error) {
    console.error('❌ Distance Matrix API error:', error);
    return 10;
  }
}