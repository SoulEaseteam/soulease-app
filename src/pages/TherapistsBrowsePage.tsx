// src/pages/TherapistsBrowsePage.tsx
//
// 🎨 Phase 2 — Browse page (route `/therapists`).
// Composes BrowseHeader → TherapistGrid (or Map) → BottomNav inside the
// 430px `.phone` column with warm-cream gradient bg per BRAND.md.

import React, { useMemo, useState } from "react";
import { Box } from "@mui/material";
import { useTranslation } from "react-i18next";

import BrowseHeader from "@/components/therapist/BrowseHeader";
import TherapistGrid from "@/components/therapist/TherapistGrid";
import TherapistMap from "@/components/therapist/TherapistMap";
import BottomNav from "@/components/layouts/BottomNav";
import type { TherapistCardData } from "@/components/therapist/TherapistCard";
import { useDocumentMeta, langToLocale } from "@/utils/useDocumentMeta";
import useTherapists from "@/utils/useTherapists";

// Static demo data — used ONLY when `useTherapists()` returns an empty
// list (e.g., before Firestore subscription resolves on first paint).
// Live data flows through `useTherapists()` below.
const DEMO: TherapistCardData[] = [
  {
    id: "mai", name: "Mai", age: 28,
    langs: ["EN", "中"], rating: "4.9", reviewCount: 203, distanceKm: "1.2 km",
    specs: ["THAI", "OIL", "8 YR"], price: "฿1,800", unit: "/60min",
    online: true, availability: "●Now", availabilityColor: "#16a34a",
    photoBg: "linear-gradient(135deg, #d4a574, #8b6f47)",
  },
  {
    id: "ploy", name: "Ploy", age: 26,
    langs: ["EN", "日"], rating: "5.0", reviewCount: 167, distanceKm: "2.4 km",
    specs: ["AROMA", "PRENATAL"], price: "฿2,500", unit: "/90min",
    online: true, availability: "●Now", availabilityColor: "#16a34a",
    photoBg: "linear-gradient(135deg, #e8c4a0, #c89968)",
  },
  {
    id: "nan", name: "Nan", age: 31,
    langs: ["EN", "한"], rating: "4.8", reviewCount: 412, distanceKm: "3.1 km",
    specs: ["SPORT", "DEEP", "10 YR"], price: "฿2,200", unit: "/60min",
    online: false, availability: "19:30", availabilityColor: "#b85c3c",
    photoBg: "linear-gradient(135deg, #c89c7a, #6b4a2f)",
  },
  {
    id: "fern", name: "Fern", age: 24,
    langs: ["EN", "中"], rating: "4.9", reviewCount: 89, distanceKm: "2.8 km",
    specs: ["THAI", "AROMA"], price: "฿1,800", unit: "/60min",
    online: true, availability: "●Now", availabilityColor: "#16a34a",
    photoBg: "linear-gradient(135deg, #f4d4b4, #d4a574)",
  },
  {
    id: "wan", name: "Wan", age: 29,
    langs: ["EN", "日", "中"], rating: "4.9", reviewCount: 276, distanceKm: "3.8 km",
    specs: ["OIL", "AROMA", "7 YR"], price: "฿2,200", unit: "/60min",
    online: false, availability: "21:00", availabilityColor: "#b85c3c",
    photoBg: "linear-gradient(135deg, #d8b89c, #a08060)",
  },
  {
    id: "aom", name: "Aom", age: 27,
    langs: ["EN", "中"], rating: "5.0", reviewCount: 134, distanceKm: "1.8 km",
    specs: ["THAI", "SPORT"], price: "฿2,000", unit: "/60min",
    online: true, availability: "●Now", availabilityColor: "#16a34a",
    photoBg: "linear-gradient(135deg, #e8d0b4, #b89878)",
  },
];

type View = "grid" | "map" | "sort";

const TherapistsBrowsePage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [search, setSearch] = useState("");
  const [view, setView] = useState<View>("grid");
  const [filters, setFilters] = useState<Set<string>>(new Set(["near"]));

  // 🔌 Restored live therapist data (static seed + Firestore overrides +
  //    distance + privacy filter). Falls back to DEMO on first paint.
  const live = useTherapists();
  const source: TherapistCardData[] = live.length > 0 ? live : DEMO;

  useDocumentMeta({
    title: t("meta.browse.title", "Therapists · SUNRED Bangkok"),
    description: t(
      "meta.browse.description",
      "Browse 32+ verified massage therapists across Bangkok. Live availability, multilingual care."
    ),
    locale: langToLocale(i18n.language),
    url: "https://sunred.vip/therapists",
    type: "website",
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return source;
    return source.filter((th) => {
      if (th.name.toLowerCase().includes(q)) return true;
      if (th.specs.some((s) => s.toLowerCase().includes(q))) return true;
      if (th.langs.some((l) => l.toLowerCase().includes(q))) return true;
      return false;
    });
  }, [search, source]);

  const toggleFilter = (filter: string) => {
    setFilters((prev) => {
      const next = new Set(prev);
      if (next.has(filter)) next.delete(filter);
      else next.add(filter);
      return next;
    });
  };

  return (
    <Box
      sx={{
        // .phone — verbatim
        maxWidth: "430px",
        margin: "0 auto",
        background: "linear-gradient(180deg, #FFF8F0 0%, #FCEBDC 100%)",
        borderRadius: "28px",
        overflow: "hidden",
        boxShadow: "0 20px 60px rgba(126, 30, 46, 0.15)",
        position: "relative",
        minHeight: "100vh",
      }}
    >
      <BrowseHeader
        search={search}
        onSearch={setSearch}
        view={view}
        onView={setView}
        count={filtered.length}
        activeFilters={filters}
        onToggleFilter={toggleFilter}
      />

      {view === "grid" && <TherapistGrid therapists={filtered} />}
      {view === "map" && <TherapistMap />}
      {view === "sort" && <TherapistGrid therapists={filtered} />}

      {/* Map peek under the grid (per mockup — both views are visible) */}
      {view === "grid" && <TherapistMap />}

      <BottomNav />
    </Box>
  );
};

export default TherapistsBrowsePage;
