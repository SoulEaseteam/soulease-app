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

import React, { useEffect, useState } from "react";
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

import { getServiceById } from "@/utils/serviceCatalog";
import {
  priceForDuration,
  durationsFor,
  formatTHB,
} from "@/utils/servicePricing";
import { trackServiceView, trackConciergeOpen } from "@/utils/analytics";
import { db } from "@/lib/firebase";
import { brand, fonts } from "@/theme";
import { useDocumentMeta, langToLocale } from "@/utils/useDocumentMeta";
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

const ServiceDetailPage: React.FC = () => {
  const { id: rawId } = useParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  // 🆕 Round 28s302 — via getServiceById so live admin overrides
  //   (name/price/image/detail/benefits) + custom services flow here too.
  const service = rawId ? getServiceById(rawId) : null;

  const [duration, setDuration] = useState<number>(60);
  const [reviews, setReviews] = useState<ReviewLite[]>([]);

  useEffect(() => {
    if (service) {
      trackServiceView(service.id);
    }
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

  useDocumentMeta({
    title: service
      ? t("meta.serviceDetail.title", "{{name}} — SunRed Bangkok", {
          name: service.name,
        })
      : t("meta.serviceDetail.fallback", "SunRed Services"),
    description: service ? service.desc : undefined,
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
  const tiers = durationsFor(service);
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
        background:
          "#F4F6F5",
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
            <Box
              component={motion.div}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              sx={{
                width: "100%",
                // 🆕 Round 28r54 (Phase 3.3) — hero grows a bit on md+
                //   to match the wider left rail.
                height: { xs: 140, md: 180 },
                borderRadius: "20px",
                // 🎨 Round 28r79 — Nordic sweep · was #FFF1E5 warm peach.
                background: "#ECEBE8",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "20px",
              }}
            >
              <Icon
                sx={{
                  fontSize: { xs: 64, md: 80 },
                  color: config.swatchIcon,
                }}
              />
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
              {service.name}
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
              {service.desc}
            </Typography>
          </Box>

          {/* ── Duration tiles (inside left rail on md+) ─────────── */}
          <Box sx={{ padding: { xs: "0 18px", md: 0 }, marginBottom: "24px" }}>
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
          เลือกระยะเวลา
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
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "14px 16px",
                  borderRadius: "16px",
                  cursor: "pointer",
                  border: isActive
                    ? "1px solid transparent"
                    : "1px solid rgba(184, 92, 60, 0.18)",
                  background: isActive
                    ? "#2D2D2B"
                    : "#fff",
                  color: isActive ? "#fff" : brand.text,
                  boxShadow: isActive
                    ? "0 10px 24px rgba(45, 45, 43, 0.22)"
                    : "0 1px 3px rgba(15, 23, 42, 0.05)",
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
                        opacity: isActive ? 0.85 : 0.55,
                        marginTop: "1px",
                      }}
                    >
                      {d === 90
                        ? t("serviceDetail.extended", "Extended ritual")
                        : t("serviceDetail.full", "Full body ritual")}
                    </Typography>
                  )}
                </Box>
                <Typography
                  component="span"
                  sx={{
                    fontFamily: fonts.heading,
                    fontSize: "18px",
                    fontWeight: 700,
                    color: isActive ? "#fff" : brand.red,
                  }}
                >
                  {formatTHB(price)}
                </Typography>
              </Box>
            );
          })}
        </Box>
          </Box>

          {/* ── 🆕 Round 28r54 (Phase 3.3) — Inline Reserve CTA ──────
              Desktop-only sibling of the sticky-bottom mobile CTA
              below. Same handler, same label — just placed in the
              left rail so the visitor sees pricing + call-to-action
              while scrolling reviews on the right. */}
          <Box
            sx={{
              display: { xs: "none", md: "block" },
              marginBottom: "16px",
            }}
          >
            <Button
              fullWidth
              onClick={handleBook}
              aria-label={t(
                "serviceDetail.bookAria",
                "Chat to book {{name}}",
                { name: service.name }
              )}
              startIcon={
                <WhatsAppIcon sx={{ fontSize: "20px !important" }} />
              }
              sx={{
                padding: "14px 20px",
                borderRadius: "16px",
                background: "#8F8474",
                color: "#fff",
                fontFamily: fonts.body,
                fontWeight: 700,
                fontSize: "15px",
                textTransform: "none",
                boxShadow: "0 12px 28px rgba(45, 45, 43, 0.28)",
                "&:hover": {
                  background: "#7A7060",
                  boxShadow: "0 16px 36px rgba(45, 45, 43, 0.34)",
                },
              }}
            >
              {t("serviceDetail.bookCta", "Chat to book")} ·{" "}
              {formatTHB(currentPrice)}
            </Button>
          </Box>
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
          สิ่งที่รวมในบริการ
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
          {service.benefit.map((line, idx) => (
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
            รีวิวจากลูกค้า
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
                  {Array.from({ length: r.rating }).map((_, i) => (
                    <StarRoundedIcon
                      key={i}
                      sx={{ fontSize: 14, color: "#FFA726" }}
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

      {/* ── Sticky bottom CTA (mobile only) ────────────────────────
          🆕 Round 28r54 (Phase 3.3) — hidden on md+; the inline
          Reserve CTA in the left rail above takes over on desktop.
          🚨 Round 28r65 HOTFIX — was `bottom: 70, zIndex: 10`; that
          put the button INSIDE BottomNavGlass's footprint (nav ≈ 64px
          paper + iOS safe-area 34px = ~98px tall), and zIndex 10 <<
          BottomNavGlass zIndex 2000 meant the nav painted over it.
          Founder screenshot: only a red sliver visible above the nav.
          Fix: use the global `--cta-bottom-offset` (64 + 16 + safe-
          area) so we clear the nav on every device, and raise zIndex
          above the nav. */}
      <Box
        sx={{
          position: "fixed",
          bottom: "var(--cta-bottom-offset)",
          left: 0,
          right: 0,
          display: { xs: "flex", md: "none" },
          justifyContent: "center",
          padding: "0 18px",
          pointerEvents: "none",
          zIndex: 2100,
        }}
      >
        <Box
          sx={{
            width: "100%",
            // 🆕 Round 28r52 — sticky bottom CTA matches the shell.
            ...responsiveShell,
            pointerEvents: "auto",
          }}
        >
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
              padding: "14px 20px",
              borderRadius: "16px",
              background: "#8F8474",
              color: "#fff",
              fontFamily: fonts.body,
              fontWeight: 700,
              fontSize: "15px",
              textTransform: "none",
              boxShadow: "0 14px 32px rgba(45, 45, 43, 0.32)",
              "&:hover": {
                background: "#7A7060",
                boxShadow: "0 18px 40px rgba(45, 45, 43, 0.38)",
              },
            }}
          >
            {t("serviceDetail.bookCta", "Chat to book")} ·{" "}
            {formatTHB(currentPrice)}
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default ServiceDetailPage;
