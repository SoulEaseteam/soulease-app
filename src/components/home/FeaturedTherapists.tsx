// src/components/home/FeaturedTherapists.tsx
//
// 🎨 Phase 1 Home — Featured therapists (pixel-perfect port of
// `.therapists-scroll`). Horizontal-scroll of 4 therapist cards with
// language pills, verified pip, rating chip, specialty chips, and a
// "View profile" CTA. Plus a "← swipe →" indicator below.
//
// Verbatim CSS from sunred-home1.html:
//   .therapists-scroll { display: flex; gap: 12px; overflow-x: auto; ... }
//   .therapist-card    { flex: 0 0 220px; background: #fff; border-radius: 18px; ... }
//   .therapist-photo   { aspect-ratio: 3/4; gradient bg + radial overlays }
//   .verified-pill, .lang-pills, .rating, .therapist-info, etc.

import React from "react";
import { Box, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import type { TherapistCardData } from "@/components/therapist/TherapistCard";

const SERIF = '"Fraunces", Georgia, "Times New Roman", serif';
const SANS = '"Inter", system-ui, -apple-system, sans-serif';

// Demo fallback — used only when `therapists` prop isn't provided (e.g.
// during initial load or in Storybook). Real data flows through the
// `useTherapists()` hook in HomePage.tsx.
const DEMO: TherapistCardData[] = [
  {
    id: "mai",
    name: "Mai",
    langs: ["EN", "中"],
    rating: "4.9",
    reviewCount: 203,
    distanceKm: "1.2 km",
    specs: ["THAI", "OIL"],
    price: "฿1,800",
    unit: "/60min",
    online: true,
    availability: "●Now",
    availabilityColor: "#16a34a",
    photoBg: "linear-gradient(135deg, #d4a574, #8b6f47)",
  },
  {
    id: "ploy",
    name: "Ploy",
    langs: ["EN", "日"],
    rating: "5.0",
    reviewCount: 167,
    distanceKm: "2.4 km",
    specs: ["AROMA", "PRENATAL"],
    price: "฿2,500",
    unit: "/90min",
    online: true,
    availability: "●Now",
    availabilityColor: "#16a34a",
    photoBg: "linear-gradient(135deg, #e8c4a0, #c89968)",
  },
  {
    id: "nan",
    name: "Nan",
    langs: ["EN", "한"],
    rating: "4.8",
    reviewCount: 412,
    distanceKm: "3.1 km",
    specs: ["SPORT", "DEEP"],
    price: "฿2,200",
    unit: "/60min",
    online: false,
    availability: "19:30",
    availabilityColor: "#b85c3c",
    photoBg: "linear-gradient(135deg, #c89c7a, #6b4a2f)",
  },
  {
    id: "fern",
    name: "Fern",
    langs: ["EN", "中"],
    rating: "4.9",
    reviewCount: 89,
    distanceKm: "2.8 km",
    specs: ["THAI", "AROMA"],
    price: "฿1,800",
    unit: "/60min",
    online: true,
    availability: "●Now",
    availabilityColor: "#16a34a",
    photoBg: "linear-gradient(135deg, #f4d4b4, #d4a574)",
  },
];

interface Props {
  /** Optional live therapist list (from `useTherapists()`). When absent,
   *  the static DEMO above is rendered (Storybook / initial load). */
  therapists?: TherapistCardData[];
}

const FeaturedTherapists: React.FC<Props> = ({ therapists }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  // Prefer live data; cap to 4 cards for the home scroll. If there's
  // no live data yet (loading) or the list is empty, fall back to DEMO
  // so the page never looks blank.
  const list = therapists && therapists.length > 0 ? therapists.slice(0, 4) : DEMO;

  return (
    <Box>
      {/* .section */}
      <Box sx={{ padding: "36px 20px 8px", position: "relative" }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            fontSize: "10px",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: "#b85c3c",
            fontWeight: 700,
            marginBottom: "6px",
            fontFamily: SANS,
            "&::before": {
              content: '""',
              width: "16px",
              height: "1px",
              background: "rgba(184, 92, 60, 0.5)",
            },
          }}
        >
          {t("home.therapists.eyebrow", "Featured therapists")}
        </Box>

        <Typography
          component="h2"
          sx={{
            fontFamily: SERIF,
            fontWeight: 400,
            fontSize: "28px",
            lineHeight: 1.1,
            letterSpacing: "-0.02em",
            color: "#2a1a14",
            marginBottom: "8px",
            "& em": { fontStyle: "italic", color: "#FE0944" },
          }}
        >
          {t("home.therapists.title.pre", "Meet our ")}
          <em>{t("home.therapists.title.em", "practitioners")}</em>
          {t("home.therapists.title.tail", ".")}
        </Typography>

        <Box
          component="p"
          sx={{
            fontFamily: SANS,
            fontSize: "13.5px",
            color: "rgba(60, 30, 20, 0.72)",
            lineHeight: 1.55,
            marginBottom: "20px",
          }}
        >
          {t(
            "home.therapists.lead",
            "Each therapist is licensed, background-checked, and trained in multilingual hospitality."
          )}
        </Box>
      </Box>

      {/* .therapists-scroll — verbatim */}
      <Box
        sx={{
          display: "flex",
          gap: "12px",
          overflowX: "auto",
          padding: "0 20px 28px",
          scrollbarWidth: "none",
          scrollSnapType: "x mandatory",
          "&::-webkit-scrollbar": { display: "none" },
        }}
      >
        {list.map((th) => (
          <Box
            key={th.id}
            role="button"
            tabIndex={0}
            onClick={() => navigate(`/therapists/${th.id}`)}
            sx={{
              // .therapist-card — verbatim
              flex: "0 0 220px",
              background: "#fff",
              borderRadius: "18px",
              overflow: "hidden",
              boxShadow: "0 8px 24px rgba(126, 30, 46, 0.12)",
              scrollSnapAlign: "start",
              cursor: "pointer",
            }}
          >
            {/* .therapist-photo — verbatim */}
            <Box
              sx={{
                position: "relative",
                aspectRatio: "3 / 4",
                background: th.photoBg,
                overflow: "hidden",
                "&::after": {
                  content: '""',
                  position: "absolute",
                  inset: 0,
                  background: [
                    "radial-gradient(ellipse at 30% 25%, rgba(255,255,255,0.3) 0%, transparent 50%)",
                    "radial-gradient(ellipse at 70% 80%, rgba(0,0,0,0.25) 0%, transparent 50%)",
                  ].join(", "),
                },
              }}
            >
              {/* .lang-pills */}
              <Box
                sx={{
                  position: "absolute",
                  top: "10px",
                  left: "10px",
                  display: "flex",
                  gap: "3px",
                  zIndex: 2,
                }}
              >
                {th.langs.map((l) => (
                  <Box
                    key={l}
                    sx={{
                      // .lang-pill — verbatim
                      background: "rgba(255, 255, 255, 0.92)",
                      backdropFilter: "blur(10px)",
                      WebkitBackdropFilter: "blur(10px)",
                      color: "#2a1a14",
                      padding: "3px 6px",
                      borderRadius: "8px",
                      fontSize: "10px",
                      fontWeight: 700,
                      fontFamily: SANS,
                    }}
                  >
                    {l}
                  </Box>
                ))}
              </Box>

              {/* .verified-pill */}
              <Box
                aria-label="verified"
                sx={{
                  position: "absolute",
                  top: "10px",
                  right: "10px",
                  width: "24px",
                  height: "24px",
                  borderRadius: "50%",
                  background: "rgba(255, 255, 255, 0.95)",
                  backdropFilter: "blur(10px)",
                  WebkitBackdropFilter: "blur(10px)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#1d9bf0",
                  fontSize: "12px",
                  fontWeight: 700,
                  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
                  fontFamily: SANS,
                  zIndex: 2,
                }}
              >
                ✓
              </Box>

              {/* .rating */}
              <Box
                sx={{
                  position: "absolute",
                  bottom: "10px",
                  left: "10px",
                  background: "rgba(0, 0, 0, 0.55)",
                  backdropFilter: "blur(10px)",
                  WebkitBackdropFilter: "blur(10px)",
                  color: "#fff",
                  padding: "4px 9px",
                  borderRadius: "99px",
                  fontSize: "11px",
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: "3px",
                  fontFamily: SANS,
                  zIndex: 2,
                }}
              >
                ★ {th.rating}
              </Box>
            </Box>

            {/* .therapist-info */}
            <Box sx={{ padding: "12px 14px 14px" }}>
              {/* .name */}
              <Typography
                sx={{
                  fontFamily: SERIF,
                  fontWeight: 500,
                  fontSize: "16px",
                  color: "#2a1a14",
                  marginBottom: "2px",
                }}
              >
                {th.name}
              </Typography>

              {/* .credentials */}
              <Box
                sx={{
                  fontFamily: SANS,
                  fontSize: "10px",
                  color: "rgba(60, 30, 20, 0.72)",
                  marginBottom: "8px",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <Box component="span" sx={{ color: "#16a34a", fontWeight: 700 }}>
                  ●
                </Box>
                {t(
                  "home.therapists.licensedNear",
                  "Licensed · {{distance}}",
                  { distance: th.distanceKm }
                )}
              </Box>

              {/* .specialties */}
              <Box
                sx={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "4px",
                  marginBottom: "10px",
                }}
              >
                {th.specs.map((sp) => (
                  <Box
                    key={sp}
                    sx={{
                      // .spec — verbatim
                      background: "rgba(254, 122, 82, 0.1)",
                      color: "#FE7A52",
                      padding: "2px 7px",
                      borderRadius: "6px",
                      fontSize: "9.5px",
                      fontWeight: 600,
                      fontFamily: SANS,
                    }}
                  >
                    {sp}
                  </Box>
                ))}
              </Box>

              {/* .book-btn */}
              <Box
                sx={{
                  width: "100%",
                  background: "rgba(254, 9, 68, 0.08)",
                  color: "#FE0944",
                  padding: "8px",
                  borderRadius: "99px",
                  fontSize: "11.5px",
                  fontWeight: 700,
                  textAlign: "center",
                  border: "1px solid rgba(254, 9, 68, 0.15)",
                  fontFamily: SANS,
                }}
              >
                {t("home.therapists.viewProfile", "View profile")}
              </Box>
            </Box>
          </Box>
        ))}
      </Box>

      {/* .scroll-indicator */}
      <Box
        sx={{
          textAlign: "center",
          fontSize: "10px",
          color: "#b85c3c",
          letterSpacing: "0.15em",
          textTransform: "uppercase",
          fontWeight: 600,
          marginTop: "-16px",
          marginBottom: "16px",
          fontFamily: SANS,
        }}
      >
        ←{" "}
        {t(
          "home.therapists.scrollHint",
          "swipe to see all 32 therapists"
        )}{" "}
        →
      </Box>
    </Box>
  );
};

export default FeaturedTherapists;
