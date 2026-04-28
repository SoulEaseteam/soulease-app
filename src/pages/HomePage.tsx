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

const HomePage: React.FC = () => {
  const { t, i18n } = useTranslation();

  // 🌐 Per-page meta (language-aware) — Google sees different title per language version
  useDocumentMeta({
    title: t(
      "meta.home.title",
      "SUNRED Bangkok • #1 Luxury Outcall Massage • EN/中文/日本語/한국어"
    ),
    description: t(
      "meta.home.description",
      "Bangkok's #1 luxury outcall massage. Verified therapists delivered to your hotel — Sukhumvit, Silom, Asok, Thonglor & all major areas. English, 中文, 日本語, 한국어. 24/7 live availability."
    ),
    locale: langToLocale(i18n.language),
    url: "https://sunred.vip/",
    type: "website",
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [serviceFilter, setServiceFilter] = useState<ServiceFilter>("all");
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

  // search + service filter
  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();

    return therapists.filter((t) => {
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
  }, [therapists, searchTerm, serviceFilter]);

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