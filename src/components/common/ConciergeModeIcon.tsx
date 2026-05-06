// src/components/common/ConciergeModeIcon.tsx
//
// 🆕 Round 28r6 (founder 2026-05-06) — Time-aware mode glyph.
//
// One icon per concierge window. Used by:
//   • HeroSection — Live pill (top-right) and Tonight Special banner glyph
//   • TopNav — inline mode chip
//   • AdminFloatingChat — header tagline + FAB live indicator
//
// Centralising the mapping ensures the glyph never disagrees across
// the page (e.g., banner shows moon while pill shows sun) when the
// hour boundary flips.

import React from "react";
import type { SvgIconProps } from "@mui/material";
import NightsStayRoundedIcon from "@mui/icons-material/NightsStayRounded";
import WbTwilightRoundedIcon from "@mui/icons-material/WbTwilightRounded";
import WbSunnyRoundedIcon from "@mui/icons-material/WbSunnyRounded";
import LocalCafeRoundedIcon from "@mui/icons-material/LocalCafeRounded";

import type { ConciergeMode } from "@/utils/conciergeMode";

export interface ConciergeModeIconProps extends SvgIconProps {
  mode: ConciergeMode;
}

/**
 * Renders the MUI icon that matches the current concierge window:
 *   • prime    → 🌙 NightsStay  (crescent moon — 22:00–04:00)
 *   • evening  → 🌅 WbTwilight  (dusk — 17:00–22:00)
 *   • day      → ☀ WbSunny      (sun — 09:00–17:00)
 *   • off      → ☕ LocalCafe    (concierge warming up — 04:00–09:00)
 *
 * Forwards all SvgIconProps so consumers can size / colour without
 * losing the mapping.
 */
export const ConciergeModeIcon: React.FC<ConciergeModeIconProps> = ({
  mode,
  ...rest
}) => {
  switch (mode) {
    case "prime":
      return <NightsStayRoundedIcon {...rest} />;
    case "evening":
      return <WbTwilightRoundedIcon {...rest} />;
    case "day":
      return <WbSunnyRoundedIcon {...rest} />;
    case "off":
    default:
      return <LocalCafeRoundedIcon {...rest} />;
  }
};

export default ConciergeModeIcon;
