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
import { MapPin, ShieldCheck, Lightning } from "phosphor-react";
import { fonts } from "@/theme";

export type RosterFilter = "all" | "available_now" | "express";

// 🕯️ 28t dark-luxury day/night — rose + gold accents fixed; text follows mode.
const MAGENTA = "#D97C95"; // primary — Vintage Rose (active / selected / icons) — fixed
const MAGENTA_TXT = "var(--sr-ink)"; // active-tab label text (flips day/night)
const GREEN = "#57B88B"; // available / on-standby dot — green (founder semantic)
const PLUM = "var(--sr-body)"; // notice-marquee text on the notice panel
const TEXT = "var(--sr-ink)"; // primary text
const MUTED = "var(--sr-muted)"; // muted text

interface TabDef {
  key: RosterFilter;
  label: string;
  count: number;
  /** live availability dot */
  live?: boolean;
}

interface Props {
  value: RosterFilter;
  onChange: (f: RosterFilter) => void;
  counts: { all: number; availableNow: number; express: number };
}

const MokoDiscoveryHeader: React.FC<Props> = ({ value, onChange, counts }) => {
  const tabs: TabDef[] = [
    { key: "all", label: "ทั้งหมด · All", count: counts.all },
    { key: "available_now", label: "ว่างตอนนี้", count: counts.availableNow, live: true },
    { key: "express", label: "ใกล้ฉัน · Express", count: counts.express },
  ];

  // Concierge notice items — brand-voice safe, no crude wording.
  const notices = [
    "คอนเซียร์จตอบใน 5 นาที",
    "Verified practitioners on standby",
    "จัดส่งถึงโรงแรม · คอนโด ทั่วกรุงเทพฯ",
    "ชำระปลายทาง · PromptPay · 24 ชม.",
  ];

  return (
    <Box sx={{ margin: "0 14px 14px" }}>
      {/* ── Location / standby line ─────────────────────────────── */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "2px 2px 10px",
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
          กรุงเทพฯ
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
          On standby 24 ชม.
        </Box>
      </Box>

      {/* ── Scrolling concierge notice bar (blush, Moko accent) ── */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          background: "linear-gradient(180deg,var(--sr-panel) 0%,var(--sr-panel-deep) 100%)",
          border: "1px solid var(--sr-hairline)",
          borderRadius: "12px",
          padding: "8px 12px",
          overflow: "hidden",
        }}
      >
        <ShieldCheck size={15} weight="fill" color={MAGENTA} style={{ flexShrink: 0 }} />
        <Box sx={{ overflow: "hidden", flex: 1, whiteSpace: "nowrap" }}>
          <Box
            sx={{
              display: "inline-block",
              whiteSpace: "nowrap",
              animation: "moko-marquee 22s linear infinite",
              "@keyframes moko-marquee": {
                "0%": { transform: "translateX(0)" },
                "100%": { transform: "translateX(-50%)" },
              },
              "@media (prefers-reduced-motion: reduce)": {
                animation: "none",
                whiteSpace: "normal",
              },
            }}
          >
            {/* duplicated once so the loop is seamless (translate -50%) */}
            {[0, 1].map((dup) => (
              <React.Fragment key={dup}>
                {notices.map((n, i) => (
                  <Box
                    component="span"
                    key={`${dup}-${i}`}
                    sx={{
                      fontFamily: fonts.body,
                      fontSize: "12px",
                      fontWeight: 600,
                      color: PLUM,
                      marginRight: "26px",
                    }}
                  >
                    {n}
                    <Box component="span" sx={{ marginLeft: "26px", opacity: 0.4 }}>
                      ·
                    </Box>
                  </Box>
                ))}
              </React.Fragment>
            ))}
          </Box>
        </Box>
      </Box>

      {/* ── Category filter tabs (horizontal scroll, magenta active) ─ */}
      <Box
        role="tablist"
        aria-label="Filter practitioners"
        sx={{
          display: "flex",
          gap: "8px",
          marginTop: "12px",
          overflowX: "auto",
          paddingBottom: "2px",
          scrollbarWidth: "none",
          "&::-webkit-scrollbar": { display: "none" },
        }}
      >
        {tabs.map((tab) => {
          const active = value === tab.key;
          return (
            <Box
              key={tab.key}
              component="button"
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onChange(tab.key)}
              sx={{
                flexShrink: 0,
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                cursor: "pointer",
                touchAction: "manipulation",
                WebkitTapHighlightColor: "transparent",
                border: active
                  ? `1.5px solid ${MAGENTA}`
                  : "1.5px solid var(--sr-hairline)",
                background: active ? "rgba(217,124,149,0.18)" : "var(--sr-panel)",
                borderRadius: "999px",
                padding: "7px 14px",
                fontFamily: fonts.body,
                fontSize: "12.5px",
                fontWeight: 700,
                color: active ? MAGENTA_TXT : TEXT,
                transition:
                  "background 0.16s ease, border-color 0.16s ease, color 0.16s ease",
                "&:focus-visible": { outline: `2px solid ${MAGENTA}`, outlineOffset: 2 },
              }}
            >
              {tab.key === "express" && (
                <Lightning size={13} weight="fill" color={active ? "#D97C95" : "#8B7A6B"} />
              )}
              {tab.live && (
                <Box
                  component="span"
                  sx={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: tab.count > 0 ? GREEN : "var(--sr-dim)",
                    flexShrink: 0,
                  }}
                />
              )}
              {tab.label}
              <Box
                component="span"
                sx={{
                  fontFamily: fonts.body,
                  fontSize: "11px",
                  fontWeight: 800,
                  color: active ? MAGENTA_TXT : MUTED,
                  background: active ? "rgba(217,124,149,0.22)" : "var(--sr-panel-2)",
                  borderRadius: "999px",
                  padding: "1px 7px",
                  minWidth: 18,
                  textAlign: "center",
                }}
              >
                {tab.count}
              </Box>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};

export default MokoDiscoveryHeader;
