// src/components/booking/StepLocation.tsx
//
// 🎨 Phase 3 Booking — Step 3 Location picker.
//
// Three input modes (no Google Places autocomplete needed for MVP):
//   1. Preset chips — Bangkok luxury hotels (Mandarin Oriental, Anantara,
//      Park Hyatt, St. Regis, etc.) with hardcoded lat/lng.
//   2. "Use current location" — browser Geolocation API. Reverse-geocode
//      via Google Maps Geocoder when the SDK is ready (loaded lazily).
//   3. Manual address — free-text input. Stores name + address; lat/lng
//      auto-filled when one of the above is used.
//
// Validation in BookingFlowPage requires `lat && lng` to advance —
// pure typed addresses won't satisfy it (we want a real coordinate to
// route the therapist). Geocoding-on-submit deferred to commit 6.
//
// 🔍 Google Places Autocomplete — wired below the geolocation button.
// Lazy-loads the SDK on mount via GoogleMapsContext (libraries=places),
// then attaches a `google.maps.places.Autocomplete` instance to the
// search input. Country biased to Thailand for relevant results.

import React, { useEffect, useRef, useState } from "react";
import { Box, Typography, TextField, Button, InputAdornment } from "@mui/material";
import MyLocationRoundedIcon from "@mui/icons-material/MyLocationRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import { useGoogleMaps } from "@/context/GoogleMapsContext";

const SERIF = '"Fraunces", Georgia, "Times New Roman", serif';
const SANS = '"Inter", system-ui, -apple-system, sans-serif';

interface PresetHotel {
  name: string;
  lat: number;
  lng: number;
  address: string;
}

// Bangkok luxury hotel presets — BRAND.md target accommodations
const PRESET_HOTELS: PresetHotel[] = [
  {
    name: "Mandarin Oriental",
    address: "48 Oriental Ave, Bang Rak, Bangkok 10500",
    lat: 13.7240,
    lng: 100.5151,
  },
  {
    name: "Anantara Riverside",
    address: "257 Charoennakorn Rd, Thon Buri, Bangkok 10600",
    lat: 13.7066,
    lng: 100.5064,
  },
  {
    name: "Park Hyatt Bangkok",
    address: "88 Wireless Rd, Pathum Wan, Bangkok 10330",
    lat: 13.7449,
    lng: 100.5495,
  },
  {
    name: "The St. Regis Bangkok",
    address: "159 Rajadamri Rd, Pathum Wan, Bangkok 10330",
    lat: 13.7401,
    lng: 100.5407,
  },
  {
    name: "The Peninsula",
    address: "333 Charoennakorn Rd, Bangkok 10600",
    lat: 13.7239,
    lng: 100.5089,
  },
  {
    name: "Four Seasons Chao Phraya",
    address: "300/1 Charoenkrung Rd, Bangkok 10120",
    lat: 13.7124,
    lng: 100.5145,
  },
  {
    name: "Capella Bangkok",
    address: "300/2 Charoenkrung Rd, Bangkok 10120",
    lat: 13.7080,
    lng: 100.5077,
  },
  {
    name: "Rosewood Bangkok",
    address: "1041/38 Phloen Chit Rd, Bangkok 10330",
    lat: 13.7398,
    lng: 100.5485,
  },
];

interface Props {
  locationName: string | null;
  locationAddress: string | null;
  lat: number | null;
  lng: number | null;
  /**
   * Free-text refinement on top of the picked location — room number,
   * floor, gate code, landmarks. Independent from `locationAddress`.
   */
  addressDetails: string;
  /** Updates the canonical picked-location fields (search/preset/geo). */
  onChange: (next: {
    locationName: string | null;
    locationAddress: string | null;
    lat: number | null;
    lng: number | null;
  }) => void;
  /** Updates the free-text refinement (room/floor/landmarks) only. */
  onChangeAddressDetails: (val: string) => void;
}

const StepLocation: React.FC<Props> = ({
  locationName,
  locationAddress,
  lat,
  lng,
  addressDetails,
  onChange,
  onChangeAddressDetails,
}) => {
  const { ready, loadIfNeeded } = useGoogleMaps();
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [searchValue, setSearchValue] = useState<string>("");
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const autocompleteRef = useRef<unknown>(null);

  // Lazy-load Google Maps SDK (with `places` lib) on mount.
  useEffect(() => {
    loadIfNeeded();
  }, [loadIfNeeded]);

  // Attach Places Autocomplete once the SDK is ready and the input is mounted.
  useEffect(() => {
    if (!ready || !searchInputRef.current) return;
    const w = window as Window & {
      google?: {
        maps?: {
          places?: {
            Autocomplete?: new (
              input: HTMLInputElement,
              opts?: unknown
            ) => {
              addListener: (event: string, cb: () => void) => void;
              getPlace: () => {
                name?: string;
                formatted_address?: string;
                geometry?: { location?: { lat: () => number; lng: () => number } };
              };
            };
          };
        };
      };
    };
    const Autocomplete = w.google?.maps?.places?.Autocomplete;
    if (!Autocomplete) return;
    if (autocompleteRef.current) return; // already attached

    const ac = new Autocomplete(searchInputRef.current, {
      // Bias to Thailand — primary BRAND.md service area
      componentRestrictions: { country: "th" },
      fields: ["name", "formatted_address", "geometry"],
    });
    autocompleteRef.current = ac;

    ac.addListener("place_changed", () => {
      const place = ac.getPlace();
      const loc = place.geometry?.location;
      if (!loc) return;
      const newLat = loc.lat();
      const newLng = loc.lng();
      onChange({
        locationName: place.name ?? null,
        locationAddress: place.formatted_address ?? null,
        lat: newLat,
        lng: newLng,
      });
      // Clear search field — selected place now lives in the preview card
      setSearchValue("");
    });

    // Bump pac-container above the sticky bottom nav (z-index 50)
    const styleId = "sunred-pac-zindex";
    if (!document.getElementById(styleId)) {
      const style = document.createElement("style");
      style.id = styleId;
      style.textContent =
        ".pac-container{z-index:9999 !important;border-radius:12px;font-family:'Inter',sans-serif;box-shadow:0 12px 40px rgba(126,30,46,0.18);}";
      document.head.appendChild(style);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  // (No sync needed — the textarea is now bound to addressDetails which
  // is independent from the canonical pick.)

  const selectPreset = (h: PresetHotel) => {
    onChange({
      locationName: h.name,
      locationAddress: h.address,
      lat: h.lat,
      lng: h.lng,
    });
  };

  const useCurrentLocation = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGeoError("Geolocation not supported");
      return;
    }
    setGeoLoading(true);
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        // Try reverse geocode if Google Maps SDK is ready (lazy-load it).
        loadIfNeeded();
        const tryReverse = () => {
          const w = window as Window & {
            google?: { maps?: { Geocoder?: new () => unknown } };
          };
          if (!w.google?.maps?.Geocoder) return false;
          const Geocoder = w.google.maps.Geocoder;
          const geocoder = new Geocoder() as {
            geocode: (
              req: { location: { lat: number; lng: number } },
              cb: (
                results: { formatted_address?: string }[] | null,
                status: string
              ) => void
            ) => void;
          };
          geocoder.geocode({ location: { lat, lng } }, (results, status) => {
            if (status === "OK" && results?.[0]?.formatted_address) {
              onChange({
                locationName: "Current location",
                locationAddress: results[0].formatted_address,
                lat,
                lng,
              });
            } else {
              onChange({
                locationName: "Current location",
                locationAddress: `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
                lat,
                lng,
              });
            }
          });
          return true;
        };
        if (!tryReverse()) {
          // SDK not ready yet — store coords now, address gets refined later
          onChange({
            locationName: "Current location",
            locationAddress: `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
            lat,
            lng,
          });
        }
        setGeoLoading(false);
      },
      (err) => {
        setGeoError(err.message || "Could not get location");
        setGeoLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const hasCoords = lat != null && lng != null;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* 🔍 Search anywhere in Thailand — Google Places Autocomplete */}
      <TextField
        fullWidth
        inputRef={searchInputRef}
        value={searchValue}
        onChange={(e) => setSearchValue(e.target.value)}
        placeholder={
          ready
            ? "Search hotels, condos, addresses…"
            : "Loading place search…"
        }
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchRoundedIcon
                sx={{ color: "rgba(60, 30, 20, 0.55)", fontSize: 20 }}
              />
            </InputAdornment>
          ),
        }}
        sx={{
          "& .MuiOutlinedInput-root": {
            background: "rgba(255, 255, 255, 0.7)",
            backdropFilter: "blur(20px) saturate(180%)",
            WebkitBackdropFilter: "blur(20px) saturate(180%)",
            borderRadius: "16px",
            fontFamily: SANS,
            fontSize: "13.5px",
            "& fieldset": { borderColor: "rgba(0, 0, 0, 0.06)" },
            "&:hover fieldset": { borderColor: "rgba(254, 9, 68, 0.4)" },
            "&.Mui-focused fieldset": {
              borderColor: "#FE0944",
              borderWidth: "1.5px",
            },
          },
        }}
      />

      {/* Use current location */}
      <Button
        onClick={useCurrentLocation}
        disabled={geoLoading}
        startIcon={<MyLocationRoundedIcon />}
        sx={{
          alignSelf: "stretch",
          height: 48,
          borderRadius: "16px",
          background: "rgba(255, 255, 255, 0.7)",
          backdropFilter: "blur(20px) saturate(180%)",
          WebkitBackdropFilter: "blur(20px) saturate(180%)",
          border: "1px solid rgba(0, 0, 0, 0.06)",
          color: "#3c1e14",
          fontFamily: SANS,
          fontWeight: 600,
          fontSize: "13.5px",
          textTransform: "none",
          boxShadow: "0 4px 14px rgba(126, 30, 46, 0.06)",
          "&:hover": { background: "rgba(255, 255, 255, 0.85)" },
        }}
      >
        {geoLoading ? "Locating…" : "Use my current location"}
      </Button>
      {geoError && (
        <Typography
          sx={{
            fontFamily: SANS,
            fontSize: "11.5px",
            color: "#FE0944",
            paddingLeft: "8px",
            marginTop: "-12px",
          }}
        >
          {geoError}
        </Typography>
      )}

      {/* Preset hotels */}
      <Box>
        <Typography
          sx={{
            fontFamily: SANS,
            fontSize: "11px",
            fontWeight: 700,
            color: "rgba(60, 30, 20, 0.55)",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            marginBottom: "10px",
            paddingLeft: "4px",
          }}
        >
          Bangkok luxury hotels
        </Typography>
        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            gap: "8px",
          }}
        >
          {PRESET_HOTELS.map((h) => {
            const isActive = locationName === h.name;
            return (
              <Box
                key={h.name}
                role="button"
                tabIndex={0}
                aria-pressed={isActive}
                onClick={() => selectPreset(h)}
                onKeyDown={(e) => {
                  if (e.key === " " || e.key === "Enter") {
                    e.preventDefault();
                    selectPreset(h);
                  }
                }}
                sx={{
                  padding: "10px 14px",
                  borderRadius: "999px",
                  cursor: "pointer",
                  fontFamily: SANS,
                  fontSize: "12.5px",
                  fontWeight: 600,
                  background: isActive
                    ? "linear-gradient(135deg, #FE0944, #FE7A52)"
                    : "rgba(255, 255, 255, 0.65)",
                  color: isActive ? "#fff" : "#3c1e14",
                  border: isActive
                    ? "none"
                    : "1px solid rgba(0, 0, 0, 0.06)",
                  boxShadow: isActive
                    ? "0 4px 12px rgba(254, 9, 68, 0.25)"
                    : "0 2px 6px rgba(126, 30, 46, 0.05)",
                  transition: "all 0.15s ease",
                  whiteSpace: "nowrap",
                  "&:focus-visible": {
                    outline: "2px solid #FE0944",
                    outlineOffset: "2px",
                  },
                }}
              >
                {h.name}
              </Box>
            );
          })}
        </Box>
      </Box>

      {/* Selected preview card — appears first, then Add details below */}
      {hasCoords && (
        <Box
          sx={{
            padding: "16px",
            borderRadius: "16px",
            background: "rgba(254, 9, 68, 0.06)",
            border: "1px solid rgba(254, 9, 68, 0.18)",
          }}
        >
          <Typography
            sx={{
              fontFamily: SANS,
              fontSize: "10px",
              fontWeight: 700,
              color: "#FE0944",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              marginBottom: "4px",
            }}
          >
            Selected
          </Typography>
          <Typography
            sx={{
              fontFamily: SERIF,
              fontSize: "16px",
              fontWeight: 600,
              color: "#3c1e14",
              marginBottom: "2px",
            }}
          >
            {locationName ?? "Pinned location"}
          </Typography>
          <Typography
            sx={{
              fontFamily: SANS,
              fontSize: "12px",
              color: "rgba(60, 30, 20, 0.7)",
              lineHeight: 1.4,
            }}
          >
            {locationAddress ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`}
          </Typography>
          {addressDetails.trim() && (
            <Typography
              sx={{
                fontFamily: SANS,
                fontSize: "12px",
                color: "rgba(60, 30, 20, 0.7)",
                lineHeight: 1.4,
                marginTop: "8px",
                paddingTop: "8px",
                borderTop: "1px dashed rgba(254, 9, 68, 0.2)",
                fontStyle: "italic",
              }}
            >
              📍 {addressDetails}
            </Typography>
          )}
        </Box>
      )}

      {/* Add details — additive refinement on top of selected location.
          Only renders once a place is picked. Independent from
          locationAddress (which holds the canonical address). */}
      {hasCoords && (
        <Box>
          <Typography
            sx={{
              fontFamily: SANS,
              fontSize: "11px",
              fontWeight: 700,
              color: "rgba(60, 30, 20, 0.55)",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              marginBottom: "6px",
              paddingLeft: "4px",
            }}
          >
            Add details (optional)
          </Typography>
          <Typography
            sx={{
              fontFamily: SANS,
              fontSize: "11.5px",
              color: "rgba(60, 30, 20, 0.55)",
              marginBottom: "10px",
              paddingLeft: "4px",
              lineHeight: 1.4,
            }}
          >
            Help your therapist find you — room number, floor, building,
            side entrance, gate code, landmarks.
          </Typography>
          <TextField
            fullWidth
            multiline
            minRows={2}
            maxRows={4}
            placeholder="e.g. Tower 2, 21st floor, Room 2104. Side entrance on Soi 21."
            value={addressDetails}
            onChange={(e) => onChangeAddressDetails(e.target.value)}
            sx={{
              "& .MuiOutlinedInput-root": {
                background: "rgba(255, 255, 255, 0.65)",
                borderRadius: "14px",
                fontFamily: SANS,
                fontSize: "13.5px",
                "& fieldset": { borderColor: "rgba(0, 0, 0, 0.08)" },
                "&:hover fieldset": { borderColor: "#FE0944" },
                "&.Mui-focused fieldset": { borderColor: "#FE0944" },
              },
            }}
          />
        </Box>
      )}

      {!hasCoords && (
        <Typography
          sx={{
            fontFamily: SANS,
            fontSize: "12px",
            color: "rgba(60, 30, 20, 0.5)",
            textAlign: "center",
            padding: "8px",
            fontStyle: "italic",
          }}
        >
          Pick a hotel or tap &ldquo;Use my current location&rdquo; to continue
        </Typography>
      )}
    </Box>
  );
};

export default StepLocation;
