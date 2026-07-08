// src/components/booking/ServiceDurationSheet.tsx
//
// 🎨 Phase 4 Booking — Bottom-sheet popup for picking a service duration
//                      WITH full service details (Description + Benefits +
//                      Notices) so the user has everything in one screen
//                      instead of needing a separate detail page.
//
// Layout (mobile bottom sheet — scrollable):
//   ┌──────────────────────────────────┐
//   │            ▬▬▬▬                   │  drag handle
//   │  ┌────────────────────────────┐  │
//   │  │ [SIGNATURE]                │  │  hero image
//   │  │                            │  │  + badge overlay
//   │  └────────────────────────────┘  │
//   │  Thai Massage                    │
//   │  ฿1,200 · 60 mins · ⭐ 62 used  │
//   │                                  │
//   │  [ Details | Notices ]           │  tab switcher
//   │  ───────────────────────────     │
//   │  ▼ Description                   │
//   │     A timeless healing ritual…   │
//   │  ▼ Benefits                      │
//   │     • Eases chronic tension      │
//   │     • Improves posture …         │
//   │                                  │
//   │  CHOOSE DURATION                 │
//   │  [60 min ฿1,200]                 │
//   │  [90 min ⭐ ฿1,800]               │
//   │  [120 min ฿2,400]                │
//   │                                  │
//   │  [ Confirm ฿1,800 ]              │
//   └──────────────────────────────────┘

import React, { useEffect, useRef, useState } from "react";
// Round 28s62 — MUI icons replace the 🎯 / 📅 emoji (CLAUDE.md §3
// no-emoji rule; the ⭐ "Most popular" tag is the chip-star exception).
import GpsFixedRoundedIcon from "@mui/icons-material/GpsFixedRounded";
import EventRoundedIcon from "@mui/icons-material/EventRounded";
// Round 28s48 — Drawer → Dialog. Founder "กดแล้ว เป็น ป๊อบอับ
// เช่นกัน" — mirror the InfoSheet 28s38 swap so service tap
// opens a centred modal instead of a bottom drawer.
import { Dialog, Box, Typography, Button } from "@mui/material";
import { useTranslation } from "react-i18next";
import AccessTimeRoundedIcon from "@mui/icons-material/AccessTimeRounded";
import StarRoundedIcon from "@mui/icons-material/StarRounded";
import type { MassageService } from "@/data/services";
import {
  priceForDuration,
  durationsFor,
  formatTHB,
} from "@/utils/servicePricing";
import StepDateTime from "@/components/booking/StepDateTime";

const SERIF = '"Federo", "Italiana", "Cinzel", "Fraunces", Georgia, "Times New Roman", serif';
const SANS = '"Inter", system-ui, -apple-system, sans-serif';

// Round 28s64 — Notes are now i18n keys, translated at render via
// t(). Identical for all services today.
const SERVICE_NOTE_KEYS = [
  "sheet.note.bookingId",
  "sheet.note.cashNearby",
  "sheet.note.deposit",
  "sheet.note.payment",
] as const;

interface Props {
  service: MassageService | null;
  /** Initial duration to highlight when sheet opens. */
  initialDuration?: number;
  /** Initial date (YYYY-MM-DD) to highlight when sheet opens. */
  initialDate?: string | null;
  /** Initial time (HH:mm) to highlight when sheet opens. */
  initialTime?: string | null;
  /** Therapist context — required for slot availability filtering. */
  therapistId: string | null;
  open: boolean;
  onClose: () => void;
  /**
   * Called when the user taps Confirm with a fully picked combo:
   * service (props) + duration + date + time. The parent then
   * navigates to /booking/:id with the URL params.
   */
  onConfirm: (durationMin: number, date: string, time: string) => void;
}

// Round 28s64 — tag is now an i18n key + a "popular" flag (drives
// the StarRounded chip + brand-red colour). Translated at render.
const DURATION_LABELS: Record<
  number,
  { tagKey: string; popular?: boolean }
> = {
  60: { tagKey: "sheet.duration.standard" },
  90: { tagKey: "sheet.duration.popular", popular: true },
  120: { tagKey: "sheet.duration.bestValue" },
};

const BADGE_COLORS: Record<MassageService["badge"], { bg: string; fg: string }> = {
  SIGNATURE: { bg: "rgba(15, 23, 42, 0.95)", fg: "#fff" },
  POPULAR: { bg: "rgba(214, 40, 40, 0.95)", fg: "#fff" },
  RECOMMEND: { bg: "rgba(184, 92, 60, 0.95)", fg: "#fff" },
  EXCLUSIVE: { bg: "rgba(15, 23, 42, 0.95)", fg: "#FFF0F0" },
};

const ServiceDurationSheet: React.FC<Props> = ({
  service,
  initialDuration,
  initialDate,
  initialTime,
  therapistId,
  open,
  onClose,
  onConfirm,
}) => {
  const { t } = useTranslation();
  const durations = service ? durationsFor(service) : [];
  // Default to the MIDDLE tier (90 min — 'Most popular' label) when the
  // service offers 60/90/120; falls through to first tier for services
  // that override DEFAULT_DURATIONS to a shorter list.
  const [selected, setSelected] = useState<number>(
    initialDuration ?? durations[1] ?? durations[0] ?? 60
  );
  // 🆕 Founder 2026-05-01 round 4: 'Tabs ซ้อนข้อมูลไปก่อน กดก่อนแทบ
  //    เนือหาค่อยเลือนออกมา' — content stays hidden by default; tapping
  //    a tab slides the panel out. Tapping the active tab again closes
  //    it (so the customer can re-collapse without picking another tab).
  const [tab, setTab] = useState<"details" | "notices" | null>(null);
  // 🆕 Phase 5 — Date+Time picker lives inside this same sheet so the
  //    customer picks service+duration+date+time in one place. Founder
  //    feedback: 'ในsheet เดียวกัน'.
  const [draftDate, setDraftDate] = useState<string | null>(initialDate ?? null);
  const [draftTime, setDraftTime] = useState<string | null>(initialTime ?? null);

  // 🆕 Founder 2026-05-01 round 3: 'เวลาเปิดการ์ดมาจะเห็น 🎯 Choose duration
  //    อยู่กลางจอเสมอ เพื่อเป็นจุดนำสายตา'. We park a ref on the
  //    Choose duration heading and scroll it into the vertical center of
  //    the sheet's scroll container right after the drawer finishes its
  //    open animation. This guarantees the most important decision point
  //    is the first thing the eye lands on.
  const chooseDurationRef = useRef<HTMLDivElement | null>(null);

  // Sync state each time the sheet (re-)opens for a service
  useEffect(() => {
    if (open && service) {
      const d = durationsFor(service);
      setSelected(initialDuration ?? d[1] ?? d[0] ?? 60);
      setTab(null); // hidden by default — see comment on the state above
      setDraftDate(initialDate ?? null);
      setDraftTime(initialTime ?? null);
      // Wait for MUI Drawer's open transition (~250ms) before scrolling so
      // the layout is settled. requestAnimationFrame inside the timeout
      // ensures the browser has painted before we measure/scroll.
      const timer = window.setTimeout(() => {
        requestAnimationFrame(() => {
          chooseDurationRef.current?.scrollIntoView({
            block: "center",
            behavior: "smooth",
          });
        });
      }, 300);
      return () => window.clearTimeout(timer);
    }
  }, [open, service, initialDuration, initialDate, initialTime]);

  if (!service) return null;

  const totalPrice = priceForDuration(service, selected);
  const badgeColor = BADGE_COLORS[service.badge];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth={false}
      // 🚨 Round 28r65 HOTFIX — Dialog default zIndex (theme.zIndex.modal
      //   = 1300) sits UNDER BottomNavGlass (zIndex 2000). The Paper
      //   ends 16px above the viewport bottom, exactly where the nav
      //   sits (~64px + iOS safe-area 34px = ~98px), so the nav paints
      //   over the entire bottom ~98px of the sheet — including the
      //   Confirm CTA. Founder screenshot: only a red sliver peeks out
      //   above the nav. Raise Dialog above BottomNavGlass so its Paper
      //   + backdrop layer over the nav on mobile.
      sx={{ zIndex: 2100 }}
      slotProps={{
        backdrop: {
          sx: {
            background: "rgba(20, 8, 12, 0.55)",
            backdropFilter: "blur(4px)",
          },
        },
      }}
      PaperProps={{
        sx: {
          background:
            "#F4F6F5",
          borderRadius: "24px",
          // 🆕 Round 28r52 — Dialog paper widens on tablet/desktop so
          //   the picker sheet feels app-native at larger viewports.
          maxWidth: { xs: "430px", sm: "560px", md: "640px" },
          width: "calc(100% - 32px)",
          margin: "16px auto",
          maxHeight: "calc(100vh - 32px)",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 24px 60px rgba(20, 8, 12, 0.45)",
        },
      }}
    >
      {/* Round 28s48 — Drag handle removed (no longer a sheet). */}

      {/* Scrollable content */}
      <Box
        sx={{
          flex: 1,
          overflowY: "auto",
          padding: "8px 20px 20px",
        }}
      >
        {/* Hero image with badge overlay — compact 16:10 to keep duration
            picker above the fold (decision-first UX, B-pattern). */}
        <Box
          sx={{
            position: "relative",
            width: "100%",
            aspectRatio: "16 / 10",
            maxHeight: "200px",
            borderRadius: "20px",
            overflow: "hidden",
            background: `center / cover no-repeat url("${service.image}"), linear-gradient(135deg, #d4a574, #8b6f47)`,
            boxShadow: "0 8px 24px rgba(15, 23, 42, 0.12)",
          }}
        >
          <Box
            sx={{
              position: "absolute",
              top: 12,
              left: 12,
              fontFamily: SANS,
              fontSize: "10px",
              fontWeight: 800,
              letterSpacing: "0.08em",
              background: badgeColor.bg,
              color: badgeColor.fg,
              padding: "4px 10px",
              borderRadius: "999px",
              textTransform: "uppercase",
            }}
          >
            {service.badge}
          </Box>
        </Box>

        {/* Service header — name + simple inline price/duration/usage.
            Reverted from the big hero pill (founder 2026-05-01: 'มันตลก'). */}
        <Box sx={{ marginTop: "16px", marginBottom: "20px" }}>
          <Typography
            component="h2"
            sx={{
              fontFamily: SERIF,
              fontSize: "24px",
              fontWeight: 600,
              color: "#1A2B2E",
              letterSpacing: "-0.02em",
              lineHeight: 1.1,
              marginBottom: "6px",
            }}
          >
            {service.name}
          </Typography>
          <Box
            sx={{
              display: "flex",
              alignItems: "baseline",
              gap: "10px",
              flexWrap: "wrap",
            }}
          >
            <Typography
              component="span"
              sx={{
                fontFamily: SERIF,
                fontSize: "18px",
                fontWeight: 700,
                color: "#2D2D2B",
                letterSpacing: "-0.01em",
              }}
            >
              ฿{totalPrice.toLocaleString()}
            </Typography>
            <Typography
              component="span"
              sx={{
                fontFamily: SANS,
                fontSize: "13px",
                color: "rgba(15, 23, 42, 0.6)",
              }}
            >
              ·{" "}
              <AccessTimeRoundedIcon
                sx={{ fontSize: 13, verticalAlign: "-2px" }}
              />{" "}
              {t("sheet.mins", "{{n}} mins", { n: selected })}
            </Typography>
            {service.count > 0 && (
              <Typography
                component="span"
                sx={{
                  fontFamily: SANS,
                  fontSize: "12px",
                  color: "rgba(15, 23, 42, 0.55)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "2px",
                }}
              >
                ·{" "}
                <StarRoundedIcon
                  sx={{ fontSize: 13, color: "#FFA726" }}
                />
                {t("sheet.used", "{{count}} used", {
                  count: service.count,
                })}
              </Typography>
            )}
          </Box>
        </Box>

        {/* 🆕 Founder round 4 (2026-05-01) — Tabs HIDE content by default;
            tap a tab to slide its panel out, tap the same tab again to
            slide it back in. Chevron ▼ rotates to ▶ when closed. */}
        <Box
          role="tablist"
          aria-label="Service info"
          sx={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "8px",
          }}
        >
          {(["details", "notices"] as const).map((id) => {
            const isOpen = tab === id;
            return (
              <Box
                key={id}
                role="tab"
                aria-selected={isOpen}
                aria-expanded={isOpen}
                tabIndex={0}
                onClick={() => setTab((cur) => (cur === id ? null : id))}
                onKeyDown={(e) => {
                  if (e.key === " " || e.key === "Enter") {
                    e.preventDefault();
                    setTab((cur) => (cur === id ? null : id));
                  }
                }}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  height: 44,
                  borderRadius: "12px",
                  cursor: "pointer",
                  userSelect: "none",
                  fontFamily: SANS,
                  fontSize: "14px",
                  fontWeight: 700,
                  color: isOpen ? "#2D2D2B" : "rgba(15, 23, 42, 0.62)",
                  background: isOpen
                    ? "rgba(45, 45, 43, 0.08)"
                    : "rgba(255, 255, 255, 0.7)",
                  border: isOpen
                    ? "2px solid #2D2D2B"
                    : "1px solid rgba(0, 0, 0, 0.06)",
                  boxShadow: isOpen
                    ? "0 4px 14px rgba(15, 23, 42, 0.12)"
                    : "0 2px 6px rgba(15, 23, 42, 0.05)",
                  transition: "all 0.15s ease",
                  "&:focus-visible": {
                    outline: "2px solid #2D2D2B",
                    outlineOffset: "2px",
                  },
                }}
              >
                {id === "details"
                  ? t("sheet.details", "Details")
                  : t("sheet.notices", "Notices")}
                <Box
                  component="span"
                  aria-hidden
                  sx={{
                    fontSize: "10px",
                    display: "inline-block",
                    color: isOpen ? "#2D2D2B" : "rgba(15, 23, 42, 0.45)",
                    transform: isOpen ? "rotate(0deg)" : "rotate(-90deg)",
                    transition: "transform 0.2s ease",
                  }}
                >
                  ▼
                </Box>
              </Box>
            );
          })}
        </Box>

        {/* Tab panel — collapsed (max-height: 0) by default; slides open
            when a tab is active. Different content swaps based on which
            tab is open. The whole card shrinks away when both tabs closed
            so the sheet stays compact and Choose Duration stays in view. */}
        <Box
          sx={{
            overflow: "hidden",
            maxHeight: tab === null ? 0 : "1500px",
            opacity: tab === null ? 0 : 1,
            marginTop: tab === null ? 0 : "10px",
            transition:
              "max-height 0.35s ease, opacity 0.25s ease, margin-top 0.25s ease",
            background: "rgba(255, 255, 255, 0.7)",
            backdropFilter: "blur(20px) saturate(180%)",
            WebkitBackdropFilter: "blur(20px) saturate(180%)",
            borderRadius: tab === null ? 0 : "18px",
            boxShadow:
              tab === null ? "none" : "0 4px 14px rgba(15, 23, 42, 0.06)",
          }}
        >
          <Box sx={{ padding: tab === null ? 0 : "16px 18px 18px" }}>
          {tab === null ? null : tab === "details" ? (
            <>
              <Typography
                sx={{
                  fontFamily: SANS,
                  fontSize: "10.5px",
                  fontWeight: 700,
                  color: "rgba(15, 23, 42, 0.55)",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  marginBottom: "8px",
                }}
              >
                Description
              </Typography>
              <Typography
                sx={{
                  fontFamily: SANS,
                  fontSize: "13px",
                  lineHeight: 1.6,
                  color: "rgba(15, 23, 42, 0.78)",
                  textIndent: "16px",
                  marginBottom: "14px",
                }}
              >
                {service.detail}
              </Typography>

              <Typography
                sx={{
                  fontFamily: SANS,
                  fontSize: "10.5px",
                  fontWeight: 700,
                  color: "rgba(15, 23, 42, 0.55)",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  marginBottom: "8px",
                }}
              >
                Benefits
              </Typography>
              <Box component="ul" sx={{ paddingLeft: "20px", margin: 0 }}>
                {service.benefit.map((b) => (
                  <Typography
                    key={b}
                    component="li"
                    sx={{
                      fontFamily: SANS,
                      fontSize: "13px",
                      lineHeight: 1.7,
                      color: "rgba(15, 23, 42, 0.78)",
                    }}
                  >
                    {b}
                  </Typography>
                ))}
              </Box>
            </>
          ) : (
            <>
              <Typography
                sx={{
                  fontFamily: SERIF,
                  fontSize: "14px",
                  fontWeight: 600,
                  color: "#1A2B2E",
                  textAlign: "center",
                  marginBottom: "12px",
                }}
              >
                • {t("sheet.serviceNotes", "Service Notes")} •
              </Typography>
              {SERVICE_NOTE_KEYS.map((noteKey, i) => (
                <Typography
                  key={noteKey}
                  sx={{
                    fontFamily: SANS,
                    fontSize: "13px",
                    lineHeight: 1.6,
                    color: "rgba(15, 23, 42, 0.78)",
                    marginBottom: "10px",
                    paddingLeft: "16px",
                    textIndent: "-16px",
                  }}
                >
                  {i + 1}.&nbsp;&nbsp;{t(noteKey)}
                </Typography>
              ))}
            </>
          )}
          </Box>
        </Box>

        {/* 🎯 CHOOSE DURATION — 3 cards (60 / 90 / 120). Auto-scrolled into
            the vertical center of the sheet on open (founder: 'เห็น 🎯 Choose
            duration อยู่กลางจอเสมอเพื่อเป็นจุดนำสายตา'). */}
        <Typography
          ref={chooseDurationRef}
          sx={{
            fontFamily: SANS,
            fontSize: "10.5px",
            fontWeight: 700,
            color: "rgba(15, 23, 42, 0.55)",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            margin: "20px 0 10px",
            paddingLeft: "4px",
            scrollMarginTop: "20px",
            display: "inline-flex",
            alignItems: "center",
            gap: "5px",
          }}
        >
          <GpsFixedRoundedIcon sx={{ fontSize: 13, color: "#2D2D2B" }} />
          {t("sheet.chooseDuration", "Choose duration")}
        </Typography>
        <Box
          role="radiogroup"
          aria-label="Service duration"
          sx={{ display: "flex", flexDirection: "column", gap: "10px" }}
        >
          {durations.map((min) => {
            const isActive = selected === min;
            const price = priceForDuration(service, min);
            const meta = DURATION_LABELS[min];
            const tagText = meta
              ? t(meta.tagKey)
              : t("sheet.mins", "{{n}} mins", { n: min });
            // 🆕 Founder round 4 (2026-05-01): 'pulse + ขยายใหญ่ขึ้นนิดหน่อย
            //    เหมือนกำลังดิลข้อเสนอ แม้จะเลือกอยู่' — popular tier keeps
            //    pulsing & scaling even after the user selects it.
            const isPopular = !!meta?.popular;
            const shouldPulse = isPopular;
            return (
              <Box
                key={min}
                role="radio"
                aria-checked={isActive}
                tabIndex={0}
                onClick={() => setSelected(min)}
                onKeyDown={(e) => {
                  if (e.key === " " || e.key === "Enter") {
                    e.preventDefault();
                    setSelected(min);
                  }
                }}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  // 🆕 Founder 2026-05-01 round 3: 'ขยายขึ้นนิดหน่อย' for the
                  //    popular tier — bigger padding so the card feels taller
                  //    and a tiny scale-up so it lifts above its neighbours.
                  padding: isPopular ? "18px 18px" : "14px 16px",
                  borderRadius: "16px",
                  cursor: "pointer",
                  userSelect: "none",
                  background: "rgba(255, 255, 255, 0.7)",
                  backdropFilter: "blur(20px) saturate(180%)",
                  WebkitBackdropFilter: "blur(20px) saturate(180%)",
                  border: isActive
                    ? "2px solid #2D2D2B"
                    : isPopular
                      ? "2px solid rgba(15, 23, 42, 0.55)"
                      : "1px solid rgba(0, 0, 0, 0.06)",
                  boxShadow: isActive
                    ? "0 6px 18px rgba(15, 23, 42, 0.15)"
                    : "0 2px 6px rgba(15, 23, 42, 0.05)",
                  transform: isPopular ? "scale(1.025)" : "scale(1)",
                  transformOrigin: "center",
                  transition:
                    "background 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease",
                  animation: shouldPulse
                    ? "popularPulse 2.4s ease-in-out infinite"
                    : "none",
                  "@keyframes popularPulse": {
                    "0%, 100%": {
                      boxShadow:
                        "0 2px 6px rgba(15, 23, 42, 0.05), 0 0 0 0 rgba(15, 23, 42, 0.45)",
                      transform: "scale(1.025)",
                    },
                    "50%": {
                      boxShadow:
                        "0 8px 22px rgba(15, 23, 42, 0.22), 0 0 0 8px rgba(45, 45, 43, 0)",
                      transform: "scale(1.045)",
                    },
                  },
                  "&:focus-visible": {
                    outline: "2px solid #2D2D2B",
                    outlineOffset: "2px",
                  },
                  // Respect reduced-motion preference
                  "@media (prefers-reduced-motion: reduce)": {
                    animation: "none",
                  },
                }}
              >
                <Box
                  aria-hidden
                  sx={{
                    width: 18,
                    height: 18,
                    flexShrink: 0,
                    borderRadius: "50%",
                    border: isActive
                      ? "5px solid #2D2D2B"
                      : "2px solid rgba(0, 0, 0, 0.2)",
                    background: isActive ? "#fff" : "transparent",
                    transition: "all 0.15s ease",
                  }}
                />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography
                    sx={{
                      fontFamily: SERIF,
                      fontSize: "16px",
                      fontWeight: 600,
                      color: "#1A2B2E",
                      lineHeight: 1.1,
                      marginBottom: "2px",
                    }}
                  >
                    {min} min
                  </Typography>
                  <Typography
                    component="span"
                    sx={{
                      fontFamily: SANS,
                      fontSize: "11px",
                      fontWeight: 700,
                      color: isPopular
                        ? "#2D2D2B"
                        : "rgba(15, 23, 42, 0.55)",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "3px",
                    }}
                  >
                    {isPopular && (
                      <StarRoundedIcon
                        sx={{ fontSize: 12, color: "#FFA726" }}
                      />
                    )}
                    {tagText}
                  </Typography>
                </Box>
                <Typography
                  sx={{
                    fontFamily: SERIF,
                    fontSize: "18px",
                    fontWeight: 700,
                    color: isActive ? "#2D2D2B" : "#1A2B2E",
                    letterSpacing: "-0.02em",
                    flexShrink: 0,
                  }}
                >
                  {formatTHB(price)}
                </Typography>
              </Box>
            );
          })}
        </Box>

        {/* 🆕 Phase 5 — Pick date & time wrapped in a soft glass card with
            a serif heading + small status hint. Founder 2026-05-01:
            'Pick date & time เปลี่ยนแบบ ปรับให้สวยขึ้น'. */}
        <Box
          sx={{
            marginTop: "24px",
            padding: "18px 18px 16px",
            borderRadius: "20px",
            background:
              "linear-gradient(180deg, rgba(255, 255, 255, 0.85), rgba(244, 246, 245, 0.85))",
            backdropFilter: "blur(20px) saturate(180%)",
            WebkitBackdropFilter: "blur(20px) saturate(180%)",
            border: "1px solid rgba(214, 40, 40, 0.18)",
            boxShadow: "0 8px 24px rgba(15, 23, 42, 0.08)",
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "14px",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Box
                aria-hidden
                sx={{
                  width: 28,
                  height: 28,
                  borderRadius: "8px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background:
                    "#2D2D2B",
                  color: "#fff",
                  boxShadow: "0 4px 10px rgba(15, 23, 42, 0.25)",
                }}
              >
                <EventRoundedIcon sx={{ fontSize: 16 }} />
              </Box>
              <Typography
                sx={{
                  fontFamily: SERIF,
                  fontSize: "16px",
                  fontWeight: 700,
                  color: "#1A2B2E",
                  letterSpacing: "-0.01em",
                }}
              >
                {t("sheet.pickDateTime", "Pick date & time")}
              </Typography>
            </Box>
            {draftDate && draftTime && (
              <Typography
                sx={{
                  fontFamily: SANS,
                  fontSize: "11px",
                  fontWeight: 700,
                  color: "#14b8a6",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                ✓ Set
              </Typography>
            )}
          </Box>
          <StepDateTime
            date={draftDate}
            time={draftTime}
            durationMin={selected}
            therapistId={therapistId}
            onChange={({ date, time }) => {
              setDraftDate(date);
              setDraftTime(time);
            }}
          />
        </Box>
      </Box>

      {/* Confirm CTA — Round 28s70 (founder "ปุ่มลอย"): the button now
          floats as a detached pill instead of sitting flush at the very
          bottom edge. Bottom padding + iPhone safe-area gives it cream
          breathing room beneath, and the stronger shadow lifts it off
          the sheet. Disabled until date AND time are picked (auto-
          navigates the parent on tap). */}
      <Box
        sx={{
          flexShrink: 0,
          padding: "14px 18px calc(18px + env(safe-area-inset-bottom, 0px))",
          background: "transparent",
        }}
      >
        <Button
          fullWidth
          disabled={!draftDate || !draftTime}
          onClick={() => {
            if (draftDate && draftTime) {
              onConfirm(selected, draftDate, draftTime);
            }
          }}
          sx={{
            height: 50,
            borderRadius: "999px",
            background: "#2D2D2B",
            color: "#fff",
            fontFamily: SANS,
            fontSize: "15px",
            fontWeight: 700,
            letterSpacing: "0.02em",
            textTransform: "none",
            boxShadow: "0 10px 26px rgba(15, 23, 42, 0.40)",
            "&:hover": {
              background: "#2D2D2B",
              boxShadow: "0 12px 30px rgba(15, 23, 42, 0.45)",
            },
            "&.Mui-disabled": {
              background: "rgba(0, 0, 0, 0.12)",
              color: "rgba(0, 0, 0, 0.35)",
              boxShadow: "none",
            },
          }}
        >
          {!draftDate || !draftTime
            ? t("sheet.pickToContinue", "Select a time")
            : `${t("sheet.confirm", "Confirm")} · ${formatTHB(totalPrice)}`}
        </Button>
      </Box>
    </Dialog>
  );
};

export default ServiceDurationSheet;
