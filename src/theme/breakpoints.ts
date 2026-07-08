// src/theme/breakpoints.ts
//
// 🆕 Round 28r52 — Phase 3.1 Responsive Foundation
//
// Foundation tokens for the customer site's desktop/mobile responsive
// redesign. Founder direction (2026-07-08):
//   "ทำให้รองรับกับการใช้งานทั้งบนคอมและ มือถือ แบบ แอปจริง
//    ไม่ตกร่องตำแหน่งจัดวางไม่เพี้ยน"
//   (make it work on both desktop and mobile like a real app,
//    no layout drift).
//
// Prior state: every customer page hard-coded `maxWidth: 430px` so that
// even a 27" desktop rendered a tiny phone column with vast gray gutters
// on either side. Round 28r52 introduces breakpoint-aware container caps
// via the `responsiveShell` token below.
//
// Breakpoint values are aligned with MUI's defaults so that `sx` props
// can mix these tokens with MUI's own breakpoint keys (`xs`, `sm`, `md`,
// `lg`, `xl`) without confusion. MUI defaults:
//
//   xs: 0        (base — phone)
//   sm: 600      (small tablet / large phone landscape)
//   md: 900      (tablet portrait)
//   lg: 1200     (desktop)
//   xl: 1536     (wide desktop)
//
// Prefer MUI's built-in breakpoint keys in `sx` props for consistency;
// the numeric `bp` object below is exposed for style utilities that need
// raw pixel values (e.g. `@media (min-width: ${bp.tablet}px)`).

/** Numeric breakpoint values (pixel), for CSS `@media` / container queries. */
export const bp = {
  /** Below this width = phone. Matches MUI's `sm` breakpoint. */
  mobile: 600,
  /** Below this width = tablet. Matches MUI's `md` breakpoint. */
  tablet: 900,
  /** Below this width = compact desktop. Matches MUI's `lg` breakpoint. */
  desktop: 1200,
  /** Wide desktop (>= this = xl). Matches MUI's `xl` breakpoint. */
  wide: 1536,
} as const;

/**
 * Container max-widths per surface size.
 *
 * `mobile` keeps the site's original 430px phone-shell feel (customer
 * traffic is dominantly mobile — TG channel, taxi cards, WeChat mini-
 * program all send mobile). `tablet` and `desktop` widen the content
 * column so the site feels app-native on larger viewports instead of
 * a tiny phone column adrift in gray.
 */
export const containerMax = {
  /** < 600px — pure phone shell. Preserves the 28s-era 430px look. */
  mobile: "430px",
  /** 600–900px — small tablet, comfortable phablet reading width. */
  smallTablet: "600px",
  /** 900–1200px — tablet portrait, roomy but not stretched. */
  tablet: "768px",
  /** >= 1200px — desktop, readable content column with left/right air. */
  desktop: "1200px",
} as const;

/**
 * MUI `sx` object — drop-in replacement for the old `maxWidth: 430px`
 * phone-shell cages spread across every customer page. Uses MUI's `xs/
 * sm/md/lg` responsive keys so it scales through every breakpoint:
 *
 *   xs (0-599)     → 430px (phone shell preserved)
 *   sm (600-899)   → 600px (small tablet)
 *   md (900-1199)  → 768px (tablet portrait)
 *   lg (1200+)     → 1200px (desktop wide column)
 *
 * Usage:
 *
 *   import { responsiveShell } from "@/theme/breakpoints";
 *   <Box sx={{ ...responsiveShell, background: "#F4F6F5" }}>
 *
 * The horizontal padding grows with the viewport so content is never
 * flush against a wide-desktop edge. Vertical padding stays with the
 * caller (each page decides its own top/bottom rhythm).
 */
export const responsiveShell = {
  maxWidth: {
    xs: containerMax.mobile,
    sm: containerMax.smallTablet,
    md: containerMax.tablet,
    lg: containerMax.desktop,
  },
  mx: "auto",
  px: { xs: 0, sm: 2, md: 3, lg: 4 },
} as const;

/**
 * Narrower shell variant — for pages that read best in a narrow reading
 * column even on desktop (Payment Methods, Booking Success, Profile
 * forms). Caps at 768px on lg+ instead of 1200px so long lines of text
 * stay comfortable.
 */
export const responsiveShellNarrow = {
  maxWidth: {
    xs: containerMax.mobile,
    sm: containerMax.smallTablet,
    md: containerMax.tablet,
    lg: containerMax.tablet,
  },
  mx: "auto",
  px: { xs: 0, sm: 2, md: 3 },
} as const;

/**
 * Responsive typography scale — mobile-first, bumps up on larger
 * viewports. Spread into `Typography` `sx` or `Box` `sx` where a
 * heading or body element needs to scale with viewport.
 *
 * Guidance only — do NOT do a full sweep of every fontSize in every
 * component this round. Phase 3.6 handles that. This lives here so
 * new work + MainLayout/TopNav can start using it immediately.
 */
export const responsiveType = {
  /** Body text — 14/15/16 px */
  body: {
    fontSize: { xs: 14, sm: 15, md: 16 },
    lineHeight: 1.5,
  },
  /** Small heading (h5/h6) — 16/17/18 px */
  h6: {
    fontSize: { xs: 16, sm: 17, md: 18 },
    lineHeight: 1.35,
  },
  /** Sub heading (h4) — 18/20/22 px */
  h5: {
    fontSize: { xs: 18, sm: 20, md: 22 },
    lineHeight: 1.3,
  },
  /** Section heading (h3) — 20/24/28 px */
  h4: {
    fontSize: { xs: 20, sm: 24, md: 28 },
    lineHeight: 1.25,
  },
  /** Page heading (h2) — 22/28/34 px */
  h3: {
    fontSize: { xs: 22, sm: 28, md: 34 },
    lineHeight: 1.2,
  },
  /** Hero display (h1) — 24/32/40 px */
  h2: {
    fontSize: { xs: 24, sm: 32, md: 40 },
    lineHeight: 1.15,
  },
  /** Extra-large display — 28/40/56 px */
  display: {
    fontSize: { xs: 28, sm: 40, md: 56 },
    lineHeight: 1.05,
  },
} as const;

/**
 * Page background layer — always full-viewport. The content column
 * (`responsiveShell`) is centered INSIDE this. Used by MainLayout so
 * the surface colour reaches every edge on desktop.
 */
export const pageSurface = {
  width: "100%",
  minHeight: "100vh",
} as const;
