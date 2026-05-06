// src/hooks/useTweenedNumber.ts
//
// 🆕 Round 28r10 (founder 2026-05-06) — Extracted from BookingFlowPage
//   as part of the file-split refactor ("BookingFlowPage แยก หรือ
//   แบ่งไฟล์ เพื่อลดการทำงานหนัก ง่ายต่อการหา และแก้ไข").
//
// Smoothly animates a numeric prop from its previous rendered value
// to a new target over `durationMs` using ease-out cubic. Used by the
// booking flow's price summary + sticky ConfirmBar so prices visually
// "tick" instead of jumping when add-ons / duration changes ripple
// through the totals.
//
// Honors `prefers-reduced-motion` — when the user has motion reduced
// the value snaps directly to the target.

import { useEffect, useRef, useState } from "react";

export function useTweenedNumber(target: number, durationMs = 380): number {
  const [display, setDisplay] = useState(target);
  const displayRef = useRef(target);
  // Keep displayRef in sync with the latest rendered display value so
  // each new tween starts from where the previous one stopped.
  displayRef.current = display;
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const from = displayRef.current;
    if (target === from || !Number.isFinite(target) || !Number.isFinite(from)) {
      setDisplay(target);
      return;
    }
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setDisplay(target);
      return;
    }
    const startTime = performance.now();
    const tick = () => {
      const elapsed = performance.now() - startTime;
      const t = Math.min(1, elapsed / durationMs);
      // ease-out cubic: 1 - (1-t)^3 — fast start, gentle landing
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(from + (target - from) * eased);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [target, durationMs]);

  return display;
}

export default useTweenedNumber;
