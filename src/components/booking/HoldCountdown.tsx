// src/components/booking/HoldCountdown.tsx
//
// 🆕 Round 28b21 (founder 2026-05-04) — Phase 2 of the conversion
//   improvement plan. Shows a live countdown of the 10-minute hold
//   window on the Booking Success page so the customer is nudged to
//   contact admin before the slot is released.
//
// Behavior
// • If `holdState !== "active"` or no `holdExpiresAt` → render nothing.
// • Counts down to `holdExpiresAt` every 1s.
// • Three visual tiers based on remaining time:
//     ≥ 5min  → green (calm), copy: "We're holding your slot"
//     2-5min  → amber (urgency), copy: "Hold expires soon"
//     < 2min  → red pulse + animation, copy: "Almost up — confirm now!"
// • At 0s → flips to a "Hold expired" red state with a Re-book CTA
//   that bounces back to the therapist's profile.
//
// Accessibility
// • role="timer" + aria-live="polite" so screen readers announce the
//   tier changes (announcing every second would be obnoxious).
// • prefers-reduced-motion disables the pulsing red tier animation.
//
// Stand-alone, no extra deps — uses MUI sx + dayjs we already have.

import React, { useEffect, useState } from "react";
import { Box, Typography, Button } from "@mui/material";
import HourglassTopRoundedIcon from "@mui/icons-material/HourglassTopRounded";
import HourglassBottomRoundedIcon from "@mui/icons-material/HourglassBottomRounded";
import ErrorOutlineRoundedIcon from "@mui/icons-material/ErrorOutlineRounded";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";

const SERIF = '"Playfair Display", "Fraunces", Georgia, "Times New Roman", serif';
const SANS = '"Inter", system-ui, -apple-system, sans-serif';

type Tier = "calm" | "urgent" | "critical" | "expired";

interface HoldCountdownProps {
  /** Firestore Timestamp.toDate() result, or null when no hold is active */
  holdExpiresAt: Date | null;
  /** Current state from booking doc — only "active" shows the timer */
  holdState?: string;
  /** Therapist id to deep-link Re-book button when expired */
  therapistId?: string;
}

const tierFromMs = (msLeft: number): Tier => {
  if (msLeft <= 0) return "expired";
  if (msLeft < 2 * 60_000) return "critical";
  if (msLeft < 5 * 60_000) return "urgent";
  return "calm";
};

const tierStyles: Record<
  Tier,
  {
    bg: string;
    border: string;
    titleColor: string;
    bodyColor: string;
    icon: React.ReactNode;
    title: string;
    pulseAnim: boolean;
  }
> = {
  calm: {
    bg: "rgba(22, 163, 74, 0.07)",
    border: "rgba(22, 163, 74, 0.22)",
    titleColor: "#15803d",
    bodyColor: "rgba(20, 83, 45, 0.85)",
    icon: <HourglassTopRoundedIcon sx={{ fontSize: 18 }} />,
    title: "We're holding your slot",
    pulseAnim: false,
  },
  urgent: {
    bg: "rgba(245, 158, 11, 0.10)",
    border: "rgba(245, 158, 11, 0.30)",
    titleColor: "#b45309",
    bodyColor: "rgba(120, 53, 15, 0.85)",
    icon: <HourglassBottomRoundedIcon sx={{ fontSize: 18 }} />,
    title: "Hold expires soon",
    pulseAnim: false,
  },
  critical: {
    bg: "var(--sr-panel-2)",
    border: "var(--sr-hairline)",
    titleColor: "#b91c1c",
    bodyColor: "rgba(127, 29, 29, 0.88)",
    icon: <ErrorOutlineRoundedIcon sx={{ fontSize: 18 }} />,
    title: "Almost up — confirm now!",
    pulseAnim: true,
  },
  expired: {
    bg: "rgba(127, 29, 29, 0.08)",
    border: "rgba(127, 29, 29, 0.28)",
    titleColor: "#7f1d1d",
    bodyColor: "rgba(127, 29, 29, 0.78)",
    icon: <ErrorOutlineRoundedIcon sx={{ fontSize: 18 }} />,
    title: "Hold expired",
    pulseAnim: false,
  },
};

const fmtMMSS = (ms: number): string => {
  if (ms <= 0) return "00:00";
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60).toString().padStart(2, "0");
  const s = (total % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
};

export const HoldCountdown: React.FC<HoldCountdownProps> = ({
  holdExpiresAt,
  holdState,
  therapistId,
}) => {
  const navigate = useNavigate();
  const [now, setNow] = useState<number>(() => Date.now());

  // Tick every second while the timer is potentially live. Once the
  // hold has expired we stop the interval to avoid wasted re-renders.
  useEffect(() => {
    if (!holdExpiresAt || holdState !== "active") return;
    const expireMs = holdExpiresAt.getTime();
    const tick = () => setNow(Date.now());
    tick();
    const id = window.setInterval(() => {
      const cur = Date.now();
      setNow(cur);
      if (cur >= expireMs) {
        window.clearInterval(id);
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, [holdExpiresAt, holdState]);

  // Don't render at all if there's no hold OR if admin already confirmed.
  if (!holdExpiresAt) return null;
  if (holdState && holdState !== "active" && holdState !== "expired")
    return null;

  const msLeft = Math.max(0, holdExpiresAt.getTime() - now);
  const tier: Tier = holdState === "expired" ? "expired" : tierFromMs(msLeft);
  const style = tierStyles[tier];

  const onRebook = () => {
    if (therapistId) {
      // Round 28s4 — was `/therapist/${id}` (singular), which is not
      // a route in App.tsx and landed on NotFoundPage. The public
      // practitioner detail route is plural.
      void navigate(`/therapists/${therapistId}`);
    } else {
      void navigate("/");
    }
  };

  return (
    <Box
      role="timer"
      aria-live="polite"
      aria-label={`${style.title}, time remaining ${fmtMMSS(msLeft)}`}
      sx={{
        marginTop: "12px",
        padding: "12px 14px",
        borderRadius: "16px",
        background: style.bg,
        border: `1px solid ${style.border}`,
        display: "flex",
        alignItems: "center",
        gap: "12px",
        animation: style.pulseAnim
          ? "holdPulse 1.4s ease-in-out infinite"
          : "none",
        "@keyframes holdPulse": {
          "0%, 100%": {
            boxShadow: "0 0 0 0 rgba(45, 45, 43, 0.0)",
          },
          "50%": {
            boxShadow: "0 0 0 6px rgba(15, 23, 42, 0.18)",
          },
        },
        "@media (prefers-reduced-motion: reduce)": {
          animation: "none",
        },
      }}
    >
      {/* Icon column */}
      <Box
        aria-hidden
        sx={{
          width: 32,
          height: 32,
          flexShrink: 0,
          borderRadius: "10px",
          background: "var(--sr-panel-2)",
          color: style.titleColor,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {style.icon}
      </Box>

      {/* Text column */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          sx={{
            fontFamily: SERIF,
            fontSize: "14px",
            fontWeight: 700,
            color: style.titleColor,
            lineHeight: 1.25,
          }}
        >
          {style.title}
        </Typography>
        <Typography
          sx={{
            fontFamily: SANS,
            fontSize: "11.5px",
            color: style.bodyColor,
            lineHeight: 1.4,
            marginTop: "1px",
          }}
        >
          {tier === "expired"
            ? "Your slot has been released. Tap below to re-book."
            : tier === "critical"
              ? "Tap the LINE button to message admin."
              : tier === "urgent"
                ? "Tap LINE to confirm before time runs out."
                : `${dayjs(holdExpiresAt).format("HH:mm A")} — admin will confirm via LINE.`}
        </Typography>
      </Box>

      {/* Countdown / CTA column */}
      {tier === "expired" ? (
        <Button
          onClick={onRebook}
          size="small"
          sx={{
            flexShrink: 0,
            height: 30,
            paddingX: "12px",
            borderRadius: "999px",
            background: "#8F8474",
            color: "#fff",
            fontFamily: SANS,
            fontWeight: 700,
            fontSize: "12px",
            textTransform: "none",
            // 🎨 Round 28r79 — Nordic sweep · was #dc0a3d crimson. This
            //   is the Re-book button after hold expiry (post-lockout),
            //   not the live countdown flash — decorative, not semantic.
            "&:hover": { background: "#4B4B48" },
          }}
        >
          Re-book
        </Button>
      ) : (
        <Box
          aria-hidden
          sx={{
            flexShrink: 0,
            paddingX: "10px",
            paddingY: "5px",
            borderRadius: "10px",
            background: "var(--sr-panel-2)",
            border: `1px solid ${style.border}`,
            fontFamily: SANS,
            fontWeight: 800,
            fontSize: "16px",
            color: style.titleColor,
            fontVariantNumeric: "tabular-nums",
            lineHeight: 1,
            minWidth: 64,
            textAlign: "center",
          }}
        >
          {fmtMMSS(msLeft)}
        </Box>
      )}
    </Box>
  );
};

export default HoldCountdown;
