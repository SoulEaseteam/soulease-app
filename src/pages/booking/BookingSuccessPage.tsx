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
import KeyRoundedIcon from "@mui/icons-material/KeyRounded";
import ShowerRoundedIcon from "@mui/icons-material/ShowerRounded";
import WaterDropRoundedIcon from "@mui/icons-material/WaterDropRounded";
// 🆕 28x.153 — the 2×2 quick-action grid (Chat / Track / Calendar / Reschedule).
import ChatBubbleRoundedIcon from "@mui/icons-material/ChatBubbleRounded";
import PinDropRoundedIcon from "@mui/icons-material/PinDropRounded";
import EventRoundedIcon from "@mui/icons-material/EventRounded";
import AutorenewRoundedIcon from "@mui/icons-material/AutorenewRounded";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { bookingRef } from "@/utils/bookingRef";
// 🆕 Round 28x.140 — in-page thread with the concierge / assigned practitioner.
import BookingChatThread from "@/components/chat/BookingChatThread";
// 🆕 Round 28s90 (CRO audit) — multi-channel confirm row. Chinese
//   tourists (WeChat) + the Telegram-first audience were being dumped
//   into a LINE-only button and bailing at the finish line. Same
//   brand-color channel icon set the home concierge grid uses.
import { doc, getDoc, type DocumentData } from "firebase/firestore";
// 🆕 28x.65 — token-gated read, so bookings no longer need `allow get: if true`.
import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "@/lib/firebase";
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
// 🆕 Round 28r71 — shared concierge endpoints (r71 rebrand phase 2).
import { CONCIERGE } from "@/config/concierge";
import ConciergeModeIcon from "@/components/common/ConciergeModeIcon";

import { db } from "@/lib/firebase";
// 🆕 Round 28r52 — Phase 3.1 responsive shell.
// 🆕 Round 28r56 — Phase 3.5 responsive typography for headings.
import { responsiveShellNarrow, responsiveType } from "@/theme/breakpoints";

// 🆕 28x.105 — SERIF alias → readable SANS stack (founder readability pass).
const SERIF = '"Inter", system-ui, -apple-system, sans-serif';
const SANS = '"Inter", system-ui, -apple-system, sans-serif';

// 30 min prep buffer — shown as 'Will leave for your location at HH:mm'
const PREP_BUFFER_MIN = 30;

const BookingSuccessPage: React.FC = () => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  // 🆕 28x.65 — the capability token minted at checkout, carried in the URL.
  //   Absent for older links and for arrivals from booking history; in those
  //   cases the callable falls back to proving ownership by sign-in.
  const [searchParams] = useSearchParams();
  const accessToken = searchParams.get("t") ?? "";
  const navigate = useNavigate();
  const [booking, setBooking] = useState<DocumentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // 🆕 Round 28r9 — same time-aware mode the rest of the site uses.
  const concierge = useConciergeMode();
  const modeTint =
    concierge.mode === "prime"
      ? "var(--sr-ink)"
      : concierge.mode === "evening"
      ? "#F59E0B"
      : concierge.mode === "off"
      ? "var(--sr-muted)"
      : "var(--sr-ink)";

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
        // 🆕 28x.65 — go through the callable, which verifies the token (or
        //   sign-in) server-side and returns a redacted booking. The direct
        //   read below is kept only as a fallback for a signed-in owner, whose
        //   own rule branch still permits it — if the callable is ever down,
        //   a logged-in guest still sees their confirmation.
        let loaded: DocumentData | null = null;
        try {
          const fn = httpsCallable<
            { bookingId: string; token: string },
            { ok: boolean; booking: DocumentData }
          >(getFunctions(app, "asia-southeast1"), "getBookingPublic");
          const res = await fn({ bookingId: id, token: accessToken });
          loaded = res.data?.booking ?? null;
        } catch (callErr) {
          console.warn("[success] callable read failed, trying direct", callErr);
          const snap = await getDoc(doc(db, "bookings", id));
          loaded = snap.exists() ? snap.data() : null;
        }
        if (!alive) return;
        if (!loaded) {
          setError(t("success.err.notFound", "Booking not found"));
        } else {
          setBooking(loaded);
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
  }, [id, t, accessToken]);

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

  // 🆕 28w.98 — format moved to utils/bookingRef so the reward dialog shows the
  //   SAME reference the guest sees here, not a second derivation of it.
  const refCode = bookingRef(id);

  // 🆕 Round 28b21 — Phase 2: 10-min hold window. Field present only on
  //   bookings created after this round; older docs render no countdown.
  // 🆕 28x.65 — the callable returns timestamps as epoch ms (JSON has no
  //   Timestamp), while the direct-read fallback still yields a Firestore
  //   Timestamp. Handle both, or the hold countdown silently vanishes for
  //   every guest — the exact people it exists to warn.
  const holdExpiresAt: Date | null = (() => {
    const raw = booking?.holdExpiresAt as
      | { toDate?: () => Date }
      | number
      | string
      | null
      | undefined;
    if (raw == null) return null;
    if (typeof raw === "object" && typeof raw.toDate === "function") {
      return raw.toDate();
    }
    const d = new Date(raw as number | string);
    return isNaN(d.getTime()) ? null : d;
  })();
  const holdState = (booking?.holdState as string | undefined) ?? undefined;
  const therapistIdForRebook =
    (booking?.therapistId as string | undefined) ?? undefined;

  // 🆕 28x.153 (founder reference screenshot, "แบบนี้" — confirming the 2×2
  //   tile layout, second time she's sent it) — reconciles the tile grid
  //   (28x.151) with the real chat thread 28x.140 mounted lower on this
  //   page: "Chat with {name}" now toggles the SAME BookingChatThread
  //   inline (moved up, see below) instead of a Telegram deep-link. Track/
  //   Calendar/Reschedule are unchanged from 28x.151 — chat is the only
  //   tile 28x.140 gave a real answer for.
  const [chatOpen, setChatOpen] = useState(false);
  const place =
    (booking?.locationName as string | undefined)?.trim() ||
    (booking?.address as string | undefined)?.trim() ||
    "";
  const mapHref = place
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place)}`
    : null;
  const rescheduleMessage = encodeURIComponent(
    t(
      "success.msg.reschedule",
      "Hi SunRed concierge, I'd like to reschedule my reservation {{ref}}. Could you help me pick a new time?",
      { ref: refCode }
    )
  );
  const rescheduleHref = `https://t.me/SunRedvip_bkk?text=${rescheduleMessage}`;
  const handleAddToCalendar = () => {
    if (!startAt) return;
    const durationMin =
      typeof booking?.duration === "number" ? (booking.duration as number) : 60;
    const endAt = new Date(startAt.getTime() + durationMin * 60000);
    const stamp = (d: Date) =>
      d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
    const summary = `${getServiceLabel(
      booking?.serviceId as string | undefined,
      booking?.serviceName as string | undefined
    )} · ${therapistName} · SunRed`;
    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//SunRed//Booking//EN",
      "BEGIN:VEVENT",
      `UID:${id ?? refCode}@sunred.vip`,
      `DTSTAMP:${stamp(new Date())}`,
      `DTSTART:${stamp(startAt)}`,
      `DTEND:${stamp(endAt)}`,
      `SUMMARY:${summary}`,
      place ? `LOCATION:${place.replace(/\n/g, ", ")}` : null,
      `DESCRIPTION:SunRed reservation ${refCode}`,
      "END:VEVENT",
      "END:VCALENDAR",
    ]
      .filter((l) => l !== null)
      .join("\r\n");
    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sunred-${refCode}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  };

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
        // 🆕 28x.105 (founder "ปรับให้เป็นสัดส่วน เข้าใจง่าย สวยงาม") —
        //   back to ONE centered column. 28r56's 900-1100px 2-col split
        //   left the right column ending at 1/3 height with a huge dark
        //   void under it on desktop; a receipt page reads best narrow.
        maxWidth: {
          xs: "430px",
          sm: "600px",
          md: "640px",
        },
        minHeight: "100vh",
        background: "var(--sr-bg)",
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
          <CircularProgress sx={{ color: "var(--sr-body)" }} />
        </Box>
      ) : error ? (
        <Box sx={{ textAlign: "center", paddingTop: "60px" }}>
          <Typography
            sx={{
              fontFamily: SERIF,
              fontSize: "20px",
              color: "var(--sr-ink)",
              marginBottom: "12px",
            }}
          >
            {error}
          </Typography>
          <Button
            onClick={() => void navigate("/")}
            sx={{ color: "var(--sr-body)", textTransform: "none" }}
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
                // 🆕 28x.105 — single column on every breakpoint (see the
                //   shell maxWidth note above; the md 2-col split is gone).
                display: "grid",
                gridTemplateColumns: "1fr",
                gap: 0,
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
                background: "#D97C95",
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
                      "0 18px 48px rgba(15, 23, 42, 0.45), 0 0 0 14px rgba(45, 45, 43, 0)",
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
                color: "var(--sr-ink)",
                textAlign: "center",
                lineHeight: 1.05,
              }}
            >
              {t("success.title", "You're all set.")}
            </Typography>

            {/* 🆕 Round 28r61 — bilingual pass: tiny Thai subtitle
                under the headline. Renders regardless of picked
                locale so Thai locals feel welcomed. */}
            <Typography
              sx={{
                fontFamily: SANS,
                fontSize: "11px",
                fontWeight: 500,
                color: "var(--sr-muted)",
                textAlign: "center",
                letterSpacing: "0.02em",
                marginTop: "4px",
              }}
            >
              {t("success.received", "Reservation received")}
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
                  background: "var(--sr-panel-2)",
                  border: "1px solid var(--sr-hairline)",
                  fontFamily: SANS,
                  fontSize: "12px",
                  fontWeight: 700,
                  color: "var(--sr-body)",
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
                color: "var(--sr-body)",
                textAlign: "center",
                marginTop: "12px",
                lineHeight: 1.55,
                padding: "0 8px",
              }}
            >
              {t(
                "success.subtitle",
                "{{name}} will arrive at {{time}}.",
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
                        ? "var(--sr-body)"
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
                  "@media (prefers-reduced-motion: reduce)": {
                    animation: "none",
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

            {/* 🆕 28x.151/153 (founder reference screenshot, sent twice —
                "แบบนี้") — 2×2 quick-action grid. Chat opens the real
                BookingChatThread (28x.140) inline right below; the other
                three are unchanged from 28x.151. */}
            <Box
              sx={{
                marginTop: "18px",
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "10px",
              }}
            >
              <ActionTile
                icon={<ChatBubbleRoundedIcon />}
                label={t("success.action.chat", "Chat with {{name}}", {
                  name: therapistName,
                })}
                sub={
                  chatOpen
                    ? t("success.action.chatSubOpen", "Tap to close")
                    : t("success.action.chatSub", "Message here")
                }
                onClick={() => setChatOpen((v) => !v)}
              />
              <ActionTile
                icon={<PinDropRoundedIcon />}
                label={t("success.action.track", "Track arrival")}
                sub={t("success.action.trackSub", "Live map")}
                href={mapHref ?? undefined}
                disabled={!mapHref}
              />
              <ActionTile
                icon={<EventRoundedIcon />}
                label={t("success.action.calendar", "Add to calendar")}
                sub={t("success.action.calendarSub", ".ics file")}
                onClick={startAt ? handleAddToCalendar : undefined}
                disabled={!startAt}
              />
              <ActionTile
                icon={<AutorenewRoundedIcon />}
                label={t("success.action.reschedule", "Reschedule")}
                sub={t("success.action.rescheduleSub", "Free")}
                href={rescheduleHref}
              />
            </Box>

            {/* 🆕 28x.140/153 — the real chat thread, revealed by the "Chat
                with {{name}}" tile above instead of always-mounted, so the
                page matches the founder's tile-first reference exactly. */}
            {chatOpen && id && (
              <Box sx={{ marginTop: "10px" }}>
                <BookingChatThread
                  bookingId={id}
                  mode="guest"
                  accessToken={accessToken}
                  therapistNameHint={
                    (booking?.therapistName as string | undefined) ?? undefined
                  }
                />
              </Box>
            )}

            {/* 🆕 Round 28s90 (CRO audit) — Multi-channel confirm row.
                Was a single LINE-only gradient button that dropped
                WeChat (Chinese tourists) + Telegram-first guests into
                the wrong app, where they bailed. Now every guest taps
                their own channel; the booking refCode is pre-filled in
                the message everywhere the platform allows a body
                (WhatsApp + Telegram + LINE web; WeChat → QR scan page).
                Brand-color icons reuse the home concierge grid set.
                Round 28s??? (founder) — moved to the TOP of the content,
                immediately after the hero cluster ("ย้ายไปไว้ด้านบน"). */}
            <Box
              sx={{
                minWidth: 0,
                // 🆕 28x.105 — the confirm cluster (copy code + channels) is
                //   now a rose-bordered card so the ONE action this page
                //   exists for reads as a single obvious step instead of
                //   loose text floating in the void. Channel tiles inside
                //   stay borderless per 28x.34b.
                marginTop: "18px",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                padding: "16px 16px 12px",
                borderRadius: "20px",
                background: "var(--sr-panel)",
                border: "1px solid rgba(217, 124, 149, 0.35)",
                boxShadow: "var(--sr-card-shadow)",
              }}
            >
              {/* 🆕 28x.33 (founder "ย้ายไปไว้ด้านบน") — Copy reservation code
                  moved up here, above the concierge confirm block: copy the
                  ref, then send it via a channel below. */}
              <Button
                fullWidth
                onClick={() => {
                  if (typeof navigator !== "undefined" && navigator.clipboard) {
                    void navigator.clipboard.writeText(refCode).catch(() => {});
                  }
                }}
                sx={{
                  height: 44,
                  borderRadius: "999px",
                  background: "var(--sr-panel)",
                  color: "var(--sr-ink)",
                  fontFamily: SANS,
                  fontWeight: 700,
                  fontSize: "13.5px",
                  textTransform: "none",
                  border: "1px solid var(--sr-hairline)",
                  "&:hover": {
                    background: "var(--sr-panel)",
                    borderColor: "var(--sr-hairline)",
                  },
                }}
              >
                {t("success.copyCode", "Copy reservation code · {{ref}}", {
                  ref: refCode,
                })}
              </Button>
              <Typography
                sx={{
                  fontFamily: SANS,
                  fontSize: "12px",
                  fontWeight: 700,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                  color: "var(--sr-muted)",
                  textAlign: "center",
                  marginBottom: "-2px",
                }}
              >
                {t("success.confirmHeading", "Confirm with concierge")}
              </Typography>
              <Box
                sx={{
                  display: "grid",
                  // 🆕 28x.34b (founder "เรียง4ทุกจอ") — 4 in one row on every
                  //   screen (was 2×2).
                  gridTemplateColumns: "repeat(4, 1fr)",
                  gap: "6px",
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
                  // 🆕 28x.34 (founder) — icon-tile style (colored app icon +
                  //   name on a card) replacing the pill buttons, matching the
                  //   site's "Reach us" grid. The booking-ref prefill is kept
                  //   on the WhatsApp/Telegram hrefs.
                  const channels: Array<{
                    name: string;
                    src: string;
                    href: string;
                    external: boolean;
                  }> = [
                    {
                      name: t("success.channel.whatsapp", "WhatsApp"),
                      src: "/images/profli/whatsapp.png",
                      href: `${CONCIERGE.whatsappUrl}?text=${message}`,
                      external: true,
                    },
                    {
                      name: t("success.channel.line", "LINE"),
                      src: "/images/profli/line.png",
                      href: "https://line.me/R/ti/p/@sunred.bkk",
                      external: true,
                    },
                    {
                      name: t("success.channel.telegram", "Telegram"),
                      src: "/images/profli/telegram.png",
                      href: `https://t.me/SunRedvip_bkk?text=${message}`,
                      external: true,
                    },
                    {
                      name: t("success.channel.wechat", "WeChat"),
                      src: "/images/profli/wechat_2626283.png",
                      href: "/wechat-scan",
                      external: false,
                    },
                  ];
                  return channels.map((c) => (
                    <Box
                      key={c.name}
                      component="a"
                      href={c.href}
                      target={c.external ? "_blank" : undefined}
                      rel={c.external ? "noopener noreferrer" : undefined}
                      onClick={(e: React.MouseEvent) => {
                        if (!c.external) {
                          e.preventDefault();
                          void navigate(c.href);
                        }
                      }}
                      aria-label={`Confirm via ${c.name}`}
                      sx={{
                        // 🆕 28x.34b (founder "เอาขอบออกให้เหลือแค่ไอคอน") —
                        //   borderless: just the app icon + name, no card.
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 0.75,
                        py: 1,
                        px: 0.25,
                        textDecoration: "none",
                        cursor: "pointer",
                        transition: "transform 0.15s ease",
                        "&:hover": { transform: "translateY(-2px)" },
                      }}
                    >
                      {/* 🆕 28x.105c (founder "ขยายขึ้นอีกนิด ไอคอน") — 26→36px */}
                      <Box
                        component="img"
                        src={c.src}
                        alt=""
                        width={36}
                        height={36}
                        loading="lazy"
                        sx={{ width: 36, height: 36, objectFit: "contain" }}
                      />
                      <Typography
                        sx={{
                          fontFamily: SANS,
                          fontSize: 12,
                          fontWeight: 600,
                          color: "var(--sr-body)",
                        }}
                      >
                        {c.name}
                      </Typography>
                    </Box>
                  ));
                })()}
              </Box>
              {/* 🆕 Round 28s90 — reassurance line near the contact CTAs. */}
              <Typography
                sx={{
                  fontFamily: SANS,
                  fontSize: "11.5px",
                  color: "var(--sr-muted)",
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
            </Box>
            </Box>{/* end top-cluster 2-col grid */}

            {/* Your booking summary */}
            <Box
              sx={{
                marginTop: "16px",
                padding: "16px 18px",
                borderRadius: "20px",
                background: "var(--sr-panel)",
                backdropFilter: "blur(20px) saturate(180%)",
                WebkitBackdropFilter: "blur(20px) saturate(180%)",
                border: "1px solid var(--sr-panel)",
                boxShadow: "var(--sr-card-shadow)",
              }}
            >
              <Typography
                component="h2"
                sx={{
                  fontFamily: SERIF,
                  fontSize: "16px",
                  fontWeight: 600,
                  color: "var(--sr-body)",
                  fontStyle: "italic",
                  marginBottom: "2px",
                }}
              >
                {t("success.summary.title", "Your reservation")}
              </Typography>
              {/* 🆕 Round 28r61 — bilingual pass: tiny Thai subtitle. */}
              <Typography
                sx={{
                  fontFamily: SANS,
                  fontSize: "10.5px",
                  fontWeight: 500,
                  color: "var(--sr-muted)",
                  letterSpacing: "0.02em",
                  marginBottom: "10px",
                }}
              >
                {t("success.details", "Reservation details")}
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
                              color: "var(--sr-muted)",
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
                      color: "var(--sr-body)",
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
                background: "var(--sr-panel)",
                backdropFilter: "blur(20px) saturate(180%)",
                WebkitBackdropFilter: "blur(20px) saturate(180%)",
                border: "1px solid var(--sr-panel)",
                boxShadow: "var(--sr-card-shadow)",
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
                <Box sx={{ display: "flex", flexDirection: "column" }}>
                  <Typography
                    component="h2"
                    sx={{
                      fontFamily: SERIF,
                      fontSize: "16px",
                      fontWeight: 600,
                      color: "var(--sr-body)",
                      fontStyle: "italic",
                      lineHeight: 1.2,
                    }}
                  >
                    {t("success.prep.title", "What to prepare")}
                  </Typography>
                  {/* 🆕 Round 28r61 — bilingual pass: tiny Thai subtitle. */}
                  <Typography
                    sx={{
                      fontFamily: SANS,
                      fontSize: "10.5px",
                      fontWeight: 500,
                      color: "var(--sr-muted)",
                      letterSpacing: "0.02em",
                      marginTop: "1px",
                    }}
                  >
                    {t("success.prepare", "What to prepare")}
                  </Typography>
                </Box>
                <Typography
                  sx={{
                    fontFamily: SANS,
                    fontSize: "11px",
                    color: "var(--sr-muted)",
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
            {/* 🆕 28x.153 — the chat thread (28x.140) moved up: it now
                mounts right below the 2×2 tile grid, revealed by the "Chat
                with {{name}}" tile instead of always-visible here. See the
                chatOpen block right after the hero cluster. */}

            <Box
              sx={{
                marginTop: "22px",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
              }}
            >
              <Button
                fullWidth
                onClick={() => void navigate("/")}
                sx={{
                  height: 38,
                  borderRadius: "999px",
                  color: "var(--sr-muted)",
                  fontFamily: SANS,
                  fontWeight: 600,
                  fontSize: "12.5px",
                  textTransform: "none",
                  "&:hover": { background: "var(--sr-hairline)" },
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
        color: "var(--sr-body)",
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
        color: "var(--sr-ink)",
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
        color: "var(--sr-body)",
        lineHeight: 1.55,
      }}
    >
      {text}
    </Typography>
  </Box>
);

// ─── Quick-action tile (2×2 grid) ───────────────────────────────────────
// 🆕 28x.151/153 — either an external link (href — track/reschedule) or a
//   local handler (onClick — chat toggle/add to calendar). `disabled` dims
//   the tile and swaps it from an <a>/<button> to a plain <div> so it isn't
//   a dead control.
const ActionTile: React.FC<{
  icon: React.ReactNode;
  label: string;
  sub: string;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
}> = ({ icon, label, sub, href, onClick, disabled }) => {
  const content = (
    <>
      <Box
        aria-hidden
        sx={{
          width: 34,
          height: 34,
          borderRadius: "50%",
          background: "rgba(255,153,153,0.12)",
          color: "#FF9999",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          "& svg": { fontSize: 18 },
        }}
      >
        {icon}
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography
          sx={{
            fontFamily: SANS,
            fontSize: "12.5px",
            fontWeight: 700,
            color: "var(--sr-ink)",
            lineHeight: 1.25,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {label}
        </Typography>
        <Typography
          sx={{
            fontFamily: SANS,
            fontSize: "11px",
            color: "var(--sr-muted)",
            marginTop: "1px",
          }}
        >
          {sub}
        </Typography>
      </Box>
    </>
  );

  const sx = {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "12px 14px",
    borderRadius: "16px",
    background: "var(--sr-panel)",
    border: "1px solid var(--sr-hairline)",
    boxShadow: "var(--sr-card-shadow)",
    textDecoration: "none",
    cursor: disabled ? "default" : "pointer",
    opacity: disabled ? 0.5 : 1,
    transition: "transform 0.15s ease",
    "&:hover": disabled ? undefined : { transform: "translateY(-1px)" },
  } as const;

  if (disabled) {
    return <Box sx={sx}>{content}</Box>;
  }
  if (onClick) {
    return (
      <Box component="button" type="button" onClick={onClick} sx={{ ...sx, border: sx.border, textAlign: "left" }}>
        {content}
      </Box>
    );
  }
  return (
    <Box component="a" href={href} target="_blank" rel="noopener noreferrer" sx={sx}>
      {content}
    </Box>
  );
};

export default BookingSuccessPage;
