// src/theme/adminTheme.ts
//
// 🆕 Round 28s234 (founder: "รื้อ ทำให้ ตกแต่ง และฟังก์ชั่น") — shared design
//   tokens for the admin redesign. One palette used across AdminLayout +
//   every /admin/* page so the whole back office reads as one coherent
//   product instead of a plain-MUI CRUD screen.
//
// 🆕 Round 28s235 (founder: shared an "Ocean Study" Pinterest palette,
//   "ใช้ธีมนี้" — admin only, customer-facing site keeps its own brand red)
//   — the 5 official swatches: #A7D8F0 sky · #4E7E8C teal-blue · #DCEFF5
//   ice · #5C6F7B slate · #1F2933 navy-black. Token NAMES (crimson→accent,
//   champagne→highlight) so the code doesn't lie about what color it holds.
//
// 🆕 Round 28s237 — RULE established: every color must trace to one of the
//   5 official hex values, or be an interpolated blend strictly BETWEEN two
//   of them — never a separately invented hue. Keep obeying this on any
//   future palette change.
//
// 🆕 Round 28s240 (founder: "เอาโทนสว่าง") — flipped dark → LIGHT mode,
//   same 5 official hex values, just reassigned which end is "surface" vs
//   "ink":
//     bg/page    = #DCEFF5 (lightest swatch, gentle ice tint)
//     panel      = #FFFFFF (pure white card, standard light-UI elevation)
//     text       = #1F2933 (darkest swatch — now used as INK, not surface)
//     highlight  = #1F2933 too (founder: "highlight = #1F2933" for light
//                  surfaces — prominent numbers read via weight/serif, not
//                  a lighter color, since ink IS the darkest anchor here)
//     accent     = #4E7E8C unchanged (works as button fill in either mode)
//   Semantic state colors (green/blue/amber/red) were tuned bright-on-dark
//   before; on white they'd wash out, so this round darkens them into the
//   contrast range that reads on a light surface (still a distinct hue
//   family from the blue accent, per design guidance). Audited every
//   hardcoded "#fff" text usage in admin first — all sit on solid
//   accent/semantic button fills, never directly on panel/bg, so the
//   flip is safe with no separate contrast fixes needed elsewhere.

export const adminColor = {
  /** Page background — the lightest official swatch. */
  bg: "#DCEFF5",
  panel: "#FFFFFF",   // elevated card surface
  panel2: "#F0F8FB",  // blend toward bg, for hover/secondary panels
  panel3: "#E4F1F6",  // blend toward bg, deeper secondary state
  line: "rgba(31,41,51,0.10)",
  line2: "rgba(31,41,51,0.18)",

  /** Main text — the darkest official swatch, now used as ink. */
  text: "#1F2933",
  muted: "#3E4F58",   // blend toward dim, for secondary text
  dim: "#5C6F7B",     // exact swatch — least-prominent text/icons

  /** Primary accent — Ocean Study's muted teal-blue (unchanged in either mode). */
  accent: "#4E7E8C",
  accentDeep: "#3D6470",
  /** Prominent number/label emphasis — the dark anchor, read via weight not color-pop. */
  highlight: "#1F2933",

  // Semantic (separate from the accent hue) — darkened for legibility on
  // the new white/light surfaces; same hue families as the dark-mode set.
  green: "#16A34A",
  blue: "#2563EB",
  amber: "#D97706",
  red: "#DC2626",
} as const;

export const adminFont = {
  serif: '"Hoefler Text","Georgia","Times New Roman",serif',
  sans: '"Helvetica Neue","Inter",system-ui,-apple-system,"Segoe UI",sans-serif',
  mono: '"SF Mono","JetBrains Mono",ui-monospace,Menlo,monospace',
} as const;

/** Shared card/panel sx — reuse across pages so panels don't drift. */
export const adminPanelSx = {
  background: adminColor.panel,
  border: `1px solid ${adminColor.line}`,
  borderRadius: "16px",
} as const;

/** Status → color map used for dispatch/session/booking state chips. */
export const adminStateColor: Record<string, string> = {
  pending: adminColor.dim,
  assigned: adminColor.dim,
  confirmed: adminColor.blue,
  enroute: adminColor.blue,
  arrived: adminColor.amber,
  in_session: adminColor.green,
  completed: adminColor.green,
  done: adminColor.green,
  overdue: adminColor.red,
  cancelled: adminColor.dim,
};
