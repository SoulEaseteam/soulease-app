// src/components/common/BundleSection.tsx
//
// 🆕 Round 28r58 (founder 2026-07-08 — Phase 2 Bundle wired to customer
//   flow) — surfaces active Bundle Packages as visually-rich cards on
//   the customer site.
//
// 🆕 Round 28r60 (founder — "Bundle UI polish · photo + category tags")
//   — cards now paint a hero image (16:9) at the top when the bundle
//   carries an `imageUrl`, with the discount and category pills overlaid.
//   Falls back to the r58 text-only layout when no image is set (a
//   broken-URL onError flip also resets to text-only so the guest never
//   sees a broken img icon). Category tag pill + subtitle line render on
//   BOTH variants when present. Zero regression: an old bundle with none
//   of the new fields renders exactly as r58.
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

import React, { useEffect, useMemo, useState } from "react";
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
// 🆕 Round 28r71 — shared concierge endpoints (r71 rebrand phase 2). The
//   old local WHATSAPP_PHONE / LINE_URL consts were 2 of the 9 spots
//   that duplicated the founder handle — now consumed from one file.
import { CONCIERGE, whatsappDeepLink } from "@/config/concierge";

const SANS = '"Inter", system-ui, -apple-system, sans-serif';
const SERIF =
  '"Federo", "Italiana", "Cinzel", "Fraunces", Georgia, "Times New Roman", serif';

const LINE_URL = CONCIERGE.lineUrl;

/** Build the WhatsApp deep-link with a bundle-specific pre-filled message. */
function whatsappHrefForBundle(bundle: Bundle): string {
  return whatsappDeepLink(
    `Hi SunRed, I'd like to reserve the "${bundle.name}" bundle (${bundle.sessionCount} sessions).`
  );
}

/**
 * 🆕 Round 28r60 — soft palette tint for the category tag pill, keyed
 * off the canonical `BUNDLE_CATEGORY_TAGS` suggestions. Custom tags
 * (freeSolo) fall through to a neutral slate tint.
 * fg = pill text/icon · bg = fill · border = ring.
 */
function categoryTagPalette(tag?: string): { fg: string; bg: string; border: string } {
  const key = (tag ?? "").toLowerCase();
  if (key === "premium")           return { fg: "#8A5A00", bg: "rgba(245,166,35,0.14)", border: "rgba(245,166,35,0.32)" };  // amber
  if (key === "first-time")        return { fg: "#08588A", bg: "rgba(56,169,240,0.14)", border: "rgba(56,169,240,0.30)" };  // sky-blue
  if (key === "weekly ritual")     return { fg: "#B4000A", bg: "rgba(180,0,10,0.08)",   border: "rgba(180,0,10,0.20)" };    // brand-red muted
  if (key === "wellness package")  return { fg: "#14532D", bg: "rgba(22,163,74,0.10)",  border: "rgba(22,163,74,0.24)" };   // sage
  if (key === "long-stay")         return { fg: "#4C1D95", bg: "rgba(139,92,246,0.10)", border: "rgba(139,92,246,0.24)" };  // violet
  if (key === "corporate retreat") return { fg: "#334155", bg: "rgba(51,65,85,0.08)",   border: "rgba(51,65,85,0.18)" };    // slate
  return { fg: "rgba(15,23,42,0.75)", bg: "rgba(15,23,42,0.06)", border: "rgba(15,23,42,0.14)" }; // neutral
}

/** Slugify a category tag for the i18n key: "Weekly Ritual" → "weekly-ritual". */
function categorySlug(tag: string): string {
  return tag.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
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

  // 🆕 Round 28r60 — bundles whose hero image failed to load. Falls the
  // card back to text-only (no broken img icon shown to guests).
  const [brokenImages, setBrokenImages] = useState<Set<string>>(new Set());
  const markImageBroken = (id: string) =>
    setBrokenImages((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });

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

          // 🆕 Round 28r60 — hero-image variant guards on both `imageUrl`
          // being set AND the image not having failed to load already.
          const showHeroImage = !!b.imageUrl && !brokenImages.has(b.id);
          const catPalette = categoryTagPalette(b.categoryTag);
          const catI18nKey = b.categoryTag
            ? `bundle.category.${categorySlug(b.categoryTag)}`
            : "";
          const catLabel = b.categoryTag
            ? t(catI18nKey, b.categoryTag)
            : "";

          return (
            <Box
              key={b.id}
              sx={{
                position: "relative",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden", // 🆕 Round 28r60 — clip the hero image to the rounded corners.
                background: "#FFFFFF",
                border: "1px solid rgba(15, 23, 42, 0.08)",
                borderRadius: "20px", // 🆕 Round 28r60 — slightly rounder (18→20).
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
              {/* 🆕 Round 28r60 — Hero image variant. When `imageUrl` is
                  set (and hasn't failed), paint a 16:9 photo up top with
                  the category tag pill and discount pill overlaid. */}
              {showHeroImage && (
                <Box
                  sx={{
                    position: "relative",
                    width: "100%",
                    aspectRatio: "16 / 9",
                    background:
                      "linear-gradient(180deg, rgba(15,23,42,0.02), rgba(15,23,42,0.06))",
                    overflow: "hidden",
                  }}
                >
                  <Box
                    component="img"
                    src={b.imageUrl}
                    alt=""
                    loading="lazy"
                    onError={() => markImageBroken(b.id)}
                    sx={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      display: "block",
                    }}
                  />
                  {/* Category tag pill — overlaid top-left */}
                  {catLabel && (
                    <Box
                      sx={{
                        position: "absolute",
                        top: 10,
                        left: 10,
                        padding: "4px 10px",
                        borderRadius: 999,
                        background: "rgba(255,255,255,0.94)",
                        color: catPalette.fg,
                        border: `1px solid ${catPalette.border}`,
                        fontFamily: SANS,
                        fontSize: 10.5,
                        fontWeight: 800,
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                        boxShadow: "0 1px 3px rgba(15,23,42,0.10)",
                      }}
                    >
                      {catLabel}
                    </Box>
                  )}
                  {/* Discount pill — overlaid top-right (matches text-only variant) */}
                  <Box
                    sx={{
                      position: "absolute",
                      top: 10,
                      right: 10,
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
                </Box>
              )}

              <Box
                sx={{
                  position: "relative",
                  display: "flex",
                  flexDirection: "column",
                  flex: 1,
                  padding: { xs: "16px 16px 14px", md: "18px 18px 16px" },
                }}
              >
              {/* Discount pill — only when NOT in hero-image mode (it's
                  overlaid on the image in that variant). Amber to
                  differentiate from single-booking promos (brand red). */}
              {!showHeroImage && (
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
              )}

              {/* Header row: session-count badge, plus category tag pill
                  (text-only variant only — hero variant already has it
                  overlaid on the image). */}
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  flexWrap: "wrap",
                  mb: 0.5,
                  pr: showHeroImage ? 0 : 6, // clear the discount pill in text-only mode
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
                {/* Category tag pill — text-only variant only. */}
                {!showHeroImage && catLabel && (
                  <Box
                    component="span"
                    sx={{
                      padding: "2px 8px",
                      borderRadius: 999,
                      background: catPalette.bg,
                      color: catPalette.fg,
                      border: `1px solid ${catPalette.border}`,
                      fontFamily: SANS,
                      fontSize: 9.5,
                      fontWeight: 800,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                    }}
                  >
                    {catLabel}
                  </Box>
                )}
              </Box>

              <Typography
                sx={{
                  fontFamily: SERIF,
                  fontSize: { xs: 17, md: 18 },
                  fontWeight: 600,
                  color: "#1A2B2E",
                  lineHeight: 1.25,
                  letterSpacing: "-0.005em",
                  mb: b.subtitle ? 0.25 : 1.25,
                }}
              >
                {b.name}
              </Typography>

              {/* 🆕 Round 28r60 — Subtitle line under the name. */}
              {b.subtitle && (
                <Typography
                  sx={{
                    fontFamily: SANS,
                    fontSize: 12,
                    fontStyle: "italic",
                    color: "rgba(15, 23, 42, 0.6)",
                    lineHeight: 1.4,
                    mb: 1.25,
                  }}
                >
                  {b.subtitle}
                </Typography>
              )}

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
                {/* 🚨 Round 28r69 — Founder direction "ทุกอย่างที่เป็น
                    ปุ่ม ให้เอาภาษาไทยออก" (2026-07-08). Thai suffix
                    removed from CTA; button label English-only. Section
                    headers/eyebrows keep their Thai subtitle. */}
                {t("bundle.card.reserveCta", "Reserve via Concierge")}
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
              </Box>{/* /padded content wrapper (28r60) */}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};

export default BundleSection;
