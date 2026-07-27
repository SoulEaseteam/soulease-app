// src/components/common/SunRedWordmark.tsx
//
// 🎨 Round 28e (founder 2026-05-02) — single source of truth for the
// "SunRed" wordmark. Used by TopNav (small + medium) and HeroSection
// (medium) so the brand reads identically everywhere.
//
// Visual recipe:
//   • Custom sun glyph (red core + coral rays) — 8-point sunburst in
//     brand colors, ties literally to the brand name (sun + red)
//   • Wordmark "SunRed" in Fraunces italic, weight 500, brand.text color
//   • Inline-baseline aligned, tight tracking
//
// Why no gradient? Gradient text breaks readability at small sizes
// (drawer pill, footer credits). Two-tone "Sun + Red" was too direct
// (FedEx-style). Italic serif + a tiny graphic glyph reads more like
// a premium hospitality brand (Aman / Aesop / Diptyque).

import React from "react";
import { Box, Typography } from "@mui/material";
import { brand, fonts } from "@/theme/theme";

export interface SunRedWordmarkProps {
  /** Font size in px. Glyph scales proportionally. Default 22. */
  size?: number;
  /** Text color. Defaults to `brand.text` (warm dark). */
  color?: string;
  /** Hide the sun glyph (text-only mode). */
  glyphOnly?: false;
  /** Override className for outer wrapper if needed */
  className?: string;
}

/**
 * The SunRed sunburst — red core + 8 coral rays, sized relative to
 * the wordmark font size so it sits flush with the lowercase x-height.
 */
const SunGlyph: React.FC<{ size: number }> = ({ size }) => {
  // Glyph is ~78% of the font size for visual balance with italic serif
  const px = Math.round(size * 0.78);
  return (
    <Box
      component="svg"
      role="img"
      aria-label="SunRed sun mark"
      viewBox="0 0 24 24"
      sx={{ width: px, height: px, flexShrink: 0, display: "block" }}
    >
      {/* Sun core */}
      <circle cx="12" cy="12" r="4.2" fill={brand.red} />
      {/* 8 rays — short, rounded line caps */}
      {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
        <line
          key={deg}
          x1="12"
          y1="2.6"
          x2="12"
          y2="5.4"
          stroke={brand.coral}
          strokeWidth="2"
          strokeLinecap="round"
          transform={`rotate(${deg} 12 12)`}
        />
      ))}
    </Box>
  );
};

const SunRedWordmark: React.FC<SunRedWordmarkProps> = ({
  size = 22,
  color = brand.text,
  className,
}) => {
  return (
    <Box
      className={className}
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: `${Math.max(4, Math.round(size * 0.28))}px`,
      }}
    >
      <SunGlyph size={size} />
      <Typography
        component="span"
        sx={{
          fontFamily: fonts.heading,
          fontStyle: "italic",
          fontWeight: 500,
          fontSize: `${size}px`,
          color,
          letterSpacing: "-0.015em",
          lineHeight: 1,
          // Drop the dot of the lowercase serif italic into the rhythm
          // of the rays — slight optical kerning to compensate for
          // italic slant against the upright glyph.
          transform: "translateY(0.5px)",
        }}
      >
        SunRed
      </Typography>
    </Box>
  );
};

export default SunRedWordmark;
