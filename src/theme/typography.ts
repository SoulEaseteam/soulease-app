// src/theme/typography.ts
//
// 🆕 Round 28r52 — Phase 3.1 Responsive Foundation
//
// Responsive typography scale — mobile-first, bumps up on larger
// viewports. Spread into `Typography` or `Box` `sx` where a heading
// or body element needs to scale with viewport.
//
// Guidance only — do NOT sweep every fontSize in every component this
// round. Phase 3.2–3.6 handles individual page redesigns. This file
// lives here so new work + the MainLayout / TopNav responsive shell
// can start using it immediately without touching prior rounds' pixel
// literals.
//
// The same tokens are re-exported from `@/theme/breakpoints` for
// backward compatibility with in-flight code from earlier in this
// session; either import path resolves to the same object.

export const responsiveType = {
  /** Body text — 14/15/16 px */
  body: {
    fontSize: { xs: 14, sm: 15, md: 16 },
    lineHeight: 1.5,
  },
  /** Small caption / metadata — 12/13/14 px */
  caption: {
    fontSize: { xs: 12, sm: 13, md: 14 },
    lineHeight: 1.4,
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
  /** Small heading — Phase 3.1 spec `small` alias — 18/20/22 px */
  small: {
    fontSize: { xs: 18, sm: 20, md: 22 },
    lineHeight: 1.3,
  },
  /** Section heading (h3) — 20/24/28 px */
  h4: {
    fontSize: { xs: 20, sm: 24, md: 28 },
    lineHeight: 1.25,
  },
  /** Section heading alias — 20/24/28 px */
  section: {
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
  /** Hero display alias — 24/32/40 px */
  hero: {
    fontSize: { xs: 24, sm: 32, md: 40 },
    lineHeight: 1.15,
  },
  /** Extra-large display — 28/40/56 px */
  display: {
    fontSize: { xs: 28, sm: 40, md: 56 },
    lineHeight: 1.05,
  },
} as const;

export type ResponsiveTypeKey = keyof typeof responsiveType;
