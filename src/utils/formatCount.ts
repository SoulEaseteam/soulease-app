// src/utils/formatCount.ts
//
// 🆕 28t.7 (founder 2026-07-12) — bucketed "social proof" count display for
//   the therapist card session counter. Founder direction: exact numbers
//   below 20; from 20 up show a rounded floor + "+", e.g.
//     5 → "5"      · 23 → "20+"   · 38 → "30+"
//     100 → "100+" · 149 → "100+" · 238 → "200+"
//     1150 → "1.1k+" · 2980 → "2.9k+" · 3000 → "3k+"
//   Always rounds DOWN (never overstates the real number).

export function formatSessionCount(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "0";
  const v = Math.floor(n);
  if (v < 20) return String(v);              // exact below 20
  if (v < 100) return `${Math.floor(v / 10) * 10}+`;   // 20+ 30+ … 90+
  if (v < 1000) return `${Math.floor(v / 50) * 50}+`;  // 100+ 150+ 200+ …
  // thousands → one-decimal "k", floored to the nearest 100 (0.1k)
  const kInt = Math.floor(v / 100); // 2980 → 29
  const whole = Math.floor(kInt / 10); // 2
  const dec = kInt % 10; // 9
  return dec === 0 ? `${whole}k+` : `${whole}.${dec}k+`;
}
