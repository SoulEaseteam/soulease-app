// src/components/home/QuickNavRow.tsx
//
// 🆕 Round 28r74 · Nordic sections build (2026-07-08)
// ─────────────────────────────────────────────────────────────────────
// 4 outlined icon-circles below the desktop hero band / above BundleSection:
//   Massage · Therapists · Locations · Reviews
// Bilingual (English label + Sarabun Thai subtitle) — matches mockup
// phone-1 "quick-nav" row (outputs/sunred-nordic-gray-mockup.html:220-262).
//
// Handlers:
//   Massage    → /services (full catalog)
//   Therapists → scroll to #therapist-grid on the home page
//   Locations  → /services?tab=how (Areas section lives in the How tab)
//   Reviews    → /services?tab=how (no top-level /reviews route yet; fallback
//                per r74 spec)
//
// Palette: Nordic Gray tokens from theme.ts (NEUTRAL_300 border, GRAY_600
// text, GRAY_800 heading — no crimson, no gradients).
//
// Tap targets are 44px+ (WCAG) — the whole column is clickable, the 44px
// icon circle is only the visual anchor.
// ─────────────────────────────────────────────────────────────────────

import React from "react";
import { Box } from "@mui/material";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  FlowerLotus,
  Users,
  MapPin,
  Star,
} from "phosphor-react";
import { fonts } from "@/theme";

type QuickNavItem = {
  key: string;
  Icon: typeof FlowerLotus;
  labelEn: string;
  labelTh: string;
  onTap: () => void;
};

const QuickNavRow: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const scrollToTherapistGrid = () => {
    const el = document.getElementById("therapist-grid");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const items: QuickNavItem[] = [
    {
      key: "massage",
      Icon: FlowerLotus,
      labelEn: t("home.quickNav.massage", "Massage"),
      labelTh: "นวด",
      onTap: () => navigate("/services"),
    },
    {
      key: "therapists",
      Icon: Users,
      labelEn: t("home.quickNav.therapists", "Therapists"),
      labelTh: "หมอนวด",
      onTap: scrollToTherapistGrid,
    },
    {
      key: "locations",
      Icon: MapPin,
      labelEn: t("home.quickNav.locations", "Locations"),
      labelTh: "สถานที่",
      onTap: () => navigate("/services?tab=how"),
    },
    {
      key: "reviews",
      Icon: Star,
      labelEn: t("home.quickNav.reviews", "Reviews"),
      labelTh: "รีวิว",
      onTap: () => navigate("/services?tab=how"),
    },
  ];

  return (
    <Box
      component="nav"
      aria-label="Quick navigation"
      sx={{
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: "8px",
        padding: { xs: "18px 16px 20px", md: "22px 20px 24px" },
        margin: { xs: "8px 12px 0", md: "12px 12px 0" },
        background: "transparent",
        borderBottom: "1px solid #E2E0DD", // NEUTRAL_200
      }}
    >
      {items.map(({ key, Icon, labelEn, labelTh, onTap }) => (
        <Box
          key={key}
          component="button"
          type="button"
          onClick={onTap}
          aria-label={`${labelEn} · ${labelTh}`}
          sx={{
            all: "unset",
            cursor: "pointer",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "flex-start",
            gap: "8px",
            padding: "4px",
            minHeight: 66, // ≥ 44px combined tap target with label
            textAlign: "center",
            transition: "transform 0.18s ease",
            "&:hover .qn-icon": {
              background: "#ECEBE8", // NEUTRAL_100
              borderColor: "#6E6E6A", // GRAY_600
              color: "#2D2D2B", // GRAY_900
            },
            "&:hover": {
              transform: "translateY(-1px)",
            },
            "&:focus-visible": {
              outline: "2px solid #2D2D2B",
              outlineOffset: 3,
              borderRadius: "8px",
            },
          }}
        >
          <Box
            className="qn-icon"
            sx={{
              width: 44,
              height: 44,
              borderRadius: "50%",
              background: "transparent",
              border: "1px solid #CFCFCB", // NEUTRAL_300
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#4B4B48", // GRAY_800
              transition: "background 0.18s ease, border-color 0.18s ease, color 0.18s ease",
            }}
          >
            <Icon size={20} weight="regular" />
          </Box>
          <Box
            sx={{
              fontFamily: fonts.body,
              fontSize: 11,
              fontWeight: 500,
              letterSpacing: "0.01em",
              color: "#4B4B48", // GRAY_800
              lineHeight: 1.2,
            }}
          >
            {labelEn}
          </Box>
          <Box
            sx={{
              fontFamily: fonts.body,
              fontSize: 9.5,
              fontWeight: 400,
              color: "#6E6E6A", // GRAY_600
              marginTop: "-4px",
              lineHeight: 1.2,
            }}
          >
            {labelTh}
          </Box>
        </Box>
      ))}
    </Box>
  );
};

export default QuickNavRow;
