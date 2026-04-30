// src/theme.ts
//
// 🎨 SunRed brand theme — Phase 1 (`redesign/foundation`)
// Source of truth: 00-handoff/BRAND.md (warm cream + brand red liquid-glass).
//
// Migrated from "monochrome editorial" / "aurora" / "queen of hearts"
// theme drift back to the canonical BRAND.md tokens. Existing imports are
// preserved (`brand`, `gradients`, `fonts`, default theme export) so other
// files don't break.

import { createTheme } from "@mui/material/styles";

// ─────────────────────────────────────────────────────────────────────
// 🎨 BRAND tokens — verbatim from 00-handoff/BRAND.md
// ─────────────────────────────────────────────────────────────────────
export const brand = {
  // primary palette
  red: "#FE0944",            // primary CTA + italic accent + brand wordmark
  coral: "#FE7A52",          // gradient pair with red
  peach: "#FFB088",          // tertiary accent + animated blob
  cream: "#FEC9A7",          // soft accent + animated blob

  // background gradient stops
  bg1: "#FFF8F0",            // top of warm-cream gradient
  bg2: "#FCEBDC",            // bottom of warm-cream gradient

  // text
  text: "#2a1a14",           // primary text on cream bg
  textMuted: "rgba(60, 30, 20, 0.72)",

  // accents
  accent: "#b85c3c",         // eyebrow labels, decorative dividers
  burgundy: "#831843",       // dark red accent, "live" status
  green: "#16a34a",          // online indicator, success

  // legacy aliases — kept for backward compat with files that still import them.
  // do NOT add new uses — prefer the canonical names above.
  ink: "#2a1a14",            // alias of `text`
} as const;

// ─────────────────────────────────────────────────────────────────────
// 🌈 Gradient patterns — verbatim from BRAND.md
// ─────────────────────────────────────────────────────────────────────
export const gradients = {
  /** Primary CTA — red→coral diagonal */
  primary: `linear-gradient(135deg, ${brand.red}, ${brand.coral})`,
  /** Section accent — warm cream bg gradient */
  surface: `linear-gradient(180deg, ${brand.bg1} 0%, ${brand.bg2} 100%)`,
  /** Final-CTA hero — full sunset (red → coral → peach) */
  finalCta: `linear-gradient(135deg, ${brand.red} 0%, ${brand.coral} 50%, ${brand.peach} 100%)`,

  // legacy aliases
  primaryHover: `linear-gradient(135deg, #E00738, #E76E48)`,
} as const;

// ─────────────────────────────────────────────────────────────────────
// 🔤 Font stacks — Fraunces (serif headlines + italic accent) + Inter (body).
//    Both already loaded by Google Fonts <link> in index.html.
// ─────────────────────────────────────────────────────────────────────
const FONT_BODY =
  '"Inter", system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
const FONT_HEADING =
  '"Fraunces", Georgia, "Times New Roman", serif';
// Kept for legacy components still referencing the old wordmark stack
const FONT_BRAND_SERIF = '"Fraunces", "Chonburi", serif';

export const fonts = {
  body: FONT_BODY,
  heading: FONT_HEADING,
  brandSerif: FONT_BRAND_SERIF,
} as const;

// ─────────────────────────────────────────────────────────────────────
// 💎 Liquid Glass card recipe — verbatim from BRAND.md
//    Reusable spread: `sx={{ ...glass.card, ...other }}`.
// ─────────────────────────────────────────────────────────────────────
export const glass = {
  /** Default card — `blur(30px) saturate(180%)`, `rgba(0.45)` */
  card: {
    borderRadius: 22 / 8, // MUI uses 8px-base spacing for radius too
    background: "rgba(255, 255, 255, 0.45)",
    backdropFilter: "blur(30px) saturate(180%)",
    WebkitBackdropFilter: "blur(30px) saturate(180%)",
    border: "1px solid rgba(255, 255, 255, 0.65)",
    boxShadow:
      "0 12px 40px rgba(254, 9, 68, 0.10), inset 0 1px 0 rgba(255, 255, 255, 0.7)",
  },
  /** Top pill / nav — `blur(20px)`, `rgba(0.55)` */
  pill: {
    borderRadius: 99,
    background: "rgba(255, 255, 255, 0.55)",
    backdropFilter: "blur(20px) saturate(180%)",
    WebkitBackdropFilter: "blur(20px) saturate(180%)",
    border: "1px solid rgba(255, 255, 255, 0.7)",
    boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.6)",
  },
  /** Floating action — `blur(20px)`, `rgba(0.65)` */
  floating: {
    borderRadius: 22 / 8,
    background: "rgba(255, 255, 255, 0.65)",
    backdropFilter: "blur(20px) saturate(180%)",
    WebkitBackdropFilter: "blur(20px) saturate(180%)",
    border: "1px solid rgba(255, 255, 255, 0.7)",
  },
  /** Trust card — `blur(15px)`, `rgba(0.7)` */
  trust: {
    borderRadius: 14 / 8,
    background: "rgba(255, 255, 255, 0.7)",
    backdropFilter: "blur(15px)",
    WebkitBackdropFilter: "blur(15px)",
    border: "1px solid rgba(255, 255, 255, 0.8)",
  },
} as const;

// ─────────────────────────────────────────────────────────────────────
// 🎬 Animated blob recipe — three drift loops (BRAND.md §"Animated blob recipe")
//    Use as @keyframes inside an `sx` prop.
// ─────────────────────────────────────────────────────────────────────
export const blobKeyframes = {
  "@keyframes blobMove1": {
    "0%, 100%": { transform: "translate(0, 0) scale(1)" },
    "33%": { transform: "translate(40px, -30px) scale(1.15)" },
    "66%": { transform: "translate(-20px, 30px) scale(0.95)" },
  },
  "@keyframes blobMove2": {
    "0%, 100%": { transform: "translate(0, 0) scale(1)" },
    "33%": { transform: "translate(-50px, 40px) scale(1.1)" },
    "66%": { transform: "translate(30px, -20px) scale(1.2)" },
  },
  "@keyframes blobMove3": {
    "0%, 100%": { transform: "translate(0, 0) scale(1)" },
    "50%": { transform: "translate(20px, -40px) scale(1.25)" },
  },
  "@keyframes pulseDot": {
    "0%, 100%": { opacity: 1 },
    "50%": { opacity: 0.4 },
  },
  "@keyframes leafFloat": {
    "0%, 100%": { transform: "rotate(0deg) translate(0, 0)" },
    "50%": { transform: "rotate(8deg) translate(3px, -4px)" },
  },
} as const;

// ─────────────────────────────────────────────────────────────────────
// 🎛 MUI v7 theme — palette + typography + component defaults
// ─────────────────────────────────────────────────────────────────────
const theme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: brand.red,
      light: brand.coral,
      dark: brand.burgundy,
      contrastText: "#ffffff",
    },
    secondary: {
      main: brand.coral,
      light: brand.peach,
      dark: brand.red,
      contrastText: "#ffffff",
    },
    success: { main: brand.green },
    background: {
      default: brand.bg1,
      paper: "rgba(255, 255, 255, 0.65)",
    },
    text: {
      primary: brand.text,
      secondary: brand.textMuted,
    },
  },

  shape: {
    // ⚠️ keep MUI v7 default of 4px so numeric `borderRadius: N` values in
    //    `sx` props across the codebase render as expected (N × 4 = px).
    //    Mockup CSS uses literal px values; components prefer string literals
    //    like `'22px'` for pixel-perfect copy from the mockups.
    borderRadius: 4,
  },

  typography: {
    fontFamily: FONT_BODY,
    h1: { fontFamily: FONT_HEADING, fontWeight: 400, lineHeight: 1.05 },
    h2: { fontFamily: FONT_HEADING, fontWeight: 400, lineHeight: 1.1 },
    h3: { fontFamily: FONT_HEADING, fontWeight: 500, lineHeight: 1.15 },
    h4: { fontFamily: FONT_HEADING, fontWeight: 500 },
    h5: { fontFamily: FONT_HEADING, fontWeight: 500 },
    h6: { fontFamily: FONT_HEADING, fontWeight: 600 },
    button: {
      fontFamily: FONT_BODY,
      fontWeight: 700,
      textTransform: "none",
      letterSpacing: "-0.01em",
    },
    body1: { fontFamily: FONT_BODY, fontWeight: 500 },
    body2: { fontFamily: FONT_BODY, fontWeight: 500 },
  },

  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          background: gradients.surface,
          minHeight: "100vh",
          color: brand.text,
          WebkitFontSmoothing: "antialiased",
        },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          borderRadius: 99,
          textTransform: "none",
          fontWeight: 700,
        },
        containedPrimary: {
          background: gradients.primary,
          boxShadow:
            "0 8px 24px rgba(254, 9, 68, 0.30), inset 0 1px 0 rgba(255,255,255,0.30)",
          "&:hover": {
            background: gradients.primaryHover,
            boxShadow: "0 10px 28px rgba(254, 9, 68, 0.36)",
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
        },
      },
    },
  },
});

export default theme;
