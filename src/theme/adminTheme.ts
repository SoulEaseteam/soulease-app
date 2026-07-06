// src/theme/adminTheme.ts
//
// 🆕 Round 28s234 (founder: "รื้อ ทำให้ ตกแต่ง และฟังก์ชั่น") — shared design
//   tokens for the admin "Control Room" redesign. One dark, night-ops palette
//   used across AdminLayout + every /admin/* page so the whole back office
//   reads as one coherent product instead of a plain-MUI CRUD screen.
//
//   Direction: dark, premium, legible at 2am on a phone. Crimson stays the
//   single accent (matches the customer-facing brand); champagne is used
//   sparingly for labels/highlights; semantic状态 colors (green/blue/amber/red)
//   are separate from the brand accent per design guidance.

export const adminColor = {
  bg: "#0D0B11",
  bg2: "#100D15",
  panel: "#17131D",
  panel2: "#1D1826",
  panel3: "#241E2E",
  line: "rgba(255,255,255,0.07)",
  line2: "rgba(255,255,255,0.12)",

  text: "#ECE6E0",
  muted: "#948C85",
  dim: "#6C655F",

  crimson: "#E23A57",
  crimsonDeep: "#C4162E",
  champagne: "#C9A46A",

  // Semantic (separate from the crimson brand accent)
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
