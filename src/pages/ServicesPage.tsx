// src/pages/ServicesPage.tsx
//
// 🆕 Round 28b10 (founder 2026-05-03) — full Clean v3 refresh:
//   • Phone shell + tabs use cool-neutral palette (#FAFBFC → #F1F3F5)
//   • White cards with slate borders, soft slate shadows
//   • All emoji replaced with MUI icons (founder no-emoji rule)
//   • ABOUT US — concise pillars + service area + contacts
//   • HOW TO BOOK — keeps HowItWorks visual, FAQ in cool-palette
//     accordions, "Concierge" + "Additional Links" tightened
//   • Service tiles: brand red accents kept; tile shadow → cool slate
//
// 🆕 Round 28c0 follow-up — premium polish (kept):
//   • Refined FAQ copy (formal register, "concierge" instead of "admin")
//   • SectionDivider (small caps · hairlines) replaces plain section labels
//   • FaqRow gains a subtle red left-edge accent on expand
//   • "Which payment methods are accepted?" trimmed to a one-line summary
//     plus a CTA link to /payment-methods (canonical source — single
//     point of truth, used together with BookingFlowPage).

import React from "react";
import {
  Box,
  Typography,
  Button,
  IconButton,
  Dialog,
} from "@mui/material";
import VerifiedRoundedIcon from "@mui/icons-material/VerifiedRounded";
import VisibilityOffRoundedIcon from "@mui/icons-material/VisibilityOffRounded";
import LocalHotelRoundedIcon from "@mui/icons-material/LocalHotelRounded";
import SupportAgentRoundedIcon from "@mui/icons-material/SupportAgentRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
// 🆕 Round 28s179 — Star icon dropped (only used by removed quiz).
import LocationOnRoundedIcon from "@mui/icons-material/LocationOnRounded";
import LanguageRoundedIcon from "@mui/icons-material/LanguageRounded";
// 🆕 Round 28s195 — CloseRoundedIcon dropped (quiz/compare dialogs gone).
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
// 🆕 Round 28s188 — Restored CheckRounded for the "What's included"
//   list on each rate card (founder: "รายละเอียดแต่ละเมนูมีแค่นี้
//   หรอ" — needs more substance per card).
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import AccessTimeRoundedIcon from "@mui/icons-material/AccessTimeRounded";
// 🆕 Round 28s178 — Service-specific icons for the rate cards.
import SpaRoundedIcon from "@mui/icons-material/SpaRounded";
import LocalFloristRoundedIcon from "@mui/icons-material/LocalFloristRounded";
import DiamondRoundedIcon from "@mui/icons-material/DiamondRounded";
// 🆕 Round 28s188 — Concierge channel icons (mirrors HowItWorks).
import { FaLine, FaTelegramPlane, FaWeixin, FaWhatsapp } from "react-icons/fa";
// 🆕 Round 28s195 — useNavigate no longer consumed (handlers removed).
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import services from "../data/services";
// 🆕 Round 28s179 — `therapists` import dropped (only used by the
//   removed Compare dialog).
import { startingPrice, durationsFor, formatTHB, priceForDuration } from "../utils/servicePricing";
import HowItWorks from "@/components/home/HowItWorks";
// 🆕 Round 28s179 — useServiceUsageStats no longer consumed
//   (Compare dialog drove the live counts).
import { useDocumentMeta } from "@/utils/useDocumentMeta";
// 🆕 Round 28r52 — Phase 3.1 responsive shell replaces the old
//   maxWidth: 430 phone-shell so the Services lobby widens on tablet
//   and desktop instead of sitting as a narrow strip.
import { responsiveShell } from "@/theme/breakpoints";

const SERIF = '"Federo", "Italiana", "Cinzel", "Fraunces", Georgia, "Times New Roman", serif';
const SANS = '"Inter", system-ui, -apple-system, sans-serif';

// ─── About pillars — factual only, no fake metrics ────────────────────
const ABOUT_PILLARS: Array<{
  Icon: typeof VerifiedRoundedIcon;
  title: string;
  body: string;
  tone: { bg: string; fg: string };
}> = [
  {
    Icon: VerifiedRoundedIcon,
    title: "Verified practitioners",
    body:
      "Each profile is personally vetted before publication — photographs, identification, and licence checks.",
    tone: { bg: "rgba(22, 163, 74, 0.10)", fg: "#16a34a" },
  },
  {
    Icon: VisibilityOffRoundedIcon,
    title: "Discreet & private",
    body:
      "Plain-card statements, encrypted reservations, no signage upon arrival. Your stay remains yours.",
    tone: { bg: "rgba(15, 23, 42, 0.08)", fg: "#475569" },
  },
  {
    Icon: LocalHotelRoundedIcon,
    title: "Hotel & residence outcall",
    body:
      "Your practitioner arrives anywhere in central Bangkok — Sukhumvit, Silom, Asok, Thonglor, Sathorn.",
    tone: { bg: "rgba(180, 0, 10, 0.08)", fg: "#B4000A" },
  },
  {
    Icon: SupportAgentRoundedIcon,
    title: "24/7 concierge",
    body:
      "A real concierge on WhatsApp, LINE, and Telegram around the clock — before, during, and after each session.",
    tone: { bg: "rgba(14, 165, 233, 0.10)", fg: "#0284C7" },
  },
];

// Round 28c4 — Reservations pillars, payment CTA, arrival window,
//   concierge channel grid, and telegram broadcast link have all been
//   moved into the HowItWorks component (used by the "How to book" tab),
//   so this file no longer holds them. Single source of truth for the
//   booking flow lives in `src/components/home/HowItWorks.tsx`.

const ServicesPage: React.FC = () => {
  // 🆕 Round 28s195 — `navigate` no longer needed (card click is a
  //   no-op; reservation routes via concierge channels in the panel).
  const [searchParams] = useSearchParams();
  const initialTab =
    searchParams.get("tab") === "how"
      ? "how"
      : searchParams.get("tab") === "about"
        ? "about"
        : "services";
  const [section, setSection] = React.useState<"services" | "about" | "how">(
    initialTab
  );

  // 🆕 Round 28s179 — Live booking-count hook removed (Compare
  //   dialog was its only consumer).

  // 🆕 Round 28s96 (SEO) — per-page meta (restored Clean v3 page had none).
  useDocumentMeta({
    title: "Services · SunRed Bangkok Outcall Massage",
    description:
      "Choose your outcall massage in Bangkok — Thai, Aromatherapy, Gentleman's Signature, and SunRed Therapeutic. From ฿1,200, delivered to your hotel or residence.",
    url: "https://sunred.vip/services",
    type: "website",
  });

  // 🆕 Round 28s179 (audit #2 + #3) — Removed:
  //   • Welcome banner state + dismiss handler (was never rendered).
  //   • "Help me choose" inline quiz state.
  //   • "Compare all" panel toggle.
  //   All three lost their UI in earlier rounds; the dialogs below
  //   are also being deleted in this round so the state was dead.

  // Round 28c15 — Services tab uses a MANUAL editorial order.
  //   Premium-led arrangement: high-margin services at the top so
  //   they anchor pricing perception and showcase the brand's most
  //   premium tiers first. The position-1 card gets the most visual
  //   real estate (top of the scroll). Live session count still
  //   appears on each card via the "Delivered N sessions" chip;
  //   only the ORDER is manual.
  //
  //   To re-rank, edit this list. Any service not listed falls to
  //   the end in its original data-array order.
  const SERVICE_DISPLAY_ORDER = React.useMemo(
    () =>
      [
        // 🆕 Round 28s191 — Founder: "สลับ เอาการ์ด 1 สลับมาการ์ดที่ 3
        //   แต่ ให้ยึดการ์ดแนะนำเป็นการ์ดที่โชว์". Swap position 0 ↔ 2
        //   so Aromatherapy heads the row, Gentleman's moves to slot 3.
        //   The BESTSELLER badge stays on Gentleman's via id-match
        //   (BESTSELLER_SERVICE_ID below) — not index-based — so the
        //   ribbon always follows the recommended pick regardless of
        //   editorial reordering. The horizontal scroll then auto-
        //   centres on Gentleman's on mount so it's the first card
        //   the guest sees.
        // 🆕 Round 28s198 — Founder: "สลับการ์ด 1 กับ 2".
        //   Slot 0 ↔ slot 1 swap: Thai leads, Aroma second.
        "xSR-Thai",   // Thai Massage — ฿1,200 (slot 0)
        "SR-Aroma",   // Aromatherapy — ฿1,600 (slot 1)
        "SR-HJ2200",  // Gentleman's Signature — ฿2,200 ★ BESTSELLER (slot 2)
        "SR-B2B3200", // SunRed Therapeutic — ฿3,200 (slot 3)
      ] as const,
    []
  );

  // 🆕 Round 28s191 — Single source of truth for the "recommended"
  //   card so reordering SERVICE_DISPLAY_ORDER never strands the
  //   BESTSELLER ribbon on the wrong service.
  const BESTSELLER_SERVICE_ID = "SR-HJ2200";

  const sortedServices = React.useMemo(() => {
    return [...services].sort((a, b) => {
      const aIdx = SERVICE_DISPLAY_ORDER.indexOf(
        a.id as (typeof SERVICE_DISPLAY_ORDER)[number]
      );
      const bIdx = SERVICE_DISPLAY_ORDER.indexOf(
        b.id as (typeof SERVICE_DISPLAY_ORDER)[number]
      );
      if (aIdx === -1 && bIdx === -1) return 0;
      if (aIdx === -1) return 1;
      if (bIdx === -1) return -1;
      return aIdx - bIdx;
    });
  }, [SERVICE_DISPLAY_ORDER]);

  // 🆕 Round 28s182 — Founder: "ให้มันอยู่การ์ดเดียวกัน". Card
  //   carries its own detail + concierge reserve channels, so the
  //   scroll-target panel was removed. Card tap is a no-op now.
  const handleSelectService = (_id: string) => {
    /* card content is self-contained — no navigation, no scroll */
  };
  // 🆕 Round 28s195 — handleBookService removed (no consumer after
  //   28s184/28s185 dropped the Book CTAs).

  return (
    <Box
      sx={{
        // Round 28b10 — Clean v3 cool-neutral phone shell
        // 🆕 Round 28r52 — responsiveShell widens through sm/md/lg.
        ...responsiveShell,
        minHeight: "100vh",
        background: "#F4F6F5",
        borderRadius: { xs: "28px", md: 0 },
        overflow: "hidden",
        boxShadow: {
          xs: "0 20px 60px rgba(15, 23, 42, 0.08)",
          md: "none",
        },
        position: "relative",
        pb: 10,
        fontFamily: SANS,
      }}
    >
      <Box sx={{ width: "100%", pb: 12 }}>
        {/* 🆕 Round 28s179 (audit #1) — Page header block dropped.
            Logo + "SunRed Wellness" wordmark + tagline + 5 social
            chips all duplicated info that lives on HomePage / TopNav.
            ServicesPage opens directly with the tab strip + rate
            cards now, which is what guests came here for. */}
        <Box sx={{ height: 12 }} />

        {/* 🆕 Round 28s179 — Profile header block removed (audit #1).
            The logo + "SunRed Wellness" + tagline + 5 social chips
            all duplicated content from HomePage / TopNav. */}

        {/* ─── Tabs — animated pill (Round 28c11) ───
              Uses framer-motion `layoutId` so the active pill slides
              smoothly between tabs. Inactive tabs gain a warm hover
              tint; active tab feels like a glowing red token. */}
        <Box
          component={motion.div}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.75, ease: "easeOut" }}
          sx={{
            // 🆕 Round 28s169 — Founder: "3 แทบ เอากรอบออก". Strip
            //   the white pill background + slate border + shadow
            //   so the tabs read as clean inline buttons against
            //   the page bg. Active pill (red gradient) still slides
            //   between tabs via the existing `layoutId` animation.
            mt: 2.5,
            mx: 2,
            p: 0.5,
            borderRadius: 999,
            background: "transparent",
            border: "none",
            boxShadow: "none",
            display: "flex",
            position: "relative",
          }}
          role="tablist"
        >
          {(
            [
              { value: "services", label: "Services" },
              { value: "about", label: "About us" },
              { value: "how", label: "How to book" },
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
                  height: 40,
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  // 🆕 Round 28s199 — Founder: "เปลี่ยนฟ้อนเหมือน
                  //   navbar". Tab labels now match the TopNav
                  //   "SUNRED BANGKOK" wordmark: Cinzel-led serif,
                  //   uppercase, wide letter-spacing, weight 700.
                  fontFamily:
                    '"Cinzel", "Federo", "Italiana", "Fraunces", Georgia, serif',
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: isActive ? "#fff" : "rgba(15, 23, 42, 0.55)",
                  transition:
                    "color 0.25s ease, transform 0.18s ease",
                  "&:hover": isActive
                    ? {}
                    : { color: "#B4000A", transform: "translateY(-1px)" },
                  "&:active": { transform: "scale(0.96)" },
                  "&:focus-visible": {
                    outline: "2px solid rgba(15, 23, 42, 0.50)",
                    outlineOffset: -2,
                    borderRadius: 999,
                  },
                }}
              >
                {/* Sliding active pill — single shared layoutId */}
                {isActive && (
                  <Box
                    component={motion.span}
                    layoutId="activeTabPill"
                    transition={{
                      type: "spring",
                      stiffness: 380,
                      damping: 32,
                    }}
                    sx={{
                      position: "absolute",
                      inset: 0,
                      borderRadius: 999,
                      background:
                        "#B4000A",
                      boxShadow:
                        "0 4px 14px rgba(15, 23, 42, 0.32), inset 0 1px 0 rgba(255,255,255,0.18)",
                      zIndex: 0,
                    }}
                  />
                )}
                <Box
                  component="span"
                  sx={{ position: "relative", zIndex: 1 }}
                >
                  {tab.label}
                </Box>
              </Box>
            );
          })}
        </Box>

        {/* ─── Services tab ─── */}
        {section === "services" && (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: 2,
              mt: 3,
            }}
          >
            {/* 🆕 Round 28s176 — "Help me choose" + "Compare all"
                action row removed (founder: "เอาออกเลย"). The state
                hooks (quizOpen / compareOpen) stay so the modals
                below still compile, but users no longer have an
                entry-point — modals are effectively dormant until
                a future re-add. */}

            {/* 🆕 Round 28s186 — Founder: "ใส่หัวข้อด้วย" (ROLADEX
                reference shows a "Rates & Services" bar above the
                rate cards). Solid brand-red bar matching TopNav for
                visual hierarchy + sense of section. */}
            <Box
              sx={{
                // 🆕 Round 28s196 — Founder: "ขยับอีกนิด มันชิดขอบ
                //   เกินไป". Bumped horizontal padding 20 → 28 so
                //   neither title nor count hugs the edge.
                margin: "0 -16px 12px",
                padding: "12px 28px",
                background: "#B4000A",
                color: "#FFFFFF",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Typography
                component="h2"
                sx={{
                  fontFamily: SANS,
                  fontSize: 13,
                  fontWeight: 700,
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  color: "#FFFFFF",
                }}
              >
                Rates &amp; Services
              </Typography>
              <Typography
                component="span"
                sx={{
                  fontFamily: SANS,
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "rgba(255,255,255,0.78)",
                }}
              >
                {sortedServices.length} rituals
              </Typography>
            </Box>

            {/* 🆕 Round 28s190-191 — Horizontal scroll, center snap.
                28s191 adds an auto-scroll on mount so the bestseller
                card (BESTSELLER_SERVICE_ID) is the FIRST one visible
                even though its slot is mid-list. */}
            <Box
              ref={(node: HTMLDivElement | null) => {
                if (!node) return;
                // Defer one frame so children have laid out + widths
                // are measurable.
                window.requestAnimationFrame(() => {
                  const target = node.querySelector<HTMLElement>(
                    '[data-bestseller="true"]',
                  );
                  if (!target) return;
                  const offset =
                    target.offsetLeft -
                    (node.clientWidth - target.clientWidth) / 2;
                  node.scrollLeft = Math.max(0, offset);
                });
              }}
              sx={{
                display: "flex",
                flexDirection: "row",
                // 🆕 Round 28s192 — Wider gap (16px → 28px) so the
                //   bestseller's 1.06× scale doesn't nibble into the
                //   neighbour cards.
                // 🆕 Round 28s200 — Extra top padding so the lifted
                //   "Most Recommended" ribbon (top: -28) doesn't
                //   collide with the RATES & SERVICES bar above.
                gap: 3.5,
                padding: "40px 0 24px",
                margin: "0 -16px",
                overflowX: "auto",
                scrollSnapType: "x mandatory",
                scrollPaddingInline: "calc((100% - 290px) / 2)",
                scrollbarWidth: "none",
                "&::-webkit-scrollbar": { display: "none" },
                // Center the row when there are few cards (no scroll)
                "&::before, &::after": {
                  content: '""',
                  flexShrink: 0,
                  width: "calc((100% - 290px) / 2)",
                },
              }}
            >
            {sortedServices.map((svc, index) => {
              const tiers = durationsFor(svc);
              // Per-service icon + tier label for the prettied-up card
              const iconForService = (id: string) => {
                if (id === "xSR-Thai") return SpaRoundedIcon;
                if (id === "SR-Aroma") return LocalFloristRoundedIcon;
                if (id === "SR-HJ2200") return DiamondRoundedIcon;
                return AutoAwesomeRoundedIcon; // SR-B2B3200 + fallback
              };
              const Icon = iconForService(svc.id);
              const isPremium =
                svc.id === "SR-HJ2200" || svc.id === "SR-B2B3200";
              const tierLabel = isPremium ? "Premium" : "Signature";
              return (
                <motion.div
                  key={svc.name}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    delay: index * 0.06,
                    duration: 0.4,
                    ease: "easeOut",
                  }}
                  style={{
                    flexShrink: 0,
                    width: 290,
                    scrollSnapAlign: "center",
                    position: "relative",
                  }}
                  // 🆕 Round 28s191 — Auto-scroll target for the
                  //   bestseller card so it lands centred on mount.
                  data-bestseller={svc.id === BESTSELLER_SERVICE_ID || undefined}
                >
                  {/* 🆕 Round 28s193 — Bestseller ribbon refined.
                      Founder: "ทำให้มันเป็นการ์ดแนะนำจริงๆ". Larger
                      pill · crown glyph · subtle pulse · positioned
                      higher so it doesn't tangle with the PREMIUM
                      badge inside the hero image. */}
                  {svc.id === BESTSELLER_SERVICE_ID && (
                    <Box
                      sx={{
                        // 🆕 Round 28s196 — amber gradient ribbon.
                        // 🆕 Round 28s200 — Founder: "ขยับขึ้นมา
                        //   แบบนี้". Lifted from top: -16 → -28 so
                        //   the ribbon floats CLEAR of the scaled-up
                        //   card's hero image edge (card scale 1.06×
                        //   eats the previous -16px clearance).
                        position: "absolute",
                        top: -28,
                        left: "50%",
                        transform: "translateX(-50%) scale(1.06)",
                        zIndex: 3,
                        padding: "7px 18px",
                        borderRadius: "999px",
                        background:
                          "linear-gradient(135deg, #FFCB45 0%, #F5A623 55%, #C2820F 100%)",
                        color: "#1A2B2E",
                        fontFamily: SANS,
                        fontSize: 10,
                        fontWeight: 800,
                        letterSpacing: "0.22em",
                        textTransform: "uppercase",
                        boxShadow:
                          "0 8px 18px rgba(245, 166, 35, 0.46), 0 2px 4px rgba(15, 23, 42, 0.24), inset 0 1px 0 rgba(255,255,255,0.45)",
                        whiteSpace: "nowrap",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "8px",
                        "&::before, &::after": {
                          content: '"♦"',
                          fontSize: 7,
                          opacity: 0.55,
                          color: "#7C5A00",
                        },
                      }}
                    >
                      <Box
                        component="span"
                        sx={{
                          fontSize: 12,
                          lineHeight: 1,
                          mr: -0.5,
                          color: "#B4000A",
                        }}
                        aria-hidden
                      >
                        ★
                      </Box>
                      Most Recommended
                    </Box>
                  )}
                  <Box
                    sx={{
                      borderRadius: "22px",
                      overflow: "hidden",
                      background: "#FFFFFF",
                      // Bestseller (flagship) gets a thicker brand-red
                      // ring; the others a soft slate frame.
                      border:
                        svc.id === BESTSELLER_SERVICE_ID
                          ? "2px solid #B4000A"
                          : "1px solid rgba(15, 23, 42, 0.10)",
                      boxShadow:
                        svc.id === BESTSELLER_SERVICE_ID
                          ? "0 2px 4px rgba(180, 0, 10, 0.10), 0 22px 48px rgba(180, 0, 10, 0.18)"
                          : "0 2px 4px rgba(15, 23, 42, 0.04), 0 14px 34px rgba(15, 23, 42, 0.10)",
                      // 🆕 Round 28s192 — Founder: "ให้การ์ดแนะนำ
                      //   สูงกว่าการ์ดซ้ายขวา". Bestseller scaled up
                      //   1.06× so its hero, rates, and content all
                      //   sit visibly taller than the neighbours.
                      //   transform-origin: center keeps it centred
                      //   in the snap viewport while growing in both
                      //   directions naturally.
                      transform:
                        svc.id === BESTSELLER_SERVICE_ID
                          ? "scale(1.06)"
                          : "none",
                      transformOrigin: "center center",
                      zIndex: svc.id === BESTSELLER_SERVICE_ID ? 1 : 0,
                      position: "relative",
                      transition:
                        "transform 0.22s ease, box-shadow 0.22s ease",
                      "&:hover": {
                        transform: "translateY(-3px)",
                        boxShadow:
                          "0 3px 6px rgba(180, 0, 10, 0.08), 0 20px 44px rgba(15, 23, 42, 0.14)",
                      },
                    }}
                  >
                    {/* Hero image with name overlay */}
                    <Box
                      sx={{
                        position: "relative",
                        height: 168,
                        background: svc.image
                          ? `center / cover no-repeat url(${svc.image})`
                          : "#1A2B2E",
                      }}
                    >
                      {/* Gradient scrim for legibility */}
                      <Box
                        aria-hidden
                        sx={{
                          position: "absolute",
                          inset: 0,
                          background:
                            "linear-gradient(180deg, rgba(0,0,0,0.10) 0%, rgba(0,0,0,0.10) 50%, rgba(0,0,0,0.78) 100%)",
                        }}
                      />
                      {/* Tier badge top-left — hidden on bestseller
                          so the ribbon stands alone (28s193). */}
                      {svc.id !== BESTSELLER_SERVICE_ID && (
                      <Box
                        sx={{
                          position: "absolute",
                          top: 12,
                          left: 14,
                          padding: "4px 10px",
                          borderRadius: "999px",
                          background: "rgba(255, 255, 255, 0.92)",
                          border: "1px solid rgba(255, 255, 255, 0.6)",
                          backdropFilter: "blur(8px)",
                          fontFamily: SANS,
                          fontSize: 9.5,
                          fontWeight: 800,
                          letterSpacing: "0.18em",
                          textTransform: "uppercase",
                          color: "#B4000A",
                        }}
                      >
                        <Icon sx={{ fontSize: 11, mr: 0.5, verticalAlign: "middle" }} />
                        {tierLabel}
                      </Box>
                      )}
                      {/* Name + desc */}
                      <Box
                        sx={{
                          position: "absolute",
                          left: 18,
                          right: 18,
                          bottom: 14,
                          color: "#FFFFFF",
                        }}
                      >
                        <Typography
                          sx={{
                            fontFamily: SERIF,
                            fontSize: 20,
                            fontWeight: 600,
                            letterSpacing: "0.02em",
                            lineHeight: 1.12,
                            textShadow: "0 1px 6px rgba(0,0,0,0.45)",
                            mb: 0.5,
                          }}
                        >
                          {svc.name}
                        </Typography>
                        <Typography
                          sx={{
                            fontFamily: SANS,
                            fontSize: 12,
                            fontWeight: 500,
                            color: "rgba(255,255,255,0.92)",
                            lineHeight: 1.4,
                            textShadow: "0 1px 5px rgba(0,0,0,0.35)",
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                          }}
                        >
                          {svc.desc}
                        </Typography>
                      </Box>
                    </Box>

                    {/* Rate table — compact, no icons */}
                    <Box sx={{ padding: "14px 20px 8px" }}>
                      {tiers.map((dur, di) => {
                        const price = priceForDuration(svc, dur);
                        const isFirst = di === 0;
                        // 🆕 Round 28s197 — Founder: "ใส่เป็นนาที
                        //   ไม่ใช่ชั่วโมง". Always render duration
                        //   in minutes (60 min / 90 min / 120 min)
                        //   regardless of whether it crosses an
                        //   hour boundary.
                        const label = `${dur} min`;
                        return (
                          <Box
                            key={dur}
                            sx={{
                              display: "flex",
                              alignItems: "baseline",
                              justifyContent: "space-between",
                              padding: "8px 0",
                              borderBottom:
                                di < tiers.length - 1
                                  ? "1px solid rgba(15, 23, 42, 0.05)"
                                  : "none",
                            }}
                          >
                            <Typography
                              sx={{
                                fontFamily: SANS,
                                fontSize: 13,
                                fontWeight: isFirst ? 700 : 500,
                                color: isFirst ? "#1A2B2E" : "#4A5568",
                                letterSpacing: "0.005em",
                              }}
                            >
                              {label}
                            </Typography>
                            <Typography
                              sx={{
                                fontFamily: SERIF,
                                fontSize: isFirst ? 17 : 14.5,
                                fontWeight: 700,
                                color: isFirst ? "#B4000A" : "#1A2B2E",
                                letterSpacing: "-0.005em",
                              }}
                            >
                              {formatTHB(price)}
                            </Typography>
                          </Box>
                        );
                      })}
                    </Box>

                    {/* About — full paragraph (no line clamp) */}
                    <Box
                      sx={{
                        padding: "14px 20px 10px",
                        borderTop: "1px solid rgba(15, 23, 42, 0.05)",
                      }}
                    >
                      <Typography
                        sx={{
                          fontFamily: SANS,
                          fontSize: 9.5,
                          fontWeight: 800,
                          letterSpacing: "0.18em",
                          textTransform: "uppercase",
                          color: "#B4000A",
                          mb: 1,
                        }}
                      >
                        About this ritual
                      </Typography>
                      <Typography
                        sx={{
                          fontFamily: SANS,
                          fontSize: 13,
                          fontWeight: 500,
                          color: "#1A2B2E",
                          lineHeight: 1.6,
                        }}
                      >
                        {svc.detail}
                      </Typography>
                    </Box>

                    {/* What's included — full benefit list */}
                    {svc.benefit && svc.benefit.length > 0 && (
                      <Box sx={{ padding: "10px 20px 18px" }}>
                        <Typography
                          sx={{
                            fontFamily: SANS,
                            fontSize: 9.5,
                            fontWeight: 800,
                            letterSpacing: "0.18em",
                            textTransform: "uppercase",
                            color: "#B4000A",
                            mb: 1.25,
                          }}
                        >
                          What&apos;s included
                        </Typography>
                        <Box
                          sx={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "8px",
                          }}
                        >
                          {svc.benefit.map((b: string, i: number) => (
                            <Box
                              key={i}
                              sx={{
                                display: "flex",
                                alignItems: "flex-start",
                                gap: "10px",
                              }}
                            >
                              <CheckRoundedIcon
                                sx={{
                                  fontSize: 16,
                                  color: "#16A34A",
                                  mt: "1px",
                                  flexShrink: 0,
                                }}
                              />
                              <Typography
                                sx={{
                                  fontFamily: SANS,
                                  fontSize: 12.5,
                                  fontWeight: 500,
                                  color: "#1A2B2E",
                                  lineHeight: 1.5,
                                }}
                              >
                                {b}
                              </Typography>
                            </Box>
                          ))}
                        </Box>
                      </Box>
                    )}

                    {/* 🆕 Round 28s185 — Founder: "เอาปุ่มออก". Reserve
                        pill removed from the card footer. Card is now
                        purely informational (hero · rates · about).
                        Reservation happens through TopNav drawer ·
                        BottomNav · or therapist detail page. */}
                  </Box>
                </motion.div>
              );
            })}
            </Box>


            {/* 🆕 Round 28s206 — Founder: "Services tab จัดให้สวย
                ขึ้น". Service area + Typical arrival window combined
                into a single "Logistics" card with two split panels —
                cleaner visual rhythm, less vertical scroll. Section
                eyebrow bar ("AREAS & TIMING") echoes the
                RATES & SERVICES treatment at the top. */}
            <Box sx={{ mt: 2, mx: 0 }}>
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
                  sx={{
                    fontFamily: SANS,
                    fontSize: 10,
                    fontWeight: 800,
                    letterSpacing: "0.22em",
                    textTransform: "uppercase",
                    color: "#B4000A",
                  }}
                >
                  Areas &amp; Timing
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
              <Box
                sx={{
                  borderRadius: "18px",
                  background: "#FFFFFF",
                  border: "1px solid rgba(15, 23, 42, 0.06)",
                  boxShadow:
                    "0 1px 2px rgba(15, 23, 42, 0.04), 0 6px 18px rgba(15, 23, 42, 0.05)",
                  overflow: "hidden",
                }}
              >
                {/* Service area */}
                <Box sx={{ padding: "18px 20px 16px" }}>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      mb: 1,
                    }}
                  >
                    <LocationOnRoundedIcon
                      sx={{ color: "#B4000A", fontSize: 18 }}
                    />
                    <Typography
                      sx={{
                        fontFamily: SANS,
                        fontSize: 13.5,
                        fontWeight: 700,
                        color: "#1A2B2E",
                        letterSpacing: "-0.005em",
                      }}
                    >
                      Service area
                    </Typography>
                  </Box>
                  <Typography
                    sx={{
                      fontFamily: SANS,
                      fontSize: 12.5,
                      lineHeight: 1.6,
                      color: "rgba(15, 23, 42, 0.72)",
                    }}
                  >
                    Sukhumvit · Silom · Asok · Thonglor · Sathorn · Phrom
                    Phong · Ari · Chidlom · Ploenchit. For destinations
                    beyond the central districts, our concierge is
                    pleased to provide a private quotation.
                  </Typography>
                </Box>

                {/* Hairline divider */}
                <Box
                  aria-hidden
                  sx={{
                    height: 1,
                    background: "rgba(15, 23, 42, 0.06)",
                    mx: "20px",
                  }}
                />

                {/* Typical arrival window */}
                <Box sx={{ padding: "16px 20px 18px" }}>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      mb: 1,
                    }}
                  >
                    <AccessTimeRoundedIcon
                      sx={{ color: "#B4000A", fontSize: 18 }}
                    />
                    <Typography
                      sx={{
                        fontFamily: SANS,
                        fontSize: 13.5,
                        fontWeight: 700,
                        color: "#1A2B2E",
                        letterSpacing: "-0.005em",
                      }}
                    >
                      Typical arrival window
                    </Typography>
                  </Box>
                  <Typography
                    sx={{
                      fontFamily: SANS,
                      fontSize: 12.5,
                      color: "rgba(15, 23, 42, 0.7)",
                      lineHeight: 1.55,
                    }}
                  >
                    <Box
                      component="span"
                      sx={{ fontWeight: 600, color: "#1A2B2E" }}
                    >
                      Central Bangkok:
                    </Box>{" "}
                    30 to 60 minutes.{" "}
                    <Box
                      component="span"
                      sx={{ fontWeight: 600, color: "#1A2B2E" }}
                    >
                      Outside the centre or peak hours:
                    </Box>{" "}
                    60 to 90 minutes.
                  </Typography>
                </Box>
              </Box>
            </Box>

            {/* 🆕 Round 28s206 — Concierge section now sits under a
                matching "RESERVE" eyebrow bar so the page reads as 3
                distinct chapters: Rates · Areas & Timing · Reserve. */}
            <Box sx={{ mt: 2.5, mx: 0 }}>
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
                  sx={{
                    fontFamily: SANS,
                    fontSize: 10,
                    fontWeight: 800,
                    letterSpacing: "0.22em",
                    textTransform: "uppercase",
                    color: "#B4000A",
                  }}
                >
                  Reserve
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
            <Box
              sx={{
                padding: 2.25,
                borderRadius: "18px",
                background: "#FFFFFF",
                border: "1px solid rgba(15, 23, 42, 0.06)",
                boxShadow:
                  "0 1px 2px rgba(15, 23, 42, 0.04), 0 6px 18px rgba(15, 23, 42, 0.05)",
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  fontSize: 10,
                  letterSpacing: "0.24em",
                  textTransform: "uppercase",
                  color: "#4A5568",
                  fontWeight: 700,
                  mb: 0.5,
                  fontFamily: SANS,
                  "&::before": {
                    content: '""',
                    width: "22px",
                    height: "1px",
                    background: "rgba(184, 92, 60, 0.55)",
                  },
                }}
              >
                Concierge
              </Box>
              <Typography
                sx={{
                  fontFamily: SERIF,
                  fontSize: 17,
                  fontWeight: 500,
                  color: "#1A2B2E",
                  letterSpacing: "-0.01em",
                  lineHeight: 1.3,
                  mb: 0.5,
                  "& em": { fontStyle: "italic", color: "#B4000A" },
                }}
              >
                At your <em>service</em>
              </Typography>
              <Typography
                sx={{
                  fontFamily: SANS,
                  fontSize: 12.5,
                  color: "rgba(15, 23, 42,0.65)",
                  lineHeight: 1.55,
                  mb: 1.75,
                }}
              >
                Around the clock, in your preferred language. Reach us
                through any of the channels below.
              </Typography>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 1.25,
                }}
              >
                {[
                  {
                    Icon: FaWhatsapp,
                    name: "WhatsApp",
                    handle: "+66 63 435 0987",
                    href: "https://wa.me/66634350987",
                    external: true,
                    tone: { bg: "rgba(37, 211, 102, 0.10)", fg: "#25D366" },
                  },
                  {
                    Icon: FaTelegramPlane,
                    name: "Telegram",
                    handle: "@SunRedvip_bkk",
                    href: "https://t.me/SunRedvip_bkk",
                    external: true,
                    tone: { bg: "rgba(34, 158, 217, 0.10)", fg: "#229ED9" },
                  },
                  {
                    Icon: FaLine,
                    name: "LINE",
                    handle: "Add friend",
                    href: "https://lin.ee/uqvdwWt",
                    external: true,
                    tone: { bg: "rgba(6, 199, 85, 0.10)", fg: "#06C755" },
                  },
                  {
                    Icon: FaWeixin,
                    name: "WeChat",
                    handle: "Scan QR",
                    href: "/wechat-scan",
                    external: false,
                    tone: { bg: "rgba(7, 193, 96, 0.10)", fg: "#07C160" },
                  },
                ].map(({ Icon, name, handle, href, external, tone }) => (
                  <Box
                    key={name}
                    component="a"
                    href={href}
                    {...(external
                      ? { target: "_blank", rel: "noopener noreferrer" }
                      : {})}
                    sx={{
                      textDecoration: "none",
                      color: "inherit",
                      p: 1.5,
                      borderRadius: "14px",
                      background: "#FFFFFF",
                      border: "1px solid rgba(15, 23, 42, 0.06)",
                      boxShadow: "0 1px 2px rgba(15, 23, 42, 0.03)",
                      display: "flex",
                      flexDirection: "column",
                      gap: 0.75,
                      transition:
                        "transform 200ms ease, border-color 200ms ease, box-shadow 200ms ease",
                      "&:hover": {
                        transform: "translateY(-1px)",
                        borderColor: "rgba(15, 23, 42, 0.14)",
                        boxShadow:
                          "0 1px 2px rgba(180, 0, 10, 0.05), 0 8px 22px rgba(180, 0, 10, 0.05)",
                      },
                    }}
                  >
                    <Box
                      sx={{
                        width: 32,
                        height: 32,
                        borderRadius: "10px",
                        background: tone.bg,
                        color: tone.fg,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        "& svg": { fontSize: 18 },
                      }}
                    >
                      <Icon />
                    </Box>
                    <Typography
                      sx={{
                        fontFamily: SERIF,
                        fontSize: 13.5,
                        fontWeight: 600,
                        color: "#1A2B2E",
                        lineHeight: 1.25,
                        letterSpacing: "-0.005em",
                      }}
                    >
                      {name}
                    </Typography>
                    <Typography
                      sx={{
                        fontFamily: SANS,
                        fontSize: 11.5,
                        lineHeight: 1.4,
                        color: "rgba(15, 23, 42,0.7)",
                        wordBreak: "break-word",
                      }}
                    >
                      {handle}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Box>

            {/* Subscribe to Telegram channel */}
            <Box sx={{ display: "flex", justifyContent: "center", mt: 1.5 }}>
              <Box
                component="a"
                href="https://t.me/SunRed_BKK"
                target="_blank"
                rel="noopener noreferrer"
                sx={{
                  fontFamily: SANS,
                  fontSize: 12,
                  fontWeight: 600,
                  color: "rgba(15, 23, 42,0.7)",
                  textDecoration: "none",
                  letterSpacing: "0.02em",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 0.5,
                  py: 0.5,
                  "&:hover": { color: "#B4000A" },
                }}
              >
                Subscribe to our Telegram channel for updates

              </Box>
            </Box>
            </Box>{/* /Reserve section wrapper (28s206) */}
          </Box>
        )}

        {/* ─── About Us tab ─── */}
        {section === "about" && (
          <Box sx={{ px: 2, mt: 3, display: "flex", flexDirection: "column", gap: 2 }}>
            {/* 🆕 Round 28s216 (About audit #1) — Added eyebrow
                section header to match Services + How-to-book visual
                rhythm ("RATES & SERVICES" / "AREAS & TIMING"). */}
            <Typography
              sx={{
                fontFamily: SANS,
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "#B4000A",
                marginLeft: "2px",
              }}
            >
              About · Our Promise
            </Typography>

            <Box
              sx={{
                p: 2.5,
                borderRadius: "18px",
                background: "#FFFFFF",
                border: "1px solid rgba(15, 23, 42, 0.06)",
                boxShadow:
                  "0 1px 2px rgba(15, 23, 42, 0.04), 0 4px 14px rgba(15, 23, 42, 0.05)",
              }}
            >
              {/* 🆕 Round 28s216 (About audit #2) — SERIF → SANS 700
                  for the hero claim, matching Services + How-to-book
                  audits (28s199 / 28s202). Italic accent kept in
                  brand red for visual punctuation. */}
              <Typography
                sx={{
                  fontFamily: SANS,
                  fontSize: 17,
                  fontWeight: 700,
                  color: "#1A2B2E",
                  letterSpacing: "-0.01em",
                  lineHeight: 1.35,
                  mb: 1,
                  "& em": {
                    color: "#B4000A",
                    fontStyle: "italic",
                    fontFamily: SERIF,
                    fontWeight: 500,
                  },
                }}
              >
                Bangkok&apos;s most discreet outcall massage,{" "}
                <em>delivered to you.</em>
              </Typography>
              <Typography
                sx={{
                  fontFamily: SANS,
                  fontSize: 13.5,
                  lineHeight: 1.65,
                  color: "rgba(15, 23, 42,0.78)",
                }}
              >
                SunRed is a private concierge for verified outcall wellness
                across central Bangkok. Each practitioner is personally
                screened, every reservation is handled by a real concierge,
                and every detail from arrival to payment remains entirely
                between you and us.
              </Typography>
            </Box>

            {/* 🆕 Round 28s216 (About audit #3) — 2×2 grid → 1-col
                stack. Each pillar now has icon left + title/body
                right, easier to scan on phone. Title font SERIF →
                SANS 700 for consistency. */}
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                gap: 1,
              }}
            >
              {ABOUT_PILLARS.map(({ Icon, title, body, tone }) => (
                <Box
                  key={title}
                  sx={{
                    p: 1.5,
                    borderRadius: "14px",
                    background: "#FFFFFF",
                    border: "1px solid rgba(15, 23, 42, 0.06)",
                    boxShadow: "0 1px 2px rgba(15, 23, 42, 0.03)",
                    display: "flex",
                    flexDirection: "row",
                    alignItems: "flex-start",
                    gap: 1.5,
                    transition:
                      "border-color 200ms ease, box-shadow 200ms ease",
                    "&:hover": {
                      borderColor: "rgba(15, 23, 42, 0.14)",
                      boxShadow:
                        "0 1px 2px rgba(180, 0, 10, 0.05), 0 8px 22px rgba(180, 0, 10, 0.05)",
                    },
                  }}
                >
                  <Box
                    sx={{
                      width: 36,
                      height: 36,
                      borderRadius: "10px",
                      background: tone.bg,
                      color: tone.fg,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      "& svg": { fontSize: 20 },
                    }}
                  >
                    <Icon />
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography
                      sx={{
                        fontFamily: SANS,
                        fontSize: 14,
                        fontWeight: 700,
                        color: "#1A2B2E",
                        lineHeight: 1.25,
                        letterSpacing: "-0.005em",
                        mb: 0.4,
                      }}
                    >
                      {title}
                    </Typography>
                    <Typography
                      sx={{
                        fontFamily: SANS,
                        fontSize: 12,
                        lineHeight: 1.55,
                        color: "rgba(15, 23, 42,0.7)",
                      }}
                    >
                      {body}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Box>

            {/* 🆕 Round 28s204 — Service area block fully deleted
                from About us (was display:none after move to
                Services tab in 28s203). */}

            <Box
              sx={{
                p: 2,
                borderRadius: "16px",
                background: "#FFFFFF",
                border: "1px solid rgba(15, 23, 42, 0.06)",
                boxShadow: "0 1px 2px rgba(15, 23, 42, 0.03)",
              }}
            >
              {/* 🆕 Round 28s216 (About audit #4) — SERIF → SANS 700,
                  matching the rest of About + Services + How-to-book. */}
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                <LanguageRoundedIcon sx={{ color: "#0284C7", fontSize: 18 }} />
                <Typography
                  sx={{
                    fontFamily: SANS,
                    fontSize: 14,
                    fontWeight: 700,
                    color: "#1A2B2E",
                  }}
                >
                  Languages supported
                </Typography>
              </Box>
              <Typography
                sx={{
                  fontFamily: SANS,
                  fontSize: 12.5,
                  lineHeight: 1.6,
                  color: "rgba(15, 23, 42,0.72)",
                }}
              >
                English · ไทย · 中文 · 日本語 · 한국어 — our concierge
                corresponds in your language, and many practitioners are
                fluent in two or more.
              </Typography>
            </Box>
          </Box>
        )}

        {/* ─── How to book tab ─── */}
        {section === "how" && <HowItWorks />}
      </Box>

      {/* 🆕 Round 28s179 (audit #2) — Quiz + Compare dialogs
          removed. No UI ever opened them after the action-row
          buttons were dropped in 28s176. */}
    </Box>
  );
};

// 🆕 Round 28s179 — ServiceQuiz + ServiceCompare helper
//   components removed along with their dialogs (audit #2).
export default ServicesPage;
