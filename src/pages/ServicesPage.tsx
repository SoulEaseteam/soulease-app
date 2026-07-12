// src/pages/ServicesPage.tsx
//
// 🆕 Round 28v.3
//   • Bestseller (SR-HJ2200) → featured card ด้านบนสุด + badge เด่น
//   • สีราคา + heading = #D97C95 (rose) ตาม theme.ts
//   • ลบปุ่ม Reserve CTA ออก
//   • "Reach us" → 4 icon tiles แนวนอน (สั้นลง)
// ─────────────────────────────────────────────────────────────────────

import React from "react";
import { Box, Typography } from "@mui/material";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
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
  formatTHB,
  priceForDuration,
  isServiceEnabled,
  getLiveServiceOrder,
} from "../utils/servicePricing";
import HowItWorks from "@/components/home/HowItWorks";
import BundleSection from "@/components/common/BundleSection";
import { useDocumentMeta } from "@/utils/useDocumentMeta";
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
const ROSE          = "#D97C95";
const ROSE_GRADIENT = "linear-gradient(135deg,#D97C95 0%,#C96F89 100%)";
const BESTSELLER_ID = "SR-HJ2200";

// ─── Remaining services order (bestseller shown separately at top) ─
const REST_ORDER = ["xSR-Thai", "SR-Aroma", "SR-B2B3200"] as const;

// One-word type tag
const SERVICE_TYPE_TAG: Record<string, string> = {
  "xSR-Thai":   "Traditional",
  "SR-Aroma":   "Relaxing",
  "SR-HJ2200":  "Signature",
  "SR-B2B3200": "Specialised",
};

// Thai subtitle per service
const SERVICE_TH_TAG: Record<string, string> = {
  "xSR-Thai":   "การนวดแผนไทย",
  "SR-Aroma":   "การนวดอโรมา",
  "SR-HJ2200":  "เจนเทิลแมน ซิกเนเจอร์",
  "SR-B2B3200": "ซันเรด เธอราพิวติก",
};

// ─── About pillars ─────────────────────────────────────────────────
// 🆕 Round 28r90 (r89 audit finding #10) — About-pillar accent hexes
//   (`#16a34a` green, `#0284C7` blue) replaced with documented theme
//   tokens. Green pillar → accents.availableText (#57B88B, the sitewide
//   "available" green). The two blue-accent pillars ended up rendering
//   the same colour on adjacent tiles pre-r90 — now split onto amber
//   (accents.amber) + warm-clay tokens so the tone-key varies.
const ABOUT_PILLARS = [
  {
    Icon: VerifiedRoundedIcon,
    title: "Verified practitioners",
    body: "Each profile is personally vetted — photographs, identification, and credential checks before publication.",
    tone: { bg: "rgba(87,184,139,0.14)", fg: accents.availableText },
  },
  {
    Icon: VisibilityOffRoundedIcon,
    title: "Discreet & private",
    body: "Plain-card payments, encrypted reservations, no signage upon arrival. Your stay remains yours.",
    tone: { bg: "rgba(217,124,149,0.12)", fg: ROSE },
  },
  {
    Icon: LocalHotelRoundedIcon,
    title: "Hotel & residence outcall",
    body: "Your practitioner arrives anywhere in central Bangkok — Sukhumvit, Silom, Asok, Thonglor, Sathorn.",
    tone: { bg: "rgba(244,197,66,0.14)", fg: accents.amber },
  },
  {
    Icon: SupportAgentRoundedIcon,
    title: "24/7 concierge",
    body: "A real concierge on WhatsApp, LINE, and Telegram around the clock — before, during, and after each session.",
    tone: { bg: "rgba(183,168,150,0.16)", fg: "#B7A896" },
  },
];

// ─── Section eyebrow ───────────────────────────────────────────────
// 🆕 Round 28r90 (r89 audit finding G) — semantic <h2> for screen readers.
const SectionEyebrow: React.FC<{ label: string }> = ({ label }) => (
  <Box sx={{ display: "flex", alignItems: "center", gap: "8px", mb: 1.25, px: "4px" }}>
    <Box aria-hidden sx={{ width: 3, height: 16, borderRadius: 2, background: ROSE_GRADIENT, flexShrink: 0 }} />
    <Typography
      component="h2"
      sx={{
        fontFamily: SANS,
        fontSize: 10.5,
        fontWeight: 800,
        letterSpacing: "0.22em",
        textTransform: "uppercase",
        color: ROSE,
        lineHeight: 1,
        m: 0,
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
  const { t } = useTranslation();
  const initialTab =
    searchParams.get("tab") === "how"
      ? "how"
      : searchParams.get("tab") === "about"
        ? "about"
        : "services";
  const [section, setSection] = React.useState<"services" | "about" | "how">(initialTab);

  useDocumentMeta({
    title: "Services · SunRed Bangkok Outcall Massage",
    description:
      "Choose your outcall massage in Bangkok — Thai, Aromatherapy, Gentleman's Signature, and SunRed Therapeutic. From ฿1,200, delivered to your hotel or residence.",
    url: "https://sunred.vip/services",
    type: "website",
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
  const liveServices: MassageService[] = React.useMemo(() => {
    return getAllServices()
      .filter((s) => isServiceEnabled(s.id))
      .map((s) => getServiceById(s.id) ?? s);
  }, []);

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
        pb: 10,
        fontFamily: SANS,
      }}
    >
      <Box sx={{ width: "100%", pb: 12 }}>

        {/* ─── Tab strip ─────────────────────────────────────────── */}
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
                aria-selected={isActive}
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
                      boxShadow: "0 4px 14px rgba(217,124,149,0.35)",
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
          <Box sx={{ display: "flex", flexDirection: "column", mt: 3, px: 2, gap: 0 }}>

            {/* Section heading */}
            {/* 🆕 Round 28r90 (r89 audit finding G · E) — semantic <h2>,
                i18n wrap, and count-aware plural via i18next. */}
            <Box sx={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", mb: 2 }}>
              <Typography
                component="h2"
                sx={{
                  fontFamily: SERIF,
                  fontSize: 20,
                  fontWeight: 700,
                  color: ROSE,
                  letterSpacing: "-0.01em",
                  lineHeight: 1.1,
                  m: 0,
                }}
              >
                {t("services.heading", "Our Services")}
              </Typography>
              <Typography sx={{ fontFamily: SANS, fontSize: 12, fontWeight: 600, color: "var(--sr-muted)" }}>
                {t("services.ritualCount", "{{count}} rituals", {
                  count: (bestseller ? 1 : 0) + restServices.length,
                })}
              </Typography>
            </Box>

            {/* ── Featured bestseller card (อยู่ด้านบนสุด) ─────────── */}
            {bestseller && (() => {
              const durations = durationsFor(bestseller);
              return (
                <Box
                  component={motion.div}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.38, ease: "easeOut" }}
                  sx={{
                    mb: 1.5,
                    borderRadius: "20px",
                    background: "var(--sr-panel)",
                    border: `1.5px solid ${ROSE}`,
                    boxShadow: `0 0 0 4px rgba(217,124,149,0.10), var(--sr-card-shadow)`,
                    overflow: "hidden",
                    transition: "transform 0.18s ease, box-shadow 0.18s ease",
                    "&:hover": { transform: "translateY(-2px)", boxShadow: `0 0 0 4px rgba(217,124,149,0.18), 0 10px 36px rgba(0,0,0,0.32)` },
                  }}
                >
                  {/* Rose header bar with BESTSELLER label */}
                  <Box
                    sx={{
                      background: ROSE_GRADIENT,
                      px: 2,
                      py: "7px",
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                    }}
                  >
                    <Box
                      component="span"
                      sx={{
                        fontSize: 13,
                        color: "rgba(255,255,255,0.85)",
                        lineHeight: 1,
                      }}
                    >
                      ★
                    </Box>
                    <Typography
                      sx={{
                        fontFamily: SANS,
                        fontSize: 10,
                        fontWeight: 900,
                        letterSpacing: "0.20em",
                        textTransform: "uppercase",
                        color: "#fff",
                        lineHeight: 1,
                      }}
                    >
                      Most Booked
                    </Typography>
                  </Box>

                  {/* Image — full width */}
                  {bestseller.image && (
                    <Box
                      sx={{
                        width: "100%",
                        height: 180,
                        background: `center / cover no-repeat url(${bestseller.image})`,
                      }}
                    />
                  )}

                  {/* Content */}
                  <Box sx={{ p: "18px 18px 20px" }}>
                    {/* Name */}
                    <Typography
                      sx={{
                        fontFamily: SERIF,
                        fontSize: 22,
                        fontWeight: 700,
                        color: "var(--sr-ink)",
                        lineHeight: 1.15,
                        mb: 0.4,
                      }}
                    >
                      {bestseller.name}
                    </Typography>

                    {/* Thai · type tag */}
                    <Typography
                      sx={{
                        fontFamily: SANS,
                        fontSize: 12,
                        color: "var(--sr-muted)",
                        mb: 1.25,
                        letterSpacing: "0.01em",
                      }}
                    >
                      {SERVICE_TH_TAG[bestseller.id]} · {SERVICE_TYPE_TAG[bestseller.id]}
                    </Typography>

                    {/* Desc */}
                    <Typography
                      sx={{
                        fontFamily: SANS,
                        fontSize: 13.5,
                        color: "var(--sr-body)",
                        lineHeight: 1.6,
                        mb: 2,
                      }}
                    >
                      {bestseller.desc}
                    </Typography>

                    {/* Duration table */}
                    <Box
                      sx={{
                        borderRadius: "14px",
                        background: "rgba(217,124,149,0.07)",
                        border: "1px solid rgba(217,124,149,0.18)",
                        overflow: "hidden",
                        mb: 2.25,
                      }}
                    >
                      {durations.map((d, i) => (
                        <React.Fragment key={d}>
                          {i > 0 && (
                            <Box sx={{ height: "1px", background: "rgba(217,124,149,0.14)", mx: 2 }} />
                          )}
                          <Box
                            sx={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              px: 2,
                              py: "13px",
                            }}
                          >
                            <Typography sx={{ fontFamily: SANS, fontSize: 14, color: "var(--sr-body)" }}>
                              {d} min
                            </Typography>
                            <Typography sx={{ fontFamily: SERIF, fontSize: 20, fontWeight: 700, color: ROSE }}>
                              {formatTHB(priceForDuration(bestseller, d))}
                            </Typography>
                          </Box>
                        </React.Fragment>
                      ))}
                    </Box>

                    {/* Reserve button */}
                    {/* 🆕 Round 28r90 (r89 audit findings #2 · #3 · G) —
                        colour unified to theme dusty-rose (was slate
                        #1A2B2E), copy unified to "Reserve" (was off-brand
                        "Unlock Executive Benefits"), and focus-visible
                        ring added for keyboard a11y. */}
                    <Box
                      component="a"
                      href={`/services/${bestseller.id}`}
                      aria-label={t("services.reserveAria", "Reserve {{name}}", { name: bestseller.name })}
                      sx={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "8px",
                        px: "24px",
                        py: "13px",
                        borderRadius: 999,
                        background: gradients.primary,
                        color: "#fff",
                        textDecoration: "none",
                        fontFamily: SANS,
                        fontSize: 15,
                        fontWeight: 700,
                        letterSpacing: "0.01em",
                        boxShadow: "0 6px 18px rgba(217,124,149,0.30)",
                        transition: "background 0.2s ease, box-shadow 0.2s ease, transform 0.15s ease",
                        "&:hover": {
                          background: gradients.primaryHover,
                          boxShadow: "0 8px 22px rgba(201,111,137,0.38)",
                          transform: "translateY(-1px)",
                        },
                        "&:focus-visible": {
                          outline: `2px solid ${ROSE}`,
                          outlineOffset: 3,
                        },
                      }}
                    >
                      {t("services.reserve", "Reserve")}
                    </Box>
                  </Box>
                </Box>
              );
            })()}

            {/* ── Remaining 3 service cards ──────────────────────── */}
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mb: 3 }}>
              {restServices.map((svc, index) => {
                const durations = durationsFor(svc);
                return (
                  <Box
                    key={svc.id}
                    component={motion.div}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.12 + index * 0.06, duration: 0.32, ease: "easeOut" }}
                    sx={{
                      borderRadius: "20px",
                      background: "var(--sr-panel)",
                      border: "1px solid var(--sr-hairline)",
                      boxShadow: "var(--sr-card-shadow)",
                      overflow: "hidden",
                      transition: "transform 0.18s ease, box-shadow 0.18s ease",
                      "&:hover": { transform: "translateY(-2px)", boxShadow: "0 8px 28px rgba(0,0,0,0.28)" },
                    }}
                  >
                    {/* Image — full width */}
                    {svc.image && (
                      <Box
                        sx={{
                          width: "100%",
                          height: 160,
                          background: `center / cover no-repeat url(${svc.image})`,
                        }}
                      />
                    )}

                    {/* Content */}
                    <Box sx={{ p: "16px 16px 18px" }}>
                      {/* Name */}
                      <Typography
                        sx={{
                          fontFamily: SERIF,
                          fontSize: 19,
                          fontWeight: 700,
                          color: "var(--sr-ink)",
                          lineHeight: 1.15,
                          mb: 0.35,
                        }}
                      >
                        {svc.name}
                      </Typography>

                      {/* Thai · type tag */}
                      <Typography
                        sx={{
                          fontFamily: SANS,
                          fontSize: 11.5,
                          color: "var(--sr-muted)",
                          mb: 1.1,
                          letterSpacing: "0.01em",
                        }}
                      >
                        {SERVICE_TH_TAG[svc.id]} · {SERVICE_TYPE_TAG[svc.id]}
                      </Typography>

                      {/* Desc */}
                      <Typography
                        sx={{
                          fontFamily: SANS,
                          fontSize: 13,
                          color: "var(--sr-body)",
                          lineHeight: 1.6,
                          mb: 1.75,
                        }}
                      >
                        {svc.desc}
                      </Typography>

                      {/* Duration table */}
                      <Box
                        sx={{
                          borderRadius: "12px",
                          background: "rgba(217,124,149,0.07)",
                          border: "1px solid rgba(217,124,149,0.18)",
                          overflow: "hidden",
                          mb: 2,
                        }}
                      >
                        {durations.map((d, i) => (
                          <React.Fragment key={d}>
                            {i > 0 && (
                              <Box sx={{ height: "1px", background: "rgba(217,124,149,0.14)", mx: 2 }} />
                            )}
                            <Box
                              sx={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                px: 2,
                                py: "11px",
                              }}
                            >
                              <Typography sx={{ fontFamily: SANS, fontSize: 13.5, color: "var(--sr-body)" }}>
                                {d} min
                              </Typography>
                              <Typography sx={{ fontFamily: SERIF, fontSize: 18, fontWeight: 700, color: ROSE }}>
                                {formatTHB(priceForDuration(svc, d))}
                              </Typography>
                            </Box>
                          </React.Fragment>
                        ))}
                      </Box>

                      {/* Reserve button */}
                      {/* 🆕 Round 28r90 (r89 audit findings #2 · #3 · G). */}
                      <Box
                        component="a"
                        href={`/services/${svc.id}`}
                        aria-label={t("services.reserveAria", "Reserve {{name}}", { name: svc.name })}
                        sx={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "8px",
                          px: "22px",
                          py: "12px",
                          borderRadius: 999,
                          background: gradients.primary,
                          color: "#fff",
                          textDecoration: "none",
                          fontFamily: SANS,
                          fontSize: 14,
                          fontWeight: 700,
                          letterSpacing: "0.01em",
                          boxShadow: "0 6px 18px rgba(217,124,149,0.30)",
                          transition: "background 0.2s ease, box-shadow 0.2s ease, transform 0.15s ease",
                          "&:hover": {
                            background: gradients.primaryHover,
                            boxShadow: "0 8px 22px rgba(201,111,137,0.38)",
                            transform: "translateY(-1px)",
                          },
                          "&:focus-visible": {
                            outline: `2px solid ${ROSE}`,
                            outlineOffset: 3,
                          },
                        }}
                      >
                        {t("services.reserve", "Reserve")}
                      </Box>
                    </Box>
                  </Box>
                );
              })}
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
                      "Sukhumvit · Silom · Asok · Thonglor · Sathorn · Phrom Phong · Ari · Chidlom · Ploenchit. Beyond the centre — our concierge provides a private quotation."
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
                  {t("services.subscribeTelegram", "Subscribe to our Telegram channel →")}
                </Box>
              </Box>
            </Box>
          </Box>
        )}

        {/* ═══════════════════════════════════════════════════════════
            ABOUT TAB
        ═══════════════════════════════════════════════════════════ */}
        {section === "about" && (
          <Box sx={{ px: 2, mt: 3, display: "flex", flexDirection: "column", gap: 2 }}>
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
                  "English · ไทย · 中文 · 日本語 · 한국어 — our concierge corresponds in your language, and many practitioners are fluent in two or more."
                )}
              </Typography>
            </Box>
          </Box>
        )}

        {/* ═══════════════════════════════════════════════════════════
            HOW TO BOOK TAB
        ═══════════════════════════════════════════════════════════ */}
        {section === "how" && <HowItWorks />}

      </Box>
    </Box>
  );
};

export default ServicesPage;
