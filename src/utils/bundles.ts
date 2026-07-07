// src/utils/bundles.ts
//
// 🆕 Round 28r50 (founder 2026-07-08 — Promotions Phase 1, all 4 features
// "ทำทั้งหมด") — Bundle Packages.
//
// MVP scope: bundles are prepaid multi-session discounts (e.g. buy 3
// sessions get 10% off). NOT a full session-credit tracking system —
// the customer surface + BookingFlow wiring is Phase 2. This file only
// holds the shared type + a module-level cache the admin UI reads and
// the customer surface will read once wired. Empty by default so nothing
// on the live site changes until admin adds one via /admin/promotions.
//
// Same live-binding pattern as taxiFare.ts / discount.ts / servicePricing.ts
// — a single doc (`adminSettings/publicRules.bundles`, already admin-write
// + public-read, so NO firestore.rules change) drives every render. See
// MaintenanceGate.tsx for the wiring.

import type { MassageService } from "@/data/services";

export interface Bundle {
  /** Stable id, e.g. "SR-BUNDLE-<base36>". Used as the Firestore map key. */
  id: string;
  /** Display name shown to guests + admin, e.g. "Weekly Ritual · 3 sessions". */
  name: string;
  /** How many prepaid sessions this bundle covers. */
  sessionCount: number;
  /** Whole-number percent discount off the per-session list price. */
  discountPct: number;
  /** Which service the bundle applies to. null / undefined = any service. */
  serviceId?: string | null;
  /** Admin-visible on/off gate. Disabled bundles never surface publicly. */
  enabled: boolean;
  /** Optional expiry (epoch ms). Past this → treated as disabled. */
  expiresAt?: number | null;
  /** Optional short sub-label for display. */
  label?: string;
  createdAt?: number;
}

// Module-level cache populated by MaintenanceGate on every publicRules
// snapshot. Empty = no bundles configured, byte-identical to pre-r50 (no
// bundle surface anywhere).
let liveBundles: Record<string, Bundle> = {};

/** Push the latest bundles map in from MaintenanceGate. Missing/malformed
 *  entries are dropped silently so a hand-edited Firestore doc can't
 *  crash the customer bundle listing. */
export function applyLiveBundles(map: Record<string, Bundle> | null | undefined): void {
  const clean: Record<string, Bundle> = {};
  if (map) {
    for (const [id, b] of Object.entries(map)) {
      if (!b || typeof b !== "object") continue;
      if (typeof b.sessionCount !== "number" || b.sessionCount < 1) continue;
      if (typeof b.discountPct !== "number" || b.discountPct < 0) continue;
      clean[id] = {
        id,
        name: b.name ?? id,
        sessionCount: Math.round(b.sessionCount),
        discountPct: Math.max(0, Math.min(100, b.discountPct)),
        serviceId: b.serviceId ?? null,
        enabled: b.enabled !== false,
        expiresAt: b.expiresAt ?? null,
        label: b.label,
        createdAt: b.createdAt,
      };
    }
  }
  liveBundles = clean;
}

/** All bundles (enabled + disabled + expired). Admin UI reads this. */
export function getAllBundles(): Bundle[] {
  return Object.values(liveBundles);
}

/**
 * Bundles that are currently redeemable (enabled AND not expired).
 * Optional `serviceId` filter — a service-scoped bundle only returns when
 * asked about that service, or when `serviceId` is undefined ("any").
 * Empty by default; Phase 2 wires this to the homepage / BookingFlow.
 */
export function getActiveBundles(serviceId?: string | null): Bundle[] {
  const now = Date.now();
  return Object.values(liveBundles).filter((b) => {
    if (!b.enabled) return false;
    if (b.expiresAt && b.expiresAt < now) return false;
    if (serviceId === undefined) return true;
    if (!b.serviceId) return true; // "any-service" bundle
    return b.serviceId === serviceId;
  });
}

/**
 * Compute the savings preview shown in the admin UI (and reusable by
 * Phase 2 customer surfaces). Pure — pass the per-session baseline price
 * for the target duration.
 */
export function bundleSavings(bundle: Pick<Bundle, "sessionCount" | "discountPct">, perSessionPrice: number): {
  gross: number;
  discountAmt: number;
  net: number;
} {
  const gross = Math.max(0, Math.round(perSessionPrice * bundle.sessionCount));
  const discountAmt = Math.round(gross * (bundle.discountPct / 100));
  const net = Math.max(0, gross - discountAmt);
  return { gross, discountAmt, net };
}

/** Convenience for admin previews: build a savings preview for a specific
 *  service + 60-min baseline (adapters can pass any duration). */
export function bundleSavingsForService(
  bundle: Pick<Bundle, "sessionCount" | "discountPct">,
  service: Pick<MassageService, "price">,
): { gross: number; discountAmt: number; net: number } {
  return bundleSavings(bundle, service.price);
}
