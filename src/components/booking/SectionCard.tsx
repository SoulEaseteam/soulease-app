// src/components/booking/SectionCard.tsx
//
// 🆕 Round 28r10 (founder 2026-05-06) — Extracted from BookingFlowPage.
//
// Editorial card with eyebrow label + soft-pink icon disc — the
// Order Details / Pricing / Notes sections of the Confirm Order page
// all use this wrapper so the page reads as a stack of identical
// "section cards" with different contents.

import React from "react";
import { Box, Typography } from "@mui/material";

const SERIF = '"Federo", "Italiana", "Cinzel", "Fraunces", Georgia, "Times New Roman", serif';

export interface SectionCardProps {
  label: string;
  /** MUI icon node (preferred) — rendered inside a soft pink rounded box
   *  matching the address tile. Plain string emoji is still accepted for
   *  back-compat. */
  icon?: React.ReactNode;
  tight?: boolean;
  children: React.ReactNode;
}

export const SectionCard: React.FC<SectionCardProps> = ({
  label,
  icon,
  tight,
  children,
}) => (
  <Box
    sx={{
      padding: tight ? "14px 14px 16px" : "14px 16px 18px",
      borderRadius: "16px",
      background: "rgba(255, 255, 255, 0.7)",
      border: "1px solid rgba(255, 255, 255, 0.6)",
      boxShadow: "0 4px 14px rgba(15, 23, 42, 0.06)",
    }}
  >
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        marginBottom: "12px",
      }}
    >
      {icon && (
        <Box
          aria-hidden
          sx={{
            width: 30,
            height: 30,
            flexShrink: 0,
            borderRadius: "9px",
            background: "rgba(15, 23, 42, 0.10)",
            color: "#B4000A",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            "& svg": { fontSize: 18 },
          }}
        >
          {icon}
        </Box>
      )}
      <Typography
        sx={{
          fontFamily: SERIF,
          fontSize: "15px",
          fontWeight: 600,
          color: "#1A2B2E",
        }}
      >
        {label}
      </Typography>
    </Box>
    {children}
  </Box>
);

export default SectionCard;
