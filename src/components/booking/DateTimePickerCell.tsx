// src/components/booking/DateTimePickerCell.tsx
//
// 🎨 Phase 4 — Compact tappable cell on DetailPage that summarizes the
// chosen date+time. Tap → opens DateTimeSheet (full picker).
//
// States:
//   • muted (no service yet) — "Pick a service first"
//   • empty                  — "When works for you? · Pick date & time"
//   • date only              — "Today · pick a time"
//   • full                   — "Today · 17:00 · 1h 30m"
//
// Mirrors the StepService card style so the two pickers feel uniform on
// the detail page (rounded white card, › chevron affordance).

import React from "react";
import { Box, Typography } from "@mui/material";
import dayjs from "dayjs";

const SERIF = '"Fraunces", Georgia, "Times New Roman", serif';
const SANS = '"Inter", system-ui, -apple-system, sans-serif';

interface Props {
  date: string | null;
  time: string | null;
  durationMin: number | null;
  /** When false → cell is muted ("Pick a service first") and not tappable */
  enabled: boolean;
  onClick: () => void;
}

const DateTimePickerCell: React.FC<Props> = ({
  date,
  time,
  durationMin,
  enabled,
  onClick,
}) => {
  // Build the right-hand summary string
  let summary = "Pick date & time";
  if (!enabled) {
    summary = "Pick a service first";
  } else if (date && time) {
    const dayLabel = dayjs(date).isSame(dayjs(), "day")
      ? "Today"
      : dayjs(date).isSame(dayjs().add(1, "day"), "day")
      ? "Tomorrow"
      : dayjs(date).format("ddd · MMM D");
    summary = `${dayLabel} · ${time}`;
  } else if (date) {
    const dayLabel = dayjs(date).isSame(dayjs(), "day")
      ? "Today"
      : dayjs(date).format("ddd · MMM D");
    summary = `${dayLabel} · pick a time`;
  }

  const durationLabel = durationMin
    ? durationMin >= 60
      ? `${Math.floor(durationMin / 60)}h${
          durationMin % 60 ? ` ${durationMin % 60}m` : ""
        }`
      : `${durationMin}m`
    : null;

  const filled = enabled && !!date && !!time;

  return (
    <Box
      role={enabled ? "button" : undefined}
      tabIndex={enabled ? 0 : -1}
      aria-disabled={!enabled}
      onClick={() => {
        if (enabled) onClick();
      }}
      onKeyDown={(e) => {
        if (!enabled) return;
        if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          onClick();
        }
      }}
      sx={{
        display: "flex",
        alignItems: "center",
        gap: "14px",
        padding: "16px 18px",
        borderRadius: "16px",
        cursor: enabled ? "pointer" : "default",
        userSelect: "none",
        background: enabled
          ? "rgba(255, 255, 255, 0.7)"
          : "rgba(255, 255, 255, 0.4)",
        backdropFilter: "blur(20px) saturate(180%)",
        WebkitBackdropFilter: "blur(20px) saturate(180%)",
        border: filled
          ? "2px solid #FE0944"
          : "1px solid rgba(0, 0, 0, 0.06)",
        boxShadow: filled
          ? "0 6px 18px rgba(254, 9, 68, 0.12)"
          : "0 2px 8px rgba(126, 30, 46, 0.05)",
        opacity: enabled ? 1 : 0.55,
        transition: "all 0.15s ease",
        "&:hover": enabled
          ? { background: "rgba(255, 255, 255, 0.85)" }
          : undefined,
        "&:focus-visible": enabled
          ? { outline: "2px solid #FE0944", outlineOffset: "2px" }
          : undefined,
      }}
    >
      {/* 🗓 icon */}
      <Box
        sx={{
          width: 40,
          height: 40,
          flexShrink: 0,
          borderRadius: "12px",
          background: filled
            ? "linear-gradient(135deg, rgba(254, 9, 68, 0.14), rgba(254, 122, 82, 0.14))"
            : "rgba(254, 201, 167, 0.35)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "20px",
        }}
      >
        🗓
      </Box>

      {/* Body */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          sx={{
            fontFamily: SANS,
            fontSize: "10.5px",
            fontWeight: 700,
            color: "rgba(60, 30, 20, 0.55)",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            marginBottom: "2px",
          }}
        >
          Date &amp; time
        </Typography>
        <Typography
          sx={{
            fontFamily: SERIF,
            fontSize: filled ? "16px" : "15px",
            fontWeight: 600,
            color: filled ? "#3c1e14" : "rgba(60, 30, 20, 0.55)",
            lineHeight: 1.2,
          }}
        >
          {summary}
        </Typography>
        {filled && durationLabel && (
          <Typography
            sx={{
              fontFamily: SANS,
              fontSize: "11.5px",
              color: "rgba(60, 30, 20, 0.6)",
              marginTop: "2px",
            }}
          >
            {durationLabel} session
          </Typography>
        )}
      </Box>

      {/* › chevron */}
      {enabled && (
        <Box
          aria-hidden
          sx={{
            fontSize: "20px",
            color: filled ? "#FE0944" : "rgba(60, 30, 20, 0.35)",
            flexShrink: 0,
            fontWeight: 800,
          }}
        >
          ›
        </Box>
      )}
    </Box>
  );
};

export default DateTimePickerCell;
