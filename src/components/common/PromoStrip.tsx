// src/components/common/PromoStrip.tsx
//
// 🆕 Round 28r51 (founder 2026-07-08) — Phase 2 promo surface:
// slim horizontal strip that rotates through active promo codes +
// bundle packages. Reads live data via `useActivePromos()`. Copy-to-
// clipboard for codes, tap-to-navigate for bundles (Phase 3 will wire
// the bundle destination).
//
// Deliberately NOT mounted anywhere in this round — Phase 2 review of
// docs/homepage-audit-r51.md picks the mount point. Recommended
// initial mount: MainLayout, directly below TopNav, in-flow (not sticky)
// so it disappears on scroll and doesn't collide with ConfirmBar's
// z-index or TopNav's auto-hide translate.
//
// Design contract (matches the audit's responsive risk register):
//   • Inside the 430px phone shell — no full-bleed on customer site.
//   • Height: 44–48px mobile, ~48–52px desktop.
//   • Copy: single-line, `whiteSpace: nowrap` + `text-overflow: ellipsis`.
//   • NO horizontal scroll.
//   • Auto-rotates every 6s across active offers (up to 3).
//   • Respects `prefers-reduced-motion`: freezes on the first offer.
//   • Per-session dismiss via sessionStorage
//     `sunred.promostrip.dismissed = "<offerId>"`; a different top
//     offer resets the dismissal so genuinely-new promos re-appear.
//   • role="status", aria-live="polite".
//   • Zero data-logic side-effects: everything is display-only reads.
//
// Copy patterns (i18n keyed):
//   Custom code:
//     🎁  {label} · code {CODE} · Tap to copy
//   Bundle:
//     🎁  {name} · Save {%} · Tap to view
//
// If PROMOS_ENABLED is false OR no offers are active OR the current
// bestOffer is dismissed → returns null. No layout jump.

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Box, Snackbar, IconButton } from "@mui/material";
import { AnimatePresence, motion } from "framer-motion";
import { Ticket, Gift, Sparkle, X } from "phosphor-react";
import { useTranslation } from "react-i18next";

import { PROMOS_ENABLED } from "@/config/featureFlags";
import {
  useActivePromos,
  isCustomPromo,
  isBundle,
  type ActiveCustomPromo,
  type Bundle,
} from "@/hooks/useActivePromos";

const SANS = '"Inter", system-ui, -apple-system, sans-serif';

const DISMISS_KEY = "sunred.promostrip.dismissed";
const ROTATION_MS = 6000;
const MAX_OFFERS_IN_ROTATION = 3;

type Offer = ActiveCustomPromo | Bundle;

/** Stable id per offer — codes use `code`, bundles use `id`. */
function offerId(o: Offer): string {
  return isCustomPromo(o) ? `code:${o.code}` : `bundle:${o.id}`;
}

/** Rough numeric value ranking so a "best first" display order feels right. */
function offerRank(o: Offer): number {
  if (isCustomPromo(o)) {
    if (o.type === "fixed") return o.amount;
    if (o.capThb && o.capThb > 0) return o.capThb;
    return o.amount * 10;
  }
  return Math.round((o.discountPct / 100) * 1800 * o.sessionCount);
}

/** Renders the strip's short copy line for the currently-visible offer. */
function offerCopy(
  o: Offer,
  t: (key: string, defaultValue: string, opts?: Record<string, unknown>) => string
): string {
  if (isCustomPromo(o)) {
    const codeChunk = t("promoStrip.codeChunk", "code {{code}}", { code: o.code });
    return t(
      "promoStrip.codeLine",
      "{{label}} · {{codeChunk}} · Tap to copy",
      { label: o.label, codeChunk }
    );
  }
  return t(
    "promoStrip.bundleLine",
    "{{name}} · Save {{pct}}% · Tap to view",
    { name: o.name, pct: o.discountPct }
  );
}

/** Icon rotates deterministically per offer type — Ticket for codes,
 *  Gift for bundles, Sparkle for the "one and only" case. */
function OfferIcon({ offer }: { offer: Offer }) {
  if (isCustomPromo(offer)) return <Ticket size={16} weight="fill" aria-hidden />;
  if (isBundle(offer)) return <Gift size={16} weight="fill" aria-hidden />;
  return <Sparkle size={16} weight="fill" aria-hidden />;
}

export interface PromoStripProps {
  /** Optional service scoping — bundles filter by this. Custom codes ignore it. */
  serviceId?: string | null;
  /** Sticky under TopNav vs in-flow. Default: in-flow. Sticky is opt-in
   *  because the TopNav auto-hide + z-index math can leave orphan gaps. */
  sticky?: boolean;
  /** Optional callback when a bundle offer is tapped. Phase 3 wires this
   *  to a `/services?bundle=<id>` sheet. Default: no-op. */
  onBundleTap?: (bundle: Bundle) => void;
}

const PromoStrip: React.FC<PromoStripProps> = ({
  serviceId,
  sticky = false,
  onBundleTap,
}) => {
  const { t } = useTranslation();
  const { activeCustomCodes, activeBundles } = useActivePromos(serviceId);

  const [index, setIndex] = useState(0);
  const [snackOpen, setSnackOpen] = useState(false);
  const [snackMsg, setSnackMsg] = useState("");
  const [dismissedId, setDismissedId] = useState<string | null>(null);

  // Read sessionStorage dismiss once on mount. Safe under SSR.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.sessionStorage.getItem(DISMISS_KEY);
      if (raw) setDismissedId(raw);
    } catch {
      /* ignore */
    }
  }, []);

  // Combine + rank + cap. Custom codes first (lower-friction), then bundles.
  // Highest-value within each group leads.
  const offers = useMemo<Offer[]>(() => {
    const codes = [...activeCustomCodes].sort((a, b) => offerRank(b) - offerRank(a));
    const bundles = [...activeBundles].sort((a, b) => offerRank(b) - offerRank(a));
    return [...codes, ...bundles].slice(0, MAX_OFFERS_IN_ROTATION);
  }, [activeCustomCodes, activeBundles]);

  // Rotate through offers every ROTATION_MS. Reduced-motion users get the
  // first offer only; setInterval is skipped entirely.
  const prefersReducedMotion = useMemo(() => {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  useEffect(() => {
    if (prefersReducedMotion) return;
    if (offers.length <= 1) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % offers.length);
    }, ROTATION_MS);
    return () => clearInterval(id);
  }, [offers.length, prefersReducedMotion]);

  // If offers shrink under our index, snap back to 0.
  const safeIndex = offers.length > 0 ? index % offers.length : 0;
  const currentOffer: Offer | null = offers[safeIndex] ?? null;

  const handleTap = useCallback(() => {
    if (!currentOffer) return;
    if (isCustomPromo(currentOffer)) {
      const code = currentOffer.code;
      // Copy to clipboard. Fall back to a manual selection on older browsers.
      const tryCopy = async () => {
        try {
          if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(code);
          } else {
            // Very old browsers — fall back to a hidden textarea select.
            const ta = document.createElement("textarea");
            ta.value = code;
            ta.style.position = "fixed";
            ta.style.opacity = "0";
            document.body.appendChild(ta);
            ta.select();
            document.execCommand("copy");
            document.body.removeChild(ta);
          }
          setSnackMsg(
            t(
              "promoStrip.codeCopied",
              "Code {{code}} copied — apply at checkout",
              { code }
            )
          );
          setSnackOpen(true);
        } catch {
          setSnackMsg(
            t(
              "promoStrip.codeCopyFailed",
              "Copy failed — the code is {{code}}",
              { code }
            )
          );
          setSnackOpen(true);
        }
      };
      void tryCopy();
    } else if (isBundle(currentOffer)) {
      if (onBundleTap) onBundleTap(currentOffer);
    }
  }, [currentOffer, onBundleTap, t]);

  const handleDismiss = useCallback(
    (e?: React.MouseEvent | React.KeyboardEvent) => {
      // Prevent the outer button's tap-to-copy from firing.
      e?.stopPropagation();
      if (!currentOffer) return;
      const id = offerId(currentOffer);
      setDismissedId(id);
      try {
        window.sessionStorage.setItem(DISMISS_KEY, id);
      } catch {
        /* ignore */
      }
    },
    [currentOffer]
  );

  // Fast-path bail-outs. All must render null with NO layout impact.
  if (!PROMOS_ENABLED) return null;
  if (offers.length === 0) return null;
  if (currentOffer && dismissedId === offerId(currentOffer)) return null;
  if (!currentOffer) return null;

  return (
    <>
      <Box
        role="status"
        aria-live="polite"
        aria-label={t("promoStrip.ariaLabel", "Active promotion")}
        sx={{
          // Layout: honor the 430px phone shell (customer surface pattern).
          // On desktop the audit recommends max-width 1200; the phone shell
          // wrapping this component already caps at 430 for the customer
          // site, so 1200 only matters if a future round mounts this
          // outside the shell.
          maxWidth: { xs: "100%", md: 1200 },
          margin: "0 auto",
          // Sticky is opt-in per the audit — orphan-gap risk with TopNav.
          ...(sticky
            ? {
                position: "sticky" as const,
                top: 0,
                // Below TopNav (zIndex 100 in MainLayout) but above content.
                zIndex: 60,
              }
            : {}),
          // Slim brand-red gradient — matches customer site (NOT admin teal).
          background: "linear-gradient(135deg, #2D2D2B, #B7A896)",
          color: "#ffffff",
          minHeight: { xs: 40, md: 44 },
          // Room for the copy row + dismiss button.
          padding: "0 4px 0 12px",
          display: "flex",
          alignItems: "center",
          gap: "6px",
          overflow: "hidden",
        }}
      >
        {/* Tap target — the whole strip minus the dismiss X. */}
        <Box
          component="button"
          type="button"
          onClick={handleTap}
          aria-label={
            isCustomPromo(currentOffer)
              ? t("promoStrip.tapToCopy", "Tap to copy promo code {{code}}", {
                  code: currentOffer.code,
                })
              : t("promoStrip.tapToView", "Tap to view {{name}}", {
                  name: (currentOffer as Bundle).name,
                })
          }
          sx={{
            all: "unset",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            flex: 1,
            minWidth: 0,
            cursor: "pointer",
            padding: "8px 4px",
            fontFamily: SANS,
            // Text truncation contract: single line, ellipsis, no wrap,
            // no horizontal scroll.
            "&:focus-visible": {
              outline: "2px solid rgba(255,255,255,0.85)",
              outlineOffset: 2,
              borderRadius: 6,
            },
          }}
        >
          <Box
            component="span"
            aria-hidden
            sx={{
              display: "inline-flex",
              alignItems: "center",
              flexShrink: 0,
              color: "#fff",
            }}
          >
            <OfferIcon offer={currentOffer} />
          </Box>

          {/* Rotating text — framer-motion crossfade between offers. */}
          <Box
            sx={{
              flex: 1,
              minWidth: 0,
              position: "relative",
              // Fixed line-height so crossfade doesn't wobble.
              lineHeight: "20px",
              height: 20,
            }}
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={offerId(currentOffer)}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: prefersReducedMotion ? 0 : 0.28 }}
                style={{
                  display: "block",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  fontSize: 13,
                  fontWeight: 600,
                  letterSpacing: "0.005em",
                }}
              >
                {offerCopy(currentOffer, t)}
              </motion.span>
            </AnimatePresence>
          </Box>
        </Box>

        {/* Dismiss — real button, keyboard-focusable.
            🆕 Round 28r57 · Phase 3.6 — WCAG 2.1 AA minimum 44×44 tap
            surface even in the compact strip. Icon stays small; the
            padding does the work of the hit-target. */}
        <IconButton
          size="small"
          aria-label={t("promoStrip.dismiss", "Dismiss promotional banner")}
          onClick={handleDismiss}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              handleDismiss(e);
            }
          }}
          sx={{
            color: "rgba(255,255,255,0.9)",
            padding: "10px",
            minWidth: 44,
            minHeight: 44,
            flexShrink: 0,
            "&:hover": { background: "rgba(255,255,255,0.14)" },
            "&:focus-visible": {
              outline: "2px solid rgba(255,255,255,0.85)",
              outlineOffset: 2,
            },
          }}
        >
          <X size={14} weight="bold" aria-hidden />
        </IconButton>
      </Box>

      {/* Snackbar for the copy confirmation. role="status" (not "alert") —
          copy confirmation is not urgent. Auto-hides after 3s. */}
      <Snackbar
        open={snackOpen}
        autoHideDuration={3000}
        onClose={() => setSnackOpen(false)}
        message={snackMsg}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        ContentProps={{
          role: "status",
          sx: {
            fontFamily: SANS,
            fontSize: 13,
            fontWeight: 600,
          },
        }}
      />
    </>
  );
};

export default PromoStrip;
