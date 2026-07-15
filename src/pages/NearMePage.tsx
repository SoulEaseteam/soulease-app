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
import HomeTherapistGrid from "@/components/home/HomeTherapistGrid";
import { responsiveShell } from "@/theme/breakpoints";
import { useDocumentMeta, langToLocale } from "@/utils/useDocumentMeta";
import { CONCIERGE } from "@/config/concierge";
import { MapPin } from "phosphor-react";
import { useGoogleMaps } from "@/context/GoogleMapsContext";
import therapists from "@/data/therapists";
import { travelFareDisplay, haversineKm, BKK_ROAD_FACTOR, DISPATCH_BASE } from "@/utils/taxiFare";
import { estimateEtaFromKm, fetchDrivingDistance, type RouteResult } from "@/utils/directionsApi";
import { useTweenedNumber } from "@/hooks/useTweenedNumber";
import { formatTHB } from "@/utils/servicePricing";

const SERIF = '"Playfair Display", "Fraunces", Georgia, serif';
const SANS = '"Inter", system-ui, sans-serif';
const ROSE = "#D97C95";

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
            ? t("nearme.taxi.denied", "Location blocked — allow it in your browser, or drop a pin on the map.")
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

  if (roster.length === 0) return null;

  return (
    // 🆕 28w.16 — narrow the price-check widget only (founder clarified
    //   "ลดความกว้าง" = just the estimator, not the whole near-me page).
    <Box sx={{ mt: 3.5, px: 0.5, maxWidth: 360, mx: "auto" }}>
      <SectionHeader label={t("nearme.taxi.title", "Estimate taxi to your place")} center />

      <Box
        sx={{
          p: "13px",
          borderRadius: "18px",
          background: "var(--sr-panel)",
          border: "1px solid var(--sr-hairline)",
          boxShadow: "var(--sr-card-shadow)",
          display: "flex",
          flexDirection: "column",
          gap: 0.75,
        }}
      >
        {/* Practitioner picker */}
        <Box>
          {/* 🆕 28w.68 (founder "เปลี่ยนเป็นข้อความว่าเลือกชื่อพนักงาน ภาษาอังกฤษ") */}
          <Typography sx={{ fontFamily: SANS, fontSize: 11.5, fontWeight: 700, color: "var(--sr-muted)", mb: 0.5 }}>
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
              <Typography sx={{ fontFamily: SANS, fontSize: 10.5, color: "var(--sr-muted)", mt: 0.15 }}>
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

        <Typography sx={{ fontFamily: SANS, fontSize: 11, color: "var(--sr-muted)", lineHeight: 1.5 }}>
          {!estimate
            ? t("nearme.taxi.hint", "Pick a practitioner, then search, tap the map, or use your location for a taxi estimate.")
            : estimate.fare == null
            ? t("nearme.taxi.over", "Long trip — the concierge quotes your travel fare.")
            : t("nearme.taxi.note", "Set travel budget by distance — excludes weather and peak-traffic surcharges. Concierge confirms the final fare.")}
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
    <Typography sx={{ fontFamily: SANS, fontSize: 9.5, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--sr-muted)" }}>
      {label}
    </Typography>
    {/* 🆕 28x.47 — struck "before" price above the discounted fare (Grab-style). */}
    {strike && (
      <Typography sx={{ fontFamily: SANS, fontSize: 11, fontWeight: 600, color: "var(--sr-muted)", textDecoration: "line-through", lineHeight: 1, mt: 0.3 }}>
        {strike}
      </Typography>
    )}
    <Typography
      sx={{
        fontFamily: SERIF,
        fontSize: 18,
        fontWeight: 700,
        lineHeight: 1.15,
        mt: strike ? 0.1 : 0.35,
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
      "Near Me — Bangkok Outcall Massage by Location | SunRed"
    ),
    description: t(
      "meta.nearme.description",
      "See which verified SunRed practitioners are near your Bangkok hotel — browse outcall massage by location on the live map."
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
            fontSize: 13,
            color: "var(--sr-muted)",
            lineHeight: 1.5,
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
        <Typography
          sx={{
            fontFamily: SERIF,
            fontSize: { xs: 15.5, md: 17 },
            lineHeight: 1.9,
            color: "var(--sr-ink)",
            letterSpacing: "0.01em",
            overflowWrap: "break-word",
          }}
        >
          <Box component="span" sx={{ fontStyle: "italic", color: "var(--sr-gold-text)" }}>
            Across central Bangkok
          </Box>
          <Box component="span" sx={{ color: "var(--sr-muted)" }}>{" — "}</Box>
          {AREAS.map((a, i) => (
            <React.Fragment key={a}>
              {i > 0 && (
                <Box component="span" sx={{ color: "var(--sr-muted)" }}>
                  {i === AREAS.length - 1 ? " and " : ", "}
                </Box>
              )}
              {a}
            </React.Fragment>
          ))}
          <Box component="span" sx={{ color: "var(--sr-muted)" }}>.</Box>
        </Typography>
        </Box>
        <Typography
          sx={{
            fontFamily: SANS,
            fontSize: 12,
            color: "var(--sr-muted)",
            mt: 1.25,
          }}
        >
          {t(
            "nearme.coverage.note",
            "Delivered to your door — typical arrival 30–45 min to central Bangkok."
          )}
        </Typography>
      </Box>

      {/* 🆕 28w.13 — concierge line is plain text now (founder: "ทำเป็นข้อความก็พอ
          เรามีคอนแทคแล้ว") since the Reach-us tiles below carry the actual contact. */}
      <Typography
        sx={{
          mt: 2.5,
          px: 0.5,
          textAlign: "center",
          fontFamily: SANS,
          fontSize: 13,
          color: "var(--sr-muted)",
          lineHeight: 1.55,
        }}
      >
        {t(
          "nearme.cta.line",
          "Not sure who's nearest? Ask the concierge — we'll match the closest available practitioner."
        )}
      </Typography>

      {/* Reach us — concierge channel grid (founder: like the services page) */}
      <ReachUs t={t} />
    </Box>
  );
};

export default NearMePage;
