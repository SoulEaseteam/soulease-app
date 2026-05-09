// src/components/common/SocialProofTicker.tsx
//
// 🆕 Round 28b21 (founder 2026-05-04) — Phase 5 of conversion plan.
//
// Subtle social-proof banner: "12 people booked in the last 24 hours".
// Drops in anywhere a wide block fits (HeroSection, therapist profile).
//
// Variants
//  • inline (default): compact pill, sits in a flex row.
//  • banner: full-width row with subtle gradient bg.
//
// Behavior
//  • Cycles through three messages every 5s for variety:
//      "12 booked in last 24h"
//      "3 booking now"
//      "Most popular: Thai · 90 min"
//  • Live count refreshes every 60s via useRecentBookingsCount.
//  • Honors prefers-reduced-motion (no auto-rotate, picks one and sticks).
//
// Privacy
//  • Counts only — never names, never addresses.
//  • The "X booking now" is a deterministic pseudo-random rotated number
//    derived from the live count (count / 4 ± 1) — NOT live presence
//    tracking, just a directional signal.

import React, { useEffect, useState } from "react";
import { Box, Typography } from "@mui/material";
import LocalFireDepartmentRoundedIcon from "@mui/icons-material/LocalFireDepartmentRounded";
import GroupRoundedIcon from "@mui/icons-material/GroupRounded";
import StarRoundedIcon from "@mui/icons-material/StarRounded";
// 🆕 Round 28r30 (founder 2026-05-07) — All three messages now real.
//   Founder direction: "SocialProofTicker วัดได้จริงๆ". Pseudo-random
//   "X booking right now" + hardcoded "Most popular: Thai 90 min"
//   are gone — both come from `useSocialProofMetrics` live data.
import useSocialProofMetrics from "@/hooks/useSocialProofMetrics";

const SANS = '"Inter", system-ui, -apple-system, sans-serif';

interface Props {
  /** Default "inline". "banner" is full-width with a soft gradient bg. */
  variant?: "inline" | "banner";
}

interface Message {
  icon: React.ReactNode;
  text: string;
  color: string;
  bg: string;
}

const ROTATE_MS = 5000;

// 🆕 Round 28r30 — All three messages drawn from live Firestore data.
//   When a metric isn't available yet (no top service in last 7 days,
//   bookingNow query missing index), the message is filtered out so
//   the ticker never displays a placeholder.
const buildMessages = (
  count24h: number,
  bookingNow: number,
  topService: { name: string; durationMin: number } | null
): Message[] => {
  const messages: Message[] = [
    {
      icon: <LocalFireDepartmentRoundedIcon sx={{ fontSize: 14 }} />,
      text: `${count24h} bookings in last 24 h`,
      color: "#FE0944",
      bg: "rgba(254, 9, 68, 0.08)",
    },
  ];
  if (bookingNow > 0) {
    messages.push({
      icon: <GroupRoundedIcon sx={{ fontSize: 14 }} />,
      text: `${bookingNow} session${bookingNow === 1 ? "" : "s"} happening right now`,
      color: "#0ea5e9",
      bg: "rgba(14, 165, 233, 0.10)",
    });
  }
  if (topService) {
    messages.push({
      icon: <StarRoundedIcon sx={{ fontSize: 14 }} />,
      text: `Most popular: ${topService.name} · ${topService.durationMin} min`,
      color: "#f59e0b",
      bg: "rgba(245, 158, 11, 0.10)",
    });
  }
  return messages;
};

export const SocialProofTicker: React.FC<Props> = ({ variant = "inline" }) => {
  const { count24h, bookingNow, topService, loading } =
    useSocialProofMetrics();
  const [idx, setIdx] = useState(0);

  const messages = buildMessages(count24h, bookingNow, topService);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches)
      return;
    const id = window.setInterval(
      () => setIdx((i) => (i + 1) % messages.length),
      ROTATE_MS
    );
    return () => window.clearInterval(id);
  }, [messages.length]);

  if (loading) return null;
  const m = messages[idx];

  const inner = (
    <>
      <Box
        aria-hidden
        sx={{
          width: 22,
          height: 22,
          borderRadius: "50%",
          background: m.bg,
          color: m.color,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {m.icon}
      </Box>
      <Typography
        component="span"
        sx={{
          fontFamily: SANS,
          fontSize: variant === "banner" ? "12.5px" : "11.5px",
          fontWeight: 600,
          color: variant === "banner" ? "#fff" : m.color,
          letterSpacing: "0.01em",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {m.text}
      </Typography>
    </>
  );

  if (variant === "banner") {
    return (
      <Box
        role="status"
        aria-live="polite"
        sx={{
          width: "100%",
          padding: "8px 12px",
          borderRadius: "12px",
          background:
            "linear-gradient(90deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.05) 100%)",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          border: "1px solid rgba(255,255,255,0.18)",
          display: "flex",
          alignItems: "center",
          gap: "10px",
        }}
      >
        {inner}
      </Box>
    );
  }

  return (
    <Box
      role="status"
      aria-live="polite"
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: "8px",
        paddingX: "10px",
        paddingY: "4px",
        borderRadius: "999px",
        background: "rgba(255, 255, 255, 0.85)",
        border: "1px solid rgba(15, 23, 42, 0.08)",
        boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
      }}
    >
      {inner}
    </Box>
  );
};

export default SocialProofTicker;
