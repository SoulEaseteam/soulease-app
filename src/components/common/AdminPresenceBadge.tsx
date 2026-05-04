// src/components/common/AdminPresenceBadge.tsx
//
// 🆕 Round 28b21 (founder 2026-05-04) — Phase 3.
//
// Small, calm pill that says "Admin online · usually replies in 1 min"
// when an admin is heartbeating, OR "Admin offline · we'll reply within
// 1 hour" when nobody is. Shown next to the LINE CTA so customers know
// what to expect.
//
// Variants
//  • compact (default): just the green/grey dot + "Admin online/offline"
//  • full: dot + label + reply-time hint
//
// Accessibility
//  • role="status" + aria-live="polite" for screen readers when state flips.

import React from "react";
import { Box, Typography } from "@mui/material";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import useAdminPresence from "@/hooks/useAdminPresence";

dayjs.extend(relativeTime);

const SANS = '"Inter", system-ui, -apple-system, sans-serif';

interface Props {
  variant?: "compact" | "full";
}

export const AdminPresenceBadge: React.FC<Props> = ({ variant = "full" }) => {
  const { online, lastSeenAt } = useAdminPresence();

  const ariaLabel = online
    ? "Admin is online and usually replies in about one minute"
    : `Admin is offline${lastSeenAt ? `, last seen ${dayjs(lastSeenAt).fromNow()}` : ""}`;

  const labelLine = online ? "Admin online" : "Admin offline";
  const subLine = online
    ? "Usually replies in 1 min"
    : lastSeenAt
      ? `Last seen ${dayjs(lastSeenAt).fromNow()}`
      : "We reply within 1 hour";

  return (
    <Box
      role="status"
      aria-live="polite"
      aria-label={ariaLabel}
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: "8px",
        paddingX: "10px",
        paddingY: "4px",
        borderRadius: "999px",
        background: online
          ? "rgba(22, 163, 74, 0.10)"
          : "rgba(100, 116, 139, 0.10)",
        border: online
          ? "1px solid rgba(22, 163, 74, 0.28)"
          : "1px solid rgba(100, 116, 139, 0.22)",
        fontFamily: SANS,
      }}
    >
      <Box
        aria-hidden
        sx={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: online ? "#16a34a" : "#94a3b8",
          boxShadow: online ? "0 0 0 3px rgba(22, 163, 74, 0.18)" : "none",
          animation: online ? "presencePulse 1.6s ease-in-out infinite" : "none",
          "@keyframes presencePulse": {
            "0%, 100%": { opacity: 1 },
            "50%": { opacity: 0.55 },
          },
          "@media (prefers-reduced-motion: reduce)": {
            animation: "none",
          },
        }}
      />
      <Typography
        component="span"
        sx={{
          fontFamily: SANS,
          fontSize: "11.5px",
          fontWeight: 700,
          color: online ? "#15803d" : "#475569",
          lineHeight: 1.2,
        }}
      >
        {labelLine}
      </Typography>
      {variant === "full" && (
        <Typography
          component="span"
          sx={{
            fontFamily: SANS,
            fontSize: "10.5px",
            color: online ? "rgba(20, 83, 45, 0.7)" : "rgba(71, 85, 105, 0.75)",
            lineHeight: 1.2,
          }}
        >
          · {subLine}
        </Typography>
      )}
    </Box>
  );
};

export default AdminPresenceBadge;
