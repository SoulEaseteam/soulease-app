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
import { useTranslation } from "react-i18next";
// Round 28s64 — MUI bolt replaces the ⚡ emoji on the earliest-slot
// banner (CLAUDE.md §3 no-emoji rule).
import FlashOnRoundedIcon from "@mui/icons-material/FlashOnRounded";
import dayjs from "dayjs";
// 🆕 Round 28r79 — r68 pattern (hardcoded fast-path + Firestore
//   fallback) so admin-added therapists surface their real working
//   hours instead of the 09:00–22:00 default.
import {
  findHardcodedTherapist,
  findTherapistOrFetch,
} from "@/utils/therapistLookup";
import type { Therapist } from "@/types/therapist";
// 🆕 Round 28an — anchor all "now" / "today" comparisons to BKK so the
//    time picker filters past slots correctly even if the user's phone
//    is on a different timezone or has clock drift.
import { nowBKK, prettyHHMM } from "@/utils/time";
// 🆕 Phase 5 — Cross-check candidate slots against live Firestore bookings
//    so the same therapist can never be double-booked. The hook returns
//    [] while the therapist id is null (no live data), which means slots
//    behave as before until we have something to compare against.
import {
  useTherapistBookings,
  isSlotTaken,
} from "@/utils/useTherapistBookings";

const SERIF = '"Playfair Display", "Fraunces", Georgia, "Times New Roman", serif';
const SANS = '"Inter", system-ui, -apple-system, sans-serif';

const SLOT_INCREMENT_MIN = 30;
// 🆕 Round 28ao (founder 2026-05-03): จองล่วงหน้าอย่างน้อย 10 นาที
//   เพื่อให้พนักงานเตรียมตัว (gentle minimum — therapist needs to
//   acknowledge the booking + start traveling).
const TODAY_MIN_LEAD_MIN = 10;
// 🆕 Round 28ao — gap reserved AROUND every existing booking of the same
//   therapist, so they have time to wrap up + travel between locations.
//   Round 28s69 (founder "เวลาอื่นๆ เผื่อเวลา 20นาที") — bumped 10 → 20
//   min, and isSlotTaken now applies it on BOTH sides of a booking
//   (travel-to + travel-away), so the slots adjacent to a reserved
//   session are blocked while every other slot stays bookable.
const BOOKING_BUFFER_MIN = 20;
// 🆕 Round 28b50 (founder 2026-05-05) — Reverted Round 28b41's
//   "20-min before shift end" rule. Founder direction:
//   "ทุกออเดอสามารถจองได้หมดหากอยู่ในเวลางาน" — every booking is
//   allowed as long as the slot's START time is within the working
//   window. The session can extend past shift end (= overtime); the
//   therapist accepts. Set buffer to 0 + the loops below also stop
//   subtracting `durationMin` from the last bookable offset so a
//   90-min booking starting at 4:30 AM (ending 6:00 AM) is allowed
//   even when shift ends 5:00 AM. Constant kept for clarity in case
//   we want to re-introduce a small wrap-up gap later.
const SHIFT_END_BUFFER_MIN = 0;

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

// 🆕 Round 28b42 (founder 2026-05-05) — Slot kind tag.
//   "tail" = overnight shift carrying over from YESTERDAY (today's
//            morning slots inside the still-active shift).
//   "main" = the regular shift starting today.
//   Used downstream to split the NIGHT bucket into 3 visually
//   distinct sub-sections so the sort doesn't look "jumbled".
type Slot = { time: string; nextDay: boolean; kind: "tail" | "main" };

// Build the list of valid slot start-times for a given day, given the
// therapist's shift and the service duration.
function buildSlots(
  date: dayjs.Dayjs,
  startTime: string,
  endTime: string,
  durationMin: number
): Slot[] {
  const start = toMinutes(startTime);
  const end = toMinutes(endTime);
  const isOvernight = end <= start; // 19:00 → 05:00

  // Effective end: in overnight mode the shift extends past midnight.
  // Slots are placed in absolute minutes from `start` (0..shiftLen).
  const shiftLen = isOvernight ? 1440 - start + end : end - start;
  // 🆕 Round 28b50 (founder 2026-05-05) — Slot START must be within
  //   working window — the session may extend past shift end (OT).
  //   `lastSlotOffset = shiftLen - 1` lets the last slot start at the
  //   last minute of the shift (rounded onto the 30-min grid by the
  //   loop below). Was `shiftLen - durationMin - SHIFT_END_BUFFER_MIN`
  //   which was the strict "session must finish before shift end -
  //   20 min" rule.
  const lastSlotOffset = shiftLen - 1;
  if (lastSlotOffset < 0) return [];

  const slots: Slot[] = [];

  // 🆕 Round 28an — "today" is the BKK calendar day (not user's local).
  //    Past slots are filtered out + a small lead-time so the customer
  //    has time to confirm + the therapist has time to travel.
  //    Re-rendered every minute via the parent's <NowTicker/> so the
  //    list shrinks live as time passes.
  const nowBkk = nowBKK();
  const isToday = date.format("YYYY-MM-DD") === nowBkk.format("YYYY-MM-DD");
  const nowMin = nowBkk.hour() * 60 + nowBkk.minute();
  const earliestNowMin = isToday ? nowMin + TODAY_MIN_LEAD_MIN : -Infinity;

  // 🆕 Round 28b40 (founder 2026-05-04) — Overnight tail support.
  //   Bug: at 00:46 AM with shift 19:00–05:00, the picker showed
  //   "No slots available" on TODAY tab. Reason: buildSlots only
  //   considered the shift starting "today at 19:00" (still 18h
  //   away), and ignored the still-active overnight shift that
  //   started YESTERDAY 19:00 → ends TODAY 05:00.
  //   Fix: when we're currently inside an overnight tail (nowMin <
  //   end on today's calendar with isOvernight=true), prepend slots
  //   from now → end of that still-active shift. Customer can book
  //   immediately within the next 4h without flipping to "yesterday".
  if (isToday && isOvernight && nowMin < end) {
    const tailStart = Math.max(earliestNowMin, 0);
    // 🆕 Round 28b50 — Slot start can extend right up to shift end
    //   (session goes into OT). `tailLastSlot = end - 1` so the last
    //   30-min grid slot before midnight lands fairly. Was
    //   `end - durationMin - SHIFT_END_BUFFER_MIN`.
    const tailLastSlot = end - 1;

    // 🆕 Round 28b45 (founder 2026-05-05) — Instant slot.
    //   Previously the FIRST tail slot was rounded UP to the next
    //   30-min boundary, so a customer arriving at 2:00 AM saw
    //   "earliest 2:30" — a 30-min wait even though the therapist
    //   is available right now. New rule: emit ONE slot at exactly
    //   now+10min rounded to the next 5-min boundary, then continue
    //   on the regular 30-min grid. Skip the instant slot if the
    //   30-min boundary is < 15 min away (would otherwise show two
    //   slots only minutes apart).
    const next30 = Math.ceil(tailStart / SLOT_INCREMENT_MIN) * SLOT_INCREMENT_MIN;
    const instantMin5 = Math.ceil(tailStart / 5) * 5;
    // 🆕 Round 28b52 (founder 2026-05-05) — Force-show instant slot
    //   when the next 30-min grid boundary lies BEYOND the tail's last
    //   bookable slot (i.e., the main loop will produce zero slots
    //   anyway). Previously the 15-min gap rule could skip the instant
    //   slot AND the main loop, leaving the customer with no tail
    //   slots at all even though the therapist is still in shift.
    //   Example: now=04:36 with shift end 05:00 → instant=04:50 (10 min
    //   from next30=05:00 — below 15-min threshold) AND next30 > 299
    //   (last bookable) → 0 slots before this fix.
    const noMainSlotsWillRender = next30 > tailLastSlot;
    if (
      instantMin5 <= tailLastSlot &&
      (noMainSlotsWillRender || next30 - instantMin5 >= 15)
    ) {
      slots.push({
        time: fromMinutes(instantMin5),
        nextDay: false,
        kind: "tail",
      });
    }

    // Regular 30-min grid for the rest of the tail
    for (let m = next30; m <= tailLastSlot; m += SLOT_INCREMENT_MIN) {
      slots.push({
        time: fromMinutes(m),
        nextDay: false,
        kind: "tail",
      });
    }
  }

  // 🆕 Round 28b45 (founder 2026-05-05) — Instant slot for non-overnight
  //   active shifts AND for overnight shifts when we're already in the
  //   PRE-midnight portion (nowMin >= start). Same rule: now+10 rounded
  //   to 5-min, only if the next 30-min grid boundary is ≥ 15 min away.
  const inDaytimeOrPreMidnight =
    isToday &&
    ((isOvernight && nowMin >= start) ||
      (!isOvernight && nowMin >= start && nowMin < end));
  if (inDaytimeOrPreMidnight) {
    const targetMin = nowMin + TODAY_MIN_LEAD_MIN;
    const instantMin5 = Math.ceil(targetMin / 5) * 5;
    const next30 = Math.ceil(targetMin / SLOT_INCREMENT_MIN) * SLOT_INCREMENT_MIN;
    // 🆕 Round 28b52 — Force-show instant when the next 30-min grid
    //   tick is past the shift's last bookable offset (no main slot
    //   would render there). Same rationale as the tail branch above.
    const mainBoundForCompare = isOvernight ? shiftLen : end;
    const noMainSlotsWillRender =
      next30 > (isOvernight ? start + shiftLen - 1 : mainBoundForCompare - 1);
    if (noMainSlotsWillRender || next30 - instantMin5 >= 15) {
      // 🆕 Round 28b50 — Slot start just needs to be within the
      //   working window. Session may run past shift end. Was strict
      //   "session must end ≤ shiftEnd - 20 min".
      let withinShift = false;
      if (isOvernight) {
        // pre-midnight: slot stays today, must start before midnight
        const offset = instantMin5 - start;
        withinShift = offset >= 0 && offset < shiftLen;
      } else {
        withinShift = instantMin5 < end;
      }
      if (withinShift) {
        slots.push({
          time: fromMinutes(instantMin5),
          nextDay: false,
          kind: "tail", // surface in the green RIGHT NOW section
        });
      }
    }
  }

  for (let off = 0; off <= lastSlotOffset; off += SLOT_INCREMENT_MIN) {
    const absMin = start + off; // could exceed 1440
    const nextDay = absMin >= 1440;
    const slotMin = absMin % 1440;

    // Lead-time check (only meaningful when slot is on `date` itself, not nextDay)
    if (!nextDay && slotMin < earliestNowMin) continue;

    // 🆕 Round 28b40 — avoid duplicating the overnight tail slots we
    //   already pushed above. If we're in tail mode and this iteration
    //   falls before midnight (i.e., evening start), still keep it so
    //   we DON'T double-count tail slots.
    //   Tail slots = same calendar day, slot < end. Skip those here.
    if (
      isToday &&
      isOvernight &&
      nowMin < end &&
      !nextDay &&
      slotMin < end
    ) {
      continue;
    }

    slots.push({
      time: fromMinutes(slotMin),
      nextDay,
      kind: "main",
    });
  }
  return slots;
}

// 🆕 Round 28b42 — Six visual sub-sections so overnight shifts read
//   chronologically without jumbling 01:30 AM (tail) before 9:00 PM:
//
//     RIGHT NOW (kind=tail)        e.g. 1:30 AM, 2:00 AM, 2:30 AM
//     MORNING   (main, !nextDay, 6–12)
//     AFTERNOON (main, !nextDay, 12–17)
//     EVENING   (main, !nextDay, 17–21)
//     NIGHT     (main, !nextDay, 21–24)
//     AFTER MIDNIGHT (main, nextDay)   shift's post-midnight tail
//
//   Each section renders only when it has slots, so a same-day shift
//   never shows the empty RIGHT NOW or AFTER MIDNIGHT headings.
function groupSlots(slots: Slot[]) {
  const groups: Record<string, Slot[]> = {
    rightNow: [],
    morning: [],
    afternoon: [],
    evening: [],
    night: [],
    afterMidnight: [],
  };
  for (const s of slots) {
    if (s.kind === "tail") {
      groups.rightNow.push(s);
      continue;
    }
    if (s.nextDay) {
      groups.afterMidnight.push(s);
      continue;
    }
    const h = parseInt(s.time.split(":")[0], 10);
    // Round 28s68 (founder "Late Evening เอาออก") — merged the old
    //   NIGHT bucket (21:00–24:00) into EVENING so there's no separate
    //   "Late Evening" header. Evening now spans 17:00 → midnight in
    //   one swipe-row. The prime-time 9–11:30 PM slots are kept (just
    //   relabelled), only the extra section heading is gone. The
    //   `night` bucket survives for the rare pre-6am non-nextDay slot.
    if (h >= 6 && h < 12) groups.morning.push(s);
    else if (h >= 12 && h < 17) groups.afternoon.push(s);
    else if (h >= 17) groups.evening.push(s);
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
  const { t } = useTranslation();
  const [internalDate, setInternalDate] = useState<dayjs.Dayjs>(
    date ? dayjs(date) : dayjs()
  );

  // If the parent clears the date, sync.
  useEffect(() => {
    if (!date) setInternalDate(dayjs());
  }, [date]);

  // 🆕 Round 28an — minute ticker. Re-renders the slot grid every
  //   60 seconds so any slot that just slipped into "the past + lead
  //   time" disappears without requiring the user to refresh the page.
  //   The ticker only runs while the picker is mounted, so no perf cost
  //   when the user navigates away.
  const [, setMinuteTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setMinuteTick((n) => n + 1), 60_000);
    return () => window.clearInterval(id);
  }, []);

  // 🆕 Round 28r79 — r68 fallback so admin-added therapists surface
  //   their real working-hours window (not the default 09:00–22:00).
  //   Sync seed for the 12 originals means slot grid renders on the
  //   first paint; the effect only fires for admin-added ids.
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

  const startTime = therapist?.startTime || "09:00";
  const endTime = therapist?.endTime || "22:00";

  // 🆕 Phase 5 — Live booking subscription for this therapist. Slots
  //    overlapping any of these intervals will render as 'Taken'.
  const liveBookings = useTherapistBookings(therapistId);

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

  // 🆕 Round 28ap — earliest non-taken slot, used to surface a
  //   "Earliest available: 13:00" hint above the slot grid so users
  //   immediately see the soonest option without scanning the grid.
  // 🆕 Round 28b41 (founder 2026-05-04) — Sort by actual timestamp
  //   first so overnight-tail slots (01:30 AM today) win over the
  //   later 19:00 PM slot. Previous code iterated groups in fixed
  //   morning→afternoon→evening→night order which always picked
  //   19:00 PM as "earliest" even when 01:30 AM was 18 hours sooner.
  const earliestSlot = useMemo(() => {
    if (!slotGroups || !durationMin) return null;
    const allSlots: (Slot & { ts: number })[] = [];
    for (const group of [
      slotGroups.rightNow,
      slotGroups.morning,
      slotGroups.afternoon,
      slotGroups.evening,
      slotGroups.night,
      slotGroups.afterMidnight,
    ]) {
      for (const s of group) {
        const [h, m] = s.time.split(":").map(Number);
        const ts = internalDate
          .add(s.nextDay ? 1 : 0, "day")
          .hour(h)
          .minute(m)
          .second(0)
          .millisecond(0)
          .valueOf();
        allSlots.push({ ...s, ts });
      }
    }
    allSlots.sort((a, b) => a.ts - b.ts);
    for (const s of allSlots) {
      const taken = isSlotTaken(
        liveBookings,
        s.ts,
        durationMin,
        BOOKING_BUFFER_MIN
      );
      if (!taken) return s;
    }
    return null;
  }, [slotGroups, liveBookings, internalDate, durationMin]);

  const selectDate = (d: dayjs.Dayjs) => {
    setInternalDate(d);
    onChange({ date: d.format("YYYY-MM-DD"), time: null });
  };

  // 🆕 Round 28b42 (founder 2026-05-05) — Pass the slot object so we
  //   can shift the date forward for `nextDay` slots. Previously
  //   "01:30 +1d" picked while viewing TODAY would book on TODAY at
  //   01:30 AM (in the past!) instead of TOMORROW 01:30 AM.
  const selectTime = (s: Slot) => {
    const targetDate = s.nextDay ? internalDate.add(1, "day") : internalDate;
    onChange({ date: targetDate.format("YYYY-MM-DD"), time: s.time });
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
            const label =
              i === 0
                ? t("stepdt.today", "Today")
                : i === 1
                  ? t("stepdt.tomorrow", "Tomorrow")
                  : d.format("ddd");
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
                  // Round 28s65 — flat date pills: solid white +
                  // hairline clay border at rest, no shadow. Only
                  // the active pill carries the gradient + glow.
                  background: isActive
                    ? "#2D2D2B"
                    : "#fff",
                  color: isActive ? "#fff" : "#1A2B2E",
                  border: isActive
                    ? "1px solid transparent"
                    : "1px solid rgba(184, 92, 60, 0.16)",
                  boxShadow: isActive
                    ? "0 6px 16px rgba(15, 23, 42, 0.26)"
                    : "none",
                  fontFamily: SANS,
                  transition:
                    "background 0.2s ease, border-color 0.2s ease",
                  "&:focus-visible": {
                    outline: "2px solid #2D2D2B",
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
              color: "rgba(15, 23, 42, 0.55)",
              marginTop: "10px",
              paddingLeft: "4px",
            }}
          >
            {t("stepdt.shift", "{{name}}'s shift", { name: therapist.name })}:{" "}
            {prettyHHMM(startTime)}&ndash;{prettyHHMM(endTime)}
            {toMinutes(endTime) <= toMinutes(startTime)
              ? ` ${t("stepdt.overnight", "(overnight)")}`
              : ""}
          </Typography>
        )}

        {/* 🆕 Round 28an — explicit Bangkok time disclaimer so travelers
            and overseas customers don't get confused about the slot times. */}
        <Box
          sx={{
            marginTop: "8px",
            paddingLeft: "4px",
            display: "flex",
            alignItems: "center",
            gap: "5px",
          }}
        >
          <Box
            component="svg"
            viewBox="0 0 24 24"
            aria-hidden
            sx={{
              width: 13,
              height: 13,
              color: "rgba(15, 23, 42, 0.45)",
              flexShrink: 0,
            }}
          >
            <path
              fill="currentColor"
              d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"
            />
          </Box>
          <Typography
            sx={{
              fontFamily: SANS,
              fontSize: "10.5px",
              color: "rgba(15, 23, 42, 0.5)",
              fontStyle: "italic",
              letterSpacing: "0.01em",
            }}
          >
            {t("stepdt.bkkTime", "All times shown in Bangkok time (GMT+7)")}
          </Typography>
        </Box>
      </Box>

      {/* 🆕 Round 28ap — Earliest available banner. Highlights the
          soonest free slot so users don't have to scan the grid. Tap
          to select it directly. */}
      {earliestSlot && durationMin && (
        <Box
          role="button"
          onClick={() => selectTime(earliestSlot)}
          sx={{
            margin: "0 14px",
            padding: "12px 14px",
            borderRadius: "14px",
            background:
              "linear-gradient(135deg, rgba(22, 163, 74, 0.12), rgba(22, 163, 74, 0.04))",
            border: "1px solid rgba(22, 163, 74, 0.28)",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            cursor: "pointer",
            transition: "transform 0.15s ease, box-shadow 0.15s ease",
            "&:hover": {
              transform: "translateY(-1px)",
              boxShadow: "0 6px 18px rgba(22, 163, 74, 0.18)",
            },
          }}
        >
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              background: "#16a34a",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <FlashOnRoundedIcon sx={{ fontSize: 18 }} />
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              sx={{
                fontFamily: SANS,
                fontSize: "10.5px",
                fontWeight: 700,
                color: "#15803d",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                lineHeight: 1.2,
              }}
            >
              {t("stepdt.earliest", "Earliest available")}
            </Typography>
            <Typography
              sx={{
                fontFamily: SERIF,
                fontSize: "16px",
                fontWeight: 700,
                color: "#1A2B2E",
                lineHeight: 1.2,
              }}
            >
              {prettyHHMM(earliestSlot.time)}
              {earliestSlot.nextDay && (
                <Box
                  component="span"
                  sx={{
                    fontFamily: SANS,
                    fontSize: "10px",
                    fontWeight: 700,
                    marginLeft: "6px",
                    padding: "2px 6px",
                    borderRadius: "4px",
                    background: "rgba(15, 23, 42, 0.08)",
                    color: "rgba(15, 23, 42, 0.7)",
                    verticalAlign: "middle",
                  }}
                >
                  +1d
                </Box>
              )}
            </Typography>
          </Box>
          <Typography
            sx={{
              fontFamily: SANS,
              fontSize: "11px",
              fontWeight: 700,
              color: "#15803d",
              letterSpacing: "0.04em",
            }}
          >
            {t("stepdt.tapToBook", "TAP TO BOOK")}
          </Typography>
        </Box>
      )}

      {/* Time slot grid */}
      {!durationMin ? (
        <Typography
          sx={{
            fontFamily: SANS,
            color: "rgba(15, 23, 42, 0.5)",
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
              color: "#1A2B2E",
              marginBottom: "4px",
            }}
          >
            {t("stepdt.noSlots", "No slots available")}
          </Typography>
          <Typography
            sx={{
              fontFamily: SANS,
              fontSize: "12px",
              color: "rgba(15, 23, 42, 0.6)",
            }}
          >
            {t("stepdt.noSlotsHint", "Try another day or another therapist.")}
          </Typography>
        </Box>
      ) : (
        <Box sx={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {(() => {
            const orderedKeys = [
              "rightNow",
              "morning",
              "afternoon",
              "evening",
              "night",
              "afterMidnight",
            ] as const;
            type SectionKey = (typeof orderedKeys)[number];

            // Find previous visible section so we can decide if a
            // divider should appear AT this section's top edge.
            const visibleKeys = orderedKeys.filter(
              (k) => slotGroups[k].length > 0
            );

            const labels: Record<SectionKey, string> = {
              rightNow: t("stepdt.section.rightNow", "Right Now"),
              morning: t("stepdt.section.morning", "Morning"),
              afternoon: t("stepdt.section.afternoon", "Afternoon"),
              evening: t("stepdt.section.evening", "Evening"),
              night: t("stepdt.section.night", "Late Evening"),
              afterMidnight: t(
                "stepdt.section.afterMidnight",
                "After Midnight",
              ),
            };

            // Round 28s66 (founder "ลองเปลี่ยน สไตล์ให้ไม่รกมาก") —
            //   stripped the day-boundary divider rows + the italic
            //   sublabels. Each overnight section used to carry THREE
            //   layers of labelling (divider line + header + sublabel),
            //   which read as clutter. Now: ONE quiet muted header per
            //   section. The "+1d" badge already on after-midnight
            //   chips signals the day rollover, so the heavy "Tomorrow"
            //   divider is redundant. RIGHT NOW keeps a soft green tint
            //   as the single colour accent in the list.
            return visibleKeys.map((key) => {
              const group = slotGroups[key];
              return (
                <Box key={key}>
                  <Typography
                    sx={{
                      fontFamily: SANS,
                      fontSize: "10.5px",
                      fontWeight: 700,
                      color:
                        key === "rightNow"
                          ? "#16a34a"
                          : "rgba(15, 23, 42, 0.4)",
                      textTransform: "uppercase",
                      letterSpacing: "0.07em",
                      marginBottom: "10px",
                      paddingLeft: "2px",
                    }}
                  >
                    {labels[key]}
                  </Typography>
                  {/* Round 28s67 (founder "ลองทำเป็น แนวนอน สไลด์") —
                      each daypart is now ONE horizontal swipe-row instead
                      of a 3-col wrapping grid. Slashes the picker's
                      vertical height (an overnight shift had ~7 rows of
                      chips); the row scroll-snaps so chips land cleanly.
                      Edge fade hints there's more to swipe. */}
                  <Box
                    sx={{
                      display: "flex",
                      gap: "8px",
                      overflowX: "auto",
                      paddingBottom: "2px",
                      scrollSnapType: "x proximity",
                      WebkitOverflowScrolling: "touch",
                      "&::-webkit-scrollbar": { display: "none" },
                      scrollbarWidth: "none",
                    }}
                  >
                    {group.map((s) => {
                      // 🆕 Round 28b42 — Slot's resolved calendar date
                      //   (nextDay slots resolve to internalDate + 1d).
                      //   Active state must compare BOTH date AND time so
                      //   "1:30 AM today" and "1:30 AM +1d" don't both
                      //   highlight when the user picks one of them.
                      const slotDate = s.nextDay
                        ? internalDate.add(1, "day")
                        : internalDate;
                      const isActive =
                        time === s.time &&
                        date === slotDate.format("YYYY-MM-DD");
                      const [sh, sm] = s.time.split(":").map(Number);
                      const slotStartMs = slotDate
                        .hour(sh)
                        .minute(sm)
                        .second(0)
                        .millisecond(0)
                        .valueOf();
                      // durationMin is narrowed to number here — the outer
                      // `!durationMin ? <…> :` branch returned early.
                      // 🆕 Round 28ao — pass BOOKING_BUFFER_MIN so the
                      //   slot-taken check respects the 10-min therapist
                      //   prep buffer between consecutive bookings.
                      const taken = isSlotTaken(
                        liveBookings,
                        slotStartMs,
                        durationMin,
                        BOOKING_BUFFER_MIN
                      );
                      return (
                        <Box
                          key={`${s.time}-${s.nextDay ? "nd" : "sd"}-${s.kind}`}
                          role="button"
                          tabIndex={taken ? -1 : 0}
                          aria-pressed={isActive}
                          aria-disabled={taken}
                          onClick={() => {
                            if (!taken) selectTime(s);
                          }}
                          onKeyDown={(e) => {
                            if (taken) return;
                            if (e.key === " " || e.key === "Enter") {
                              e.preventDefault();
                              selectTime(s);
                            }
                          }}
                          sx={{
                            // Round 28s65 ("สอาดสบายตา เหมือนเว็บแอป")
                            // — flat outlined chips like Calendly /
                            // Cal.com: no rest shadow, solid white,
                            // hairline clay border. Only the SELECTED
                            // chip carries the brand gradient + glow.
                            // Round 28s67 — fixed-width pill in a
                            // horizontal swipe-row: flexShrink 0 so it
                            // never squishes, scroll-snap so it lands
                            // cleanly, minWidth keeps a tidy rhythm.
                            flexShrink: 0,
                            scrollSnapAlign: "start",
                            minWidth: "92px",
                            padding: "11px 16px",
                            borderRadius: "12px",
                            cursor: taken ? "not-allowed" : "pointer",
                            textAlign: "center",
                            background: taken
                              ? "transparent"
                              : isActive
                                ? "#2D2D2B"
                                : "#fff",
                            color: taken
                              ? "rgba(15, 23, 42, 0.3)"
                              : isActive
                                ? "#fff"
                                : "#1A2B2E",
                            border: taken
                              ? "1px solid rgba(15, 23, 42, 0.10)"
                              : isActive
                                ? "1px solid transparent"
                                : "1px solid rgba(184, 92, 60, 0.16)",
                            fontFamily: SANS,
                            fontSize: "13.5px",
                            fontWeight: 600,
                            letterSpacing: "0.01em",
                            whiteSpace: "nowrap",
                            textDecoration: taken ? "line-through" : "none",
                            boxShadow: isActive
                              ? "0 6px 16px rgba(15, 23, 42, 0.28)"
                              : "none",
                            transition:
                              "background 0.15s ease, border-color 0.15s ease, transform 0.12s ease",
                            "@media (hover: hover)": {
                              "&:hover": taken
                                ? {}
                                : isActive
                                  ? {}
                                  : {
                                      borderColor: "rgba(15, 23, 42, 0.40)",
                                      background: "rgba(45, 45, 43, 0.03)",
                                    },
                            },
                            "&:focus-visible": {
                              outline: "2px solid #2D2D2B",
                              outlineOffset: "2px",
                            },
                          }}
                        >
                          {prettyHHMM(s.time)}
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
                          {taken && (
                            <Typography
                              component="div"
                              sx={{
                                fontSize: "9px",
                                fontWeight: 700,
                                opacity: 0.7,
                                letterSpacing: "0.06em",
                                textTransform: "uppercase",
                                marginTop: "2px",
                              }}
                            >
                              Taken
                            </Typography>
                          )}
                        </Box>
                      );
                    })}
                  </Box>
                </Box>
              );
            });
          })()}
        </Box>
      )}
    </Box>
  );
};

export default StepDateTime;
