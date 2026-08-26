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
// 🆕 (founder selected this row: "เพิ่ม ลูกเล่น") — interaction-triggered
//   micro-animations only: staggered one-time entrance + springy tap squash.
//   Deliberately NO looping/ambient motion — 28x.133 removed the pulsing
//   badge because constant movement annoyed ("สีของปุ่มวิ่งไปมา").
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  FlowerLotus,
  Megaphone,
  MapPin,
  Tag,
} from "phosphor-react";
import { fonts } from "@/theme";

type QuickNavItem = {
  key: string;
  Icon: typeof FlowerLotus;
  labelEn: string;
  onTap: () => void;
  // 🆕 28w.38 — draw the eye to the anniversary pricing: rose-filled icon
  //   + pulsing "NEW" badge.
  highlight?: boolean;
};

// 🆕 (founder annotated the band: "ป้ายโดนบัง") — the -28px pull-up exists to
//   overlap the promo banner's lower edge (28u.2). With the anniversary
//   campaign ended the banner renders null (height 0), so the band was
//   yanking itself up over neighbouring content instead. Overlap is now
//   OPT-IN: HomePage passes overlapBanner only while a banner actually shows.
const QuickNavRow: React.FC<{ overlapBanner?: boolean }> = ({ overlapBanner = false }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const items: QuickNavItem[] = [
    {
      key: "massage",
      Icon: FlowerLotus,
      // 🆕 28w.4 — founder: "Massage เปลี่ยนแค่ชื่อ Our Services".
      labelEn: t("home.quickNav.massage", "Our Services"),
      onTap: () => navigate("/services"),
    },
    {
      key: "promos",
      Icon: Megaphone,
      // 🆕 28w.4 — was "Therapists" (scroll to grid); founder: repurpose
      //   to the new Promotions & News page.
      labelEn: t("home.quickNav.promos", "Promotions"),
      onTap: () => navigate("/promotions"),
    },
    {
      key: "locations",
      Icon: MapPin,
      // 🆕 28s335 — "Locations" → "Near Me"; routes to the new /near-me
      //   page that hosts the "OR BROWSE BY LOCATION" map (moved off home).
      labelEn: t("home.quickNav.nearme", "Near Me"),
      onTap: () => navigate("/near-me"),
    },
    {
      key: "pricing",
      Icon: Tag,
      labelEn: t("home.quickNav.pricing", "Pricing"),
      onTap: () => navigate("/pricing"),
      highlight: true, // 🎉 anniversary — new prices live
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
        alignItems: "center",
        gap: "8px",
        padding: { xs: "11px 8px", md: "14px 16px" },
        // 🆕 28u.2 — ลด overlap ลง (เดิม -46px) เพื่อไม่บังข้อความในรูป banner
        //   แต่ยังลอยเหนือขอบล่างรูปอยู่.
        // 🆕 "ป้ายโดนบัง" fix — negative pull-up ONLY while a banner exists.
        margin: overlapBanner
          ? { xs: "-28px 16px 10px", md: "-36px 20px 14px" }
          : { xs: "6px 16px 10px", md: "8px 20px 14px" },
        background: "var(--sr-panel)", // CHOCOLATE panel on ESPRESSO home bg
        borderRadius: { xs: "22px", md: "24px" },
        border: "1px solid var(--sr-hairline)", // gold hairline (embroidery)
        boxShadow: "var(--sr-card-shadow)", // card shadow on dark
        // 🆕 28x.144 (founder: "ทั้งเว็บเป็น glassmorphic design", again) —
        //   this row deliberately overlaps the promo banner above it
        //   (negative top margin, see 28u.2), so it's the one panel on
        //   home where a translucent background actually reads as glass
        //   instead of just a flat tint. Same blur recipe as the nav bars.
        backdropFilter: "blur(14px) saturate(160%)",
        WebkitBackdropFilter: "blur(14px) saturate(160%)",
        position: "relative",
        zIndex: 2, // float above the hero it overlaps
      }}
    >
      {items.map(({ key, Icon, labelEn, onTap, highlight }, i) => (
        <Box
          key={key}
          component={motion.button}
          type="button"
          // 🆕 ลูกเล่น — each column pops in with a slight upward drift, one
          //   after another (one-time, on mount), and squashes on tap like a
          //   real spring before navigating.
          initial={{ opacity: 0, y: 14, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.06 + i * 0.07, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          whileTap={{ scale: 0.88 }}
          onClick={onTap}
          aria-label={labelEn}
          sx={{
            all: "unset",
            cursor: "pointer",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "flex-start",
            gap: "5px",
            padding: "4px",
            minHeight: 50, // ≥ 44px combined tap target with label
            textAlign: "center",
            transition: "transform 0.18s ease",
            // 🆕 28s334 — thin vertical divider between columns
            //   (founder: "ขีดกลาง แบ่งช่อง"). Short + centred in the gap,
            //   skipped after the last item so there's no trailing line.
            position: "relative",
            "&:not(:last-of-type)::after": {
              content: '""',
              position: "absolute",
              top: "50%",
              right: "-4px",
              transform: "translateY(-50%)",
              width: "1px",
              height: 24,
              background: "var(--sr-line)", // subtle divider on dark
            },
            "&:hover .qn-icon": {
              background: "var(--sr-panel-2)", // WALNUT hover-on-panel
              borderColor: "#D2B67C", // GOLD hairline
              color: "#FF9999", // ROSE icon accent
              // 🆕 ลูกเล่น — playful tilt + grow on hover (interaction-only).
              transform: "rotate(-8deg) scale(1.1)",
            },
            "&:active .qn-icon": {
              transform: "rotate(-8deg) scale(0.95)",
            },
            "&:hover": {
              transform: "translateY(-1px)",
            },
            "&:focus-visible": {
              outline: "2px solid #FF9999", // ROSE focus ring
              outlineOffset: 3,
              borderRadius: "8px",
            },
          }}
        >
          <Box sx={{ position: "relative", display: "flex" }}>
            <Box
              className="qn-icon"
              sx={{
                width: 38,
                height: 38,
                borderRadius: "50%",
                // 🆕 28w.38 — highlighted (Pricing) tile gets a soft rose halo
                //   at rest so the eye lands on it.
                background: highlight ? "rgba(217,124,149,0.12)" : "transparent",
                // 🆕 Round 28r75 — border removed per founder direction
                //   "เอาขอบวงกลม ออก" — cleaner Muji / Aesop feel.
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                // Rose accent at rest for the highlighted tile; muted otherwise.
                color: highlight ? "#FF9999" : "var(--sr-muted)",
                transition: "background 0.18s ease, color 0.18s ease, transform 0.22s cubic-bezier(.34,1.56,.64,1)",
              }}
            >
              <Icon size={20} weight={highlight ? "fill" : "regular"} />
            </Box>

            {/* 🎉 28w.38 (founder "ให้ตรงนี้ มีอนิเมชั่น หรือ ป้ายไอคอนเล็กๆ") —
                pulsing NEW badge on the Pricing tile for the anniversary. */}
            {highlight && (
              <Box
                aria-hidden
                sx={{
                  // 🆕 (founder: "จัดให้บาล้าน") — tucked in so it no longer
                  //   kisses the card's top edge after the slimmer padding.
                  position: "absolute",
                  top: -1,
                  right: -5,
                  px: "5px",
                  height: 15,
                  display: "flex",
                  alignItems: "center",
                  borderRadius: "999px",
                  background: "linear-gradient(135deg, #E0879E 0%, #FF9999 100%)",
                  color: "#fff",
                  fontFamily: fonts.body,
                  fontSize: 8,
                  fontWeight: 800,
                  letterSpacing: "0.06em",
                  boxShadow: "0 2px 7px rgba(201,111,137,0.55)",
                  // 🆕 28x.133 (founder: "สีของ ปุ่ม วิ่งไปมา") — the pulsing
                  // scale animation read as the badge's color moving. Static now.
                }}
              >
                NEW
              </Box>
            )}
          </Box>
          <Box
            sx={{
              fontFamily: fonts.body,
              // 🆕 Round 28r75 — bumped weight 500 → 600 per founder
              //   direction "ปรับตัวหนังสือหนา นิดหน่อย".
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.01em",
              color: "var(--sr-body)", // CREAM label text (light on dark)
              lineHeight: 1.2,
              // 🆕 (founder: "จัดให้บาล้าน") — every label stays one line so
              //   all four columns sit at identical height.
              whiteSpace: "nowrap",
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
