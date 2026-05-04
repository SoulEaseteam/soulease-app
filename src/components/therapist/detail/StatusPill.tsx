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
// 🆕 Round 28ap — BKK-anchored time, used to compute relative
//   "in 2 hours" hint on the next-available subtitle.
// 🆕 Round 28b15 — `prettyHHMM` adds the 12h reading "(7:30 PM)"
//   alongside 24h to remove ambiguity for tourist visitors.
import { nowBKK, parseHHMMatBKK, prettyHHMM } from "@/utils/time";

const SERIF = '"Fraunces", Georgia, "Times New Roman", serif';
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
    bg: string;
    border: string;
    fg: string;
    iconBg: string;
  }
> = {
  online: {
    icon: "✓",
    title: "Currently Available!",
    bg: "rgba(22, 163, 74, 0.08)",
    border: "rgba(22, 163, 74, 0.25)",
    fg: "#16a34a",
    iconBg: "#16a34a",
  },
  busy: {
    icon: "⏱",
    title: "Currently Busy",
    bg: "rgba(249, 115, 22, 0.08)",
    border: "rgba(249, 115, 22, 0.25)",
    fg: "#f97316",
    iconBg: "#f97316",
  },
  offline: {
    icon: "💤",
    title: "Off duty",
    bg: "rgba(60, 30, 20, 0.05)",
    border: "rgba(60, 30, 20, 0.12)",
    fg: "rgba(60, 30, 20, 0.6)",
    iconBg: "rgba(60, 30, 20, 0.4)",
  },
};

const StatusPill: React.FC<Props> = ({
  status,
  nextAvailable,
  nextBookingAt,
  arriveLowerBoundMin = 25,
  arriveUpperBoundMin = 45,
}) => {
  const v = VARIANTS[status];

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
    subtitle = `Estimated arrival: ${lo}–${hi}.`;
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

  return (
    <Box
      sx={{
        margin: "16px 14px 0",
        padding: "12px 14px",
        borderRadius: "14px",
        background: v.bg,
        borderLeft: `4px solid ${v.fg}`,
        border: `1px solid ${v.border}`,
        borderLeftWidth: "4px",
        display: "flex",
        alignItems: "flex-start",
        gap: "10px",
      }}
    >
      <Box
        sx={{
          width: 28,
          height: 28,
          flexShrink: 0,
          borderRadius: "50%",
          background: v.iconBg,
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "13px",
          fontWeight: 800,
          marginTop: "1px",
        }}
      >
        {v.icon}
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          sx={{
            fontFamily: SERIF,
            fontSize: "15px",
            fontWeight: 700,
            color: "#3c1e14",
            lineHeight: 1.2,
            marginBottom: "2px",
          }}
        >
          {v.title}
        </Typography>
        <Typography
          sx={{
            fontFamily: SANS,
            fontSize: "11.5px",
            color: "rgba(60, 30, 20, 0.7)",
            lineHeight: 1.4,
          }}
        >
          {subtitle}
        </Typography>
      </Box>
    </Box>
  );
};

export default StatusPill;
