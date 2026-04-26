// src/theme.ts
// SunRed brand theme — แดง-พีช gradient + accent teal
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
} as const;

export const gradients = {
  primary: `linear-gradient(to bottom, ${brand.red}, ${brand.peach})`,
  primaryHover: "linear-gradient(to bottom, #e00738, #fd9b80)",
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
    // body ใช้ Trebuchet MS, headings ใช้ Chonburi
    fontFamily: '"Trebuchet MS", system-ui, -apple-system, sans-serif',
    h1: {
      fontFamily: '"Chonburi", serif',
      fontWeight: 700,
      fontSize: "2.5rem",
      color: brand.red,
    },
    h2: {
      fontFamily: '"Chonburi", serif',
      fontWeight: 600,
      fontSize: "2rem",
      color: brand.red,
    },
    h3: {
      fontFamily: '"Chonburi", serif',
      fontWeight: 500,
      fontSize: "1.5rem",
      color: brand.ink,
    },
    h4: {
      fontFamily: '"Chonburi", serif',
      fontWeight: 500,
      fontSize: "1.25rem",
    },
    h5: { fontFamily: '"Chonburi", serif', fontWeight: 500 },
    h6: { fontFamily: '"Chonburi", serif', fontWeight: 500 },
    body1: { fontSize: "1rem", lineHeight: 1.6 },
    button: {
      textTransform: "none",
      fontWeight: 600,
      letterSpacing: "0.5px",
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
        root: { fontWeight: 500 },
      },
    },
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          fontFamily: '"Trebuchet MS", system-ui, -apple-system, sans-serif',
          color: brand.ink,
          backgroundColor: "#FFFFFF",
        },
      },
    },
  },
});

export default theme;
