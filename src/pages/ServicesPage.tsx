// src/pages/ServicesPage.tsx
//
// 🆕 Rounds 28r92 → 28r102 (2026-07-13)
//   • r92 Editorial masthead (Rates & Rituals / Our Signature Experiences)
//   • r92 Featured hero card + horizontal 3-cell rate grid
//   • r93 More Rituals: vertical stack of horizontal cards (image-left)
//   • r95 Masthead moved to page-level (above tabs)
//   • r96 Tab dividers · r97 responsive hero height · r98 motion + no glow
//   • r99 PREMIUM badge on Therapeutic · r101 rose divider
//   • r102 Audit sweep: masthead scoped to Services tab, reduced-motion
//     guard, grid safety, i18n keys wired, semantic heading cleanup,
//     tabpanel landmarks, external-link indicator, dead code removed.
// ─────────────────────────────────────────────────────────────────────

import React from "react";
import { Box, Typography } from "@mui/material";
import { useSearchParams } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { useTranslation } from "react-i18next";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import BestsellerRibbon from "@/components/common/BestsellerRibbon";
// 🆕 Round 28r90 (r89 audit finding #1) — swap the raw catalog import for
//   the live-config helpers so admin edits in /admin/promotions
//   (name/desc/image/detail overrides, custom services, enabled toggle,
//   display order) actually flow to the customer surface. Prior to r90,
//   only `priceForDuration` picked up admin overrides — everything else
//   was frozen to the compile-time catalog.
import {
  getAllServices,
  getServiceById,
} from "@/utils/serviceCatalog";
import type { MassageService } from "@/data/services";
import {
  durationsFor,
  isServiceEnabled,
  getLiveServiceOrder,
} from "../utils/servicePricing";
// 🆕 28w.32 — re-render when the async admin image/config override lands so
//   the cards show the same uploaded photos as the booking flow.
import { useServiceConfigVersion } from "@/hooks/useServiceConfigVersion";
import HowItWorks from "@/components/home/HowItWorks";
import BundleSection from "@/components/common/BundleSection";
import { useDocumentMeta, langToLocale } from "@/utils/useDocumentMeta";
import { enhanceImage } from "@/utils/cloudinary";
import { responsiveShell } from "@/theme/breakpoints";
import { CONCIERGE } from "@/config/concierge";
import { accents, gradients } from "@/theme";
import { FaLine, FaTelegramPlane, FaWeixin, FaWhatsapp } from "react-icons/fa";
import VerifiedRoundedIcon from "@mui/icons-material/VerifiedRounded";
import VisibilityOffRoundedIcon from "@mui/icons-material/VisibilityOffRounded";
import LocalHotelRoundedIcon from "@mui/icons-material/LocalHotelRounded";
import SupportAgentRoundedIcon from "@mui/icons-material/SupportAgentRounded";
import LocationOnRoundedIcon from "@mui/icons-material/LocationOnRounded";
import AccessTimeRoundedIcon from "@mui/icons-material/AccessTimeRounded";
import LanguageRoundedIcon from "@mui/icons-material/LanguageRounded";

// ─── Palette tokens ────────────────────────────────────────────────
const SERIF         = '"Playfair Display", "Fraunces", Georgia, serif';
const SANS          = '"Sarabun", "Inter", system-ui, -apple-system, sans-serif';
const ROSE          = "#FF9999";
const ROSE_GRADIENT = "linear-gradient(135deg,#FF9999 0%,#FF9999 100%)";
const BESTSELLER_ID = "SR-HJ2200";

// ─── Remaining services order (bestseller shown separately at top) ─
const REST_ORDER = ["xSR-Thai", "SR-Aroma", "SR-B2B3200"] as const;

// 🆕 28r102 — SERVICE_TYPE_TAG kept as fallback map only.  Real
//   copy now lives in locale JSON under `services.type.<id>`; the
//   values below match the English fallback strings so a missing
//   locale key doesn't render an empty subtitle.
const SERVICE_TYPE_TAG: Record<string, string> = {
  "xSR-Thai":   "Traditional",
  "SR-Aroma":   "Relaxing",
  "SR-HJ2200":  "Signature",
  "SR-B2B3200": "Specialised",
};

// Thai subtitle per service — only rendered when the active locale is
// `th`.  Non-Thai users don't see this line (L5 audit finding).
const SERVICE_TH_TAG: Record<string, string> = {
  "xSR-Thai":   "การนวดแผนไทย",
  "SR-Aroma":   "การนวดอโรมา",
  "SR-HJ2200":  "เจนเทิลแมน ซิกเนเจอร์",
  "SR-B2B3200": "ซันเรด เธอราพิวติก",
};

// ─── About pillars ─────────────────────────────────────────────────
// 🆕 Round 28r102 (r101 audit finding L4) — stable ids added so the
//   i18n key `services.pillar.<id>.{title,body}` stays intact even if
//   the English default title is later reworded. Tone tokens unchanged
//   from r90.
const ABOUT_PILLARS = [
  {
    id: "verified",
    Icon: VerifiedRoundedIcon,
    title: "Verified practitioners",
    body: "Each profile is personally vetted: photographs, identification, and credential checks before publication.",
    tone: { bg: "rgba(87,184,139,0.14)", fg: accents.availableText },
  },
  {
    id: "discreet",
    Icon: VisibilityOffRoundedIcon,
    title: "Discreet & private",
    body: "Plain-card payments, encrypted reservations, no signage upon arrival. Your stay remains yours.",
    tone: { bg: "rgba(217,124,149,0.12)", fg: ROSE },
  },
  {
    id: "outcall",
    Icon: LocalHotelRoundedIcon,
    title: "Hotel & residence outcall",
    body: "Your practitioner arrives anywhere in central Bangkok: Sukhumvit, Silom, Asok, Thonglor, Sathorn.",
    tone: { bg: "rgba(244,197,66,0.14)", fg: accents.amber },
  },
  {
    id: "concierge",
    Icon: SupportAgentRoundedIcon,
    title: "24/7 concierge",
    body: "A real concierge on WhatsApp, LINE, and Telegram around the clock, before, during, and after each session.",
    tone: { bg: "rgba(183,168,150,0.16)", fg: "#B7A896" },
  },
];

// ─── Section eyebrow ───────────────────────────────────────────────
// 🆕 Round 28r102 (r101 audit finding M1/M6) — reverted from <h2> to
//   <p>: eyebrow is decorative, actual section heading is the inner
//   card title (Service area, Reach us, About · Our Promise etc.) at
//   <h2>.  Fixes duplicate-h2 stack on About tab.
const SectionEyebrow: React.FC<{ label: string }> = ({ label }) => (
  <Box sx={{ display: "flex", alignItems: "center", gap: "8px", mb: 1.25, px: "4px" }}>
    <Box aria-hidden sx={{ width: 3, height: 16, borderRadius: 2, background: ROSE_GRADIENT, flexShrink: 0 }} />
    <Typography
      component="p"
      sx={{
        fontFamily: SANS,
        fontSize: 10.5,
        fontWeight: 800,
        letterSpacing: "0.22em",
        textTransform: "uppercase",
        color: ROSE,
        lineHeight: 1,
      }}
    >
      {label}
    </Typography>
  </Box>
);

// ─── Concierge channels data ───────────────────────────────────────
// 🆕 Round 28r90 (r89 audit finding #4) — Telegram tile URL fixed
//   (was `t.me/SunRedvip_bkk` — a non-existent handle) via the new
//   CONCIERGE.telegramChannelUrl constant. Aria-labels added for
//   icon-only tile a11y (finding G).
const CHANNELS = [
  { Icon: FaWhatsapp,     name: "WhatsApp", href: CONCIERGE.whatsappUrl,          tone: "#25D366", aria: "Reserve on WhatsApp" },
  { Icon: FaTelegramPlane,name: "Telegram", href: CONCIERGE.telegramChannelUrl,   tone: "#229ED9", aria: "Reserve on Telegram" },
  { Icon: FaLine,         name: "LINE",     href: CONCIERGE.lineUrl,               tone: "#06C755", aria: "Reserve on LINE" },
  { Icon: FaWeixin,       name: "WeChat",   href: "/wechat-scan",                  tone: "#07C160", aria: "Reserve on WeChat" },
];

// ─── Main component ────────────────────────────────────────────────
const ServicesPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { t, i18n } = useTranslation();
  // 🆕 28r102 (r101 audit H2) — respect prefers-reduced-motion for
  //   the Ken Burns loop + card entrance animations.
  const prefersReducedMotion = useReducedMotion();
  const initialTab =
    searchParams.get("tab") === "how"
      ? "how"
      : searchParams.get("tab") === "about"
        ? "about"
        : "services";
  const [section, setSection] = React.useState<"services" | "about" | "how">(initialTab);

  // 🆕 Round 28x.99h — audit finding: this used to hardcode an English-only
  //   generic title/description, so hydration overwrote the localized,
  //   keyword-rich prerendered <title> from scripts/prerender-routes.mjs
  //   on EVERY locale's /services shell (zh, zh-TW, ja, ko included), not
  //   just English. Now sourced from the SAME copy via i18n.ts's
  //   meta.services.* keys — keep those in sync with prerender-routes.mjs
  //   LOC.servicesTitle/servicesDesc.
  useDocumentMeta({
    title: t(
      "meta.services.title",
      "Outcall Massage Services in Bangkok · Thai, Aromatherapy & More | SunRed"
    ),
    description: t(
      "meta.services.description",
      "Browse SunRed's outcall massage menu delivered to your Bangkok hotel — Traditional Thai (฿1,200), Aromatherapy (฿1,600), Gentleman's Signature (฿2,200) and the premium Therapeutic Experience (฿3,200). 60/90/120 min. EN/中文/日本語/한국어, 24/7."
    ),
    url: "https://sunred.vip/services",
    type: "website",
    locale: langToLocale(i18n.language),
  });

  // 🆕 Round 28r90 (r89 audit finding #1) — Live-config wired:
  //   1. `getAllServices()` returns hardcoded catalog + admin-created
  //      custom services (r28s301).
  //   2. Each row is passed through `getServiceById()` which applies
  //      admin name/desc/image/detail/benefit overrides (r28s302).
  //   3. `isServiceEnabled()` filters out any admin-disabled SKU
  //      (r28s300), so a disable toggle in /admin/promotions makes the
  //      card vanish from the customer roladex.
  //   4. `getLiveServiceOrder()` — if the admin has set a display order,
  //      it wins; otherwise falls back to the r89 REST_ORDER + bestseller
  //      pinning behaviour.
  // 🆕 28w.32 — bump on live-config apply so the memo below recomputes when
  //   the admin image/order override loads after mount (was frozen with []).
  const cfgVersion = useServiceConfigVersion();
  const liveServices: MassageService[] = React.useMemo(() => {
    return getAllServices()
      .filter((s) => isServiceEnabled(s.id))
      .map((s) => getServiceById(s.id) ?? s);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cfgVersion]);

  const bestseller = React.useMemo(
    () => liveServices.find((s) => s.id === BESTSELLER_ID),
    [liveServices]
  );

  const restServices = React.useMemo(() => {
    const adminOrder = getLiveServiceOrder();
    const rest = liveServices.filter((s) => s.id !== BESTSELLER_ID);
    if (adminOrder.length > 0) {
      return [...rest].sort((a, b) => {
        const ai = adminOrder.indexOf(a.id);
        const bi = adminOrder.indexOf(b.id);
        if (ai === -1 && bi === -1) return 0;
        if (ai === -1) return 1;
        if (bi === -1) return -1;
        return ai - bi;
      });
    }
    return [...rest].sort((a, b) => {
      const ai = REST_ORDER.indexOf(a.id as (typeof REST_ORDER)[number]);
      const bi = REST_ORDER.indexOf(b.id as (typeof REST_ORDER)[number]);
      if (ai === -1 && bi === -1) return 0;
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });
  }, [liveServices]);

  return (
    <Box
      sx={{
        ...responsiveShell,
        minHeight: "100vh",
        background: "var(--sr-bg)",
        borderRadius: { xs: "28px", md: 0 },
        overflow: "hidden",
        boxShadow: { xs: "0 20px 60px rgba(15,23,42,0.08)", md: "none" },
        position: "relative",
        // 🆕 28r108 (founder "พื้นที่ด้านล้างเหลือเยอะมาก · ทั้ง 3 แถบ") —
        //   trimmed pb from 10+12 (176px combined) to 4+2 (~48px total)
        //   so the last tab section sits just above the bottom nav.
        pb: 4,
        fontFamily: SANS,
      }}
    >
      <Box sx={{ width: "100%", pb: 2 }}>

        {/* ─── Editorial masthead — Services tab ONLY ───────────────
            🆕 28r102 (r101 audit B1) — masthead is Services-specific
            copy ("Rates & Rituals · Our Signature Experiences") so it
            only renders on the Services tab.  About + How-to-Book get
            their own headings inside their tab bodies.
            Motion (r98): whole block fades up, three lines cascade via
            stagger.  H1 audit finding: removed stray `m: 0` shorthand
            that was nuking `mb` / `mx` from earlier `sx` entries.  */}
        {section === "services" && (
          <Box
            component={motion.div}
            initial="hidden"
            animate="visible"
            variants={{
              hidden: {},
              visible: { transition: { staggerChildren: 0.14, delayChildren: 0.05 } },
            }}
            sx={{ textAlign: "center", mt: 3, mb: 2.5, px: 2 }}
          >
            <Box
              component={motion.p}
              variants={{
                hidden: { opacity: 0, y: 10 },
                visible: {
                  opacity: 1,
                  y: 0,
                  transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
                },
              }}
              sx={{
                fontFamily: SANS,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.24em",
                textTransform: "uppercase",
                color: ROSE,
                mb: 1.25,
              }}
            >
              {t("services.editorialEyebrow", "Rates & Rituals")}
            </Box>
            <Box
              component={motion.h1}
              variants={{
                hidden: { opacity: 0, y: 14 },
                visible: {
                  opacity: 1,
                  y: 0,
                  transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] },
                },
              }}
              sx={{
                fontFamily: SERIF,
                fontSize: { xs: 32, md: 40 },
                fontWeight: 500,
                color: "var(--sr-ink)",
                letterSpacing: "-0.02em",
                lineHeight: 1.05,
                mt: 1.25,
                mb: 1.75,
              }}
            >
              {t("services.editorialLine1", "Our")}{" "}
              <Box
                component="em"
                sx={{ fontStyle: "italic", color: ROSE, fontWeight: 500 }}
              >
                {t("services.editorialAccent", "Signature")}
              </Box>
              <Box component="br" />
              {t("services.editorialLine2", "Experiences")}
            </Box>
            <Box
              component={motion.p}
              variants={{
                hidden: { opacity: 0, y: 10 },
                visible: {
                  opacity: 1,
                  y: 0,
                  transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
                },
              }}
              sx={{
                fontFamily: SANS,
                fontSize: 13,
                color: "var(--sr-muted)",
                lineHeight: 1.5,
                maxWidth: 340,
                mx: "auto",
                mt: 0.5,
              }}
            >
              {t(
                "services.editorialSub",
                "Every ritual is delivered to your Bangkok hotel · concierge confirms in minutes"
              )}
            </Box>
          </Box>
        )}

        {/* ─── Tab strip (under masthead) ─────────────────────────── */}
        <Box
          sx={{
            mt: 2.5, mx: 2, p: "4px",
            borderRadius: 999,
            background: "var(--sr-panel)",
            border: "1px solid var(--sr-hairline)",
            display: "flex",
            position: "relative",
          }}
          role="tablist"
        >
          {(
            [
              { value: "services", label: t("services.tab.services", "Services") },
              { value: "about",    label: t("services.tab.about",    "About") },
              { value: "how",      label: t("services.tab.how",      "How to Book") },
            ] as const
          ).map((tab) => {
            const isActive = section === tab.value;
            return (
              <Box
                key={tab.value}
                component="button"
                role="tab"
                id={`sr-tab-${tab.value}`}
                aria-selected={isActive}
                aria-controls={`sr-panel-${tab.value}`}
                onClick={() => setSection(tab.value)}
                sx={{
                  flex: 1,
                  position: "relative",
                  // 🆕 Round 28r90 (r89 audit finding G) — 38 → 44 to hit
                  //   the WCAG 2.5.5 minimum tap target.
                  height: 44,
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: SANS,
                  fontSize: 12,
                  fontWeight: 600,
                  letterSpacing: "0.04em",
                  color: isActive ? "#fff" : "var(--sr-muted)",
                  transition: "color 0.25s ease",
                  // 🆕 Round 28r96 (founder 2026-07-12) — short vertical
                  //   hairline between tabs ("เพิ่ม เส้นกั้น Services│
                  //   About │ How to Book").  Rendered as a ::after on all
                  //   tabs except the last; hidden when the current tab
                  //   is active so it doesn't clash with the rose pill.
                  "&:not(:last-of-type)::after": {
                    content: '""',
                    position: "absolute",
                    right: 0,
                    top: "50%",
                    transform: "translateY(-50%)",
                    width: "1px",
                    height: 20,
                    background: "var(--sr-hairline)",
                    opacity: isActive ? 0 : 0.7,
                    transition: "opacity 0.2s ease",
                    pointerEvents: "none",
                  },
                  "&:focus-visible": { outline: `2px solid ${ROSE}`, outlineOffset: -2, borderRadius: 999 },
                }}
              >
                {isActive && (
                  <Box
                    component={motion.span}
                    layoutId="svcTabPill"
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                    sx={{
                      position: "absolute", inset: 0, borderRadius: 999,
                      background: ROSE_GRADIENT,
                      // 🆕 28r98 (founder 2026-07-12) — no glow on buttons.
                      zIndex: 0,
                    }}
                  />
                )}
                <Box component="span" sx={{ position: "relative", zIndex: 1 }}>{tab.label}</Box>
              </Box>
            );
          })}
        </Box>

        {/* ═══════════════════════════════════════════════════════════
            SERVICES TAB
        ═══════════════════════════════════════════════════════════ */}
        {section === "services" && (
          <Box
            role="tabpanel"
            id="sr-panel-services"
            aria-labelledby="sr-tab-services"
            sx={{ display: "flex", flexDirection: "column", mt: 3, px: 2, gap: 0 }}
          >

            {/* ── Featured hero card (Approach 3 · founder pick 28r92) ──
                Full-width hero image at the very top of the card (gradient
                scrim baked in), amber BESTSELLER pill floating top-right,
                a "MOST REQUESTED THIS MONTH" rose eyebrow inside the
                content section, then name / desc / horizontal 3-cell rate
                grid / rose CTA.  Content order matches the founder
                Approach 3 mockup screenshots verbatim. */}
            {bestseller && (() => {
              return (
                <React.Fragment>
                {/* ── Editorial per-item eyebrow · ━━ BESTSELLER pill ━━
                    🆕 28r113 (founder "ปรับแต่งเหมือนกันทุกป้าย · More
                    Rituals ไม่เอา · เอา ตามที่สั่ง") — every ritual now
                    gets its own line-flanked eyebrow.  BESTSELLER slot
                    holds an amber pill; RITUAL · 02/03/04 use text.
                    Floating pills on the images have been removed. */}
                <Box
                  component={motion.div}
                  initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-30px" }}
                  transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1.25,
                    mb: 1.25,
                    mt: 0.5,
                    px: "4px",
                  }}
                >
                  {/* 🆕 28w.87 (founder: "services เพิ่ม ป้าย แบบ นี้ เมนูแนะนำด้วย")
                      — the recommended ritual now carries the SAME shimmering gold
                      corner ribbon as /pricing (rendered on the card below). The
                      flat amber pill that used to sit here said the same word in a
                      different visual language, so it was dropped rather than
                      stacked on top of the ribbon. The line-flanked eyebrow slot
                      stays for the ritual label. */}
                  <Box aria-hidden sx={{ flex: 1, height: 1, background: "rgba(217,124,149,0.45)" }} />
                  <Box
                    sx={{
                      fontFamily: SANS,
                      fontSize: 10.5,
                      fontWeight: 800,
                      letterSpacing: "0.18em",
                      textTransform: "uppercase",
                      color: ROSE,
                    }}
                  >
                    {t("services.mostRequested", "Most requested")}
                  </Box>
                  <Box aria-hidden sx={{ flex: 1, height: 1, background: "rgba(217,124,149,0.45)" }} />
                </Box>

                <Box
                  component={motion.a}
                  href={`/services/${bestseller.id}`}
                  aria-label={t("services.detailsAria", "Details for {{name}}", { name: bestseller.name })}
                  initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1], delay: 0.35 }}
                  sx={{
                    // 🆕 28r120 (founder "Gentleman's + ทุกเมนู เชื่อมไป
                    //   /services/<id>") — featured card was a motion.div
                    //   with no route; now a motion.a linking to its own
                    //   detail page, matching the rest cards.
                    display: "block",
                    textDecoration: "none",
                    color: "inherit",
                    position: "relative",
                    mb: 2.5,
                    borderRadius: "22px",
                    background: "var(--sr-panel)",
                    border: `1.5px solid ${ROSE}`,
                    // 🆕 28r98 — no rose glow ring; standard shadow only.
                    boxShadow: "var(--sr-card-shadow)",
                    overflow: "hidden",
                    // 🆕 28r102 (r101 audit M4) — single CSS hover instead of
                    //   framer whileHover + CSS hover race. Also (r101 L1)
                    //   swapped raw rgba hover shadow for tokens so
                    //   dark/light modes get appropriate elevation.
                    transition: "transform 0.28s ease, box-shadow 0.4s ease",
                    "@media (hover: hover)": {
                      "&:hover": {
                        transform: "translateY(-4px)",
                        boxShadow: "var(--sr-card-shadow)",
                      },
                    },
                    "&:focus-visible": {
                      outline: `2px solid ${ROSE}`,
                      outlineOffset: 3,
                    },
                    // 🆕 28r102 (r101 audit H2) — Ken Burns is gated on
                    //   prefers-reduced-motion.  Scoped selector uses a
                    //   data-attribute (r101 N3) to avoid global class name
                    //   collision.
                    "@media (prefers-reduced-motion: no-preference)": {
                      '& [data-sr-fx="hero"]': {
                        transform: "scale(1.04)",
                        animation: "sr-kenburns 16s ease-in-out infinite alternate",
                      },
                      // 🆕 28r111 — Y-drift eased from -2% to +0.6% so the
                      //   pan reveals more of the top (face area) rather
                      //   than pushing it out of frame.
                      "@keyframes sr-kenburns": {
                        "0%":   { transform: "scale(1.04) translate3d(0,0,0)" },
                        "100%": { transform: "scale(1.10) translate3d(0,0.6%,0)" },
                      },
                    },
                  }}
                >
                  {/* 🆕 28w.87 — the shimmering gold corner ribbon the founder
                      pointed at on /pricing, now on the recommended ritual here
                      too. Shared component, so the two surfaces cannot drift.
                      The card above already sets position:relative +
                      overflow:hidden, which the ribbon needs to clip cleanly at
                      the corner. */}
                  {/* Label is the shared translated string, NOT `bestseller.badge`.
                      That field holds a raw catalog value ("RECOMMEND") which is
                      (a) untranslated — a Japanese guest would read English on an
                      otherwise-Japanese page — and (b) a different word from the
                      ribbon on /pricing for the very same service. One service,
                      one badge, in the guest's language. */}
                  <BestsellerRibbon label={t("services.bestseller", "Bestseller")} />

                  {/* Hero image — natural full display (no crop)
                      🆕 28r116 (founder "services ทุกเมนู เห็น รูปเต็มใบ")
                      — swapped 4:3 cover crop for a plain <img> at
                      natural aspect ratio.  Each service card now shows
                      its full uploaded photo without cropping the face,
                      subject, or product shot.  Height adapts per image. */}
                  {bestseller.image && (
                    <Box sx={{ position: "relative", width: "100%", overflow: "hidden" }}>
                      <Box
                        component="img"
                        src={enhanceImage(bestseller.image, { variant: "hero" })}
                        alt=""
                        data-sr-fx="hero"
                        loading="eager"
                        fetchPriority="high"
                        sx={{
                          display: "block",
                          width: "100%",
                          height: "auto",
                          willChange: "transform",
                        }}
                      />
                      <Box
                        aria-hidden
                        sx={{
                          position: "absolute",
                          inset: 0,
                          background:
                            "linear-gradient(180deg, rgba(0,0,0,0) 68%, rgba(0,0,0,0.22) 100%)",
                          pointerEvents: "none",
                        }}
                      />
                    </Box>
                  )}

                  {/* Content section */}
                  <Box sx={{ p: "20px 20px 22px" }}>
                    {/* 🆕 28r113 — "Most requested this month" internal
                        rose eyebrow removed; the BESTSELLER label above
                        the card already communicates this. */}

                    {/* Name */}
                    <Typography
                      component="h2"
                      sx={{
                        fontFamily: SERIF,
                        fontSize: 26,
                        fontWeight: 500,
                        color: "var(--sr-ink)",
                        letterSpacing: "-0.015em",
                        lineHeight: 1.1,
                        mt: 0.75,
                        mb: 0.5,
                      }}
                    >
                      {bestseller.name}
                    </Typography>

                    {/* Thai · type tag
                        🆕 28r102 (r101 audit L5 + H5) — Thai subtitle only
                        renders when active locale is `th`. Type tag pulled
                        from locale (`services.type.<id>`) with fallback
                        to English constant map. */}
                    <Typography
                      sx={{
                        fontFamily: SANS,
                        fontSize: 12,
                        color: "var(--sr-muted)",
                        mb: 1.5,
                        letterSpacing: "0.01em",
                      }}
                    >
                      {i18n.language === "th" && `${SERVICE_TH_TAG[bestseller.id]} · `}
                      {t(`services.type.${bestseller.id}`, SERVICE_TYPE_TAG[bestseller.id] ?? "")}
                    </Typography>

                    {/* Desc */}
                    <Typography
                      sx={{
                        fontFamily: SANS,
                        fontSize: 13.5,
                        color: "var(--sr-body)",
                        lineHeight: 1.55,
                        mb: 2.25,
                      }}
                    >
                      {bestseller.desc}
                    </Typography>

                    {/* 🆕 28r113 (founder "Unlock Executive Benefits
                        เปลี่ยน View full pricing ไว้ ใต้สุด ของ เมนู") —
                        both per-card buttons removed.  A single
                        'View full pricing' primary button now lives at
                        the bottom of the whole services list. */}
                  </Box>
                </Box>
                </React.Fragment>
              );
            })()}

            {/* 🆕 28r113 — "More Rituals" divider removed per founder
                direction.  Each mini card below now has its own
                ━━ RITUAL · XX ━━ eyebrow, unified with the BESTSELLER
                eyebrow above the featured card. */}

            {/* ── Vertical stack of horizontal-layout ritual cards ──
                🆕 Round 28r93 · founder screenshot pattern (2026-07-12)
                "More Rituals เป็นแนวนอน ตาม แบบ" — cards laid out
                horizontally *within themselves*: square image on the left,
                text column on the right (bold name / "60 min · Type"
                subtitle / bold from-price).  The list itself stacks
                vertically — no snap-scroll.  Whole card is one <a> tag,
                so tapping anywhere routes to the service detail page. */}
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5, mb: 3 }}>
              {restServices.map((svc, index) => {
                const firstDur = durationsFor(svc)[0];
                // 🆕 28r113 — per-item numbered eyebrow (Ritual · 02/03/04).
                //   Bestseller sits above these at "01" implicitly.
                const ritualNumber = String(index + 2).padStart(2, "0");
                return (
                  <Box key={svc.id}>
                    {/* ── Editorial per-item eyebrow ─────────────────── */}
                    <Box
                      component={motion.div}
                      initial={prefersReducedMotion ? false : { opacity: 0, y: 6 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: "-30px" }}
                      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay: 0.05 + index * 0.06 }}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1.25,
                        mb: 1,
                        px: "4px",
                      }}
                    >
                      <Box aria-hidden sx={{ flex: 1, height: 1, background: "rgba(217,124,149,0.35)" }} />
                      <Typography
                        component="p"
                        sx={{
                          fontFamily: SANS,
                          fontSize: 10.5,
                          fontWeight: 800,
                          letterSpacing: "0.20em",
                          textTransform: "uppercase",
                          color: ROSE,
                          m: 0,
                        }}
                      >
                        {t("services.ritualNumbered", "Ritual · {{n}}", { n: ritualNumber })}
                      </Typography>
                      <Box aria-hidden sx={{ flex: 1, height: 1, background: "rgba(217,124,149,0.35)" }} />
                    </Box>

                    {/* ── Card · full-size, unified with featured layout ──
                        🆕 28r114 (founder "ให้ทุกเมนูนวด เหมือน Gentleman's
                        เลย · ไม่ต้องย่อเล็ก") — replaced horizontal mini
                        card (image-left / text-right) with the same
                        4:3 hero image + name + Thai/type + description
                        layout as the featured card.  Featured keeps its
                        rose border + Ken Burns as the visual differentiator;
                        these get a standard hairline. */}
                    <Box
                      component={motion.a}
                      href={`/services/${svc.id}`}
                      aria-label={t("services.detailsAria", "Details for {{name}}", { name: svc.name })}
                      initial={{ opacity: 0, y: 18 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: "-30px" }}
                      transition={{
                        delay: 0.15 + index * 0.10,
                        duration: 0.65,
                        ease: [0.22, 1, 0.36, 1],
                      }}
                      whileHover={{ y: -3 }}
                      sx={{
                        display: "block",
                        textDecoration: "none",
                        color: "inherit",
                        borderRadius: "22px",
                        background: "var(--sr-panel)",
                        border: "1px solid var(--sr-hairline)",
                        boxShadow: "var(--sr-card-shadow)",
                        overflow: "hidden",
                        transition: "transform 0.28s ease, box-shadow 0.4s ease, border-color 0.28s ease",
                        "@media (hover: hover)": {
                          "&:hover": {
                            transform: "translateY(-3px)",
                            boxShadow: "0 14px 32px rgba(0,0,0,0.28)",
                            borderColor: "rgba(217,124,149,0.4)",
                          },
                        },
                        "&:focus-visible": {
                          outline: `2px solid ${ROSE}`,
                          outlineOffset: 3,
                        },
                      }}
                    >
                      {/* Hero image — natural full display (no crop)
                          🆕 28r116 — see featured card comment above. */}
                      {svc.image && (
                        <Box sx={{ position: "relative", width: "100%", overflow: "hidden" }}>
                          <Box
                            component="img"
                            src={enhanceImage(svc.image, { variant: "hero" })}
                            alt=""
                            loading="lazy"
                            sx={{
                              display: "block",
                              width: "100%",
                              height: "auto",
                            }}
                          />
                          <Box
                            aria-hidden
                            sx={{
                              position: "absolute",
                              inset: 0,
                              background:
                                "linear-gradient(180deg, rgba(0,0,0,0) 68%, rgba(0,0,0,0.22) 100%)",
                              pointerEvents: "none",
                            }}
                          />
                        </Box>
                      )}

                      {/* Content section */}
                      <Box sx={{ p: "20px 20px 22px" }}>
                        <Typography
                          component="h2"
                          sx={{
                            fontFamily: SERIF,
                            fontSize: 26,
                            fontWeight: 500,
                            color: "var(--sr-ink)",
                            letterSpacing: "-0.015em",
                            lineHeight: 1.1,
                            mb: 0.5,
                          }}
                        >
                          {svc.name}
                        </Typography>

                        <Typography
                          sx={{
                            fontFamily: SANS,
                            fontSize: 12,
                            color: "var(--sr-muted)",
                            mb: 1.5,
                            letterSpacing: "0.01em",
                          }}
                        >
                          {i18n.language === "th" && `${SERVICE_TH_TAG[svc.id]} · `}
                          {t(`services.type.${svc.id}`, SERVICE_TYPE_TAG[svc.id] ?? "")}
                        </Typography>

                        <Typography
                          sx={{
                            fontFamily: SANS,
                            fontSize: 13.5,
                            color: "var(--sr-body)",
                            lineHeight: 1.55,
                          }}
                        >
                          {svc.desc}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                );
              })}
            </Box>

            {/* ── 🆕 28r113 · Single 'View full pricing' at bottom ────
                Founder: "Unlock Executive Benefits เปลี่ยน View full
                pricing ไว้ ใต้สุด ของ เมนู".  Replaces the two per-card
                buttons (Explore Prices + Unlock Executive Benefits) with
                one primary rose gradient CTA routing to /pricing at the
                bottom of the whole services list. */}
            <Box
              component="a"
              href="/pricing"
              aria-label={t("services.viewPricingAria", "View full pricing")}
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "100%",
                px: "24px",
                py: "14px",
                mt: 1,
                mb: 3,
                borderRadius: 999,
                background: gradients.primary,
                color: "#fff",
                textDecoration: "none",
                fontFamily: SANS,
                fontSize: 15,
                fontWeight: 700,
                letterSpacing: "0.01em",
                transition: "background 0.25s ease, transform 0.2s ease",
                "&:hover": {
                  background: gradients.primaryHover,
                  transform: "translateY(-1px)",
                },
                "&:focus-visible": {
                  outline: `2px solid ${ROSE}`,
                  outlineOffset: 3,
                },
              }}
            >
              {t("services.viewPricing", "View full pricing")}
            </Box>

            <BundleSection />

            {/* ── Areas & Timing ─────────────────────────────────── */}
            <Box sx={{ mt: 2.5 }}>
              <SectionEyebrow label={t("services.areasTiming", "Areas & Timing")} />
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
                    <Typography sx={{ fontFamily: SANS, fontSize: 13.5, fontWeight: 700, color: "var(--sr-ink)" }}>
                      {t("services.serviceArea", "Service area")}
                    </Typography>
                  </Box>
                  <Typography sx={{ fontFamily: SANS, fontSize: 12.5, lineHeight: 1.6, color: "var(--sr-body)" }}>
                    {t(
                      "services.serviceAreaBody",
                      "Sukhumvit · Silom · Asok · Thonglor · Sathorn · Phrom Phong · Ari · Chidlom · Ploenchit. Beyond the centre, our concierge provides a private quotation."
                    )}
                  </Typography>
                </Box>
                <Box aria-hidden sx={{ height: 1, background: "var(--sr-hairline)", mx: "18px" }} />
                <Box sx={{ padding: "14px 18px 16px" }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.75 }}>
                    <AccessTimeRoundedIcon sx={{ color: ROSE, fontSize: 18 }} />
                    <Typography sx={{ fontFamily: SANS, fontSize: 13.5, fontWeight: 700, color: "var(--sr-ink)" }}>
                      {t("services.arrivalWindow", "Arrival window")}
                    </Typography>
                  </Box>
                  <Typography sx={{ fontFamily: SANS, fontSize: 12.5, color: "var(--sr-body)", lineHeight: 1.55 }}>
                    {t("services.arrivalCentral", "Central Bangkok:")}{" "}
                    <Box component="span" sx={{ fontWeight: 600, color: "var(--sr-ink)" }}>
                      {t("services.arrivalCentralWindow", "30–60 min.")}
                    </Box>{" "}
                    {t("services.arrivalOuter", "Outer districts:")}{" "}
                    <Box component="span" sx={{ fontWeight: 600, color: "var(--sr-ink)" }}>
                      {t("services.arrivalOuterWindow", "60–90 min.")}
                    </Box>
                  </Typography>
                </Box>
              </Box>
            </Box>

            {/* ── Reach us — 4 icon tiles (สั้นลง) ──────────────── */}
            <Box sx={{ mt: 2.5 }}>
              <SectionEyebrow label={t("services.reachUs", "Reach us")} />
              <Box sx={{ display: "flex", gap: 1 }}>
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
                    <Typography sx={{ fontFamily: SANS, fontSize: 10, fontWeight: 700, color: "var(--sr-muted)", letterSpacing: "0.03em" }}>
                      {name}
                    </Typography>
                  </Box>
                ))}
              </Box>

              {/* TG channel subscribe */}
              {/* 🆕 Round 28r90 (r89 audit finding #4) — URL sourced from
                  CONCIERGE.telegramChannelUrl so both the Telegram tile
                  above AND this subscribe link land on the same channel. */}
              <Box sx={{ display: "flex", justifyContent: "center", mt: 1.25 }}>
                <Box
                  component="a"
                  href={CONCIERGE.telegramChannelUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{
                    fontFamily: SANS, fontSize: 12, fontWeight: 600,
                    color: "var(--sr-muted)", textDecoration: "none",
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
        )}

        {/* ═══════════════════════════════════════════════════════════
            ABOUT TAB
        ═══════════════════════════════════════════════════════════ */}
        {section === "about" && (
          <Box
            role="tabpanel"
            id="sr-panel-about"
            aria-labelledby="sr-tab-about"
            sx={{ px: 2, mt: 3, display: "flex", flexDirection: "column", gap: 2 }}
          >
            <SectionEyebrow label={t("services.aboutEyebrow", "About · Our Promise")} />

            <Box
              sx={{
                p: 2.5, borderRadius: "18px",
                background: "var(--sr-panel)",
                border: "1px solid var(--sr-hairline)",
                boxShadow: "var(--sr-card-shadow)",
              }}
            >
              <Typography
                component="h2"
                sx={{
                  fontFamily: SANS, fontSize: { xs: 17, sm: 19 }, fontWeight: 700,
                  color: "var(--sr-ink)", letterSpacing: "-0.01em", mb: 1, lineHeight: 1.3, mt: 0,
                  "& em": { color: ROSE, fontStyle: "italic", fontFamily: SERIF, fontWeight: 500 },
                }}
              >
                {t("services.aboutHeadPre", "Bangkok's most discreet outcall massage,")}{" "}
                <em>{t("services.aboutHeadEm", "delivered to you.")}</em>
              </Typography>
              <Typography sx={{ fontFamily: SANS, fontSize: { xs: 13, sm: 14 }, lineHeight: 1.65, color: "var(--sr-body)" }}>
                {t(
                  "services.aboutBody",
                  "SunRed is a private concierge for verified outcall wellness across central Bangkok. Each practitioner is personally screened, every reservation is handled by a real concierge, and every detail from arrival to payment remains entirely between you and us."
                )}
              </Typography>
            </Box>

            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {ABOUT_PILLARS.map(({ Icon, title, body, tone }) => (
                <Box
                  key={title}
                  sx={{
                    p: 1.5, borderRadius: "14px",
                    background: "var(--sr-panel)",
                    border: "1px solid var(--sr-hairline)",
                    boxShadow: "var(--sr-card-shadow)",
                    display: "flex", flexDirection: "row", alignItems: "flex-start", gap: 1.5,
                    transition: "border-color 200ms ease",
                    "&:hover": { borderColor: ROSE },
                  }}
                >
                  <Box
                    sx={{
                      width: 36, height: 36, borderRadius: "10px",
                      background: tone.bg, color: tone.fg,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      flexShrink: 0, "& svg": { fontSize: 20 },
                    }}
                  >
                    <Icon />
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontFamily: SANS, fontSize: 14, fontWeight: 700, color: "var(--sr-ink)", lineHeight: 1.25, mb: 0.4 }}>
                      {t(`services.pillar.${title}.title`, title)}
                    </Typography>
                    <Typography sx={{ fontFamily: SANS, fontSize: 12, lineHeight: 1.55, color: "var(--sr-body)" }}>
                      {t(`services.pillar.${title}.body`, body)}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Box>

            <Box
              sx={{
                p: 2, borderRadius: "16px",
                background: "var(--sr-panel)",
                border: "1px solid var(--sr-hairline)",
                boxShadow: "var(--sr-card-shadow)",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                <LanguageRoundedIcon sx={{ color: ROSE, fontSize: 18 }} />
                <Typography sx={{ fontFamily: SANS, fontSize: 14, fontWeight: 700, color: "var(--sr-ink)" }}>
                  {t("services.languages", "Languages supported")}
                </Typography>
              </Box>
              <Typography sx={{ fontFamily: SANS, fontSize: 12.5, lineHeight: 1.6, color: "var(--sr-body)" }}>
                {t(
                  "services.languagesBody",
                  "English · ไทย · 中文 · 日本語 · 한국어. Our concierge corresponds in your language, and many practitioners are fluent in two or more."
                )}
              </Typography>
            </Box>
          </Box>
        )}

        {/* ═══════════════════════════════════════════════════════════
            HOW TO BOOK TAB
        ═══════════════════════════════════════════════════════════ */}
        {section === "how" && (
          <Box role="tabpanel" id="sr-panel-how" aria-labelledby="sr-tab-how">
            <HowItWorks />
          </Box>
        )}

      </Box>
    </Box>
  );
};

export default ServicesPage;
