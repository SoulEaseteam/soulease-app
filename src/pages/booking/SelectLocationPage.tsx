// src/pages/booking/SelectLocationPage.tsx
//
// 🎨 Phase 4 — Dedicated route for picking the booking address.
// Replaces the LocationSheet bottom-sheet pattern with a full-screen
// experience (search + map + form fields) per founder request.
//
// Route: /booking/:therapistId/address
//
// Flow:
//   Confirm Order → tap Address tile → navigate here with current form state
//   User searches / drops pin / fills contact info → Confirm
//   → navigate back to /booking/:therapistId, passing the address payload
//     via react-router `state` (BookingFlowPage reads it in useEffect).
//
// Layout:
//   ┌─ ← Select Location ─────────────────────────┐
//   │  🔍 Search location                          │
//   │  ┌─────────────────────────────────────┐    │
//   │  │              MAP                     │    │
//   │  │              📍                       │    │
//   │  │                                       │    │
//   │  └─────────────────────────────────────┘    │
//   │  📍 Use my current location                 │
//   │                                              │
//   │  [picked place name + address card]          │
//   │                                              │
//   │  Contact Person (Required) — name input      │
//   │  Phone Number (Required) — 🇹🇭 +66 + digits  │
//   │  Note (Optional)                             │
//   │                                              │
//   │  [          Confirm Location          ]      │
//   └──────────────────────────────────────────────┘

import React, { useEffect, useRef, useState } from "react";
import { Box, Typography, TextField, Button, IconButton } from "@mui/material";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import MyLocationRoundedIcon from "@mui/icons-material/MyLocationRounded";
import LocationOnRoundedIcon from "@mui/icons-material/LocationOnRounded";

import { useGoogleMaps } from "@/context/GoogleMapsContext";

const SERIF = '"Fraunces", Georgia, "Times New Roman", serif';
const SANS = '"Inter", system-ui, -apple-system, sans-serif';

export type MeetingPoint = "lobby" | "lift" | "direct";
export type LocationType =
  | "hotel"
  | "condo"
  | "house"
  | "office"
  | "other";

// react-router state we receive from BookingFlowPage and send back
export interface AddressNavState {
  /** Round-trip with the caller — we hand back what we received plus updates */
  locationName: string | null;
  locationAddress: string | null;
  lat: number | null;
  lng: number | null;
  addressDetails: string;
  contactName: string;
  customerPhone: string; // E.164 with +66 prefix
  /** Free-text note attached to this address (room/floor/landmarks etc.) */
  addressNote: string;
  /** Optional meeting-point convention so the therapist knows where to wait */
  meetingPoint: MeetingPoint | null;
  /** Optional building category — drives small UI affordances downstream */
  locationType: LocationType | null;
  /** Auto-generated Google Maps deep-link */
  mapUrl: string | null;
}

const EMPTY: AddressNavState = {
  locationName: null,
  locationAddress: null,
  lat: null,
  lng: null,
  addressDetails: "",
  contactName: "",
  customerPhone: "+66",
  addressNote: "",
  meetingPoint: null,
  locationType: null,
  mapUrl: null,
};

const MEETING_POINTS: { id: MeetingPoint; label: string; icon: string }[] = [
  { id: "lobby", label: "Meet at Lobby", icon: "🏨" },
  { id: "lift", label: "Meet at Lift", icon: "🛗" },
  { id: "direct", label: "Come Directly", icon: "🚪" },
];

const LOCATION_TYPES: { id: LocationType; label: string; icon: string }[] = [
  { id: "hotel", label: "Hotel", icon: "🏨" },
  { id: "condo", label: "Condo / Apartment", icon: "🏢" },
  { id: "house", label: "House", icon: "🏠" },
  { id: "office", label: "Office", icon: "🏢" },
  { id: "other", label: "Other", icon: "📍" },
];

const buildMapUrl = (lat: number | null, lng: number | null) => {
  if (lat == null || lng == null) return null;
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
};

const SelectLocationPage: React.FC = () => {
  const { id: therapistId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const routerLoc = useLocation();
  const incoming = (routerLoc.state ?? null) as Partial<AddressNavState> | null;

  const { ready, loadIfNeeded } = useGoogleMaps();
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<unknown>(null);
  const markerRef = useRef<unknown>(null);
  const autocompleteRef = useRef<unknown>(null);

  const [form, setForm] = useState<AddressNavState>({
    ...EMPTY,
    ...incoming,
  });
  const [geoLoading, setGeoLoading] = useState(false);

  // ── Lazy-load Google Maps SDK on mount
  useEffect(() => {
    loadIfNeeded();
  }, [loadIfNeeded]);

  // ── Init map once SDK is ready
  useEffect(() => {
    if (!ready || !mapContainerRef.current || mapRef.current) return;
    const w = window as unknown as {
      google?: {
        maps?: {
          Map: new (
            el: HTMLElement,
            opts: unknown
          ) => unknown;
          Marker: new (opts: unknown) => unknown;
          Geocoder: new () => {
            geocode: (
              req: { location?: { lat: number; lng: number } },
              cb: (
                results: { formatted_address?: string; place_id?: string }[] | null,
                status: string
              ) => void
            ) => void;
          };
          places?: {
            Autocomplete: new (
              input: HTMLInputElement,
              opts?: unknown
            ) => {
              addListener: (event: string, cb: () => void) => void;
              getPlace: () => {
                name?: string;
                formatted_address?: string;
                geometry?: {
                  location?: { lat: () => number; lng: () => number };
                };
              };
            };
          };
        };
      };
    };
    const G = w.google?.maps;
    if (!G) return;

    const initLat = form.lat ?? 13.736717;
    const initLng = form.lng ?? 100.523186;

    const map = new G.Map(mapContainerRef.current, {
      center: { lat: initLat, lng: initLng },
      zoom: 15,
      disableDefaultUI: true,
      zoomControl: true,
      gestureHandling: "greedy",
    }) as unknown as {
      addListener: (event: string, cb: (e: unknown) => void) => void;
      panTo: (latlng: { lat: number; lng: number }) => void;
      setZoom: (z: number) => void;
    };
    mapRef.current = map;

    if (form.lat != null && form.lng != null) {
      placeMarker(initLat, initLng);
    }

    // Tap on the map → drop a pin + reverse-geocode
    map.addListener("click", (e: unknown) => {
      const ev = e as { latLng?: { lat: () => number; lng: () => number } };
      const ll = ev.latLng;
      if (!ll) return;
      const lat = ll.lat();
      const lng = ll.lng();
      placeMarker(lat, lng);
      reverseGeocode(lat, lng);
    });

    // Autocomplete on the search input
    if (G.places && searchInputRef.current && !autocompleteRef.current) {
      const ac = new G.places.Autocomplete(searchInputRef.current, {
        componentRestrictions: { country: "th" },
        fields: ["name", "formatted_address", "geometry"],
      });
      autocompleteRef.current = ac;
      ac.addListener("place_changed", () => {
        const place = ac.getPlace();
        const loc = place.geometry?.location;
        if (!loc) return;
        const lat = loc.lat();
        const lng = loc.lng();
        placeMarker(lat, lng);
        map.panTo({ lat, lng });
        map.setZoom(17);
        setForm((p) => ({
          ...p,
          locationName: place.name ?? null,
          locationAddress: place.formatted_address ?? null,
          lat,
          lng,
          mapUrl: buildMapUrl(lat, lng),
        }));
      });

      // pac-container z-index so it floats above the bottom sheet
      const styleId = "sunred-pac-zindex";
      if (!document.getElementById(styleId)) {
        const style = document.createElement("style");
        style.id = styleId;
        style.textContent =
          ".pac-container{z-index:9999 !important;border-radius:12px;font-family:'Inter',sans-serif;box-shadow:0 12px 40px rgba(126,30,46,0.18);}";
        document.head.appendChild(style);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  function placeMarker(lat: number, lng: number) {
    const w = window as unknown as {
      google?: { maps?: { Marker: new (opts: unknown) => unknown } };
    };
    const G = w.google?.maps;
    if (!G || !mapRef.current) return;
    if (markerRef.current) {
      const old = markerRef.current as { setMap: (m: unknown) => void };
      old.setMap(null);
    }
    const Marker = G.Marker;
    markerRef.current = new Marker({
      position: { lat, lng },
      map: mapRef.current,
    });
  }

  function reverseGeocode(lat: number, lng: number) {
    const w = window as unknown as {
      google?: {
        maps?: {
          Geocoder: new () => {
            geocode: (
              req: { location: { lat: number; lng: number } },
              cb: (
                results: { formatted_address?: string; place_id?: string }[] | null,
                status: string
              ) => void
            ) => void;
          };
        };
      };
    };
    const G = w.google?.maps;
    if (!G) return;
    const geocoder = new G.Geocoder();
    geocoder.geocode({ location: { lat, lng } }, (results, status) => {
      if (status === "OK" && results?.[0]) {
        setForm((p) => ({
          ...p,
          locationName: p.locationName ?? results[0].formatted_address ?? null,
          locationAddress: results[0].formatted_address ?? p.locationAddress,
          lat,
          lng,
          mapUrl: buildMapUrl(lat, lng),
        }));
      } else {
        setForm((p) => ({
          ...p,
          lat,
          lng,
          mapUrl: buildMapUrl(lat, lng),
        }));
      }
    });
  }

  const useCurrentLocation = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        placeMarker(lat, lng);
        const map = mapRef.current as
          | { panTo: (l: { lat: number; lng: number }) => void; setZoom: (z: number) => void }
          | null;
        if (map) {
          map.panTo({ lat, lng });
          map.setZoom(17);
        }
        reverseGeocode(lat, lng);
        setGeoLoading(false);
      },
      () => setGeoLoading(false),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // ── Validation
  const phoneDigits = form.customerPhone.replace(/\D/g, "");
  const phoneOk = phoneDigits.length >= 10; // +66 + 9 digits = 11
  const canConfirm =
    form.lat != null &&
    form.lng != null &&
    form.contactName.trim().length >= 2 &&
    phoneOk;

  const onConfirm = () => {
    if (!canConfirm) return;
    void navigate(`/booking/${therapistId ?? ""}`, {
      replace: true,
      state: { ...form, mapUrl: buildMapUrl(form.lat, form.lng) },
    });
  };

  // E.164 phone helper — keeps +66 fixed, lets user type digits only
  const onPhoneChange = (raw: string) => {
    const digits = raw.replace(/\D/g, "");
    const trimmed = digits.startsWith("66") ? digits.slice(2) : digits;
    setForm((p) => ({ ...p, customerPhone: `+66${trimmed}` }));
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: "#f5ede2",
        paddingBottom: "calc(120px + env(safe-area-inset-bottom, 0px))",
        fontFamily: SANS,
      }}
    >
      {/* Header */}
      <Box
        sx={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          background: "rgba(255, 248, 240, 0.92)",
          backdropFilter: "blur(20px) saturate(180%)",
          WebkitBackdropFilter: "blur(20px) saturate(180%)",
          borderBottom: "1px solid rgba(0, 0, 0, 0.04)",
          display: "flex",
          alignItems: "center",
          padding: "14px 16px",
        }}
      >
        <IconButton
          aria-label="back"
          onClick={() => void navigate(-1)}
          sx={{
            width: 36,
            height: 36,
            background: "rgba(255, 255, 255, 0.7)",
            border: "1px solid rgba(0, 0, 0, 0.06)",
            color: "#3c1e14",
            "&:hover": { background: "rgba(255, 255, 255, 0.9)" },
          }}
        >
          <ArrowBackRoundedIcon fontSize="small" />
        </IconButton>
        <Typography
          component="h1"
          sx={{
            flex: 1,
            textAlign: "center",
            fontFamily: SERIF,
            fontSize: "18px",
            fontWeight: 600,
            color: "#3c1e14",
            letterSpacing: "-0.01em",
            marginRight: "36px",
          }}
        >
          Select Location
        </Typography>
      </Box>

      <Box sx={{ padding: "16px", display: "flex", flexDirection: "column", gap: "14px" }}>
        {/* Search */}
        <Box sx={{ position: "relative" }}>
          <SearchRoundedIcon
            sx={{
              position: "absolute",
              left: 14,
              top: "50%",
              transform: "translateY(-50%)",
              color: "rgba(60, 30, 20, 0.55)",
              fontSize: 20,
              pointerEvents: "none",
            }}
          />
          <input
            ref={searchInputRef}
            placeholder={ready ? "Search for a location…" : "Loading…"}
            style={{
              width: "100%",
              padding: "12px 14px 12px 42px",
              borderRadius: "999px",
              border: "1px solid rgba(0, 0, 0, 0.08)",
              background: "rgba(255, 255, 255, 0.85)",
              fontFamily: "Inter, sans-serif",
              fontSize: "13.5px",
              outline: "none",
            }}
          />
        </Box>

        {/* Map */}
        <Box
          ref={mapContainerRef}
          sx={{
            width: "100%",
            height: "44vh",
            minHeight: 280,
            borderRadius: "16px",
            overflow: "hidden",
            background: "rgba(0, 0, 0, 0.04)",
            border: "1px solid rgba(0, 0, 0, 0.06)",
          }}
        />

        {/* Use current location */}
        <Button
          onClick={useCurrentLocation}
          disabled={geoLoading}
          startIcon={<MyLocationRoundedIcon />}
          sx={{
            alignSelf: "stretch",
            height: 46,
            borderRadius: "999px",
            background: "rgba(255, 255, 255, 0.9)",
            color: "#FE0944",
            fontFamily: SANS,
            fontWeight: 700,
            fontSize: "13.5px",
            textTransform: "none",
            border: "1.5px solid rgba(254, 9, 68, 0.4)",
            "&:hover": { background: "rgba(255, 255, 255, 1)" },
          }}
        >
          {geoLoading ? "Locating…" : "Use my current location"}
        </Button>

        {/* Picked place card */}
        {form.lat != null && (
          <Box
            sx={{
              padding: "14px",
              borderRadius: "16px",
              background: "rgba(255, 255, 255, 0.92)",
              border: "1px solid rgba(254, 9, 68, 0.18)",
              display: "flex",
              gap: "10px",
            }}
          >
            <Box
              sx={{
                width: 36,
                height: 36,
                flexShrink: 0,
                borderRadius: "10px",
                background:
                  "linear-gradient(135deg, rgba(254, 9, 68, 0.14), rgba(254, 122, 82, 0.14))",
                color: "#FE0944",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <LocationOnRoundedIcon fontSize="small" />
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                sx={{
                  fontFamily: SERIF,
                  fontSize: "14px",
                  fontWeight: 600,
                  color: "#3c1e14",
                  lineHeight: 1.2,
                }}
              >
                {form.locationName ?? "Pinned location"}
              </Typography>
              <Typography
                sx={{
                  fontFamily: SANS,
                  fontSize: "11.5px",
                  color: "rgba(60, 30, 20, 0.65)",
                  marginTop: "2px",
                  lineHeight: 1.4,
                }}
              >
                {form.locationAddress ??
                  `${form.lat.toFixed(5)}, ${(form.lng ?? 0).toFixed(5)}`}
              </Typography>
            </Box>
          </Box>
        )}

        {/* Address details (room/floor) */}
        <FieldLabel label="Address details (optional)">
          <TextField
            fullWidth
            multiline
            minRows={2}
            maxRows={3}
            placeholder="e.g. Tower 2, Floor 21, Room 1204. Side entrance on Soi 21."
            value={form.addressDetails}
            onChange={(e) =>
              setForm((p) => ({ ...p, addressDetails: e.target.value }))
            }
            sx={inputSx}
          />
        </FieldLabel>

        {/* Contact Person */}
        <FieldLabel label="Contact Person" required>
          <TextField
            fullWidth
            placeholder="Name on the booking"
            value={form.contactName}
            onChange={(e) =>
              setForm((p) => ({ ...p, contactName: e.target.value }))
            }
            sx={inputSx}
          />
        </FieldLabel>

        {/* Phone — country fixed to TH */}
        <FieldLabel label="Phone Number" required>
          <Box sx={{ display: "flex", gap: "8px" }}>
            <Box
              aria-label="country code"
              sx={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "12px 14px",
                borderRadius: "12px",
                background: "rgba(255, 255, 255, 0.7)",
                border: "1px solid rgba(0, 0, 0, 0.08)",
                fontFamily: SANS,
                fontSize: "13.5px",
                fontWeight: 600,
                color: "#3c1e14",
                flexShrink: 0,
              }}
            >
              🇹🇭 +66
            </Box>
            <TextField
              fullWidth
              type="tel"
              inputMode="numeric"
              placeholder="8X XXX XXXX"
              value={form.customerPhone.replace(/^\+66/, "")}
              onChange={(e) => onPhoneChange(e.target.value)}
              sx={inputSx}
            />
          </Box>
          <Typography
            sx={{
              fontFamily: SANS,
              fontSize: "10.5px",
              color: "rgba(60, 30, 20, 0.5)",
              marginTop: "6px",
              paddingLeft: "8px",
            }}
          >
            Used for arrival confirmation only.
          </Typography>
        </FieldLabel>

        {/* Note */}
        <FieldLabel label="Note (optional)">
          <TextField
            fullWidth
            multiline
            minRows={2}
            maxRows={4}
            placeholder="e.g. Please come to the lobby first, ring suite intercom."
            value={form.addressNote}
            onChange={(e) =>
              setForm((p) => ({ ...p, addressNote: e.target.value }))
            }
            sx={inputSx}
          />
        </FieldLabel>

        {/* Meeting Point — chips */}
        <FieldLabel label="Meeting Point (optional)">
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {MEETING_POINTS.map((m) => {
              const isActive = form.meetingPoint === m.id;
              return (
                <Box
                  key={m.id}
                  role="radio"
                  aria-checked={isActive}
                  tabIndex={0}
                  onClick={() =>
                    setForm((p) => ({
                      ...p,
                      meetingPoint: isActive ? null : m.id,
                    }))
                  }
                  onKeyDown={(e) => {
                    if (e.key === " " || e.key === "Enter") {
                      e.preventDefault();
                      setForm((p) => ({
                        ...p,
                        meetingPoint: isActive ? null : m.id,
                      }));
                    }
                  }}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "8px 14px",
                    borderRadius: "999px",
                    cursor: "pointer",
                    background: isActive
                      ? "linear-gradient(135deg, rgba(254, 9, 68, 0.12), rgba(254, 122, 82, 0.12))"
                      : "rgba(255, 255, 255, 0.7)",
                    border: isActive
                      ? "1.5px solid #FE0944"
                      : "1px solid rgba(0, 0, 0, 0.08)",
                    fontFamily: SANS,
                    fontSize: "12.5px",
                    fontWeight: 600,
                    color: isActive ? "#FE0944" : "#3c1e14",
                    transition: "all 0.15s ease",
                  }}
                >
                  <Box sx={{ fontSize: "13px" }}>{m.icon}</Box>
                  {m.label}
                </Box>
              );
            })}
          </Box>
        </FieldLabel>

        {/* Location Type — chips */}
        <FieldLabel label="Location Type (optional)">
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {LOCATION_TYPES.map((l) => {
              const isActive = form.locationType === l.id;
              return (
                <Box
                  key={l.id}
                  role="radio"
                  aria-checked={isActive}
                  tabIndex={0}
                  onClick={() =>
                    setForm((p) => ({
                      ...p,
                      locationType: isActive ? null : l.id,
                    }))
                  }
                  onKeyDown={(e) => {
                    if (e.key === " " || e.key === "Enter") {
                      e.preventDefault();
                      setForm((p) => ({
                        ...p,
                        locationType: isActive ? null : l.id,
                      }));
                    }
                  }}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "8px 14px",
                    borderRadius: "999px",
                    cursor: "pointer",
                    background: isActive
                      ? "linear-gradient(135deg, rgba(254, 9, 68, 0.12), rgba(254, 122, 82, 0.12))"
                      : "rgba(255, 255, 255, 0.7)",
                    border: isActive
                      ? "1.5px solid #FE0944"
                      : "1px solid rgba(0, 0, 0, 0.08)",
                    fontFamily: SANS,
                    fontSize: "12.5px",
                    fontWeight: 600,
                    color: isActive ? "#FE0944" : "#3c1e14",
                    transition: "all 0.15s ease",
                  }}
                >
                  <Box sx={{ fontSize: "13px" }}>{l.icon}</Box>
                  {l.label}
                </Box>
              );
            })}
          </Box>
        </FieldLabel>
      </Box>

      {/* Sticky bottom CTA */}
      <Box
        sx={{
          position: "fixed",
          bottom: "calc(20px + env(safe-area-inset-bottom, 0px))",
          left: "50%",
          transform: "translateX(-50%)",
          width: "92%",
          maxWidth: "430px",
          zIndex: 50,
        }}
      >
        <Button
          fullWidth
          disabled={!canConfirm}
          onClick={onConfirm}
          sx={{
            height: 52,
            borderRadius: "999px",
            background: "linear-gradient(135deg, #FE0944, #FE7A52)",
            color: "#fff",
            fontFamily: SANS,
            fontSize: "15px",
            fontWeight: 700,
            letterSpacing: "0.02em",
            textTransform: "none",
            boxShadow: "0 8px 24px rgba(254, 9, 68, 0.35)",
            "&:hover": {
              background: "linear-gradient(135deg, #E50840, #E56A47)",
            },
            "&.Mui-disabled": {
              background: "rgba(0, 0, 0, 0.12)",
              color: "rgba(0, 0, 0, 0.35)",
              boxShadow: "none",
            },
          }}
        >
          {canConfirm ? "Confirm Location" : "Pin a location to continue"}
        </Button>
      </Box>
    </Box>
  );
};

// ── Helpers
const inputSx = {
  flex: 1,
  "& .MuiOutlinedInput-root": {
    background: "rgba(255, 255, 255, 0.7)",
    borderRadius: "12px",
    fontFamily: '"Inter", sans-serif',
    fontSize: "13.5px",
    "& fieldset": { borderColor: "rgba(0, 0, 0, 0.08)" },
    "&:hover fieldset": { borderColor: "rgba(254, 9, 68, 0.4)" },
    "&.Mui-focused fieldset": {
      borderColor: "#FE0944",
      borderWidth: "1.5px",
    },
  },
};

const FieldLabel: React.FC<{
  label: string;
  required?: boolean;
  children: React.ReactNode;
}> = ({ label, required, children }) => (
  <Box>
    <Typography
      sx={{
        fontFamily: SANS,
        fontSize: "11px",
        fontWeight: 800,
        color: "rgba(60, 30, 20, 0.55)",
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        marginBottom: "8px",
        paddingLeft: "2px",
      }}
    >
      {label}
      {required && (
        <Box
          component="span"
          sx={{ color: "#FE0944", marginLeft: "4px", fontWeight: 800 }}
        >
          (Required)
        </Box>
      )}
    </Typography>
    {children}
  </Box>
);

export default SelectLocationPage;
