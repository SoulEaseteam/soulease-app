// src/components/booking/SelectionCell.tsx
//
// 🎨 Phase 4 — Reusable tappable cell that summarizes a form field's
// current selection and opens a bottom sheet for change. Pattern shared
// between Language / Add-ons / Payment on the Confirm Order page so the
// page stays compact (no big inline lists eating vertical space).

import React from "react";
import { Box, Typography } from "@mui/material";

const SERIF = '"Fraunces", Georgia, "Times New Roman", serif';
const SANS = '"Inter", system-ui, -apple-system, sans-serif';

interface Props {
  label: string;            // top-row uppercase eyebrow
  value: React.ReactNode;   // main display string ("中文", "2 add-ons", etc.)
  hint?: string;            // optional sub-line ("Pay on arrival", etc.)
  icon?: string;            // emoji icon shown in the left tile
  filled: boolean;          // changes border color + chevron color
  onClick: () => void;
}

const SelectionCell: React.FC<Props> = ({
  label,
  value,
  hint,
  icon,
  filled,
  onClick,
}) => (
  <Box
    role="button"
    tabIndex={0}
    onClick={onClick}
    onKeyDown={(e) => {
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        onClick();
      }
    }}
    sx={{
      display: "flex",
      alignItems: "center",
      gap: "12px",
      padding: "14px",
      borderRadius: "16px",
      cursor: "pointer",
      background: "rgba(255, 255, 255, 0.7)",
      border: filled ? "1.5px solid #FE0944" : "1px solid rgba(0, 0, 0, 0.06)",
      transition: "all 0.15s ease",
      "&:hover": { background: "rgba(255, 255, 255, 0.85)" },
      "&:focus-visible": {
        outline: "2px solid #FE0944",
        outlineOffset: "2px",
      },
    }}
  >
    {icon && (
      <Box
        sx={{
          width: 40,
          height: 40,
          flexShrink: 0,
          borderRadius: "10px",
          background: filled
            ? "linear-gradient(135deg, rgba(254, 9, 68, 0.14), rgba(254, 122, 82, 0.14))"
            : "rgba(254, 201, 167, 0.35)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "18px",
        }}
      >
        {icon}
      </Box>
    )}
    <Box sx={{ flex: 1, minWidth: 0 }}>
      <Typography
        sx={{
          fontFamily: SANS,
          fontSize: "10.5px",
          fontWeight: 700,
          color: "rgba(60, 30, 20, 0.55)",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          marginBottom: "2px",
        }}
      >
        {label}
      </Typography>
      <Typography
        sx={{
          fontFamily: SERIF,
          fontSize: "15px",
          fontWeight: 600,
          color: filled ? "#3c1e14" : "rgba(60, 30, 20, 0.55)",
          lineHeight: 1.2,
        }}
      >
        {value}
      </Typography>
      {hint && (
        <Typography
          sx={{
            fontFamily: SANS,
            fontSize: "11.5px",
            color: "rgba(60, 30, 20, 0.6)",
            marginTop: "2px",
          }}
        >
          {hint}
        </Typography>
      )}
    </Box>
    <Box
      aria-hidden
      sx={{
        fontSize: "20px",
        color: filled ? "#FE0944" : "rgba(60, 30, 20, 0.35)",
        flexShrink: 0,
        fontWeight: 800,
      }}
    >
      ›
    </Box>
  </Box>
);

export default SelectionCell;
