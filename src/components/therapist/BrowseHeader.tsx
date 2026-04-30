// src/components/therapist/BrowseHeader.tsx
//
// 🎨 Phase 2 — Browse top stack (verbatim port of `.browse-nav` + `.search-bar`
// + `.filter-row` + `.view-toggle` + `.sort-row` from sunred-therapists2.html).

import React from "react";
import { Box, IconButton } from "@mui/material";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import TuneRoundedIcon from "@mui/icons-material/TuneRounded";

const SERIF = '"Fraunces", Georgia, "Times New Roman", serif';
const SANS = '"Inter", system-ui, -apple-system, sans-serif';

type View = "grid" | "map" | "sort";

interface Props {
  search: string;
  onSearch: (s: string) => void;
  view: View;
  onView: (v: View) => void;
  count: number;
  activeFilters: Set<string>;
  onToggleFilter: (filter: string) => void;
}

const FILTERS: Array<{ id: string; icon: string; labelKey: string; fallback: string; hasArrow?: boolean }> = [
  { id: "near", icon: "📍", labelKey: "browse.filter.near", fallback: "Near me" },
  { id: "available", icon: "⏱", labelKey: "browse.filter.available", fallback: "Available now" },
  { id: "language", icon: "🌐", labelKey: "browse.filter.language", fallback: "Language", hasArrow: true },
  { id: "specialty", icon: "💆", labelKey: "browse.filter.specialty", fallback: "Specialty", hasArrow: true },
  { id: "price", icon: "฿", labelKey: "browse.filter.price", fallback: "Price", hasArrow: true },
  { id: "rating", icon: "⭐", labelKey: "browse.filter.rating", fallback: "Rating", hasArrow: true },
];

const BrowseHeader: React.FC<Props> = ({
  search,
  onSearch,
  view,
  onView,
  count,
  activeFilters,
  onToggleFilter,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <Box>
      {/* .browse-nav — verbatim */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "8px 18px 14px",
          gap: "8px",
        }}
      >
        {/* .icon-btn — back */}
        <IconButton
          aria-label="back"
          onClick={() => navigate(-1)}
          sx={{
            width: "40px",
            height: "40px",
            borderRadius: "50%",
            background: "rgba(255, 255, 255, 0.55)",
            backdropFilter: "blur(20px) saturate(180%)",
            WebkitBackdropFilter: "blur(20px) saturate(180%)",
            border: "1px solid rgba(255, 255, 255, 0.7)",
            boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.6)",
            color: "#2a1a14",
            fontSize: "16px",
            flexShrink: 0,
          }}
        >
          <ArrowBackRoundedIcon sx={{ fontSize: 20 }} />
        </IconButton>

        {/* .browse-title-stack */}
        <Box sx={{ flex: 1, textAlign: "center" }}>
          <Box
            sx={{
              fontFamily: SERIF,
              fontWeight: 500,
              fontSize: "17px",
              color: "#2a1a14",
              letterSpacing: "-0.01em",
              lineHeight: 1.1,
            }}
          >
            {t("browse.title", "Therapists")}
          </Box>
          <Box
            sx={{
              fontFamily: SANS,
              fontSize: "10px",
              color: "rgba(60, 30, 20, 0.72)",
              marginTop: "2px",
              fontWeight: 600,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
            }}
          >
            {t("browse.subtitle", "{{count}} online · Bangkok", { count })}
          </Box>
        </Box>

        {/* .icon-btn — settings */}
        <IconButton
          aria-label="settings"
          sx={{
            width: "40px",
            height: "40px",
            borderRadius: "50%",
            background: "rgba(255, 255, 255, 0.55)",
            backdropFilter: "blur(20px) saturate(180%)",
            WebkitBackdropFilter: "blur(20px) saturate(180%)",
            border: "1px solid rgba(255, 255, 255, 0.7)",
            boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.6)",
            color: "#2a1a14",
            fontSize: "16px",
            flexShrink: 0,
          }}
        >
          <TuneRoundedIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </Box>

      {/* .search-bar — verbatim */}
      <Box
        sx={{
          margin: "0 14px 12px",
          padding: "12px 16px",
          borderRadius: "99px",
          background: "rgba(255, 255, 255, 0.65)",
          backdropFilter: "blur(20px) saturate(180%)",
          WebkitBackdropFilter: "blur(20px) saturate(180%)",
          border: "1px solid rgba(255, 255, 255, 0.7)",
          boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.6)",
          display: "flex",
          alignItems: "center",
          gap: "10px",
        }}
      >
        <Box component="span" sx={{ color: "#b85c3c", fontSize: "14px" }}>
          🔍
        </Box>
        <Box
          component="input"
          value={search}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            onSearch(e.target.value)
          }
          placeholder={t(
            "browse.search.placeholder",
            "Search by name, language, specialty..."
          )}
          sx={{
            flex: 1,
            background: "transparent",
            border: "none",
            outline: "none",
            fontFamily: SANS,
            fontSize: "13px",
            color: "#2a1a14",
            "&::placeholder": { color: "rgba(60, 30, 20, 0.72)" },
          }}
        />
      </Box>

      {/* .filter-row — verbatim */}
      <Box
        sx={{
          display: "flex",
          gap: "8px",
          overflowX: "auto",
          padding: "0 14px 12px",
          scrollbarWidth: "none",
          "&::-webkit-scrollbar": { display: "none" },
        }}
      >
        {FILTERS.map((f) => {
          const active = activeFilters.has(f.id);
          return (
            <Box
              key={f.id}
              role="button"
              tabIndex={0}
              onClick={() => onToggleFilter(f.id)}
              sx={{
                flexShrink: 0,
                padding: "7px 13px",
                borderRadius: "99px",
                background: active
                  ? "linear-gradient(135deg, #FE0944, #FE7A52)"
                  : "rgba(255, 255, 255, 0.55)",
                backdropFilter: "blur(15px)",
                WebkitBackdropFilter: "blur(15px)",
                border: active
                  ? "1px solid rgba(255, 255, 255, 0.4)"
                  : "1px solid rgba(255, 255, 255, 0.7)",
                fontSize: "11.5px",
                fontWeight: 600,
                color: active ? "#fff" : "#2a1a14",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                whiteSpace: "nowrap",
                fontFamily: SANS,
                ...(active && {
                  boxShadow: "0 4px 12px rgba(254, 9, 68, 0.3)",
                }),
              }}
            >
              <Box component="span">{f.icon}</Box>
              {t(f.labelKey, f.fallback)}
              {f.hasArrow && (
                <Box component="span" sx={{ fontSize: "10px", opacity: 0.7 }}>
                  ▾
                </Box>
              )}
            </Box>
          );
        })}
      </Box>

      {/* .view-toggle — verbatim */}
      <Box
        sx={{
          margin: "0 14px 14px",
          display: "flex",
          background: "rgba(255, 255, 255, 0.5)",
          borderRadius: "99px",
          padding: "3px",
          border: "1px solid rgba(255, 255, 255, 0.7)",
        }}
      >
        {(["grid", "map", "sort"] as const).map((v) => {
          const active = view === v;
          const labelMap = {
            grid: { icon: "⊞", label: t("browse.view.grid", "Grid") },
            map: { icon: "📍", label: t("browse.view.map", "Map") },
            sort: { icon: "⚡", label: t("browse.view.sort", "Sort") },
          };
          return (
            <Box
              key={v}
              component="button"
              type="button"
              onClick={() => onView(v)}
              sx={{
                flex: 1,
                background: active ? "#fff" : "transparent",
                color: active ? "#FE0944" : "rgba(60, 30, 20, 0.72)",
                border: "none",
                padding: "7px 10px",
                fontSize: "11.5px",
                fontWeight: 700,
                cursor: "pointer",
                borderRadius: "99px",
                fontFamily: SANS,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "5px",
                ...(active && {
                  boxShadow: "0 2px 8px rgba(254, 9, 68, 0.15)",
                }),
              }}
            >
              <Box component="span">{labelMap[v].icon}</Box>
              {labelMap[v].label}
            </Box>
          );
        })}
      </Box>

      {/* .sort-row — verbatim */}
      <Box
        sx={{
          padding: "0 20px 10px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: "11px",
          color: "rgba(60, 30, 20, 0.72)",
          fontWeight: 600,
          fontFamily: SANS,
        }}
      >
        <Box>
          <Box component="strong" sx={{ color: "#2a1a14" }}>
            {t("browse.count", "{{count}} therapists", { count })}
          </Box>{" "}
          · {t("browse.range", "within 5 km")}
        </Box>
        <Box
          sx={{
            color: "#b85c3c",
            fontWeight: 700,
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
            cursor: "pointer",
          }}
        >
          {t("browse.sort.recommended", "Recommended")} ▾
        </Box>
      </Box>
    </Box>
  );
};

export default BrowseHeader;
