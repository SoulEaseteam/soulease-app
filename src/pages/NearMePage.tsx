// src/pages/NearMePage.tsx
//
// 🆕 Round 28s335 (founder 2026-07-08) — "ย้าย Or browse by location ไปหน้าใหม่".
//   The "OR BROWSE BY LOCATION" map used to live at the bottom of the home
//   therapist grid; it now has its own page, reached from the "Near Me"
//   quick-nav tile. Renders <HomeTherapistGrid mapOnly /> which reuses all
//   of the grid's live therapist / price / geolocation loading and shows
//   only the map — zero data duplication.
// ─────────────────────────────────────────────────────────────────────

import React from "react";
import { Box } from "@mui/material";
import { useTranslation } from "react-i18next";
import HomeTherapistGrid from "@/components/home/HomeTherapistGrid";
import { responsiveShell } from "@/theme/breakpoints";
import { useDocumentMeta, langToLocale } from "@/utils/useDocumentMeta";

const NearMePage: React.FC = () => {
  const { t, i18n } = useTranslation();

  useDocumentMeta({
    title: t(
      "meta.nearme.title",
      "Near Me — Bangkok Outcall Massage by Location | SunRed"
    ),
    description: t(
      "meta.nearme.description",
      "See which verified SunRed practitioners are near your Bangkok hotel — browse outcall massage by location on the live map."
    ),
    locale: langToLocale(i18n.language),
    url: "https://sunred.vip/near-me",
    type: "website",
  });

  return (
    <Box
      sx={{
        ...responsiveShell,
        background: "#F7F7F6",
        minHeight: "70vh",
        padding: { xs: "10px 12px 28px", md: "16px 12px 36px" },
      }}
    >
      {/* sr-only H1 for the location-browse page */}
      <Box
        component="h1"
        sx={{
          position: "absolute",
          width: "1px",
          height: "1px",
          padding: 0,
          margin: "-1px",
          overflow: "hidden",
          clip: "rect(0 0 0 0)",
          whiteSpace: "nowrap",
          border: 0,
        }}
      >
        Browse SunRed outcall massage practitioners near you in Bangkok
      </Box>

      <HomeTherapistGrid mapOnly />
    </Box>
  );
};

export default NearMePage;
