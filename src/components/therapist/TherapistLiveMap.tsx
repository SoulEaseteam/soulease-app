// src/components/TherapistLiveMap.tsx
import React, { useMemo, useState, useCallback } from "react";
import { GoogleMap, Marker, InfoWindow, useJsApiLoader } from "@react-google-maps/api";
import { Box, Chip, Stack, Typography } from "@mui/material";

type TherapistStatus = "available" | "bookable" | "booked" | "resting" | "off";

const containerStyle = { width: "100%", height: "38vh", borderRadius: 12 };

function statusColor(status: TherapistStatus | null) {
  switch (status) {
    case "available":
      return "#4CAF50";
    case "bookable":
      return "#FF9800";
    case "booked":
      return "#E53935";
    case "resting":
      return "#607D8B";
    case "off":
      return "#9E9E9E";
    default:
      return "#9E9E9E";
  }
}

export default function TherapistLiveMap({
  center,
  status,
  therapistName,
}: {
  center: { lat: number; lng: number } | null;
  status: TherapistStatus | null;
  therapistName: string;
}) {
  const [showInfo, setShowInfo] = useState<boolean>(true);

  // โหลด Google Maps JS API (จะไม่โหลดซ้ำถ้ามีอยู่แล้ว)
  const { isLoaded } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string,
  });

  const computedCenter = useMemo(
    () => center ?? { lat: 13.7563, lng: 100.5018 }, // fallback: Bangkok
    [center]
  );

  const badge = useMemo(() => {
    if (!status) return null;
    return (
      <Chip
        size="small"
        label={status.toUpperCase()}
        sx={{
          bgcolor: statusColor(status),
          color: "#fff",
          fontWeight: 600,
          letterSpacing: 0.5,
        }}
      />
    );
  }, [status]);

  const onMarkerClick = useCallback(() => setShowInfo(true), []);
  const onInfoClose = useCallback(() => setShowInfo(false), []);

  if (!isLoaded) {
    return (
      <Box
        sx={{
          ...containerStyle,
          bgcolor: "rgba(0,0,0,0.05)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Typography variant="body2" color="text.secondary">
          Loading map…
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={containerStyle}>
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={computedCenter}
        zoom={13}
        options={{
          disableDefaultUI: true,
          clickableIcons: false,
          gestureHandling: "greedy",
          styles: [
            {
              featureType: "poi",
              elementType: "labels.icon",
              stylers: [{ visibility: "off" }],
            },
          ],
        }}
      >
        {center && (
          <Marker
            position={center}
            onClick={onMarkerClick}
            icon={{
              path: google.maps.SymbolPath.CIRCLE,
              fillColor: statusColor(status ?? null),
              fillOpacity: 1,
              strokeWeight: 1,
              strokeColor: "#ffffff",
              scale: 8,
            }}
          />
        )}

        {center && showInfo && (
          <InfoWindow position={center} onCloseClick={onInfoClose}>
            <Stack spacing={0.5} sx={{ minWidth: 160 }}>
              <Typography variant="subtitle2" fontWeight={700}>
                {therapistName}
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography variant="caption" color="text.secondary">
                  Status:
                </Typography>
                {badge}
              </Stack>
            </Stack>
          </InfoWindow>
        )}
      </GoogleMap>
    </Box>
  );
}