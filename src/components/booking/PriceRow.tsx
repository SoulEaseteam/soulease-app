// src/components/booking/PriceRow.tsx
//
// 🆕 Round 28r10 (founder 2026-05-06) — Extracted from BookingFlowPage.
//
// Single line-item row inside the Pricing card: label on the left,
// value (number or React node) on the right. Used 6+ times in the
// Pricing breakdown — extracting keeps the page clean.

import React from "react";
import { Box, Typography } from "@mui/material";

const SANS = '"Inter", system-ui, -apple-system, sans-serif';

export interface PriceRowProps {
  label: string;
  value: React.ReactNode;
}

export const PriceRow: React.FC<PriceRowProps> = ({ label, value }) => (
  <Box
    sx={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "baseline",
      marginBottom: "6px",
    }}
  >
    <Typography
      sx={{
        fontFamily: SANS,
        fontSize: "13px",
        color: "rgba(60, 30, 20, 0.7)",
      }}
    >
      {label}
    </Typography>
    <Typography
      sx={{
        fontFamily: SANS,
        fontSize: "13px",
        fontWeight: 600,
        color: "#3c1e14",
      }}
    >
      {value}
    </Typography>
  </Box>
);

export default PriceRow;
