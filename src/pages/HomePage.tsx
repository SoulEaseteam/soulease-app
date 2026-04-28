// src/pages/HomePage.tsx
import React, { useEffect, useMemo, useState } from "react";
import { Box, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";

import FloatingNavBar from "@/components/layouts/FloatingNavBar";
import SearchBar from "@/components/common/SearchBar";
import TherapistProfileCard from "@/components/TherapistProfileCard";
import HeroSection from "@/components/home/HeroSection";
import TherapistCardSkeleton from "@/components/home/TherapistCardSkeleton";
import ServiceFilterChips, {
  type ServiceFilter,
} from "@/components/home/ServiceFilterChips";
import PaymentTrustBar from "@/components/home/PaymentTrustBar";
import SocialProofTicker from "@/components/home/SocialProofTicker";
import AreaChips, { type BangkokArea } from "@/components/home/AreaChips";
import therapistsData from "@/data/therapists";
import { useDocumentMeta, langToLocale } from "@/utils/useDocumentMeta";

// ==============================
// Helpers
// ==============================

// distance km
function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;

  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

// convert HH:mm → minutes
function toMinutes(hhmm: string): number {
  if (!hhmm) return 999999;
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

// Thai time now HH:mm
function nowHHMM(): string {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const thai = new Date(utc + 7 * 3600 * 1000);
  const hh = String(thai.getHours()).padStart(2, "0");
  const mm = String(thai.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

// check if current time is inside working hours
function isWorkingNow(start: string, end: string): boolean {
  if (!start || !end) return true;
  const now = toMinutes(nowHHMM());
  const s = toMinutes(start);
  const e = toMinutes(end);

  // cross-day shift
  if (e < s) {
    return now >= s || now <= e;
  }
  return now >= s && now <= e;
}

const STATUS_ORDER: Record<string, number> = {
  available: 1,
  bookable: 2,
  resting: 3,
};

const BADGE_ORDER: Record<string, number> = {
  VIP: 1,
  HOT: 2,
  NEW: 3,
  "": 4,
};

/** 🗺️ Approximate centroid of major Bangkok areas + match radius (km) */
const AREA_CENTERS: Record<
  string,
  { lat: number; lng: number; radiusKm: number }
> = {
  sukhumvit: { lat: 13.7398, lng: 100.5602, radiusKm: 4 },
  silom: { lat: 13.7286, lng: 100.534, radiusKm: 3 },
  thonglor: { lat: 13.7368, lng: 100.5772, radiusKm: 3 },
  asok: { lat: 13.7373, lng: 100.5611, radiusKm: 2.5 },
  siam: { lat: 13.7456, lng: 100.5346, radiusKm: 3 },
  pratunam: { lat: 13.7508, lng: 100.5417, radiusKm: 2.5 },
};

const HomePage: React.FC = () => {
  const { t, i18n } = useTranslation();

  const [searchTerm, setSearchTerm] = useState("");
  const [serviceFilter, setServiceFilter] = useState<ServiceFilter>("all");

  // 🗺️ Area filter — sync ?area= URL param both ways for SEO friendliness
  const [areaFilter, setAreaFilter] = useState<BangkokArea>(() => {
    if (typeof window === "undefined") return "all";
    const q = new URLSearchParams(window.location.search).get("area");
    const valid: BangkokArea[] = [
      "all",
      "sukhumvit",
      "silom",
      "thonglor",
      "asok",
      "siam",
      "pratunam",
    ];
    return valid.includes((q ?? "") as BangkokArea)
      ? ((q ?? "all") as BangkokArea)
      : "all";
  });

  // Reflect area selection back into URL (no full navigation)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (areaFilter === "all") {
      url.searchParams.delete("area");
    } else {
      url.searchParams.set("area", areaFilter);
    }
    window.history.replaceState({}, "", url.toString());
  }, [areaFilter]);

  // 🌐 Per-page meta (language + area aware) — each /?area=sukhumvit URL gets
  // a unique title/description, multiplying our indexed page count.
  const areaLabel: Record<BangkokArea, string> = {
    all: "Bangkok",
    sukhumvit: "Sukhumvit",
    silom: "Silom",
    thonglor: "Thonglor",
    asok: "Asok",
    siam: "Siam",
    pratunam: "Pratunam",
  };
  const areaLabelStr = areaLabel[areaFilter];

  useDocumentMeta({
    title:
      areaFilter === "all"
        ? t(
            "meta.home.title",
            "SUNRED Bangkok • #1 Luxury Outcall Massage • EN/中文/日本語/한국어"
          )
        : `Outcall Massage in ${areaLabelStr} • SUNRED Bangkok`,
    description:
      areaFilter === "all"
        ? t(
            "meta.home.description",
            "Bangkok's #1 luxury outcall massage. Verified therapists delivered to your hotel — Sukhumvit, Silom, Asok, Thonglor & all major areas. English, 中文, 日本語, 한국어. 24/7 live availability."
          )
        : `Verified outcall massage therapists serving ${areaLabelStr} hotels in Bangkok. Live availability, multi-language support (EN/中文/日本語/한국어), and instant booking on SUNRED.`,
    locale: langToLocale(i18n.language),
    url:
      areaFilter === "all"
        ? "https://sunred.vip/"
        : `https://sunred.vip/?area=${areaFilter}`,
    type: "website",
  });
  const [customerLocation, setCustomerLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [geoDenied, setGeoDenied] = useState(false);

  // ✨ Skeleton-on-mount: แสดง shimmer 350ms แรกเพื่อความ polished
  const [showSkeleton, setShowSkeleton] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setShowSkeleton(false), 350);
    return () => clearTimeout(t);
  }, []);

  // request location
  useEffect(() => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCustomerLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        setGeoDenied(false);
      },
      () => setGeoDenied(true),
      { enableHighAccuracy: true }
    );
  }, []);

  // (document.title handled by useDocumentMeta above)

  // extend data
  const therapists = useMemo(() => {
    return therapistsData.map((t, index) => {
      let distance: number | null = null;

      if (customerLocation && (t as any).lat && (t as any).lng) {
        distance = getDistanceKm(
          customerLocation.lat,
          customerLocation.lng,
          Number((t as any).lat),
          Number((t as any).lng)
        );
      }

      return {
        ...t,
        id: t.id ?? `therapist-${index}`,
        distance,
        badge: (t as any).badge as string | undefined,
        workingNow: isWorkingNow(t.startTime, t.endTime),
      };
    });
  }, [customerLocation]);

  // search + service filter + area filter
  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    const areaCenter =
      areaFilter !== "all" ? AREA_CENTERS[areaFilter] : null;

    return therapists.filter((t) => {
      // 🗺️ area filter — match by distance from area centroid
      if (areaCenter) {
        const tLat = Number((t as { lat?: number | string }).lat);
        const tLng = Number((t as { lng?: number | string }).lng);
        if (!tLat || !tLng) return false;
        const dist = getDistanceKm(
          areaCenter.lat,
          areaCenter.lng,
          tLat,
          tLng
        );
        if (dist > areaCenter.radiusKm) return false;
      }

      // service filter
      if (serviceFilter !== "all") {
        const services = (t.servicesAvailable ?? []).map((s) =>
          s.toLowerCase()
        );
        const hasService =
          serviceFilter === "thai-massage"
            ? services.some((s) => s.includes("thai"))
            : serviceFilter === "aromatherapy"
            ? services.some((s) => s.includes("aroma"))
            : serviceFilter === "couple"
            ? services.some((s) => s.includes("couple"))
            : serviceFilter === "gentleman"
            ? services.some((s) => s.includes("gentleman"))
            : true;
        if (!hasService) return false;
      }

      // text search
      if (!q) return true;
      const nameMatch = t.name.toLowerCase().includes(q);
      const badgeMatch = (t.badge ?? "").toLowerCase().includes(q);
      return nameMatch || badgeMatch;
    });
  }, [therapists, searchTerm, serviceFilter, areaFilter]);

  // ⭐⭐ SORTING ตามกติกาใหม่ ⭐⭐
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      // 1) คนที่ "กำลังเข้างาน" ขึ้นก่อน
      if (a.workingNow !== b.workingNow) {
        return a.workingNow ? -1 : 1;
      }

      // 2) ระยะทาง
      if (a.distance != null && b.distance != null) {
        if (a.distance !== b.distance) return a.distance - b.distance;
      }

      // 3) เวลาเริ่มงาน (startTime)
      const sa = toMinutes(a.startTime);
      const sb = toMinutes(b.startTime);
      if (sa !== sb) return sa - sb;

      // 4) status
      const stA = STATUS_ORDER[a.available ?? "resting"] ?? 99;
      const stB = STATUS_ORDER[b.available ?? "resting"] ?? 99;
      if (stA !== stB) return stA - stB;

      // 5) badge
      const ba = BADGE_ORDER[a.badge || ""] ?? 4;
      const bb = BADGE_ORDER[b.badge || ""] ?? 4;
      if (ba !== bb) return ba - bb;

      // 6) rating
      if (a.rating !== b.rating) return b.rating - a.rating;

      // 7) name A-Z
      return a.name.localeCompare(b.name);
    });
  }, [filtered]);

  // ----------------------- UI -----------------------
  return (
    <Box
      sx={{
        minHeight: "100vh",
        pb: 12,
        // 🌅 Aurora-aware soft background — pastel-ish, blends with HeroSection
        background:
          "linear-gradient(to bottom, #FFF8F4 0%, #FAF6FF 50%, #F4FAF7 100%)",
      }}
    >
      <FloatingNavBar />

      <Box sx={{ maxWidth: 430, mx: "auto", px: 1.5 }}>
        {/* 🌟 Aurora Modern Hero (above the fold) */}
        <HeroSection />

        {/* 💳 Payment trust signals — builds confidence with foreign tourists */}
        <PaymentTrustBar />

        {/* 🌟 Live social proof ticker (recent bookings) */}
        <SocialProofTicker />

        {/* 🗺️ Bangkok area quick-filter (also feeds SEO via ?area= URL) */}
        <AreaChips active={areaFilter} onChange={setAreaFilter} />

        <SearchBar
          onSearch={setSearchTerm}
          placeholder={t("home.search", "Search name…")}
        />

        {/* 🎯 Service quick-filter chips (Phase 2.5) */}
        <ServiceFilterChips
          active={serviceFilter}
          onChange={setServiceFilter}
        />

        <Typography
          textAlign="center"
          sx={{
            mt: 2,
            mb: 1.5,
            color: "rgba(120, 105, 130, 0.75)",
            fontSize: 13,
            letterSpacing: 2.5,
            fontWeight: 500,
            textTransform: "uppercase",
          }}
        >
          {t("home.subtitle", "Outcall Massage in Bangkok")}
        </Typography>

        {geoDenied && (
          <Typography
            variant="body2"
            textAlign="center"
            sx={{ mb: 2, color: "#999", fontSize: 12 }}
          >
            Location access denied – sorted without distance priority.
          </Typography>
        )}

        {/* Grid */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: 2,
            justifyItems: "center",
            mt: 2,
          }}
        >
          {showSkeleton ? (
            // ✨ Aurora skeleton on first paint (~350ms) — feels polished
            Array.from({ length: 6 }).map((_, i) => (
              <Box key={`sk-${i}`} sx={{ width: "100%", maxWidth: 200 }}>
                <TherapistCardSkeleton />
              </Box>
            ))
          ) : sorted.length === 0 ? (
            <Typography
              variant="body2"
              sx={{
                gridColumn: "1 / -1",
                textAlign: "center",
                color: "rgba(120, 105, 130, 0.65)",
                py: 4,
              }}
            >
              {t("home.noResults", "No therapists match your filters.")}
            </Typography>
          ) : (
            sorted.map((t, idx) => (
              <Box key={t.id} sx={{ width: "100%", maxWidth: 200 }}>
                {/* การ์ด 2 ใบแรก = priority (eager + fetchpriority=high) → ดี LCP */}
                <TherapistProfileCard therapist={t} priority={idx < 2} />
              </Box>
            ))
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default HomePage;