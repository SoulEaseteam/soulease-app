// src/theme/adminTheme.ts
//
// 🆕 Round 28s234 (founder: "รื้อ ทำให้ ตกแต่ง และฟังก์ชั่น") — shared design
//   tokens for the admin redesign. One dark, night-ops palette used across
//   AdminLayout + every /admin/* page so the whole back office reads as one
//   coherent product instead of a plain-MUI CRUD screen.
//
// 🆕 Round 28s235 (founder: shared an "Ocean Study" Pinterest palette,
//   "ใช้ธีมนี้" — admin only, customer-facing site keeps its own brand red)
//   — swapped the accent from crimson/champagne to this navy/sky-blue set:
//     #A7D8F0 sky · #4E7E8C teal-blue · #DCEFF5 ice · #5C6F7B slate ·
//     #1F2933 navy-black. Token NAMES changed (crimson→accent,
//   crimsonDeep→accentDeep, champagne→highlight) so the code doesn't lie
//   about what color it holds — grep `adminColor\.(accent|highlight)` to
//   find every themed spot.
//
// 🆕 Round 28s237 (founder: "พื้นหลัง/pane ไม่ตรง") — `bg` was a
//   further-darkened invention (#12181D) that doesn't appear anywhere in
//   the 5-swatch reference, so large surfaces read as near-black instead of
//   the rich navy in the picture. Fixed: `bg` is now the EXACT #1F2933
//   swatch. Elevated surfaces (panel/panel2/panel3) are legitimate lighter
//   BLENDS interpolated between the palette's own two darkest swatches
//   (#1F2933 → #5C6F7B) — not invented hues — so every visible surface in
//   admin traces back to one of the 5 official hex values (or a blend
//   strictly between two of them).
//
//   Direction: dark, premium, legible at 2am on a phone. Semantic colors
//   (green/blue/amber/red for dispatch/session state) stay separate from
//   the brand accent per design guidance — kept as-is, they already read
//   distinctly from the new blue accent.

export const adminColor = {
  /** Page background — the EXACT darkest swatch from the reference. */
  bg: "#1F2933",
  panel: "#26323C",   // ~25% blend toward #5C6F7B
  panel2: "#2F3D48",  // ~45% blend toward #5C6F7B
  panel3: "#3A4A56",  // ~65% blend toward #5C6F7B
  line: "rgba(167,216,240,0.09)",
  line2: "rgba(167,216,240,0.16)",

  text: "#DCEFF5",
  muted: "#93A4AE",
  dim: "#5C6F7B",

  /** Primary accent — was crimson, now Ocean Study's muted teal-blue. */
  accent: "#4E7E8C",
  accentDeep: "#3D6470",
  /** Sparingly-used highlight for labels/numbers — was champagne. */
  highlight: "#A7D8F0",

  // Semantic (separate from the accent hue — unchanged from Control Room)
  green: "#37D67A",
  greenDeep: "#052012",
  blue: "#5B8DEF",
  blueDeep: "#04122e",
  amber: "#F5A623",
  red: "#FF5B6E",
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
