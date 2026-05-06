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
// 🆕 Round 28b21 — Phase 3: admin online presence badge.
import AdminPresenceBadge from "@/components/common/AdminPresenceBadge";

import { db } from "@/lib/firebase";

const SERIF = '"Fraunces", Georgia, "Times New Roman", serif';
const SANS = '"Inter", system-ui, -apple-system, sans-serif';

// 30 min prep buffer — shown as 'Will leave for your location at HH:mm'
const PREP_BUFFER_MIN = 30;

const BookingSuccessPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [booking, setBooking] = useState<DocumentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setError("No booking id");
      setLoading(false);
      return;
    }
    const fetch = async () => {
      try {
        const snap = await getDoc(doc(db, "bookings", id));
        if (!snap.exists()) {
          setError("Booking not found");
        } else {
          setBooking(snap.data());
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    };
    void fetch();
  }, [id]);

  // ── Derived display values (booked once, then memoize-safe to recompute) ──
  const therapistName =
    (booking?.therapistName as string | undefined) ?? "Your therapist";
  const startAt: Date | null = booking?.startAt?.toDate
    ? (booking.startAt.toDate() as Date)
    : null;
  // 🆕 Round 28b59 — `endAt` derivation removed (was only consumed
  //   by the dead onAddToCalendar handler). If a future feature needs
  //   the end timestamp, recompute via startAt + duration*60000.
  // 🆕 Round 28an — all wall-clock display anchored to BKK.
  // 🆕 Round 28b57 — `h:mm A` (e.g. "8:00 PM") canonical format —
  //   matches prettyHHMM/fmtBKKTime site-wide.
  const timeLabel = fmtBKK(startAt, "h:mm A");
  const dateLabel = startAt
    ? sameDayBKK(startAt, nowBKK())
      ? "Today"
      : sameDayBKK(startAt, nowBKK().add(1, "day"))
        ? "Tomorrow"
        : fmtBKK(startAt, "ddd, MMM D")
    : "—";
  const leaveLabel = startAt
    ? fmtBKK(
        toBKK(startAt)?.subtract(PREP_BUFFER_MIN, "minute") ?? null,
        "HH:mm A",
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
        maxWidth: "430px",
        margin: "0 auto",
        minHeight: "100vh",
        background: "linear-gradient(180deg, #FAFBFC 0%, #F1F3F5 100%)",
        borderRadius: "28px",
        overflow: "hidden",
        boxShadow: "0 20px 60px rgba(126, 30, 46, 0.15)",
        position: "relative",
        padding: "32px 20px 40px",
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
          <CircularProgress sx={{ color: "#FE0944" }} />
        </Box>
      ) : error ? (
        <Box sx={{ textAlign: "center", paddingTop: "60px" }}>
          <Typography
            sx={{
              fontFamily: SERIF,
              fontSize: "20px",
              color: "#3c1e14",
              marginBottom: "12px",
            }}
          >
            {error}
          </Typography>
          <Button
            onClick={() => void navigate("/")}
            sx={{ color: "#FE0944", textTransform: "none" }}
          >
            Back to home
          </Button>
        </Box>
      ) : (
        booking && (
          <>
            {/* Pulsing check disc */}
            <Box
              sx={{
                width: 96,
                height: 96,
                borderRadius: "50%",
                background: "linear-gradient(135deg, #FE0944, #FE7A52)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "16px auto 20px",
                boxShadow: "0 14px 40px rgba(254, 9, 68, 0.35)",
                animation: "successPulse 1.6s ease-in-out infinite",
                "@keyframes successPulse": {
                  "0%, 100%": {
                    transform: "scale(1)",
                    boxShadow:
                      "0 14px 40px rgba(254, 9, 68, 0.35), 0 0 0 0 rgba(254, 9, 68, 0.45)",
                  },
                  "50%": {
                    transform: "scale(1.06)",
                    boxShadow:
                      "0 18px 48px rgba(254, 9, 68, 0.45), 0 0 0 14px rgba(254, 9, 68, 0)",
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
                fontSize: "30px",
                fontWeight: 500,
                letterSpacing: "-0.02em",
                color: "#3c1e14",
                textAlign: "center",
                lineHeight: 1.05,
              }}
            >
              You&rsquo;re all{" "}
              <Box
                component="em"
                sx={{ fontStyle: "italic", color: "#FE0944", fontWeight: 600 }}
              >
                booked
              </Box>
              .
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
                  background: "rgba(254, 9, 68, 0.08)",
                  border: "1px solid rgba(254, 9, 68, 0.18)",
                  fontFamily: SANS,
                  fontSize: "12px",
                  fontWeight: 700,
                  color: "#FE0944",
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
                color: "rgba(60, 30, 20, 0.7)",
                textAlign: "center",
                marginTop: "12px",
                lineHeight: 1.55,
                padding: "0 8px",
              }}
            >
              We&rsquo;ve sent confirmation to your email and {therapistName}{" "}
              will arrive at {timeLabel}.
            </Typography>

            {/* 🆕 Round 28b28 (founder 2026-05-04) — Order swap:
                AdminPresenceBadge now sits ABOVE HoldCountdown. Reasoning:
                if the customer sees "Admin online · usually replies in
                1 min" FIRST, the urgency of the countdown beneath it
                feels productive ("admin will confirm me before time
                runs out"), not anxious ("am I racing a robot?"). */}
            <Box sx={{ marginTop: "12px", display: "flex", justifyContent: "center" }}>
              <AdminPresenceBadge />
            </Box>

            {/* 🆕 Round 28b21 — Phase 2: 10-minute hold countdown.
                Round 28b28 — moved below the admin presence pill. */}
            <HoldCountdown
              holdExpiresAt={holdExpiresAt}
              holdState={holdState}
              therapistId={therapistIdForRebook}
            />

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
                  {therapistName} is preparing your session
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
                    ? `Will leave for your location at ${leaveLabel} · Track in real-time`
                    : "We'll send a tracking link before departure."}
                </Typography>
              </Box>
              
                   {/* Live status banner */}
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
            </Box>

            {/* 🆕 Round 28b19 (founder 2026-05-04) — 2×2 quick-action
                grid is LOCKED until admin confirmation flow is wired.
                Reason: customers were tapping "Chat / Track / Calendar /
                Reschedule" before admin had even seen the booking,
                creating support churn. Until backend confirmation and
                live tracking ship, these tiles render dim + non-clickable
                with a "After confirmation" hint so customers know they'll
                unlock automatically once admin accepts the booking. */}
            <Box
              sx={{
                marginTop: "16px",
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "10px",
                position: "relative",
              }}
            >
              <ActionCard
                label={`Chat with ${therapistName.split(" ")[0]}`}
                sub="After confirmation"
                icon={<ChatRoundedIcon />}
                disabled
              />
              <ActionCard
                label="Track arrival"
                sub="After confirmation"
                icon={<PinDropRoundedIcon />}
                disabled
              />
              <ActionCard
                label="Add to calendar"
                sub="After confirmation"
                icon={<CalendarMonthRoundedIcon />}
                disabled
              />
              <ActionCard
                label="Reschedule"
                sub="After confirmation"
                icon={<AutorenewRoundedIcon />}
                disabled
              />
            </Box>

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
                boxShadow: "0 4px 14px rgba(126, 30, 46, 0.05)",
              }}
            >
              <Typography
                component="h2"
                sx={{
                  fontFamily: SERIF,
                  fontSize: "16px",
                  fontWeight: 600,
                  color: "#FE0944",
                  fontStyle: "italic",
                  marginBottom: "10px",
                }}
              >
                Your booking
              </Typography>
              <SummaryLine
                label="Therapist"
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
                label="Service"
                value={`${getServiceLabel(
                  booking.serviceId as string | undefined,
                  booking.serviceName as string | undefined
                )}${
                  booking.duration ? ` · ${booking.duration as number} min` : ""
                }`}
              />
              <SummaryLine label="Time" value={`${dateLabel} · ${timeLabel}`} />
              <SummaryLine
                label="Location"
                value={
                  (booking.locationName as string) ??
                  (booking.address as string) ??
                  "—"
                }
              />
              <SummaryLine
                label="Total paid"
                value={
                  <Box
                    component="span"
                    sx={{
                      fontFamily: SERIF,
                      fontWeight: 700,
                      color: "#FE0944",
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
                boxShadow: "0 4px 14px rgba(126, 30, 46, 0.05)",
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
                    color: "#FE0944",
                    fontStyle: "italic",
                  }}
                >
                  What to prepare
                </Typography>
                <Typography
                  sx={{
                    fontFamily: SANS,
                    fontSize: "11px",
                    color: "rgba(60, 30, 20, 0.45)",
                    fontStyle: "italic",
                  }}
                >
                  (optional)
                </Typography>
              </Box>
              <PrepLine
                icon={<KeyRoundedIcon />}
                text="Have your room number ready at reception"
              />
              <PrepLine
                icon={<ShowerRoundedIcon />}
                text="Light shower beforehand is recommended"
              />
              <PrepLine
                icon={<WaterDropRoundedIcon />}
                text={`Drink water · ${therapistName.split(" ")[0]} brings everything else`}
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
              <Button
                fullWidth
                onClick={() => {
                  const message = encodeURIComponent(
                    `Hi SunRed admin, I just placed booking ${refCode}. Please confirm my order. Thanks!`
                  );
                  // Prefer LINE on mobile, fall back to WhatsApp.
                  // Both deep-links auto-open the right app on iOS/Android.
                  const lineUrl = `https://line.me/R/ti/p/@sunred.bkk?from=page&searchId=sunred.bkk`;
                  const waUrl = `https://wa.me/66634350987?text=${message}`;
                  // Open LINE first; if user has no LINE installed, browser
                  // will fall back to the web LINE which still works.
                  window.open(lineUrl, "_blank", "noopener,noreferrer");
                  // Also keep WhatsApp ready to copy/share — log so admin
                  // can debug if a customer reports the link didn't open.
                  // eslint-disable-next-line no-console
                  console.info("[contact-admin] WA fallback:", waUrl);
                }}
                sx={{
                  height: 52,
                  borderRadius: "999px",
                  background:
                    "linear-gradient(135deg, #06C755 0%, #00B900 100%)",
                  color: "#fff",
                  fontFamily: SANS,
                  fontWeight: 700,
                  fontSize: "15px",
                  textTransform: "none",
                  boxShadow:
                    "0 6px 18px rgba(6, 199, 85, 0.35), 0 1px 2px rgba(0,0,0,0.08)",
                  "&:hover": {
                    background:
                      "linear-gradient(135deg, #05B84D 0%, #009900 100%)",
                  },
                }}
              >
                ติดต่อแอดมินเพื่อยืนยันการจอง · {refCode}
              </Button>
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
                  height: 38,
                  borderRadius: "999px",
                  background: "rgba(255, 255, 255, 0.85)",
                  color: "rgba(60, 30, 20, 0.78)",
                  fontFamily: SANS,
                  fontWeight: 600,
                  fontSize: "13px",
                  textTransform: "none",
                  border: "1px solid rgba(15, 23, 42, 0.10)",
                  "&:hover": {
                    background: "#fff",
                    borderColor: "rgba(15, 23, 42, 0.20)",
                  },
                }}
              >
                Copy booking code · {refCode}
              </Button>
              <Button
                fullWidth
                onClick={() => void navigate("/")}
                sx={{
                  height: 38,
                  borderRadius: "999px",
                  color: "rgba(60, 30, 20, 0.55)",
                  fontFamily: SANS,
                  fontWeight: 600,
                  fontSize: "12.5px",
                  textTransform: "none",
                  "&:hover": { background: "rgba(15, 23, 42, 0.04)" },
                }}
              >
                Back to home
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
      padding: "16px 12px",
      borderRadius: "18px",
      background: "rgba(255, 255, 255, 0.55)",
      backdropFilter: "blur(20px) saturate(180%)",
      WebkitBackdropFilter: "blur(20px) saturate(180%)",
      border: "1px solid rgba(255, 255, 255, 0.6)",
      boxShadow: disabled
        ? "0 1px 2px rgba(15, 23, 42, 0.03)"
        : "0 4px 14px rgba(126, 30, 46, 0.05)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: "8px",
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.55 : 1,
      filter: disabled ? "grayscale(0.4)" : "none",
      transition: "transform 0.15s ease, box-shadow 0.15s ease",
      ...(disabled
        ? {}
        : {
            "&:hover": {
              transform: "translateY(-1px)",
              boxShadow: "0 8px 22px rgba(126, 30, 46, 0.10)",
            },
            "&:focus-visible": {
              outline: "2px solid #FE0944",
              outlineOffset: "2px",
            },
          }),
    }}
  >
    <Box
      aria-hidden
      sx={{
        width: 42,
        height: 42,
        borderRadius: "50%",
        background: disabled
          ? "linear-gradient(135deg, #94a3b8, #64748b)"
          : "linear-gradient(135deg, #FE0944, #FE7A52)",
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: disabled
          ? "0 2px 6px rgba(15, 23, 42, 0.08)"
          : "0 6px 14px rgba(254, 9, 68, 0.25)",
        "& svg": { fontSize: 22 },
      }}
    >
      {icon}
    </Box>
    <Typography
      sx={{
        fontFamily: SERIF,
        fontSize: "14px",
        fontWeight: 700,
        color: "#3c1e14",
        textAlign: "center",
        lineHeight: 1.2,
      }}
    >
      {label}
    </Typography>
    {sub && (
      <Typography
        sx={{
          fontFamily: SANS,
          fontSize: "11px",
          color: "rgba(60, 30, 20, 0.55)",
          textAlign: "center",
          marginTop: "-4px",
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
        color: "rgba(60, 30, 20, 0.6)",
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
        color: "#3c1e14",
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
        color: "rgba(60, 30, 20, 0.78)",
        lineHeight: 1.55,
      }}
    >
      {text}
    </Typography>
  </Box>
);

export default BookingSuccessPage;
