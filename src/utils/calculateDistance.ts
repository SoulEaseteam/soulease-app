// src/utils/calculateDistance.ts
export async function calculateDistanceKm(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number }
): Promise<number> {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const fallbackDistance = 10; // ✅ ค่า default กรณี error หรือไม่สำเร็จ

  if (!origin?.lat || !origin?.lng || !destination?.lat || !destination?.lng || !apiKey) {
    console.warn('❌ Invalid coordinates or missing Google Maps API key.');
    return fallbackDistance;
  }

  // 🔁 Mock ระยะทางตอน dev
  if (import.meta.env.DEV) {
    console.debug('[DEV] Mock distance used between:', origin, destination);
    return 8.5;
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
      const km = distanceValue / 1000;
      console.debug(`✅ Distance from Google API: ${km} km`);
      return km;
    } else {
      console.warn(`❌ Google API returned status: ${status}`);
      return fallbackDistance;
    }
  } catch (err) {
    console.error('❌ Failed to fetch distance from Google API:', err);
    return fallbackDistance;
  }
}