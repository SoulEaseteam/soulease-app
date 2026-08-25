// src/components/home/MokoDiscoveryHeader.tsx
//
// 🆕 28s378 — "เปลี่ยนธีมใหม่ เหมือน mokofans" (home first). The Moko home
//   opens with a discovery band the SunRed home lacked: a location/standby
//   line, a scrolling concierge notice, and a horizontal category-filter tab
//   row (Moko: header · distance/local · noticebar · tab-list). Wired to the
//   grid's EXISTING rosterFilter state (the filter UI was removed in 28s166 —
//   this reintroduces it in Moko dress) so it filters live, not just for show.
//
// 🆕 28s379 — recoloured to the REAL Moko palette (founder ref: Lily 22
//   detail): white cards + hot-pink/MAGENTA primary for active/selected +
//   GREEN "available" status + warm blush accent + plum label. (v1 used teal —
//   wrong accent.) The look, not Moko's crude wording.

import React from "react";
import { Box } from "@mui/material";
import { MapPin } from "phosphor-react";
import { fonts } from "@/theme";
import { useTranslation } from "react-i18next";

export type RosterFilter = "all" | "available_now" | "express";

// 🕯️ 28t dark-luxury day/night — rose + gold accents fixed; text follows mode.
const MAGENTA = "#FF9999"; // primary — Vintage Rose (active / selected / icons) — fixed
const GREEN = "#57B88B"; // available / on-standby dot — green (founder semantic)
const TEXT = "var(--sr-ink)"; // primary text
const MUTED = "var(--sr-muted)"; // muted text

interface Props {
  value: RosterFilter;
  onChange: (f: RosterFilter) => void;
  counts: { all: number; availableNow: number; express: number };
}

const MokoDiscoveryHeader: React.FC<Props> = ({ value, onChange, counts }) => {
  // 🆕 Round 28w.83 — every string here was hardcoded THAI, on the home page,
  //   above the fold. A Japanese or Chinese guest landed on "ทั้งหมด · All" /
  //   "ว่างตอนนี้" / "ผู้ช่วยส่วนตัวตอบใน 5 นาที". English is the source; the locale
  //   files carry Thai like any other language.
  const { t } = useTranslation();

  // 🆕 28x.140 (founder selected the filter-tab row + tonight banner,
  //   "เอาออก") — category filter tabs (All / Available now / Near me)
  //   removed, same call as the earlier 28s166 removal this Moko header
  //   had reintroduced. value/onChange/counts kept as props so the
  //   parent's rosterFilter plumbing doesn't need touching — it just
  //   stays fixed at "all" with no visible chip to change it.
  void value;
  void onChange;
  void counts;

  return (
    <Box sx={{ margin: "0 14px 8px" }}>
      {/* ── Location / standby line ─────────────────────────────── */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "2px 2px 4px",
        }}
      >
        <MapPin size={16} weight="fill" color={MAGENTA} />
        <Box
          sx={{
            fontFamily: fonts.body,
            fontSize: "13px",
            fontWeight: 700,
            color: TEXT,
            letterSpacing: "0.01em",
          }}
        >
          {t("home.city", "Bangkok")}
        </Box>
        <Box sx={{ fontFamily: fonts.body, fontSize: "12.5px", color: MUTED }}>
          · Bangkok outcall
        </Box>
        {/* live standby pill — green, like Moko's "● Available" */}
        <Box
          sx={{
            marginLeft: "auto",
            display: "inline-flex",
            alignItems: "center",
            gap: "5px",
            background: "rgba(87,184,139,0.12)",
            border: "1px solid rgba(87,184,139,0.30)",
            borderRadius: "999px",
            padding: "3px 10px",
            fontFamily: fonts.body,
            fontSize: "11px",
            fontWeight: 700,
            color: "#57B88B",
          }}
        >
          <Box
            component="span"
            sx={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: GREEN,
              animation: "moko-pulse 2s ease-out infinite",
              "@keyframes moko-pulse": {
                "0%": { boxShadow: "0 0 0 0 rgba(87,184,139,0.55)" },
                "70%": { boxShadow: "0 0 0 6px rgba(87,184,139,0)" },
                "100%": { boxShadow: "0 0 0 0 rgba(87,184,139,0)" },
              },
              "@media (prefers-reduced-motion: reduce)": { animation: "none" },
            }}
          />
          {t("home.standby", "On standby 24h")}
        </Box>
      </Box>

      {/* 🆕 28x.129 (founder selected the scrolling notice bar, "เอาออก") —
          removed entirely. */}

      {/* 🆕 28x.140 (founder: "เอาออก") — category filter tabs
          (All / Available now / Near me) removed entirely. */}
    </Box>
  );
};

export default MokoDiscoveryHeader;
