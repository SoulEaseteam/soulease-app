// src/pages/HomePage.tsx
import React, { useEffect, useMemo, useState } from "react";
import { Box, Typography, Stack, Chip } from "@mui/material";
import { useTranslation } from "react-i18next";
import { Star, Clock, ShieldCheck, Sparkles } from "lucide-react";

import FloatingNavBar from "@/components/layouts/FloatingNavBar";
import SearchBar from "@/components/common/SearchBar";
import TherapistProfileCard from "@/components/TherapistProfileCard";
import LanguageSwitcher from "@/components/common/LanguageSwitcher";
import therapistsData from "@/data/therapists";

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
  const { t } = useTranslation();

  const [searchTerm, setSearchTerm] = useState("");
  // Filter pill state — "all" | "available" | "top"
  const [filterMode, setFilterMode] = useState<"all" | "available" | "top">("all");
  const [customerLocation, setCustomerLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [geoDenied, setGeoDenied] = useState(false);

  // request location
  useEffect(() => {
    if (!navigator?.geolocation) return;

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

  useEffect(() => {
    document.title = "SunRed • Outcall Massage in Bangkok";
  }, []);

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

  // นับสถิติ — โชว์ใน trust signal row
  const stats = useMemo(() => {
    const total = therapists.length;
    const availableNow = therapists.filter((t) => t.workingNow).length;
    const avgRating =
      total === 0
        ? 0
        : therapists.reduce((acc, t) => acc + (t.rating ?? 0), 0) / total;
    return { total, availableNow, avgRating };
  }, [therapists]);

  // search + filter pill
  const filtered = useMemo(() => {
    let list = therapists;

    // pill filter ก่อน
    if (filterMode === "available") {
      list = list.filter((t) => t.workingNow);
    } else if (filterMode === "top") {
      list = list.filter((t) => (t.rating ?? 0) >= 4.5);
    }

    const q = searchTerm.trim().toLowerCase();
    if (!q) return list;

    return list.filter((t) => {
      const nameMatch = t.name.toLowerCase().includes(q);
      const badgeMatch = (t.badge ?? "").toLowerCase().includes(q);
      return nameMatch || badgeMatch;
    });
  }, [therapists, searchTerm, filterMode]);

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
    <Box sx={{ minHeight: "100vh", pb: 12, background: "#FAFAFA" }}>
      <FloatingNavBar />

      {/* ============== HERO ============== */}
      <Box
        sx={{
          position: "relative",
          background: "linear-gradient(180deg, #FE0944 0%, #FEAE96 100%)",
          color: "#fff",
          pt: 6,
          pb: 4,
          overflow: "hidden",
          // soft glow ที่มุมบน
          "&::before": {
            content: '""',
            position: "absolute",
            top: -80,
            right: -80,
            width: 220,
            height: 220,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.15)",
            filter: "blur(40px)",
          },
        }}
      >
        <Box sx={{ maxWidth: 430, mx: "auto", px: 2.5, position: "relative" }}>
          {/* Top row: Language switcher (มุมขวาบนของ hero) */}
          <Box
            sx={{
              display: "flex",
              justifyContent: "flex-end",
              mb: 1,
            }}
          >
            <LanguageSwitcher variant="expanded" color="light" />
          </Box>

          {/* Brand title */}
          <Typography
            sx={{
              fontFamily: "'Cormorant Garamond', 'Playfair Display', serif",
              fontWeight: 600,
              fontSize: 44,
              letterSpacing: 2,
              textAlign: "center",
              lineHeight: 1.05,
              textShadow: "0 2px 8px rgba(0,0,0,0.15)",
            }}
          >
            {t("brand", "SUNRED")}
          </Typography>

          <Typography
            sx={{
              textAlign: "center",
              fontSize: 12,
              letterSpacing: 4,
              opacity: 0.92,
              mt: 0.5,
              fontWeight: 500,
              textTransform: "uppercase",
            }}
          >
            {t("tagline", "OUTCALL MASSAGE • BANGKOK")}
          </Typography>

          {/* Tagline / value prop */}
          <Typography
            sx={{
              textAlign: "center",
              fontSize: 14,
              opacity: 0.95,
              mt: 2.5,
              maxWidth: 340,
              mx: "auto",
              lineHeight: 1.5,
            }}
          >
            {t("heroSubtitle", "Verified therapists at your door in 30–60 min")}
          </Typography>

          {/* Trust signals — 4 metrics */}
          <Stack
            direction="row"
            spacing={0}
            justifyContent="space-around"
            sx={{
              mt: 3,
              mx: -0.5,
              p: 1.2,
              borderRadius: 3,
              background: "rgba(255,255,255,0.18)",
              backdropFilter: "blur(10px)",
              border: "1px solid rgba(255,255,255,0.25)",
            }}
          >
            <TrustItem
              icon={<Star size={16} fill="#FBBF24" color="#FBBF24" strokeWidth={1.5} />}
              value={stats.avgRating > 0 ? stats.avgRating.toFixed(1) : "4.8"}
              label={t("rating", "Rating")}
            />
            <TrustItem
              icon={<Sparkles size={16} color="#fff" />}
              value={String(stats.availableNow)}
              label={t("liveNow", "Live now")}
            />
            <TrustItem
              icon={<ShieldCheck size={16} color="#fff" />}
              value="100%"
              label={t("verified", "Verified")}
            />
            <TrustItem
              icon={<Clock size={16} color="#fff" />}
              value="24/7"
              label={t("open24", "Open")}
            />
          </Stack>

          {/* Search bar */}
          <Box sx={{ mt: 2.5 }}>
            <SearchBar
              onSearch={setSearchTerm}
              placeholder={t("home.search", "Search name or speciality…")}
            />
          </Box>
        </Box>
      </Box>

      {/* ============== FILTERS ============== */}
      <Box sx={{ maxWidth: 430, mx: "auto", px: 1.5, mt: -2 }}>
        <Stack
          direction="row"
          spacing={1}
          justifyContent="center"
          sx={{
            py: 1.5,
            position: "sticky",
            top: 0,
            zIndex: 5,
            background: "rgba(250,250,250,0.85)",
            backdropFilter: "blur(8px)",
          }}
        >
          <FilterPill
            active={filterMode === "all"}
            onClick={() => setFilterMode("all")}
            label={t("all", "All")}
            count={stats.total}
          />
          <FilterPill
            active={filterMode === "available"}
            onClick={() => setFilterMode("available")}
            label={`🟢 ${t("filterAvailable", "Available Now")}`}
            count={stats.availableNow}
          />
          <FilterPill
            active={filterMode === "top"}
            onClick={() => setFilterMode("top")}
            label={`⭐ ${t("filterTop", "Top-rated")}`}
          />
        </Stack>

        {geoDenied && (
          <Typography
            variant="body2"
            textAlign="center"
            sx={{ mb: 2, color: "#999", fontSize: 12 }}
          >
            Location access denied — distances unavailable.
          </Typography>
        )}

        {/* ============== Grid ============== */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: 2,
            justifyItems: "center",
            mt: 2,
          }}
        >
          {sorted.length === 0 ? (
            <Box
              sx={{
                gridColumn: "1 / -1",
                textAlign: "center",
                py: 6,
                color: "#777",
              }}
            >
              <Typography variant="h6" sx={{ mb: 1 }}>
                {t("noTherapists", "No therapists found")}
              </Typography>
              <Typography variant="body2">
                {t("tryDifferent", "Try a different filter or clear your search")}
              </Typography>
            </Box>
          ) : (
            sorted.map((t) => (
              <Box key={t.id} sx={{ width: "100%", maxWidth: 200 }}>
                <TherapistProfileCard therapist={t} />
              </Box>
            ))
          )}
        </Box>
      </Box>
    </Box>
  );
};

// ============================================
// Sub-components — local to HomePage
// ============================================

interface TrustItemProps {
  icon: React.ReactNode;
  value: string;
  label: string;
}
const TrustItem: React.FC<TrustItemProps> = ({ icon, value, label }) => (
  <Stack alignItems="center" spacing={0.3} sx={{ flex: 1 }}>
    {icon}
    <Typography sx={{ fontSize: 14, fontWeight: 700, lineHeight: 1 }}>
      {value}
    </Typography>
    <Typography sx={{ fontSize: 10, opacity: 0.85, letterSpacing: 0.5 }}>
      {label}
    </Typography>
  </Stack>
);

interface FilterPillProps {
  active: boolean;
  onClick: () => void;
  label: string;
  count?: number;
}
const FilterPill: React.FC<FilterPillProps> = ({ active, onClick, label, count }) => (
  <Chip
    onClick={onClick}
    label={count !== undefined ? `${label} · ${count}` : label}
    sx={{
      cursor: "pointer",
      fontWeight: 600,
      fontSize: 12,
      px: 0.5,
      transition: "all 0.18s ease",
      bgcolor: active ? "#FE0944" : "#fff",
      color: active ? "#fff" : "#333",
      border: active ? "none" : "1px solid #E5E7EB",
      boxShadow: active
        ? "0 4px 12px rgba(254,9,68,0.3)"
        : "0 1px 3px rgba(0,0,0,0.05)",
      "&:hover": {
        bgcolor: active ? "#E11D48" : "#F9FAFB",
      },
    }}
  />
);

export default HomePage;