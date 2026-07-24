// src/pages/NearMePage.tsx
//
// 🆕 Round 28s335 (founder 2026-07-08) — "ย้าย Or browse by location ไปหน้าใหม่".
//   Renders <HomeTherapistGrid mapOnly /> which reuses the grid's live
//   therapist / price / geolocation loading.
// 🆕 Round 28w.5 — day/night bg + header + coverage + concierge CTA.
// 🆕 Round 28w.10 (founder 2026-07-13) — MAP variant of the taxi estimator:
//   a real Google Map (search + tap-to-pin + drag + "use my current
//   location") that measures distance + estimates the taxi fare to the
//   picked practitioner. Reuses the same Google Maps loader + estimateTaxiFare
//   the booking flow / SelectLocationPage use.
// ─────────────────────────────────────────────────────────────────────

import React from "react";
import { Box, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import HomeTherapistGrid from "@/components/home/HomeTherapistGrid";
// 🆕 28x.52 — near-me → all-in price + one-tap book (pre-filled location) + share pin.
import staticServices from "@/data/services";
import { writePersistedForm, initialFormState } from "@/utils/bookingFormStorage";
import { whatsappDeepLink } from "@/config/concierge";
import { responsiveShell } from "@/theme/breakpoints";
import { useDocumentMeta, langToLocale } from "@/utils/useDocumentMeta";
import { CONCIERGE } from "@/config/concierge";
import { MapPin, Headset } from "phosphor-react";
import { useGoogleMaps } from "@/context/GoogleMapsContext";
import therapists from "@/data/therapists";
import { travelFareDisplay, haversineKm, BKK_ROAD_FACTOR, DISPATCH_BASE } from "@/utils/taxiFare";
import { estimateEtaFromKm, fetchDrivingDistance, type RouteResult } from "@/utils/directionsApi";
import { useTweenedNumber } from "@/hooks/useTweenedNumber";
import { formatTHB } from "@/utils/servicePricing";

const SERIF = '"Playfair Display", "Fraunces", Georgia, serif';
const SANS = '"Inter", system-ui, sans-serif';
const ROSE = "#D97C95";

// 🆕 28x.111 — the taxi widget's in-line service picker. Bestseller (same id
//   as ServicesPage/PricingPage/StepService) gets the ★ + is the default pick.
const BESTSELLER_ID = "SR-HJ2200";
// Short chip labels — the full names ("Gentleman's Signature Therapy") are too
//   long for a 2-column chip row. Euphemism register preserved.
const SERVICE_SHORT: Record<string, string> = {
  "xSR-Thai": "Thai",
  "SR-Aroma": "Aroma",
  "SR-HJ2200": "Gentleman's",
  "SR-B2B3200": "Therapeutic",
};

// 🆕 Round 28x.99k (founder: "ปรับ...ให้บาลานซ์หน่อย") — the taxi-estimate
// map always rendered Google's default WHITE basemap, even at night when
// the whole page (and the practitioner map above it) wears the dark
// "espresso" palette (index.css `:root`). A stark white rectangle sitting
// inside a dark card read as visually broken, not just off-brand. These
// two style arrays recolor the basemap to match --sr-bg/--sr-panel-2/
// --sr-body/--sr-hairline exactly (see index.css), selected at map-init
// time from the `sr-day` class DayNightSync.tsx toggles on <html>. POI +
// transit layers are hidden — this is a tap-to-drop-a-pin utility map, not
// a general navigator, so decluttering keeps it legible at 118px tall.
const NIGHT_MAP_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#20222B" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#17181D" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#8B8F9C" }] },
  { featureType: "administrative", elementType: "geometry", stylers: [{ color: "#31343F" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#2A2D38" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#17181D" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#6E7280" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#31343F" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#121319" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#5A5E6B" }] },
];
const DAY_MAP_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#FFFFFF" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#5C6573" }] },
  { featureType: "administrative", elementType: "geometry", stylers: [{ color: "#EFE3E8" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#FCEBF1" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#8A8F9A" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#F8EEF2" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#FBF7F9" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#C9CDD6" }] },
];

const AREAS = [
  "Sukhumvit", "Silom", "Sathorn", "Asok", "Nana", "Thonglor",
  "Phrom Phong", "Ploenchit", "Chidlom", "Ari", "Riverside", "Ratchada",
];

// 🆕 28w.17 — one consistent section header across the page (founder
//   "จัดระเบียบ"): a rose accent (bar by default, or a passed icon) + the
//   uppercase rose-gold label.
const SectionHeader: React.FC<{ label: string; icon?: React.ReactNode; center?: boolean }> = ({
  label,
  icon,
  center,
}) => (
  <Box
    sx={{
      display: "flex",
      alignItems: "center",
      justifyContent: center ? "center" : "flex-start",
      gap: 0.75,
      mb: 1.25,
    }}
  >
    {icon ?? <Box sx={{ width: 3, height: 14, borderRadius: "2px", background: ROSE }} />}
    <Typography
      sx={{
        fontFamily: SANS,
        fontSize: 11,
        fontWeight: 800,
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        color: "var(--sr-gold-text)",
      }}
    >
      {label}
    </Typography>
  </Box>
);

// 🆕 28w.12 — concierge channel grid (founder: "ต่อด้วย คอนเทค แบบหน้า
//   เซอร์วิส"), mirrors the ServicesPage "Reach us" tiles.
const REACH_CHANNELS = [
  { name: "WhatsApp", src: "/images/profli/whatsapp.png", href: CONCIERGE.whatsappUrl },
  { name: "Telegram", src: "/images/profli/telegram.png", href: CONCIERGE.telegramChannelUrl },
  { name: "LINE", src: "/images/profli/line.png", href: CONCIERGE.lineUrl },
  { name: "WeChat", src: "/images/profli/wechat_2626283.png", href: "/wechat-scan" },
];

const ReachUs: React.FC<{ t: (k: string, d: string) => string }> = ({ t }) => (
  <Box sx={{ mt: 3.5, px: 0.5 }}>
    <SectionHeader label={t("nearme.reach.title", "Reach us")} />
    <Box sx={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 1 }}>
      {REACH_CHANNELS.map((c) => (
        <Box
          key={c.name}
          component="a"
          href={c.href}
          target={c.href.startsWith("http") ? "_blank" : undefined}
          rel={c.href.startsWith("http") ? "noopener noreferrer" : undefined}
          aria-label={`Contact via ${c.name}`}
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 0.75,
            py: 1.75,
            px: 0.5,
            borderRadius: "16px",
            background: "var(--sr-panel-2)",
            border: "1px solid var(--sr-hairline)",
            textDecoration: "none",
            transition: "transform 0.15s ease",
            "&:hover": { transform: "translateY(-2px)" },
          }}
        >
          <Box component="img" src={c.src} alt="" width={26} height={26} loading="lazy" sx={{ width: 26, height: 26, objectFit: "contain" }} />
          <Typography sx={{ fontFamily: SANS, fontSize: 12, fontWeight: 600, color: "var(--sr-body)" }}>
            {c.name}
          </Typography>
        </Box>
      ))}
    </Box>
    <Box
      component="a"
      href={CONCIERGE.telegramChannelUrl}
      target="_blank"
      rel="noopener noreferrer"
      sx={{
        display: "block",
        textAlign: "center",
        mt: 1.5,
        fontFamily: SANS,
        fontSize: 12.5,
        fontWeight: 600,
        color: ROSE,
        textDecoration: "none",
      }}
    >
      {t("nearme.reach.subscribe", "Subscribe to our Telegram channel")}
    </Box>
  </Box>
);

// ── minimal Google Maps type shim (only what this component touches) ──
type GLatLng = { lat: () => number; lng: () => number };
interface GMap {
  addListener: (ev: string, cb: (e: { latLng?: GLatLng | null }) => void) => void;
  panTo: (p: { lat: number; lng: number }) => void;
  setZoom: (z: number) => void;
}
interface GMarker {
  setPosition: (p: { lat: number; lng: number }) => void;
  addListener: (ev: string, cb: (e: { latLng?: GLatLng | null }) => void) => void;
}
interface GMaps {
  Map: new (el: HTMLElement, opts: unknown) => GMap;
  Marker: new (opts: unknown) => GMarker;
  // 🆕 28x.45 — reverse geocode a dropped/dragged pin into a readable place name.
  Geocoder?: new () => {
    geocode: (
      req: { location: { lat: number; lng: number } },
      cb: (results: Array<{ formatted_address?: string }> | null, status: string) => void
    ) => void;
  };
  places?: {
    Autocomplete: new (
      input: HTMLInputElement,
      opts?: unknown
    ) => {
      addListener: (ev: string, cb: () => void) => void;
      getPlace: () => { geometry?: { location?: GLatLng } };
    };
  };
}
const getMaps = (): GMaps | null =>
  (window as unknown as { google?: { maps?: GMaps } }).google?.maps ?? null;

// 🆕 28w.10 — MAP taxi-fare estimator (variant of the 28w.7 GPS-only one).
const TaxiEstimator: React.FC = () => {
  const { t } = useTranslation();
  const { ready, loadIfNeeded } = useGoogleMaps();
  const navigate = useNavigate();

  const roster = React.useMemo(
    () => therapists.filter((p) => p.lat != null && p.lng != null),
    []
  );
  // 🆕 28x.44 (founder: "Select practitioner ไม่ต้องให้ชื่อใครขึ้นก่อน") — start
  //   with NO practitioner chosen; a placeholder prompts the guest to pick.
  const [selectedId, setSelectedId] = React.useState("");
  const [coords, setCoords] = React.useState<{ lat: number; lng: number } | null>(null);
  const [status, setStatus] = React.useState<"idle" | "locating" | "error">("idle");
  const [errMsg, setErrMsg] = React.useState("");
  // 🆕 28x.45 (founder: "พอกดปุ่ม ชื่อสถานที่จะขึ้น ถ้าไม่ตรงคำค้นหาให้ขยับได้") —
  //   the resolved place name for the current pin, so the guest can see where the
  //   system landed and drag the pin to correct it if it's off.
  const [placeName, setPlaceName] = React.useState<string | null>(null);
  // 🆕 28x.46 (founder: "เอา Live route จริงๆ ... จะได้ดูโปร่งใส") — the taxi fee is
  //   charged on the REAL driving route from our dispatch base to the guest (the
  //   exact basis the booking page uses), not a straight-line guess. Fetch it so
  //   the estimate matches the actual bill.
  const [route, setRoute] = React.useState<RouteResult | null>(null);

  const mapContainerRef = React.useRef<HTMLDivElement | null>(null);
  const searchInputRef = React.useRef<HTMLInputElement | null>(null);
  const mapRef = React.useRef<GMap | null>(null);
  const markerRef = React.useRef<GMarker | null>(null);
  const geocoderRef = React.useRef<InstanceType<NonNullable<GMaps["Geocoder"]>> | null>(null);

  // 🆕 28x.45 — reverse-geocode a pin into a readable address.
  const reverseGeocode = React.useCallback((lat: number, lng: number) => {
    const G = getMaps();
    if (!G?.Geocoder) return;
    if (!geocoderRef.current) geocoderRef.current = new G.Geocoder();
    geocoderRef.current.geocode({ location: { lat, lng } }, (results, gcStatus) => {
      setPlaceName(gcStatus === "OK" && results?.[0]?.formatted_address ? results[0].formatted_address! : null);
    });
  }, []);

  const selected = roster.find((p) => p.id === selectedId) ?? null;

  // Place / move the customer pin + record coords.
  const setPin = React.useCallback((lat: number, lng: number) => {
    setCoords({ lat, lng });
    reverseGeocode(lat, lng);
    const G = getMaps();
    const map = mapRef.current;
    if (!G || !map) return;
    if (!markerRef.current) {
      markerRef.current = new G.Marker({ position: { lat, lng }, map, draggable: true });
      markerRef.current.addListener("dragend", (e) => {
        const ll = e.latLng;
        if (ll) { setCoords({ lat: ll.lat(), lng: ll.lng() }); reverseGeocode(ll.lat(), ll.lng()); }
      });
    } else {
      markerRef.current.setPosition({ lat, lng });
    }
  }, [reverseGeocode]);

  React.useEffect(() => {
    loadIfNeeded();
  }, [loadIfNeeded]);

  // Init the map once the SDK is ready.
  React.useEffect(() => {
    if (!ready || !mapContainerRef.current || mapRef.current) return;
    const G = getMaps();
    if (!G) return;
    const map = new G.Map(mapContainerRef.current, {
      center: { lat: 13.7398, lng: 100.56 },
      zoom: 12,
      disableDefaultUI: true,
      zoomControl: true,
      gestureHandling: "greedy",
      // 🆕 28x.46 (founder: "ตัวหนังสือในกล่องจางมองไม่เห็น") — a tap on a Google POI
      //   opened its own low-contrast info card over our pin. Turn POI clicks off so
      //   every tap just drops the pin, and that dim popup never appears.
      clickableIcons: false,
      // 🆕 28x.99k — match the page's day/night theme instead of always
      // showing Google's default white basemap.
      styles: document.documentElement.classList.contains("sr-day")
        ? DAY_MAP_STYLE
        : NIGHT_MAP_STYLE,
    });
    mapRef.current = map;
    map.addListener("click", (e) => {
      const ll = e.latLng;
      if (ll) setPin(ll.lat(), ll.lng());
    });
    if (G.places && searchInputRef.current) {
      const ac = new G.places.Autocomplete(searchInputRef.current, {
        componentRestrictions: { country: "th" },
        fields: ["geometry"],
      });
      ac.addListener("place_changed", () => {
        const loc = ac.getPlace().geometry?.location;
        if (!loc) return;
        const lat = loc.lat();
        const lng = loc.lng();
        setPin(lat, lng);
        map.panTo({ lat, lng });
        map.setZoom(16);
      });
    }
  }, [ready, setPin]);

  const locate = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setStatus("error");
      setErrMsg(t("nearme.taxi.noGeo", "Location isn't available on this device."));
      return;
    }
    setStatus("locating");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setPin(latitude, longitude);
        mapRef.current?.panTo({ lat: latitude, lng: longitude });
        mapRef.current?.setZoom(16);
        setStatus("idle");
      },
      (err) => {
        setStatus("error");
        setErrMsg(
          err.code === err.PERMISSION_DENIED
            ? t("nearme.taxi.denied", "Location blocked. Allow it in your browser, or drop a pin on the map.")
            : t("nearme.taxi.failed", "Couldn't get your location. Drop a pin on the map instead.")
        );
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  // 🆕 28x.46 — fetch the REAL driving route from the dispatch base to the pin,
  //   the same origin + method the booking page charges on. Falls back to a
  //   haversine estimate inside fetchDrivingDistance if Directions is unavailable,
  //   so the fare line never goes blank.
  React.useEffect(() => {
    if (!coords || !ready) { setRoute(null); return; }
    let cancelled = false;
    void fetchDrivingDistance(
      { lat: DISPATCH_BASE.lat, lng: DISPATCH_BASE.lng },
      { lat: coords.lat, lng: coords.lng }
    ).then((r) => { if (!cancelled) setRoute(r); }).catch(() => { /* keep last */ });
    return () => { cancelled = true; };
  }, [coords, ready]);

  const estimate = React.useMemo(() => {
    if (!selected || !coords) return null;
    // Real driving distance from our dispatch base (same basis as the bill),
    // rounded to 1 decimal so what the guest sees is what the band charges.
    const rawKm = route
      ? route.kmRoad
      : haversineKm(DISPATCH_BASE.lat, DISPATCH_BASE.lng, coords.lat, coords.lng) * BKK_ROAD_FACTOR;
    if (!rawKm) return null;
    // Band from the RAW km (identical to the booking charge); round only for display.
    const distanceKm = Math.round(rawKm * 10) / 10;
    // 🆕 28x.48 — real metered fare + surge for the current Bangkok hour, with
    //   the online saving on top (struck original → rounded-down youPay).
    const bkkHour = (new Date().getUTCHours() + 7) % 24;
    const { original, youPay, save } = travelFareDisplay(rawKm, undefined, bkkHour);
    const isLive = route != null && route.source !== "haversine";
    const etaMin = route ? route.durationMin : estimateEtaFromKm(distanceKm);
    return { distanceKm, fare: youPay, original, save, etaMin, isLive };
  }, [selected, coords, route]);

  // 🆕 28x.47 — animate the fare so it "ticks" to the new value when the pin
  //   moves (à la Grab). Tween the amount the guest pays; 0 when unpriced.
  const tweenedFare = useTweenedNumber(estimate?.fare ?? 0);

  // 🆕 28x.111 (founder: "ให้ลูกค้าเลือกเมนูในวิดเจ็ตเลย") — replaces the old
  //   28x.52 "from = cheapest service" anchor. That floor (Thai ฿1,200) trained
  //   the guest to expect the cheapest before they ever saw the menu, so the
  //   ฿2,200 bestseller read as expensive. Now the widget shows a service
  //   PICKER, defaults to the practitioner's most premium option (bestseller
  //   Gentleman's if she offers it), and the all-in price reflects the choice.
  //   The chosen service is carried into the booking flow (serviceId), so the
  //   guest lands pre-selected instead of re-picking. The concierge still
  //   confirms the final price.
  const availableServices = React.useMemo(() => {
    const ids = selected?.servicesAvailable ?? selected?.services ?? [];
    return ids
      .map((id) => staticServices.find((s) => s.id === id))
      .filter((s): s is (typeof staticServices)[number] => Boolean(s))
      // Cheapest → dearest so the row reads as a natural up-menu ladder.
      .sort((a, b) => a.price - b.price);
  }, [selected]);

  const [selectedServiceId, setSelectedServiceId] = React.useState<string | null>(
    null
  );
  // When the practitioner changes, default the pick to her most premium option:
  //   bestseller (Gentleman's) if offered, else the dearest she does. This is
  //   the deliberate up-menu nudge — the eye lands on the higher-margin service,
  //   not the ฿1,200 floor, while the guest can still tap down to Thai.
  React.useEffect(() => {
    if (!availableServices.length) {
      setSelectedServiceId(null);
      return;
    }
    const hasBestseller = availableServices.some((s) => s.id === BESTSELLER_ID);
    const dearest = availableServices[availableServices.length - 1];
    setSelectedServiceId(hasBestseller ? BESTSELLER_ID : dearest.id);
  }, [availableServices]);

  const chosenService =
    availableServices.find((s) => s.id === selectedServiceId) ??
    availableServices[availableServices.length - 1] ??
    null;
  const servicePrice = chosenService?.price ?? 1200;
  const allIn =
    estimate?.fare != null ? servicePrice + estimate.fare : null;
  const mapsUrl = coords ? `https://maps.google.com/?q=${coords.lat},${coords.lng}` : "";

  // 🆕 28x.52 (idea #3) — jump straight into this practitioner's booking with
  //   the pinned location already carried over (no re-entering the address).
  //   28x.111 — carry the chosen service too so the booking flow pre-selects it.
  const bookNow = () => {
    if (!selected || !coords) return;
    writePersistedForm(selected.id, {
      ...initialFormState,
      therapistId: selected.id,
      serviceId: chosenService?.id ?? null,
      lat: coords.lat,
      lng: coords.lng,
      locationName: placeName ?? null,
      locationAddress: placeName ?? null,
      mapUrl: mapsUrl || null,
    });
    void navigate(`/booking/${selected.id}/address`);
  };

  // 🆕 28x.52 (idea #6) — hand the exact pin to the concierge on WhatsApp.
  const sharePin = () => {
    if (!coords) return;
    const msg = t("nearme.taxi.shareMsg", "SunRed booking · my location:") +
      `\n${placeName ?? ""}\n${mapsUrl}`;
    window.open(whatsappDeepLink(msg), "_blank", "noopener");
  };

  if (roster.length === 0) return null;

  return (
    // 🆕 28x.99r (founder: "ให้มันเป็นอันเดียวกัน ... ย้ายเช็กโลเคชั่นขึ้นไปด้านบน
    //   พร้อมอัปเดตราคาที่ตั้งใหม่") — 28w.16 deliberately narrowed this widget to
    //   360px on its own; next to the full-width map/Areas-we-cover sections above
    //   and below it, that read as a disconnected form floating in a wide dark
    //   page. Dropped the extra cap so it shares the page's own responsiveShell
    //   width, and split the card into a Location column (search/map/current-
    //   location — now first, so desktop reads it left-to-right in that order
    //   and mobile stacks it on top) and a Practitioner-and-price column, so the
    //   reclaimed width is used by an actual two-up layout instead of a single
    //   stretched-out form.
    <Box sx={{ mt: 3.5, px: 0.5 }}>
      <SectionHeader label={t("nearme.taxi.title", "Estimate taxi to your place")} center />

      <Box
        sx={{
          p: "13px",
          borderRadius: "18px",
          background: "var(--sr-panel)",
          border: "1px solid var(--sr-hairline)",
          boxShadow: "var(--sr-card-shadow)",
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
          gap: { xs: 0.75, md: 2 },
          alignItems: "start",
        }}
      >
        {/* ── Location column (search / map / drop-a-pin / current location) ── */}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
          {/* Search box (Google Places autocomplete) */}
          <Box
            component="input"
            ref={searchInputRef}
            placeholder={t("nearme.taxi.search", "Search your address or place…")}
            aria-label={t("nearme.taxi.search", "Search your address or place…")}
            sx={{
              width: "100%",
              boxSizing: "border-box",
              fontFamily: SANS,
              fontSize: 14,
              color: "var(--sr-ink)",
              background: "var(--sr-panel-2)",
              border: "1px solid var(--sr-hairline)",
              borderRadius: "12px",
              padding: "9px 12px",
              "&::placeholder": { color: "var(--sr-muted)" },
              "&:focus": { outline: "none", borderColor: ROSE },
            }}
          />

          {/* The map */}
          <Box
            sx={{
              position: "relative",
              borderRadius: "14px",
              overflow: "hidden",
              border: "1px solid var(--sr-hairline)",
              height: 118,
              background: "var(--sr-panel-2)",
            }}
          >
            <Box ref={mapContainerRef} sx={{ position: "absolute", inset: 0 }} />
            {!coords && (
              <Box
                sx={{
                  position: "absolute",
                  left: "50%",
                  bottom: 10,
                  transform: "translateX(-50%)",
                  px: "12px",
                  py: "6px",
                  borderRadius: "999px",
                  background: "rgba(0,0,0,0.55)",
                  color: "#fff",
                  fontFamily: SANS,
                  fontSize: 11,
                  fontWeight: 600,
                  pointerEvents: "none",
                  whiteSpace: "nowrap",
                }}
              >
                {t("nearme.taxi.tapHint", "Tap the map to drop a pin")}
              </Box>
            )}
          </Box>

          {/* 🆕 28x.45 — resolved place name + drag-to-adjust hint once a pin is set. */}
          {coords && (
            <Box
              sx={{
                display: "flex", alignItems: "flex-start", gap: 0.75,
                px: "12px", py: "9px", borderRadius: "12px",
                background: "var(--sr-panel-2)", border: "1px solid var(--sr-hairline)",
              }}
            >
              <Box sx={{ fontSize: 14, lineHeight: 1.4, flexShrink: 0 }}>📍</Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ fontFamily: SANS, fontSize: 13, fontWeight: 600, color: "var(--sr-ink)", lineHeight: 1.35 }}>
                  {placeName ?? t("nearme.taxi.pinDropped", "Pin dropped on the map")}
                </Typography>
                <Typography sx={{ fontFamily: SANS, fontSize: 11.5, color: "var(--sr-body)", mt: 0.2, lineHeight: 1.45 }}>
                  {t("nearme.taxi.dragHint", "Not right? Drag the pin on the map to adjust.")}
                </Typography>
              </Box>
            </Box>
          )}

          {/* Use my current location */}
          <Box
            component="button"
            type="button"
            onClick={locate}
            disabled={status === "locating"}
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 1,
              width: "100%",
              padding: "10px 14px",
              borderRadius: "12px",
              border: "none",
              background: "linear-gradient(135deg, #D97C95 0%, #C96F89 100%)",
              color: "#fff",
              fontFamily: SANS,
              fontSize: 14,
              fontWeight: 700,
              cursor: status === "locating" ? "default" : "pointer",
              opacity: status === "locating" ? 0.8 : 1,
              boxShadow: "0 6px 16px rgba(138, 58, 87, 0.28)",
            }}
          >
            {status === "locating"
              ? t("nearme.taxi.locating", "Locating…")
              : t("nearme.taxi.useLocation", "Use my current location")}
          </Box>

          {status === "error" && (
            <Typography sx={{ fontFamily: SANS, fontSize: 12, color: "#C0562E", lineHeight: 1.45 }}>
              {errMsg}
            </Typography>
          )}

          {/* 🆕 28x.52 (idea #6) — send the exact pin to the concierge. */}
          {coords && (
            <Box
              component="button"
              type="button"
              onClick={sharePin}
              sx={{
                width: "100%", py: "9px", borderRadius: "12px", cursor: "pointer",
                background: "transparent", border: "1px solid var(--sr-hairline)",
                color: "var(--sr-body)", fontFamily: SANS, fontSize: 12.5, fontWeight: 700,
                display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "6px",
              }}
            >
              <MapPin size={14} weight="fill" color={ROSE} />
              {t("nearme.taxi.sharePin", "Send my location to the concierge")}
            </Box>
          )}
        </Box>

        {/* ── Practitioner + price column ── */}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
          {/* Practitioner picker */}
          <Box>
            {/* 🆕 28w.68 (founder "เปลี่ยนเป็นข้อความว่าเลือกชื่อพนักงาน ภาษาอังกฤษ") */}
            <Typography sx={{ fontFamily: SANS, fontSize: 12, fontWeight: 800, color: "var(--sr-body)", mb: 0.5 }}>
              {t("nearme.taxi.practitioner", "Select practitioner")}
            </Typography>
            <Box
              component="select"
              value={selectedId}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedId(e.target.value)}
              aria-label={t("nearme.taxi.practitioner", "Select practitioner")}
              sx={{
                width: "100%",
                appearance: "none",
                fontFamily: SANS,
                fontSize: 14,
                fontWeight: 600,
                color: "var(--sr-ink)",
                background: "var(--sr-panel-2)",
                border: "1px solid var(--sr-hairline)",
                borderRadius: "12px",
                padding: "11px 14px",
                cursor: "pointer",
              }}
            >
              {/* 🆕 28x.44 — placeholder shown until the guest picks; no name pre-filled. */}
              <option value="">{t("nearme.taxi.pickPrompt", "Select practitioner…")}</option>
              {roster.map((p) => {
                // 🆕 28w.11 — founder: drop the area names, show the real
                //   road distance from each practitioner to the picked location.
                const km =
                  coords && p.lat != null && p.lng != null
                    ? haversineKm(p.lat, p.lng, coords.lat, coords.lng) * BKK_ROAD_FACTOR
                    : null;
                return (
                  <option key={p.id} value={p.id}>
                    {p.name}
                    {km != null ? ` · ${km.toFixed(1)} km` : ""}
                  </option>
                );
              })}
            </Box>
          </Box>

          {/* 🆕 28x.46 — route-source badge: "Live route" when the real Google
              driving route resolved, "Estimated" while we're on the haversine
              fallback. Same signal the booking page shows, for transparency. */}
          {estimate && (
            <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
              <Box
                sx={{
                  display: "inline-flex", alignItems: "center", gap: "5px",
                  px: "9px", py: "3px", borderRadius: "999px",
                  background: estimate.isLive ? "rgba(22,163,74,0.14)" : "var(--sr-panel-2)",
                  border: `1px solid ${estimate.isLive ? "rgba(22,163,74,0.45)" : "var(--sr-hairline)"}`,
                }}
              >
                <Box sx={{ width: 6, height: 6, borderRadius: "50%", background: estimate.isLive ? "#16A34A" : "var(--sr-muted)" }} />
                <Typography sx={{ fontFamily: SANS, fontSize: 10.5, fontWeight: 800, letterSpacing: "0.03em", color: estimate.isLive ? "#16A34A" : "var(--sr-muted)" }}>
                  {estimate.isLive ? t("nearme.taxi.liveRoute", "Live route") : t("nearme.taxi.estimated", "Estimated")}
                </Typography>
              </Box>
            </Box>
          )}

          {/* Result */}
          {estimate && (
            <Box
              sx={{
                display: "flex",
                alignItems: "stretch",
                borderRadius: "14px",
                overflow: "hidden",
                border: "1px solid var(--sr-hairline)",
              }}
            >
              <ResultCell
                label={t("nearme.taxi.distance", "Distance")}
                value={`${estimate.distanceKm.toFixed(1)} km`}
              />
              <ResultCell
                label={t("nearme.taxi.fare", "Travel budget")}
                value={estimate.fare != null ? formatTHB(Math.round(tweenedFare)) : "—"}
                strike={estimate.fare != null && estimate.save > 0 && estimate.original != null ? formatTHB(estimate.original) : undefined}
                accent
                divider
              />
              {estimate.etaMin != null && (
                <ResultCell
                  label={t("nearme.taxi.eta", "Arrival")}
                  value={`~${Math.round(estimate.etaMin)} min`}
                  divider
                />
              )}
            </Box>
          )}

          {/* 🆕 28x.47 — "you saved" chip (Grab-style), only when the online fare
              actually undercuts the band. */}
          {estimate?.fare != null && estimate.save > 0 && (
            <Box sx={{ display: "flex", justifyContent: "center" }}>
              <Box
                sx={{
                  display: "inline-flex", alignItems: "center", gap: "6px",
                  px: "12px", py: "5px", borderRadius: "999px",
                  background: "rgba(230,25,126,0.10)",
                  border: "1px solid rgba(230,25,126,0.30)",
                }}
              >
                <Box component="span" sx={{ width: 7, height: 7, borderRadius: "50%", background: "#E6197E" }} />
                <Typography sx={{ fontFamily: SANS, fontSize: 12, fontWeight: 800, color: "#C2185B" }}>
                  {t("nearme.taxi.saved", "You save ฿{{n}} booking online", { n: estimate.save })}
                </Typography>
              </Box>
            </Box>
          )}

          {/* 🆕 28x.111 — service picker (defaults to the bestseller). Lets the
              guest choose the menu here so the all-in price reflects THEIR pick
              instead of anchoring on the cheapest service. */}
          {selected && availableServices.length > 0 && (
            <Box sx={{ mt: 0.5 }}>
              <Typography
                sx={{
                  fontFamily: SANS, fontSize: 11, fontWeight: 700, letterSpacing: "0.06em",
                  textTransform: "uppercase", color: "var(--sr-body)", mb: 0.75,
                }}
              >
                {t("nearme.taxi.pickService", "Choose service")}
              </Typography>
              <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0.75 }}>
                {availableServices.map((s) => {
                  const active = s.id === chosenService?.id;
                  const isBest = s.id === BESTSELLER_ID;
                  return (
                    <Box
                      key={s.id}
                      component="button"
                      type="button"
                      onClick={() => setSelectedServiceId(s.id)}
                      sx={{
                        position: "relative", textAlign: "left", cursor: "pointer",
                        p: "8px 10px", borderRadius: "11px",
                        border: active ? `1.5px solid ${ROSE}` : "1px solid var(--sr-hairline)",
                        background: active ? "rgba(217,124,149,0.12)" : "var(--sr-panel-2)",
                        transition: "border-color .15s ease, background .15s ease",
                      }}
                    >
                      <Typography sx={{ fontFamily: SANS, fontSize: 12.5, fontWeight: 700, color: "var(--sr-ink)", lineHeight: 1.2 }}>
                        {isBest && "★ "}{SERVICE_SHORT[s.id] ?? s.name}
                      </Typography>
                      <Typography sx={{ fontFamily: SANS, fontSize: 11.5, color: active ? "#C2185B" : "var(--sr-body)", mt: 0.2 }}>
                        {formatTHB(s.price)}
                      </Typography>
                    </Box>
                  );
                })}
              </Box>
            </Box>
          )}

          {/* 🆕 28x.52 (idea #3) → 28x.111 — all-in price (chosen service) + book. */}
          {allIn != null && selected && chosenService && (
            <Box
              sx={{
                mt: 0.5, p: "12px 14px", borderRadius: "14px",
                background: "var(--sr-panel-2)", border: "1px solid var(--sr-hairline)",
                display: "flex", flexDirection: "column", gap: 1,
              }}
            >
              <Box sx={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 1 }}>
                <Typography sx={{ fontFamily: SANS, fontSize: 12, color: "var(--sr-body)" }}>
                  {t("nearme.taxi.allInLabelChosen", "{{svc}}, with {{name}}", {
                    svc: SERVICE_SHORT[chosenService.id] ?? chosenService.name,
                    name: selected.name,
                  })}
                </Typography>
                <Box sx={{ textAlign: "right" }}>
                  <Typography sx={{ fontFamily: SERIF, fontSize: 20, fontWeight: 800, color: "var(--sr-ink)", lineHeight: 1 }}>
                    {formatTHB(allIn)}
                  </Typography>
                  <Typography sx={{ fontFamily: SANS, fontSize: 10.5, color: "var(--sr-body)", mt: 0.3 }}>
                    {t("nearme.taxi.allInBreak2", "service {{svc}} + travel {{taxi}}", {
                      svc: formatTHB(servicePrice), taxi: formatTHB(allIn - servicePrice),
                    })}
                  </Typography>
                </Box>
              </Box>
              <Box
                component="button"
                type="button"
                onClick={bookNow}
                sx={{
                  width: "100%", py: "11px", borderRadius: "12px", border: "none", cursor: "pointer",
                  background: "linear-gradient(135deg, #D97C95 0%, #C96F89 100%)",
                  color: "#fff", fontFamily: SANS, fontSize: 14, fontWeight: 800,
                  boxShadow: "0 6px 16px rgba(138,58,87,0.28)",
                }}
              >
                {t("nearme.taxi.bookNow", "Book {{name}} now", { name: selected.name })}
              </Box>
            </Box>
          )}
        </Box>

        <Typography sx={{ gridColumn: { md: "1 / -1" }, fontFamily: SANS, fontSize: 12, color: "var(--sr-body)", lineHeight: 1.55 }}>
          {!estimate
            ? t("nearme.taxi.hint", "Pick a practitioner, then search, tap the map, or use your location for a taxi estimate.")
            : estimate.fare == null
            ? t("nearme.taxi.over", "Long trip. Contact the concierge to confirm (a deposit may apply).")
            : t("nearme.taxi.note", "Set travel budget by distance. Excludes weather and peak-traffic surcharges. Concierge confirms the final fare.")}
        </Typography>
      </Box>
    </Box>
  );
};

const ResultCell: React.FC<{ label: string; value: string; accent?: boolean; divider?: boolean; strike?: string }> = ({
  label,
  value,
  accent,
  divider,
  strike,
}) => (
  <Box
    sx={{
      flex: 1,
      textAlign: "center",
      py: 0.9,
      px: 0.5,
      background: "var(--sr-panel-2)",
      borderLeft: divider ? "1px solid var(--sr-hairline)" : "none",
    }}
  >
    <Typography sx={{ fontFamily: SANS, fontSize: 10.5, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--sr-body)" }}>
      {label}
    </Typography>
    {/* 🆕 28x.99z (founder "ราคาขีดฆ่า ออกทั้งเว็บทุกจุด") — the 28x.47
        Grab-style struck "before" fare is gone. `strike` prop kept so
        callers don't break, but it renders nothing now. */}
    <Typography
      sx={{
        fontFamily: SERIF,
        fontSize: 18,
        fontWeight: 700,
        lineHeight: 1.15,
        mt: 0.35,
        color: accent ? "#D97C95" : "var(--sr-ink)",
      }}
    >
      {value}
    </Typography>
  </Box>
);

const NearMePage: React.FC = () => {
  const { t, i18n } = useTranslation();

  useDocumentMeta({
    title: t(
      "meta.nearme.title",
      "Near Me · Bangkok Outcall Massage by Location | SunRed"
    ),
    description: t(
      "meta.nearme.description",
      "See which verified SunRed practitioners are near your Bangkok hotel. Browse outcall massage by location on the live map."
    ),
    locale: langToLocale(i18n.language),
    url: "https://sunred.vip/near-me",
    type: "website",
  });

  return (
    <Box
      sx={{
        ...responsiveShell,
        background: "var(--sr-bg)",
        minHeight: "100vh",
        padding: { xs: "10px 12px 28px", md: "16px 12px 36px" },
      }}
    >
      {/* Header */}
      <Box sx={{ px: 0.5, pt: 1, pb: 2 }}>
        <Typography
          sx={{
            fontFamily: SANS,
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: "var(--sr-gold-text)",
          }}
        >
          {t("nearme.eyebrow", "Near You")}
        </Typography>
        <Typography
          component="h1"
          sx={{
            fontFamily: SERIF,
            fontSize: { xs: 24, md: 28 },
            fontWeight: 700,
            color: "var(--sr-ink)",
            letterSpacing: "-0.02em",
            lineHeight: 1.15,
            mt: 0.5,
          }}
        >
          {t("nearme.title", "Practitioners near you")}
        </Typography>
        <Typography
          sx={{
            fontFamily: SANS,
            fontSize: 13.5,
            color: "var(--sr-body)",
            lineHeight: 1.6,
            mt: 0.75,
            maxWidth: 460,
          }}
        >
          {t(
            "nearme.subtitle",
            "A live look at verified SunRed practitioners across central Bangkok. Tap a pin for rates and availability."
          )}
        </Typography>
      </Box>

      {/* The live location map (reuses the home grid's data) */}
      <HomeTherapistGrid mapOnly />

      {/* Taxi-fare estimator (map variant) */}
      <TaxiEstimator />

      {/* Coverage areas */}
      <Box sx={{ mt: 3.5, px: 0.5 }}>
        <SectionHeader
          label={t("nearme.coverage.title", "Areas we cover")}
          icon={<MapPin size={15} weight="fill" color={ROSE} />}
        />
        {/* 28w.9 V2 prose · 28w.12 wrapped in a soft panel (decorate) */}
        <Box
          sx={{
            p: "14px 16px",
            borderRadius: "16px",
            background: "var(--sr-panel-2)",
            border: "1px solid var(--sr-hairline)",
          }}
        >
        {/* 🆕 28x.53 (founder: "ปรับฟอนต์ให้อ่านง่ายขึ้น") — was Playfair serif at a
            loose 1.9 line-height, which reads heavy for a plain list of areas.
            Now sans, medium-weight area names, and readable (not muted) separators. */}
        <Typography
          sx={{
            fontFamily: SANS,
            fontSize: { xs: 14.5, md: 15.5 },
            lineHeight: 1.75,
            color: "var(--sr-ink)",
            letterSpacing: "0.005em",
            overflowWrap: "break-word",
          }}
        >
          <Box component="span" sx={{ fontWeight: 800, color: "var(--sr-gold-text)" }}>
            Across central Bangkok
          </Box>
          <Box component="span" sx={{ color: "var(--sr-body)" }}>{": "}</Box>
          {AREAS.map((a, i) => (
            <React.Fragment key={a}>
              {i > 0 && (
                <Box component="span" sx={{ color: "var(--sr-body)" }}>
                  {i === AREAS.length - 1 ? " and " : ", "}
                </Box>
              )}
              <Box component="span" sx={{ fontWeight: 600 }}>{a}</Box>
            </React.Fragment>
          ))}
          <Box component="span" sx={{ color: "var(--sr-body)" }}>.</Box>
        </Typography>
        </Box>
        <Typography
          sx={{
            fontFamily: SANS,
            fontSize: 12.5,
            color: "var(--sr-body)",
            lineHeight: 1.55,
            mt: 1.25,
          }}
        >
          {t(
            "nearme.coverage.note",
            "Delivered to your door. Typical arrival 30–45 min to central Bangkok."
          )}
        </Typography>
      </Box>

      {/* 🆕 28x.54 (founder: "จัดเรียงให้ดีหน่อย") — the concierge nudge was a
          plain centred paragraph floating between coverage and the Reach-us
          grid. Wrapped it in a soft callout with a concierge icon so it reads
          as an intentional lead-in to the channels right below it. */}
      <Box
        sx={{
          mt: 3,
          mb: 1.25,
          display: "flex",
          alignItems: "center",
          gap: 1.25,
          p: "12px 14px",
          borderRadius: "14px",
          background: "var(--sr-panel-2)",
          border: "1px solid var(--sr-hairline)",
        }}
      >
        <Box
          aria-hidden
          sx={{
            width: 34,
            height: 34,
            flexShrink: 0,
            borderRadius: "50%",
            background: "rgba(217,124,149,0.14)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Headset size={18} weight="fill" color={ROSE} />
        </Box>
        <Typography
          sx={{
            fontFamily: SANS,
            fontSize: 13,
            fontWeight: 500,
            color: "var(--sr-ink)",
            lineHeight: 1.5,
          }}
        >
          {t(
            "nearme.cta.line",
            "Not sure who's nearest? Ask the concierge. We'll match the closest available practitioner."
          )}
        </Typography>
      </Box>

      {/* Reach us — concierge channel grid (founder: like the services page) */}
      <ReachUs t={t} />
    </Box>
  );
};

export default NearMePage;
