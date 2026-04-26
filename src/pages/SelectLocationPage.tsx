// src/pages/SelectLocationPage.tsx
import React, { useEffect, useRef, useState } from "react";
import {
  Box,
  Button,
  Typography,
  TextField,
  Snackbar,
  IconButton,
  Paper,
} from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { useNavigate, useLocation } from "react-router-dom";
import { useGoogleMaps } from "@/context/GoogleMapsContext";

declare global {
  interface Window {
    google: typeof google | any;
  }
}

const containerStyle = { width: "100%", height: "50vh", borderRadius: "12px" };
const defaultCenter = { lat: 13.736717, lng: 100.523186 }; // Bangkok

type NavState = {
  therapistId?: string;
  service?: string;
  selectedLat?: number;
  selectedLng?: number;
  selectedAddress?: string;
};

const SelectLocationPage: React.FC = () => {
  const { ready } = useGoogleMaps();
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state || {}) as NavState;

  const [currentLocation, setCurrentLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(
    state.selectedLat && state.selectedLng
      ? { lat: state.selectedLat, lng: state.selectedLng }
      : null
  );
  const [placeName, setPlaceName] = useState("");
  const [formattedAddress, setFormattedAddress] = useState(
    state.selectedAddress || ""
  );
  const [placeId, setPlaceId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);

  // ❗ ถ้า therapistId / service หาย ให้เด้งกลับหน้าแรก
  useEffect(() => {
    if (!state?.therapistId || !state?.service) {
      console.warn("Invalid access to /select-location");
      navigate("/");
    }
  }, []);

  // ------- helpers -------
  const setMarker = (pos: google.maps.LatLng | google.maps.LatLngLiteral) => {
    if (!mapRef.current || !window.google) return;
    const g = window.google as any;

    if (markerRef.current) {
      markerRef.current.setMap(null);
      markerRef.current = null;
    }
    markerRef.current = new g.maps.Marker({
      position: pos,
      map: mapRef.current,
    });
  };

  const reverseGeocode = (lat: number, lng: number) => {
    if (!window.google) return;
    const g = window.google as any;

    const geocoder = new g.maps.Geocoder();
    geocoder.geocode({ location: { lat, lng } }, (results: any, status: any) => {
      if (status === "OK" && results?.[0]) {
        const first = results[0];
        setFormattedAddress(first.formatted_address || "");
        if (first.place_id) {
          setPlaceId(first.place_id);
        }
        if (!placeName) {
          // ชื่อสถานที่ ถ้า geocode ไม่มี name ก็ใช้ address แทน
          setPlaceName(first.formatted_address || "");
        }
      }
    });
  };

  // ------- init map once Google ready -------
  useEffect(() => {
    if (!ready) return;
    if (!mapContainerRef.current) return;
    if (mapRef.current) return; // ป้องกันสร้างซ้ำ

    if (!window.google) {
      console.error("Google Maps not found on window even though ready=true");
      return;
    }
    const g = window.google as any;

    const map = new g.maps.Map(mapContainerRef.current, {
      center: currentLocation || defaultCenter,
      zoom: 15,
      disableDefaultUI: true,
    });
    mapRef.current = map;

    // ถ้ามีตำแหน่งเริ่มต้น
    if (currentLocation) {
      setMarker(currentLocation);
    }

    // คลิกบนแผนที่
    map.addListener("click", (e: any) => {
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      setCurrentLocation({ lat, lng });
      setMarker(e.latLng);
      reverseGeocode(lat, lng);
    });

    // Autocomplete search
    if (inputRef.current) {
      const ac = new g.maps.places.Autocomplete(inputRef.current, {
        fields: ["geometry", "name", "formatted_address", "place_id"],
      });
      ac.addListener("place_changed", () => {
        const p = ac.getPlace();
        if (!p.geometry?.location) return;
        const lat = p.geometry.location.lat();
        const lng = p.geometry.location.lng();
        setCurrentLocation({ lat, lng });
        setPlaceName(p.name || "");
        setFormattedAddress(p.formatted_address || "");
        setPlaceId(p.place_id || null);

        map.panTo({ lat, lng });
        setMarker(p.geometry.location);
      });
    }
  }, [ready]);

  // ใช้ตำแหน่งปัจจุบัน
  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      alert("Your browser does not support geolocation.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setCurrentLocation({ lat, lng });
        if (mapRef.current) {
          mapRef.current.panTo({ lat, lng });
          setMarker(new window.google.maps.LatLng(lat, lng));
        }
        reverseGeocode(lat, lng);
      },
      () => {
        alert("Unable to access your location.");
      }
    );
  };

  // Confirm -> ส่งกลับ BookingPage
  const handleConfirm = () => {
    const { therapistId, service } = state;
    if (!therapistId || !service) return;

    if (!currentLocation || (!placeName && !formattedAddress)) {
      alert("Please select your location first.");
      return;
    }

    const url =
      `/booking/${therapistId}` +
      `?service=${encodeURIComponent(service)}` +
      `&selectedLat=${currentLocation.lat}` +
      `&selectedLng=${currentLocation.lng}` +
      `&placeId=${placeId || ""}` +
      `&placeName=${encodeURIComponent(placeName)}` +
      `&formattedAddress=${encodeURIComponent(formattedAddress)}` +
      `&address=${encodeURIComponent(placeName || formattedAddress)}`;

    navigate(url);
  };

  const displayAddress = placeName || formattedAddress || "";

  // ---------- UI ----------
  return (
    <Box sx={{ maxWidth: 430, mx: "auto", p: 4 }}>
      <Typography
        color="#3a3420"
        fontSize={25}
        fontWeight="bold"
        textAlign="center"
        mb={2}
      >
        Select Location
      </Typography>

      <Paper sx={{ p: 2, mb: 2, borderRadius: 4 }}>
        {/* Search */}
        <TextField
          inputRef={inputRef}
          placeholder="Search location"
          fullWidth
          sx={{
            mb: 3,
            "& .MuiOutlinedInput-root": { borderRadius: 4 },
          }}
        />

        {/* Map */}
        <Box
          sx={{
            borderRadius: 4,
            overflow: "hidden",
            mb: 2,
            position: "relative",
          }}
        >
          <div
            ref={mapContainerRef}
            style={containerStyle}
          />

          {!ready && (
            <Box
              sx={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                bgcolor: "rgba(255,255,255,0.85)",
                fontSize: 14,
                color: "#555",
              }}
            >
              Loading map…
            </Box>
          )}
        </Box>

        {/* Use my location */}
        <Button
          fullWidth
          variant="outlined"
          onClick={handleUseMyLocation}
          sx={{ mb: 2, borderRadius: 3 }}
        >
          Use My Current Location
        </Button>

        {/* Address field + copy */}
        <TextField
          label="Location"
          value={displayAddress}
          fullWidth
          multiline
          InputProps={{
            endAdornment: (
              <IconButton
                onClick={() => {
                  if (!displayAddress) return;
                  navigator.clipboard.writeText(displayAddress);
                  setCopied(true);
                }}
              >
                <ContentCopyIcon />
              </IconButton>
            ),
          }}
          sx={{ mb: 2, "& .MuiOutlinedInput-root": { borderRadius: 4 } }}
        />

        {/* Confirm */}
        <Button
          variant="contained"
          fullWidth
          onClick={handleConfirm}
          disabled={!currentLocation || !displayAddress}
          sx={{
            py: 1.4,
            fontWeight: "bold",
            fontSize: 14,
            borderRadius: 4,
            background: "#FEAE96",
          }}
        >
          Confirm Location
        </Button>
      </Paper>

      <Snackbar
        open={copied}
        autoHideDuration={2000}
        onClose={() => setCopied(false)}
        message="Address copied!"
      />
    </Box>
  );
};

export default SelectLocationPage;