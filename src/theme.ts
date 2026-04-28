// src/theme.ts
// SunRed brand theme — แดง-พีช gradient + accent teal
// Phase 2.5: switch body to Inter (modern), headings keep Chonburi brand serif
import { createTheme } from "@mui/material/styles";

// Brand tokens (ใช้อ้างอิงในโค้ดได้: theme.palette.primary.main ฯลฯ)
export const brand = {
  red: "#FE0944",      // primary
  peach: "#FEAE96",    // gradient end
  white95: "rgba(255,255,255,0.95)",
  ink: "#1a2b2e",      // text primary
  teal: "#2EC4B0",     // accent
  tealLight: "#8ecdd2",
  tealDark: "#1a4f55",
  // Aurora pastel accents (Phase 2.5)
  aurora: {
    peach: "#FFE5D9",
    pink: "#FFD6E8",
    lavender: "#E5D0FF",
    mint: "#D4F4E2",
  },
} as const;

export const gradients = {
  primary: `linear-gradient(to bottom, ${brand.red}, ${brand.peach})`,
  primaryHover: "linear-gradient(to bottom, #e00738, #fd9b80)",
  aurora:
    "linear-gradient(135deg, #FFE5D9 0%, #FFD6E8 35%, #E5D0FF 65%, #D4F4E2 100%)",
} as const;

// 🔤 Font stacks (Phase 2.5)
const FONT_BODY =
  '"Inter", system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
const FONT_HEADING_LUXE =
  '"Playfair Display", "Chonburi", Georgia, "Times New Roman", serif';
const FONT_BRAND_SERIF = '"Chonburi", serif'; // คงไว้สำหรับ logo SunRed เดิม

// Re-export fonts for components that want explicit family
export const fonts = {
  body: FONT_BODY,
  heading: FONT_HEADING_LUXE,
  brand: FONT_BRAND_SERIF,
} as const;

export const theme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: brand.red,
      light: brand.peach,
      contrastText: brand.white95,
    },
    secondary: {
      main: brand.teal,
      light: brand.tealLight,
      dark: brand.tealDark,
      contrastText: "#FFFFFF",
    },
    background: {
      default: "#FFFFFF",
      paper: "#FFFFFF",
    },
    text: {
      primary: brand.ink,
      secondary: brand.tealDark,
    },
  },
  typography: {
    // body ใช้ Inter (modern), headings ใช้ Playfair Display (luxury serif accent)
    fontFamily: FONT_BODY,
    fontWeightRegular: 400,
    fontWeightMedium: 500,
    fontWeightBold: 700,
    h1: {
      fontFamily: FONT_HEADING_LUXE,
      fontWeight: 700,
      fontSize: "2.5rem",
      letterSpacing: "-0.02em",
      color: brand.red,
    },
    h2: {
      fontFamily: FONT_HEADING_LUXE,
      fontWeight: 600,
      fontSize: "2rem",
      letterSpacing: "-0.015em",
      color: brand.red,
    },
    h3: {
      fontFamily: FONT_HEADING_LUXE,
      fontWeight: 600,
      fontSize: "1.5rem",
      letterSpacing: "-0.01em",
      color: brand.ink,
    },
    h4: {
      fontFamily: FONT_HEADING_LUXE,
      fontWeight: 600,
      fontSize: "1.25rem",
    },
    h5: { fontFamily: FONT_HEADING_LUXE, fontWeight: 500 },
    h6: { fontFamily: FONT_HEADING_LUXE, fontWeight: 500 },
    body1: { fontSize: "1rem", lineHeight: 1.6, fontFamily: FONT_BODY },
    body2: { fontSize: "0.875rem", lineHeight: 1.55, fontFamily: FONT_BODY },
    button: {
      fontFamily: FONT_BODY,
      textTransform: "none",
      fontWeight: 600,
      letterSpacing: "0.02em",
    },
  },
  shape: { borderRadius: 16 },
  components: {
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          borderRadius: 16,
          padding: "10px 24px",
          fontWeight: 600,
        },
        containedPrimary: {
          background: gradients.primary,
          color: brand.white95,
          "&:hover": {
            background: gradients.primaryHover,
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          background: gradients.primary,
          color: brand.white95,
          boxShadow: "0 4px 16px rgba(254, 9, 68, 0.18)",
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: "0 6px 20px rgba(0,0,0,0.08)",
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        rounded: { borderRadius: 16 },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 500, fontFamily: FONT_BODY },
      },
    },
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          fontFamily: FONT_BODY,
          color: brand.ink,
          backgroundColor: "#FFFFFF",
          // ⚡ better text rendering on retina
          WebkitFontSmoothing: "antialiased",
          MozOsxFontSmoothing: "grayscale",
          textRendering: "optimizeLegibility",
        },
      },
    },
  },
});

export default theme;
