// src/components/booking/StepIndicator.tsx
//
// 🎨 Phase 3 Booking — 5-dot step progress (ported pattern from
// `.photo-dots` in DetailHero). Used at the top of BookingFlowPage to
// show progress through Service → DateTime → Location → Details → Confirm.
//
// Visual recipe (BRAND.md):
//   • Active dot:   solid #fff (or theme accent), width 24px
//   • Past dot:     solid #fff at 70% opacity, width 8px
//   • Future dot:   solid rgba(0,0,0,0.15), width 8px
//   • Height 4px, gap 4px, smooth transitions

import React from "react";
import { Box } from "@mui/material";

interface Props {
  /** 1-based current step (1..total) */
  current: number;
  /** Total number of steps (default 5) */
  total?: number;
  /** Active/past dot color — defaults to brand red */
  color?: string;
}

const StepIndicator: React.FC<Props> = ({
  current,
  total = 5,
  color = "#FE0944",
}) => {
  return (
    <Box
      role="progressbar"
      aria-valuenow={current}
      aria-valuemin={1}
      aria-valuemax={total}
      sx={{
        display: "flex",
        gap: "4px",
        padding: "12px 16px 8px",
      }}
    >
      {Array.from({ length: total }).map((_, i) => {
        const idx = i + 1;
        const isPast = idx < current;
        const isActive = idx === current;
        return (
          <Box
            key={idx}
            sx={{
              flex: isActive ? 2 : 1,
              height: "4px",
              borderRadius: "2px",
              background: isActive
                ? color
                : isPast
                ? `${color}99` // 60% opacity past
                : "rgba(0, 0, 0, 0.12)",
              transition: "all 0.25s ease",
            }}
          />
        );
      })}
    </Box>
  );
};

export default StepIndicator;
