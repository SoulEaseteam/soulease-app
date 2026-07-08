// src/components/home/QuickNavRow.tsx
//
// 🆕 Round 28r74 · Nordic sections build (2026-07-08)
// 🆕 Round 28r75 (founder 2026-07-08) — 3 tweaks per feedback:
//   • Removed the icon-circle border ("เอาขอบวงกลม ออก")
//   • Bumped label font-weight 500 → 600 slightly ("ปรับตัวหนังสือหนา นิดหน่อย")
//   • Dropped the Thai subtitle line ("ลบภาษาไทย")
// ─────────────────────────────────────────────────────────────────────
// 4 icon columns below the desktop hero band / above BundleSection:
//   Massage · Therapists · Locations · Reviews
//
// Handlers:
//   Massage    → /services (full catalog)
//   Therapists → scroll to #therapist-grid on the home page
//   Locations  → /services?tab=how (Areas section lives in the How tab)
//   Reviews    → /services?tab=how (no top-level /reviews route yet; fallback
//                per r74 spec)
//
// Palette: Nordic Gray tokens from theme.ts (GRAY_800 icon + text).
// Tap targets remain 44px+ (WCAG) — the whole column is clickable.
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
      onTap: () => navigate("/services"),
    },
    {
      key: "therapists",
      Icon: Users,
      labelEn: t("home.quickNav.therapists", "Therapists"),
      onTap: scrollToTherapistGrid,
    },
    {
      key: "locations",
      Icon: MapPin,
      labelEn: t("home.quickNav.locations", "Locations"),
      onTap: () => navigate("/services?tab=how"),
    },
    {
      key: "reviews",
      Icon: Star,
      labelEn: t("home.quickNav.reviews", "Reviews"),
      onTap: () => navigate("/services?tab=how"),
    },
  ];

  return (
    <Box
      component="nav"
      aria-label="Quick navigation"
      sx={{
        // 🆕 Round 28s328 (founder 2026-07-08) — floating white card,
        //   "ตรงแถบ ไอคอน ให้เป็นแบบนี้". Was a transparent grid with a
        //   bottom hairline; now an elevated rounded card that pulls up
        //   to overlap the hero's lower edge (negative top margin) for
        //   the premium floating look in the mockup.
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: "8px",
        padding: { xs: "18px 10px", md: "22px 18px" },
        margin: { xs: "-26px 16px 10px", md: "-32px 20px 14px" },
        background: "#FFFFFF",
        borderRadius: { xs: "22px", md: "24px" },
        border: "1px solid #F1EDE6",
        boxShadow: "0 14px 34px rgba(43, 38, 32, 0.12)",
        position: "relative",
        zIndex: 2, // float above the hero it overlaps
      }}
    >
      {items.map(({ key, Icon, labelEn, onTap }) => (
        <Box
          key={key}
          component="button"
          type="button"
          onClick={onTap}
          aria-label={labelEn}
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
              // 🆕 Round 28r75 — border removed per founder direction
              //   "เอาขอบวงกลม ออก" — cleaner Muji / Aesop feel.
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#4B4B48", // GRAY_800
              transition: "background 0.18s ease, color 0.18s ease",
            }}
          >
            <Icon size={22} weight="regular" />
          </Box>
          <Box
            sx={{
              fontFamily: fonts.body,
              // 🆕 Round 28r75 — bumped weight 500 → 600 per founder
              //   direction "ปรับตัวหนังสือหนา นิดหน่อย".
              fontSize: 11.5,
              fontWeight: 600,
              letterSpacing: "0.01em",
              color: "#4B4B48", // GRAY_800
              lineHeight: 1.2,
            }}
          >
            {labelEn}
          </Box>
        </Box>
      ))}
    </Box>
  );
};

export default QuickNavRow;
