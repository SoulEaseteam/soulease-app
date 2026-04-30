// src/components/booking/BookingNavBar.tsx
//
// 🎨 Phase 3 Booking — Sticky bottom nav bar with Back / Next CTAs.
//
// BRAND.md recipe:
//   • Frosted glass surface (rgba 0.85 + blur 30px saturate 180%) — keeps
//     content slightly visible behind, matches detail-page sticky CTA
//   • Primary CTA: red→coral gradient pill (linear 135deg, #FE0944 → #FE7A52)
//   • Secondary (Back): glass icon button with chevron
//   • Disabled state: opacity 0.4, pointer-events none
//   • Position: fixed bottom, max-width 430px, z-index 50
//
// Used by BookingFlowPage to advance/retreat between the 5 wizard steps.

import React from "react";
import { Box, Button, IconButton } from "@mui/material";
import ChevronLeftRoundedIcon from "@mui/icons-material/ChevronLeftRounded";

const SANS = '"Inter", system-ui, -apple-system, sans-serif';

interface Props {
  /** Label for the primary CTA (e.g. "Continue", "Confirm & Pay"). */
  ctaLabel: string;
  /** Called when CTA is tapped. */
  onNext: () => void;
  /** Called when back chevron is tapped. If omitted, back button hidden. */
  onBack?: () => void;
  /** Disable CTA when validation fails. Default false. */
  disabled?: boolean;
  /** Show CTA in a loading state (e.g. while submitting). */
  loading?: boolean;
}

const BookingNavBar: React.FC<Props> = ({
  ctaLabel,
  onNext,
  onBack,
  disabled = false,
  loading = false,
}) => {
  return (
    <Box
      sx={{
        position: "fixed",
        bottom: 0,
        left: "50%",
        transform: "translateX(-50%)",
        width: "100%",
        maxWidth: "430px",
        zIndex: 50,
        background: "rgba(255, 248, 240, 0.85)",
        backdropFilter: "blur(30px) saturate(180%)",
        WebkitBackdropFilter: "blur(30px) saturate(180%)",
        borderTop: "1px solid rgba(0, 0, 0, 0.06)",
        padding: "12px 16px calc(12px + env(safe-area-inset-bottom, 0px))",
        display: "flex",
        alignItems: "center",
        gap: "10px",
      }}
    >
      {onBack && (
        <IconButton
          aria-label="back"
          onClick={onBack}
          sx={{
            width: 48,
            height: 48,
            borderRadius: "50%",
            background: "rgba(255, 255, 255, 0.6)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            border: "1px solid rgba(0, 0, 0, 0.08)",
            color: "#3c1e14",
            flexShrink: 0,
            "&:hover": { background: "rgba(255, 255, 255, 0.85)" },
          }}
        >
          <ChevronLeftRoundedIcon />
        </IconButton>
      )}
      <Button
        onClick={onNext}
        disabled={disabled || loading}
        sx={{
          flex: 1,
          height: 48,
          borderRadius: "999px",
          background: "linear-gradient(135deg, #FE0944, #FE7A52)",
          color: "#fff",
          fontFamily: SANS,
          fontSize: "15px",
          fontWeight: 700,
          letterSpacing: "0.02em",
          textTransform: "none",
          boxShadow: "0 6px 20px rgba(254, 9, 68, 0.35)",
          "&:hover": {
            background: "linear-gradient(135deg, #E50840, #E56A47)",
            boxShadow: "0 8px 24px rgba(254, 9, 68, 0.4)",
          },
          "&.Mui-disabled": {
            background: "rgba(0, 0, 0, 0.12)",
            color: "rgba(0, 0, 0, 0.35)",
            boxShadow: "none",
          },
        }}
      >
        {loading ? "..." : ctaLabel}
      </Button>
    </Box>
  );
};

export default BookingNavBar;
