// src/components/home/MokoDiscoveryHeader.tsx
//
// 🆕 28s378 — "เปลี่ยนธีมใหม่ เหมือน mokofans" (home first). The Moko home
//   opens with a discovery band the SunRed home lacked: a location/standby
//   line, a scrolling concierge notice, and a horizontal category-filter tab
//   row (Moko: header · distance/local · noticebar · tab-list). This wires
//   the tab row to the grid's EXISTING rosterFilter state (the filter UI was
//   removed in 28s166 — this reintroduces it in Moko dress) so it filters
//   live, not just for show.
//
//   Rendered in SunRed's quiet-luxury register, not Moko's crude one: white
//   cards, teal #2EC4B0 active (matches the detail tabs), warm blush accent,
//   plum label — the look, not the wording.

import React from "react";
import { Box } from "@mui/material";
import { MapPin, ShieldCheck, Lightning } from "phosphor-react";
import { fonts } from "@/theme";

export type RosterFilter = "all" | "available_now" | "express";

const TEAL = "#2EC4B0";
const PLUM = "#5A2733";
const TEXT = "#1A2B2E";
const MUTED = "#6B6560";

interface TabDef {
  key: RosterFilter;
  label: string;
  count: number;
  /** live dot on the "available now" tab */
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
        <MapPin size={16} weight="fill" color={PLUM} />
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
        {/* live standby pill */}
        <Box
          sx={{
            marginLeft: "auto",
            display: "inline-flex",
            alignItems: "center",
            gap: "5px",
            background: "rgba(46,196,176,0.10)",
            border: "1px solid rgba(46,196,176,0.30)",
            borderRadius: "999px",
            padding: "3px 10px",
            fontFamily: fonts.body,
            fontSize: "11px",
            fontWeight: 700,
            color: "#158a7b",
          }}
        >
          <Box
            component="span"
            sx={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: TEAL,
              boxShadow: "0 0 0 0 rgba(46,196,176,0.6)",
              animation: "moko-pulse 2s ease-out infinite",
              "@keyframes moko-pulse": {
                "0%": { boxShadow: "0 0 0 0 rgba(46,196,176,0.5)" },
                "70%": { boxShadow: "0 0 0 6px rgba(46,196,176,0)" },
                "100%": { boxShadow: "0 0 0 0 rgba(46,196,176,0)" },
              },
              "@media (prefers-reduced-motion: reduce)": { animation: "none" },
            }}
          />
          On standby 24 ชม.
        </Box>
      </Box>

      {/* ── Scrolling concierge notice bar ──────────────────────── */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          background: "linear-gradient(180deg,#FCEFF2 0%,#F8E6EC 100%)",
          border: "1px solid rgba(90,39,51,0.08)",
          borderRadius: "12px",
          padding: "8px 12px",
          overflow: "hidden",
        }}
      >
        <ShieldCheck size={15} weight="fill" color={PLUM} style={{ flexShrink: 0 }} />
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

      {/* ── Category filter tabs (horizontal scroll) ────────────── */}
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
                  ? `1.5px solid ${TEAL}`
                  : "1.5px solid rgba(15,23,42,0.12)",
                background: active ? "rgba(46,196,176,0.10)" : "#FFFFFF",
                borderRadius: "999px",
                padding: "7px 14px",
                fontFamily: fonts.body,
                fontSize: "12.5px",
                fontWeight: 700,
                color: active ? "#137e70" : TEXT,
                transition: "background 0.16s ease, border-color 0.16s ease, color 0.16s ease",
                "&:focus-visible": { outline: `2px solid ${TEAL}`, outlineOffset: 2 },
              }}
            >
              {tab.key === "express" && (
                <Lightning size={13} weight="fill" color={active ? "#137e70" : MUTED} />
              )}
              {tab.live && (
                <Box
                  component="span"
                  sx={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: tab.count > 0 ? TEAL : "#C7C2BC",
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
                  color: active ? "#137e70" : MUTED,
                  background: active ? "rgba(46,196,176,0.16)" : "#F1EEEA",
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
