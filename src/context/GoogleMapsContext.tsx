// src/context/GoogleMapsContext.tsx
import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";

interface GoogleMapsContextValue {
  ready: boolean;
}

const GoogleMapsContext = createContext<GoogleMapsContextValue>({
  ready: false,
});

export const useGoogleMaps = () => useContext(GoogleMapsContext);

let loaded = false;
let loading = false;

export const GoogleMapsProvider = ({ children }: { children: ReactNode }) => {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // already available
    if ((window as any).google?.maps) {
      setReady(true);
      return;
    }

    // prevent duplicate load
    if (loading) return;
    loading = true;

    const api = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

    if (!api) {
      console.error("❌ VITE_GOOGLE_MAPS_API_KEY is missing");
    }

    const script = document.createElement("script");

    script.src = `https://maps.googleapis.com/maps/api/js?key=${api}&libraries=places,geometry&language=en`;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      loaded = true;
      setReady(true);
    };

    script.onerror = (e) => {
      console.error("❌ Google Maps script load error:", e);
      loaded = false;
      loading = false;
    };

    document.head.appendChild(script);
  }, []);

  return (
    <GoogleMapsContext.Provider value={{ ready }}>
      {children}
    </GoogleMapsContext.Provider>
  );
};