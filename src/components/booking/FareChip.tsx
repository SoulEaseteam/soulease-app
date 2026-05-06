// src/components/booking/FareChip.tsx
//
// 🆕 Round 28r10 (founder 2026-05-06) — Extracted from BookingFlowPage.
//
// Tiny pill rendered under the Travel-fee row to convey context:
//   • green  → "Free zone (<5 km)" / "You save ฿X vs Grab"
//   • amber  → "Rain surcharge applied" / "Admin will quote travel"

import React from "react";
import { Box } from "@mui/material";

const SANS = '"Inter", system-ui, -apple-system, sans-serif';

export interface FareChipProps {
  color: "green" | "amber";
  icon: React.ReactNode;
  children: React.ReactNode;
}

export const FareChip: React.FC<FareChipProps> = ({ color, icon, children }) => {
  const palette =
    color === "green"
      ? { bg: "rgba(22, 163, 74, 0.1)", fg: "#16a34a" }
      : { bg: "rgba(249, 115, 22, 0.1)", fg: "#d97706" };
  return (
    <Box
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: "5px",
        padding: "5px 10px",
        background: palette.bg,
        color: palette.fg,
        borderRadius: "999px",
        fontFamily: SANS,
        fontSize: "11px",
        fontWeight: 700,
        "& svg": { fontSize: 13 },
      }}
    >
      <Box
        component="span"
        sx={{ display: "inline-flex", alignItems: "center" }}
      >
        {icon}
      </Box>
      {children}
    </Box>
  );
};

export default FareChip;
