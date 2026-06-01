
import { createTheme } from "@mui/material/styles";

// ─────────────────────────────────────────────────────────────────────
// 🎨 BRAND tokens — Round 28s150 palette swap
//
// Source references:
//   • Red base: DOT Podcast brand book (#B4000A — deep crimson, not
//     the old hot #B4000A). Cleaner, more "editorial premium".
//   • Neutrals + status: extracted from competitor (cbody.vip) palette,
//     EXCLUDING their signature mint-teal CTA (#2EC4B0) so SunRed
//     doesn't read as a clone. SunRed's primary action stays red.
//
// Founder direction (2026-XX): "เปลี่ยนสีธีมทั้งโปรเจค สีแดงตามนี้
//   สีอื่นๆ ตามนี้ ยกเว้นเขียวแบบ cbody."
// ─────────────────────────────────────────────────────────────────────
// 🆕 Round 28s152 — Founder pushback on 28s151: "สีเขาเรา ดูเศร้าไปนะ
//   พื้นหลัง สีแดง ok ละ แต่ไม่เอา เรืองแสง". Translation: bg + red
//   are fine, but the page looks dead — bring some accent life back
//   (stars · NEW badge · tag chips · soft favourite). No glow shadows
//   though. Result: red CTA stays flat, plus 3 accents used SPARINGLY.
export const brand = {
  // ── Primary (kept from 28s151)
  red: "#B4000A",            // CTA · brand wordmark · accent (flat)
  text: "#1A2B2E",           // headings + dark surfaces
  textMuted: "#4A5568",      // body copy + subtitles
  bg1: "#F4F6F5",            // page background
  bg2: "#F4F6F5",            // alias = bg1
  green: "#16A34A",          // online dot ONLY

  // ── Small accent palette (28s152 restoration · use sparingly)
  amber: "#F5A623",          // ★ star ratings · NEW / TOP-RATED badge
  pink: "#FFE5EC",           // favourite heart bg · subtle highlight
  tagBlue: "#E0E7FF",        // tag chip bg "Natural" etc.
  tagPeach: "#FFE7D6",       // tag chip bg "Fair-skin" etc.

  // ── Legacy aliases — fewer aliases collapse onto red now
  //   (peach + cream re-route to the amber/pink restoration above).
  coral: "#B4000A",          // legacy gradient pair → solid red
  peach: "#F5A623",          // legacy urgency badge → AMBER (restored)
  cream: "#FFE5EC",          // legacy soft accent → PINK (restored)
  accent: "#4A5568",         // eyebrow labels (cool gray)
  burgundy: "#B4000A",       // dark accent → solid red
  bg1Legacy: "#F4F6F5",
  bg2Legacy: "#F4F6F5",
  bg1Warm: "#F4F6F5",
  bg2Warm: "#F4F6F5",
  greenSoft: "#E8F8F5",      // available pill bg (soft mint)
  ink: "#1A2B2E",
} as const;

// ─────────────────────────────────────────────────────────────────────
// 🌈 "Gradients" — Round 28s151: founder direction "ไม่ต้องไล่สี".
//   Every token below is now a flat solid colour expressed as a CSS
//   gradient string so existing call sites (background: gradients.X)
//   keep compiling. No more red→coral sunset · no more cream wash ·
//   just clean editorial reds + neutral bg.
// ─────────────────────────────────────────────────────────────────────
export const gradients = {
  /** Primary CTA — flat brand red */
  primary: brand.red,
  /** Section background — flat off-white */
  surface: brand.bg1,
  /** Final hero CTA — flat brand red (was sunset) */
  finalCta: brand.red,

  // legacy aliases
  primaryHover: "#7C0007", // single darker shade for hover state only
} as const;

// ─────────────────────────────────────────────────────────────────────
// 🔤 Font stacks — Fraunces (serif headlines + italic accent) + Inter (body).
//    Both already loaded by Google Fonts <link> in index.html.
// ─────────────────────────────────────────────────────────────────────
// 🆕 Round 28s155 — Heading font swapped Cinzel → Italiana
//   (founder reference image: "3. HOW WE MAY COLLECT YOUR
//   PERSONAL INFORMATION" rendered in classical tall-narrow
//   Roman caps). Cinzel kept as fallback for graceful degradation
//   while Italiana streams in. Inter stays for body.
const FONT_BODY =
  '"Inter", system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
// 🆕 Round 28s156 — Heading font: Federo (Art Deco Roman caps).
//   Founder reference image showed even-stroke geometric letters
//   with flat-top A, straight-stroke W, angled-leg R. Italiana
//   and Cinzel retained as fallbacks while Federo streams in.
const FONT_HEADING =
  '"Federo", "Federo", "Italiana", "Cinzel", "Fraunces", Georgia, "Times New Roman", serif';
const FONT_BRAND_SERIF =
  '"Federo", "Federo", "Italiana", "Cinzel", "Fraunces", "Chonburi", serif';

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
      "0 12px 40px rgba(15, 23, 42, 0.10), inset 0 1px 0 rgba(255, 255, 255, 0.7)",
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
            "0 8px 24px rgba(15, 23, 42, 0.30), inset 0 1px 0 rgba(255,255,255,0.30)",
          "&:hover": {
            background: gradients.primaryHover,
            boxShadow: "0 10px 28px rgba(15, 23, 42, 0.36)",
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
