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
import {
  Box,
  Typography,
  TextField,
  Button,
  IconButton,
  Menu,
  MenuItem,
} from "@mui/material";
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

// 🆕 Founder 2026-05-01: 'Phone Number เลือกประเทศได้'.
//    Curated list of dial codes ordered by likely customer origin in
//    Bangkok (TH local + Asia tourists + Western tourists). Add more
//    on request — keep TH first so it's the default.
interface DialCode {
  code: string; // ISO-3166-1 alpha-2
  flag: string;
  name: string;
  dial: string; // "+66"
}
const DIAL_CODES: DialCode[] = [
  { code: "TH", flag: "🇹🇭", name: "Thailand", dial: "+66" },
  { code: "CN", flag: "🇨🇳", name: "China", dial: "+86" },
  { code: "JP", flag: "🇯🇵", name: "Japan", dial: "+81" },
  { code: "KR", flag: "🇰🇷", name: "South Korea", dial: "+82" },
  { code: "SG", flag: "🇸🇬", name: "Singapore", dial: "+65" },
  { code: "MY", flag: "🇲🇾", name: "Malaysia", dial: "+60" },
  { code: "HK", flag: "🇭🇰", name: "Hong Kong", dial: "+852" },
  { code: "TW", flag: "🇹🇼", name: "Taiwan", dial: "+886" },
  { code: "ID", flag: "🇮🇩", name: "Indonesia", dial: "+62" },
  { code: "VN", flag: "🇻🇳", name: "Vietnam", dial: "+84" },
  { code: "PH", flag: "🇵🇭", name: "Philippines", dial: "+63" },
  { code: "IN", flag: "🇮🇳", name: "India", dial: "+91" },
  { code: "AE", flag: "🇦🇪", name: "United Arab Emirates", dial: "+971" },
  { code: "AU", flag: "🇦🇺", name: "Australia", dial: "+61" },
  { code: "NZ", flag: "🇳🇿", name: "New Zealand", dial: "+64" },
  { code: "GB", flag: "🇬🇧", name: "United Kingdom", dial: "+44" },
  { code: "US", flag: "🇺🇸", name: "United States", dial: "+1" },
  { code: "CA", flag: "🇨🇦", name: "Canada", dial: "+1" },
  { code: "DE", flag: "🇩🇪", name: "Germany", dial: "+49" },
  { code: "FR", flag: "🇫🇷", name: "France", dial: "+33" },
  { code: "IT", flag: "🇮🇹", name: "Italy", dial: "+39" },
  { code: "ES", flag: "🇪🇸", name: "Spain", dial: "+34" },
  { code: "NL", flag: "🇳🇱", name: "Netherlands", dial: "+31" },
  { code: "RU", flag: "🇷🇺", name: "Russia", dial: "+7" },
  { code: "IL", flag: "🇮🇱", name: "Israel", dial: "+972" },
  { code: "SA", flag: "🇸🇦", name: "Saudi Arabia", dial: "+966" },
];

/** Resolve a dial code from an E.164 phone string ("+6680…") → DialCode. */
function dialFromPhone(phone: string): DialCode {
  // Try longest dial codes first so "+1..." doesn't shadow "+1242".
  const sorted = [...DIAL_CODES].sort((a, b) => b.dial.length - a.dial.length);
  return sorted.find((c) => phone.startsWith(c.dial)) ?? DIAL_CODES[0];
}

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
                results:
                  | {
                      formatted_address?: string;
                      place_id?: string;
                      types?: string[];
                    }[]
                  | null,
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
      if (status === "OK" && results && results.length > 0) {
        // 🆕 Founder 2026-05-01: 'ไม่ให้เป็นแบบ QH86+45P'.
        //    Google's first result for many spots in Bangkok is a Plus
        //    Code (e.g. "QH86+45P"). Skip those and pick the first
        //    result that's a real human-readable address: street_address
        //    / premise / subpremise / point_of_interest / establishment.
        const PREFERRED = new Set([
          "street_address",
          "premise",
          "subpremise",
          "point_of_interest",
          "establishment",
          "route",
          "neighborhood",
        ]);
        const isPlusCode = (r: { formatted_address?: string; types?: string[] }) =>
          (r.types?.includes("plus_code") ?? false) ||
          /^[A-Z0-9]{4}\+[A-Z0-9]{2,4}\b/.test(r.formatted_address ?? "");

        const preferred = results.find((r) =>
          (r.types ?? []).some((t) => PREFERRED.has(t))
        );
        const nonPlus = results.find((r) => !isPlusCode(r));
        const best = preferred ?? nonPlus ?? results[0];

        setForm((p) => ({
          ...p,
          locationName: p.locationName ?? best.formatted_address ?? null,
          locationAddress: best.formatted_address ?? p.locationAddress,
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
    // Clear any stale name so reverseGeocode writes the fresh one (Plus
    // Code → real address) instead of being preserved by the `??` fallback.
    setForm((p) => ({ ...p, locationName: null, locationAddress: null }));
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

  // 🆕 Founder 2026-05-01: 'Phone Number เลือกประเทศได้'.
  //    Customer can swap the dial code via a dropdown; the national-
  //    digits portion is preserved, the prefix swaps. Defaults to TH.
  const dialCode = dialFromPhone(form.customerPhone || "+66");
  const [countryAnchor, setCountryAnchor] = useState<HTMLElement | null>(null);
  const openCountry = (e: React.MouseEvent<HTMLElement>) =>
    setCountryAnchor(e.currentTarget);
  const closeCountry = () => setCountryAnchor(null);
  const pickCountry = (c: DialCode) => {
    // Strip the OLD dial code, prepend the NEW dial code so digits survive.
    const oldDigits = form.customerPhone
      .replace(/\D/g, "")
      .replace(new RegExp(`^${dialCode.dial.replace("+", "")}`), "");
    setForm((p) => ({ ...p, customerPhone: `${c.dial}${oldDigits}` }));
    closeCountry();
  };

  // National digits typed in the input — combine with the active dial code.
  const onPhoneChange = (raw: string) => {
    const digits = raw.replace(/\D/g, "");
    setForm((p) => ({ ...p, customerPhone: `${dialCode.dial}${digits}` }));
  };

  return (
    <Box
      sx={{
        // 🆕 Phone-shell wrapper (founder 2026-05-01: 'หน้าเว็บ ขนาดเดียวกัน
        //    ทั้งเว็บ') so the address page matches BookingFlowPage and
        //    BookingHistoryPage rhythm on desktop instead of stretching
        //    full-bleed across a wide viewport.
        maxWidth: "430px",
        margin: "0 auto",
        minHeight: "100vh",
        background: "linear-gradient(180deg, #FFF8F0 0%, #FCEBDC 100%)",
        borderRadius: "28px",
        overflow: "hidden",
        boxShadow: "0 20px 60px rgba(126, 30, 46, 0.15)",
        position: "relative",
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
        <FieldLabel label="Address details" icon="📍" optional>
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
        <FieldLabel label="Contact Person" icon="👤" required>
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

        {/* Phone — country selectable, national digits in the right field */}
        <FieldLabel label="Phone Number" icon="📞" required>
          <Box sx={{ display: "flex", gap: "8px" }}>
            <Box
              role="button"
              tabIndex={0}
              aria-label={`country code ${dialCode.name}`}
              aria-haspopup="menu"
              aria-expanded={!!countryAnchor}
              onClick={openCountry}
              onKeyDown={(e) => {
                if (e.key === " " || e.key === "Enter") {
                  e.preventDefault();
                  openCountry(
                    e as unknown as React.MouseEvent<HTMLElement>
                  );
                }
              }}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "12px 14px",
                borderRadius: "14px",
                background: "#fff",
                border: "1px solid rgba(0, 0, 0, 0.08)",
                fontFamily: SANS,
                fontSize: "14px",
                fontWeight: 600,
                color: "#1a1a1a",
                flexShrink: 0,
                cursor: "pointer",
                userSelect: "none",
                transition: "border-color 0.15s ease",
                "&:hover": { borderColor: "rgba(20, 184, 166, 0.45)" },
                "&:focus-visible": {
                  outline: "2px solid #14b8a6",
                  outlineOffset: "2px",
                },
              }}
            >
              <Box component="span" sx={{ fontSize: "18px", lineHeight: 1 }}>
                {dialCode.flag}
              </Box>
              <Box component="span">{dialCode.dial}</Box>
              <Box
                component="span"
                aria-hidden
                sx={{
                  fontSize: "9px",
                  color: "rgba(60, 30, 20, 0.5)",
                  marginLeft: "2px",
                }}
              >
                ▼
              </Box>
            </Box>
            <Menu
              anchorEl={countryAnchor}
              open={!!countryAnchor}
              onClose={closeCountry}
              anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
              transformOrigin={{ vertical: "top", horizontal: "left" }}
              slotProps={{
                paper: {
                  sx: {
                    maxHeight: 320,
                    minWidth: 240,
                    borderRadius: "14px",
                    boxShadow: "0 10px 30px rgba(0, 0, 0, 0.12)",
                    marginTop: "6px",
                  },
                },
              }}
            >
              {DIAL_CODES.map((c) => {
                const isActive = c.code === dialCode.code;
                return (
                  <MenuItem
                    key={c.code}
                    selected={isActive}
                    onClick={() => pickCountry(c)}
                    sx={{
                      gap: "10px",
                      fontFamily: SANS,
                      fontSize: "14px",
                      "&.Mui-selected": {
                        background: "rgba(20, 184, 166, 0.1)",
                      },
                    }}
                  >
                    <Box component="span" sx={{ fontSize: "18px" }}>
                      {c.flag}
                    </Box>
                    <Box
                      component="span"
                      sx={{ flex: 1, color: "#1a1a1a", fontWeight: 500 }}
                    >
                      {c.name}
                    </Box>
                    <Box
                      component="span"
                      sx={{
                        color: "rgba(60, 30, 20, 0.55)",
                        fontWeight: 600,
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {c.dial}
                    </Box>
                  </MenuItem>
                );
              })}
            </Menu>
            <TextField
              fullWidth
              type="tel"
              inputMode="numeric"
              placeholder="XX XXX XXXX"
              value={form.customerPhone.replace(
                new RegExp(`^\\${dialCode.dial}`),
                ""
              )}
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

        {/* Note — matches founder reference (2026-05-01): green doc icon
            + bold 'Note' + muted '(Optional)', long single-line-ish
            placeholder 'Floor/Room No./Special notes'. */}
        <FieldLabel label="Note" icon="📝" optional>
          <TextField
            fullWidth
            multiline
            minRows={3}
            maxRows={6}
            placeholder="e.g., Floor/Room No./Special notes"
            value={form.addressNote}
            onChange={(e) =>
              setForm((p) => ({ ...p, addressNote: e.target.value }))
            }
            sx={inputSx}
          />
        </FieldLabel>

        {/* Meeting Point — chips */}
        <FieldLabel label="Meeting Point" icon="🤝" optional>
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
        <FieldLabel label="Location Type" icon="🏢" optional>
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
// Card-style input (founder 2026-05-01 ref design): white pill with a
// subtle 1px border, no boxshadow at rest, mint-green focus ring.
const inputSx = {
  flex: 1,
  "& .MuiOutlinedInput-root": {
    background: "#fff",
    borderRadius: "14px",
    fontFamily: '"Inter", sans-serif',
    fontSize: "14px",
    color: "#1a1a1a",
    "& fieldset": { borderColor: "rgba(0, 0, 0, 0.08)" },
    "&:hover fieldset": { borderColor: "rgba(20, 184, 166, 0.45)" },
    "&.Mui-focused fieldset": {
      borderColor: "#14b8a6",
      borderWidth: "1.5px",
    },
  },
};

// 🆕 Founder 2026-05-01: form labels with mint icon + (Required) red /
//    (Optional) muted, matching the reference screenshot. Bigger sans
//    label, normal-case (not uppercase).
const FieldLabel: React.FC<{
  label: string;
  icon?: string; // emoji shown in mint pill before the label
  required?: boolean;
  optional?: boolean;
  children: React.ReactNode;
}> = ({ label, icon, required, optional, children }) => (
  <Box>
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        marginBottom: "10px",
        paddingLeft: "2px",
      }}
    >
      {icon && (
        <Box
          aria-hidden
          sx={{
            fontSize: "16px",
            color: "#14b8a6",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {icon}
        </Box>
      )}
      <Typography
        component="span"
        sx={{
          fontFamily: SANS,
          fontSize: "14px",
          fontWeight: 700,
          color: "#1a1a1a",
        }}
      >
        {label}
      </Typography>
      {required && (
        <Typography
          component="span"
          sx={{
            fontFamily: SANS,
            fontSize: "13px",
            fontWeight: 700,
            color: "#FE0944",
            marginLeft: "-2px",
          }}
        >
          (Required)
        </Typography>
      )}
      {optional && (
        <Typography
          component="span"
          sx={{
            fontFamily: SANS,
            fontSize: "12.5px",
            fontWeight: 500,
            color: "rgba(60, 30, 20, 0.4)",
            marginLeft: "-2px",
          }}
        >
          (Optional)
        </Typography>
      )}
    </Box>
    {children}
  </Box>
);

export default SelectLocationPage;
