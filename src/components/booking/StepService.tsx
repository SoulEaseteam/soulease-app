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
  /** Called after the duration sheet is confirmed */
  onChange: (serviceId: string, duration: number) => void;
  /** If set, only show services the therapist offers */
  therapistId: string | null;
}

const BADGE_COLORS: Record<MassageService["badge"], { bg: string; fg: string }> = {
  SIGNATURE: { bg: "rgba(254, 9, 68, 0.95)", fg: "#fff" },
  "BEST SELLER": { bg: "rgba(254, 122, 82, 0.95)", fg: "#fff" },
  RECOMMEND: { bg: "rgba(184, 92, 60, 0.95)", fg: "#fff" },
  EXCLUSIVE: { bg: "rgba(60, 30, 20, 0.95)", fg: "#FEC9A7" },
};

const StepService: React.FC<Props> = ({
  value,
  selectedDuration,
  onChange,
  therapistId,
}) => {
  // Filter to therapist's offered services if a therapist is preselected.
  // Falls back to ALL services if therapist has no `servicesAvailable` set
  // (legacy data) or therapist not found.
  const visibleServices = useMemo<MassageService[]>(() => {
    if (!therapistId) return services;
    const therapist = therapistsData.find((t) => t.id === therapistId);
    const offered = therapist?.servicesAvailable ?? therapist?.services;
    if (!offered || offered.length === 0) return services;
    const filtered = services.filter((s) => offered.includes(s.id));
    return filtered.length > 0 ? filtered : services;
  }, [therapistId]);

  // Bottom-sheet state — opens when a card is tapped, closes on backdrop
  // dismiss or Confirm. Only one service is "in flight" at a time.
  const [sheetService, setSheetService] = useState<MassageService | null>(null);

  const openSheet = (s: MassageService) => setSheetService(s);
  const closeSheet = () => setSheetService(null);

  const confirmDuration = (durationMin: number) => {
    if (!sheetService) return;
    onChange(sheetService.id, durationMin);
    setSheetService(null);
  };

  return (
    <Box
      role="radiogroup"
      aria-label="Choose service"
      sx={{ display: "flex", flexDirection: "column", gap: "12px" }}
    >
      {visibleServices.map((s) => {
        const isSelected = value === s.id;
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
              position: "relative",
              display: "flex",
              gap: "14px",
              padding: "14px",
              borderRadius: "18px",
              cursor: "pointer",
              userSelect: "none",
              background: "rgba(255, 255, 255, 0.65)",
              backdropFilter: "blur(20px) saturate(180%)",
              WebkitBackdropFilter: "blur(20px) saturate(180%)",
              border: isSelected
                ? "2px solid #FE0944"
                : "1px solid rgba(0, 0, 0, 0.06)",
              boxShadow: isSelected
                ? "0 10px 30px rgba(254, 9, 68, 0.18)"
                : "0 4px 14px rgba(126, 30, 46, 0.06)",
              transform: isSelected ? "translateY(-1px)" : "none",
              transition:
                "transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease",
              "&:hover": {
                background: "rgba(255, 255, 255, 0.8)",
              },
              "&:focus-visible": {
                outline: "2px solid #FE0944",
                outlineOffset: "2px",
              },
            }}
          >
            {/* Thumbnail */}
            <Box
              sx={{
                position: "relative",
                width: 78,
                height: 78,
                flexShrink: 0,
                borderRadius: "14px",
                overflow: "hidden",
                background: `center / cover no-repeat url("${s.image}"), linear-gradient(135deg, #d4a574, #8b6f47)`,
              }}
            >
              {/* Badge pill (top-left of thumbnail) */}
              <Box
                sx={{
                  position: "absolute",
                  top: 4,
                  left: 4,
                  fontFamily: SANS,
                  fontSize: "8.5px",
                  fontWeight: 800,
                  letterSpacing: "0.06em",
                  background: badgeColor.bg,
                  color: badgeColor.fg,
                  padding: "2px 5px",
                  borderRadius: "4px",
                  textTransform: "uppercase",
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
                  fontSize: "15.5px",
                  fontWeight: 600,
                  color: "#3c1e14",
                  letterSpacing: "-0.01em",
                  lineHeight: 1.2,
                  marginBottom: "3px",
                }}
              >
                {s.name}
              </Typography>
              <Typography
                sx={{
                  fontFamily: SANS,
                  fontSize: "11.5px",
                  color: "rgba(60, 30, 20, 0.65)",
                  lineHeight: 1.35,
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                  marginBottom: "6px",
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

      {/* Bottom-sheet duration picker — opens on card tap */}
      <ServiceDurationSheet
        service={sheetService}
        initialDuration={
          sheetService && value === sheetService.id
            ? selectedDuration ?? undefined
            : undefined
        }
        open={!!sheetService}
        onClose={closeSheet}
        onConfirm={confirmDuration}
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
