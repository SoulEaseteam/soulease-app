// src/pages/NearMePage.tsx
//
// 🆕 Round 28s335 (founder 2026-07-08) — "ย้าย Or browse by location ไปหน้าใหม่".
//   The "OR BROWSE BY LOCATION" map used to live at the bottom of the home
//   therapist grid; it now has its own page, reached from the "Near Me"
//   quick-nav tile. Renders <HomeTherapistGrid mapOnly /> which reuses all
//   of the grid's live therapist / price / geolocation loading.
// 🆕 Round 28w.5 (founder 2026-07-13) — "ปรับแก้หน้า near-me". Was a bare
//   map floating in a hardcoded #F7F7F6 slab (broke in night mode) with no
//   header and a lot of empty space below. Now: day/night var(--sr-bg),
//   a proper themed header, plus a coverage-areas chip row + a concierge
//   CTA under the map so the page reads as finished.
// ─────────────────────────────────────────────────────────────────────

import React from "react";
import { Box, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
import HomeTherapistGrid from "@/components/home/HomeTherapistGrid";
import { responsiveShell } from "@/theme/breakpoints";
import { useDocumentMeta, langToLocale } from "@/utils/useDocumentMeta";
import { whatsappDeepLink } from "@/config/concierge";
import therapists from "@/data/therapists";
import { estimateTaxiFare } from "@/utils/taxiFare";
import { estimateEtaFromKm } from "@/utils/directionsApi";
import { formatTHB } from "@/utils/servicePricing";

const SERIF = '"Playfair Display", "Fraunces", Georgia, serif';
const SANS = '"Inter", system-ui, sans-serif';
const ROSE = "#D97C95";

// Central-Bangkok areas SunRed dispatches to (mirrors the ServicesPage
// "Service area" row). Informational — reassures a guest their hotel is
// in range before they even pick a practitioner.
const AREAS = [
  "Sukhumvit", "Silom", "Sathorn", "Asok", "Nana", "Thonglor",
  "Phrom Phong", "Ploenchit", "Chidlom", "Ari", "Riverside", "Ratchada",
];

// 🆕 28w.7 (founder 2026-07-13) — GPS taxi-fare estimator. Pick a
//   practitioner, tap "use my current location", and we measure the
//   distance (haversine × BKK road factor) and estimate the taxi fare via
//   the same estimateTaxiFare() the booking flow uses. No map/search
//   (founder chose the quick GPS-only variant); no Google API call.
const TaxiEstimator: React.FC = () => {
  const { t } = useTranslation();

  // Only practitioners that carry real coordinates can anchor a distance.
  const roster = React.useMemo(
    () => therapists.filter((p) => p.lat != null && p.lng != null),
    []
  );

  const [selectedId, setSelectedId] = React.useState(roster[0]?.id ?? "");
  const [coords, setCoords] = React.useState<{ lat: number; lng: number } | null>(null);
  const [status, setStatus] = React.useState<"idle" | "locating" | "error">("idle");
  const [errMsg, setErrMsg] = React.useState("");

  const selected = roster.find((p) => p.id === selectedId) ?? roster[0];

  const estimate = React.useMemo(() => {
    if (!selected || !coords) return null;
    const { distanceKm, fare } = estimateTaxiFare({
      therapistLat: selected.lat,
      therapistLng: selected.lng,
      customerLat: coords.lat,
      customerLng: coords.lng,
      durationMin: 60,
    });
    if (!distanceKm || !fare) return null;
    return { distanceKm, fare, etaMin: estimateEtaFromKm(distanceKm) };
  }, [selected, coords]);

  const locate = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setStatus("error");
      setErrMsg(t("nearme.taxi.noGeo", "Location isn't available on this device."));
      return;
    }
    setStatus("locating");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setStatus("idle");
      },
      (err) => {
        setStatus("error");
        setErrMsg(
          err.code === err.PERMISSION_DENIED
            ? t("nearme.taxi.denied", "Location blocked — allow it in your browser, or ask the concierge.")
            : t("nearme.taxi.failed", "Couldn't get your location. Try again.")
        );
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  if (roster.length === 0) return null;

  return (
    <Box sx={{ mt: 3, px: 0.5 }}>
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
        {t("nearme.taxi.title", "Estimate taxi to your hotel")}
      </Typography>

      <Box
        sx={{
          p: "16px",
          borderRadius: "18px",
          background: "var(--sr-panel)",
          border: "1px solid var(--sr-hairline)",
          boxShadow: "var(--sr-card-shadow)",
          display: "flex",
          flexDirection: "column",
          gap: 1.5,
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
            {roster.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
                {p.area ? ` · ${p.area}` : ""}
              </option>
            ))}
          </Box>
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
            padding: "12px 14px",
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
              label={t("nearme.taxi.fare", "Est. taxi")}
              value={formatTHB(estimate.fare)}
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
          {estimate
            ? t("nearme.taxi.note", "Round-trip estimate — the concierge confirms the final fare when you book.")
            : t("nearme.taxi.hint", "Pick a practitioner, then share your location for a distance + taxi estimate.")}
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
      py: 1.25,
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
          {t("nearme.title", "Practitioners near your hotel")}
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

      {/* GPS taxi-fare estimator */}
      <TaxiEstimator />

      {/* Coverage areas */}
      <Box sx={{ mt: 3, px: 0.5 }}>
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
          {t("nearme.coverage.title", "Areas we cover")}
        </Typography>
        {/* 🆕 28w.8 — founder "ทำเป็นข้อความสวยๆ": areas as elegant serif
            prose with rose middot separators instead of chip pills. */}
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
          {AREAS.map((a, i) => (
            <React.Fragment key={a}>
              {i > 0 && (
                // breaking spaces around the middot so the line wraps
                <Box component="span" aria-hidden sx={{ color: ROSE, fontWeight: 700 }}>
                  {" · "}
                </Box>
              )}
              {a}
            </React.Fragment>
          ))}
        </Typography>
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
            "Delivered to your hotel or residence — typical arrival 30–45 min to central Bangkok."
          )}
        </Typography>
      </Box>

      {/* Concierge CTA */}
      <Box
        component="a"
        href={whatsappDeepLink(
          "Hi SunRed concierge, which practitioner is nearest my hotel tonight?"
        )}
        target="_blank"
        rel="noopener noreferrer"
        sx={{
          mt: 3,
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          p: "16px 18px",
          borderRadius: "18px",
          background: "linear-gradient(135deg, rgba(217,124,149,0.16), rgba(217,124,149,0.06))",
          border: "1px solid rgba(217,124,149,0.30)",
          textDecoration: "none",
          transition: "transform 0.15s ease",
          "&:hover": { transform: "translateY(-1px)" },
        }}
      >
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontFamily: SERIF, fontSize: 15.5, fontWeight: 700, color: "var(--sr-ink)", lineHeight: 1.25 }}>
            {t("nearme.cta.title", "Not sure who's nearest?")}
          </Typography>
          <Typography sx={{ fontFamily: SANS, fontSize: 12.5, color: "var(--sr-body)", mt: 0.25 }}>
            {t("nearme.cta.subtitle", "Ask the concierge — we'll match the closest available practitioner.")}
          </Typography>
        </Box>
        <Box aria-hidden sx={{ flexShrink: 0, fontSize: 20, fontWeight: 800, color: ROSE }}>
          ›
        </Box>
      </Box>
    </Box>
  );
};

export default NearMePage;
