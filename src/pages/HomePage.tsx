// src/pages/HomePage.tsx
import React, { useEffect, useMemo, useState } from "react";
import { Box, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";

import FloatingNavBar from "@/components/layouts/FloatingNavBar";
import SearchBar from "@/components/common/SearchBar";
import TherapistProfileCard from "@/components/TherapistProfileCard";
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

  // search
  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return therapists;

    return therapists.filter((t) => {
      const nameMatch = t.name.toLowerCase().includes(q);
      const badgeMatch = (t.badge ?? "").toLowerCase().includes(q);
      return nameMatch || badgeMatch;
    });
  }, [therapists, searchTerm]);

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
        background: "linear-gradient(to bottom, #f7f8f9, #e8ecf1)",
      }}
    >
      <FloatingNavBar />

      <Box sx={{ maxWidth: 430, mx: "auto", px: 1.5 }}>
        <Typography
          variant="h4"
          textAlign="center"
          sx={{
            mt: 4,
            fontWeight: "bold",
            fontSize: 27,
            color: "#555",
            letterSpacing: 3,
          }}
        >
          {t("home.escorts", "ESCORTS")}
        </Typography>

        <SearchBar
          onSearch={setSearchTerm}
          placeholder={t("home.search", "Search name…")}
        />

        <Typography
          textAlign="center"
          sx={{
            mt: 3,
            mb: 2,
            color: "#898686ac",
            fontSize: 14,
            letterSpacing: 2,
          }}
        >
          {t("home.subtitle", "OUTCALL MASSAGE IN BANGKOK")}
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
          {sorted.length === 0 ? (
            <Typography
              variant="body2"
              sx={{ gridColumn: "1 / -1", textAlign: "center", color: "#777" }}
            >
              No therapists found.
            </Typography>
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

export default HomePage;