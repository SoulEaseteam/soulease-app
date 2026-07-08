// src/theme/buttons.ts
//
// 🆕 Round 28r80 · Sitewide button standardization (2026-07-08)
//
// Founder direction:
//   "ใช้สีนี้เป็นสีปุ่มทั้งหมด · ขนาดปุ่มที่คล้ายกันเท่ากันทั้งเว็บ ·
//    #4B4B48 เป็นตัวหนังสือทั้งหมด แบบหนา"
//
// This module centralises button SIZE + COLOR tokens so every primary
// CTA across the customer site renders identically:
//   • same padding ramp (xs/md/lg)
//   • same border-radius (999px pill)
//   • same font-size ramp (14 / 14.5 / 15)
//   • same font-weight (600)
//   • same min-height (46)
//
// Two size variants: `primary` (main CTA — Reserve, Place Order, etc.)
// and `compact` (inline row buttons — Edit, small chip CTAs).
//
// The palette hex values are pulled from `MembershipCard.tsx` r74
// (BTN_BG `#8F8474`, BTN_BG_HOVER `#7A7060`) — the founder pointed at
// that CTA as the target tone. Same values live in `theme.ts` as
// `warmTaupe.base` / `warmTaupe.hover` — keep in sync.
//
// Usage:
//
//   import { buttonSx } from "@/theme/buttons";
//   <Button sx={buttonSx.primary}>Reserve</Button>
//
//   // or spread piecemeal if you need to customise:
//   <Box component="button" sx={{ ...buttonSx.primary, minWidth: 200 }}>
//
// ─────────────────────────────────────────────────────────────────────

/** Uniform primary-CTA size envelope. */
export const buttonSizes = {
  primary: {
    padding: { xs: "12px 24px", md: "13px 28px", lg: "14px 32px" },
    borderRadius: "999px",
    fontFamily: '"Sarabun", "Inter", system-ui, sans-serif',
    fontSize: { xs: 14, md: 14.5, lg: 15 },
    fontWeight: 600,
    minHeight: 46,
    letterSpacing: "0.005em",
  },
  compact: {
    padding: { xs: "8px 16px", md: "9px 18px" },
    borderRadius: "999px",
    fontFamily: '"Sarabun", "Inter", system-ui, sans-serif',
    fontSize: { xs: 12.5, md: 13 },
    fontWeight: 600,
    minHeight: 36,
    letterSpacing: "0.005em",
  },
} as const;

/** Warm-taupe primary CTA + secondary outline colours. */
export const buttonColors = {
  primary: {
    background: "#8F8474",         // WARM_TAUPE (MembershipCard BTN_BG r74)
    color: "#FFFFFF",
    hoverBg: "#7A7060",            // WARM_TAUPE_HOVER
    shadow:
      "0 6px 18px rgba(143, 132, 116, 0.24), inset 0 1px 0 rgba(255,255,255,0.10)",
    hoverShadow: "0 8px 22px rgba(122, 112, 96, 0.30)",
  },
  secondary: {
    background: "transparent",
    color: "#4B4B48",              // GRAY_800
    border: "1.5px solid #4B4B48",
    hoverBg: "#4B4B48",
    hoverColor: "#FFFFFF",
  },
  /** For a subtle taupe outline variant (used on ghost / secondary spa CTAs). */
  ghostTaupe: {
    background: "transparent",
    color: "#8F8474",
    border: "1.5px solid #8F8474",
    hoverBg: "#8F8474",
    hoverColor: "#FFFFFF",
  },
} as const;

/**
 * Drop-in `sx` recipes. Spread on a `<Button>` or `<Box component="button">`
 * so a component only needs to add its own text + onClick.
 *
 *   <Box component="button" onClick={...} sx={buttonSx.primary}>
 *     Reserve
 *   </Box>
 */
export const buttonSx = {
  primary: {
    ...buttonSizes.primary,
    background: buttonColors.primary.background,
    color: buttonColors.primary.color,
    border: "none",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: buttonColors.primary.shadow,
    transition:
      "background 0.18s ease, transform 0.18s ease, box-shadow 0.18s ease",
    "&:hover": {
      background: buttonColors.primary.hoverBg,
      boxShadow: buttonColors.primary.hoverShadow,
      transform: "translateY(-1px)",
    },
    "&:focus-visible": {
      outline: "2px solid #4B4B48",
      outlineOffset: 3,
    },
    "&:disabled": {
      opacity: 0.5,
      cursor: "not-allowed",
      transform: "none",
    },
  },
  compact: {
    ...buttonSizes.compact,
    background: buttonColors.primary.background,
    color: buttonColors.primary.color,
    border: "none",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "background 0.18s ease",
    "&:hover": {
      background: buttonColors.primary.hoverBg,
    },
  },
  secondary: {
    ...buttonSizes.primary,
    background: buttonColors.secondary.background,
    color: buttonColors.secondary.color,
    border: buttonColors.secondary.border,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "background 0.18s ease, color 0.18s ease",
    "&:hover": {
      background: buttonColors.secondary.hoverBg,
      color: buttonColors.secondary.hoverColor,
    },
  },
} as const;
