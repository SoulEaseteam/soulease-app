// src/components/common/BundleSection.tsx
//
// 🆕 Round 28r58 (founder 2026-07-08 — Phase 2 Bundle wired to customer
//   flow) — surfaces active Bundle Packages as visually-rich cards on
//   the customer site.
//
// Data: reads via `useActivePromos()` (r51) — enabled + in-window
//   bundles only. When zero bundles are active the component renders
//   nothing (safe to mount unconditionally on any surface).
//
// Redemption model — this MVP has NO online checkout for bundles.
//   Every booking on SunRed is concierge-confirmed, so the CTA opens
//   a WhatsApp deep-link (with LINE as a secondary channel) pre-filled
//   with the bundle name + session count. Admin negotiates + issues
//   the code manually. This matches how every other booking is
//   handled today.
//
// Analytics:
//   • `bundle_view`          → once per session on first mount with
//                              at least one active bundle
//   • `bundle_reserve_click` → every CTA tap (per-bundle payload so
//                              founder can see interest by bundle)
//
// Responsive layout:
//   • xs      → 1-col stack
//   • sm      → 2-col grid
//   • md/lg   → 3–4-col grid (auto-fit)
// The parent container's own padding + shell width already handle the
// horizontal cage. This component only paints INTO whatever slot it
// gets — no full-bleed, no sticky positioning.
//
// Zero data-logic side-effects: everything below is a display read.

import React, { useEffect, useMemo } from "react";
import { Box, Typography } from "@mui/material";
import { Gift } from "phosphor-react";
import { useTranslation } from "react-i18next";

import services from "@/data/services";
import { getAllServices } from "@/utils/serviceCatalog";
import { formatTHB } from "@/utils/servicePricing";
import { bundleSavingsPreview, type Bundle } from "@/utils/bundles";
import { useActivePromos } from "@/hooks/useActivePromos";
import {
  trackBundleView,
  trackBundleReserveClick,
} from "@/utils/analytics";

const SANS = '"Inter", system-ui, -apple-system, sans-serif';
const SERIF =
  '"Federo", "Italiana", "Cinzel", "Fraunces", Georgia, "Times New Roman", serif';

// Shared concierge phone (WhatsApp) — matches the other 7 wa.me/…
// references in the app (see HomePage / ServicesPage / ServiceDetailPage
// / BookingSuccessPage / AdminFloatingChat).
const WHATSAPP_PHONE = "66634350987";
const LINE_URL = "https://lin.ee/uqvdwWt";

/** Build the WhatsApp deep-link with a bundle-specific pre-filled message. */
function whatsappHrefForBundle(bundle: Bundle): string {
  const msg = `Hi SunRed, I'd like to reserve the "${bundle.name}" bundle (${bundle.sessionCount} sessions).`;
  return `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(msg)}`;
}

/** Human-readable expiry (locale-independent short form). Null when open-ended. */
function expiryLabel(bundle: Bundle, tFn: ReturnType<typeof useTranslation>["t"]): string {
  if (bundle.expiresAt) {
    try {
      const d = new Date(bundle.expiresAt);
      const dateStr = d.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
      return tFn("bundle.expiresBy", "Use by {{date}}", { date: dateStr });
    } catch {
      /* fall through */
    }
  }
  return tFn("bundle.useAnytime", "Prepaid · Use anytime within 90 days");
}

const BundleSection: React.FC = () => {
  const { t } = useTranslation();
  const { activeBundles } = useActivePromos();

  // Effective catalog: hardcoded 4 services + any admin-created custom
  // services (r301). Fall back to the raw catalog so this never no-ops
  // just because the live cache hasn't hydrated on first render.
  const catalog = useMemo(() => {
    const merged = getAllServices();
    return merged.length ? merged : services;
  }, []);

  // Fire bundle_view exactly ONCE per session on first mount with at
  // least one active bundle. The dedup key in analytics.ts collapses
  // repeat mounts (Home ↔ Services navigation) into a single event.
  useEffect(() => {
    if (activeBundles.length === 0) return;
    // Any bundle will do for the "did the guest see the surface" signal.
    // Per-bundle interest is measured by bundle_reserve_click.
    const first = activeBundles[0];
    trackBundleView(first.id, first.sessionCount, first.discountPct);
  }, [activeBundles]);

  if (activeBundles.length === 0) return null;

  return (
    <Box
      component="section"
      aria-label={t("bundle.section.aria", "Bundle Packages")}
      sx={{
        // In-flow. Parent shell owns horizontal padding; give the
        // section its own vertical rhythm so it never crashes into
        // its neighbours (desktop hero above / therapist grid below).
        margin: { xs: "8px 16px 20px", md: "16px 12px 24px" },
      }}
    >
      {/* Eyebrow bar — bilingual, mirrors "RATES & SERVICES" rhythm
          used on the Services tab. */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          padding: "0 4px",
          mb: 1.25,
        }}
      >
        <Box
          aria-hidden
          sx={{
            width: 22,
            height: 1,
            background: "rgba(180, 0, 10, 0.45)",
          }}
        />
        <Typography
          component="h2"
          sx={{
            fontFamily: SANS,
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "#B4000A",
            m: 0,
          }}
        >
          {t("bundle.section.title", "Bundle Packages")}
          <Box
            component="span"
            sx={{
              color: "rgba(15, 23, 42, 0.55)",
              fontWeight: 700,
              ml: 0.75,
            }}
          >
            · {t("bundle.section.titleTh", "แพ็คเกจสะสม")}
          </Box>
        </Typography>
        <Box
          aria-hidden
          sx={{
            flex: 1,
            height: 1,
            background: "rgba(15, 23, 42, 0.06)",
          }}
        />
      </Box>

      <Typography
        sx={{
          fontFamily: SANS,
          fontSize: { xs: 13, md: 14 },
          fontWeight: 500,
          color: "rgba(15, 23, 42, 0.7)",
          padding: "0 4px",
          mb: 2,
          lineHeight: 1.5,
        }}
      >
        {t(
          "bundle.section.subtitle",
          "Save more · book multiple sessions at once, confirmed with your concierge."
        )}
      </Typography>

      {/* Responsive grid: 1 col mobile · 2 col sm · 3-4 col md+ */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, 1fr)",
            md: "repeat(3, 1fr)",
            lg: "repeat(4, 1fr)",
          },
          gap: { xs: 1.5, md: 2 },
        }}
      >
        {activeBundles.map((b) => {
          const preview = bundleSavingsPreview(b, catalog);
          const waHref = whatsappHrefForBundle(b);
          const expLabel = expiryLabel(b, t);

          return (
            <Box
              key={b.id}
              sx={{
                position: "relative",
                display: "flex",
                flexDirection: "column",
                background: "#FFFFFF",
                border: "1px solid rgba(15, 23, 42, 0.08)",
                borderRadius: "18px",
                padding: { xs: "16px 16px 14px", md: "18px 18px 16px" },
                boxShadow:
                  "0 1px 2px rgba(15, 23, 42, 0.04), 0 6px 18px rgba(15, 23, 42, 0.05)",
                transition:
                  "transform 200ms ease, box-shadow 200ms ease, border-color 200ms ease",
                "&:hover": {
                  transform: "translateY(-2px)",
                  borderColor: "rgba(15, 23, 42, 0.14)",
                  boxShadow:
                    "0 2px 4px rgba(15, 23, 42, 0.06), 0 12px 26px rgba(15, 23, 42, 0.08)",
                },
              }}
            >
              {/* Discount pill — amber to differentiate from single-
                  booking promos (which use brand red). */}
              <Box
                sx={{
                  position: "absolute",
                  top: 12,
                  right: 12,
                  padding: "4px 10px",
                  borderRadius: 999,
                  background:
                    "linear-gradient(135deg, #F5A623 0%, #E8951A 100%)",
                  color: "#FFFFFF",
                  fontFamily: SANS,
                  fontSize: 11,
                  fontWeight: 800,
                  letterSpacing: "0.02em",
                  boxShadow: "0 2px 6px rgba(245, 166, 35, 0.28)",
                }}
              >
                -{b.discountPct}%
              </Box>

              {/* Bundle name + session count badge */}
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  mb: 0.5,
                  pr: 6, // clear the discount pill
                }}
              >
                <Gift
                  size={18}
                  weight="fill"
                  color="#B4000A"
                  aria-hidden
                />
                <Box
                  component="span"
                  sx={{
                    fontFamily: SANS,
                    fontSize: 10.5,
                    fontWeight: 800,
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    color: "#B4000A",
                  }}
                >
                  {t("bundle.card.sessionCount", "{{count}} sessions", {
                    count: b.sessionCount,
                  })}
                </Box>
              </Box>

              <Typography
                sx={{
                  fontFamily: SERIF,
                  fontSize: { xs: 17, md: 18 },
                  fontWeight: 600,
                  color: "#1A2B2E",
                  lineHeight: 1.25,
                  letterSpacing: "-0.005em",
                  mb: 1.25,
                }}
              >
                {b.name}
              </Typography>

              {/* Savings preview — only renders if catalog resolved */}
              {preview && (
                <Box
                  sx={{
                    background: "rgba(180, 0, 10, 0.04)",
                    border: "1px dashed rgba(180, 0, 10, 0.18)",
                    borderRadius: "12px",
                    padding: "10px 12px",
                    mb: 1.25,
                  }}
                >
                  <Typography
                    sx={{
                      fontFamily: SANS,
                      fontSize: 11,
                      fontWeight: 600,
                      color: "rgba(15, 23, 42, 0.6)",
                      letterSpacing: "0.04em",
                      textTransform: "uppercase",
                      mb: 0.25,
                    }}
                  >
                    {t("bundle.card.savings", "You save")}
                  </Typography>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "baseline",
                      gap: 1,
                      flexWrap: "wrap",
                    }}
                  >
                    <Typography
                      component="span"
                      sx={{
                        fontFamily: SANS,
                        fontSize: 13,
                        fontWeight: 500,
                        color: "rgba(15, 23, 42, 0.5)",
                        textDecoration: "line-through",
                      }}
                    >
                      {formatTHB(preview.totalWithoutBundle)}
                    </Typography>
                    <Typography
                      component="span"
                      sx={{
                        fontFamily: SANS,
                        fontSize: 16,
                        fontWeight: 800,
                        color: "#B4000A",
                        letterSpacing: "-0.01em",
                      }}
                    >
                      {formatTHB(preview.totalWithBundle)}
                    </Typography>
                  </Box>
                  <Typography
                    sx={{
                      fontFamily: SANS,
                      fontSize: 11.5,
                      color: "rgba(15, 23, 42, 0.6)",
                      lineHeight: 1.4,
                      mt: 0.25,
                    }}
                  >
                    {t("bundle.card.previewLine", "{{count}} × 60min {{svc}}", {
                      count: b.sessionCount,
                      svc: preview.serviceName,
                    })}
                  </Typography>
                </Box>
              )}

              {/* Sub-line: expiry / usage window */}
              <Typography
                sx={{
                  fontFamily: SANS,
                  fontSize: 11.5,
                  color: "rgba(15, 23, 42, 0.55)",
                  lineHeight: 1.45,
                  mb: 1.5,
                }}
              >
                {expLabel}
              </Typography>

              <Box sx={{ flex: 1 }} />

              {/* Primary CTA — WhatsApp deep-link. Fires the reserve
                  analytics event on tap. */}
              <Box
                component="a"
                href={waHref}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() =>
                  trackBundleReserveClick(
                    b.id,
                    b.sessionCount,
                    b.discountPct,
                  )
                }
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  padding: "11px 14px",
                  borderRadius: "12px",
                  background: "#B4000A",
                  color: "#FFFFFF",
                  textDecoration: "none",
                  fontFamily: SANS,
                  fontSize: 13,
                  fontWeight: 700,
                  letterSpacing: "0.01em",
                  minHeight: 44,
                  boxShadow: "0 4px 12px rgba(180, 0, 10, 0.22)",
                  transition:
                    "transform 160ms ease, box-shadow 160ms ease, background 160ms ease",
                  "&:hover": {
                    background: "#9C0009",
                    transform: "translateY(-1px)",
                    boxShadow: "0 6px 16px rgba(180, 0, 10, 0.28)",
                  },
                  "&:focus-visible": {
                    outline: "2px solid #B4000A",
                    outlineOffset: 2,
                  },
                }}
              >
                {t(
                  "bundle.card.reserveCta",
                  "Reserve via Concierge · ติดต่อคอนเซียร์จ",
                )}
              </Box>

              {/* Secondary CTA — LINE fallback. Small, low-contrast so
                  the WhatsApp CTA stays the primary. */}
              <Box
                component="a"
                href={LINE_URL}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() =>
                  trackBundleReserveClick(
                    `${b.id}:line`,
                    b.sessionCount,
                    b.discountPct,
                  )
                }
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  padding: "8px 10px",
                  mt: 0.75,
                  borderRadius: "10px",
                  color: "rgba(15, 23, 42, 0.7)",
                  textDecoration: "none",
                  fontFamily: SANS,
                  fontSize: 12,
                  fontWeight: 600,
                  transition: "color 160ms ease, background 160ms ease",
                  "&:hover": {
                    color: "#06C755",
                    background: "rgba(6, 199, 85, 0.06)",
                  },
                  "&:focus-visible": {
                    outline: "2px solid rgba(6, 199, 85, 0.6)",
                    outlineOffset: 2,
                  },
                }}
              >
                {t("bundle.card.lineCta", "Chat on LINE instead")}
              </Box>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};

export default BundleSection;
