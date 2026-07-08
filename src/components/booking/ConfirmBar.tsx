// src/components/booking/ConfirmBar.tsx
//
// 🆕 Round 28r10 (founder 2026-05-06) — Extracted from BookingFlowPage.
//
// Sticky bottom bar — shows the running Total on the left and the
// brand-gradient Place Order button on the right (pattern 7A).
//
// The Total tweens via useTweenedNumber so price changes feel cohesive
// between the Pricing card and the bar. On every total change a
// small "totalPulse" keyframe animation fires once via React's `key`
// prop trick.
//
// Vertical position is controlled site-wide via the
// --cta-bottom-offset CSS variable (defined in index.css), so this
// CTA aligns with every other sticky CTA in the app.

import React, { useRef } from "react";
import { Box, Typography, Button } from "@mui/material";
import { useTranslation } from "react-i18next";
import { formatTHB } from "@/utils/servicePricing";
import useTweenedNumber from "@/hooks/useTweenedNumber";
// 🆕 Round 28r52 — Phase 3.1 responsive shell. The sticky bottom
//   ConfirmBar tracks the same narrow content column as the booking
//   page above it, so on desktop it widens to 600/768 instead of
//   sitting as a tiny 430px strip in the middle of the viewport.
import { responsiveShellNarrow } from "@/theme/breakpoints";

const SERIF = '"Federo", "Italiana", "Cinzel", "Fraunces", Georgia, "Times New Roman", serif';
const SANS = '"Inter", system-ui, -apple-system, sans-serif';

export interface ConfirmBarProps {
  total: number;
  canPlace: boolean;
  submitting: boolean;
  onConfirm: () => void;
}

export const ConfirmBar: React.FC<ConfirmBarProps> = ({
  total,
  canPlace,
  submitting,
  onConfirm,
}) => {
  const { t } = useTranslation();
  // 🆕 Round 28b46 — Tween the sticky-bar Total too so price changes
  //   feel cohesive between the Pricing card and the bar.
  const animatedTotal = useTweenedNumber(total);
  const pulseKey = useRef(0);
  const lastTotalRef = useRef(total);
  if (lastTotalRef.current !== total) {
    lastTotalRef.current = total;
    pulseKey.current += 1;
  }
  return (
    <Box
      sx={{
        position: "fixed",
        // 🆕 Round 28b43 (founder 2026-05-05) — Switched from hardcoded
        //   100px to global --cta-bottom-offset (defined in index.css)
        //   so EVERY confirm CTA across the app sits at the same height
        //   above the bottom nav. Was 100px to clear the nav (~64px) +
        //   small gap; now centralized via CSS variable.
        bottom: "var(--cta-bottom-offset)",
        left: "50%",
        transform: "translateX(-50%)",
        width: "100%",
        // 🆕 Round 28r52 — narrow shell matches BookingFlowPage above.
        ...responsiveShellNarrow,
        zIndex: 50,
        background: "rgba(244, 246, 245, 0.92)",
        backdropFilter: "blur(30px) saturate(180%)",
        WebkitBackdropFilter: "blur(30px) saturate(180%)",
        borderTop: "1px solid rgba(0, 0, 0, 0.06)",
        borderRadius: "20px 20px 0 0",
        padding: "12px 16px",
        // 🆕 Round 28r56 (Phase 3.5) — hidden on desktop. On md+ the
        //   Place Order button lives inside the sticky pricing sidebar
        //   on BookingFlowPage (in-flow, not fixed). The fixed bottom
        //   bar only makes sense on the mobile checkout form.
        display: { xs: "flex", md: "none" },
        alignItems: "center",
        gap: "12px",
        boxShadow: "0 -8px 24px rgba(15, 23, 42, 0.08)",
      }}
    >
      <Box>
        <Typography
          sx={{
            fontFamily: SANS,
            fontSize: "10px",
            fontWeight: 700,
            color: "rgba(15, 23, 42, 0.55)",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}
        >
          {t("common.total", "Total")}
        </Typography>
        <Typography
          key={pulseKey.current}
          sx={{
            fontFamily: SERIF,
            fontSize: "22px",
            fontWeight: 700,
            color: "#B4000A",
            letterSpacing: "-0.02em",
            lineHeight: 1,
            marginTop: "2px",
            fontVariantNumeric: "tabular-nums",
            "@media (prefers-reduced-motion: no-preference)": {
              animation: "totalPulse 0.42s ease-out",
            },
            "@keyframes totalPulse": {
              "0%": { transform: "scale(0.96)" },
              "40%": { transform: "scale(1.04)" },
              "100%": { transform: "scale(1)" },
            },
          }}
        >
          {formatTHB(Math.round(animatedTotal))}
        </Typography>
      </Box>
      <Button
        onClick={onConfirm}
        disabled={!canPlace || submitting}
        sx={{
          flex: 1,
          height: 50,
          borderRadius: "999px",
          background: "#B4000A",
          color: "#fff",
          fontFamily: SANS,
          fontSize: "15px",
          fontWeight: 700,
          letterSpacing: "0.02em",
          textTransform: "none",
          boxShadow: "0 6px 20px rgba(15, 23, 42, 0.35)",
          "&:hover": {
            background: "#B4000A",
          },
          "&.Mui-disabled": {
            background: "rgba(0, 0, 0, 0.12)",
            color: "rgba(0, 0, 0, 0.35)",
            boxShadow: "none",
          },
        }}
      >
        {submitting
          ? t("booking.placing", "Placing…")
          : t("booking.placeOrder", "Confirm Reservation")}
      </Button>
    </Box>
  );
};

export default ConfirmBar;
