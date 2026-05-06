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
//   │ Customer Name (Required) — name input      │
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
import {
  useNavigate,
  useParams,
  useLocation,
  useSearchParams,
} from "react-router-dom";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import MyLocationRoundedIcon from "@mui/icons-material/MyLocationRounded";
import LocationOnRoundedIcon from "@mui/icons-material/LocationOnRounded";

import { useGoogleMaps } from "@/context/GoogleMapsContext";

const SERIF = '"Fraunces", Georgia, "Times New Roman", serif';
const SANS = '"Inter", system-ui, -apple-system, sans-serif';

export type MeetingPoint = "lobby" | "lift" | "direct" | "other";
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
  // 🆕 Round 9 (founder 2026-05-01): backup channel for the booking
  //    context (service / duration / date / time). URL params are the
  //    primary source of truth, but if a refresh / replace strips them
  //    these state fields keep BookingFlowPage's Order Details alive.
  serviceId?: string | null;
  duration?: number | null;
  date?: string | null;
  time?: string | null;
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

// 🆕 Founder 2026-05-01 round 13: rename 'Meet at Lift' → 'Wait for me at
//    the lift' + add 'Other' option. Now rendered as a radio list inside
//    the new 'Arrival Instructions' card (no longer inline chips).
const MEETING_POINTS: {
  id: MeetingPoint;
  label: string;
  icon: string;
}[] = [
  { id: "lobby", label: "Meet at Lobby", icon: "🏨" },
  { id: "lift", label: "Meet at the Elevator", icon: "🛗" },
  { id: "direct", label: "Come to my room", icon: "🚪" },
  { id: "other", label: "Other", icon: "📍" },
];

// LOCATION_TYPES removed 2026-05-01 (founder: 'Location Type (Optional) ลบ').
// `LocationType` enum is still exported for back-compat with existing
// bookings in Firestore; new bookings just leave the field null.

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
  // 🆕 Round 8 (founder 2026-05-01): preserve the booking-context query
  //    string (?service=…&duration=…&date=…&time=…) on the round-trip
  //    back to /booking/:id so the Confirm Order page can rehydrate
  //    its full state without going through TherapistDetailPage again.
  const [searchParams] = useSearchParams();
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
  // 🆕 Round 28b31 — flag set TRUE briefly after a map tap, so we can
  //   show a "📍 Address updated to match pin" toast and reassure the
  //   customer that the visible address matches where the therapist
  //   will actually be sent.
  const [pinJustMoved, setPinJustMoved] = useState(false);
  useEffect(() => {
    if (!pinJustMoved) return;
    const t = window.setTimeout(() => setPinJustMoved(false), 2400);
    return () => window.clearTimeout(t);
  }, [pinJustMoved]);

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
    }) as {
      addListener: (event: string, cb: (e: unknown) => void) => void;
      panTo: (latlng: { lat: number; lng: number }) => void;
      setZoom: (z: number) => void;
    };
    mapRef.current = map;

    if (form.lat != null && form.lng != null) {
      placeMarker(initLat, initLng);
    }

    // Tap on the map → drop a pin + reverse-geocode.
    // 🆕 Round 28b31 (founder 2026-05-04) — Address ↔ pin sync fix.
    //   Bug: customer types/picks address "A" via search, then taps the
    //   map at point "B" to nudge the pin. Pin moves to B, but locationName
    //   stayed as "A" because reverseGeocode preserves it via `?? `.
    //   Result: Telegram booking text says address A but map link points
    //   to B — admin sends therapist to wrong place.
    //   Fix: any deliberate map click is treated as "I want this exact
    //   spot" — clear both locationName and locationAddress BEFORE
    //   reverseGeocode runs, so the new lat/lng's formatted_address
    //   wins. Toast feedback so customer sees the address refresh.
    map.addListener("click", (e: unknown) => {
      const ev = e as {
        latLng?: { lat: () => number; lng: () => number };
        placeId?: string;
        stop?: () => void;
      };
      const ll = ev.latLng;
      if (!ll) return;
      const lat = ll.lat();
      const lng = ll.lng();
      placeMarker(lat, lng);
      setForm((p) => ({
        ...p,
        locationName: null,
        locationAddress: null,
        lat,
        lng,
      }));
      setPinJustMoved(true);
      // 🆕 Round 28b47 (founder 2026-05-05) — Pin ↔ address sync.
      //   When the user taps a POI label on the map (Supalai City
      //   Resort, etc.), Google fires `click` with `placeId` set AND
      //   pops its own InfoWindow showing the place name. Previously
      //   we ignored placeId, so the address card below ended up with
      //   reverseGeocode's street address ("300 Pracha Uthit Rd")
      //   while the pin's InfoWindow showed the POI name — they didn't
      //   match. Now: suppress Google's InfoWindow with `e.stop()`,
      //   pull the Place's full details, and write `locationName` =
      //   place.name + `locationAddress` = formatted_address so the
      //   card mirrors the pin.
      if (ev.placeId) {
        ev.stop?.();
        fetchPlaceDetails(ev.placeId, lat, lng);
      } else {
        reverseGeocode(lat, lng);
      }
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

  // 🆕 Round 28b47 (founder 2026-05-05) — POI click → Places API
  //   getDetails. Returns the place's display name (e.g. "Supalai City
  //   Resort Ratchada-Huai Khwang") + its full formatted_address. We
  //   store these as locationName / locationAddress so the address card
  //   below the map matches the pin's InfoWindow exactly. Falls back
  //   to reverseGeocode if Places API isn't loaded or returns NOT_OK.
  function fetchPlaceDetails(placeId: string, lat: number, lng: number) {
    const w = window as unknown as {
      google?: {
        maps?: {
          places?: {
            PlacesService: new (map: unknown) => {
              getDetails: (
                req: { placeId: string; fields: string[] },
                cb: (
                  place:
                    | { name?: string; formatted_address?: string }
                    | null,
                  status: string
                ) => void
              ) => void;
            };
          };
        };
      };
    };
    const Places = w.google?.maps?.places;
    if (!Places || !mapRef.current) {
      reverseGeocode(lat, lng);
      return;
    }
    const service = new Places.PlacesService(mapRef.current);
    service.getDetails(
      {
        placeId,
        fields: ["name", "formatted_address"],
      },
      (place, status) => {
        if (status === "OK" && place && (place.name || place.formatted_address)) {
          setForm((p) => ({
            ...p,
            locationName: place.name ?? place.formatted_address ?? null,
            locationAddress: place.formatted_address ?? null,
            lat,
            lng,
            mapUrl: buildMapUrl(lat, lng),
          }));
        } else {
          reverseGeocode(lat, lng);
        }
      }
    );
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

        // 🆕 Round 28b31 — `??` order swapped: prefer the FRESH
        //   reverse-geocode result for both name + address. The old
        //   `p.locationName ??` preserved a stale Places name even
        //   when the user dragged the pin to a totally different spot.
        //   Caller can still keep its own name by NOT clearing it
        //   before calling reverseGeocode (e.g., place_changed handler
        //   sets locationName explicitly afterward).
        setForm((p) => ({
          ...p,
          locationName: best.formatted_address ?? p.locationName ?? null,
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
  // 🆕 Round 28b48 (founder 2026-05-05) — Direct-room arrivals must
  //   include a note (booking name + room number). Without it the
  //   therapist arrives blind: front desk / security has no way to
  //   route them. We require ≥ 4 chars in the note when meetingPoint
  //   is "direct"; for all other arrival modes the note stays optional.
  const directRoomNeedsNote =
    form.meetingPoint === "direct" && form.addressNote.trim().length < 4;
  const canConfirm =
    form.lat != null &&
    form.lng != null &&
    form.contactName.trim().length >= 2 &&
    phoneOk &&
    !directRoomNeedsNote;

  const onConfirm = () => {
    if (!canConfirm) return;
    // 🆕 Round 9: forward BOTH the URL query string AND the booking
    //    context fields via router state so /booking/:id can rehydrate
    //    Order Details + Pricing reliably regardless of which channel
    //    survives the navigation. Service / duration / date / time
    //    arrive here either from the inbound URL or from the inbound
    //    state (BookingFlowPage forwards both); we pass them back the
    //    same way.
    const qs = searchParams.toString();
    const ctx = {
      serviceId:
        searchParams.get("service") ?? incoming?.serviceId ?? null,
      duration: searchParams.get("duration")
        ? parseInt(searchParams.get("duration") ?? "0", 10) || null
        : incoming?.duration ?? null,
      date: searchParams.get("date") ?? incoming?.date ?? null,
      time: searchParams.get("time") ?? incoming?.time ?? null,
    };
    void navigate(
      `/booking/${therapistId ?? ""}${qs ? `?${qs}` : ""}`,
      {
        replace: true,
        state: {
          ...form,
          mapUrl: buildMapUrl(form.lat, form.lng),
          ...ctx,
        },
      }
    );
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
        background: "linear-gradient(180deg, #FAFBFC 0%, #F1F3F5 100%)",
        borderRadius: "28px",
        overflow: "hidden",
        boxShadow: "0 20px 60px rgba(126, 30, 46, 0.15)",
        position: "relative",
        // 🆕 Round 28b43 — bumped from 120px to 180px so the form bottom
        //   isn't covered by the lifted CTA + bottom nav stack.
        paddingBottom: "calc(180px + env(safe-area-inset-bottom, 0px))",
        fontFamily: SANS,
      }}
    >
      {/* Header — title + small subtitle for context */}
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
            width: 38,
            height: 38,
            background: "rgba(255, 255, 255, 0.85)",
            border: "1px solid rgba(0, 0, 0, 0.06)",
            color: "#3c1e14",
            boxShadow: "0 2px 8px rgba(126, 30, 46, 0.06)",
            "&:hover": { background: "#fff" },
          }}
        >
          <ArrowBackRoundedIcon fontSize="small" />
        </IconButton>
        <Box
          sx={{
            flex: 1,
            textAlign: "center",
            marginRight: "38px",
          }}
        >
          <Typography
            component="h1"
            sx={{
              fontFamily: SERIF,
              fontSize: "18px",
              fontWeight: 600,
              color: "#3c1e14",
              letterSpacing: "-0.01em",
              lineHeight: 1.15,
            }}
          >
            Select Location
          </Typography>
          <Typography
            sx={{
              fontFamily: SANS,
              fontSize: "11px",
              color: "rgba(60, 30, 20, 0.55)",
              marginTop: "2px",
            }}
          >
            Where should we send your therapist?
          </Typography>
        </Box>
      </Box>

      <Box sx={{ padding: "16px", display: "flex", flexDirection: "column", gap: "16px" }}>
        {/* Search — soft white pill with subtle shadow + mint focus accent */}
        <Box
          sx={{
            position: "relative",
            "&:focus-within input": {
              borderColor: "#14b8a6",
              boxShadow: "0 0 0 3px rgba(20, 184, 166, 0.12)",
            },
          }}
        >
          <SearchRoundedIcon
            sx={{
              position: "absolute",
              left: 16,
              top: "50%",
              transform: "translateY(-50%)",
              color: "rgba(60, 30, 20, 0.5)",
              fontSize: 20,
              pointerEvents: "none",
              zIndex: 1,
            }}
          />
          <input
            ref={searchInputRef}
            placeholder={ready ? "Search for a location…" : "Loading…"}
            style={{
              width: "100%",
              padding: "13px 16px 13px 44px",
              borderRadius: "16px",
              border: "1px solid rgba(0, 0, 0, 0.06)",
              background: "#fff",
              fontFamily: "Inter, sans-serif",
              fontSize: "14px",
              color: "#1a1a1a",
              outline: "none",
              boxShadow: "0 4px 14px rgba(126, 30, 46, 0.06)",
              transition: "border-color 0.15s ease, box-shadow 0.15s ease",
            }}
          />
        </Box>

        {/* Map — softer shadow + bigger radius for a polished card feel */}
        <Box
          ref={mapContainerRef}
          sx={{
            width: "100%",
            height: "42vh",
            minHeight: 280,
            borderRadius: "20px",
            overflow: "hidden",
            background: "rgba(0, 0, 0, 0.04)",
            border: "1px solid rgba(0, 0, 0, 0.04)",
            boxShadow: "0 8px 24px rgba(126, 30, 46, 0.10)",
          }}
        />

        {/* Use current location — soft mint pill (matches the mint accent
            we use for Optional labels + ✓ Set chip on Pick date & time) */}
        <Button
          onClick={useCurrentLocation}
          disabled={geoLoading}
          startIcon={<MyLocationRoundedIcon />}
          sx={{
            alignSelf: "stretch",
            height: 48,
            borderRadius: "999px",
            background:
              "linear-gradient(180deg, rgba(20, 184, 166, 0.10), rgba(20, 184, 166, 0.06))",
            color: "#14b8a6",
            fontFamily: SANS,
            fontWeight: 700,
            fontSize: "14px",
            textTransform: "none",
            border: "1.5px solid rgba(20, 184, 166, 0.35)",
            boxShadow: "0 2px 8px rgba(20, 184, 166, 0.08)",
            transition: "all 0.15s ease",
            "&:hover": {
              background:
                "linear-gradient(180deg, rgba(20, 184, 166, 0.18), rgba(20, 184, 166, 0.10))",
              borderColor: "#14b8a6",
            },
            "&.Mui-disabled": {
              opacity: 0.55,
              color: "#14b8a6",
            },
          }}
        >
          {geoLoading ? "Locating…" : "Use my current location"}
        </Button>

        {/* Picked place card — elevated white tile with red accent corner */}
        {form.lat != null && (
          <Box
            sx={{
              padding: "16px",
              borderRadius: "18px",
              background: "#fff",
              border: "1px solid rgba(254, 9, 68, 0.16)",
              boxShadow: "0 6px 18px rgba(254, 9, 68, 0.08)",
              display: "flex",
              gap: "12px",
              alignItems: "flex-start",
            }}
          >
            <Box
              sx={{
                width: 40,
                height: 40,
                flexShrink: 0,
                borderRadius: "12px",
                background:
                  "linear-gradient(135deg, #FE0944, #FE7A52)",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 10px rgba(254, 9, 68, 0.25)",
              }}
            >
              <LocationOnRoundedIcon fontSize="small" />
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                sx={{
                  fontFamily: SERIF,
                  fontSize: "14.5px",
                  fontWeight: 600,
                  color: "#1a1a1a",
                  lineHeight: 1.25,
                  marginBottom: "3px",
                }}
              >
                {form.locationName ?? "Pinned location"}
              </Typography>
              <Typography
                sx={{
                  fontFamily: SANS,
                  fontSize: "12px",
                  color: "rgba(60, 30, 20, 0.6)",
                  lineHeight: 1.45,
                }}
              >
                {form.locationAddress ??
                  `${form.lat.toFixed(5)}, ${(form.lng ?? 0).toFixed(5)}`}
              </Typography>
              {/* 🆕 Round 28b31 — Pin-moved confirmation pill. Slides in
                  for ~2.4 s after a map tap so the customer sees that
                  the address text just updated to match where they
                  pinned. Auto-fades. */}
              {pinJustMoved && (
                <Box
                  role="status"
                  aria-live="polite"
                  sx={{
                    marginTop: "6px",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "5px",
                    paddingX: "8px",
                    paddingY: "3px",
                    borderRadius: "999px",
                    background: "rgba(22, 163, 74, 0.10)",
                    color: "#15803d",
                    fontFamily: SANS,
                    fontSize: "11px",
                    fontWeight: 700,
                    border: "1px solid rgba(22, 163, 74, 0.22)",
                    animation: "addrSync 0.3s ease-out",
                    "@keyframes addrSync": {
                      "0%": { opacity: 0, transform: "translateY(-4px)" },
                      "100%": { opacity: 1, transform: "translateY(0)" },
                    },
                    "@media (prefers-reduced-motion: reduce)": {
                      animation: "none",
                    },
                  }}
                >
                  📍 Address updated to match pin
                </Box>
              )}
            </Box>
          </Box>
        )}

        {/* 🆕 Founder 2026-05-01: 'Address details (Optional) ลบ' — dropped.
            Floor/Room/Special notes now live in the Note field below.
            Form fields wrapped in a clean white card so they group as
            'Your details' instead of floating on the gradient bg. */}

        {/* "Your details" form card — wraps Contact / Phone / Note + chips */}
        <Box
          sx={{
            marginTop: "4px",
            padding: "18px 16px 16px",
            borderRadius: "20px",
            background: "rgba(255, 255, 255, 0.85)",
            backdropFilter: "blur(20px) saturate(180%)",
            WebkitBackdropFilter: "blur(20px) saturate(180%)",
            border: "1px solid rgba(0, 0, 0, 0.04)",
            boxShadow: "0 8px 24px rgba(126, 30, 46, 0.06)",
            display: "flex",
            flexDirection: "column",
            gap: "18px",
          }}
        >
          <Typography
            sx={{
              fontFamily: SERIF,
              fontSize: "16px",
              fontWeight: 600,
              color: "#1a1a1a",
              letterSpacing: "-0.01em",
              marginBottom: "-4px",
            }}
          >
            Contact Details
          </Typography>

        {/* Customer Name */}
        <FieldLabel label="Customer Name" icon="👤" required>
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

        {/* 🆕 Founder 2026-05-01 round 13:
            • Note → helper subtitle 'Add instructions for therapist arrival',
              placeholder 'Add room number / villa'
            • The 3-chip Meeting Point row inside Note has been removed —
              moved into a dedicated 'Delivery instructions' radio list
              section below. */}
        {/* 🆕 Round 28b48 (founder 2026-05-05) — Note becomes REQUIRED
            when arrival = "Come to my room". Without booking name +
            room number the therapist arrives blind at the front desk.
            We swap the FieldLabel `optional` flag and surface a red
            helper sentence + error-bordered TextField until ≥ 4 chars
            are entered. For all other arrival modes the field stays
            optional (no UX change). */}
        <FieldLabel
          label="Note"
          icon="📝"
          required={form.meetingPoint === "direct"}
          optional={form.meetingPoint !== "direct"}
        >
          <Typography
            sx={{
              fontFamily: SANS,
              fontSize: "12px",
              color:
                form.meetingPoint === "direct"
                  ? "#FE0944"
                  : "rgba(60, 30, 20, 0.6)",
              marginTop: "-4px",
              marginBottom: "8px",
              paddingLeft: "2px",
              fontWeight: form.meetingPoint === "direct" ? 600 : 400,
            }}
          >
            {form.meetingPoint === "direct"
              ? "Required — please include booking name + room number"
              : "Add instructions for therapist arrival"}
          </Typography>
          <TextField
            fullWidth
            multiline
            minRows={3}
            maxRows={6}
            placeholder={
              form.meetingPoint === "direct"
                ? "e.g. Booking under John Smith · Room 1207"
                : "Add room number / villa"
            }
            value={form.addressNote}
            error={directRoomNeedsNote}
            helperText={
              directRoomNeedsNote
                ? "Required for Direct Room Access (at least 4 characters)"
                : undefined
            }
            onChange={(e) =>
              setForm((p) => ({ ...p, addressNote: e.target.value }))
            }
            sx={inputSx}
          />
        </FieldLabel>

        {/* 🆕 Founder 2026-05-01 round 13: 'Arrival Instructions' radio
            list — replaces the 3-chip Meeting Point row, adds 'Wait for
            me at the lift' (renamed from 'Meet at Lift') and a 4th
            'Other' option. Vertical, full-width tappable rows with the
            radio dot on the right (matches Grab/Lalamove pattern). */}
        <FieldLabel label="Arrival Instructions" icon="🚪" optional>
          <Box
            role="radiogroup"
            aria-label="Arrival instructions"
            sx={{
              display: "flex",
              flexDirection: "column",
              borderRadius: "14px",
              background: "#fff",
              border: "1px solid rgba(0, 0, 0, 0.08)",
              overflow: "hidden",
            }}
          >
            {MEETING_POINTS.map((m, idx) => {
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
                    gap: "12px",
                    padding: "14px 16px",
                    cursor: "pointer",
                    userSelect: "none",
                    borderTop:
                      idx === 0
                        ? "none"
                        : "1px solid rgba(0, 0, 0, 0.06)",
                    background: isActive
                      ? "rgba(254, 9, 68, 0.05)"
                      : "transparent",
                    transition: "background 0.15s ease",
                    "&:hover": {
                      background: isActive
                        ? "rgba(254, 9, 68, 0.08)"
                        : "rgba(0, 0, 0, 0.02)",
                    },
                    "&:focus-visible": {
                      outline: "2px solid #FE0944",
                      outlineOffset: "-2px",
                    },
                  }}
                >
                  <Box
                    component="span"
                    sx={{ fontSize: "18px", flexShrink: 0 }}
                  >
                    {m.icon}
                  </Box>
                  <Typography
                    sx={{
                      flex: 1,
                      fontFamily: SANS,
                      fontSize: "14px",
                      fontWeight: 500,
                      color: "#1a1a1a",
                    }}
                  >
                    {m.label}
                  </Typography>
                  <Box
                    aria-hidden
                    sx={{
                      width: 20,
                      height: 20,
                      flexShrink: 0,
                      borderRadius: "50%",
                      border: isActive
                        ? "6px solid #FE0944"
                        : "2px solid rgba(0, 0, 0, 0.25)",
                      background: isActive ? "#fff" : "transparent",
                      transition: "all 0.15s ease",
                    }}
                  />
                </Box>
              );
            })}
          </Box>
        </FieldLabel>

        {/* 🆕 Founder 2026-05-01 round 13: helper info card explaining
            the 'Direct Room Access' policy. Soft cream tile, no
            interaction — pure communication. */}
        <Box
          sx={{
            padding: "14px 16px",
            borderRadius: "14px",
            background: "rgba(254, 201, 167, 0.18)",
            border: "1px solid rgba(254, 122, 82, 0.18)",
            marginTop: "-4px",
          }}
        >
          <Typography
            sx={{
              fontFamily: SERIF,
              fontSize: "14px",
              fontWeight: 700,
              color: "#3c1e14",
              marginBottom: "4px",
            }}
          >
            Direct Room Access
          </Typography>
          <Typography
            sx={{
              fontFamily: SANS,
              fontSize: "12.5px",
              color: "rgba(60, 30, 20, 0.75)",
              lineHeight: 1.55,
            }}
          >
            Please provide your booking name and room number. 
            Our therapist will coordinate with the front desk or security upon arrival.
          </Typography>
        </Box>
        </Box>
        {/* end "Your details" form card */}
      </Box>

      {/* Sticky bottom CTA */}
      {/* 🆕 Round 28b43 (founder 2026-05-05) — Lifted above the bottom
          nav so "Confirm Address" never sits behind the BottomNavGlass.
          Uses --cta-bottom-offset = nav height + 16px + safe-area. */}
      <Box
        sx={{
          position: "fixed",
          bottom: "var(--cta-bottom-offset)",
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
            height: 54,
            borderRadius: "999px",
            background: "linear-gradient(135deg, #FE0944, #FE7A52)",
            color: "#fff",
            fontFamily: SANS,
            fontSize: "15.5px",
            fontWeight: 700,
            letterSpacing: "0.02em",
            textTransform: "none",
            boxShadow:
              "0 12px 28px rgba(254, 9, 68, 0.38), 0 4px 10px rgba(254, 122, 82, 0.18)",
            transition: "transform 0.15s ease, box-shadow 0.15s ease",
            "&:hover": {
              background: "linear-gradient(135deg, #E50840, #E56A47)",
              transform: "translateY(-1px)",
              boxShadow:
                "0 16px 32px rgba(254, 9, 68, 0.42), 0 6px 14px rgba(254, 122, 82, 0.22)",
            },
            "&.Mui-disabled": {
              background: "rgba(0, 0, 0, 0.10)",
              color: "rgba(0, 0, 0, 0.35)",
              boxShadow: "none",
            },
          }}
        >
          {/* 🆕 Round 28b48 — surface the most-actionable blocker so
              the customer knows exactly what to fix. Direct-room
              missing-note wins over the generic "Pin a location" copy. */}
          {canConfirm
            ? "Confirm Location"
            : directRoomNeedsNote
              ? "Add room number to continue"
              : form.lat == null || form.lng == null
                ? "Pin a location to continue"
                : "Fill contact details to continue"}
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
    // 🆕 Round 28b15 — bumped 14 → 16px so iOS Safari/Chrome doesn't
    //   auto-zoom the viewport when the input is focused. Visual
    //   sizing identical to user (CSS pixel space), just disables
    //   the zoom-on-focus heuristic that breaks booking UX.
    fontSize: "16px",
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
