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

import React, { useEffect, useMemo, useState } from "react";
import { Box, Typography } from "@mui/material";
import services, { type MassageService } from "@/data/services";
// 🆕 Round 28r79 — r68 pattern (hardcoded fast-path + Firestore
//   fallback) so admin-added therapists show the services they
//   actually offer, not the fallback catalog.
import {
  findHardcodedTherapist,
  findTherapistOrFetch,
} from "@/utils/therapistLookup";
import type { Therapist } from "@/types/therapist";
import {
  startingPrice,
  durationsFor,
  formatTHB,
  isServiceEnabled,
  withLiveServiceOverrides,
  getLiveCustomServices,
  getLiveServiceOrder,
} from "@/utils/servicePricing";
import ServiceDurationSheet from "@/components/booking/ServiceDurationSheet";

const SERIF = '"Playfair Display", "Fraunces", Georgia, "Times New Roman", serif';
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

// 🆕 28t.16 (founder "ให้เข้าธีม") — badge palette shifted off the old
//   navy/clay (looked dark + off-brand) onto the rose family: berry for
//   SIGNATURE, rose for RECOMMEND, deep berry for EXCLUSIVE. POPULAR keeps
//   a punchy red — the universal "best-seller" signal.
const BADGE_COLORS: Record<MassageService["badge"], { bg: string; fg: string }> = {
  SIGNATURE: { bg: "rgba(184, 86, 127, 0.95)", fg: "#fff" },
  POPULAR: { bg: "rgba(214, 40, 40, 0.95)", fg: "#fff" },
  RECOMMEND: { bg: "rgba(217, 124, 149, 0.95)", fg: "#fff" },
  EXCLUSIVE: { bg: "rgba(138, 58, 87, 0.96)", fg: "#FFF0F0" },
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

// 🆕 28t.16 — single source of truth for the pinned best-seller (matches
//   CLAUDE.md §Services `BESTSELLER_SERVICE_ID`). Gentleman's Signature is
//   the highest-converting SKU (100% of bookings per funnel analytics).
const BESTSELLER_ID = "SR-HJ2200";

function orderIdx(id: string): number {
  // 🆕 28t.16 (founder "เอาเมนูขายดีไว้ข้างบน") — the best-seller is ALWAYS
  //   pinned to the very top of the list, even when an admin-set live order
  //   (from /admin/promotions) would otherwise sort it lower. This anchors
  //   the premium tier at the top and lands the "Trending" ring (idx 0) on
  //   the SKU that actually sells. Every other service keeps the live /
  //   editorial order below it.
  if (id === BESTSELLER_ID) return -1000;
  // 🆕 Round 28s302 — admin-set order (from /admin/promotions) wins; the
  //   hardcoded editorial order is the fallback for ids it doesn't list.
  const live = getLiveServiceOrder();
  if (live.length) {
    const li = live.indexOf(id);
    if (li !== -1) return li;
    return 900 + EDITORIAL_ORDER.indexOf(id as (typeof EDITORIAL_ORDER)[number]);
  }
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
  // 🆕 Round 28r79 — resolve therapist via r68 fallback (Firestore when
  //   hardcoded misses). Sync seed for the 12 originals means no
  //   flicker; the effect only fires for admin-added ids.
  const [therapist, setTherapist] = useState<Therapist | null>(() =>
    findHardcodedTherapist(therapistId),
  );
  useEffect(() => {
    let cancelled = false;
    const local = findHardcodedTherapist(therapistId);
    if (local) {
      setTherapist(local);
      return;
    }
    (async () => {
      const t = await findTherapistOrFetch(therapistId);
      if (!cancelled) setTherapist(t);
    })();
    return () => { cancelled = true; };
  }, [therapistId]);

  // Filter to therapist's offered services if a therapist is preselected.
  // Falls back to ALL services if therapist has no `servicesAvailable` set
  // (legacy data) or therapist not found. Then apply the editorial sort
  // so the best-selling SKU lands at the top of the list (28s33).
  const visibleServices = useMemo<MassageService[]>(() => {
    // 🆕 Round 28s300 — hide services admin has disabled from the menu,
    //   and carry live name/desc/price overrides through to the card +
    //   the duration sheet it opens.
    const catalog = services.filter((s) => isServiceEnabled(s.id));
    // 🆕 Round 28s301 — admin-created custom services are shop-wide (not
    //   tied to a therapist's offered list), so they're appended AFTER
    //   any therapist filtering. getLiveCustomServices returns enabled
    //   ones only.
    const custom = getLiveCustomServices();
    let pool: MassageService[];
    if (!therapistId) {
      pool = [...catalog, ...custom];
    } else {
      const offered = therapist?.servicesAvailable ?? therapist?.services;
      if (!offered || offered.length === 0) {
        pool = [...catalog, ...custom];
      } else {
        const filtered = catalog.filter((s) => offered.includes(s.id));
        pool = [...(filtered.length > 0 ? filtered : catalog), ...custom];
      }
    }
    return [...pool]
      .sort((a, b) => orderIdx(a.id) - orderIdx(b.id))
      .map(withLiveServiceOverrides);
  }, [therapistId, therapist]);

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
              // 🆕 Round 28s86 (founder "ใส่รายละเอียด บนภาพ") —
              //   full-bleed photo card with all the detail (name,
              //   description, FROM price + duration range, badge,
              //   TRENDING) overlaid on the image, matching the new
              //   Services page. Selected = brand-red ring; trending =
              //   coral ring.
              position: "relative",
              borderRadius: "16px",
              overflow: "hidden",
              // 🆕 28t.12 — smaller service cards (founder "ทำการ์ดให้เล็กลง").
              aspectRatio: "5 / 2",
              cursor: "pointer",
              userSelect: "none",
              boxShadow: isSelected
                ? "0 0 0 2.5px #D97C95, 0 14px 32px rgba(0, 0, 0, 0.26)"
                : isTrending
                  ? "0 0 0 2px #D97C95, 0 12px 28px rgba(0, 0, 0, 0.16)"
                  : "0 8px 22px rgba(0, 0, 0, 0.12)",
              transition: "transform 0.2s ease, box-shadow 0.2s ease",
              "@media (hover: hover)": {
                "&:hover": { transform: "translateY(-2px)" },
                "&:hover .svc-img": { transform: "scale(1.05)" },
              },
              "&:focus-visible": {
                outline: "2px solid #D97C95",
                outlineOffset: "2px",
              },
              // 🆕 Round 28s88 (founder "ตรง •TRENDING เป็นกรอบ และมี
              //   อนิเมชั่นเด่นๆ") — the best-seller card gets a pulsing
              //   red→coral glow frame so it visibly stands out.
              ...(isTrending && !isSelected
                ? {
                    // 🆕 28t.16 — rose pulse frame (was dark navy #2D2D2B +
                    //   rgba(15,23,42) — off-brand + reinforced the "too dark"
                    //   read). Matches the rose selected-ring below.
                    animation:
                      "sunredTrendFrame 1.7s ease-in-out infinite",
                    "@keyframes sunredTrendFrame": {
                      "0%, 100%": {
                        boxShadow:
                          "0 0 0 2px #D97C95, 0 0 0 4px rgba(217, 124, 149, 0.14), 0 10px 26px rgba(217, 124, 149, 0.20)",
                      },
                      "50%": {
                        boxShadow:
                          "0 0 0 2px #D97C95, 0 0 0 9px rgba(217, 124, 149, 0.30), 0 16px 38px rgba(217, 124, 149, 0.38)",
                      },
                    },
                    "@media (prefers-reduced-motion: reduce)": {
                      animation: "none",
                    },
                  }
                : {}),
            }}
          >
            {/* Photo layer */}
            <Box
              className="svc-img"
              aria-hidden
              sx={{
                position: "absolute",
                inset: 0,
                // 🆕 28t.16 — rose placeholder (was tan/brown #d4a574→#8b6f47,
                //   part of the retired "old" palette).
                background: `center / cover no-repeat url("${s.image}"), linear-gradient(135deg, #E8B7C6, #D97C95)`,
                transition: "transform 0.45s cubic-bezier(0.16,1,0.3,1)",
              }}
            />
            {/* Legibility scrim
                🆕 28t.16 (founder "ดูมืดเกินไป") — lightened + de-browned.
                Was an espresso wash (rgba(20,8,4) up to 0.88) that buried
                the photo on the short 5:2 card; now a neutral near-black
                just strong enough for the white caption to stay legible. */}
            <Box
              aria-hidden
              sx={{
                position: "absolute",
                inset: 0,
                background:
                  "linear-gradient(180deg, rgba(12,8,12,0.20) 0%, rgba(12,8,12,0) 36%, rgba(12,8,12,0.30) 62%, rgba(8,5,9,0.76) 100%)",
              }}
            />

            {/* Top row — badge (left) + Trending (right) */}
            <Box
              sx={{
                position: "absolute",
                top: 12,
                left: 12,
                right: 12,
                zIndex: 2,
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: "8px",
              }}
            >
              <Box
                sx={{
                  fontFamily: SANS,
                  fontSize: "9px",
                  fontWeight: 800,
                  letterSpacing: "0.08em",
                  background: badgeColor.bg,
                  color: badgeColor.fg,
                  padding: "3px 8px",
                  borderRadius: "6px",
                  textTransform: "uppercase",
                  boxShadow: "0 2px 6px rgba(20, 6, 12, 0.22)",
                }}
              >
                {s.badge}
              </Box>
              {isTrending && (
                <Box
                  aria-label="Trending"
                  sx={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    padding: "3px 9px 3px 7px",
                    borderRadius: 999,
                    // 🆕 28t.16 — rose (was taupe #8F8474, retired palette).
                    background: "#D97C95",
                    color: "#fff",
                    fontFamily: SANS,
                    fontSize: "9.5px",
                    fontWeight: 800,
                    letterSpacing: "0.10em",
                    textTransform: "uppercase",
                    boxShadow: "0 8px 18px rgba(217, 124, 149, 0.42)",
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
                      "@media (prefers-reduced-motion: reduce)": {
                        animation: "none",
                      },
                    }}
                  />
                  Trending
                </Box>
              )}
            </Box>

            {/* Selected-duration chip — bottom-right marker */}
            {isSelected && selectedDuration && (
              <Box
                aria-hidden
                sx={{
                  position: "absolute",
                  top: 12,
                  right: 12,
                  zIndex: 3,
                  marginTop: isTrending ? "26px" : 0,
                  padding: "3px 9px",
                  borderRadius: 999,
                  // 🆕 28t.16 — rose (was taupe #8F8474 / navy shadow).
                  background: "#D97C95",
                  color: "#fff",
                  fontFamily: SANS,
                  fontSize: "10px",
                  fontWeight: 800,
                  boxShadow: "0 4px 12px rgba(217, 124, 149, 0.44)",
                }}
              >
                {selectedDuration}m
              </Box>
            )}

            {/* Overlaid detail — bottom */}
            <Box
              sx={{
                position: "absolute",
                left: 16,
                right: 16,
                bottom: 14,
                zIndex: 1,
              }}
            >
              <Typography
                component="h3"
                sx={{
                  fontFamily: SERIF,
                  fontSize: "19px",
                  fontWeight: 600,
                  color: "#fff",
                  letterSpacing: "-0.01em",
                  lineHeight: 1.14,
                  textShadow: "0 1px 8px rgba(0,0,0,0.4)",
                  marginBottom: "4px",
                }}
              >
                {s.name}
              </Typography>
              <Typography
                sx={{
                  fontFamily: SANS,
                  fontSize: "12px",
                  color: "rgba(255,255,255,0.86)",
                  lineHeight: 1.4,
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                  textShadow: "0 1px 6px rgba(0,0,0,0.35)",
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
                    fontSize: "9.5px",
                    fontWeight: 700,
                    color: "rgba(255,255,255,0.7)",
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
                    fontSize: "17px",
                    fontWeight: 700,
                    color: "#fff",
                    letterSpacing: "-0.02em",
                    textShadow: "0 1px 8px rgba(0,0,0,0.4)",
                  }}
                >
                  {formatTHB(fromPrice)}
                </Typography>
                <Typography
                  component="span"
                  sx={{
                    fontSize: "11px",
                    color: "rgba(255,255,255,0.72)",
                    fontWeight: 500,
                  }}
                >
                  · {tiers.join("/")} min
                </Typography>
              </Box>
            </Box>
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
            color: "var(--sr-muted)",
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
