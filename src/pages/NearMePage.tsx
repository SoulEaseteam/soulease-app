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
import { estimateTaxiFare, travelBudgetForKm, haversineKm, BKK_ROAD_FACTOR } from "@/utils/taxiFare";
import { estimateEtaFromKm } from "@/utils/directionsApi";
import { formatTHB } from "@/utils/servicePricing";

const SERIF = '"Playfair Display", "Fraunces", Georgia, serif';
const SANS = '"Inter", system-ui, sans-serif';
const ROSE = "#D97C95";

const AREAS = [
  "Sukhumvit", "Silom", "Sathorn", "Asok", "Nana", "Thonglor",
  "Phrom Phong", "Ploenchit", "Chidlom", "Ari", "Riverside", "Ratchada",
];

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
    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.25 }}>
      <Box sx={{ width: 3, height: 14, borderRadius: 2, background: ROSE }} />
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
        {t("nearme.reach.title", "Reach us")}
      </Typography>
    </Box>
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
  const [selectedId, setSelectedId] = React.useState(roster[0]?.id ?? "");
  const [coords, setCoords] = React.useState<{ lat: number; lng: number } | null>(null);
  const [status, setStatus] = React.useState<"idle" | "locating" | "error">("idle");
  const [errMsg, setErrMsg] = React.useState("");

  const mapContainerRef = React.useRef<HTMLDivElement | null>(null);
  const searchInputRef = React.useRef<HTMLInputElement | null>(null);
  const mapRef = React.useRef<GMap | null>(null);
  const markerRef = React.useRef<GMarker | null>(null);

  const selected = roster.find((p) => p.id === selectedId) ?? roster[0];

  // Place / move the customer pin + record coords.
  const setPin = React.useCallback((lat: number, lng: number) => {
    setCoords({ lat, lng });
    const G = getMaps();
    const map = mapRef.current;
    if (!G || !map) return;
    if (!markerRef.current) {
      markerRef.current = new G.Marker({ position: { lat, lng }, map, draggable: true });
      markerRef.current.addListener("dragend", (e) => {
        const ll = e.latLng;
        if (ll) setCoords({ lat: ll.lat(), lng: ll.lng() });
      });
    } else {
      markerRef.current.setPosition({ lat, lng });
    }
  }, []);

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

  const estimate = React.useMemo(() => {
    if (!selected || !coords) return null;
    // estimateTaxiFare gives the real (road) distance; the FARE itself comes
    // from the founder's fixed travel-budget bands (excl. weather/traffic).
    const { distanceKm } = estimateTaxiFare({
      therapistLat: selected.lat,
      therapistLng: selected.lng,
      customerLat: coords.lat,
      customerLng: coords.lng,
      durationMin: 60,
    });
    if (!distanceKm) return null;
    const fare = travelBudgetForKm(distanceKm);
    return { distanceKm, fare, etaMin: estimateEtaFromKm(distanceKm) };
  }, [selected, coords]);

  if (roster.length === 0) return null;

  return (
    // 🆕 28w.16 — narrow the price-check widget only (founder clarified
    //   "ลดความกว้าง" = just the estimator, not the whole near-me page).
    <Box sx={{ mt: 3, px: 0.5, maxWidth: 360, mx: "auto" }}>
      <Typography
        sx={{
          fontFamily: SANS,
          fontSize: 11,
          fontWeight: 800,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "var(--sr-gold-text)",
          mb: 1.25,
        }}
      >
        {t("nearme.taxi.title", "Estimate taxi to your place")}
      </Typography>

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
          <Typography sx={{ fontFamily: SANS, fontSize: 11.5, fontWeight: 700, color: "var(--sr-muted)", mb: 0.5 }}>
            {t("nearme.taxi.practitioner", "Practitioner")}
          </Typography>
          <Box
            component="select"
            value={selectedId}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedId(e.target.value)}
            aria-label={t("nearme.taxi.practitioner", "Practitioner")}
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
              value={estimate.fare != null ? formatTHB(estimate.fare) : "—"}
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

        <Typography sx={{ fontFamily: SANS, fontSize: 11, color: "var(--sr-muted)", lineHeight: 1.5 }}>
          {!estimate
            ? t("nearme.taxi.hint", "Pick a practitioner, then search, tap the map, or use your location for a taxi estimate.")
            : estimate.fare == null
            ? t("nearme.taxi.over", "Beyond 30 km — the concierge quotes your travel fare.")
            : t("nearme.taxi.note", "Set travel budget by distance — excludes weather and peak-traffic surcharges. Concierge confirms the final fare.")}
        </Typography>
      </Box>
    </Box>
  );
};

const ResultCell: React.FC<{ label: string; value: string; accent?: boolean; divider?: boolean }> = ({
  label,
  value,
  accent,
  divider,
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
      <Box sx={{ mt: 3, px: 0.5 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 1.25 }}>
          <MapPin size={15} weight="fill" color={ROSE} />
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
            {t("nearme.coverage.title", "Areas we cover")}
          </Typography>
        </Box>
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
