// src/utils/conciergeMode.ts
//
// 🆕 Round 28r4 (founder 2026-05-06) — Time-aware concierge mode.
//
// SunRed's prime time is 22:00–04:00 (per CLAUDE.md). The home page
// should NOT read the same at 11am as it does at 11pm — a guest
// landing at 23:30 needs to feel "yes, this is our hour", while a
// guest landing at 06:00 needs to know we're warming up rather than
// being met with the prime-hours pitch.
//
// This helper centralises the four concierge-mode windows so the
// Hero pill, Tonight Special banner, Therapist Grid header, etc.
// all draw from the same source of truth and never disagree.

import { useEffect, useState } from "react";
import { nowBKK } from "@/utils/time";

/** Four operational windows in Bangkok time. */
export type ConciergeMode = "off" | "day" | "evening" | "prime";

/** A single rotating promo card (title + sub). */
export interface ConciergeMessage {
  title: string;
  sub: string;
}

/** Display payload — every consumer takes what it needs. */
export interface ConciergeModeInfo {
  mode: ConciergeMode;
  /** Bangkok hour 0..23 (numeric, for fine-grained custom logic). */
  hourBKK: number;
  /** Live pill text — short, ≤ 3 words after "Live · BKK". */
  pillLabel: string;
  /** Tonight Special banner eyebrow, e.g. "PRIME HOURS". */
  promoEyebrow: string;
  /**
   * 🆕 Round 28r5 (founder 2026-05-06) — Rotating promo deck.
   *   Each mode now ships 2–3 messages so the banner re-baits the eye
   *   every few seconds without the page feeling repetitive. Consumers
   *   cycle these via setInterval; first item is the strongest hook
   *   so the page reads correctly even before the first rotation.
   */
  promoMessages: ConciergeMessage[];
  /** Therapist grid header phrase, e.g. "On standby · Bangkok Tonight". */
  gridHeadline: string;
  /** Should the prime crescent moon glyph render anywhere? */
  isPrime: boolean;
  /**
   * 🆕 Round 28r5 — banner background gradient. Each mode gets its
   * own sunset-spectrum tint so 23:00 deep-night and 11:00 daylight
   * read as different visual moments, not the same red-coral banner
   * with different copy.
   */
  bannerGradient: string;
  /** Outer drop-shadow tint matched to the banner gradient. */
  bannerGlow: string;
}

// ─────────────────────────────────────────────────────────────────────
// 🆕 Round 28r5 — Mode-specific banner gradients. Each one references
//   the brand red→coral spectrum but tilts the temperature so the
//   banner LOOKS different at 23:00 vs 11:00:
//     • prime    → midnight burgundy → brand red → coral (deep, after-dark)
//     • evening  → golden amber → coral → red (sunset)
//     • day      → coral → warm gold → cream peach (bright daylight)
//     • off      → slate dawn → muted clay (cool, resting)
// ─────────────────────────────────────────────────────────────────────
const GRADIENT_PRIME =
  "#2D2D2B";
const GRADIENT_EVENING =
  "#2D2D2B";
const GRADIENT_DAY =
  "#2D2D2B";
const GRADIENT_OFF =
  "#475569";

const GLOW_PRIME = "0 10px 28px rgba(132, 24, 67, 0.42)";
const GLOW_EVENING = "0 10px 28px rgba(245, 158, 11, 0.36)";
const GLOW_DAY = "0 10px 28px rgba(214, 40, 40, 0.28)";
const GLOW_OFF = "0 10px 28px rgba(71, 85, 105, 0.24)";

/**
 * Pure function — given a Bangkok hour, return the mode payload.
 * Exported separately so tests can pin specific times without touching
 * the live clock.
 */
export function modeForHourBKK(hour: number): ConciergeModeInfo {
  // 22:00–03:59 → prime (SunRed's actual headline window)
  if (hour >= 22 || hour < 4) {
    return {
      mode: "prime",
      hourBKK: hour,
      pillLabel: "Prime hours",
      promoEyebrow: "Tonight · Prime Hours",
      promoMessages: [
        {
          title: "Concierge live · slots filling fast",
          sub: "Tap to chat — practitioner dispatched in <40 min",
        },
        {
          title: "Tonight's window is the most-requested",
          sub: "Late-night specialists on standby · Sukhumvit & Silom",
        },
        {
          title: "Skip the wait — concierge replies in <2 min",
          sub: "Tap once · we'll confirm before you finish your drink",
        },
      ],
      gridHeadline: "On standby · Bangkok Tonight",
      isPrime: true,
      bannerGradient: GRADIENT_PRIME,
      bannerGlow: GLOW_PRIME,
    };
  }

  // 04:00–08:59 → off-hours (concierge resumes at 09:00)
  if (hour >= 4 && hour < 9) {
    return {
      mode: "off",
      hourBKK: hour,
      pillLabel: "Concierge · 09:00",
      promoEyebrow: "Pre-Booking",
      promoMessages: [
        {
          title: "Concierge resumes at 09:00",
          sub: "Tap to leave a message — we'll confirm at sunrise",
        },
        {
          title: "Pre-book tonight's window now",
          sub: "Tap once · skip the prime-hours rush after 22:00",
        },
      ],
      gridHeadline: "Concierge resumes 09:00",
      isPrime: false,
      bannerGradient: GRADIENT_OFF,
      bannerGlow: GLOW_OFF,
    };
  }

  // 17:00–21:59 → evening (warming up)
  if (hour >= 17 && hour < 22) {
    return {
      mode: "evening",
      hourBKK: hour,
      pillLabel: "Tonight opening",
      promoEyebrow: "Tonight · Booking Window",
      promoMessages: [
        {
          title: "Slots opening for late-night",
          sub: "Tap to lock a 22:00 — 02:00 window with the concierge",
        },
        {
          title: "Tonight's roster is being set",
          sub: "Tap once · pick your specialist before the prime rush",
        },
        {
          title: "Reserve before 21:00 · keep your top pick",
          sub: "Concierge live now — tap to chat in your language",
        },
      ],
      gridHeadline: "Tonight's standby · Bangkok",
      isPrime: false,
      bannerGradient: GRADIENT_EVENING,
      bannerGlow: GLOW_EVENING,
    };
  }

  // 09:00–16:59 → day rates / planning ahead
  return {
    mode: "day",
    hourBKK: hour,
    pillLabel: "Daytime",
    promoEyebrow: "Daytime · Plan Ahead",
    promoMessages: [
      {
        title: "Book tonight before the prime rush",
        sub: "Tap to chat — 22:00 onward fills fastest",
      },
      {
        title: "Daytime rates · from ฿1,200 / 60 min",
        sub: "Tap once · 30% quieter than late-night windows",
      },
      {
        title: "Plan tonight's ritual now",
        sub: "Concierge live · we'll match a specialist to your hotel",
      },
    ],
    gridHeadline: "Available now · Bangkok",
    isPrime: false,
    bannerGradient: GRADIENT_DAY,
    bannerGlow: GLOW_DAY,
  };
}

/**
 * React hook — returns the current concierge mode, refreshed every
 * 60 seconds so transitions across window boundaries (e.g. 21:59 →
 * 22:00) actually flip the page mood without a manual reload.
 */
export function useConciergeMode(): ConciergeModeInfo {
  const [info, setInfo] = useState<ConciergeModeInfo>(() =>
    modeForHourBKK(nowBKK().hour())
  );

  useEffect(() => {
    const tick = () => setInfo(modeForHourBKK(nowBKK().hour()));
    // Recompute every 60s — granular enough to catch boundary flips
    // (the four windows are hour-aligned) without thrashing renders.
    const id = window.setInterval(tick, 60_000);
    return () => window.clearInterval(id);
  }, []);

  return info;
}
