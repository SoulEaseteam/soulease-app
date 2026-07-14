// src/components/common/PromoBadge.tsx
//
// 🆕 Round 28w.63 (founder "ป้ายวิบวับๆ ที่ราคาที่ขายดี") — the Best Seller /
//   Best Value badge with a shimmering sweep + soft glow pulse so it catches
//   the eye on the pricing surfaces. Reused on the service detail page, the
//   duration sheet, and the practitioner's service list. Respects
//   prefers-reduced-motion (animation off).

import React from "react";
import { Box } from "@mui/material";
import { badgeFor, BADGE_META, type ServiceBadge } from "@/utils/servicePricing";

export const PromoBadge: React.FC<{ serviceId?: string; badge?: ServiceBadge; size?: "sm" | "md" }> = ({
  serviceId,
  badge,
  size = "md",
}) => {
  const b = badge ?? (serviceId ? badgeFor(serviceId) : null);
  if (!b) return null;
  const meta = BADGE_META[b];
  const fs = size === "sm" ? 9 : 11;
  return (
    <Box
      component="span"
      sx={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        px: size === "sm" ? "7px" : "10px",
        py: size === "sm" ? "2px" : "3px",
        borderRadius: "999px",
        overflow: "hidden",
        background: `${meta.color}22`,
        border: `1px solid ${meta.color}77`,
        animation: "sr-badge-glow 2.6s ease-in-out infinite",
        "@keyframes sr-badge-glow": {
          "0%, 100%": { boxShadow: `0 1px 4px ${meta.color}22, 0 0 0 0 ${meta.color}55` },
          "50%": { boxShadow: `0 2px 12px ${meta.color}66, 0 0 0 4px ${meta.color}00` },
        },
        "&::after": {
          content: '""',
          position: "absolute",
          top: 0,
          left: 0,
          width: "55%",
          height: "100%",
          background: "linear-gradient(100deg, transparent, rgba(255,255,255,0.78), transparent)",
          transform: "translateX(-170%)",
          animation: "sr-badge-shimmer 2.6s ease-in-out infinite",
          pointerEvents: "none",
        },
        "@keyframes sr-badge-shimmer": {
          "0%": { transform: "translateX(-170%)" },
          "55%, 100%": { transform: "translateX(340%)" },
        },
        "@media (prefers-reduced-motion: reduce)": {
          animation: "none",
          "&::after": { display: "none" },
        },
      }}
    >
      <Box component="span" sx={{ fontSize: `${fs + 3}px`, lineHeight: 1, zIndex: 1 }}>{meta.emoji}</Box>
      <Box
        component="span"
        sx={{
          fontFamily: "Inter, system-ui, sans-serif",
          fontSize: `${fs}px`,
          fontWeight: 800,
          letterSpacing: "0.07em",
          textTransform: "uppercase",
          color: meta.color,
          whiteSpace: "nowrap",
          zIndex: 1,
        }}
      >
        {meta.label}
      </Box>
    </Box>
  );
};

export default PromoBadge;
