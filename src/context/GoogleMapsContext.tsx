// src/context/GoogleMapsContext.tsx
//
// 🗺️  Google Maps loader — lazy + on-demand
//
// ก่อนหน้านี้: โหลด script ตอน app mount → บล็อก main thread → LCP 9.4s
// ตอนนี้: ไม่โหลดอัตโนมัติ — รอจนกว่าหน้าที่ต้องการ (SelectLocationPage)
// จะเรียก loadIfNeeded() ผ่าน hook
//
// + เพิ่ม `loading=async` ใน URL ตามที่ Google แนะนำ (กัน warning ใน console)

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";

interface GoogleMapsContextValue {
  ready: boolean;
  /** เรียกเมื่อหน้าที่ใช้แผนที่ mount — load script ครั้งเดียวเท่านั้น */
  loadIfNeeded: () => void;
}

const GoogleMapsContext = createContext<GoogleMapsContextValue>({
  ready: false,
  loadIfNeeded: () => {},
});

export const useGoogleMaps = () => useContext(GoogleMapsContext);

// module-level guards — กัน double load แม้ component remount
let scriptStarted = false;

export const GoogleMapsProvider = ({ children }: { children: ReactNode }) => {
  const [ready, setReady] = useState<boolean>(() => {
    // ถ้า script โหลดมาก่อนหน้านี้แล้ว (เช่น navigation back) → ready ทันที
    return typeof window !== "undefined" && !!(window as Window & {
      google?: { maps?: unknown };
    }).google?.maps;
  });

  const loadIfNeeded = useCallback(() => {
    if (typeof window === "undefined") return;
    if (ready) return;
    if (scriptStarted) return;

    const w = window as Window & { google?: { maps?: unknown } };
    if (w.google?.maps) {
      setReady(true);
      return;
    }

    scriptStarted = true;

    const api = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!api) {
      console.error("❌ VITE_GOOGLE_MAPS_API_KEY is missing");
      scriptStarted = false;
      return;
    }

    const script = document.createElement("script");
    // ⚡ loading=async = Google's recommended modern loader (no console warning)
    script.src = `https://maps.googleapis.com/maps/api/js?key=${api}&libraries=places,geometry&language=en&loading=async`;
    script.async = true;
    script.defer = true;

    script.onload = () => setReady(true);
    script.onerror = (e) => {
      console.error("❌ Google Maps script load error:", e);
      scriptStarted = false;
    };

    document.head.appendChild(script);
  }, [ready]);

  return (
    <GoogleMapsContext.Provider value={{ ready, loadIfNeeded }}>
      {children}
    </GoogleMapsContext.Provider>
  );
};
