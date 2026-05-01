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
import dayjs from "dayjs";

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
  const endAt: Date | null = booking?.endAt?.toDate
    ? (booking.endAt.toDate() as Date)
    : null;
  const timeLabel = startAt ? dayjs(startAt).format("HH:mm") : "—";
  const dateLabel = startAt
    ? dayjs(startAt).isSame(dayjs(), "day")
      ? "Today"
      : dayjs(startAt).isSame(dayjs().add(1, "day"), "day")
        ? "Tomorrow"
        : dayjs(startAt).format("ddd, MMM D")
    : "—";
  const leaveLabel = startAt
    ? dayjs(startAt).subtract(PREP_BUFFER_MIN, "minute").format("HH:mm")
    : null;

  // Booking ref code: SR + first 8 chars of doc id, uppercased.
  const refCode = id ? `SR-${id.slice(0, 8).toUpperCase()}` : "SR-—";

  // ── Action handlers ──────────────────────────────────────────────────
  const onChat = () => {
    // Telegram admin chat (live booking notification channel). When LINE is
    // wired we'll prefer that over Telegram. Fallback opens the home page
    // contact tile.
    const tgUser = "sunredbkk"; // tentative — replace with real handle
    window.open(`https://t.me/${tgUser}`, "_blank", "noopener,noreferrer");
  };

  const onTrack = () => {
    const url =
      (booking?.mapUrl as string | undefined) ||
      (booking?.address
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
            booking.address as string
          )}`
        : null);
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  };

  const onAddToCalendar = () => {
    if (!startAt || !endAt) return;
    const dt = (d: Date) =>
      dayjs(d).format("YYYYMMDDTHHmmss"); // local time, no Z
    const escape = (s: string) =>
      s.replace(/\\/g, "\\\\").replace(/,/g, "\\,").replace(/;/g, "\\;");
    const summary = `SunRed · ${
      (booking?.serviceName as string | undefined) ?? "Massage"
    } with ${therapistName}`;
    const description =
      [
        `Booking ref: ${refCode}`,
        `Therapist: ${therapistName}`,
        `Service: ${(booking?.serviceName as string) ?? "—"} · ${
          (booking?.duration as number) ?? "?"
        } min`,
        `Total: ฿${(
          (booking?.totalPrice as number) ??
          (booking?.servicePrice as number) ??
          0
        ).toLocaleString()}`,
      ].join("\\n");
    const location = (booking?.address as string) ?? "";
    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//SunRed//Booking//EN",
      "BEGIN:VEVENT",
      `UID:${id}@sunred.vip`,
      `DTSTAMP:${dt(new Date())}`,
      `DTSTART:${dt(startAt)}`,
      `DTEND:${dt(endAt)}`,
      `SUMMARY:${escape(summary)}`,
      `DESCRIPTION:${escape(description)}`,
      `LOCATION:${escape(location)}`,
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");
    const blob = new Blob([ics], { type: "text/calendar" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `sunred-${refCode}.ics`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const onReschedule = () => void navigate("/booking/history");

  // ── Render ───────────────────────────────────────────────────────────
  return (
    <Box
      sx={{
        // Phone-shell wrapper
        maxWidth: "430px",
        margin: "0 auto",
        minHeight: "100vh",
        background: "linear-gradient(180deg, #FFF8F0 0%, #FCEBDC 100%)",
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
            </Box>

            {/* 2×2 quick-action grid */}
            <Box
              sx={{
                marginTop: "16px",
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "10px",
              }}
            >
              <ActionCard
                label={`Chat with ${therapistName.split(" ")[0]}`}
                sub={
                  (booking.language as string | undefined) === "en"
                    ? "EN"
                    : (booking.language as string | undefined)?.toUpperCase() ??
                      "EN"
                }
                icon={<ChatRoundedIcon />}
                onClick={onChat}
              />
              <ActionCard
                label="Track arrival"
                sub="Live map"
                icon={<PinDropRoundedIcon />}
                onClick={onTrack}
              />
              <ActionCard
                label="Add to calendar"
                sub=".ics file"
                icon={<CalendarMonthRoundedIcon />}
                onClick={onAddToCalendar}
              />
              <ActionCard
                label="Reschedule"
                sub="Free"
                icon={<AutorenewRoundedIcon />}
                onClick={onReschedule}
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
                value={`${(booking.serviceName as string) ?? "—"}${
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

            {/* Done CTA */}
            <Box sx={{ marginTop: "22px" }}>
              <Button
                fullWidth
                onClick={() => void navigate("/")}
                sx={{
                  height: 50,
                  borderRadius: "999px",
                  background: "rgba(255, 255, 255, 0.85)",
                  color: "#FE0944",
                  fontFamily: SANS,
                  fontWeight: 700,
                  fontSize: "15px",
                  textTransform: "none",
                  border: "1.5px solid rgba(254, 9, 68, 0.3)",
                  boxShadow: "0 4px 14px rgba(254, 9, 68, 0.08)",
                  "&:hover": {
                    background: "rgba(255, 255, 255, 1)",
                    borderColor: "#FE0944",
                  },
                }}
              >
                Done — back to home
              </Button>
            </Box>
          </>
        )
      )}
    </Box>
  );
};

// ─── Action card (2×2 grid item) ───────────────────────────────────────
const ActionCard: React.FC<{
  label: string;
  sub?: string;
  icon: React.ReactNode;
  onClick: () => void;
}> = ({ label, sub, icon, onClick }) => (
  <Box
    role="button"
    tabIndex={0}
    onClick={onClick}
    onKeyDown={(e) => {
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        onClick();
      }
    }}
    sx={{
      padding: "16px 12px",
      borderRadius: "18px",
      background: "rgba(255, 255, 255, 0.85)",
      backdropFilter: "blur(20px) saturate(180%)",
      WebkitBackdropFilter: "blur(20px) saturate(180%)",
      border: "1px solid rgba(255, 255, 255, 0.6)",
      boxShadow: "0 4px 14px rgba(126, 30, 46, 0.05)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: "8px",
      cursor: "pointer",
      transition: "transform 0.15s ease, box-shadow 0.15s ease",
      "&:hover": {
        transform: "translateY(-1px)",
        boxShadow: "0 8px 22px rgba(126, 30, 46, 0.10)",
      },
      "&:focus-visible": {
        outline: "2px solid #FE0944",
        outlineOffset: "2px",
      },
    }}
  >
    <Box
      aria-hidden
      sx={{
        width: 42,
        height: 42,
        borderRadius: "50%",
        background: "linear-gradient(135deg, #FE0944, #FE7A52)",
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 6px 14px rgba(254, 9, 68, 0.25)",
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
