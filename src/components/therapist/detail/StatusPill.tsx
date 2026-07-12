// src/components/therapist/detail/StatusPill.tsx
//
// 🎨 Phase 4 — Big availability pill on the detail page (above the
// Service picker). Surfaces the therapist's live status with an
// estimated arrival window so customers know whether they can book
// right now or need to wait.
//
//   Currently Available!   ←  green pill
//   Estimated arrival: 17:41–17:51. Can depart right away!
//
//   Currently Busy         ←  orange pill
//   Available from 19:00. Wait or switch?
//
//   Off duty               ←  gray pill
//   Returns Tomorrow at 14:00.
//
// Pulled from the same status taxonomy used in TherapistCard +
// DetailHero (online / busy / offline) for visual consistency.

import React from "react";
import { Box, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
// 🆕 Round 28ap — BKK-anchored time, used to compute relative
//   "in 2 hours" hint on the next-available subtitle.
// 🆕 Round 28b15 — `prettyHHMM` adds the 12h reading "(7:30 PM)"
//   alongside 24h to remove ambiguity for tourist visitors.
import { nowBKK, parseHHMMatBKK, prettyHHMM } from "@/utils/time";

const SERIF = '"Playfair Display", "Fraunces", Georgia, "Times New Roman", serif';
const SANS = '"Inter", system-ui, -apple-system, sans-serif';

/** Build a "in 2 hours" / "in 35 min" / "tomorrow" hint relative to now-BKK. */
function relativeUntilHHMM(hhmm: string | null | undefined): string | null {
  if (!hhmm) return null;
  const target = parseHHMMatBKK(hhmm);
  if (!target) return null;
  const now = nowBKK();
  // If the target HH:mm has already passed today, assume tomorrow.
  let diffMin = target.diff(now, "minute");
  if (diffMin < 0) {
    diffMin = target.add(1, "day").diff(now, "minute");
  }
  if (diffMin < 60) return `in ${diffMin} min`;
  const hours = Math.round(diffMin / 60);
  if (hours < 24) return `in ${hours} hour${hours === 1 ? "" : "s"}`;
  return "tomorrow";
}

export type AvailabilityStatus = "online" | "busy" | "offline";

interface Props {
  status: AvailabilityStatus;
  /** 🆕 28t.9 — when provided, the whole pill becomes a tappable button
   *  (founder: "กดได้ ให้เชื่อมต่อไปที่ แถบ services"). A trailing arrow +
   *  bounce animation signal the affordance. */
  onClick?: () => void;
  /** Optional therapist next-available HH:mm — used for busy/offline copy */
  nextAvailable?: string | null;
  /** 🆕 Round 28b9 — when status === "online" but the therapist has
   *  a future booking on the schedule (within today's shift), pass
   *  the next booking start time HH:mm here. The pill will append
   *  "Next booked at HH:mm" to the subtitle so customers see
   *  upcoming sessions without opening the time picker. */
  nextBookingAt?: string | null;
  /** "Apartment" / "Hotel" — used for arrival hint copy */
  arriveLowerBoundMin?: number; // default 25
  arriveUpperBoundMin?: number; // default 45
}

const VARIANTS: Record<
  AvailabilityStatus,
  {
    icon: string;
    title: string;
    titleKey: string;
    bg: string;
    border: string;
    fg: string;
    iconBg: string;
  }
> = {
  online: {
    icon: "✓",
    // Round 28s61 — `title` kept as the English fallback; the
    // rendered label now goes through t("detail.status.*") so
    // ZH/JA/KO/TH visitors see their language.
    // 🆕 Round 28r81 — Shifted from sage-tint bg (rgba(22,163,74,x))
    //   to the accent mint tint (#e8f8f5) + teal border for the
    //   "available now" state. Text/icon fg kept sage green for the
    //   ONLINE dot semantic (r70 rule) — mint is bg-only.
    title: "Currently Available!",
    titleKey: "detail.status.available",
    bg: "rgba(87, 184, 139, 0.10)",
    border: "rgba(87, 184, 139, 0.30)",
    fg: "#2E7D57",
    iconBg: "#57B88B",
  },
  busy: {
    icon: "⏱",
    title: "Currently Busy",
    titleKey: "detail.status.busy",
    bg: "rgba(249, 115, 22, 0.08)",
    border: "rgba(249, 115, 22, 0.25)",
    fg: "#f97316",
    iconBg: "#f97316",
  },
  offline: {
    icon: "💤",
    title: "Off duty",
    titleKey: "detail.status.offline",
    bg: "rgba(15, 23, 42, 0.05)",
    border: "rgba(15, 23, 42, 0.12)",
    fg: "rgba(15, 23, 42, 0.6)",
    iconBg: "rgba(15, 23, 42, 0.4)",
  },
};

const StatusPill: React.FC<Props> = ({
  status,
  onClick,
  nextAvailable,
  nextBookingAt,
  arriveLowerBoundMin = 25,
  arriveUpperBoundMin = 45,
}) => {
  const { t } = useTranslation();
  const v = VARIANTS[status];
  const titleText = t(v.titleKey, v.title);

  // 🆕 Round 28ap — richer subtitle with relative time hints so the
  //   customer sees BOTH the wall-clock and "how long from now". All
  //   anchored to BKK via /utils/time.
  const now = nowBKK();
  const relHint = relativeUntilHHMM(nextAvailable ?? null);

  // 🆕 Round 28b15 — wrap every wall-clock time in `prettyHHMM()` so
  //   subtitles read e.g. "Available from 21:00 (9:00 PM)" rather than
  //   ambiguous "21:00". Tourist-friendly without losing 24h precision.
  let subtitle = "";
  if (status === "online") {
    const lo = now.add(arriveLowerBoundMin, "minute").format("HH:mm");
    const hi = now.add(arriveUpperBoundMin, "minute").format("HH:mm");
    // 🆕 Round 28b39 — wrap with prettyHHMM so "00:34–00:54" shows
    //   "00:34 AM–00:54 AM" — eliminates after-midnight confusion.
    subtitle = `Estimated arrival: ${prettyHHMM(lo)}–${prettyHHMM(hi)}.`;
    if (nextBookingAt) {
      const bookHint = relativeUntilHHMM(nextBookingAt);
      subtitle += ` Next booked at ${prettyHHMM(nextBookingAt)}${
        bookHint ? ` · ${bookHint}` : ""
      }.`;
    } else {
      subtitle += " Can depart right away!";
    }
  } else if (status === "busy") {
    subtitle = nextAvailable
      ? `Available from ${prettyHHMM(nextAvailable)}${
          relHint ? ` · ${relHint}` : ""
        }. Wait or switch?`
      : "On a session right now. Wait or switch?";
  } else {
    subtitle = nextAvailable
      ? `Returns at ${prettyHHMM(nextAvailable)}${relHint ? ` · ${relHint}` : ""}`
      : "Returns next shift.";
  }

  // 🆕 28t.9 — compact, tappable pill with a gentle bounce affordance.
  const clickable = typeof onClick === "function";
  return (
    <Box
      component={clickable ? "button" : "div"}
      type={clickable ? "button" : undefined}
      onClick={onClick}
      aria-label={clickable ? `${titleText} — see services` : undefined}
      sx={{
        all: clickable ? "unset" : undefined,
        boxSizing: "border-box",
        width: "auto",
        margin: "12px 14px 0",
        padding: "9px 12px",
        borderRadius: "12px",
        background: v.bg,
        border: `1px solid ${v.border}`,
        borderLeft: `3px solid ${v.fg}`,
        display: "flex",
        alignItems: "center",
        gap: "9px",
        cursor: clickable ? "pointer" : "default",
        transition: "transform 0.16s ease, box-shadow 0.16s ease",
        "&:hover": clickable
          ? { transform: "translateY(-1px)", boxShadow: `0 6px 16px ${v.border}` }
          : undefined,
        "&:active": clickable ? { transform: "scale(0.99)" } : undefined,
        "&:focus-visible": clickable
          ? { outline: `2px solid ${v.fg}`, outlineOffset: 2 }
          : undefined,
      }}
    >
      {/* icon — gentle bounce */}
      <Box
        sx={{
          width: 24,
          height: 24,
          flexShrink: 0,
          borderRadius: "50%",
          background: v.iconBg,
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "12px",
          fontWeight: 800,
          animation:
            status === "online" ? "srPillBounce 1.6s ease-in-out infinite" : "none",
          "@keyframes srPillBounce": {
            "0%, 100%": { transform: "translateY(0)" },
            "50%": { transform: "translateY(-2.5px)" },
          },
          "@media (prefers-reduced-motion: reduce)": { animation: "none" },
        }}
      >
        {v.icon}
      </Box>
      <Box sx={{ flex: 1, minWidth: 0, textAlign: "left" }}>
        <Typography
          sx={{
            fontFamily: SERIF,
            fontSize: "13px",
            fontWeight: 700,
            color: "#232B36",
            lineHeight: 1.2,
          }}
        >
          {titleText}
        </Typography>
        <Typography
          sx={{
            fontFamily: SANS,
            fontSize: "10.5px",
            color: "#5C6573",
            lineHeight: 1.35,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {subtitle}
        </Typography>
      </Box>
      {/* tap affordance — nudging arrow */}
      {clickable && (
        <Box
          aria-hidden
          sx={{
            flexShrink: 0,
            color: v.fg,
            fontSize: "16px",
            fontWeight: 700,
            animation: "srPillNudge 1.4s ease-in-out infinite",
            "@keyframes srPillNudge": {
              "0%, 100%": { transform: "translateX(0)" },
              "50%": { transform: "translateX(3px)" },
            },
            "@media (prefers-reduced-motion: reduce)": { animation: "none" },
          }}
        >
          ›
        </Box>
      )}
    </Box>
  );
};

export default StatusPill;
