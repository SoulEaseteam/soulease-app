// src/components/booking/StepDateTime.tsx
//
// 🎨 Phase 3 Booking — Step 2 Date + Time picker.
//
// Two parts:
//   1. Date pills — horizontal scroll, 7 days starting today.
//      "Today" / "Tomorrow" / "Wed Apr 30" pattern.
//   2. Time slot grid — 30-min increments, grouped by daypart
//      (Morning 06-12, Afternoon 12-17, Evening 17-21, Night 21-06).
//
// Filtering rules:
//   • If a therapist is preselected, slots must fit within their
//     `startTime..endTime` window. Overnight shifts (start > end) are
//     supported — slots after midnight are labeled with "+1d".
//   • Slot must end BEFORE therapist's endTime so the session fits
//     (slot + service duration ≤ endTime).
//   • Today only: slots must be at least 60 min in the future
//     (BRAND.md "average arrival 60 min").
//   • If no therapist preselected, default to 09:00–22:00.
//
// 🚧 NOT YET WIRED (commit 6):
//   • Cross-checking against existing Firestore bookings (no double-book)
//   • Therapist holiday/break overrides from `useTherapists` live data
//
// Accessibility: Each pill/slot is `role="button"` with aria-pressed.

import React, { useMemo, useState, useEffect } from "react";
import { Box, Typography } from "@mui/material";
import dayjs from "dayjs";
import therapistsData from "@/data/therapists";

const SERIF = '"Fraunces", Georgia, "Times New Roman", serif';
const SANS = '"Inter", system-ui, -apple-system, sans-serif';

const SLOT_INCREMENT_MIN = 30;
const TODAY_MIN_LEAD_MIN = 60; // can't book within 60 min of now

interface Props {
  /** Currently selected YYYY-MM-DD (null = nothing picked) */
  date: string | null;
  /** Currently selected HH:mm (null = nothing picked) */
  time: string | null;
  /** Required to filter slots fit within startTime..endTime */
  durationMin: number | null;
  /** Therapist context — falls back to default working hours if null */
  therapistId: string | null;
  /** Called when date OR time changes. Resets time when date changes. */
  onChange: (next: { date: string; time: string | null }) => void;
}

// ── helpers
function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}
function fromMinutes(mins: number): string {
  const m = ((mins % 1440) + 1440) % 1440; // wrap
  const h = Math.floor(m / 60);
  const min = m % 60;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

// Build the list of valid slot start-times for a given day, given the
// therapist's shift and the service duration.
function buildSlots(
  date: dayjs.Dayjs,
  startTime: string,
  endTime: string,
  durationMin: number
): { time: string; nextDay: boolean }[] {
  const start = toMinutes(startTime);
  const end = toMinutes(endTime);
  const isOvernight = end <= start; // 19:00 → 05:00

  // Effective end: in overnight mode the shift extends past midnight.
  // Slots are placed in absolute minutes from `start` (0..shiftLen).
  const shiftLen = isOvernight ? 1440 - start + end : end - start;
  const lastSlotOffset = shiftLen - durationMin; // last slot start
  if (lastSlotOffset < 0) return [];

  const slots: { time: string; nextDay: boolean }[] = [];

  // For "today", reject slots that start in the past (or within lead time).
  const isToday = date.isSame(dayjs(), "day");
  const earliestNowMin = isToday
    ? dayjs().hour() * 60 + dayjs().minute() + TODAY_MIN_LEAD_MIN
    : -Infinity;

  for (let off = 0; off <= lastSlotOffset; off += SLOT_INCREMENT_MIN) {
    const absMin = start + off; // could exceed 1440
    const nextDay = absMin >= 1440;
    const slotMin = absMin % 1440;

    // Lead-time check (only meaningful when slot is on `date` itself, not nextDay)
    if (!nextDay && slotMin < earliestNowMin) continue;

    slots.push({
      time: fromMinutes(slotMin),
      nextDay,
    });
  }
  return slots;
}

// Group slots into dayparts for visual sectioning.
function groupSlots(slots: { time: string; nextDay: boolean }[]) {
  const groups: Record<string, { time: string; nextDay: boolean }[]> = {
    morning: [],
    afternoon: [],
    evening: [],
    night: [],
  };
  for (const s of slots) {
    const h = parseInt(s.time.split(":")[0], 10);
    if (h >= 6 && h < 12) groups.morning.push(s);
    else if (h >= 12 && h < 17) groups.afternoon.push(s);
    else if (h >= 17 && h < 21) groups.evening.push(s);
    else groups.night.push(s);
  }
  return groups;
}

const StepDateTime: React.FC<Props> = ({
  date,
  time,
  durationMin,
  therapistId,
  onChange,
}) => {
  const [internalDate, setInternalDate] = useState<dayjs.Dayjs>(
    date ? dayjs(date) : dayjs()
  );

  // If the parent clears the date, sync.
  useEffect(() => {
    if (!date) setInternalDate(dayjs());
  }, [date]);

  const therapist = useMemo(
    () => therapistsData.find((t) => t.id === therapistId),
    [therapistId]
  );

  const startTime = therapist?.startTime || "09:00";
  const endTime = therapist?.endTime || "22:00";

  // Build the 7-day pill list.
  const days = useMemo(() => {
    return Array.from({ length: 7 }).map((_, i) => dayjs().add(i, "day"));
  }, []);

  // Build slots for the active date.
  const slotGroups = useMemo(() => {
    if (!durationMin) return null;
    const slots = buildSlots(internalDate, startTime, endTime, durationMin);
    return groupSlots(slots);
  }, [internalDate, startTime, endTime, durationMin]);

  const selectDate = (d: dayjs.Dayjs) => {
    setInternalDate(d);
    onChange({ date: d.format("YYYY-MM-DD"), time: null });
  };
  const selectTime = (t: string) => {
    onChange({ date: internalDate.format("YYYY-MM-DD"), time: t });
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Date pills — horizontal scroll */}
      <Box>
        <Box
          sx={{
            display: "flex",
            gap: "8px",
            overflowX: "auto",
            paddingBottom: "4px",
            scrollSnapType: "x mandatory",
            "&::-webkit-scrollbar": { display: "none" },
            scrollbarWidth: "none",
          }}
        >
          {days.map((d, i) => {
            const isActive = d.isSame(internalDate, "day");
            const label = i === 0 ? "Today" : i === 1 ? "Tomorrow" : d.format("ddd");
            const sub = i <= 1 ? d.format("MMM D") : d.format("MMM D");
            return (
              <Box
                key={d.format("YYYY-MM-DD")}
                role="button"
                tabIndex={0}
                aria-pressed={isActive}
                onClick={() => selectDate(d)}
                onKeyDown={(e) => {
                  if (e.key === " " || e.key === "Enter") {
                    e.preventDefault();
                    selectDate(d);
                  }
                }}
                sx={{
                  flexShrink: 0,
                  minWidth: 72,
                  padding: "10px 14px",
                  borderRadius: "16px",
                  cursor: "pointer",
                  scrollSnapAlign: "start",
                  textAlign: "center",
                  background: isActive
                    ? "linear-gradient(135deg, #FE0944, #FE7A52)"
                    : "rgba(255, 255, 255, 0.65)",
                  color: isActive ? "#fff" : "#3c1e14",
                  border: isActive
                    ? "none"
                    : "1px solid rgba(0, 0, 0, 0.06)",
                  boxShadow: isActive
                    ? "0 6px 18px rgba(254, 9, 68, 0.25)"
                    : "0 2px 8px rgba(126, 30, 46, 0.05)",
                  fontFamily: SANS,
                  transition: "all 0.2s ease",
                  "&:focus-visible": {
                    outline: "2px solid #FE0944",
                    outlineOffset: "2px",
                  },
                }}
              >
                <Typography
                  sx={{
                    fontFamily: SANS,
                    fontSize: "11px",
                    fontWeight: 600,
                    opacity: 0.85,
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                  }}
                >
                  {label}
                </Typography>
                <Typography
                  sx={{
                    fontFamily: SERIF,
                    fontSize: "15px",
                    fontWeight: 600,
                    letterSpacing: "-0.01em",
                  }}
                >
                  {sub}
                </Typography>
              </Box>
            );
          })}
        </Box>
        {therapist && (
          <Typography
            sx={{
              fontFamily: SANS,
              fontSize: "11.5px",
              color: "rgba(60, 30, 20, 0.55)",
              marginTop: "10px",
              paddingLeft: "4px",
            }}
          >
            {therapist.name}&rsquo;s shift: {startTime}&ndash;{endTime}
            {toMinutes(endTime) <= toMinutes(startTime) ? " (overnight)" : ""}
          </Typography>
        )}
      </Box>

      {/* Time slot grid */}
      {!durationMin ? (
        <Typography
          sx={{
            fontFamily: SANS,
            color: "rgba(60, 30, 20, 0.5)",
            textAlign: "center",
            padding: "40px 20px",
            fontStyle: "italic",
          }}
        >
          Pick a service first
        </Typography>
      ) : !slotGroups ||
        Object.values(slotGroups).every((g) => g.length === 0) ? (
        <Box
          sx={{
            background: "rgba(255, 255, 255, 0.5)",
            borderRadius: "16px",
            padding: "32px 20px",
            textAlign: "center",
          }}
        >
          <Typography
            sx={{
              fontFamily: SERIF,
              fontSize: "16px",
              color: "#3c1e14",
              marginBottom: "4px",
            }}
          >
            No slots available
          </Typography>
          <Typography
            sx={{
              fontFamily: SANS,
              fontSize: "12px",
              color: "rgba(60, 30, 20, 0.6)",
            }}
          >
            Try another day or another therapist.
          </Typography>
        </Box>
      ) : (
        <Box sx={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {(["morning", "afternoon", "evening", "night"] as const).map(
            (key) => {
              const group = slotGroups[key];
              if (group.length === 0) return null;
              const labels: Record<typeof key, string> = {
                morning: "Morning",
                afternoon: "Afternoon",
                evening: "Evening",
                night: "Night",
              };
              return (
                <Box key={key}>
                  <Typography
                    sx={{
                      fontFamily: SANS,
                      fontSize: "11px",
                      fontWeight: 700,
                      color: "rgba(60, 30, 20, 0.55)",
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      marginBottom: "8px",
                      paddingLeft: "4px",
                    }}
                  >
                    {labels[key]}
                  </Typography>
                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: "repeat(3, 1fr)",
                      gap: "8px",
                    }}
                  >
                    {group.map((s) => {
                      const isActive = time === s.time;
                      return (
                        <Box
                          key={`${s.time}-${s.nextDay ? "nd" : "sd"}`}
                          role="button"
                          tabIndex={0}
                          aria-pressed={isActive}
                          onClick={() => selectTime(s.time)}
                          onKeyDown={(e) => {
                            if (e.key === " " || e.key === "Enter") {
                              e.preventDefault();
                              selectTime(s.time);
                            }
                          }}
                          sx={{
                            padding: "10px 0",
                            borderRadius: "12px",
                            cursor: "pointer",
                            textAlign: "center",
                            background: isActive
                              ? "linear-gradient(135deg, #FE0944, #FE7A52)"
                              : "rgba(255, 255, 255, 0.65)",
                            color: isActive ? "#fff" : "#3c1e14",
                            border: isActive
                              ? "none"
                              : "1px solid rgba(0, 0, 0, 0.06)",
                            fontFamily: SANS,
                            fontSize: "13.5px",
                            fontWeight: 600,
                            letterSpacing: "0.01em",
                            boxShadow: isActive
                              ? "0 4px 12px rgba(254, 9, 68, 0.25)"
                              : "0 2px 6px rgba(126, 30, 46, 0.05)",
                            transition: "all 0.15s ease",
                            "&:focus-visible": {
                              outline: "2px solid #FE0944",
                              outlineOffset: "2px",
                            },
                          }}
                        >
                          {s.time}
                          {s.nextDay && (
                            <Typography
                              component="span"
                              sx={{
                                fontSize: "9px",
                                fontWeight: 600,
                                opacity: 0.7,
                                marginLeft: "4px",
                              }}
                            >
                              +1d
                            </Typography>
                          )}
                        </Box>
                      );
                    })}
                  </Box>
                </Box>
              );
            }
          )}
        </Box>
      )}
    </Box>
  );
};

export default StepDateTime;
