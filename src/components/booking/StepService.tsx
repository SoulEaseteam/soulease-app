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
import { enhanceImage } from "@/utils/cloudinary";
// 🆕 Round 28r79 — r68 pattern (hardcoded fast-path + Firestore
//   fallback) so admin-added therapists show the services they
//   actually offer, not the fallback catalog.
import {
  findHardcodedTherapist,
  findTherapistOrFetch,
} from "@/utils/therapistLookup";
import type { Therapist } from "@/types/therapist";
import {
  isServiceEnabled,
  withLiveServiceOverrides,
  getLiveCustomServices,
  getLiveServiceOrder,
  startingPrice,
  durationsFor,
  formatTHB,
  badgeFor,
} from "@/utils/servicePricing";
import PromoBadge from "@/components/common/PromoBadge";
import ServiceDurationSheet from "@/components/booking/ServiceDurationSheet";

const SANS = '"Inter", system-ui, -apple-system, sans-serif';

// 🆕 28r123 — one-word type tag per service, same map as ServicesPage.tsx.
//   Kept inline here to avoid a shared import; adjust both if a new
//   standard service is added to the catalog.
const SERVICE_TYPE_TAG: Record<string, string> = {
  "xSR-Thai":   "Traditional",
  "SR-Aroma":   "Relaxing",
  "SR-HJ2200":  "Signature",
  "SR-B2B3200": "Specialised",
};

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
  // 🆕 28x.104 (founder "เมนูพิเศษขึ้นก่อน 2 อันดับแรก") — the second
  //   signature menu (SunRed Therapeutic) is pinned right under the
  //   best-seller, so the two premium rituals always open the list even
  //   when the admin live order sorts Thai/Aroma higher.
  if (id === "SR-B2B3200") return -999;
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
      {visibleServices.map((s) => {
        const isSelected = value === s.id;
        // 🆕 28r123 (founder mockup 2026-07-13 · therapist services list
        //   compact horizontal cards) — replaced the r28s86 full-bleed
        //   5:2 photo card with a small image-left + text-right list
        //   card. Price / TRENDING pulse / description clamp / duration
        //   tiers removed per r122+r118 direction (ซ่อนราคา).  Only
        //   name + '60 min · Type' subtitle surface.
        const typeLabel = SERVICE_TYPE_TAG[s.id] ?? "Signature";
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
              alignItems: "stretch",
              gap: 0,
              borderRadius: "14px",
              background: "var(--sr-panel)",
              border: isSelected
                ? "1.5px solid #FF9999"
                : "1px solid var(--sr-hairline)",
              boxShadow: "var(--sr-card-shadow)",
              overflow: "hidden",
              cursor: "pointer",
              userSelect: "none",
              transition:
                "transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease",
              "@media (hover: hover)": {
                "&:hover": {
                  transform: "translateY(-1px)",
                  borderColor: "rgba(217,124,149,0.5)",
                },
              },
              "&:focus-visible": {
                outline: "2px solid #FF9999",
                outlineOffset: 2,
              },
            }}
          >
            {/* Small image on the LEFT — uniform frame · face-priority
                🆕 28r125 (founder "ทำขอบให้มันสมส่วนกัน") — r124's
                object-fit: contain left inconsistent rose-blush
                letterboxes across portrait vs landscape images.  Back
                to object-fit: cover with center-top anchoring so every
                card frames identically and faces stay in the crop. */}
            {s.image && (
              <Box
                sx={{
                  flex: "0 0 auto",
                  width: 108,
                  height: 108,
                  alignSelf: "center",
                  m: "10px 0 10px 10px",
                  borderRadius: "10px",
                  overflow: "hidden",
                  background:
                    "linear-gradient(135deg, rgba(232,183,198,0.35), rgba(217,124,149,0.20))",
                }}
              >
                <Box
                  component="img"
                  src={enhanceImage(s.image, { variant: "thumb" })}
                  alt=""
                  loading="lazy"
                  sx={{
                    display: "block",
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    objectPosition: "center top",
                  }}
                />
              </Box>
            )}

            {/* Text column on the RIGHT */}
            <Box
              sx={{
                flex: "1 1 auto",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                p: "12px 16px",
                minWidth: 0,
              }}
            >
              {/* 🆕 28w.71 (founder "BEST SELLER ให้อยู่เหนือ") — the badge was
                  absolutely pinned to the card corner and the service name ran
                  underneath it. It now sits ABOVE the name on its own line,
                  right-aligned, so nothing overlaps. */}
              {badgeFor(s.id) && (
                <Box sx={{ display: "flex", justifyContent: "flex-end", mb: "6px" }}>
                  <PromoBadge serviceId={s.id} size="sm" />
                </Box>
              )}
              <Typography
                component="h3"
                sx={{
                  // 🆕 28x.104 — SERIF→SANS (founder "เปลี่ยนฟ้อนให้อ่านง่ายขึ้น")
                  fontFamily: SANS,
                  fontSize: "16px",
                  fontWeight: 700,
                  color: "var(--sr-ink)",
                  letterSpacing: "-0.005em",
                  lineHeight: 1.2,
                  mb: 0.5,
                }}
              >
                {s.name}
              </Typography>
              <Typography
                sx={{
                  fontFamily: SANS,
                  fontSize: "12px",
                  color: "var(--sr-muted)",
                  letterSpacing: "0.01em",
                }}
              >
                {/* 🆕 28x.104 (founder "เมนู gentleman ใส่นาทีผิด") — was a
                    hardcoded "60 min" on every card; Gentleman's/Therapeutic
                    have no 60-min tier (70/120 only). Show the service's
                    REAL minimum tier. */}
                {durationsFor(s)[0] ?? 60} min
              </Typography>
              {/* 🆕 28w.63 (founder "ใส่ราคาเริ่มต้น + ป้ายวิบวับ") — starting
                  price (struck-through was + from-price) + shimmering badge. */}
              {/* 🆕 28x.104 — struck was-price removed (ราคาขีดฆ่า ออกทุกจุด);
                  price SERIF→SANS for readability. */}
              {/* 🆕 28x.175 (founder screenshot, a competitor's per-service
                  "practitioner recommends" pill: "แต่งป้าย บริการให้เป็นแบบนี้
                  ... ไม่ต้องเอามา เพราะ ของใครของมัน") — she wants the PILL
                  styling, not the reference's actual text (that pill named
                  a specific practitioner on someone else's roster — not
                  ours to borrow, same call already made for
                  TherapistMinimalCard's specialty row in 28x.119). `typeLabel`
                  was already real, our-own per-service copy sitting as plain
                  text in the subtitle above; moved here as the pill instead
                  of inventing new per-therapist content we don't have. */}
              {(() => {
                const from = startingPrice(s);
                return (
                  <Box sx={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "8px", mt: "6px" }}>
                    <Box
                      sx={{
                        display: "inline-flex",
                        alignItems: "center",
                        padding: "4px 10px",
                        borderRadius: "999px",
                        background: "rgba(217,124,149,0.14)",
                        color: "#B8567F",
                        fontFamily: SANS,
                        fontSize: "11px",
                        fontWeight: 700,
                      }}
                    >
                      {typeLabel}
                    </Box>
                    <Box sx={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
                      <Typography component="span" sx={{ fontFamily: SANS, fontSize: "10px", color: "var(--sr-muted)", fontWeight: 600 }}>เริ่มต้น</Typography>
                      <Typography component="span" sx={{ fontFamily: SANS, fontSize: "16px", fontWeight: 700, color: "#FF9999", lineHeight: 1 }}>{formatTHB(from)}</Typography>
                    </Box>
                  </Box>
                );
              })()}
            </Box>

            {/* Selected-tier marker (subtle) — 🆕 28w.67 moved to the BOTTOM
                right so it no longer collides with the promo badge. */}
            {isSelected && selectedDuration && (
              <Box
                aria-hidden
                sx={{
                  position: "absolute",
                  bottom: 8,
                  right: 10,
                  padding: "3px 9px",
                  borderRadius: 999,
                  background: "#FF9999",
                  color: "#fff",
                  fontFamily: SANS,
                  fontSize: "10px",
                  fontWeight: 800,
                }}
              >
                {selectedDuration}m
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
