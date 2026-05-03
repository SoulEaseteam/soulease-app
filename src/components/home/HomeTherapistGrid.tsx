

import React, { useEffect, useMemo, useState } from "react";
import { Box, Typography, CircularProgress } from "@mui/material";
import { collection, onSnapshot } from "firebase/firestore";

import { db } from "@/lib/firebase";
import type { Therapist as TherapistType, Avail } from "@/types/therapist";
import { calculateTherapistStatus } from "@/utils/calculateTherapistStatus";
import { getBadgeForTherapist } from "@/utils/getTherapistBadge";
import { haversineKm } from "@/utils/taxiFare";

import TherapistProfileCard from "@/components/TherapistProfileCard";
import TherapistSearchBar from "@/components/TherapistSearchBar";
import HomeMapBrowse from "@/components/home/HomeMapBrowse";
import { matchesQuery } from "@/utils/therapistSearch";
import { useUserLocation } from "@/hooks/useUserLocation";
import NearMeRoundedIcon from "@mui/icons-material/NearMeRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import { priceForDuration } from "@/utils/servicePricing";
import staticServices from "@/data/services";
import { brand, fonts, glass, gradients } from "@/theme";
import type { MassageService } from "@/data/services";

const SERIF = '"Fraunces", Georgia, "Times New Roman", serif';
const SANS = '"Inter", system-ui, -apple-system, sans-serif';

interface Therapist extends TherapistType {
  computedStatus?: Avail;
  computedNext?: string | null;
}

const HomeTherapistGrid: React.FC = () => {
  const [therapists, setTherapists] = useState<Therapist[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQ, setSearchQ] = useState("");

  // ── Single GPS watcher — feeds every card with a fresh userLocation.
  //    🆕 Round 28b14 — autoStart removed. Modern browsers silently block
  //    geolocation requests not tied to a user gesture (Chrome 122+ esp.
  //    on first-party-set sites). We render an explicit in-app banner
  //    below; tapping its CTA calls request() in a user gesture context
  //    so the native permission popup reliably fires.
  const {
    location: userLocation,
    request: requestLocation,
    status: locationStatus,
  } = useUserLocation({ autoStart: false });

  // ── Single `services` collection subscription — every card reads from
  //    the same Map. Falls back to static services when Firestore is empty
  //    (e.g., before admin has populated the collection).
  const [liveServices, setLiveServices] = useState<MassageService[] | null>(
    null
  );
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "services"),
      (snap) => {
        const arr: MassageService[] = [];
        snap.forEach((d) => {
          const data = d.data() as Partial<MassageService> & { id?: string };
          if (typeof data.price === "number") {
            arr.push({
              id: data.id ?? d.id,
              name: data.name ?? d.id,
              desc: data.desc ?? "",
              price: data.price,
              duration: data.duration ?? 60,
              availableDurations: data.availableDurations,
              count: data.count ?? 0,
              image: data.image ?? "",
              detail: data.detail ?? "",
              benefit: data.benefit ?? [],
              badge: data.badge ?? "RECOMMEND",
            });
          }
        });
        setLiveServices(arr.length > 0 ? arr : null);
      },
      () => setLiveServices(null)
    );
    return () => unsub();
  }, []);

  const servicesById = useMemo(() => {
    const m = new Map<string, MassageService>();
    const source = liveServices ?? staticServices;
    for (const s of source) m.set(s.id, s);
    return m;
  }, [liveServices]);

  // ── Therapists collection — live subscription with enrich (NO sort here)
  // 🆕 Round 26d — sort moved to a useMemo below so it can re-run when
  // userLocation changes (distance is part of the sort key).
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "therapists"), (snap) => {
      const raw: Therapist[] = [];
      snap.forEach((docSnap) => {
        const data = docSnap.data() as Therapist;
        raw.push({ ...data, id: data.id || docSnap.id });
      });

      const enriched = raw.map((t) => {
        const { status, nextAvailable } = calculateTherapistStatus(t);
        // Defensive: clamp engine output to known Avail union — admin
        // typo on statusOverride can leak a non-Avail string at runtime.
        /* eslint-disable @typescript-eslint/no-unnecessary-condition */
        const safeStatus: Avail =
          status === "available" || status === "bookable" || status === "resting"
            ? status
            : "resting";
        /* eslint-enable @typescript-eslint/no-unnecessary-condition */
        const badge = getBadgeForTherapist({
          totalBookings: t.totalBookings ?? 0,
          todayBookings: t.todayBookings ?? 0,
          badgeKey: t.badgeKey,
          badgeUpdatedAt: t.badgeUpdatedAt,
        });
        return {
          ...t,
          computedStatus: safeStatus,
          computedNext: nextAvailable ?? null,
          badgeKey: badge.key,
        };
      });

      setTherapists(enriched);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // ── Sort: status (available > bookable > resting), distance ASC, rating DESC.
  //    🆕 Round 26d (founder 2026-05-02): "พนักงานที่ใกล้ user และกำลัง
  //    available / bookable / resting ขึ้นก่อน". Status is the primary
  //    bucket; within each bucket, closer therapists rank higher; rating
  //    breaks ties when distance is unknown / equal.
  const sorted = useMemo(() => {
    const statusOrder: Record<Avail, number> = {
      available: 1,
      bookable: 2,
      resting: 3,
    };

    const distanceFor = (t: Therapist): number => {
      // Prefer live Haversine from userLocation. Fall back to denormalized
      // distanceKm. Unknown → +Infinity so it sinks to the bottom of its
      // status bucket (rating still breaks the tie).
      if (userLocation) {
        const target =
          t.currentLocation ??
          t.homeLocation ??
          (typeof t.lat === "number" && typeof t.lng === "number"
            ? { lat: t.lat, lng: t.lng }
            : null);
        if (target) {
          return haversineKm(
            userLocation.lat,
            userLocation.lng,
            target.lat,
            target.lng
          );
        }
      }
      return typeof t.distanceKm === "number"
        ? t.distanceKm
        : Number.POSITIVE_INFINITY;
    };

    return [...therapists].sort((a, b) => {
      const stA = statusOrder[a.computedStatus ?? "resting"];
      const stB = statusOrder[b.computedStatus ?? "resting"];
      if (stA !== stB) return stA - stB;

      const dA = distanceFor(a);
      const dB = distanceFor(b);
      if (dA !== dB) return dA - dB;

      // Tie-breaker — higher rating wins. NaN-safe via `||`.
      // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
      return (Number(b.rating) || 0) - (Number(a.rating) || 0);
    });
  }, [therapists, userLocation]);

  // ── Apply search filter (case-insensitive across name/lang/specialty)
  const visible = useMemo(
    () => sorted.filter((t) => matchesQuery(t, searchQ)),
    [sorted, searchQ]
  );

  const availableNow = visible.filter(
    (t) => t.computedStatus === "available"
  ).length;

  // ── Starting-price-per-therapist map for the map preview card.
  //    Same logic the card uses internally — lift it here so the map
  //    section can show ฿ without a second Firestore subscription.
  const priceById = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of visible) {
      const ids = ((t.servicesAvailable ?? t.services ?? []) as string[]) || [];
      let min: number | null = null;
      for (const id of ids) {
        const svc = servicesById.get(id);
        if (!svc) continue;
        const p = priceForDuration(svc, 60);
        if (min == null || p < min) min = p;
      }
      if (min != null) m.set(t.id, min);
    }
    return m;
  }, [visible, servicesById]);

  return (
    <Box
      component="section"
      id="therapist-grid"
      aria-label="available therapists"
      sx={{ margin: "20px 0 4px", scrollMarginTop: "12px" }}
    >
      {/* Header: serif title + live count.
          🆕 Round 28c — bumped horizontal padding 16 → 14 to match
          Hero margin and search bar inset (cohesive home rhythm). */}
      <Box sx={{ marginBottom: "10px", padding: "0 14px" }}>
        <Typography
          sx={{
            fontFamily: fonts.heading,
            fontSize: "22px",
            fontWeight: 600,
            color: "#3c1e14",
            letterSpacing: "-0.02em",
            lineHeight: 1.05,
          }}
        >
          Our{" "}
          <Box component="span" sx={{ color: "#FE0944" }}>
            Therapists
          </Box>
        </Typography>
        {!loading && therapists.length > 0 && (
          <Typography
            sx={{
              fontFamily: fonts.body,
              fontSize: "11px",
              color: "rgba(60, 30, 20, 0.6)",
              marginTop: "3px",
              display: "flex",
              alignItems: "center",
              gap: "5px",
            }}
          >
            {availableNow > 0 && (
              <>
                <Box
                  component="span"
                  sx={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: "#16a34a",
                    boxShadow: "0 0 0 3px rgba(22,163,74,0.18)",
                    animation: "homeGridBlink 1.4s ease-in-out infinite",
                    "@keyframes homeGridBlink": {
                      "0%, 100%": { opacity: 1 },
                      "50%": { opacity: 0.5 },
                    },
                  }}
                />
                <Box component="span" sx={{ color: "#16a34a", fontWeight: 700 }}>
                  {availableNow} online now
                </Box>
                <Box component="span" sx={{ opacity: 0.4 }}>
                  ·
                </Box>
              </>
            )}
            <Box component="span">{visible.length} verified</Box>
          </Typography>
        )}
      </Box>

      {/* Search bar — glass pill matching mockup */}
      {/* 🆕 Round 28b14 — Location pre-prompt banner. Shows ONLY when
          GPS hasn't been requested yet (idle) or was previously denied.
          Tapping triggers request() in user gesture context → reliable
          native permission popup. Banner hides as soon as `userLocation`
          resolves so the grid never has duplicate "enable" CTAs. */}
      {!userLocation &&
        locationStatus !== "ready" &&
        locationStatus !== "unsupported" && (
          <Box
            role="button"
            tabIndex={0}
            onClick={() => requestLocation()}
            onKeyDown={(e: React.KeyboardEvent) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                requestLocation();
              }
            }}
            sx={{
              margin: "0 14px 10px",
              padding: "12px 14px",
              borderRadius: "16px",
              background:
                "linear-gradient(135deg, rgba(22, 163, 74, 0.10), rgba(22, 163, 74, 0.04))",
              border: "1px solid rgba(22, 163, 74, 0.25)",
              boxShadow:
                "0 1px 2px rgba(15, 23, 42, 0.04), 0 4px 12px rgba(22, 163, 74, 0.08)",
              display: "flex",
              alignItems: "center",
              gap: "12px",
              cursor: "pointer",
              userSelect: "none",
              transition: "transform 0.15s ease, box-shadow 0.15s ease",
              "&:hover": {
                transform: "translateY(-1px)",
                boxShadow:
                  "0 1px 2px rgba(15, 23, 42, 0.04), 0 6px 18px rgba(22, 163, 74, 0.14)",
              },
              "&:focus-visible": {
                outline: "2px solid #16a34a",
                outlineOffset: 2,
              },
            }}
          >
            <Box
              sx={{
                width: 38,
                height: 38,
                flexShrink: 0,
                borderRadius: "50%",
                background: "#16a34a",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 10px rgba(22, 163, 74, 0.30)",
              }}
            >
              <NearMeRoundedIcon sx={{ fontSize: 20 }} />
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                sx={{
                  fontFamily: fonts.heading,
                  fontSize: "14px",
                  fontWeight: 600,
                  color: "#3c1e14",
                  lineHeight: 1.2,
                }}
              >
                {locationStatus === "denied"
                  ? "Location blocked"
                  : "Find therapists nearest you"}
              </Typography>
              <Typography
                sx={{
                  fontFamily: SANS,
                  fontSize: "11.5px",
                  color: "rgba(60, 30, 20, 0.7)",
                  marginTop: "2px",
                  lineHeight: 1.35,
                }}
              >
                {locationStatus === "denied"
                  ? "Re-enable in browser settings to see distance."
                  : "Tap to enable location · See live distance to each therapist"}
              </Typography>
            </Box>
            <ArrowForwardRoundedIcon
              sx={{ color: "#16a34a", fontSize: 22, flexShrink: 0 }}
            />
          </Box>
        )}

      <TherapistSearchBar value={searchQ} onChange={setSearchQ} m="0 14px 12px" />

      {/* Body */}
      {loading ? (
        <Box
          sx={{
            minHeight: 220,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <CircularProgress size={28} sx={{ color: "#FE0944" }} />
        </Box>
      ) : visible.length === 0 ? (
        <Box
          sx={{
            margin: "0 14px",
            textAlign: "center",
            padding: "40px 14px",
            borderRadius: "16px",
            background: "rgba(255,255,255,0.5)",
            border: "1px solid rgba(255,255,255,0.6)",
          }}
        >
          <Typography
            sx={{
              fontFamily: fonts.heading,
              fontSize: "15px",
              color: "#3c1e14",
              fontWeight: 600,
            }}
          >
            {searchQ ? "No matches" : "No therapists right now"}
          </Typography>
          <Typography
            sx={{
              fontFamily: SANS,
              fontSize: "12px",
              color: "rgba(60, 30, 20, 0.6)",
              marginTop: "4px",
            }}
          >
            {searchQ
              ? `Nothing matches "${searchQ}". Try a different keyword.`
              : "Check back in a moment."}
          </Typography>
        </Box>
      ) : (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: "10px",
            padding: "0 14px 16px",
          }}
        >
          {visible.map((t, i) => (
            <TherapistProfileCard
              key={t.id}
              therapist={t}
              priority={i < 2 /* eager-load top row for LCP */}
              userLocation={userLocation}
              services={servicesById}
              // Round 28aw — pass requestLocation so the "Allow location"
              // chip can trigger the browser permission prompt directly.
              onRequestLocation={requestLocation}
            />
          ))}
        </Box>
      )}

      {/* 🆕 Round 26d — "Or browse by location ↓" map preview.
          Shown only when there are therapists in the visible list and
          we're not in a no-match search state. Pass the live user
          position so pins can be projected at real lat/lng offsets. */}
      {!loading && visible.length > 0 && (
        <HomeMapBrowse
          therapists={visible}
          priceById={priceById}
          userLocation={userLocation}
        />
      )}
    </Box>
  );
};

export default HomeTherapistGrid;
