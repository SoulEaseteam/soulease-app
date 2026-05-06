// src/utils/formatDistanceEta.ts
//
// 🆕 Round 28b33 (founder 2026-05-04) — Single canonical formatter for
//   the "X.X km • N min" line used on therapist cards, the booking
//   confirm page, and any location-aware widget.
//
// Why a dedicated helper
//   • Three different files were doing this inline with subtly
//     different rules (some rounded km, some used `.toFixed(1)`, some
//     omitted the bullet when ETA was missing).
//   • One canonical formatter = one bug-fix surface when the
//     punctuation changes (e.g., switching the bullet to "·" later).
//
// Behavior contract
//   • Both numbers null/undefined → "—" (em-dash placeholder).
//   • Only `km` present     → "1.2 km"
//   • Only `etaMin` present → "4 min"
//   • Both present          → "4 min • 1.2 km"  ← TIME FIRST
//
// Why time-first ordering (Round 28b33 final, founder 2026-05-04)
//   • Customers shopping the home grid scan for "fast" not "near".
//   • A 0.8 km therapist 32 min away (rush hour) is worse than a
//     2.4 km therapist 6 min away — leading with the minute number
//     surfaces the conversion-relevant signal first.
//   • Mirrors Grab/Uber pickup ETAs ("4 min away") which the
//     Bangkok customer already understands.
//
// Edge cases
//   • Negative or zero distances are passed through honestly (caller's
//     job to validate). 0 km → "0.0 km".
//   • Non-finite values fall through as if undefined.
//
// Usage
//   import { formatDistanceEta } from "@/utils/formatDistanceEta";
//   formatDistanceEta(1.2, 4)        // "4 min • 1.2 km"
//   formatDistanceEta(undefined, 7)  // "7 min"

const isUsableNumber = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v);

export function formatDistanceEta(
  km?: number | null,
  etaMin?: number | null
): string {
  const hasKm = isUsableNumber(km);
  const hasEta = isUsableNumber(etaMin);
  if (!hasKm && !hasEta) return "—";

  const kmText = hasKm ? `${km.toFixed(1)} km` : "";
  const etaText = hasEta ? `${Math.round(etaMin)} min` : "";

  // Time-first ordering — see header comment.
  if (kmText && etaText) return `${etaText} • ${kmText}`;
  return etaText || kmText;
}

export default formatDistanceEta;
