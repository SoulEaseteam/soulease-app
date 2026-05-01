// src/utils/servicePricing.ts
//
// 💰 Single source of truth for service pricing across all durations.
//
// Pricing model — confirmed with founder 2026-05-01:
//   60 min  =  base × 1.0   (canonical price in src/data/services.ts)
//   90 min  =  base × 1.5
//   120 min =  base × 2.0
//
// Why a multiplier (not stored prices)? services.ts stays compact —
// one row per service — and price changes propagate everywhere with a
// single edit. If a future service needs a non-linear curve, override
// it via DURATION_PRICE_OVERRIDES below (keeps the simple case simple).
//
// All prices in THB (฿).

import type { MassageService } from "@/data/services";

/** Multiplier applied to a service's base 60-min price for each tier. */
export const DURATION_MULTIPLIERS: Record<number, number> = {
  60: 1.0,
  90: 1.5,
  120: 2.0,
};

/**
 * Per-service per-duration price overrides. Use when a service should NOT
 * follow the standard multiplier. Falls back to multiplier if absent.
 *
 * @example
 *   DURATION_PRICE_OVERRIDES["sunred-signature"] = { 90: 4500 };
 */
export const DURATION_PRICE_OVERRIDES: Record<
  string,
  Partial<Record<number, number>>
> = {};

/**
 * Default duration tiers offered when a service does not declare its own
 * `availableDurations`. Keep this synced with DURATION_MULTIPLIERS keys.
 */
export const DEFAULT_DURATIONS: number[] = [60, 90, 120];

/**
 * Compute the price (THB) for a given service at a target duration.
 *
 * Resolution order:
 *   1. Per-service override   (DURATION_PRICE_OVERRIDES)
 *   2. Multiplier × base      (DURATION_MULTIPLIERS)
 *   3. Linear scale fallback  (targetMin / 60 × base) — for unknown durations
 */
export function priceForDuration(
  service: Pick<MassageService, "id" | "price">,
  durationMin: number
): number {
  const override = DURATION_PRICE_OVERRIDES[service.id]?.[durationMin];
  if (override != null) return override;

  const multiplier = DURATION_MULTIPLIERS[durationMin];
  if (multiplier != null) return Math.round(service.price * multiplier);

  // Unknown duration → linear scale, round to nearest 100฿
  const raw = service.price * (durationMin / 60);
  return Math.round(raw / 100) * 100;
}

/**
 * Returns the duration tiers offered by this service, in ascending order.
 * Falls back to DEFAULT_DURATIONS when the service hasn't declared its own.
 */
export function durationsFor(service: MassageService): number[] {
  const list = service.availableDurations ?? DEFAULT_DURATIONS;
  return [...list].sort((a, b) => a - b);
}

/**
 * The starting (cheapest) price shown on browse/preview cards.
 * Equivalent to `priceForDuration(service, durationsFor(service)[0])`.
 */
export function startingPrice(service: MassageService): number {
  const durations = durationsFor(service);
  return priceForDuration(service, durations[0]);
}

/**
 * Format a THB price with the brand currency glyph + thousands separator.
 *
 * @example
 *   formatTHB(1200) === "฿1,200"
 */
export function formatTHB(amount: number): string {
  return `฿${amount.toLocaleString()}`;
}
