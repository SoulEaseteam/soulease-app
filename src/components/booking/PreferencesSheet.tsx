// src/components/booking/PreferencesSheet.tsx
//
// 🆕 Founder feedback 2026-05-01 round 5:
//   "Optional add-ons + Preferred language อยู่ sheet เดียวกัน"
//   "Payment method เอาออก"
//
// Replaces the previous LanguageSheet + AddonsSheet combo with a single
// bottom sheet that lets the customer pick BOTH preferences in one open.
// Payment method has been removed from the booking flow entirely (the
// admin will collect payment via the same Telegram channel that already
// handles deposit confirmations for long-distance bookings).
//
// Layout (top → bottom):
//   ┌──────────────────────────────────┐
//   │  Preferences            ✕        │
//   │  ─────────────────────────       │
//   │  Preferred language               │
//   │  [🇨🇳 Mandarin] [🇬🇧 English]      │
//   │  [🇯🇵 Japanese] [🇰🇷 Korean]       │
//   │                                  │
//   │  Optional add-ons                │
//   │  ☐ Hot stone        +฿200        │
//   │  ☐ Premium oil      +฿300        │
//   │  ☐ Pair booking    +฿1,500        │
//   │                                  │
//   │  [ Confirm · +฿500 ]             │
//   └──────────────────────────────────┘
//
// State model: parent passes `language` (string code) + `addons` (id[]),
// gets back `(code, ids[])` on Confirm.

import React, { useEffect, useState } from "react";
import { Drawer, Box, Typography } from "@mui/material";
import { LANGUAGE_OPTIONS, ADDONS } from "@/data/bookingExtras";
import { formatTHB } from "@/utils/servicePricing";
import { SheetHeader, SheetCTA } from "@/components/booking/LanguageSheet";

const SERIF = '"Fraunces", Georgia, "Times New Roman", serif';
const SANS = '"Inter", system-ui, -apple-system, sans-serif';

interface Props {
  open: boolean;
  onClose: () => void;
  /** Currently saved language code (e.g. "en") */
  language: string;
  /** Currently saved add-on ids */
  addons: string[];
  /** Called once on Confirm with both new values */
  onConfirm: (next: { language: string; addons: string[] }) => void;
}

const PreferencesSheet: React.FC<Props> = ({
  open,
  onClose,
  language,
  addons,
  onConfirm,
}) => {
  // Drafts so closing without Confirm doesn't dirty parent state.
  const [draftLang, setDraftLang] = useState(language);
  const [draftAddons, setDraftAddons] = useState<string[]>(addons);

  useEffect(() => {
    if (open) {
      setDraftLang(language);
      setDraftAddons(addons);
    }
  }, [open, language, addons]);

  const toggleAddon = (id: string) =>
    setDraftAddons((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  const draftAddonsTotal = ADDONS.filter((a) => draftAddons.includes(a.id)).reduce(
    (sum, a) => sum + a.price,
    0
  );

  return (
    <Drawer
      anchor="bottom"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          background: "linear-gradient(180deg, #FFF8F0 0%, #FCEBDC 100%)",
          borderRadius: "24px 24px 0 0",
          paddingBottom: "calc(20px + env(safe-area-inset-bottom, 0px))",
          maxWidth: "430px",
          margin: "0 auto",
          left: 0,
          right: 0,
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
        },
      }}
    >
      <SheetHeader title="Preferences" onClose={onClose} />

      <Box sx={{ flex: 1, overflowY: "auto", padding: "8px 20px 20px" }}>
        {/* ─── Preferred language ─── */}
        <SectionLabel>Preferred language</SectionLabel>
        <Typography
          sx={{
            fontFamily: SANS,
            fontSize: "11.5px",
            color: "rgba(60, 30, 20, 0.6)",
            marginBottom: "10px",
          }}
        >
          We&rsquo;ll match you with a therapist who speaks this language.
        </Typography>
        <Box
          role="radiogroup"
          aria-label="Preferred language"
          sx={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "10px",
            marginBottom: "22px",
          }}
        >
          {LANGUAGE_OPTIONS.map((l) => {
            const isActive = draftLang === l.code;
            return (
              <Box
                key={l.code}
                role="radio"
                aria-checked={isActive}
                tabIndex={0}
                onClick={() => setDraftLang(l.code)}
                onKeyDown={(e) => {
                  if (e.key === " " || e.key === "Enter") {
                    e.preventDefault();
                    setDraftLang(l.code);
                  }
                }}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "12px 14px",
                  borderRadius: "14px",
                  cursor: "pointer",
                  background: isActive
                    ? "rgba(254, 9, 68, 0.08)"
                    : "rgba(255, 255, 255, 0.7)",
                  border: isActive
                    ? "1.5px solid #FE0944"
                    : "1px solid rgba(0, 0, 0, 0.06)",
                  transition: "all 0.15s ease",
                }}
              >
                <Box sx={{ fontSize: "20px" }}>{l.flag}</Box>
                <Typography
                  sx={{
                    fontFamily: SERIF,
                    fontSize: "15px",
                    fontWeight: 600,
                    color: isActive ? "#FE0944" : "#3c1e14",
                  }}
                >
                  {l.label}
                </Typography>
              </Box>
            );
          })}
        </Box>

        {/* ─── Optional add-ons ─── */}
        <SectionLabel>Optional add-ons</SectionLabel>
        <Typography
          sx={{
            fontFamily: SANS,
            fontSize: "11.5px",
            color: "rgba(60, 30, 20, 0.6)",
            marginBottom: "10px",
          }}
        >
          Enhance your session — toggle any add-on, the total updates live.
        </Typography>
        <Box sx={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {ADDONS.map((a) => {
            const isSelected = draftAddons.includes(a.id);
            return (
              <Box
                key={a.id}
                role="checkbox"
                aria-checked={isSelected}
                tabIndex={0}
                onClick={() => toggleAddon(a.id)}
                onKeyDown={(e) => {
                  if (e.key === " " || e.key === "Enter") {
                    e.preventDefault();
                    toggleAddon(a.id);
                  }
                }}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "14px",
                  borderRadius: "14px",
                  cursor: "pointer",
                  background: "rgba(255, 255, 255, 0.7)",
                  border: isSelected
                    ? "1.5px solid #FE0944"
                    : "1px solid rgba(0, 0, 0, 0.06)",
                  transition: "all 0.15s ease",
                }}
              >
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    flexShrink: 0,
                    borderRadius: "12px",
                    background: isSelected
                      ? "linear-gradient(135deg, #FE0944, #FE7A52)"
                      : "rgba(254, 201, 167, 0.35)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "20px",
                  }}
                >
                  {a.icon}
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography
                    sx={{
                      fontFamily: SERIF,
                      fontSize: "14px",
                      fontWeight: 600,
                      color: "#3c1e14",
                    }}
                  >
                    {a.name}
                  </Typography>
                  <Typography
                    sx={{
                      fontFamily: SANS,
                      fontSize: "11.5px",
                      color: "rgba(60, 30, 20, 0.6)",
                    }}
                  >
                    {a.description}
                  </Typography>
                </Box>
                <Typography
                  sx={{
                    fontFamily: SERIF,
                    fontSize: "14px",
                    fontWeight: 700,
                    color: "#FE0944",
                  }}
                >
                  +{formatTHB(a.price)}
                </Typography>
                <Box
                  aria-hidden
                  sx={{
                    width: 22,
                    height: 22,
                    flexShrink: 0,
                    borderRadius: "6px",
                    border: isSelected
                      ? "none"
                      : "2px solid rgba(0, 0, 0, 0.2)",
                    background: isSelected ? "#FE0944" : "transparent",
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "14px",
                    fontWeight: 800,
                  }}
                >
                  {isSelected && "✓"}
                </Box>
              </Box>
            );
          })}
        </Box>
      </Box>

      <SheetCTA
        label={
          draftAddonsTotal === 0
            ? "Confirm preferences"
            : `Confirm · +${formatTHB(draftAddonsTotal)}`
        }
        onClick={() =>
          onConfirm({ language: draftLang, addons: draftAddons })
        }
      />
    </Drawer>
  );
};

const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Typography
    sx={{
      fontFamily: SANS,
      fontSize: "10.5px",
      fontWeight: 700,
      color: "rgba(60, 30, 20, 0.55)",
      textTransform: "uppercase",
      letterSpacing: "0.1em",
      marginBottom: "6px",
    }}
  >
    {children}
  </Typography>
);

export default PreferencesSheet;
