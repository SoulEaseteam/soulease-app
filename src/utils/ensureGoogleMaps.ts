// โหลด Google Maps JS API แค่ครั้งเดียว และรอให้พร้อมก่อนใช้งาน
const MAPS_GLOBAL_CB = "__onGoogleMapsReady__";

let mapsPromise: Promise<typeof google> | null = null;

export function ensureGoogleMaps(apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string) {
  if (typeof window !== "undefined" && (window as any).google?.maps) {
    return Promise.resolve((window as any).google);
  }

  if (mapsPromise) return mapsPromise;

  mapsPromise = new Promise((resolve, reject) => {
    if (!apiKey) {
      reject(new Error("Missing VITE_GOOGLE_MAPS_API_KEY"));
      return;
    }

    // กันโหลดซ้ำ
    const already = document.querySelector<HTMLScriptElement>('script[data-gmaps="1"]');
    if (already) {
      const check = () => {
        if ((window as any).google?.maps) resolve((window as any).google);
        else setTimeout(check, 50);
      };
      check();
      return;
    }

    (window as any)[MAPS_GLOBAL_CB] = () => {
      resolve((window as any).google);
      delete (window as any)[MAPS_GLOBAL_CB];
    };

    const script = document.createElement("script");
    script.setAttribute("data-gmaps", "1");
    script.async = true;
    script.defer = true;
    script.src =
      `https://maps.googleapis.com/maps/api/js` +
      `?key=${encodeURIComponent(apiKey)}` +
      `&libraries=places` +
      `&callback=${MAPS_GLOBAL_CB}`;
    script.onerror = () => reject(new Error("Failed to load Google Maps script"));
    document.head.appendChild(script);
  });

  return mapsPromise;
}