// src/components/booking/StepService.tsx
//
// 🎨 Phase 3 Booking — Step 1 Service picker.
//
// Lists the licensed therapeutic services from `src/data/services.ts`.
// If a therapist is preselected (via /booking/:id), only show services
// that therapist offers (intersection with their `servicesAvailable`).
//
// Card layout (mobile, BRAND.md aligned):
//   ┌─────────────────────────────────────────────┐
//   │  [img]  Thai Massage          [SIGNATURE]   │
//   │         60 min · Restore deep tension       │
//   │         ฿1,200                       (○|●)  │
//   └─────────────────────────────────────────────┘
//
// Visual:
//   • Liquid Glass card (rgba 0.65 + blur 20px) for unselected
//   • Selected: red gradient border + filled radio + slight lift
//   • Badge: pill in top-right of image, color per badge type
//   • Tap entire card → select; radio reflects state
//
// Accessibility:
//   • Each card is `role="radio"` with `aria-checked`
//   • Outer wrapper is `role="radiogroup"`
//   • Keyboard: Space/Enter selects

import React, { useMemo, useState } from "react";
import { Box, Typography } from "@mui/material";
import services, { type MassageService } from "@/data/services";
import therapistsData from "@/data/therapists";
import {
  startingPrice,
  durationsFor,
  formatTHB,
} from "@/utils/servicePricing";
import ServiceDurationSheet from "@/components/booking/ServiceDurationSheet";

const SERIF = '"Fraunces", Georgia, "Times New Roman", serif';
const SANS = '"Inter", system-ui, -apple-system, sans-serif';

interface Props {
  /** Currently selected service id (null when nothing picked yet) */
  value: string | null;
  /** Currently selected duration (so the sheet can pre-highlight it) */
  selectedDuration: number | null;
  /** Currently selected date — sheet pre-highlights, parent navigates on confirm. */
  selectedDate: string | null;
  /** Currently selected time — sheet pre-highlights, parent navigates on confirm. */
  selectedTime: string | null;
  /**
   * Called after the bottom sheet's Confirm is tapped with all four fields
   * picked (service, duration, date, time). Parent then auto-navigates to
   * /booking/:therapistId.
   */
  onConfirm: (
    serviceId: string,
    duration: number,
    date: string,
    time: string
  ) => void;
  /** If set, only show services the therapist offers */
  therapistId: string | null;
}

const BADGE_COLORS: Record<MassageService["badge"], { bg: string; fg: string }> = {
  SIGNATURE: { bg: "rgba(254, 9, 68, 0.95)", fg: "#fff" },
  POPULAR: { bg: "rgba(254, 122, 82, 0.95)", fg: "#fff" },
  RECOMMEND: { bg: "rgba(184, 92, 60, 0.95)", fg: "#fff" },
  EXCLUSIVE: { bg: "rgba(60, 30, 20, 0.95)", fg: "#FEC9A7" },
};

// Round 28s33 (founder 2026-05-31, "เอา เมนูขายดีขึ้นก่อน") —
// Manual editorial order: best-selling / highest-margin services
// at the top so the premium tier anchors pricing perception. Per
// the 7-day funnel analytics (CLAUDE.md §9, 2026-05-30):
//   SR-HJ2200 (Gentleman's) — 16 service views, 100% of bookings
//   SR-B2B3200 (Therapeutic) — 13 views
//   SR-Aroma — 5 views
//   xSR-Thai — 2 views
// Any service not listed falls to the end in its original
// data-array order, so adding a new SKU never silently disappears.
const EDITORIAL_ORDER = [
  "SR-HJ2200", // Gentleman's Signature — ฿2,200 (best seller)
  "SR-B2B3200", // SunRed Therapeutic — ฿3,200
  "SR-Aroma", // Aromatherapy — ฿1,600
  "xSR-Thai", // Thai Massage — ฿1,200
] as const;

function orderIdx(id: string): number {
  const i = EDITORIAL_ORDER.indexOf(id as (typeof EDITORIAL_ORDER)[number]);
  return i === -1 ? 999 : i;
}

const StepService: React.FC<Props> = ({
  value,
  selectedDuration,
  selectedDate,
  selectedTime,
  onConfirm,
  therapistId,
}) => {
  // Filter to therapist's offered services if a therapist is preselected.
  // Falls back to ALL services if therapist has no `servicesAvailable` set
  // (legacy data) or therapist not found. Then apply the editorial sort
  // so the best-selling SKU lands at the top of the list (28s33).
  const visibleServices = useMemo<MassageService[]>(() => {
    let pool: MassageService[];
    if (!therapistId) {
      pool = services;
    } else {
      const therapist = therapistsData.find((t) => t.id === therapistId);
      const offered = therapist?.servicesAvailable ?? therapist?.services;
      if (!offered || offered.length === 0) {
        pool = services;
      } else {
        const filtered = services.filter((s) => offered.includes(s.id));
        pool = filtered.length > 0 ? filtered : services;
      }
    }
    return [...pool].sort((a, b) => orderIdx(a.id) - orderIdx(b.id));
  }, [therapistId]);

  // Bottom-sheet state — opens when a card is tapped, closes on backdrop
  // dismiss or Confirm. Only one service is "in flight" at a time.
  const [sheetService, setSheetService] = useState<MassageService | null>(null);

  const openSheet = (s: MassageService) => setSheetService(s);
  const closeSheet = () => setSheetService(null);

  // Parent fires onConfirm with all four fields once user taps Confirm
  // inside the now-combined sheet (service+duration+date+time).
  const confirmFull = (durationMin: number, date: string, time: string) => {
    if (!sheetService) return;
    onConfirm(sheetService.id, durationMin, date, time);
    setSheetService(null);
  };

  return (
    <Box
      role="radiogroup"
      aria-label="Choose service"
      sx={{ display: "flex", flexDirection: "column", gap: "12px" }}
    >
      {visibleServices.map((s, idx) => {
        const isSelected = value === s.id;
        // Round 28s43 ("ตรงเมนูเด่น ใส่ กรอป มาแรง ด้วย") —
        // First card in the editorial order is the current
        // best-seller (Gentleman's Signature per 28s33 analytics).
        // Highlights it with a brand-red gradient border + a small
        // "มาแรง" / "TRENDING" pill so the eye lands there first.
        const isTrending = idx === 0;
        const badgeColor = BADGE_COLORS[s.badge];
        const fromPrice = startingPrice(s);
        const tiers = durationsFor(s);
        return (
          <Box
            key={s.id}
            role="radio"
            aria-checked={isSelected}
            tabIndex={0}
            onClick={() => openSheet(s)}
            onKeyDown={(e) => {
              if (e.key === " " || e.key === "Enter") {
                e.preventDefault();
                openSheet(s);
              }
            }}
            sx={{
              // Round 28s33 ("ปรับให้สวยสบายตา") — soften card
              // chrome to match the cream-surface aesthetic the
              // rest of the redesign now uses.
              // Round 28s43 — trending card gets a brand-red
              // double-border treatment via a layered box-shadow
              // ring so the corner pill (overflow: visible) stays
              // crisp.
              position: "relative",
              display: "flex",
              gap: "16px",
              padding: "16px",
              borderRadius: "20px",
              cursor: "pointer",
              userSelect: "none",
              background: "#fff",
              border: isSelected
                ? "2px solid #FE0944"
                : isTrending
                  ? "2px solid transparent"
                  : "1px solid rgba(184, 92, 60, 0.12)",
              backgroundImage: isTrending
                ? "linear-gradient(#fff, #fff), linear-gradient(135deg, #FE0944, #FE7A52, #FEC9A7)"
                : undefined,
              backgroundOrigin: isTrending ? "border-box" : undefined,
              backgroundClip: isTrending
                ? "padding-box, border-box"
                : undefined,
              boxShadow: isSelected
                ? "0 12px 32px rgba(254, 9, 68, 0.22)"
                : isTrending
                  ? "0 10px 26px rgba(254, 9, 68, 0.14), 0 1px 3px rgba(126, 30, 46, 0.05)"
                  : "0 4px 14px rgba(126, 30, 46, 0.05)",
              transform: isSelected ? "translateY(-1px)" : "none",
              transition:
                "transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease",
              "&:hover": {
                transform: "translateY(-1px)",
                boxShadow: "0 8px 22px rgba(126, 30, 46, 0.08)",
              },
              "&:focus-visible": {
                outline: "2px solid #FE0944",
                outlineOffset: "2px",
              },
            }}
          >
            {/* Round 28s43 — Trending pill, top-right corner of the
                first card. Uses the brand-red gradient register
                from the rest of the CTAs so it reads as the
                "this is the one to book" signal. */}
            {isTrending && (
              <Box
                aria-label="Trending"
                sx={{
                  position: "absolute",
                  top: -8,
                  right: 12,
                  zIndex: 2,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  padding: "3px 9px 3px 7px",
                  borderRadius: 999,
                  background:
                    "linear-gradient(135deg, #FE0944, #FE7A52)",
                  color: "#fff",
                  fontFamily: SANS,
                  fontSize: "9.5px",
                  fontWeight: 800,
                  letterSpacing: "0.10em",
                  textTransform: "uppercase",
                  boxShadow:
                    "0 6px 14px rgba(254, 9, 68, 0.32), inset 0 1px 0 rgba(255,255,255,0.30)",
                  whiteSpace: "nowrap",
                }}
              >
                <Box
                  component="span"
                  aria-hidden
                  sx={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: "#fff",
                    boxShadow: "0 0 0 3px rgba(255,255,255,0.30)",
                    animation:
                      "sunredTrendingPulse 1.6s ease-in-out infinite",
                    "@keyframes sunredTrendingPulse": {
                      "0%, 100%": { opacity: 1 },
                      "50%": { opacity: 0.45 },
                    },
                  }}
                />
                Trending
              </Box>
            )}

            {/* Thumbnail */}
            <Box
              sx={{
                position: "relative",
                width: 92,
                height: 92,
                flexShrink: 0,
                borderRadius: "16px",
                overflow: "hidden",
                background: `center / cover no-repeat url("${s.image}"), linear-gradient(135deg, #d4a574, #8b6f47)`,
              }}
            >
              {/* Badge pill (top-left of thumbnail) — bigger and
                  legible at a glance now that the thumb is 92px. */}
              <Box
                sx={{
                  position: "absolute",
                  top: 6,
                  left: 6,
                  fontFamily: SANS,
                  fontSize: "9px",
                  fontWeight: 800,
                  letterSpacing: "0.08em",
                  background: badgeColor.bg,
                  color: badgeColor.fg,
                  padding: "3px 7px",
                  borderRadius: "6px",
                  textTransform: "uppercase",
                  boxShadow: "0 2px 6px rgba(20, 6, 12, 0.18)",
                }}
              >
                {s.badge}
              </Box>
            </Box>

            {/* Body */}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                sx={{
                  fontFamily: SERIF,
                  fontSize: "17px",
                  fontWeight: 600,
                  color: "#2a1a14",
                  letterSpacing: "-0.01em",
                  lineHeight: 1.15,
                  marginBottom: "4px",
                }}
              >
                {s.name}
              </Typography>
              <Typography
                sx={{
                  fontFamily: SANS,
                  fontSize: "12px",
                  color: "rgba(60, 30, 20, 0.68)",
                  lineHeight: 1.45,
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                  marginBottom: "8px",
                }}
              >
                {s.desc}
              </Typography>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: "6px",
                  fontFamily: SANS,
                  flexWrap: "wrap",
                }}
              >
                <Typography
                  component="span"
                  sx={{
                    fontFamily: SANS,
                    fontSize: "10px",
                    fontWeight: 700,
                    color: "rgba(60, 30, 20, 0.5)",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                  }}
                >
                  From
                </Typography>
                <Typography
                  component="span"
                  sx={{
                    fontFamily: SERIF,
                    fontSize: "15px",
                    fontWeight: 700,
                    color: "#FE0944",
                    letterSpacing: "-0.02em",
                  }}
                >
                  {formatTHB(fromPrice)}
                </Typography>
                <Typography
                  component="span"
                  sx={{
                    fontSize: "11px",
                    color: "rgba(60, 30, 20, 0.55)",
                    fontWeight: 500,
                  }}
                >
                  · {tiers.join("/")} min
                </Typography>
              </Box>
            </Box>

            {/* Chevron / radio (right) — chevron when not selected,
                filled radio + selected duration when picked */}
            {isSelected && selectedDuration ? (
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "2px",
                  flexShrink: 0,
                }}
              >
                <Box
                  aria-hidden
                  sx={{
                    width: 22,
                    height: 22,
                    borderRadius: "50%",
                    border: "6px solid #FE0944",
                    background: "#fff",
                  }}
                />
                <Typography
                  sx={{
                    fontFamily: SANS,
                    fontSize: "10px",
                    fontWeight: 700,
                    color: "#FE0944",
                  }}
                >
                  {selectedDuration}m
                </Typography>
              </Box>
            ) : (
              <Box
                aria-hidden
                sx={{
                  fontSize: "20px",
                  color: "rgba(60, 30, 20, 0.35)",
                  flexShrink: 0,
                  alignSelf: "center",
                }}
              >
                ›
              </Box>
            )}
          </Box>
        );
      })}

      {/* Bottom-sheet — service info + duration + date+time picker.
          Phase 5 (founder feedback 'ในsheet เดียวกัน') merges the
          previously-separate DateTimeSheet into here so the customer
          finishes the picking flow without leaving the sheet. */}
      <ServiceDurationSheet
        service={sheetService}
        initialDuration={
          sheetService && value === sheetService.id
            ? selectedDuration ?? undefined
            : undefined
        }
        initialDate={
          sheetService && value === sheetService.id ? selectedDate : null
        }
        initialTime={
          sheetService && value === sheetService.id ? selectedTime : null
        }
        therapistId={therapistId}
        open={!!sheetService}
        onClose={closeSheet}
        onConfirm={confirmFull}
      />

      {visibleServices.length === 0 && (
        <Typography
          sx={{
            fontFamily: SANS,
            color: "rgba(60, 30, 20, 0.5)",
            textAlign: "center",
            padding: "40px 20px",
          }}
        >
          No services available
        </Typography>
      )}
    </Box>
  );
};

export default StepService;
