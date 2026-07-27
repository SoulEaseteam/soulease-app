// src/pages/PricingPage.tsx
//
// 🆕 Round 28r71 · Rebrand Phase 2 (2026-07-08) — Core Experiences.
//
// Replaces the r70 Nordic-styled stub with the real service pricing
// menu the founder asked for. Reads prices from `priceForDuration()`
// (single source of truth — same math the booking flow uses), so a
// price change in `src/data/services.ts` (or an admin override via
// /admin/promotions) propagates here with no code change.
//
// Structure:
//   1. Page header — eyebrow · Playfair H1 · Sarabun bilingual
//      subtitle · body intro
//   2. Rate menu grid — one card per service (4 total). Each carries
//      a Playfair name + Thai transliteration + euphemism-compliant
//      description + 60/90/120 price table + Reserve button
//   3. Enhancements section — the r28c26 Plan A add-on list
//      (concierge-quoted, not priced)
//   4. Areas & Timing — pill row
//   5. Payment methods — cash · PromptPay · WeChat + Alipay
//      (+5%+฿200 surcharge)
//   6. Cancellation & Discretion — brief bullets
//   7. Bottom CTA band — Playfair headline · WhatsApp + Home
//
// Nordic Gray palette (r70) preserved: neutrals + grays + warmAccents
// tokens from theme.ts. Playfair for headlines, Sarabun for body.
//
// i18n: defaults inline via t("pricing.<key>", "English default").
// Locale JSON coverage (th/zh/ja/ko) can be filled in a later round —
// i18next falls back gracefully to the English default meanwhile.
//
// Zero data-logic side-effects. No Firestore reads. No add-ons picker
// (add-ons were removed from the customer flow in r28r49 — this page
// only mentions them at the "ask concierge for details" register).

import React from "react";
import { Box } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import BestsellerRibbon from "@/components/common/BestsellerRibbon";
// 🆕 28w.28 — icons + concierge channels ported from ServicesPage so the
//   Pricing "Areas & Timing" block matches the richer Services-page card.
import LocationOnRoundedIcon from "@mui/icons-material/LocationOnRounded";
import AccessTimeRoundedIcon from "@mui/icons-material/AccessTimeRounded";
import { FaLine, FaTelegramPlane, FaWeixin, FaWhatsapp } from "react-icons/fa";

import services from "@/data/services";
import {
  priceForDuration,
  durationsFor,
  formatTHB,
  wasPriceFor,
  badgeForDuration,
} from "@/utils/servicePricing";
import PromoBadge from "@/components/common/PromoBadge";
import { fonts } from "@/theme/theme";
// 🆕 28w.37 — 1st-anniversary banner.
import AnniversaryBanner from "@/components/home/AnniversaryBanner";

// 🆕 28w.5 — the r70 "Nordic Gray" tokens were fixed light-only hexes, so
//   this page's cards stayed white with near-invisible text in night mode.
//   Remap the token shapes to day/night var(--sr-*) surfaces + a rose accent
//   in ONE place — every `grays.g900` / `neutrals.n200` / `accents.teal`
//   reference below now flips correctly with no per-usage edits. The Reserve
//   button (was charcoal grays.g900) is rose-ed separately below.
const grays = {
  g900: "var(--sr-ink)",
  g800: "var(--sr-ink)",
  g600: "var(--sr-body)",
  g500: "var(--sr-muted)",
  g400: "var(--sr-dim)",
};
const neutrals = {
  n50: "var(--sr-panel-2)",
  n100: "var(--sr-panel-2)",
  n200: "var(--sr-hairline)",
};
const warmAccents = { w100: "var(--sr-panel-2)" };
const accents = { teal: "#D97C95" };

// 🆕 28w.6 — "ทำให้สวยขึ้น": rose hero band, bestseller ribbon, rose prices.
const ROSE = "#D97C95";
const HERO_GRADIENT = "linear-gradient(160deg, #B8567F 0%, #8A3A57 100%)";
const BESTSELLER_ID = "SR-HJ2200";
// 🆕 28w.72 (founder "Unlock Executive Benefits เฉพาะ Gentleman's กับ SunRed
//   Therapeutic") — only these two carry the premium CTA wording.
const PREMIUM_BENEFITS_IDS = new Set(["SR-HJ2200", "SR-B2B3200"]);
import { responsiveShell } from "@/theme/breakpoints";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";
import { CONCIERGE } from "@/config/concierge";

// 🆕 28w.28 — concierge channels (ported from ServicesPage) for the Reach us grid.
const CHANNELS = [
  { Icon: FaWhatsapp,      name: "WhatsApp", href: CONCIERGE.whatsappUrl,        tone: "#25D366", aria: "Reserve on WhatsApp" },
  { Icon: FaTelegramPlane, name: "Telegram", href: CONCIERGE.telegramChannelUrl, tone: "#229ED9", aria: "Reserve on Telegram" },
  { Icon: FaLine,          name: "LINE",     href: CONCIERGE.lineUrl,            tone: "#06C755", aria: "Reserve on LINE" },
  { Icon: FaWeixin,        name: "WeChat",   href: "/wechat-scan",               tone: "#07C160", aria: "Reserve on WeChat" },
];

// ─── Content data ─────────────────────────────────────────────────────
//
// The per-service Thai transliteration + euphemism-compliant SEO copy
// lives here so the render body stays clean. Every phrase honours the
// CLAUDE.md §3 brand-voice table (quiet luxury · never crude · concierge
// register). Do NOT introduce medical claims or explicit terminology.
//
// The `id` fields MUST match src/data/services.ts SKU ids so
// `priceForDuration()` resolves the right service.
const SERVICE_COPY: Record<
  string,
  { thai: string; teaser: string }
> = {
  // 🆕 Round 28r73 · Nordic minimal polish — spare, editorial phrasing.
  //   Every euphemism from CLAUDE.md §3 preserved verbatim; only rhythm
  //   refined. No new claims, no factual change.
  "SR-Aroma": {
    thai: "การนวดอโรมา · Aromatherapy",
    teaser:
      "A quiet oil ritual in the privacy of your room · premium aromatic blends for restorative sleep.",
  },
  "xSR-Thai": {
    thai: "การนวดไทย · Traditional Thai",
    teaser:
      "Time-honoured stretch and pressure work · flexibility restored, travel tension eased.",
  },
  "SR-HJ2200": {
    thai: "Gentleman's Signature · การนวดสุภาพบุรุษ",
    teaser:
      "A warming aromatic oil ritual for men · attentive tension-release work and a personalised finishing ritual.",
  },
  "SR-B2B3200": {
    thai: "SunRed Therapeutic · การนวดสายเงียบขั้นสูง",
    teaser:
      "Our most refined ritual · a flowing whole-body oil ceremony reserved for specialised practitioners.",
  },
};

// Editorial order — flagship first, then the two entry-level rituals,
// then the exclusive tier. Matches the founder-approved order on the
// Services tab (Round 28c series).
const SERVICE_ORDER = [
  "SR-HJ2200",
  "SR-B2B3200",
  "SR-Aroma",
  "xSR-Thai",
];

// Enhancements from r28c26 Plan A — concierge-quoted, no explicit prices.
// Kept intentionally light — this menu page is not the booking form.
const ENHANCEMENTS = [
  {
    icon: "🚗",
    labelKey: "pricing.addons.travel",
    label: "Beyond-central travel",
    hint: "Extra travel fare quoted for areas beyond central Bangkok.",
  },
  {
    icon: "⏳",
    labelKey: "pricing.addons.extend",
    label: "Extend session",
    hint: "Add 30 or 60 minutes on request · tier-priced.",
  },
  {
    icon: "💎",
    labelKey: "pricing.addons.oil",
    label: "Premium aromatic oil",
    hint: "Small upgrade for a signature scent · ask concierge.",
  },
  {
    icon: "👥",
    labelKey: "pricing.addons.duo",
    label: "Duo experience",
    hint: "Two practitioners for two guests · quoted per session.",
  },
];


const PAYMENT_METHODS = [
  { label: "Cash on arrival", note: "" },
  { label: "PromptPay", note: "" },
  {
    label: "WeChat Pay · Alipay",
    // 🆕 28r121 — Surcharge simplified to flat 7% (see paymentSurcharge.ts).
    note: "+ 7% handling",
  },
];

// ─── Small presentational atoms (kept local — page-specific) ──────────

// 🆕 Round 28r81 — Section eyebrows bumped from muted gray to the
//   teal-mint accent (accents.teal = #2EC4B0). The eyebrow is the
//   perfect "signal highlight" surface — one word per section, in
//   uppercase, already visually distinct. Teal there draws the eye
//   without over-shouting, and there's only ONE eyebrow per section
//   so the "max 2-3 accent hits per screen" rule is respected even
//   when a guest scrolls past several sections.
const Eyebrow: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Box
    component="span"
    sx={{
      display: "inline-block",
      fontFamily: fonts.body,
      fontSize: 11,
      fontWeight: 700,
      letterSpacing: "0.20em",
      textTransform: "uppercase",
      color: accents.teal,
    }}
  >
    {children}
  </Box>
);

const SectionTitle: React.FC<{
  eyebrow?: string;
  title: string;
  subtitle?: string;
}> = ({ eyebrow, title, subtitle }) => (
  <Box sx={{ mb: 3 }}>
    {eyebrow && (
      <Box sx={{ mb: 1 }}>
        <Eyebrow>{eyebrow}</Eyebrow>
      </Box>
    )}
    <Box
      component="h2"
      sx={{
        fontFamily: fonts.heading,
        fontSize: { xs: 22, md: 28 },
        fontWeight: 500,
        lineHeight: 1.2,
        letterSpacing: "-0.005em",
        color: grays.g900,
        margin: 0,
      }}
    >
      {title}
    </Box>
    {subtitle && (
      <Box
        sx={{
          fontFamily: fonts.body,
          fontSize: { xs: 13, md: 14 },
          fontWeight: 400,
          color: grays.g600,
          marginTop: "6px",
          letterSpacing: "0.01em",
        }}
      >
        {subtitle}
      </Box>
    )}
  </Box>
);

// ─── Page ─────────────────────────────────────────────────────────────

const PricingPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  useDocumentMeta({
    title: "Core Experiences · Service Pricing | SunRed",
    description:
      "SunRed Core Experiences — full service pricing menu. Verified practitioners delivered to your Bangkok hotel. Aromatherapy, Traditional Thai, Gentleman's Signature, and SunRed Therapeutic — 60/90/120 min tiers with transparent rates.",
    url: "https://sunred.vip/pricing",
    type: "website",
  });

  // Ordered list of services (falls back to catalog order if a SKU is
  // ever missing — this page won't blank out mid-launch of a new SKU).
  const orderedServices = React.useMemo(() => {
    const byId = new Map(services.map((s) => [s.id, s]));
    const first = SERVICE_ORDER.map((id) => byId.get(id)).filter(
      (s): s is (typeof services)[number] => Boolean(s),
    );
    const rest = services.filter((s) => !SERVICE_ORDER.includes(s.id));
    return [...first, ...rest];
  }, []);

  return (
    <Box
      sx={{
        ...responsiveShell,
        background: neutrals.n50,
        borderRadius: { xs: "28px", md: 0 },
        overflow: "hidden",
        boxShadow: {
          xs: "0 16px 40px rgba(45, 45, 43, 0.06)",
          md: "none",
        },
        position: "relative",
        // 🆕 28w.24 — desktop horizontal padding trimmed 40→32 to match the
        //   nav's responsiveShell px, so the hero (below) lines up with the bar.
        padding: { xs: "32px 20px 48px", md: "64px 32px 80px" },
      }}
    >
      {/* ── 1. Page header — rose-berry hero band (28w.6) ──────────── */}
      <Box
        sx={{
          background: HERO_GRADIENT,
          // 🆕 28w.24 (founder: "แก้หมด" — equal columns) — keep the full-bleed
          //   breakout on mobile, but on desktop DON'T break past the root
          //   padding so the hero width = the nav bar (both inset by the shell
          //   px). Was md:-40 which pushed the hero to the column edge (wider
          //   than the bar).
          mx: { xs: "-20px", md: "0px" },
          mt: { xs: "-32px", md: "-64px" },
          mb: { xs: 4, md: 6 },
          px: { xs: "24px", md: "40px" },
          pt: { xs: "48px", md: "76px" },
          pb: { xs: "36px", md: "52px" },
          textAlign: { xs: "left", md: "center" },
        }}
      >
        <Box
          sx={{
            fontFamily: fonts.body,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.20em",
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.72)",
          }}
        >
          SunRed · Bangkok
        </Box>
        <Box
          component="h1"
          sx={{
            fontFamily: fonts.heading,
            fontSize: { xs: 32, md: 48 },
            fontWeight: 500,
            lineHeight: 1.1,
            letterSpacing: "-0.01em",
            color: "#fff",
            margin: "12px 0 0",
          }}
        >
          {t("pricing.title", "Core Experiences")}
        </Box>
        <Box
          sx={{
            fontFamily: fonts.body,
            fontSize: { xs: 14, md: 16 },
            fontWeight: 400,
            color: "rgba(255,255,255,0.82)",
            marginTop: "10px",
            letterSpacing: "0.01em",
          }}
        >
          {t("pricing.subtitle", "Service Pricing · ราคาบริการ")}
        </Box>
        <Box
          sx={{
            fontFamily: fonts.body,
            fontSize: { xs: 14, md: 15 },
            fontWeight: 400,
            color: "rgba(255,255,255,0.82)",
            lineHeight: 1.7,
            marginTop: "20px",
            maxWidth: 640,
            marginLeft: { xs: 0, md: "auto" },
            marginRight: { xs: 0, md: "auto" },
          }}
        >
          {t(
            "pricing.intro",
            "Each ritual delivered to your hotel or residence in Bangkok. Choose your duration; the concierge handles the rest. Rates in Thai Baht (THB) reflect the base session — travel, extensions, and add-ons are quoted separately.",
          )}
        </Box>
      </Box>

      {/* 🎉 28w.37 — 1st-anniversary banner (founder 2026-07-14) */}
      <Box sx={{ px: { xs: 2.5, md: 0 }, mb: { xs: 4, md: 5 } }}>
        <AnniversaryBanner variant="pricing" />
      </Box>

      {/* ── 2. Rate menu grid ─────────────────────────────────────── */}
      <Box
        component="section"
        aria-label={t("pricing.menu.aria", "Service menu")}
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
          gap: { xs: 2.5, md: 3 },
          marginBottom: { xs: 5, md: 7 },
        }}
      >
        {orderedServices.map((s) => {
          const copy = SERVICE_COPY[s.id] ?? { thai: "", teaser: s.desc };
          // 🆕 28w.36 (founder 2026-07-14 "โชว์ราคาทั้งหมด") — new pricing
          //   set, so every offered tier shows (Thai/Aroma 60/90/120 ·
          //   Gentleman's/Therapeutic 70/120). Reverses the 28r115 hide.
          const durations = durationsFor(s);
          const priceAt = (min: number) => priceForDuration(s, min);
          const isBestseller = s.id === BESTSELLER_ID;
          const isPremiumBenefits = PREMIUM_BENEFITS_IDS.has(s.id);
          const benefitsLabel = isPremiumBenefits
            ? t("pricing.unlockBenefits", "Unlock Executive Benefits")
            : t("pricing.benefits", "Benefits");
          return (
            <Box
              key={s.id}
              component="article"
              sx={{
                position: "relative",
                overflow: "hidden",
                background: "var(--sr-panel)",
                borderRadius: "24px",
                border: isBestseller
                  ? `2px solid ${ROSE}`
                  : `1px solid ${neutrals.n200}`,
                boxShadow: isBestseller
                  ? "0 12px 32px rgba(138, 58, 87, 0.18)"
                  : "none",
                padding: { xs: "24px 20px", md: "32px 28px" },
                display: "flex",
                flexDirection: "column",
                gap: "18px",
              }}
            >
              {/* 🆕 28w.68 (founder "สีทองวิบวับ") — the corner ribbon is now a
                  shimmering metallic gold sweep instead of flat rose. */}
              {/* 🆕 28w.87 — the ribbon markup moved to a shared component so
                  /services can show the SAME badge (founder). Same output. */}
              {isBestseller && (
                <BestsellerRibbon label={t("pricing.bestseller", "Bestseller")} />
              )}
              {/* Service name — Playfair, generous */}
              <Box>
                <Box
                  component="h3"
                  sx={{
                    fontFamily: fonts.heading,
                    fontSize: { xs: 22, md: 28 },
                    fontWeight: 500,
                    lineHeight: 1.2,
                    letterSpacing: "-0.005em",
                    color: grays.g900,
                    margin: 0,
                  }}
                >
                  {s.name}
                </Box>
                {copy.thai && (
                  <Box
                    sx={{
                      fontFamily: fonts.body,
                      fontSize: { xs: 12, md: 13 },
                      fontWeight: 500,
                      color: grays.g500,
                      letterSpacing: "0.03em",
                      marginTop: "6px",
                    }}
                  >
                    {copy.thai}
                  </Box>
                )}
                <Box
                  sx={{
                    fontFamily: fonts.body,
                    fontSize: { xs: 13, md: 14 },
                    fontWeight: 400,
                    color: grays.g600,
                    lineHeight: 1.6,
                    marginTop: "12px",
                  }}
                >
                  {copy.teaser}
                </Box>
              </Box>

              {/* Price table — 60/90/120 rows */}
              <Box
                sx={{
                  background: neutrals.n50,
                  border: `1px solid ${neutrals.n200}`,
                  borderRadius: "14px",
                  padding: "10px 14px",
                }}
              >
                {durations.map((d, idx) => (
                  <Box
                    key={d}
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "baseline",
                      padding: "8px 0",
                      borderTop:
                        idx === 0 ? "none" : `1px solid ${neutrals.n200}`,
                    }}
                  >
                    <Box
                      component="span"
                      sx={{
                        fontFamily: fonts.body,
                        fontSize: 13,
                        fontWeight: 500,
                        color: grays.g600,
                        letterSpacing: "0.02em",
                      }}
                    >
                      {d} min
                    </Box>
                    {/* 🆕 28w.64 (founder "เพิ่มราคาเก่าขีดทับ") — the struck
                        was-price is back (reverses the 28r117 removal), small,
                        before the rose current price. */}
                    <Box sx={{ display: "flex", alignItems: "center", gap: "7px" }}>
                      {/* 🆕 28w.65 → 28w.69 — the badge sits AT the price, and
                          which badge is decided by the DURATION: 90 min =
                          🔥 BEST VALUE, 70 min = ⭐ BEST SELLER. */}
                      {badgeForDuration(d) && (
                        <PromoBadge badge={badgeForDuration(d)!} size="sm" />
                      )}
                      {wasPriceFor(s, d) && (
                        <Box
                          component="span"
                          sx={{
                            fontFamily: fonts.body,
                            fontSize: { xs: 12, md: 12.5 },
                            fontWeight: 500,
                            color: grays.g500,
                            textDecoration: "line-through",
                          }}
                        >
                          {formatTHB(wasPriceFor(s, d) as number)}
                        </Box>
                      )}
                      <Box
                        component="span"
                        sx={{
                          fontFamily: fonts.heading,
                          fontSize: { xs: 17, md: 18 },
                          fontWeight: 600,
                          color: ROSE,
                          letterSpacing: "-0.005em",
                        }}
                      >
                        {formatTHB(priceAt(d))}
                      </Box>
                    </Box>
                  </Box>
                ))}
              </Box>

              {/* 🆕 28w.25 (founder: "ลิ้งไปตามเมนูนั้นๆ … Unlock Executive
                  Benefits") — was a WhatsApp "Reserve" deep link; now opens
                  THIS service's own detail page (/services/{id}) under a
                  premium "Unlock Executive Benefits" label. */}
              <Box
                component="button"
                type="button"
                onClick={() => navigate(`/services/${s.id}`)}
                aria-label={`${benefitsLabel} — ${s.name}`}
                sx={{
                  // 🆕 28w.26 (founder: "ขยับไว้ตรงกลางป้าย") — centre the CTA
                  //   in the card (was flex-start / left-aligned).
                  alignSelf: "center",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "10px 20px",
                  borderRadius: 999,
                  border: "none",
                  cursor: "pointer",
                  background: "#D97C95",
                  color: "#FFFFFF",
                  fontFamily: fonts.body,
                  fontSize: 13,
                  fontWeight: 600,
                  letterSpacing: "0.005em",
                  textDecoration: "none",
                  boxShadow: "0 6px 16px rgba(45, 45, 43, 0.20)",
                  transition:
                    "transform 0.16s ease, box-shadow 0.16s ease, background 0.16s ease",
                  "&:hover": {
                    background: "#C96F89",
                    transform: "translateY(-1px)",
                    boxShadow: "0 8px 20px rgba(45, 45, 43, 0.28)",
                  },
                  "&:focus-visible": {
                    outline: `2px solid ${grays.g900}`,
                    outlineOffset: 3,
                  },
                }}
              >
                {/* 🆕 28w.27 (founder: "เอาลูกศรออก") — arrow removed.
                    🆕 28w.70 → 28w.72 (founder: "Unlock Executive Benefits
                    เฉพาะ Gentleman's กับ SunRed Therapeutic") — the premium
                    framing is reserved for those two; the rest read "Benefits". */}
                {benefitsLabel}
              </Box>
            </Box>
          );
        })}
      </Box>

      {/* ── 3. Enhancements ────────────────────────────────────────── */}
      <Box component="section" sx={{ marginBottom: { xs: 5, md: 7 } }}>
        <SectionTitle
          eyebrow={t("pricing.addons.eyebrow", "Enhancements")}
          title={t("pricing.addons.title", "Optional additions")}
          subtitle={t(
            "pricing.addons.subtitle",
            "Ask concierge for a quote on any of the following · not included in the base rate above.",
          )}
        />
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
            gap: 2,
          }}
        >
          {ENHANCEMENTS.map((a) => (
            <Box
              key={a.label}
              sx={{
                display: "flex",
                gap: "14px",
                padding: "16px 18px",
                borderRadius: "16px",
                background: "var(--sr-panel)",
                border: `1px solid ${neutrals.n200}`,
              }}
            >
              <Box
                aria-hidden
                sx={{
                  fontSize: 22,
                  lineHeight: 1,
                  flexShrink: 0,
                }}
              >
                {a.icon}
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Box
                  sx={{
                    fontFamily: fonts.body,
                    fontSize: 14,
                    fontWeight: 600,
                    color: grays.g900,
                    marginBottom: "3px",
                  }}
                >
                  {t(a.labelKey, a.label)}
                </Box>
                <Box
                  sx={{
                    fontFamily: fonts.body,
                    fontSize: 13,
                    fontWeight: 400,
                    color: grays.g600,
                    lineHeight: 1.5,
                  }}
                >
                  {a.hint}
                </Box>
              </Box>
            </Box>
          ))}
        </Box>
      </Box>

      {/* ── 4. Areas & Timing ── 🆕 28w.28 (founder: "เอาอันแรกเหมือนหน้า
             services มาใส") — replaced the pill row + single prime-hours line
             with the richer Services-page card (service-area prose + arrival
             window) and the Reach us concierge grid + Telegram subscribe. */}
      <Box component="section" sx={{ marginBottom: { xs: 5, md: 7 } }}>
        <Box sx={{ mb: 1.5 }}>
          <Eyebrow>{t("services.areasTiming", "Areas & Timing")}</Eyebrow>
        </Box>
        <Box
          sx={{
            borderRadius: "18px",
            background: "var(--sr-panel)",
            border: "1px solid var(--sr-hairline)",
            boxShadow: "var(--sr-card-shadow)",
            overflow: "hidden",
          }}
        >
          <Box sx={{ padding: "16px 18px" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.75 }}>
              <LocationOnRoundedIcon sx={{ color: ROSE, fontSize: 18 }} />
              <Box sx={{ fontFamily: fonts.body, fontSize: 13.5, fontWeight: 700, color: "var(--sr-ink)" }}>
                {t("services.serviceArea", "Service area")}
              </Box>
            </Box>
            <Box sx={{ fontFamily: fonts.body, fontSize: 12.5, lineHeight: 1.6, color: "var(--sr-body)" }}>
              {t(
                "services.serviceAreaBody",
                "Sukhumvit · Silom · Asok · Thonglor · Sathorn · Phrom Phong · Ari · Chidlom · Ploenchit. Beyond the centre — our concierge provides a private quotation.",
              )}
            </Box>
          </Box>
          <Box aria-hidden sx={{ height: 1, background: "var(--sr-hairline)", mx: "18px" }} />
          <Box sx={{ padding: "14px 18px 16px" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.75 }}>
              <AccessTimeRoundedIcon sx={{ color: ROSE, fontSize: 18 }} />
              <Box sx={{ fontFamily: fonts.body, fontSize: 13.5, fontWeight: 700, color: "var(--sr-ink)" }}>
                {t("services.arrivalWindow", "Arrival window")}
              </Box>
            </Box>
            <Box sx={{ fontFamily: fonts.body, fontSize: 12.5, color: "var(--sr-body)", lineHeight: 1.55 }}>
              {t("services.arrivalCentral", "Central Bangkok:")}{" "}
              <Box component="span" sx={{ fontWeight: 600, color: "var(--sr-ink)" }}>
                {t("services.arrivalCentralWindow", "30–60 min.")}
              </Box>{" "}
              {t("services.arrivalOuter", "Outer districts:")}{" "}
              <Box component="span" sx={{ fontWeight: 600, color: "var(--sr-ink)" }}>
                {t("services.arrivalOuterWindow", "60–90 min.")}
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>

      {/* ── 5. Payment methods ────────────────────────────────────── */}
      <Box component="section" sx={{ marginBottom: { xs: 5, md: 7 } }}>
        <SectionTitle
          eyebrow={t("pricing.payment.eyebrow", "Payment")}
          title={t("pricing.payment.title", "Accepted methods")}
        />
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            background: "var(--sr-panel)",
            border: `1px solid ${neutrals.n200}`,
            borderRadius: "16px",
            padding: "16px 20px",
          }}
        >
          {PAYMENT_METHODS.map((p, idx) => (
            <Box
              key={p.label}
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                padding: "6px 0",
                borderTop: idx === 0 ? "none" : `1px solid ${neutrals.n200}`,
              }}
            >
              <Box
                component="span"
                sx={{
                  fontFamily: fonts.body,
                  fontSize: 14,
                  fontWeight: 600,
                  color: grays.g900,
                }}
              >
                {p.label}
              </Box>
              {p.note && (
                <Box
                  component="span"
                  sx={{
                    fontFamily: fonts.body,
                    fontSize: 12,
                    fontWeight: 500,
                    color: grays.g500,
                    letterSpacing: "0.02em",
                  }}
                >
                  {p.note}
                </Box>
              )}
            </Box>
          ))}
        </Box>
      </Box>

      {/* ── 6. Cancellation & Discretion ──────────────────────────── */}
      <Box component="section" sx={{ marginBottom: { xs: 5, md: 8 } }}>
        <SectionTitle
          eyebrow={t("pricing.notes.eyebrow", "Notes")}
          title={t("pricing.notes.title", "Cancellation & Discretion")}
        />
        <Box
          component="ul"
          sx={{
            listStyle: "none",
            margin: 0,
            padding: 0,
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          }}
        >
          {[
            t(
              "pricing.notes.cancel",
              "Cancellations more than one hour before the session are complimentary · shorter notice may incur the travel fee.",
            ),
            t(
              "pricing.notes.privacy",
              "Every booking is confidential · practitioners arrive discreetly and never carry visible branding.",
            ),
          ].map((line, idx) => (
            <Box
              component="li"
              key={idx}
              sx={{
                display: "flex",
                gap: "10px",
                fontFamily: fonts.body,
                fontSize: 13,
                fontWeight: 400,
                color: grays.g600,
                lineHeight: 1.6,
              }}
            >
              <Box component="span" aria-hidden sx={{ color: grays.g400 }}>
                ·
              </Box>
              <Box component="span">{line}</Box>
            </Box>
          ))}
        </Box>
      </Box>

      {/* ── 7. Bottom CTA band ────────────────────────────────────── */}
      <Box
        component="section"
        sx={{
          background: neutrals.n100,
          border: `1px solid ${neutrals.n200}`,
          borderRadius: "24px",
          padding: { xs: "32px 24px", md: "48px 40px" },
          textAlign: "center",
        }}
      >
        <Box
          component="h2"
          sx={{
            fontFamily: fonts.heading,
            fontSize: { xs: 26, md: 36 },
            fontWeight: 500,
            lineHeight: 1.15,
            letterSpacing: "-0.005em",
            color: grays.g900,
            margin: 0,
          }}
        >
          {t("pricing.finalCta.title", "Ready when you are")}
        </Box>
        <Box
          sx={{
            fontFamily: fonts.body,
            fontSize: { xs: 13, md: 14 },
            fontWeight: 400,
            color: grays.g600,
            lineHeight: 1.6,
            marginTop: "10px",
            maxWidth: 500,
            marginLeft: "auto",
            marginRight: "auto",
          }}
        >
          {t(
            "pricing.finalCta.body",
            "Message the concierge with your preferred time and room number · we confirm your booking in minutes.",
          )}
        </Box>
        {/* 🆕 28w.30 (founder: "Reach us ย้ายไปแทนปุ่ม") — replaced the
            Contact Concierge / Back to Home buttons with the concierge tiles
            (WhatsApp covers the old Contact CTA) + Telegram subscribe. */}
        <Box sx={{ display: "flex", gap: 1, marginTop: "28px" }}>
          {CHANNELS.map(({ Icon, name, href, tone, aria }) => (
            <Box
              key={name}
              component="a"
              href={href}
              aria-label={aria}
              {...(href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              sx={{
                flex: 1,
                textDecoration: "none",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
                py: "14px",
                borderRadius: "14px",
                background: "var(--sr-panel)",
                border: "1px solid var(--sr-hairline)",
                boxShadow: "var(--sr-card-shadow)",
                transition: "border-color 200ms ease, transform 200ms ease",
                "&:hover": { borderColor: tone, transform: "translateY(-2px)" },
                "&:focus-visible": { outline: `2px solid ${ROSE}`, outlineOffset: 3 },
                "& svg": { fontSize: 24, color: tone },
              }}
            >
              <Icon />
              <Box sx={{ fontFamily: fonts.body, fontSize: 10, fontWeight: 700, color: "var(--sr-muted)", letterSpacing: "0.03em" }}>
                {name}
              </Box>
            </Box>
          ))}
        </Box>
        <Box sx={{ display: "flex", justifyContent: "center", mt: 1.75 }}>
          <Box
            component="a"
            href={CONCIERGE.telegramChannelUrl}
            target="_blank"
            rel="noopener noreferrer"
            sx={{
              fontFamily: fonts.body,
              fontSize: 12,
              fontWeight: 600,
              color: "var(--sr-muted)",
              textDecoration: "none",
              letterSpacing: "0.02em",
              "&:hover": { color: ROSE },
              "&:focus-visible": { outline: `2px solid ${ROSE}`, outlineOffset: 3 },
            }}
          >
            {t("services.subscribeTelegram", "Subscribe to our Telegram channel")}
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default PricingPage;
