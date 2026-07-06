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
//     #1F2933 navy-black. Base panel/bg tones rebuilt as navy shades (was
//   purple-black) so the whole admin reads as one deliberate blue study, not
//   a red theme with a blue patch. Token NAMES changed (crimson→accent,
//   crimsonDeep→accentDeep, champagne→highlight) so the code doesn't lie
//   about what color it holds — grep `adminColor\.(accent|highlight)` to
//   find every themed spot.
//
//   Direction: dark, premium, legible at 2am on a phone. Semantic colors
//   (green/blue/amber/red for dispatch/session state) stay separate from
//   the brand accent per design guidance — kept as-is, they already read
//   distinctly from the new blue accent.

export const adminColor = {
  bg: "#12181D",
  bg2: "#151C22",
  panel: "#1F2933",
  panel2: "#26313C",
  panel3: "#2E3A46",
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
