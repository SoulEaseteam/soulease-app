// src/pages/ServiceDetailPage.tsx
//
// 🎯 Round 28s22 — Minimal web-app service detail (founder 2026-05-30,
// "Web-app trim — ทุกหน้า").
//
// Replaces the 1,372-line Round 28c5–c26 page with a clean detail
// view: hero icon swatch, title + description, duration tiles
// (60/90/120 with computed prices), what's-included checklist,
// live reviews carousel, and a sticky bottom CTA that opens
// WhatsApp with the service + duration + price pre-populated.
//
// Cut from the prior version (preserved in git history):
//   • Sticky scroll-tracking header animation
//   • "Delivered N sessions" live chip + per-service flag animations
//   • Service callout dictionary with bespoke copy per SKU
//   • Add-ons rail (Beyond-central travel · Extend · Premium oil ·
//     Duo) — these belong in the booking flow, not the menu
//   • Bangkok-night reality copy block
//   • Therapeutic benefits long-form prose
//   • Sticky bottom "Reserve this therapy" multi-line gradient
//
// To revert: git revert 28s22 — old file in history.

import React, { useEffect, useRef, useState } from "react";
import { svcName, svcDesc, svcDetail, svcBenefits } from "@/utils/serviceI18n";
import {
  Box,
  Typography,
  IconButton,
  Button,
} from "@mui/material";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import {
  useNavigate,
  useParams,
} from "react-router-dom";

import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import StarRoundedIcon from "@mui/icons-material/StarRounded";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import SpaRoundedIcon from "@mui/icons-material/SpaRounded";
import LocalFloristRoundedIcon from "@mui/icons-material/LocalFloristRounded";
import DiamondRoundedIcon from "@mui/icons-material/DiamondRounded";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";

import type { SvgIconComponent } from "@mui/icons-material";

import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
} from "firebase/firestore";

import { getServiceById, getAllServices } from "@/utils/serviceCatalog";
// 🆕 28w.35 — raw (pre-override) catalog, to surface the ORIGINAL stock
//   photo as a 2nd swipeable hero image alongside the admin upload.
import servicesCatalog from "@/data/services";
import {
  priceForDuration,
  durationsFor,
  formatTHB,
  isServiceEnabled,
  wasPriceFor,
  badgeFor,
} from "@/utils/servicePricing";
import PromoBadge from "@/components/common/PromoBadge";
// 🆕 28w.32 — re-render when the admin image override lands so the hero
//   photo matches the booking flow / services list (same uploaded image).
import { useServiceConfigVersion } from "@/hooks/useServiceConfigVersion";
import { trackServiceView, trackConciergeOpen } from "@/utils/analytics";
import { db } from "@/lib/firebase";
import { brand, fonts, accents, gradients } from "@/theme";
import { useDocumentMeta, langToLocale } from "@/utils/useDocumentMeta";
import { enhanceImage } from "@/utils/cloudinary";
// 🆕 Round 28r52 — Phase 3.1 responsive shell.
// 🆕 Round 28r54 (Phase 3.3) — responsiveType scales the h1 name +
//   description with viewport width.
import { responsiveShell, responsiveType } from "@/theme/breakpoints";
// 🆕 Round 28r71 — shared concierge endpoints (r71 rebrand phase 2).
import { CONCIERGE } from "@/config/concierge";

const WHATSAPP_URL = CONCIERGE.whatsappUrl;

interface IconConfig {
  icon: SvgIconComponent;
  swatchIcon: string;
  tier: "SIGNATURE" | "PREMIUM";
}
const ICON_BY_ID: Record<string, IconConfig> = {
  "xSR-Thai": {
    icon: SpaRoundedIcon,
    // 🎨 Round 28r79 — Nordic sweep · was #E07A4F warm clay.
    swatchIcon: "#B7A896",
    tier: "SIGNATURE",
  },
  "SR-Aroma": {
    icon: LocalFloristRoundedIcon,
    swatchIcon: "#2D2D2B",
    tier: "PREMIUM",
  },
  "SR-HJ2200": {
    icon: DiamondRoundedIcon,
    swatchIcon: "#2D2D2B",
    tier: "PREMIUM",
  },
  "SR-B2B3200": {
    icon: AutoAwesomeRoundedIcon,
    // 🎨 Round 28r79 — Nordic sweep · was #831843 deep magenta.
    swatchIcon: "#2D2D2B",
    tier: "PREMIUM",
  },
};

interface ReviewLite {
  id: string;
  rating: number;
  text: string;
  author: string;
}

// 🆕 28w.34 — short "RITUAL · TYPE" tag per service for the More Rituals
//   cross-sell cards (founder screenshot). Custom services fall back to
//   the generic label.
const RITUAL_TYPE: Record<string, string> = {
  "xSR-Thai": "Traditional",
  "SR-Aroma": "Oil",
  "SR-HJ2200": "Signature",
  "SR-B2B3200": "Specialised",
};

const ServiceDetailPage: React.FC = () => {
  const { id: rawId } = useParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  // 🆕 Round 28s302 — via getServiceById so live admin overrides
  //   (name/price/image/detail/benefits) + custom services flow here too.
  // 🆕 28w.32 — recompute when the async admin override lands (was computed
  //   once, so the hero froze on the stock image while the booking flow
  //   showed the uploaded photo).
  const cfgVersion = useServiceConfigVersion();
  const service = React.useMemo(
    () => (rawId ? getServiceById(rawId) : null),
    [rawId, cfgVersion]
  );

  // 🆕 28w.34 — the OTHER enabled services for the "More Rituals" cross-sell
  //   row below the Chat-to-book CTA. getServiceById so the admin override
  //   images (28w.32) show here too; recompute when the config lands.
  const otherServices = React.useMemo(
    () =>
      getAllServices()
        .filter((s) => isServiceEnabled(s.id) && s.id !== service?.id)
        .map((s) => getServiceById(s.id) ?? s),
    [service?.id, cfgVersion]
  );

  const [duration, setDuration] = useState<number>(60);
  const [reviews, setReviews] = useState<ReviewLite[]>([]);

  // 🆕 28w.35 — swipeable hero gallery (admin photo + original stock photo).
  const heroScrollRef = useRef<HTMLDivElement | null>(null);
  const [heroIndex, setHeroIndex] = useState(0);
  const onHeroScroll = () => {
    const el = heroScrollRef.current;
    if (!el || el.clientWidth === 0) return;
    setHeroIndex(Math.round(el.scrollLeft / el.clientWidth));
  };

  useEffect(() => {
    if (service) {
      trackServiceView(service.id);
    }
  }, [service]);

  // 🆕 28w.36 — default the selected tier to the first OFFERED duration when
  //   the current one isn't offered (60 default → 70 for Gentleman's / B2B).
  useEffect(() => {
    if (!service) return;
    const offered = durationsFor(service);
    setDuration((d) => (offered.includes(d) ? d : offered[0]));
  }, [service]);

  // Reviews — gated by Firestore rule (28s6) to docs with `rating`
  // field present. Filter to this service id client-side.
  useEffect(() => {
    if (!service) return;
    const q = query(
      collection(db, "bookings"),
      where("serviceId", "==", service.id),
      where("rating", ">=", 1),
      orderBy("rating", "desc"),
      limit(8),
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list: ReviewLite[] = [];
        snap.forEach((d) => {
          const data = d.data() as {
            rating?: number;
            reviewText?: string;
            contactName?: string;
          };
          const text = (data.reviewText ?? "").trim();
          if (!text) return;
          list.push({
            id: d.id,
            rating: typeof data.rating === "number" ? data.rating : 5,
            text,
            author: data.contactName?.slice(0, 1) ?? "Guest",
          });
        });
        setReviews(list);
      },
      (err) => {
        // Reviews are non-essential; log and move on.
        console.warn("[ServiceDetailPage] reviews error:", err);
      },
    );
    return () => unsub();
  }, [service]);

  // 🆕 Round 28x.99h — audit finding (same class as ServicesPage/
  //   PricingPage): the previous "{{name}} · SunRed Bangkok" template
  //   was weaker than what scripts/prerender-routes.mjs already writes
  //   for the SAME URL (serviceTitle: "${n} (Outcall) in Bangkok — from
  //   ฿${p} | SunRed") — hydration was downgrading the SEO title. Only
  //   fixed the English default here (Search Console data from earlier
  //   this session — Round 28s224 — showed every top-traffic query on
  //   this vertical is English); a full per-language pass matching
  //   prerender's localized serviceTitle() functions is future work.
  useDocumentMeta({
    title: service
      ? t(
          "meta.serviceDetail.title",
          "{{name}} (Outcall) in Bangkok — from ฿{{price}} | SunRed",
          { name: service.name, price: priceForDuration(service, 60).toLocaleString("en-US") }
        )
      : t("meta.serviceDetail.fallback", "SunRed Services"),
    description: service ? svcDesc(t, service.id, service.desc) : undefined,
    locale: langToLocale(i18n.language),
    url: service
      ? `https://sunred.vip/services/${service.id}`
      : "https://sunred.vip/services",
    type: "website",
  });

  if (!service) {
    return (
      <Box
        sx={{
          // 🆕 Round 28r52 — responsiveShell replaces the fixed 430 cap.
          ...responsiveShell,
          padding: "60px 24px",
          textAlign: "center",
        }}
      >
        <Typography
          sx={{ fontFamily: fonts.heading, fontSize: "22px", marginBottom: 2 }}
        >
          Service not found
        </Typography>
        <Button onClick={() => navigate("/services")} variant="text">
          Back to services
        </Button>
      </Box>
    );
  }

  const config = ICON_BY_ID[service.id] ?? {
    icon: SpaRoundedIcon,
    swatchIcon: brand.red,
    tier: "PREMIUM" as const,
  };
  const Icon = config.icon;

  // 🆕 28w.35 (founder "เพิ่มรูปที่สอง เป็นรูปเมื่อกี้ เลือนดูได้") — hero
  //   gallery: [admin-uploaded photo (service.image), original stock photo].
  //   The stock image is the pre-override catalog entry; deduped so services
  //   with no admin upload (image === stock) keep a single full-height photo.
  const stockImage = servicesCatalog.find((s) => s.id === service.id)?.image;
  const heroImages = [service.image, stockImage].filter(
    (v, i, a): v is string => Boolean(v) && a.indexOf(v) === i
  );

  // 🆕 28w.36 (founder 2026-07-14 "โชว์ราคาทั้งหมด") — new pricing is set,
  //   so ALL offered tiers show again (Thai/Aroma 60/90/120 · Gentleman's/
  //   Therapeutic 70/120). Reverses the 28r118 "60 only" hide. Duration
  //   default is corrected to the first offered tier in a hook above.
  const tiers: number[] = durationsFor(service);
  const currentPrice = priceForDuration(service, duration);

  const handleBook = () => {
    const msg = `Hi, I'd like to book ${service.name} (${duration} min · ${formatTHB(
      currentPrice,
    )}). When can I reserve?`;
    trackConciergeOpen(`whatsapp_servicedetail_${service.id}`);
    window.open(
      `${WHATSAPP_URL}?text=${encodeURIComponent(msg)}`,
      "_blank",
      "noopener,noreferrer",
    );
  };

  return (
    <Box
      sx={{
        // 🆕 Round 28r52 — responsiveShell widens through sm/md/lg.
        ...responsiveShell,
        background: "var(--sr-bg)",
        minHeight: "100vh",
        position: "relative",
        // 🆕 Round 28r54 (Phase 3.3) — on md+ the Reserve CTA moves
        //   inline into the left column; no need for 120px of sticky-
        //   footer clearance.
        paddingBottom: { xs: "120px", md: "48px" },
      }}
    >
      {/* ── Back button — always at top, spans full width ─────────── */}
      <Box sx={{ padding: "16px 18px 0" }}>
        <IconButton
          onClick={() => navigate(-1)}
          aria-label={t("common.back", "Back")}
          sx={{
            width: 44,
            height: 44,
            background: "rgba(255,255,255,0.8)",
            backdropFilter: "blur(10px)",
            border: "1px solid rgba(15, 23, 42, 0.06)",
            "&:hover": { background: "#fff" },
            "&:focus-visible": {
              outline: `2px solid ${brand.red}`,
              outlineOffset: 2,
            },
            marginBottom: { xs: "20px", md: "12px" },
          }}
        >
          <ArrowBackRoundedIcon sx={{ color: brand.text }} />
        </IconButton>
      </Box>

      {/* ── 🆕 Round 28r54 (Phase 3.3) — Responsive columns ──────────
          Mobile: single-column stack (unchanged). Tablet+ (md+):
          left rail sticks with hero + title + duration tiles + a
          Reserve CTA; right rail scrolls with What's included +
          Reviews. Sticky-bottom mobile CTA is hidden on md+. */}
      <Box
        sx={{
          display: { md: "grid" },
          gridTemplateColumns: { md: "5fr 7fr" },
          columnGap: { md: 4 },
          rowGap: 0,
          alignItems: { md: "start" },
          padding: { xs: 0, md: "0 18px" },
        }}
      >
        {/* ── LEFT COLUMN — sticky rail on md+ ────────────────────── */}
        <Box
          sx={{
            position: { md: "sticky" },
            top: { md: 24 },
          }}
        >
          {/* Hero + title block — matches original padding on xs */}
          <Box sx={{ padding: { xs: "0 18px", md: 0 } }}>
            {/* Hero image (real photo) — natural full display (no crop)
                🆕 28r119 (founder "รูปไม่เห็น · ทำให้มันสมส่วน") —
                swapped fixed-height cover crop for a plain <img> at
                natural aspect ratio.  Full photo now shows; card height
                adapts.  Matches the r116 ServicesPage treatment. */}
            <Box
              component={motion.div}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              sx={{ width: "100%", marginBottom: "20px" }}
            >
              {heroImages.length > 1 ? (
                // 🆕 28w.35 — swipeable gallery: admin photo + original stock
                //   photo. Uniform square frame so the slides align; swipe /
                //   scroll horizontally. Dots track the active slide.
                <>
                  <Box
                    ref={heroScrollRef}
                    onScroll={onHeroScroll}
                    sx={{
                      display: "flex",
                      overflowX: "auto",
                      borderRadius: "20px",
                      scrollSnapType: "x mandatory",
                      background: "#ECEBE8",
                      scrollbarWidth: "none",
                      WebkitOverflowScrolling: "touch",
                      "&::-webkit-scrollbar": { display: "none" },
                    }}
                  >
                    {heroImages.map((img, i) => (
                      <Box
                        key={img}
                        component="img"
                        src={enhanceImage(img, { variant: "hero" })}
                        alt={`${svcName(t, service.id, service.name)} — ${i + 1}`}
                        loading={i === 0 ? "eager" : "lazy"}
                        fetchPriority={i === 0 ? "high" : undefined}
                        draggable={false}
                        sx={{
                          flex: "0 0 100%",
                          width: "100%",
                          aspectRatio: "1 / 1",
                          objectFit: "cover",
                          objectPosition: "center 28%",
                          scrollSnapAlign: "start",
                          display: "block",
                        }}
                      />
                    ))}
                  </Box>
                  {/* slide dots */}
                  <Box sx={{ display: "flex", justifyContent: "center", gap: "6px", mt: 1.25 }}>
                    {heroImages.map((img, i) => (
                      <Box
                        key={img}
                        aria-hidden
                        sx={{
                          height: 6,
                          width: heroIndex === i ? 18 : 6,
                          borderRadius: "999px",
                          background:
                            heroIndex === i ? "var(--sr-gold-text)" : "var(--sr-hairline)",
                          transition: "width 0.2s ease, background 0.2s ease",
                        }}
                      />
                    ))}
                  </Box>
                </>
              ) : heroImages.length === 1 ? (
                // Single photo → keep the r119 full, uncropped natural display.
                <Box
                  component="img"
                  src={enhanceImage(heroImages[0], { variant: "hero" })}
                  alt={svcName(t, service.id, service.name)}
                  loading="eager"
                  fetchPriority="high"
                  sx={{
                    display: "block",
                    width: "100%",
                    height: "auto",
                    borderRadius: "20px",
                    background: "#ECEBE8",
                  }}
                />
              ) : (
                <Box
                  sx={{
                    height: { xs: 200, md: 240 },
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: "20px",
                    background: "#ECEBE8",
                  }}
                >
                  <Icon sx={{ fontSize: { xs: 64, md: 80 }, color: config.swatchIcon }} />
                </Box>
              )}
            </Box>

            {/* Title block */}
            <Typography
              component="p"
              sx={{
                fontFamily: fonts.body,
                fontSize: "11px",
                fontWeight: 800,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: brand.accent,
                marginBottom: "6px",
              }}
            >
              {config.tier}
            </Typography>
            {/* 🆕 Round 28r54 (Phase 3.3) — responsiveType.h3 scales
                the service name 22→28→34 with viewport. */}
            <Typography
              component="h1"
              sx={{
                fontFamily: fonts.heading,
                ...responsiveType.h3,
                fontWeight: 600,
                color: brand.text,
                letterSpacing: "-0.015em",
                marginBottom: "8px",
              }}
            >
              {svcName(t, service.id, service.name)}
            </Typography>
            {/* 🆕 Round 28r54 (Phase 3.3) — responsiveType.body scales
                the description 14→15→16 with viewport. */}
            <Typography
              component="p"
              sx={{
                fontFamily: fonts.body,
                ...responsiveType.body,
                fontWeight: 500,
                color: brand.textMuted,
                marginBottom: "24px",
              }}
            >
              {svcDesc(t, service.id, service.desc)}
            </Typography>
          </Box>

          {/* ── Duration tiles (inside left rail on md+) ─────────── */}
          <Box sx={{ padding: { xs: "0 18px", md: 0 }, marginBottom: "24px" }}>
        {/* 🆕 28w.62/63 — shimmering Best Seller / Best Value badge */}
        {badgeFor(service.id) && (
          <Box sx={{ mb: "12px" }}>
            <PromoBadge serviceId={service.id} />
          </Box>
        )}
        <Typography
          component="p"
          sx={{
            fontFamily: fonts.body,
            fontSize: "11px",
            fontWeight: 800,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: brand.accent,
            marginBottom: "4px",
          }}
        >
          {t("serviceDetail.choose", "Choose duration")}
        </Typography>
        {/* 🆕 Round 28r61 — bilingual pass: tiny Thai subtitle. */}
        <Typography
          sx={{
            fontFamily: fonts.body,
            fontSize: "10px",
            fontWeight: 500,
            color: brand.textMuted,
            letterSpacing: "0.02em",
            marginBottom: "10px",
            opacity: 0.75,
          }}
        >
          {t("service.chooseDuration", "Choose duration")}
        </Typography>
        <Box
          role="group"
          aria-label={t("serviceDetail.durationAria", "Duration tiers")}
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          }}
        >
          {tiers.map((d) => {
            const price = priceForDuration(service, d);
            const isActive = d === duration;
            return (
              <Box
                key={d}
                component="button"
                type="button"
                onClick={() => setDuration(d)}
                aria-pressed={isActive}
                sx={{
                  // 🆕 28r110 (founder screenshot 2026-07-13 · "ปุ่ม
                  //   ไม่ต้องลอย · ให้อยู่ท้ายสุด" + inactive-card text
                  //   invisible) — was slate/#fff hardcoded, unreadable
                  //   on dark app. Now theme-token aware: rose gradient
                  //   for active, sr-panel + rose border for inactive.
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "14px 16px",
                  borderRadius: "16px",
                  cursor: "pointer",
                  border: isActive
                    ? "1px solid transparent"
                    : "1px solid rgba(217, 124, 149, 0.30)",
                  background: isActive
                    ? gradients.primary
                    : "var(--sr-panel)",
                  color: isActive ? "#fff" : "var(--sr-ink)",
                  boxShadow: isActive
                    ? "0 10px 24px rgba(217, 124, 149, 0.30)"
                    : "var(--sr-card-shadow)",
                  transition:
                    "background 0.18s ease, box-shadow 0.18s ease, transform 0.12s ease",
                  "&:hover": { transform: "translateY(-1px)" },
                  "&:focus-visible": {
                    outline: `2px solid ${brand.red}`,
                    outlineOffset: 2,
                  },
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-start",
                  }}
                >
                  <Typography
                    component="span"
                    sx={{
                      fontFamily: fonts.heading,
                      fontSize: "18px",
                      fontWeight: 600,
                      lineHeight: 1.1,
                    }}
                  >
                    {d} min
                  </Typography>
                  {d > 60 && (
                    <Typography
                      component="span"
                      sx={{
                        fontFamily: fonts.body,
                        fontSize: "11px",
                        fontWeight: 500,
                        // 🆕 28r110 — use color tokens instead of opacity
                        //   so both states stay readable.
                        color: isActive ? "rgba(255,255,255,0.85)" : "var(--sr-muted)",
                        marginTop: "1px",
                      }}
                    >
                      {d === 90
                        ? t("serviceDetail.extended", "Extended ritual")
                        : t("serviceDetail.full", "Full body ritual")}
                    </Typography>
                  )}
                </Box>
                <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                  {/* 🆕 28x.99z (founder "ราคาขีดฆ่า ออกทั้งเว็บทุกจุด") —
                      struck was-price removed. */}
                  <Typography
                    component="span"
                    sx={{
                      fontFamily: fonts.heading,
                      fontSize: "18px",
                      fontWeight: 700,
                      color: isActive ? "#fff" : brand.red,
                      lineHeight: 1.1,
                    }}
                  >
                    {formatTHB(price)}
                  </Typography>
                </Box>
              </Box>
            );
          })}
        </Box>
          </Box>

          {/* 🆕 28r110 — Desktop-only rail CTA removed. Single unified
              CTA now lives at the very END of the page (after reviews),
              per founder "ปุ่ม ไม่ต้องลอย · ให้อยู่ท้ายสุด". */}
        </Box>
        {/* ── LEFT COLUMN END ─────────────────────────────────────── */}

        {/* ── RIGHT COLUMN — scrollable body ──────────────────────── */}
        <Box>

      {/* ── What's included ────────────────────────────────────────── */}
      <Box sx={{ padding: { xs: "0 18px", md: 0 }, marginBottom: "28px" }}>
        <Typography
          component="p"
          sx={{
            fontFamily: fonts.body,
            fontSize: "11px",
            fontWeight: 800,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: brand.accent,
            marginBottom: "4px",
          }}
        >
          {t("serviceDetail.included", "What's included")}
        </Typography>
        {/* 🆕 Round 28r61 — bilingual pass: tiny Thai subtitle. */}
        <Typography
          sx={{
            fontFamily: fonts.body,
            fontSize: "10px",
            fontWeight: 500,
            color: brand.textMuted,
            letterSpacing: "0.02em",
            marginBottom: "12px",
            opacity: 0.75,
          }}
        >
          {t("service.whatsIncluded", "What's included")}
        </Typography>
        <Box
          component="ul"
          sx={{
            listStyle: "none",
            margin: 0,
            padding: 0,
            display: "flex",
            flexDirection: "column",
            gap: "10px",
          }}
        >
          {svcBenefits(t, service.id, [...service.benefit]).map((line, idx) => (
            <Box
              component="li"
              key={idx}
              sx={{
                display: "flex",
                alignItems: "flex-start",
                gap: "10px",
              }}
            >
              <Box
                sx={{
                  flexShrink: 0,
                  width: 20,
                  height: 20,
                  borderRadius: "50%",
                  background: "rgba(15, 23, 42, 0.10)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginTop: "2px",
                }}
              >
                <CheckRoundedIcon sx={{ fontSize: 13, color: brand.red }} />
              </Box>
              <Typography
                component="span"
                sx={{
                  fontFamily: fonts.body,
                  fontSize: "13.5px",
                  fontWeight: 500,
                  color: brand.text,
                  lineHeight: 1.45,
                }}
              >
                {line}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>

      {/* ── Reviews — horizontal carousel ──────────────────────────── */}
      {reviews.length > 0 && (
        <Box sx={{ marginBottom: "20px" }}>
          <Typography
            component="p"
            sx={{
              padding: { xs: "0 18px", md: 0 },
              fontFamily: fonts.body,
              fontSize: "11px",
              fontWeight: 800,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: brand.accent,
              marginBottom: "2px",
            }}
          >
            {t("serviceDetail.reviews", "Guest reviews")}
          </Typography>
          {/* 🆕 Round 28r61 — bilingual pass: tiny Thai subtitle. */}
          <Typography
            sx={{
              padding: { xs: "0 18px", md: 0 },
              fontFamily: fonts.body,
              fontSize: "10px",
              fontWeight: 500,
              color: brand.textMuted,
              letterSpacing: "0.02em",
              marginBottom: "10px",
              opacity: 0.75,
            }}
          >
            {t("service.guestReviews", "Guest reviews")}
          </Typography>
          <Box
            sx={{
              display: "flex",
              gap: "10px",
              overflowX: "auto",
              padding: { xs: "4px 18px", md: "4px 0" },
              scrollbarWidth: "none",
              "&::-webkit-scrollbar": { display: "none" },
              scrollSnapType: "x mandatory",
            }}
          >
            {reviews.map((r) => (
              <Box
                key={r.id}
                sx={{
                  flexShrink: 0,
                  width: 240,
                  scrollSnapAlign: "start",
                  padding: "14px 14px 16px",
                  borderRadius: "16px",
                  background: "#fff",
                  border: "1px solid rgba(184, 92, 60, 0.10)",
                  boxShadow: "0 4px 12px rgba(15, 23, 42, 0.05)",
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: "2px",
                    marginBottom: "8px",
                  }}
                >
                  {/* 🆕 Round 28r81 — star colour anchored on the
                      accents.amber (#F5A623) token per founder direction:
                      one true amber sitewide. */}
                  {Array.from({ length: r.rating }).map((_, i) => (
                    <StarRoundedIcon
                      key={i}
                      sx={{ fontSize: 14, color: accents.amber }}
                    />
                  ))}
                </Box>
                <Typography
                  component="p"
                  sx={{
                    fontFamily: fonts.body,
                    fontSize: "12.5px",
                    fontWeight: 500,
                    color: brand.text,
                    lineHeight: 1.5,
                    display: "-webkit-box",
                    WebkitLineClamp: 4,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {r.text}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
      )}
        </Box>
        {/* ── RIGHT COLUMN END ────────────────────────────────────── */}
      </Box>
      {/* ── Responsive columns wrapper END ─────────────────────────── */}

      {/* ── End-of-page CTA (inline, all breakpoints) ──────────────
          🆕 28r110 (founder 2026-07-13 · "ปุ่ม ไม่ต้องลอย · ให้อยู่
          ท้ายสุด") — the r54 sticky-bottom CTA + r54 desktop rail CTA
          were both removed and replaced with this single inline
          button that lives at the true end of the scrollable page,
          after reviews.  No fixed positioning, no z-index wars with
          BottomNavGlass, no viewport-height quirks. */}
      <Box sx={{ padding: { xs: "8px 18px 24px", md: "8px 0 24px" }, ...responsiveShell, mx: "auto", width: "100%" }}>
        <Button
          fullWidth
          onClick={handleBook}
          aria-label={t(
            "serviceDetail.bookAria",
            "Chat to book {{name}}",
            { name: service.name }
          )}
          startIcon={<WhatsAppIcon sx={{ fontSize: "20px !important" }} />}
          sx={{
            padding: "16px 20px",
            borderRadius: "999px",
            background: gradients.primary,
            color: "#fff",
            fontFamily: fonts.body,
            fontWeight: 700,
            fontSize: "15px",
            textTransform: "none",
            transition: "background 0.2s ease, transform 0.15s ease",
            "&:hover": {
              background: gradients.primaryHover,
              transform: "translateY(-1px)",
            },
            "&:focus-visible": {
              outline: `2px solid ${brand.red}`,
              outlineOffset: 3,
            },
          }}
        >
          {t("serviceDetail.bookCta", "Chat to book")} · {formatTHB(currentPrice)}
        </Button>
      </Box>

      {/* ── More Rituals (cross-sell) ──────────────────────────────────
          🆕 28w.34 (founder screenshot "เพิ่ม More Rituals ใต้ปุ่มแชท") —
          horizontal row of the OTHER services below the Chat-to-book CTA.
          Photo-top card · RITUAL · TYPE eyebrow · name · From ฿X ·
          Details → (routes to that service). Reuses getServiceById so the
          admin override images (28w.32) show here too. Day/night via
          var(--sr-*). */}
      {otherServices.length > 0 && (
        <Box
          sx={{
            ...responsiveShell,
            mx: "auto",
            width: "100%",
            padding: { xs: "16px 0 40px", md: "24px 0 48px" },
          }}
        >
          {/* Section header — MORE RITUALS flanked by rules */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 2,
              px: { xs: "18px", md: 0 },
              mb: 2.5,
            }}
          >
            <Box sx={{ flex: 1, height: "1px", background: "var(--sr-hairline)" }} />
            <Typography
              sx={{
                fontFamily: fonts.body,
                fontSize: "12px",
                fontWeight: 700,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                color: "var(--sr-muted)",
                whiteSpace: "nowrap",
              }}
            >
              {t("serviceDetail.moreRituals", "More Rituals")}
            </Typography>
            <Box sx={{ flex: 1, height: "1px", background: "var(--sr-hairline)" }} />
          </Box>

          {/* Horizontal scroll row */}
          <Box
            sx={{
              display: "flex",
              gap: 2,
              overflowX: "auto",
              px: { xs: "18px", md: 0 },
              pb: 1,
              scrollSnapType: "x mandatory",
              scrollbarWidth: "none",
              "&::-webkit-scrollbar": { display: "none" },
            }}
          >
            {otherServices.map((svc) => {
              const from = priceForDuration(svc, 60);
              const type = RITUAL_TYPE[svc.id] ?? "Ritual";
              return (
                <Box
                  key={svc.id}
                  sx={{
                    flex: "0 0 auto",
                    width: "72%",
                    minWidth: "236px",
                    maxWidth: "300px",
                    scrollSnapAlign: "start",
                    background: "var(--sr-panel)",
                    border: "1px solid var(--sr-hairline)",
                    borderRadius: "20px",
                    boxShadow: "var(--sr-card-shadow)",
                    overflow: "hidden",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  {svc.image && (
                    <Box
                      component="img"
                      src={enhanceImage(svc.image, { variant: "card" })}
                      alt={svcName(t, svc.id, svc.name)}
                      loading="lazy"
                      sx={{
                        width: "100%",
                        height: 168,
                        objectFit: "cover",
                        objectPosition: "center 30%",
                        display: "block",
                      }}
                    />
                  )}
                  <Box
                    sx={{
                      padding: "16px 18px 18px",
                      display: "flex",
                      flexDirection: "column",
                      flex: 1,
                    }}
                  >
                    <Typography
                      sx={{
                        fontFamily: fonts.body,
                        fontSize: "10.5px",
                        fontWeight: 700,
                        letterSpacing: "0.16em",
                        textTransform: "uppercase",
                        color: "var(--sr-muted)",
                        mb: 0.75,
                      }}
                    >
                      {t("serviceDetail.ritualTag", "Ritual")} · {type}
                    </Typography>
                    <Typography
                      sx={{
                        fontFamily: fonts.heading,
                        fontSize: "20px",
                        fontWeight: 600,
                        color: "var(--sr-ink)",
                        letterSpacing: "-0.01em",
                        lineHeight: 1.15,
                      }}
                    >
                      {svcName(t, svc.id, svc.name)}
                    </Typography>
                    <Typography
                      sx={{
                        fontFamily: fonts.body,
                        fontSize: "14px",
                        color: "var(--sr-muted)",
                        mt: 0.5,
                        mb: 1.75,
                      }}
                    >
                      {t("serviceDetail.from", "From")}{" "}
                      <Box
                        component="span"
                        sx={{ color: "var(--sr-ink)", fontWeight: 700, fontSize: "17px" }}
                      >
                        {formatTHB(from)}
                      </Box>
                    </Typography>
                    <Box
                      component="button"
                      onClick={() => {
                        window.scrollTo({ top: 0 });
                        navigate(`/services/${svc.id}`);
                      }}
                      aria-label={t("serviceDetail.detailsAria", "Details for {{name}}", {
                        name: svc.name,
                      })}
                      sx={{
                        mt: "auto",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 1,
                        width: "100%",
                        padding: "12px 16px",
                        borderRadius: "999px",
                        background: "transparent",
                        border: "1.5px solid var(--sr-ink)",
                        color: "var(--sr-ink)",
                        fontFamily: fonts.body,
                        fontSize: "14px",
                        fontWeight: 700,
                        cursor: "pointer",
                        transition: "background 0.15s ease, color 0.15s ease",
                        "&:hover": { background: "var(--sr-ink)", color: "var(--sr-panel)" },
                      }}
                    >
                      {t("serviceDetail.details", "Details")}
                      <Box component="span" aria-hidden sx={{ fontSize: "16px", lineHeight: 1 }}>
                        →
                      </Box>
                    </Box>
                  </Box>
                </Box>
              );
            })}
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default ServiceDetailPage;
