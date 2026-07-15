// src/components/booking/ConfirmBar.tsx
//
// 🆕 Round 28r10 (founder 2026-05-06) — Extracted from BookingFlowPage.
//
// Bottom confirm bar — shows the running Total on the left and the
// brand-gradient Place Order button on the right (pattern 7A).
//
// The Total tweens via useTweenedNumber so price changes feel cohesive
// between the Pricing card and the bar. On every total change a
// small "totalPulse" keyframe animation fires once via React's `key`
// prop trick.
//
// 🚨 Round 28r67 HOTFIX — was position:fixed on mobile (r65/r66 stack:
//   zIndex bump + paddingBottom bump), but the floating bar STILL
//   overlapped content at some scroll positions. Founder direction
//   (2026-07-08): "ย้ายไปไว้ล่างสุด พอ ไม่ต้องลอย" — move to bottom,
//   no floating. Now renders as a normal in-flow Box at the natural
//   end of the page content on mobile (desktop unchanged: display:none
//   because r56 puts the desktop CTA inside the sticky pricing sidebar).

import React, { useRef } from "react";
import { Box, Typography, Button } from "@mui/material";
import { useTranslation } from "react-i18next";
import { formatTHB } from "@/utils/servicePricing";
import useTweenedNumber from "@/hooks/useTweenedNumber";

const SERIF = '"Playfair Display", "Fraunces", Georgia, "Times New Roman", serif';
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
        // 🚨 Round 28r67 HOTFIX — was position:"fixed" with
        //   bottom/left/transform/zIndex 2100. Now in-flow: the bar sits
        //   at the natural end of the page content on mobile, no
        //   overlap possible. Rounded pill container preserved so it
        //   visually reads as a bottom bar. Small top margin gives it
        //   breathing room from the pricing card above.
        // 🆕 Round 28r56 (Phase 3.5) — hidden on desktop. On md+ the
        //   Place Order button lives inside the sticky pricing sidebar
        //   on BookingFlowPage (in-flow, not fixed). The bottom bar
        //   only makes sense on the mobile checkout form.
        display: { xs: "flex", md: "none" },
        marginTop: "16px",
        background: "var(--sr-panel)",
        backdropFilter: "blur(30px) saturate(180%)",
        WebkitBackdropFilter: "blur(30px) saturate(180%)",
        border: "1px solid var(--sr-hairline)",
        borderRadius: "20px",
        padding: "12px 16px",
        alignItems: "center",
        gap: "12px",
        boxShadow: "var(--sr-card-shadow)",
      }}
    >
      <Box>
        <Typography
          sx={{
            fontFamily: SANS,
            fontSize: "10px",
            fontWeight: 700,
            color: "var(--sr-muted)",
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
            color: "var(--sr-body)",
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
          minHeight: 50,
          borderRadius: "999px",
          background: "#D97C95",
          color: "#fff",
          fontFamily: SANS,
          fontSize: "15px",
          fontWeight: 700,
          letterSpacing: "0.02em",
          textTransform: "none",
          boxShadow: "0 10px 24px rgba(45, 45, 43, 0.32)",
          "&:hover": {
            background: "#C96F89",
            boxShadow: "0 14px 30px rgba(45, 45, 43, 0.38)",
          },
          "&:focus-visible": {
            outline: "2px solid #fff",
            outlineOffset: 2,
          },
          "&.Mui-disabled": {
            background: "var(--sr-panel-2)",
            color: "var(--sr-muted)",
            boxShadow: "none",
          },
        }}
      >
        {/* 🚨 Round 28r69 — Founder direction "ทุกอย่างที่เป็นปุ่ม ให้เอา
            ภาษาไทยออก" (2026-07-08). r61 bilingual Thai subtitle removed
            from every primary CTA button sitewide; button label English-
            only. Section headers/eyebrows keep their Thai subtitle. */}
        {submitting
          ? t("booking.placing", "Placing…")
          : t("booking.placeOrder", "Confirm Reservation")}
      </Button>
    </Box>
  );
};

export default ConfirmBar;
