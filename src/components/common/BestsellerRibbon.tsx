// src/components/common/BestsellerRibbon.tsx
//
// 🆕 Round 28w.87 (founder: "services เพิ่ม ป้าย แบบ นี้ เมนูแนะนำด้วย" —
//   pointing at the diagonal gold ribbon on /pricing) — the shimmering
//   BESTSELLER corner ribbon, lifted out of PricingPage so /services can carry
//   the SAME badge instead of a second, divergent copy. One definition: change
//   the shimmer here and both surfaces move together.
//
// Requirements of the host card:
//   • position: relative   (the ribbon is absolutely placed against it)
//   • overflow: hidden     (the ribbon runs past the corner and must be clipped)
// Both the /pricing rate card and the /services featured card already set these.
//
// The gold gradient sweeps left→right on a loop ("สีทองวิบวับ", 28w.70). Motion
// is gated on prefers-reduced-motion — the ribbon stays, only the sweep stops.

import React from "react";
import { Box } from "@mui/material";
import { fonts } from "@/theme/theme";

interface Props {
  /** Ribbon copy. Already translated by the caller. */
  label: string;
}

const BestsellerRibbon: React.FC<Props> = ({ label }) => (
  <Box
    aria-hidden
    sx={{
      position: "absolute",
      top: 16,
      right: -34,
      zIndex: 2,
      transform: "rotate(45deg)",
      background:
        "linear-gradient(100deg, #A97913 0%, #E3BE55 28%, #FFF6D2 46%, #E3BE55 62%, #A97913 100%)",
      backgroundSize: "220% 100%",
      animation: "sr-gold-shimmer 3.2s linear infinite",
      "@keyframes sr-gold-shimmer": {
        "0%": { backgroundPosition: "220% 0" },
        "100%": { backgroundPosition: "-220% 0" },
      },
      color: "#4A3400",
      textShadow: "0 1px 0 rgba(255,255,255,0.35)",
      fontFamily: fonts.body,
      fontSize: 9.5,
      fontWeight: 800,
      letterSpacing: "0.14em",
      textTransform: "uppercase",
      whiteSpace: "nowrap",
      padding: "5px 40px",
      boxShadow: "0 4px 14px rgba(201,162,39,0.45)",
      "@media (prefers-reduced-motion: reduce)": { animation: "none" },
    }}
  >
    {label}
  </Box>
);

export default BestsellerRibbon;
