// src/components/GoogleMapsLoader.tsx
import { LoadScript, type Libraries } from "@react-google-maps/api";
import type { ReactNode } from "react";

const libraries: Libraries = ["places"];

interface GoogleMapsLoaderProps {
  children: ReactNode;
}

const GoogleMapsLoader = ({ children }: GoogleMapsLoaderProps) => {
  return (
    <LoadScript
      googleMapsApiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY!}
      libraries={libraries}
    >
      {children}
    </LoadScript>
  );
};

export default GoogleMapsLoader;