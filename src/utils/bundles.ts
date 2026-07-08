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
//
// 🆕 Round 28r58 (Phase 2 customer surface) — added `bundleSavingsPreview`
//   helper: computes the "3 × 60min = ฿A → ฿B" copy shown on BundleSection
//   cards. Delegates to `priceForDuration` (single source of truth for
//   pricing across every surface) so an admin price edit — or a scheduled
//   price change — reflects on bundle previews without any extra wiring.
//
// 🆕 Round 28r60 (founder — "Bundle UI polish · photo + category tags")
//   — added three OPTIONAL presentation fields (`imageUrl`, `categoryTag`,
//   `subtitle`). Default-empty state is byte-identical to r58 — a bundle
//   without any of these renders exactly as before. `imageUrl` points at a
//   Firebase Storage object under `bundles/{bundleId}/…jpg` (uploaded via
//   the admin editor with the same `downscaleImage` pipeline the therapist
//   avatar uses). `categoryTag` is a free-form label the admin can pick
//   from `BUNDLE_CATEGORY_TAGS` (Autocomplete freeSolo) or type themselves.
//   `subtitle` is a short descriptor line ("3 sessions over 30 days").

import type { MassageService } from "@/data/services";
import { priceForDuration } from "@/utils/servicePricing";

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
  // 🆕 Round 28r60 — optional presentation fields (Bundle UI polish).
  /** Firebase Storage URL for a hero image shown on the customer card. */
  imageUrl?: string;
  /** Free-form category tag, e.g. "Weekly Ritual" / "Premium" / "First-Time".
   *  Suggested values in BUNDLE_CATEGORY_TAGS; admin can type custom. */
  categoryTag?: string;
  /** Short descriptor shown under the name, e.g. "3 sessions over 30 days". */
  subtitle?: string;
}

/** Suggested category tags for the admin Autocomplete (freeSolo — the
 *  admin can also type a custom tag). Kept lean; extend as marketing needs
 *  emerge. Used by AdminPromotionsPage + BundleSection color mapping. */
export const BUNDLE_CATEGORY_TAGS: string[] = [
  "Weekly Ritual",     // 3-4 sessions in a month
  "Wellness Package",  // 5-8 sessions
  "Premium",           // High-tier services (Gentleman, B2B)
  "First-Time",        // Discovery / trial
  "Long-Stay",         // For extended-stay guests
  "Corporate Retreat", // Multi-guest / event
];

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
        // 🆕 Round 28r60 — presentation fields (undefined-safe).
        imageUrl: typeof b.imageUrl === "string" && b.imageUrl.trim() ? b.imageUrl : undefined,
        categoryTag: typeof b.categoryTag === "string" && b.categoryTag.trim() ? b.categoryTag : undefined,
        subtitle: typeof b.subtitle === "string" && b.subtitle.trim() ? b.subtitle : undefined,
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

/**
 * 🆕 Round 28r58 — customer-surface savings preview: picks a concrete
 * service (either the bundle's own `serviceId`, or the CHEAPEST 60-min
 * service in the passed catalog when the bundle is "any service"), then
 * returns the display fields the BundleSection card renders directly.
 *
 * Pricing is resolved via `priceForDuration` — the same funnel every
 * customer surface uses — so admin price overrides / scheduled prices
 * flow through automatically. Returns null when no service data is
 * available (empty catalog), so the caller can safely fall back to a
 * label-only card.
 *
 * NOTE: this is display-only. The final price a guest actually pays is
 * agreed with concierge (this MVP has no online checkout for bundles).
 */
export function bundleSavingsPreview(
  bundle: Pick<Bundle, "sessionCount" | "discountPct" | "serviceId">,
  services: MassageService[],
): {
  serviceName: string;
  singleSessionPrice: number;
  totalWithoutBundle: number;
  totalWithBundle: number;
  savings: number;
} | null {
  if (!services || services.length === 0) return null;

  // Resolve which service the preview is priced against:
  //   • bundle.serviceId set    → find it in the catalog (falls back to
  //     the cheapest 60m if the target service isn't in the passed catalog)
  //   • bundle.serviceId null   → cheapest 60m (best "starts from" anchor)
  let target: MassageService | undefined;
  if (bundle.serviceId) {
    target = services.find((s) => s.id === bundle.serviceId);
  }
  if (!target) {
    // Pick the cheapest 60-min price via the SAME source of truth.
    let cheapest = services[0];
    let cheapestPrice = priceForDuration(cheapest, 60);
    for (const s of services) {
      const p = priceForDuration(s, 60);
      if (p < cheapestPrice) {
        cheapest = s;
        cheapestPrice = p;
      }
    }
    target = cheapest;
  }
  if (!target) return null;

  const singleSessionPrice = priceForDuration(target, 60);
  const { gross, discountAmt, net } = bundleSavings(bundle, singleSessionPrice);

  return {
    serviceName: target.name,
    singleSessionPrice,
    totalWithoutBundle: gross,
    totalWithBundle: net,
    savings: discountAmt,
  };
}
