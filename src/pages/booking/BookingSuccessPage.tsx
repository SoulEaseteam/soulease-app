// src/pages/booking/BookingSuccessPage.tsx
//
// 🎨 Phase 5 round 15 (founder 2026-05-01): redesign Booking Success page.
//
// Layout (matches founder reference):
//   ┌──────────────────────────────────────────┐
//   │           ┌────────┐                      │
//   │           │  ✓     │   pulsing red disc   │
//   │           └────────┘                      │
//   │      You're all  *booked*.                │  serif, italic
//   │           [ SR-XXXXX ]                    │  pill
//   │   We've sent confirmation to your email   │
//   │   and {name} will arrive at {time}.       │
//   ├──────────────────────────────────────────┤
//   │  ● {name} is preparing your session       │  green status banner
//   │     Will leave at {time-prep} · Track     │
//   ├──────────────────────────────────────────┤
//   │  ┌────────┐ ┌────────┐                   │
//   │  │ 💬 Chat│ │ 📍Track│   2×2 quick action │
//   │  ├────────┤ ├────────┤                   │
//   │  │ 📅 Cal │ │ 🔄 Rsch│                   │
//   │  └────────┘ └────────┘                   │
//   ├──────────────────────────────────────────┤
//   │  Your booking                             │  card
//   │   Therapist:  Mai, 28 ✓                   │
//   │   Service:    Thai · 90 min               │
//   │   Time:       Today · 17:00               │
//   │   Location:   ...                         │
//   │   Total paid: ฿2,900                      │
//   ├──────────────────────────────────────────┤
//   │  What to prepare              (optional)  │  card
//   │   📱 Have your room number ready          │
//   │   🚿 Light shower beforehand              │
//   │   💧 Drink water                          │
//   ├──────────────────────────────────────────┤
//   │       [ Done — back to home ]             │
//   └──────────────────────────────────────────┘
//
// Action card behavior:
//   • Chat with {name}    → opens admin Telegram link (LINE later)
//   • Track arrival       → opens Google Maps deep-link to address
//   • Add to calendar     → downloads .ics file
//   • Reschedule          → /booking/history (the user can cancel/rebook there)

import React, { useEffect, useState } from "react";
import { Box, Typography, Button, CircularProgress } from "@mui/material";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import VerifiedRoundedIcon from "@mui/icons-material/VerifiedRounded";
import ChatRoundedIcon from "@mui/icons-material/ChatRounded";
import PinDropRoundedIcon from "@mui/icons-material/PinDropRounded";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import AutorenewRoundedIcon from "@mui/icons-material/AutorenewRounded";
import KeyRoundedIcon from "@mui/icons-material/KeyRounded";
import ShowerRoundedIcon from "@mui/icons-material/ShowerRounded";
import WaterDropRoundedIcon from "@mui/icons-material/WaterDropRounded";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
// 🆕 Round 28s90 (CRO audit) — multi-channel confirm row. Chinese
//   tourists (WeChat) + the Telegram-first audience were being dumped
//   into a LINE-only button and bailing at the finish line. Same
//   brand-color channel icon set the home concierge grid uses.
import { FaWhatsapp, FaLine, FaTelegramPlane, FaWeixin } from "react-icons/fa";
import { doc, getDoc, type DocumentData } from "firebase/firestore";
// 🆕 Round 28b59 — `dayjs` direct import dropped (was only used by
//   the now-removed onAddToCalendar handler). All time formatting
//   goes through fmtBKK / nowBKK / toBKK from @/utils/time.
// 🆕 Round 28an — BKK-anchored time helpers.
import { fmtBKK, sameDayBKK, nowBKK, toBKK } from "@/utils/time";
// 🆕 Round 28b16 — centralized service/payment label catalog
import { getServiceLabel } from "@/utils/serviceCatalog";
// 🆕 Round 28b21 — Phase 2: 10-min hold countdown.
import HoldCountdown from "@/components/booking/HoldCountdown";
// 🆕 Round 28r9 (founder 2026-05-06) — AdminPresenceBadge replaced
//   with the same concierge-mode chip the rest of the site uses.
//   The badge was reading from `adminPresence/global` which has no
//   writer in the codebase → it always rendered "Admin offline ·
//   reply within 1 hour", contradicting our 24/7 concierge promise.
//   Once an AdminLayout heartbeat writer ships, we can re-introduce
//   the live badge.
import { useConciergeMode } from "@/utils/conciergeMode";
import ConciergeModeIcon from "@/components/common/ConciergeModeIcon";

import { db } from "@/lib/firebase";
// 🆕 Round 28r52 — Phase 3.1 responsive shell.
// 🆕 Round 28r56 — Phase 3.5 responsive typography for headings.
import { responsiveShellNarrow, responsiveType } from "@/theme/breakpoints";

const SERIF = '"Federo", "Italiana", "Cinzel", "Fraunces", Georgia, "Times New Roman", serif';
const SANS = '"Inter", system-ui, -apple-system, sans-serif';

// 30 min prep buffer — shown as 'Will leave for your location at HH:mm'
const PREP_BUFFER_MIN = 30;

const BookingSuccessPage: React.FC = () => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [booking, setBooking] = useState<DocumentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // 🆕 Round 28r9 — same time-aware mode the rest of the site uses.
  const concierge = useConciergeMode();
  const modeTint =
    concierge.mode === "prime"
      ? "#B4000A"
      : concierge.mode === "evening"
      ? "#F59E0B"
      : concierge.mode === "off"
      ? "rgba(15, 23, 42,0.55)"
      : "#B4000A";

  useEffect(() => {
    if (!id) {
      setError(t("success.err.noId", "No booking id"));
      setLoading(false);
      return;
    }
    // 🆕 Round 28s75 (audit) — reset state when `id` changes (client-
    //   side nav between two success pages would otherwise flash the
    //   previous booking), and guard against an out-of-order resolve
    //   overwriting fresher state after unmount / rapid id change.
    let alive = true;
    setLoading(true);
    setError(null);
    setBooking(null);
    const fetch = async () => {
      try {
        const snap = await getDoc(doc(db, "bookings", id));
        if (!alive) return;
        if (!snap.exists()) {
          setError(t("success.err.notFound", "Booking not found"));
        } else {
          setBooking(snap.data());
        }
      } catch (e) {
        if (!alive) return;
        setError(e instanceof Error ? e.message : t("success.err.failed", "Failed to load"));
      } finally {
        if (alive) setLoading(false);
      }
    };
    void fetch();
    return () => {
      alive = false;
    };
  }, [id, t]);

  // ── Derived display values (booked once, then memoize-safe to recompute) ──
  const therapistName =
    (booking?.therapistName as string | undefined) ??
    t("success.therapistFallback", "your practitioner");
  // 🆕 Round 28s75 (audit) — normalize startAt from ANY stored shape.
  //   Customer bookings write a Firestore Timestamp, but admin-created
  //   docs may store an ISO string / Date; the old `?.toDate` check
  //   silently yielded null for those, blanking the Time row + .ics.
  const startAt: Date | null = (() => {
    const raw = booking?.startAt as
      | { toDate?: () => Date }
      | string
      | number
      | Date
      | undefined;
    if (!raw) return null;
    if (typeof raw === "object" && typeof (raw as { toDate?: () => Date }).toDate === "function") {
      return (raw as { toDate: () => Date }).toDate();
    }
    const d = new Date(raw as string | number | Date);
    return isNaN(d.getTime()) ? null : d;
  })();
  // 🆕 Round 28b59 — `endAt` derivation removed (was only consumed
  //   by the dead onAddToCalendar handler). If a future feature needs
  //   the end timestamp, recompute via startAt + duration*60000.
  // 🆕 Round 28an — all wall-clock display anchored to BKK.
  // 🆕 Round 28b57 — `h:mm A` (e.g. "8:00 PM") canonical format —
  //   matches prettyHHMM/fmtBKKTime site-wide.
  const timeLabel = fmtBKK(startAt, "h:mm A");
  const dateLabel = startAt
    ? sameDayBKK(startAt, nowBKK())
      ? t("common.today", "Today")
      : sameDayBKK(startAt, nowBKK().add(1, "day"))
        ? t("common.tomorrow", "Tomorrow")
        : fmtBKK(startAt, "ddd, MMM D")
    : "—";
  // 🆕 Round 28r19 — fixed format string. Was "HH:mm A" which
  //   produces awkward "20:00 PM" (24-hour clock + AM/PM marker
  //   together). Use "h:mm A" for proper 12-hour with AM/PM, matching
  //   the rest of the page (timeLabel uses "h:mm A" too).
  const leaveLabel = startAt
    ? fmtBKK(
        toBKK(startAt)?.subtract(PREP_BUFFER_MIN, "minute") ?? null,
        "h:mm A",
        ""
      )
    : null;

  // Booking ref code: SR + first 8 chars of doc id, uppercased.
  const refCode = id ? `SR-${id.slice(0, 8).toUpperCase()}` : "SR-—";

  // 🆕 Round 28b21 — Phase 2: 10-min hold window. Field present only on
  //   bookings created after this round; older docs render no countdown.
  const holdExpiresAt: Date | null = booking?.holdExpiresAt?.toDate
    ? (booking.holdExpiresAt.toDate() as Date)
    : null;
  const holdState = (booking?.holdState as string | undefined) ?? undefined;
  const therapistIdForRebook =
    (booking?.therapistId as string | undefined) ?? undefined;

  // 🆕 Round 28b59 (founder 2026-05-05) — Stripped 4 dead handlers
  //   (onChat / onTrack / onAddToCalendar / onReschedule) that were
  //   left behind from the v1 success page. The current screen uses
  //   the 2×2 quick-actions grid + Contact Admin CTA (task #77)
  //   instead — none of those four functions were referenced.
  //   ~70 lines removed; eslint warnings dropped 4 entries.

  // ── Render ───────────────────────────────────────────────────────────
  return (
    <Box
      sx={{
        // Phone-shell wrapper
        // 🆕 Round 28r52 — narrow responsive shell so the success page
        //   stays readable on desktop rather than stretching to 1200.
        // 🆕 Round 28r56 (Phase 3.5) — widened at md+ so the hero can
        //   sit next to the 2×2 action grid instead of stacking on the
        //   whole viewport. Mobile shell unchanged.
        ...responsiveShellNarrow,
        maxWidth: {
          xs: "430px",
          sm: "600px",
          md: "900px",
          lg: "1100px",
        },
        minHeight: "100vh",
        background: "#F4F6F5",
        borderRadius: { xs: "28px", md: 0 },
        overflow: "hidden",
        boxShadow: {
          xs: "0 20px 60px rgba(15, 23, 42, 0.15)",
          md: "none",
        },
        position: "relative",
        padding: { xs: "32px 20px 40px", md: "40px 32px 56px" },
        fontFamily: SANS,
      }}
    >
      {loading ? (
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            paddingTop: "120px",
          }}
        >
          <CircularProgress sx={{ color: "#B4000A" }} />
        </Box>
      ) : error ? (
        <Box sx={{ textAlign: "center", paddingTop: "60px" }}>
          <Typography
            sx={{
              fontFamily: SERIF,
              fontSize: "20px",
              color: "#1A2B2E",
              marginBottom: "12px",
            }}
          >
            {error}
          </Typography>
          <Button
            onClick={() => void navigate("/")}
            sx={{ color: "#B4000A", textTransform: "none" }}
          >
            {t("success.backHome", "Back to home")}
          </Button>
        </Box>
      ) : (
        booking && (
          <>
            {/* 🆕 Round 28r56 (Phase 3.5) — desktop top-cluster grid.
                Mobile: everything stacks (hero, concierge chip, hold
                countdown, live status banner, 2×2 action grid — same
                ordering as before). Desktop (md+): 2-column CSS grid —
                the hero cluster on the LEFT (title, ref, subtitle,
                concierge chip, hold countdown, live status banner) and
                the 2×2 action tiles on the RIGHT. Everything below
                (receipt, prep, CTAs) stays full-width one column. */}
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "1fr",
                  md: "minmax(0, 1fr) minmax(280px, 380px)",
                },
                gap: { xs: 0, md: "24px 32px" },
                alignItems: "start",
              }}
            >
              {/* Hero cluster — gridArea 'hero' on desktop */}
              <Box sx={{ minWidth: 0 }}>
            {/* Pulsing check disc */}
            <Box
              sx={{
                width: 96,
                height: 96,
                borderRadius: "50%",
                background: "#B4000A",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "16px auto 20px",
                boxShadow: "0 14px 40px rgba(15, 23, 42, 0.35)",
                animation: "successPulse 1.6s ease-in-out infinite",
                "@keyframes successPulse": {
                  "0%, 100%": {
                    transform: "scale(1)",
                    boxShadow:
                      "0 14px 40px rgba(15, 23, 42, 0.35), 0 0 0 0 rgba(15, 23, 42, 0.45)",
                  },
                  "50%": {
                    transform: "scale(1.06)",
                    boxShadow:
                      "0 18px 48px rgba(15, 23, 42, 0.45), 0 0 0 14px rgba(180, 0, 10, 0)",
                  },
                },
                "@media (prefers-reduced-motion: reduce)": {
                  animation: "none",
                },
              }}
            >
              <CheckRoundedIcon sx={{ color: "#fff", fontSize: 52 }} />
            </Box>

            {/* Title */}
            <Typography
              component="h1"
              sx={{
                fontFamily: SERIF,
                // 🆕 Round 28r56 — responsive hero (24→32→40 at md+).
                //   Was fixed 30px — now scales up nicely on desktop.
                ...responsiveType.h2,
                fontWeight: 500,
                letterSpacing: "-0.02em",
                color: "#1A2B2E",
                textAlign: "center",
                lineHeight: 1.05,
              }}
            >
              {t("success.title", "You're all set.")}
            </Typography>

            {/* Booking ref pill */}
            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                marginTop: "12px",
              }}
            >
              <Box
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  padding: "5px 14px",
                  borderRadius: "999px",
                  background: "rgba(180, 0, 10, 0.08)",
                  border: "1px solid rgba(15, 23, 42, 0.18)",
                  fontFamily: SANS,
                  fontSize: "12px",
                  fontWeight: 700,
                  color: "#B4000A",
                  letterSpacing: "0.06em",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {refCode}
              </Box>
            </Box>

            {/* Subtitle */}
            <Typography
              sx={{
                fontFamily: SANS,
                fontSize: "13px",
                color: "rgba(15, 23, 42, 0.7)",
                textAlign: "center",
                marginTop: "12px",
                lineHeight: 1.55,
                padding: "0 8px",
              }}
            >
              {t(
                "success.subtitle",
                "We've sent confirmation to your email and {{name}} will arrive at {{time}}.",
                { name: therapistName, time: timeLabel }
              )}
            </Typography>

            {/* 🆕 Round 28r9 (founder 2026-05-06) — AdminPresenceBadge
                replaced with the time-aware concierge chip. Same
                visual weight + same "we're here for you" reassurance,
                but the label reflects reality (no fake "Admin online"
                when the heartbeat writer doesn't exist). */}
            <Box
              sx={{
                marginTop: "12px",
                display: "flex",
                justifyContent: "center",
              }}
            >
              <Box
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  paddingX: "12px",
                  paddingY: "5px",
                  borderRadius: 999,
                  background:
                    concierge.mode === "off"
                      ? "rgba(100, 116, 139, 0.10)"
                      : "rgba(22, 163, 74, 0.10)",
                  border:
                    concierge.mode === "off"
                      ? "1px solid rgba(100, 116, 139, 0.22)"
                      : "1px solid rgba(22, 163, 74, 0.28)",
                }}
              >
                <ConciergeModeIcon
                  mode={concierge.mode}
                  sx={{
                    fontSize: 13,
                    color: modeTint,
                    filter:
                      concierge.mode === "off"
                        ? "none"
                        : `drop-shadow(0 0 3px ${modeTint})`,
                  }}
                />
                <Typography
                  sx={{
                    fontFamily: SANS,
                    fontSize: 12,
                    fontWeight: 700,
                    color:
                      concierge.mode === "off"
                        ? "rgba(15, 23, 42,0.7)"
                        : "#15803d",
                  }}
                >
                  {/* 🆕 Round 28r19 — fix duplicated label.
                      For "off" mode, pillLabel is already "Concierge ·
                      09:00" so prefixing with "Concierge resumes at
                      09:00" produced "Concierge resumes at 09:00 ·
                      Concierge · 09:00" double-up. Use pillLabel
                      directly for off mode (it self-describes); only
                      prefix "Concierge live ·" for active modes. */}
                  {concierge.mode === "off"
                    ? t("success.concierge.resumesAt9", "Concierge resumes at 09:00")
                    : t("success.concierge.live", "Concierge live · {{label}}", {
                        label: concierge.pillLabel,
                      })}
                </Typography>
              </Box>
            </Box>

            {/* 🆕 Round 28b21 — Phase 2: 10-minute hold countdown.
                Round 28b28 — moved below the admin presence pill. */}
            <HoldCountdown
              holdExpiresAt={holdExpiresAt}
              holdState={holdState}
              therapistId={therapistIdForRebook}
            />

            {/* 🆕 Round 28r9 — Live status banner. Previously a
                JSX-corruption left this section's outer <Box> empty
                with the green dot + therapist-name typography
                floating above it (visible in the founder screenshot
                as a stray empty pill). Re-wrapped properly so the
                banner reads as one cohesive card. */}
            <Box
              sx={{
                marginTop: "20px",
                padding: "14px 14px 14px 16px",
                borderRadius: "16px",
                background: "rgba(22, 163, 74, 0.07)",
                border: "1px solid rgba(22, 163, 74, 0.20)",
                display: "flex",
                alignItems: "flex-start",
                gap: "12px",
              }}
            >
              <Box
                aria-hidden
                sx={{
                  width: 12,
                  height: 12,
                  flexShrink: 0,
                  borderRadius: "50%",
                  background: "#16a34a",
                  marginTop: "5px",
                  boxShadow: "0 0 0 4px rgba(22, 163, 74, 0.18)",
                  animation: "statusBlink 1.4s ease-in-out infinite",
                  "@keyframes statusBlink": {
                    "0%, 100%": { opacity: 1 },
                    "50%": { opacity: 0.5 },
                  },
                }}
              />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                  sx={{
                    fontFamily: SERIF,
                    fontSize: "14.5px",
                    fontWeight: 700,
                    color: "#15803d",
                    lineHeight: 1.3,
                  }}
                >
                  {t("success.preparing", "{{name}} is preparing your session", {
                    name: therapistName,
                  })}
                </Typography>
                <Typography
                  sx={{
                    fontFamily: SANS,
                    fontSize: "12px",
                    color: "rgba(20, 83, 45, 0.85)",
                    marginTop: "2px",
                    lineHeight: 1.45,
                  }}
                >
                  {leaveLabel
                    ? t(
                        "success.willLeave",
                        "Will leave for your location at {{time}} · Track in real-time",
                        { time: leaveLabel }
                      )
                    : t(
                        "success.trackingSoon",
                        "We'll send a tracking link before departure."
                      )}
                </Typography>
              </Box>
            </Box>
              </Box>{/* end hero cluster */}

            {/* 🆕 Round 28r10 (founder 2026-05-06) — Action cards
                un-locked. All four now do something useful in the
                Phase-1 manual flow:
                  • Chat with [Therapist] → opens LINE concierge with
                    a pre-filled message ("Booking SR-XXX, can you
                    connect me with [name]?"). View bridges the chat
                    by hand until 1:1 therapist DMs ship.
                  • Track arrival → opens Google Maps to the booking's
                    address (real). Live GPS tracking is Phase 2.
                  • Add to calendar → generates a .ics file in-browser.
                    100% client-side, no backend needed.
                  • Reschedule → opens LINE with a "I'd like to move
                    SR-XXX" pre-fill so the conversation starts in the
                    right context.
                Sizing also tightened (label 12.5px, icon disc 36px,
                padding 12/10) per founder feedback "ย่อขนาดลง · ดูรก". */}
            <Box
              sx={{
                // 🆕 Round 28r56 — on mobile, keeps the 16px top spacing
                //   inside the stacked flow. On desktop, this Box lives
                //   in the right column of the top-cluster grid so
                //   marginTop is dropped (the grid gap handles spacing).
                marginTop: { xs: "16px", md: 0 },
                minWidth: 0,
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "8px",
                position: "relative",
              }}
            >
              <ActionCard
                label={t("success.action.chat", "Chat with {{name}}", {
                  name: therapistName.split(" ")[0],
                })}
                sub={t("success.action.viaConcierge", "Via concierge")}
                icon={<ChatRoundedIcon />}
                onClick={() => {
                  // Round 28s75 (audit) — dropped a dead
                  //   `encodeURIComponent(message)` that was computed then
                  //   discarded (void msg); LINE's deep link can't carry a
                  //   prefilled body, so opening the chat is all we can do.
                  const lineUrl = `https://line.me/R/ti/p/@sunred.bkk?from=page&searchId=sunred.bkk`;
                  window.open(lineUrl, "_blank", "noopener,noreferrer");
                }}
              />
              <ActionCard
                label={t("success.action.track", "Track arrival")}
                sub={t("success.action.maps", "Open in Maps")}
                icon={<PinDropRoundedIcon />}
                onClick={() => {
                  const placeName =
                    (booking?.locationName as string | undefined) ||
                    (booking?.address as string | undefined) ||
                    null;
                  const lat = booking?.lat as number | undefined;
                  const lng = booking?.lng as number | undefined;
                  // Prefer name → address → lat,lng (matches the
                  // updated buildMapUrl in SelectLocationPage).
                  const url = placeName
                    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                        placeName
                      )}`
                    : lat != null && lng != null
                    ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
                    : null;
                  if (url) window.open(url, "_blank", "noopener,noreferrer");
                }}
              />
              <ActionCard
                label={t("success.action.calendar", "Add to calendar")}
                sub={t("success.action.icsSub", "Save .ics file")}
                icon={<CalendarMonthRoundedIcon />}
                onClick={() => {
                  if (!startAt) return;
                  const durationMin =
                    typeof booking?.duration === "number"
                      ? (booking.duration as number)
                      : 60;
                  const endAtDate = new Date(
                    startAt.getTime() + durationMin * 60_000
                  );
                  const fmtIcs = (d: Date) =>
                    d
                      .toISOString()
                      .replace(/[-:]/g, "")
                      .replace(/\.\d{3}/, "");
                  const summary = `SunRed · ${therapistName} · ${getServiceLabel(
                    booking?.serviceId as string | undefined,
                    booking?.serviceName as string | undefined
                  )}`;
                  const loc =
                    (booking?.locationName as string | undefined) ||
                    (booking?.address as string | undefined) ||
                    "";
                  const ics = [
                    "BEGIN:VCALENDAR",
                    "VERSION:2.0",
                    "PRODID:-//SunRed//Booking//EN",
                    "BEGIN:VEVENT",
                    `UID:${refCode}@sunred.vip`,
                    `DTSTAMP:${fmtIcs(new Date())}`,
                    `DTSTART:${fmtIcs(startAt)}`,
                    `DTEND:${fmtIcs(endAtDate)}`,
                    `SUMMARY:${summary}`,
                    `LOCATION:${loc.replace(/[\r\n,;]/g, " ")}`,
                    `DESCRIPTION:${t("success.ics.desc", "Reservation ref {{ref}}", { ref: refCode })}`,
                    "END:VEVENT",
                    "END:VCALENDAR",
                  ].join("\r\n");
                  const blob = new Blob([ics], {
                    type: "text/calendar;charset=utf-8",
                  });
                  const a = document.createElement("a");
                  a.href = URL.createObjectURL(blob);
                  a.download = `${refCode}.ics`;
                  a.click();
                  setTimeout(() => URL.revokeObjectURL(a.href), 1500);
                }}
              />
              <ActionCard
                label={t("success.action.reschedule", "Reschedule")}
                sub={t("success.action.viaConcierge", "Via concierge")}
                icon={<AutorenewRoundedIcon />}
                onClick={() => {
                  // Round 28s75 (audit) — dead `void msg` removed (LINE
                  //   deep link can't carry a prefilled reschedule note).
                  const lineUrl = `https://line.me/R/ti/p/@sunred.bkk?from=page&searchId=sunred.bkk`;
                  window.open(lineUrl, "_blank", "noopener,noreferrer");
                }}
              />
            </Box>
            </Box>{/* end top-cluster 2-col grid */}

            {/* Your booking summary */}
            <Box
              sx={{
                marginTop: "16px",
                padding: "16px 18px",
                borderRadius: "20px",
                background: "rgba(255, 255, 255, 0.85)",
                backdropFilter: "blur(20px) saturate(180%)",
                WebkitBackdropFilter: "blur(20px) saturate(180%)",
                border: "1px solid rgba(255, 255, 255, 0.6)",
                boxShadow: "0 4px 14px rgba(15, 23, 42, 0.05)",
              }}
            >
              <Typography
                component="h2"
                sx={{
                  fontFamily: SERIF,
                  fontSize: "16px",
                  fontWeight: 600,
                  color: "#B4000A",
                  fontStyle: "italic",
                  marginBottom: "10px",
                }}
              >
                {t("success.summary.title", "Your reservation")}
              </Typography>
              <SummaryLine
                label={t("success.summary.practitioner", "Practitioner")}
                value={
                  <Box
                    component="span"
                    sx={{ display: "inline-flex", alignItems: "center", gap: "4px" }}
                  >
                    {therapistName}
                    <VerifiedRoundedIcon
                      sx={{ fontSize: 14, color: "#16a34a" }}
                    />
                  </Box>
                }
              />
              <SummaryLine
                label={t("success.summary.service", "Service")}
                value={`${getServiceLabel(
                  booking.serviceId as string | undefined,
                  booking.serviceName as string | undefined
                )}${
                  booking.duration
                    ? ` · ${booking.duration as number} ${t("common.min", "min")}`
                    : ""
                }`}
              />
              <SummaryLine
                label={t("success.summary.time", "Time")}
                value={`${dateLabel} · ${timeLabel}`}
              />
              <SummaryLine
                label={t("success.summary.location", "Location")}
                value={
                  (booking.locationName as string) ??
                  (booking.address as string) ??
                  "—"
                }
              />
              {/* 🆕 Round 28r14 — Surface the applied discount on
                  the success page so guests have a record of what
                  was credited. Only renders when the booking carries
                  a non-null `discountAmount` (older bookings + zero-
                  discount bookings show no extra row). */}
              {typeof booking.discountAmount === "number" &&
                booking.discountAmount > 0 && (
                  <SummaryLine
                    label={t("success.summary.discount", "Discount · {{code}}", {
                      code: (booking.discountCode as string | undefined) ?? "",
                    })}
                    value={
                      <Box
                        component="span"
                        sx={{
                          color: "#16a34a",
                          fontWeight: 700,
                        }}
                      >
                        −฿
                        {(booking.discountAmount as number).toLocaleString()}
                      </Box>
                    }
                  />
                )}
              {/* 🆕 Round 28r29 — "You saved ฿X" line + strikethrough
                  original price below Total. Founder direction:
                  "ใส่ราคาต้นมาด้วยจะได้ดูคุ้ม". Renders only when
                  the booking actually has savings recorded. */}
              {typeof booking.savingsTotal === "number" &&
                (booking.savingsTotal as number) > 0 && (
                  <Box
                    sx={{
                      mt: 1,
                      p: "10px 12px",
                      borderRadius: "10px",
                      background:
                        "linear-gradient(135deg, rgba(22, 163, 74, 0.10), rgba(22, 163, 74, 0.04))",
                      border: "1px solid rgba(22, 163, 74, 0.25)",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "baseline",
                      gap: 1,
                      fontFamily: SANS,
                    }}
                  >
                    <Box
                      component="span"
                      sx={{
                        fontSize: 11,
                        fontWeight: 700,
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                        color: "#15803d",
                      }}
                    >
                      {t("success.summary.saved", "You saved")}
                    </Box>
                    <Box
                      component="span"
                      sx={{
                        display: "inline-flex",
                        alignItems: "baseline",
                        gap: "8px",
                      }}
                    >
                      {typeof booking.originalPrice === "number" &&
                        (booking.originalPrice as number) >
                          ((booking.totalPrice as number) ?? 0) && (
                          <Box
                            component="span"
                            sx={{
                              fontFamily: SERIF,
                              fontSize: "12.5px",
                              color: "rgba(15, 23, 42, 0.45)",
                              textDecoration: "line-through",
                              fontVariantNumeric: "tabular-nums",
                            }}
                          >
                            ฿
                            {(booking.originalPrice as number).toLocaleString()}
                          </Box>
                        )}
                      <Box
                        component="span"
                        sx={{
                          fontFamily: SERIF,
                          fontSize: "16px",
                          fontWeight: 700,
                          color: "#16a34a",
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        −฿
                        {(booking.savingsTotal as number).toLocaleString()}
                      </Box>
                    </Box>
                  </Box>
                )}
              <SummaryLine
                label={t("success.summary.totalPaid", "Total paid")}
                value={
                  <Box
                    component="span"
                    sx={{
                      fontFamily: SERIF,
                      fontWeight: 700,
                      color: "#B4000A",
                      fontSize: "16px",
                    }}
                  >
                    ฿
                    {(
                      (booking.totalPrice as number) ??
                      (booking.servicePrice as number) ??
                      0
                    ).toLocaleString()}
                  </Box>
                }
                last
              />
            </Box>

            {/* What to prepare */}
            <Box
              sx={{
                marginTop: "16px",
                padding: "16px 18px",
                borderRadius: "20px",
                background: "rgba(255, 255, 255, 0.85)",
                backdropFilter: "blur(20px) saturate(180%)",
                WebkitBackdropFilter: "blur(20px) saturate(180%)",
                border: "1px solid rgba(255, 255, 255, 0.6)",
                boxShadow: "0 4px 14px rgba(15, 23, 42, 0.05)",
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "10px",
                }}
              >
                <Typography
                  component="h2"
                  sx={{
                    fontFamily: SERIF,
                    fontSize: "16px",
                    fontWeight: 600,
                    color: "#B4000A",
                    fontStyle: "italic",
                  }}
                >
                  {t("success.prep.title", "What to prepare")}
                </Typography>
                <Typography
                  sx={{
                    fontFamily: SANS,
                    fontSize: "11px",
                    color: "rgba(15, 23, 42, 0.45)",
                    fontStyle: "italic",
                  }}
                >
                  {t("common.optional", "(Optional)")}
                </Typography>
              </Box>
              <PrepLine
                icon={<KeyRoundedIcon />}
                text={t(
                  "success.prep.room",
                  "Have your room number ready at reception"
                )}
              />
              <PrepLine
                icon={<ShowerRoundedIcon />}
                text={t(
                  "success.prep.shower",
                  "Light shower beforehand is recommended"
                )}
              />
              <PrepLine
                icon={<WaterDropRoundedIcon />}
                text={t(
                  "success.prep.water",
                  "Drink water · {{name}} brings everything else",
                  { name: therapistName.split(" ")[0] }
                )}
                last
              />
            </Box>

            {/* 🆕 Round 28b19 — Primary CTA changed from passive
                "Back to home" to ACTIVE "Contact Admin" with the
                booking refCode pre-filled. Reason: customers were
                booking and walking away without confirming, leaving
                admin unable to find their order. The new button
                deep-links to LINE/WhatsApp/Telegram with a ready-
                to-send message ("Hi, I just booked SR-XXXX, please
                confirm"). One-tap = booking gets seen.
                Bridge ribbon below the button shows the refCode +
                copy-to-clipboard for users who prefer their own
                channel. */}
            <Box
              sx={{
                marginTop: "22px",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
              }}
            >
              {/* 🆕 Round 28r10 (founder 2026-05-06) — Two changes:
                    • Order swap: Copy booking code now sits ABOVE
                      Contact admin (per founder direction "ย้าย copy
                      สลับกับปุ่มติดต่อ"). Reasoning: every guest needs
                      to keep their booking code first; chatting with
                      admin is a stronger commitment that comes second.
                    • Contact button label translated to English
                      (the rest of the page is English; the lone Thai
                      sentence read as a copy-paste glitch). */}
              <Button
                fullWidth
                onClick={() => {
                  if (typeof navigator !== "undefined" && navigator.clipboard) {
                    void navigator.clipboard
                      .writeText(refCode)
                      .catch(() => {});
                  }
                }}
                sx={{
                  height: 44,
                  borderRadius: "999px",
                  background: "rgba(255, 255, 255, 0.95)",
                  color: "#1A2B2E",
                  fontFamily: SANS,
                  fontWeight: 700,
                  fontSize: "13.5px",
                  textTransform: "none",
                  border: "1px solid rgba(15, 23, 42, 0.14)",
                  "&:hover": {
                    background: "#fff",
                    borderColor: "rgba(15, 23, 42, 0.22)",
                  },
                }}
              >
                {t("success.copyCode", "Copy reservation code · {{ref}}", {
                  ref: refCode,
                })}
              </Button>
              {/* 🆕 Round 28s90 (CRO audit) — Multi-channel confirm row.
                  Was a single LINE-only gradient button that dropped
                  WeChat (Chinese tourists) + Telegram-first guests into
                  the wrong app, where they bailed. Now every guest taps
                  their own channel; the booking refCode is pre-filled in
                  the message everywhere the platform allows a body
                  (WhatsApp + Telegram + LINE web; WeChat → QR scan page).
                  Brand-color icons reuse the home concierge grid set. */}
              <Typography
                sx={{
                  fontFamily: SANS,
                  fontSize: "12px",
                  fontWeight: 700,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                  color: "rgba(15, 23, 42, 0.55)",
                  textAlign: "center",
                  marginBottom: "-2px",
                }}
              >
                {t("success.confirmHeading", "Confirm with concierge")}
              </Typography>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "8px",
                }}
              >
                {(() => {
                  const message = encodeURIComponent(
                    t(
                      "success.msg.confirm",
                      "Hi SunRed concierge, I just placed reservation {{ref}}. Please confirm my order. Thanks!",
                      { ref: refCode }
                    )
                  );
                  const channels: Array<{
                    name: string;
                    Icon: React.ComponentType<{ size?: number }>;
                    href: string;
                    external: boolean;
                    fg: string;
                    bg: string;
                    border: string;
                  }> = [
                    {
                      name: t("success.channel.whatsapp", "WhatsApp"),
                      Icon: FaWhatsapp,
                      href: `https://wa.me/66634350987?text=${message}`,
                      external: true,
                      fg: "#25D366",
                      bg: "rgba(37, 211, 102, 0.10)",
                      border: "rgba(37, 211, 102, 0.28)",
                    },
                    {
                      name: t("success.channel.line", "LINE"),
                      Icon: FaLine,
                      href: "https://line.me/R/ti/p/@sunred.bkk",
                      external: true,
                      fg: "#06C755",
                      bg: "rgba(6, 199, 85, 0.10)",
                      border: "rgba(6, 199, 85, 0.28)",
                    },
                    {
                      name: t("success.channel.telegram", "Telegram"),
                      Icon: FaTelegramPlane,
                      href: `https://t.me/SunRedvip_bkk?text=${message}`,
                      external: true,
                      fg: "#229ED9",
                      bg: "rgba(34, 158, 217, 0.10)",
                      border: "rgba(34, 158, 217, 0.28)",
                    },
                    {
                      name: t("success.channel.wechat", "WeChat"),
                      Icon: FaWeixin,
                      href: "/wechat-scan",
                      external: false,
                      fg: "#07C160",
                      bg: "rgba(7, 193, 96, 0.10)",
                      border: "rgba(7, 193, 96, 0.28)",
                    },
                  ];
                  return channels.map((c) => (
                    <Button
                      key={c.name}
                      fullWidth
                      onClick={() => {
                        if (c.external) {
                          window.open(
                            c.href,
                            "_blank",
                            "noopener,noreferrer"
                          );
                        } else {
                          void navigate(c.href);
                        }
                      }}
                      startIcon={<c.Icon size={18} />}
                      sx={{
                        height: 46,
                        borderRadius: "999px",
                        background: c.bg,
                        color: c.fg,
                        fontFamily: SANS,
                        fontWeight: 700,
                        fontSize: "13.5px",
                        textTransform: "none",
                        border: `1px solid ${c.border}`,
                        "& .MuiButton-startIcon": { marginRight: "8px" },
                        "&:hover": {
                          background: c.bg,
                          borderColor: c.fg,
                          boxShadow: `0 4px 14px ${c.bg}`,
                        },
                      }}
                    >
                      {c.name}
                    </Button>
                  ));
                })()}
              </Box>
              {/* 🆕 Round 28s90 — reassurance line near the contact CTAs. */}
              <Typography
                sx={{
                  fontFamily: SANS,
                  fontSize: "11.5px",
                  color: "rgba(15, 23, 42, 0.55)",
                  textAlign: "center",
                  marginTop: "-2px",
                  lineHeight: 1.4,
                }}
              >
                {t(
                  "success.replyFast",
                  "Concierge typically replies in minutes · 24/7"
                )}
              </Typography>
              <Button
                fullWidth
                onClick={() => void navigate("/")}
                sx={{
                  height: 38,
                  borderRadius: "999px",
                  color: "rgba(15, 23, 42, 0.55)",
                  fontFamily: SANS,
                  fontWeight: 600,
                  fontSize: "12.5px",
                  textTransform: "none",
                  "&:hover": { background: "rgba(15, 23, 42, 0.04)" },
                }}
              >
                {t("success.backHome", "Back to home")}
              </Button>
            </Box>
          </>
        )
      )}
    </Box>
  );
};

// ─── Action card (2×2 grid item) ───────────────────────────────────────
// 🆕 Round 28b19 — `disabled` prop locks tile (no hover, no click,
//   "After confirmation" sub-text). Used until admin confirmation +
//   live tracking pipelines are wired. onClick is optional now.
const ActionCard: React.FC<{
  label: string;
  sub?: string;
  icon: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}> = ({ label, sub, icon, onClick, disabled = false }) => (
  <Box
    role={disabled ? undefined : "button"}
    tabIndex={disabled ? -1 : 0}
    aria-disabled={disabled || undefined}
    onClick={disabled ? undefined : onClick}
    onKeyDown={(e) => {
      if (disabled) return;
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        onClick?.();
      }
    }}
    sx={{
      // 🆕 Round 28r10 — Tighter sizing per founder direction:
      //   "ย่อขนาดลง เพราะมันดูรก". Padding 16/12 → 11/8, icon disc
      //   42 → 36, label 14 → 12.5, gap 8 → 6. Cards still hit the
      //   44px tap-target floor.
      padding: "11px 8px",
      borderRadius: "14px",
      background: "rgba(255, 255, 255, 0.55)",
      backdropFilter: "blur(20px) saturate(180%)",
      WebkitBackdropFilter: "blur(20px) saturate(180%)",
      border: "1px solid rgba(255, 255, 255, 0.6)",
      boxShadow: disabled
        ? "0 1px 2px rgba(15, 23, 42, 0.03)"
        : "0 2px 8px rgba(15, 23, 42, 0.04)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: "6px",
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.55 : 1,
      filter: disabled ? "grayscale(0.4)" : "none",
      transition: "transform 0.15s ease, box-shadow 0.15s ease",
      ...(disabled
        ? {}
        : {
            "&:hover": {
              transform: "translateY(-1px)",
              boxShadow: "0 6px 16px rgba(15, 23, 42, 0.08)",
            },
            "&:focus-visible": {
              outline: "2px solid #B4000A",
              outlineOffset: "2px",
            },
          }),
    }}
  >
    <Box
      aria-hidden
      sx={{
        width: 36,
        height: 36,
        borderRadius: "50%",
        background: disabled
          ? "#64748b"
          : "#B4000A",
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: disabled
          ? "0 2px 6px rgba(15, 23, 42, 0.08)"
          : "0 4px 10px rgba(15, 23, 42, 0.22)",
        "& svg": { fontSize: 18 },
      }}
    >
      {icon}
    </Box>
    <Typography
      sx={{
        fontFamily: SERIF,
        fontSize: "12.5px",
        fontWeight: 700,
        color: "#1A2B2E",
        textAlign: "center",
        lineHeight: 1.15,
      }}
    >
      {label}
    </Typography>
    {sub && (
      <Typography
        sx={{
          fontFamily: SANS,
          fontSize: "10px",
          color: "rgba(15, 23, 42, 0.55)",
          textAlign: "center",
          marginTop: "-3px",
          lineHeight: 1.15,
        }}
      >
        {sub}
      </Typography>
    )}
  </Box>
);

// ─── Summary row ─────────────────────────────────────────────────────────
const SummaryLine: React.FC<{
  label: string;
  value: React.ReactNode;
  last?: boolean;
}> = ({ label, value, last }) => (
  <Box
    sx={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "baseline",
      gap: "12px",
      marginBottom: last ? 0 : "8px",
    }}
  >
    <Typography
      sx={{
        fontFamily: SANS,
        fontSize: "12.5px",
        color: "rgba(15, 23, 42, 0.6)",
        flexShrink: 0,
      }}
    >
      {label}
    </Typography>
    <Box
      component="span"
      sx={{
        fontFamily: SANS,
        fontSize: "13.5px",
        fontWeight: 600,
        color: "#1A2B2E",
        textAlign: "right",
        lineHeight: 1.3,
        minWidth: 0,
      }}
    >
      {value}
    </Box>
  </Box>
);

// ─── Prep tip line ───────────────────────────────────────────────────────
const PrepLine: React.FC<{
  icon: React.ReactNode;
  text: string;
  last?: boolean;
}> = ({ icon, text, last }) => (
  <Box
    sx={{
      display: "flex",
      alignItems: "flex-start",
      gap: "10px",
      marginBottom: last ? 0 : "10px",
    }}
  >
    <Box
      aria-hidden
      sx={{
        width: 28,
        height: 28,
        flexShrink: 0,
        borderRadius: "8px",
        background: "rgba(20, 184, 166, 0.10)",
        color: "#14b8a6",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        marginTop: "1px",
        "& svg": { fontSize: 16 },
      }}
    >
      {icon}
    </Box>
    <Typography
      sx={{
        flex: 1,
        fontFamily: SANS,
        fontSize: "13px",
        color: "rgba(15, 23, 42, 0.78)",
        lineHeight: 1.55,
      }}
    >
      {text}
    </Typography>
  </Box>
);

export default BookingSuccessPage;
