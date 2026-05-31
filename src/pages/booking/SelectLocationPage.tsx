

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
import { useTranslation } from "react-i18next";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import MyLocationRoundedIcon from "@mui/icons-material/MyLocationRounded";
import LocationOnRoundedIcon from "@mui/icons-material/LocationOnRounded";
// 🆕 Round 28b60 — MUI icons replacing emoji (founder: "ไม่เอาอ๊โมจิ
//   เอาไอคอน"). Same icon set used across the booking flow.
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import PermPhoneMsgRoundedIcon from '@mui/icons-material/PermPhoneMsgRounded';
import EditNoteRoundedIcon from '@mui/icons-material/EditNoteRounded';
import AutoAwesomeSharpIcon from '@mui/icons-material/AutoAwesomeSharp';
import WavingHandTwoToneIcon from '@mui/icons-material/WavingHandTwoTone';
import ElevatorRoundedIcon from "@mui/icons-material/ElevatorRounded";
import MeetingRoomRoundedIcon from "@mui/icons-material/MeetingRoomRounded";
import PlaceRoundedIcon from "@mui/icons-material/PlaceRounded";

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


const MEETING_POINTS: {
  id: MeetingPoint;
  label: string;
  icon: React.ReactNode;
  iconBg: string;
  iconFg: string;
}[] = [
  {
    id: "lobby",
    label: "Meet at Lobby",
    icon: <WavingHandTwoToneIcon sx={{ fontSize: 22 }} />,
    iconBg: "rgba(59, 130, 246, 0.12)",
    iconFg: "#2563eb",
  },
  {
    id: "lift",
    label: "Meet at the Elevator",
    icon: <ElevatorRoundedIcon sx={{ fontSize: 22 }} />,
    iconBg: "rgba(20, 184, 166, 0.12)",
    iconFg: "#14b8a6",
  },
  {
    id: "direct",
    label: "Come to my room",
    icon: <MeetingRoomRoundedIcon sx={{ fontSize: 22 }} />,
    iconBg: "rgba(254, 9, 68, 0.10)",
    iconFg: "#FE0944",
  },
  {
    id: "other",
    label: "Other",
    icon: <PlaceRoundedIcon sx={{ fontSize: 22 }} />,
    iconBg: "rgba(245, 158, 11, 0.12)",
    iconFg: "#d97706",
  },
];

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

// 🆕 Round 28s73 (audit perf) — hoisted to module scope. The longest-
//   first sort never changes, so re-sorting a fresh copy on every render
//   + every keystroke (dialFromPhone was called in render and in
//   onPhoneChange) was pure waste. Sort once at module load.
const DIAL_CODES_BY_LEN = [...DIAL_CODES].sort(
  (a, b) => b.dial.length - a.dial.length
);

/** Resolve a dial code from an E.164 phone string ("+6680…") → DialCode. */
function dialFromPhone(phone: string): DialCode {
  // Try longest dial codes first so "+1..." doesn't shadow "+1242".
  return DIAL_CODES_BY_LEN.find((c) => phone.startsWith(c.dial)) ?? DIAL_CODES[0];
}

// 🆕 Round 28r10 (founder 2026-05-06) — "เทเรเกรมยิงแมปไม่ตรง · ถ้า
//   ตรงคือมาทั้งชื่อ". The previous helper always built a coords-only
//   URL (`?query=13.76,100.56`), which Google Maps resolves to a
//   Plus-Code pin (e.g. "QH68+GR9") with no business name attached.
//   When the guest picked a real place via Autocomplete or POI click
//   we already KNOW the place name — using it as the search query
//   makes Google Maps land directly on the named establishment with
//   its photos / reviews / phone number, exactly like the founder's
//   reference screenshot.
//
// Lookup priority:
//   1. placeName (e.g. "The Westin Grande Sukhumvit")
//   2. address    (full formatted_address)
//   3. lat,lng    (coords-only fallback for free-tap reverse geocodes)
const buildMapUrl = (
  lat: number | null,
  lng: number | null,
  placeName?: string | null,
  address?: string | null
): string | null => {
  const cleanName = placeName?.trim();
  const cleanAddr = address?.trim();
  if (cleanName) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      cleanName
    )}`;
  }
  if (cleanAddr) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      cleanAddr
    )}`;
  }
  if (lat == null || lng == null) return null;
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
};

const SelectLocationPage: React.FC = () => {
  const { t } = useTranslation();
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

  const [pinJustMoved, setPinJustMoved] = useState(false);
  useEffect(() => {
    if (!pinJustMoved) return;
    const t = window.setTimeout(() => setPinJustMoved(false), 2400);
    return () => window.clearTimeout(t);
  }, [pinJustMoved]);

  // 🆕 Round 28b63 (founder 2026-05-05) — Geolocation error surface.
  //   Prior versions silently swallowed permission-denied / timeout /
  //   unavailable so the customer thought the button was broken when
  //   browser had previously rejected location. Auto-dismiss after
  //   8 seconds — long enough to read, short enough not to linger.
  const [geoError, setGeoError] = useState<string | null>(null);
  useEffect(() => {
    if (!geoError) return;
    const t = window.setTimeout(() => setGeoError(null), 8000);
    return () => window.clearTimeout(t);
  }, [geoError]);

  // 🆕 Round 28b62 (founder 2026-05-05) — GPS-pinned hint.
  //   When the user taps "Use my current location" we drop the pin
  //   on raw lat/lng. GPS accuracy is typically 10-50 m in BKK so the
  //   pin can land in the parking lot / sidewalk instead of at the
  //   actual building entrance. Founder: "ใส่หมายเหตุเลื่อนหมุดให้ตรง
  //   ชื่อสถานที่". This banner reminds the customer to drag the pin
  //   onto the right building so the address card name matches what
  //   the therapist will see. Auto-dismiss when the user moves the
  //   pin (treats it as "instruction acted on") or after 9 seconds.
  const [gpsHint, setGpsHint] = useState(false);
  useEffect(() => {
    if (!gpsHint) return;
    const t = window.setTimeout(() => setGpsHint(false), 9000);
    return () => window.clearTimeout(t);
  }, [gpsHint]);

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
      // 🆕 Round 28b62 — User moved the pin → instructional hint
      //   dismissed (treats the move as "did the thing the hint asked").
      setGpsHint(false);

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
          mapUrl: buildMapUrl(
            lat,
            lng,
            place.name,
            place.formatted_address
          ),
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

    // 🆕 Round 28s73 (audit) — tear down on unmount. The map `click`
    //   listener + Autocomplete `place_changed` listener (and the
    //   closures they capture) used to leak because this effect
    //   returned no cleanup. Clear all instance listeners and detach
    //   the marker, then null the refs so a remount rebuilds cleanly.
    return () => {
      const gEvent = (
        window as unknown as {
          google?: { maps?: { event?: { clearInstanceListeners: (x: unknown) => void } } };
        }
      ).google?.maps?.event;
      if (gEvent) {
        if (mapRef.current) gEvent.clearInstanceListeners(mapRef.current);
        if (autocompleteRef.current)
          gEvent.clearInstanceListeners(autocompleteRef.current);
      }
      if (markerRef.current) {
        (markerRef.current as { setMap: (m: unknown) => void }).setMap(null);
      }
      markerRef.current = null;
      autocompleteRef.current = null;
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  function placeMarker(lat: number, lng: number) {
    const w = window as unknown as {
      google?: { maps?: { Marker: new (opts: unknown) => unknown } };
    };
    const G = w.google?.maps;
    if (!G || !mapRef.current) return;
    // 🆕 Round 28s73 (audit perf) — reuse the existing marker via
    //   setPosition instead of destroying + reconstructing it on every
    //   pin move (no flicker, fewer SDK objects).
    if (markerRef.current) {
      (
        markerRef.current as {
          setPosition: (p: { lat: number; lng: number }) => void;
        }
      ).setPosition({ lat, lng });
      return;
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
            mapUrl: buildMapUrl(
              lat,
              lng,
              place.name,
              place.formatted_address
            ),
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
          mapUrl: buildMapUrl(
            lat,
            lng,
            best.formatted_address ?? p.locationName ?? null,
            best.formatted_address ?? p.locationAddress
          ),
        }));
      } else {
        setForm((p) => ({
          ...p,
          lat,
          lng,
          mapUrl: buildMapUrl(lat, lng, p.locationName, p.locationAddress),
        }));
      }
    });
  }

  // 🆕 Round 28b63 (founder 2026-05-05) — Hardened "Use my current
  //   location" flow. Previously the error handler silently flipped
  //   `geoLoading` back without telling the customer WHY the call
  //   failed (denied / timed out / position unavailable / blocked
  //   on plain HTTP). Customer sees the spinner disappear and thinks
  //   the button is broken. New flow:
  //     1. Pre-flight check via Permissions API for "denied" state
  //        so we don't even bother prompting (fast feedback).
  //     2. Pass the GeolocationPositionError into the error handler
  //        and route to a human message via `geoError` state.
  //     3. Bumped timeout 10s → 15s, added maximumAge so a recent
  //        cached fix returns instantly.
  //     4. console.warn so we can debug from DevTools when reported.
  const useCurrentLocation = async () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGeoError(
        t(
          "loc.geoErr.unsupported",
          "Your browser does not support geolocation. Tap the map to drop a pin manually."
        )
      );
      return;
    }
    setGeoError(null);
    setGeoLoading(true);

    // Pre-flight permission check (skipped silently if Permissions
    // API isn't available — Safari iOS < 17 doesn't support it).
    try {
      if ("permissions" in navigator) {
        const perm = await navigator.permissions.query({
          name: "geolocation" as PermissionName,
        });
        if (perm.state === "denied") {
          setGeoLoading(false);
          setGeoError(
            t(
              "loc.geoErr.blocked",
              "Location is blocked in your browser. Enable it in site settings, or tap the map to drop a pin manually."
            )
          );
          return;
        }
      }
    } catch {
      // Permissions API not available or query rejected — proceed.
    }

    // Clear any stale name so reverseGeocode writes the fresh one
    // (Plus Code → real address) instead of being preserved by the
    // `??` fallback.
    setForm((p) => ({ ...p, locationName: null, locationAddress: null }));

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        // 🆕 Round 28b64 (founder 2026-05-05) — Pin first, then enrich.
        //   Founder: "Use my current location ก็ต้องมาปักที่อยู่เราก่อนสิ
        //   ถ้าไม่ตรงค่อยเลื่อน". Previously the form's lat/lng only
        //   updated AFTER reverseGeocode finished — so the address
        //   card waited ~500-1500ms before appearing. Now we commit
        //   lat/lng + a synthetic mapUrl to the form FIRST (visual
        //   pin already moved via placeMarker), then reverseGeocode
        //   asynchronously fills in the human name/address. Customer
        //   sees the pin AND a placeholder card immediately.
        placeMarker(lat, lng);
        const map = mapRef.current as
          | { panTo: (l: { lat: number; lng: number }) => void; setZoom: (z: number) => void }
          | null;
        if (map) {
          map.panTo({ lat, lng });
          map.setZoom(17);
        }
        setForm((p) => ({
          ...p,
          lat,
          lng,
          // Coords-only is fine here — reverseGeocode will overwrite
          // mapUrl with a name-based URL as soon as it lands.
          mapUrl: buildMapUrl(lat, lng),
        }));
        reverseGeocode(lat, lng);
        setGeoLoading(false);
        // 🆕 Round 28b62 — surface the "drag pin to match building"
        //   hint AFTER reverseGeocode kicks off so the customer sees
        //   it next to the address card.
        setGpsHint(true);
      },
      (err) => {
        setGeoLoading(false);
        // 🆕 Round 28s73 (audit) — only log in dev. A production
        //   console.warn of the GeolocationPositionError ran on every
        //   denied/timeout; keep prod console PII-quiet.
        if (import.meta.env.DEV) {
          console.warn("[SelectLocation] geolocation error:", err);
        }
        const codeMessages: Record<number, string> = {
          1: t(
            "loc.geoErr.blocked",
            "Location is blocked in your browser. Enable it in site settings, or tap the map to drop a pin manually."
          ),
          2: t(
            "loc.geoErr.unavailable",
            "Couldn't get your location right now. Tap the map to drop a pin manually."
          ),
          3: t(
            "loc.geoErr.timeout",
            "Location request timed out. Try again, or tap the map to drop a pin manually."
          ),
        };
        setGeoError(
          codeMessages[err.code] ??
            t(
              "loc.geoErr.generic",
              "Location not available. Tap the map to drop a pin manually."
            )
        );
      },
      {
        enableHighAccuracy: true,
        // 🆕 Round 28b63 — 10s → 15s gives slow / first-fix devices
        //   more headroom; maximumAge=60s accepts a recent cached
        //   reading so repeat taps return instantly.
        timeout: 15000,
        maximumAge: 60_000,
      }
    );
  };

  // ── Validation
  // 🆕 Round 28s73 (audit) — validate the NATIONAL significant number
  //   (strip the dial-code prefix first). The old `digits >= 10` counted
  //   the dial code too, so the threshold was wrong per country — a
  //   9-digit junk US number passed, and there was no upper bound.
  //   National numbers across our supported countries run ~7–12 digits.
  const phoneDial = dialFromPhone(form.customerPhone || "+66").dial;
  const nationalDigits = (
    form.customerPhone.startsWith(phoneDial)
      ? form.customerPhone.slice(phoneDial.length)
      : form.customerPhone
  ).replace(/\D/g, "");
  const phoneOk = nationalDigits.length >= 7 && nationalDigits.length <= 12;
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
          mapUrl: buildMapUrl(
            form.lat,
            form.lng,
            form.locationName,
            form.locationAddress
          ),
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
  // 🆕 Round 28b60 (founder 2026-05-05) — Country auto-detect.
  //   When the user pastes / types a number that already starts with a
  //   recognised dial code (e.g. "+447911...", "0085261...", "+8613..."),
  //   we strip the prefix and switch the country selector to that
  //   country in one step. Customer doesn't need to find the country
  //   chip first — paste a full international number and we figure it
  //   out. Falls back to the currently selected dial code when no
  //   prefix is detected.
  const onPhoneChange = (raw: string) => {
    // Normalise: convert "00xx" → "+xx", strip non-digits/+ from the rest.
    let normalised = raw.replace(/^00/, "+").replace(/[^\d+]/g, "");
    if (!normalised.startsWith("+") && /^\d/.test(normalised)) {
      // Plain digits → keep them as national digits under current dial.
      const digits = normalised.replace(/\D/g, "");
      setForm((p) => ({ ...p, customerPhone: `${dialCode.dial}${digits}` }));
      return;
    }
    // Try to match a dial prefix from longest to shortest so "+1234"
    // doesn't false-match "+1" before "+1242" etc. (uses the module-
    // level pre-sorted list — Round 28s73.)
    const match = DIAL_CODES_BY_LEN.find((c) => normalised.startsWith(c.dial));
    if (match) {
      const nat = normalised.slice(match.dial.length).replace(/\D/g, "");
      setForm((p) => ({ ...p, customerPhone: `${match.dial}${nat}` }));
      return;
    }
    // Unrecognised prefix — keep the current dial, drop the bad +.
    const digits = normalised.replace(/\D/g, "");
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
          aria-label={t("common.back", "Back")}
          onClick={() => void navigate(-1)}
          sx={{
            width: 44,
            height: 44,
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
            {t("loc.title", "Select Location")}
          </Typography>
          <Typography
            sx={{
              fontFamily: SANS,
              fontSize: "11px",
              color: "rgba(60, 30, 20, 0.55)",
              marginTop: "2px",
            }}
          >
            {t("loc.subtitle", "Where should we send your practitioner?")}
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
            aria-label={t("loc.searchAria", "Search for a location")}
            placeholder={
              ready
                ? t("loc.searchPlaceholder", "Search for a location…")
                : t("common.loading", "Loading…")
            }
            // 🆕 Round 28b60 — `inputMode="search"` opens a search-style
            //   keyboard on mobile and `enterKeyHint="search"` swaps the
            //   return key to a Search button. autoCapitalize off so
            //   Thai names aren't title-cased mid-typing.
            inputMode="search"
            enterKeyHint="search"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            style={{
              width: "100%",
              padding: "13px 16px 13px 44px",
              borderRadius: "16px",
              border: "1px solid rgba(0, 0, 0, 0.06)",
              background: "#fff",
              fontFamily: "Inter, sans-serif",
              // 🆕 Round 28b60 — 14 → 16px so iOS Safari/Chrome doesn't
              //   auto-zoom the viewport on focus. Matches the global
              //   inputSx and the rest of the form (Round 28b15 fix
              //   applied to MUI inputs only — this raw <input> for
              //   Google Places Autocomplete was missed).
              fontSize: "16px",
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
          {geoLoading
            ? t("loc.locating", "Locating…")
            : t("loc.useMyLocation", "Use my current location")}
        </Button>

        {/* 🆕 Round 28b63 — Geolocation error banner. Tells the
            customer WHY the button didn't pin them on the map. */}
        {geoError && (
          <Box
            role="alert"
            aria-live="assertive"
            sx={{
              padding: "12px 14px",
              borderRadius: "14px",
              background: "rgba(254, 9, 68, 0.06)",
              border: "1px solid rgba(254, 9, 68, 0.28)",
              display: "flex",
              alignItems: "flex-start",
              gap: "10px",
            }}
          >
            <MyLocationRoundedIcon
              sx={{ fontSize: 20, color: "#FE0944", flexShrink: 0, marginTop: "1px" }}
            />
            <Typography
              sx={{
                flex: 1,
                fontFamily: SANS,
                fontSize: "12.5px",
                color: "rgba(60, 30, 20, 0.82)",
                lineHeight: 1.5,
              }}
            >
              {geoError}
            </Typography>
          </Box>
        )}

        {/* 🆕 Round 28b62 (founder 2026-05-05) — GPS hint banner.
            Founder: "ใส่หมายเหตุเลื่อนหมุดให้ตรงชื่อสถานที่".
            GPS accuracy in BKK is typically 10-50 m so the pin can
            land in a parking lot or sidewalk instead of at the actual
            building entrance. This banner appears for ~9 seconds (or
            until the customer drags the pin) reminding them to fine-
            tune the pin so the address-card name matches the building
            they're actually in. Bilingual TH/EN for tourist + local. */}
        {gpsHint && (
          <Box
            role="status"
            aria-live="polite"
            sx={{
              padding: "12px 14px",
              borderRadius: "14px",
              background:
                "linear-gradient(180deg, rgba(245, 158, 11, 0.10), rgba(245, 158, 11, 0.05))",
              border: "1px solid rgba(245, 158, 11, 0.35)",
              display: "flex",
              alignItems: "flex-start",
              gap: "10px",
              animation: "fadeSlideIn 0.32s ease-out",
              "@keyframes fadeSlideIn": {
                from: { opacity: 0, transform: "translateY(-4px)" },
                to: { opacity: 1, transform: "translateY(0)" },
              },
            }}
          >
            <MyLocationRoundedIcon
              sx={{ fontSize: 20, color: "#b45309", flexShrink: 0, marginTop: "1px" }}
            />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                sx={{
                  fontFamily: SANS,
                  fontSize: "13px",
                  fontWeight: 700,
                  color: "#92400e",
                  lineHeight: 1.35,
                  marginBottom: "2px",
                }}
              >
                {t("loc.gpsHint.title", "Your location has been pinned")}
              </Typography>
              <Typography
                sx={{
                  fontFamily: SANS,
                  fontSize: "12px",
                  color: "rgba(60, 30, 20, 0.7)",
                  lineHeight: 1.45,
                }}
              >
                {t("loc.gpsHint.body", "Drag the pin to adjust the location.")}
              </Typography>
            </Box>
          </Box>
        )}

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
                {form.locationName ?? t("loc.pinnedFallback", "Pinned location")}
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
                    // 🆕 Round 28s73 (audit) — was a copy-pasted border
                    //   value in `background` (invalid, silently ignored).
                    //   Now a real light-teal tint behind the pill.
                    background: "rgba(20, 184, 166, 0.10)",
                    color: "#14b8a6",
                    fontFamily: SANS,
                    fontSize: "11px",
                    fontWeight: 700,
                    border: "1.5px solid rgba(20, 184, 166, 0.35)",
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
                  <svg xmlns="http://www.w3.org/2000/svg" 
                  height="26px" viewBox="0 -960 960 960" 
                  width="26px" fill="#14b8a6">
                    <path d="M420-180 220-380l60-60 140 140 260-260 60 60L420-180Z"/>
                  </svg> {t("loc.addrUpdated", "Address updated to match pin")}
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
            {t("loc.contactDetails", "Contact Details")}
          </Typography>

        {/* Customer Name */}
        <FieldLabel label={t("loc.contactName", "Guest name")} icon={<PersonRoundedIcon sx={{ fontSize: 18 }} />} required>
          <TextField
            fullWidth
            placeholder={t("loc.namePlaceholder", "Name on the reservation")}
            value={form.contactName}
            onChange={(e) =>
              setForm((p) => ({ ...p, contactName: e.target.value }))
            }
            sx={inputSx}
          />
        </FieldLabel>

        {/* Phone — country selectable, national digits in the right field */}
        <FieldLabel label={t("loc.phone", "Phone Number")} icon={<PermPhoneMsgRoundedIcon sx={{ fontSize: 18 }} />} required>
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
              <KeyboardArrowDownRoundedIcon
                aria-hidden
                sx={{
                  fontSize: 16,
                  color: "rgba(60, 30, 20, 0.5)",
                  marginLeft: "2px",
                }}
              />
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
              placeholder={t("loc.phonePlaceholder", "XX XXX XXXX")}
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
            {t("loc.phoneHelper", "Used for arrival confirmation only.")}
          </Typography>
        </FieldLabel>


            
        <FieldLabel
          label={t("loc.note", "Note")}
          icon={<EditNoteRoundedIcon sx={{ fontSize: 26 }} />}
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
              ? t(
                  "loc.noteHelp.direct",
                  "Required — please include your reservation name + room number"
                )
              : t(
                  "loc.noteHelp.default",
                  "Add instructions for the practitioner's arrival"
                )}
          </Typography>
          <TextField
            fullWidth
            multiline
            minRows={3}
            maxRows={6}
            placeholder={
              form.meetingPoint === "direct"
                ? t(
                    "loc.notePlaceholder.direct",
                    "e.g. Reservation under John Smith · Room 1207"
                  )
                : t("loc.notePlaceholder.default", "Add room number / villa")
            }
            value={form.addressNote}
            error={directRoomNeedsNote}
            helperText={
              directRoomNeedsNote
                ? t(
                    "loc.noteError",
                    "Required for Direct Room Access (at least 4 characters)"
                  )
                : undefined
            }
            onChange={(e) =>
              setForm((p) => ({ ...p, addressNote: e.target.value }))
            }
            sx={inputSx}
          />
        </FieldLabel>

        <FieldLabel label={t("loc.arrivalInstructions", "Arrival Instructions")} icon={<AutoAwesomeSharpIcon sx={{ fontSize: 22 }} />} optional>
          <Box
            role="radiogroup"
            aria-label={t("loc.arrivalInstructions", "Arrival Instructions")}
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
                    aria-hidden
                    sx={{
                      width: 40,
                      height: 40,
                      flexShrink: 0,
                      borderRadius: "12px",
                      background: m.iconBg,
                      color: m.iconFg,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
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
                    {t(`loc.meet.${m.id}`, m.label)}
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
            {t("loc.dra.title", "Direct Room Access")}
          </Typography>
          <Typography
            sx={{
              fontFamily: SANS,
              fontSize: "12.5px",
              color: "rgba(60, 30, 20, 0.75)",
              lineHeight: 1.55,
            }}
          >
            {t(
              "loc.dra.body",
              "Please provide your reservation name and room number. Your practitioner will coordinate with the front desk or security upon arrival."
            )}
          </Typography>
        </Box>
        </Box>
        {/* end "Your details" form card */}
      </Box>

      {/* Sticky bottom CTA */}
      {/* 🆕 Round 28b43 (founder 2026-05-05) — Lifted above the bottom
          nav so "Confirm Address" never sits behind the BottomNavGlass.
          Uses --cta-bottom-offset = nav height + 16px + safe-area. */}
      {/* 🆕 Round 28b60 (founder 2026-05-05) — Slimmed CTA per founder
          feedback: "ปุ่มคอนเฟิม เล็กลงอีกหน่อย". Was width 92% / height
          54 / fontSize 15.5; now 84% / 46 / 14.5 with softer shadow.
          Still tappable (>= 44pt min for iOS HIG) but visually less
          aggressive — gives the form fields more visual weight. */}
      <Box
        sx={{
          position: "fixed",
          bottom: "var(--cta-bottom-offset)",
          left: "50%",
          transform: "translateX(-50%)",
          width: "84%",
          maxWidth: "380px",
          zIndex: 50,
        }}
      >
        <Button
          fullWidth
          disabled={!canConfirm}
          onClick={onConfirm}
          sx={{
            height: 46,
            borderRadius: "999px",
            background: "linear-gradient(135deg, #FE0944, #FE7A52)",
            color: "#fff",
            fontFamily: SANS,
            fontSize: "14.5px",
            fontWeight: 700,
            letterSpacing: "0.02em",
            textTransform: "none",
            boxShadow:
              "0 8px 20px rgba(254, 9, 68, 0.32), 0 3px 8px rgba(254, 122, 82, 0.15)",
            transition: "transform 0.15s ease, box-shadow 0.15s ease",
            "&:hover": {
              background: "linear-gradient(135deg, #E50840, #E56A47)",
              transform: "translateY(-1px)",
              boxShadow:
                "0 12px 24px rgba(254, 9, 68, 0.38), 0 4px 10px rgba(254, 122, 82, 0.20)",
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
            ? t("loc.cta.confirm", "Confirm Location")
            : directRoomNeedsNote
              ? t("loc.cta.needRoom", "Add room number to continue")
              : form.lat == null || form.lng == null
                ? t("loc.cta.needPin", "Pin a location to continue")
                : t("loc.cta.needContact", "Fill contact details to continue")}
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
  // 🆕 Round 28b60 — `icon` now accepts a React node (MUI icon
  //   component). String emoji still works because React renders
  //   strings inline — but new code should pass a real icon.
  icon?: React.ReactNode;
  required?: boolean;
  optional?: boolean;
  children: React.ReactNode;
}> = ({ label, icon, required, optional, children }) => {
  const { t } = useTranslation();
  return (
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
        // 🆕 Round 28b65 (founder 2026-05-05) — "ตกแต่งไอคอนให้สวย
        //   เหมือน Payment Methods". Mint-tinted disc 28×28 wrapper
        //   matching the iconBg/iconFg pattern used across the booking
        //   flow (PaymentMethodsPage, AddressTile). Was a bare 16px
        //   inline icon — felt loose against the bolder MEETING_POINTS
        //   discs below. Same disc here keeps the form section
        //   visually cohesive top → bottom.
        <Box
          aria-hidden
          sx={{
            width: 28,
            height: 28,
            flexShrink: 0,
            borderRadius: "8px",
            background: "rgba(20, 184, 166, 0.12)",
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
          {t("common.required", "(Required)")}
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
          {t("common.optional", "(Optional)")}
        </Typography>
      )}
    </Box>
    {children}
  </Box>
  );
};

export default SelectLocationPage;
