
import { createTheme } from "@mui/material/styles";
// 🆕 Round 28s306 — teach createTheme about the X date-pickers component
//   keys (MuiPickersPopper etc.) so the popover-paper override below
//   type-checks.
import type {} from "@mui/x-date-pickers/themeAugmentation";

// ─────────────────────────────────────────────────────────────────────
// 🎨 BRAND tokens — Round 28r70 · Rebrand Phase 1 (2026-07-08)
//
// Founder direction: "ลุยเต็มระบบ" (go all-in) — sitewide switch from
// Sunred Red / Cool Slate to **Nordic Gray Neutrals + Playfair Display**.
// This is Phase 1 (foundation only): palette + font stacks + hero copy +
// pricing route. Phase 2 will build a real /pricing page. Phase 3 will
// sweep per-page polish. Phase 4 will audit.
//
// Blast-radius discipline: every existing token export
// (brand.red, brand.text, brand.textMuted, fonts.heading, gradients.*)
// is PRESERVED so downstream imports don't break — only the VALUES are
// changed. Where a name like `brand.red` no longer makes semantic sense,
// the export still resolves — it points at GRAY_900, the new primary
// CTA colour. Sunred crimson is gone; Nordic dark ink takes its role.
//
// The 3 fresh token trees (`neutrals`, `grays`, `warmAccents`, `sage`)
// are added ALONGSIDE the legacy ones so new work can consume the
// intended tokens directly without needing the legacy alias trick.
// ─────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────
// 🕯️ DARK-LUXURY + auto DAY/NIGHT — Round 28t (founder 2026-07-12)
//
// Founder direction: "เปลี่ยนสีเว็บ · Luxury premium palette" + auto
// day/night. A warm five-star-spa look that wears a LIGHT cream/ivory
// palette in daylight and a DARK espresso palette after dark. Dusty-rose
// + soft-gold ACCENTS are identical in both modes — only SURFACES and
// TEXT-ON-SURFACE flip. So the surface/text tokens below are CSS
// variables (`var(--sr-*)`, defined in index.css: `:root` = night ·
// `html.sr-day` = day, toggled by DayNightSync); accent tokens stay fixed
// hex. Const NAMES are UNCHANGED so every downstream tree + MUI palette
// re-skins automatically and follows the day/night switch for free.
//
// Grounds (surface tokens → CSS vars, flip day/night).
const NEUTRAL_50  = "var(--sr-bg)";        // page ground
const NEUTRAL_100 = "var(--sr-panel)";     // card / section panel
const NEUTRAL_200 = "var(--sr-panel-2)";   // softer surface / hover
const NEUTRAL_300 = "var(--sr-hairline)";  // warm hairline borders
const NEUTRAL_400 = "var(--sr-line)";      // dim dividers

// Ink (text tokens → CSS vars, flip day/night). GRAY_900 = brightest/
// darkest headline ink per mode; GRAY_400 = dimmest caption.
const GRAY_400 = "var(--sr-dim)";          // dim / disabled
const GRAY_500 = "var(--sr-muted)";        // muted body
const GRAY_600 = "var(--sr-body)";         // body text
const GRAY_800 = "var(--sr-ink)";          // heading + primary TEXT
const GRAY_900 = "var(--sr-ink)";          // headline ink

// Warm accents (FIXED both modes)
const WARM_100 = "#D9A98A";     // warm tan light
const WARM_200 = "#CA906F";     // Warm Tan (skin / secondary fill)
const SAGE_400 = "#57B88B"; // success / online / "available" → green (founder semantic)

// ── Dusty-rose primary CTA (was WARM_TAUPE) ────────────────────────
// Founder spec: Dusty Rose #D97C95 primary, Dusty Rose Brown #C96F89
// ribbon/hover. Names kept as WARM_TAUPE* so all CTA call-sites re-skin.
const WARM_TAUPE       = "#D97C95"; // primary CTA fill — Vintage Rose
const WARM_TAUPE_HOVER = "#C96F89"; // primary CTA hover — Dusty Rose Brown

// ── Signal-highlight accents (dark-luxury values) ──────────────────
// Soft-gold is the single signature "embroidery" accent — NEW badges,
// stars, price, availability, key highlights. Favorite = dusty rose.
const TEAL_MINT           = "var(--sr-gold-text)"; // NEW badge / highlights → gold (per mode)
const AVAILABLE_GREEN     = "rgba(87,184,139,0.14)"; // "Available" pill bg — green tint
const AVAILABLE_GREEN_TEXT = "#57B88B"; // "Available" text — green
const FAVORITE_PINK       = "rgba(217,124,149,0.16)"; // heart / favorite bg — rose tint (fixed)
const FAVORITE_PINK_TEXT  = "#D97C95"; // heart glyph — Vintage Rose (fixed)
const AMBER_STAR          = "#F4C542"; // star rating — bright gold-yellow (founder)

// ── New named token trees (preferred going forward) ────────────────
export const neutrals = {
  n50: NEUTRAL_50,
  n100: NEUTRAL_100,
  n200: NEUTRAL_200,
  n300: NEUTRAL_300,
  n400: NEUTRAL_400,
} as const;

export const grays = {
  g400: GRAY_400,
  g500: GRAY_500,
  g600: GRAY_600,
  g800: GRAY_800,
  g900: GRAY_900,
} as const;

export const warmAccents = {
  w100: WARM_100,
  w200: WARM_200,
} as const;

export const sage = SAGE_400;

/** Round 28r80 — warm-taupe primary CTA token. Use for buttons, pills,
 *  focus rings on customer-facing surfaces. */
export const warmTaupe = {
  base: WARM_TAUPE,
  hover: WARM_TAUPE_HOVER,
} as const;

/** Round 28r81 — accent palette. Sparingly-used signal-highlight tokens
 *  for NEW badges, availability, favorites, star ratings, and key
 *  highlights. Rule: max 2-3 accent touches per screen — the Nordic
 *  Gray voice stays primary. */
export const accents = {
  teal: TEAL_MINT,
  availableBg: AVAILABLE_GREEN,
  availableText: AVAILABLE_GREEN_TEXT,
  favoriteBg: FAVORITE_PINK,
  favoriteText: FAVORITE_PINK_TEXT,
  amber: AMBER_STAR,
} as const;

// ── Legacy `brand` tree — VALUES swapped, names preserved ──────────
//   `brand.red` no longer holds crimson. It now points at GRAY_900,
//   which is the Nordic direction's primary-CTA/dark-ink colour, so
//   every existing `background: brand.red` becomes a solid dark button
//   (correct visual role · wrong variable name). Phase 3 will do the
//   name-cleanup sweep across the ~40 files that reference `brand.red`
//   / `brand.coral` etc.
export const brand = {
  // ── Primary
  red: WARM_TAUPE,             // PRIMARY CTA — warm taupe (r80, was GRAY_900)
  text: GRAY_800,              // headings + body TEXT (unified 4B4B48)
  textMuted: GRAY_600,         // body copy + subtitles
  bg1: NEUTRAL_50,             // page background
  bg2: NEUTRAL_100,            // card / section background
  green: SAGE_400,             // online dot / success (was #16A34A)

  // ── Small accent palette — dark-luxury signature is Soft Gold
  amber: "var(--sr-gold-text)", // ★ star ratings · badges — gold (per mode)
  pink: "rgba(217,124,149,0.16)", // favourite bg · soft rose highlight
  tagBlue: NEUTRAL_100,        // tag chip bg
  tagPeach: NEUTRAL_200,       // tag chip bg (warmer variant)

  // ── Legacy aliases — every prior colour collapses onto the Nordic
  //   equivalent so downstream `sx={{ color: brand.coral }}` still
  //   compiles + renders consistently with the new palette.
  coral: "var(--sr-gold-text)", // legacy 2ndary → gold wordmark rays (per mode)
  peach: WARM_200,             // legacy urgency → warm sand
  cream: NEUTRAL_100,          // legacy soft accent → neutral 100
  accent: GRAY_600,            // eyebrow labels → muted body
  burgundy: WARM_TAUPE,        // dark accent → warm taupe (r80)
  bg1Legacy: NEUTRAL_50,
  bg2Legacy: NEUTRAL_100,
  bg1Warm: NEUTRAL_50,
  bg2Warm: NEUTRAL_100,
  greenSoft: "rgba(210,182,124,0.16)", // available pill bg — soft gold tint
  ink: GRAY_900,               // deepest ink — hero headlines only
} as const;

// ─────────────────────────────────────────────────────────────────────
// 🌈 Gradient tokens — Nordic direction is flat; every string below is
//   a solid colour value expressed as a CSS "gradient" string so
//   `background: gradients.X` call sites keep compiling. Where a
//   Sunred-red gradient used to sit, a flat dark-ink surface takes over.
// ─────────────────────────────────────────────────────────────────────
export const gradients = {
  /** Primary CTA — dusty-rose gradient (28t dark-luxury) */
  primary: "linear-gradient(135deg,#D97C95 0%,#C96F89 100%)",
  /** Section background — flat espresso ground */
  surface: NEUTRAL_50,
  /** Final hero CTA — dusty-rose gradient */
  finalCta: "linear-gradient(135deg,#D97C95 0%,#C96F89 100%)",

  // legacy aliases
  primaryHover: "linear-gradient(135deg,#C96F89 0%,#B36079 100%)", // deeper rose on hover
} as const;

// ─────────────────────────────────────────────────────────────────────
// 🔤 Font stacks — Round 28r70 · Playfair Display + Sarabun/Inter
//
// Founder spec:
//   • Heading serif — Playfair Display
//   • Body — Sarabun / Prompt (Thai) · Inter (Latin fallback)
//   • UI / Buttons — Sarabun / Prompt / Inter
//
// Fraunces / Federo / Italiana / Cinzel / Cormorant are OUT (removed
// from Google Fonts loading in index.html). They remain in these
// fallback strings only as a graceful defensive layer in case a
// downstream component still ships a literal that lands on a system
// browser without Playfair loaded — the OS will skip to the next
// available serif.
// ─────────────────────────────────────────────────────────────────────
const FONT_BODY =
  '"Sarabun", "Inter", "Prompt", system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
const FONT_HEADING =
  '"Playfair Display", "Fraunces", Georgia, "Times New Roman", serif';
const FONT_BRAND_SERIF =
  '"Playfair Display", "Fraunces", Georgia, "Times New Roman", serif';

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
    // 28t dark-luxury — espresso ground, dusty-rose primary, gold secondary.
    mode: "dark",
    primary: {
      main: WARM_TAUPE,          // Vintage Rose #D97C95
      light: "#E38EA5",          // dark-mode hover tint
      dark: WARM_TAUPE_HOVER,    // Dusty Rose Brown #C96F89
      contrastText: "#FFFFFF",
    },
    secondary: {
      main: "#D2B67C",           // Luxury Gold
      light: "#E4C888",
      dark: WARM_200,            // Warm Tan
      contrastText: "#4C3415",   // deep brown on gold
    },
    success: { main: "#57B88B" }, // Available green (founder semantic)
    background: {
      default: NEUTRAL_50,       // Espresso Black
      paper: NEUTRAL_100,        // Dark Chocolate panel
    },
    text: {
      primary: GRAY_800,         // → var(--sr-ink)
      secondary: GRAY_500,       // → var(--sr-muted)
    },
    // MUI runs palette.divider through colour math (can't parse var()), so
    // this stays a fixed warm translucent that reads on both light + dark.
    // Per-component dividers that need the exact day/night line override
    // `borderColor: var(--sr-line)` in sx.
    divider: "rgba(150, 125, 100, 0.22)",
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
    h1: { fontFamily: FONT_HEADING, fontWeight: 500, lineHeight: 1.05 },
    h2: { fontFamily: FONT_HEADING, fontWeight: 500, lineHeight: 1.1 },
    h3: { fontFamily: FONT_HEADING, fontWeight: 500, lineHeight: 1.15 },
    h4: { fontFamily: FONT_HEADING, fontWeight: 500 },
    h5: { fontFamily: FONT_HEADING, fontWeight: 500 },
    h6: { fontFamily: FONT_HEADING, fontWeight: 600 },
    button: {
      fontFamily: FONT_BODY,
      fontWeight: 600,
      textTransform: "none",
      letterSpacing: "0.005em",
    },
    body1: { fontFamily: FONT_BODY, fontWeight: 400 },
    body2: { fontFamily: FONT_BODY, fontWeight: 400 },
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
          borderRadius: 999,
          textTransform: "none",
          fontWeight: 600,
          minHeight: 46,
        },
        containedPrimary: {
          background: gradients.primary,
          boxShadow:
            "0 6px 18px rgba(217, 124, 149, 0.30), inset 0 1px 0 rgba(255,255,255,0.12)",
          "&:hover": {
            background: gradients.primaryHover,
            boxShadow: "0 8px 22px rgba(161, 98, 86, 0.38)",
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
    // 🆕 Round 28s306 (founder: date-picker calendar shows through on every
    //   admin page — "พื้นหลังจาง ไม่เห็นเลย ปรับแก้ทั้งหมด"). Root cause:
    //   the X DatePicker's calendar popover uses the theme's default
    //   `background.paper`, which is a translucent rgba(255,255,255,0.65)
    //   (kept translucent on purpose for the frosted-glass cards). The
    //   calendar sitting over dense page content bleeds through and becomes
    //   unreadable. Admin cards don't hit this because they set an opaque
    //   #FFFFFF panel themselves — the pickers don't. Fix once, globally:
    //   give the picker popover an opaque surface + border + shadow. Solid
    //   white keeps the existing dark-text calendar perfectly legible.
    MuiPickersPopper: {
      styleOverrides: {
        paper: {
          // Booking-flow date pickers still render on light pages this round,
          // so keep an opaque white calendar with dark text (brand.text is now
          // Ivory — would vanish on white, so hardcode dark ink here).
          backgroundColor: "#FFFFFF",
          backgroundImage: "none",
          color: "#2A1B14",
          border: "1px solid rgba(31,41,51,0.12)",
          borderRadius: 16,
          boxShadow: "0 14px 44px rgba(15,23,42,0.20)",
        },
      },
    },
  },
});

export default theme;
