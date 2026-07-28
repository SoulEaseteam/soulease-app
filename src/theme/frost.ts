// ─────────────────────────────────────────────────────────────────────
// 🧊 frost — glassmorphism surface recipes (founder direction 2026-07-28)
//
// "การ์ดโปร่งแสงเบลอหลัง · ขอบเส้นบางสีขาว · เส้นคั่นบางๆ ·
//  ตัวหนังสือขาวน้ำหนักบาง · หัวข้อเซริฟ ·
//  ปุ่ม/ชิปที่เลือกเป็นสีขาวทึบตัดกับกระจก ·
//  หน้าจองใช้รูปเต็มจอไล่เงาลงมาต่อกับชีตกระจก"
//
// Every value here reads a `--sr-glass-*` / `--sr-solid-*` CSS variable
// declared in index.css, so a surface built from these recipes flips
// automatically when DayNightSync toggles `html.sr-day`. Hardcode an
// rgba() in a component instead and that component silently stops
// flipping — which is exactly how the old `glass` export in theme.ts
// ended up light-mode-only.
//
// ⚠️ This is NOT the same thing as `glass` in theme.ts. That one is a
// fixed white-on-light recipe (still used by TherapistSearchBar) and is
// left alone deliberately. New surfaces should use `frost`.
//
// Usage: `sx={{ ...frost.card, p: 2 }}`
// ─────────────────────────────────────────────────────────────────────

import { fonts } from "@/theme/theme";

/** Shared blur pair — Safari still needs the -webkit- prefix. */
const blur = {
  backdropFilter: "var(--sr-glass-blur)",
  WebkitBackdropFilter: "var(--sr-glass-blur)",
} as const;

const blurStrong = {
  backdropFilter: "var(--sr-glass-blur-strong)",
  WebkitBackdropFilter: "var(--sr-glass-blur-strong)",
} as const;

export const frost = {
  // ── Surfaces ──────────────────────────────────────────────────────
  /** Standard translucent card — thin white edge + lit top sheen. */
  card: {
    ...blur,
    background: "var(--sr-glass)",
    border: "1px solid var(--sr-glass-border)",
    borderRadius: "22px",
    boxShadow: "var(--sr-glass-shadow), var(--sr-glass-sheen)",
  },

  /** Nested / hovered surface — sits *on* a card, so no outer shadow. */
  cardRaised: {
    ...blur,
    background: "var(--sr-glass-raised)",
    border: "1px solid var(--sr-glass-border-soft)",
    borderRadius: "18px",
    boxShadow: "var(--sr-glass-sheen)",
  },

  /** Recessed well — search fields, inputs, anything that takes entry. */
  well: {
    background: "var(--sr-glass-sunken)",
    border: "1px solid var(--sr-glass-border-soft)",
    borderRadius: "14px",
  },

  /** Pill / floating nav — same glass, fully rounded. */
  pill: {
    ...blur,
    background: "var(--sr-glass)",
    border: "1px solid var(--sr-glass-border)",
    borderRadius: "999px",
    boxShadow: "var(--sr-glass-shadow), var(--sr-glass-sheen)",
  },

  /**
   * Bottom sheet that continues a full-bleed hero photo.
   * Rounded on top only — the photo's scrim runs into its top edge so
   * the seam reads as one continuous surface rather than two panels.
   */
  sheet: {
    ...blurStrong,
    background: "var(--sr-sheet-fill)",
    borderTop: "1px solid var(--sr-glass-border)",
    borderRadius: "28px 28px 0 0",
    boxShadow: "var(--sr-glass-sheen)",
  },

  // ── Lines ─────────────────────────────────────────────────────────
  /** Hairline divider inside a glass card. */
  divider: {
    height: "1px",
    border: 0,
    background: "var(--sr-glass-line)",
  },

  // ── Chips / buttons ───────────────────────────────────────────────
  /** Unselected chip — reads as part of the glass. */
  chip: {
    ...blur,
    background: "var(--sr-glass)",
    border: "1px solid var(--sr-glass-border)",
    borderRadius: "999px",
    color: "var(--sr-glass-body)",
    fontFamily: fonts.body,
    fontWeight: 400,
    boxShadow: "var(--sr-glass-sheen)",
  },

  /**
   * Selected chip — solid, no blur, no transparency. The whole point is
   * that it stops being glass so the choice is unmistakable.
   * `--sr-solid` flips ink↔white by mode; see index.css.
   */
  chipSelected: {
    background: "var(--sr-solid)",
    border: "1px solid var(--sr-solid)",
    borderRadius: "999px",
    color: "var(--sr-solid-ink)",
    fontFamily: fonts.body,
    fontWeight: 500,
    boxShadow: "var(--sr-solid-shadow)",
  },

  // ── Hero photo stack (booking surface) ────────────────────────────
  /** Full-bleed photo layer — pin behind the scrim. */
  heroPhoto: {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
  },

  /**
   * Gradient that fades the photo down into the sheet. Transparent at
   * the top so the image stays clean, opaque at the bottom so the
   * sheet's top edge has nothing to fight for contrast.
   */
  heroScrim: {
    position: "absolute",
    inset: 0,
    background: "var(--sr-sheet-scrim)",
    pointerEvents: "none",
  },

  // ── Type ──────────────────────────────────────────────────────────
  text: {
    /** Serif heading on glass. */
    heading: {
      fontFamily: fonts.heading,
      fontWeight: 400,
      color: "var(--sr-glass-ink)",
      letterSpacing: "0.01em",
    },
    /** Body — deliberately light weight per founder direction. */
    body: {
      fontFamily: fonts.body,
      fontWeight: 300,
      color: "var(--sr-glass-body)",
    },
    muted: {
      fontFamily: fonts.body,
      fontWeight: 300,
      color: "var(--sr-glass-muted)",
    },
    /** Small-caps eyebrow above a serif heading. */
    eyebrow: {
      fontFamily: fonts.body,
      fontWeight: 400,
      fontSize: "0.6875rem",
      letterSpacing: "0.18em",
      textTransform: "uppercase",
      color: "var(--sr-glass-muted)",
    },
  },
} as const;

export default frost;
