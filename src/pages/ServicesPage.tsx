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
import StarRoundedIcon from "@mui/icons-material/StarRounded";
import LocationOnRoundedIcon from "@mui/icons-material/LocationOnRounded";
import LanguageRoundedIcon from "@mui/icons-material/LanguageRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import CompareArrowsRoundedIcon from "@mui/icons-material/CompareArrowsRounded";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import services from "../data/services";
import { therapists } from "../data/therapists";
import { startingPrice, durationsFor, formatTHB } from "../utils/servicePricing";
import HowItWorks from "@/components/home/HowItWorks";
import { useServiceUsageStats } from "@/hooks/useServiceUsageStats";
import { useDocumentMeta } from "@/utils/useDocumentMeta";

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
  const navigate = useNavigate();
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

  // Live booking counts — UNIQUE customers (humans), not raw session count.
  const { customersById: customerCounts, servedById: servedCounts } =
    useServiceUsageStats();

  // 🆕 Round 28s96 (SEO) — per-page meta (restored Clean v3 page had none).
  useDocumentMeta({
    title: "Services · SunRed Bangkok Outcall Massage",
    description:
      "Choose your outcall massage in Bangkok — Thai, Aromatherapy, Gentleman's Signature, and SunRed Therapeutic. From ฿1,200, delivered to your hotel or residence.",
    url: "https://sunred.vip/services",
    type: "website",
  });

  // Round 28c18 — Welcome banner state.
  //   First-time guests see a complimentary-travel welcome card. We
  //   detect "first time" via a localStorage flag — costs nothing
  //   server-side and is dismissible. Margin-friendly: free travel
  //   only costs the practitioner's transport, not service revenue.
  const [welcomeDismissed, setWelcomeDismissed] = React.useState<boolean>(
    () => {
      if (typeof window === "undefined") return true;
      return window.localStorage.getItem("sunred.welcomeSeen") === "true";
    }
  );
  const dismissWelcome = () => {
    try {
      window.localStorage.setItem("sunred.welcomeSeen", "true");
    } catch {
      /* ignore quota / privacy mode */
    }
    setWelcomeDismissed(true);
  };

  // Round 28c18 — "Help me choose" inline quiz state.
  //   Simple 3-step decision aid that recommends one of the four
  //   services. No external state — everything lives in this component.
  const [quizOpen, setQuizOpen] = React.useState(false);
  const [quizStep, setQuizStep] = React.useState(0);
  const [quizAnswers, setQuizAnswers] = React.useState<{
    intent?: string;
    intensity?: string;
    budget?: string;
  }>({});

  const resetQuiz = () => {
    setQuizStep(0);
    setQuizAnswers({});
  };

  // Round 28c18 — Compare panel toggle (expands below action row).
  const [compareOpen, setCompareOpen] = React.useState(false);

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
        // 🆕 Round 28s93 (founder reorder) — Gentleman's first (TRENDING),
        //   then Thai, Aromatherapy, SunRed Therapeutic last.
        "SR-HJ2200", // Gentleman's Signature — ฿2,200 (TRENDING)
        "xSR-Thai", // Thai Massage — ฿1,200
        "SR-Aroma", // Aromatherapy — ฿1,600
        "SR-B2B3200", // SunRed Therapeutic — ฿3,200
      ] as const,
    []
  );

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

  const handleSelectService = (id: string) => {
    void navigate(`/services/${encodeURIComponent(id)}`);
  };
  const handleBookService = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    // Round 28s4 — was `/therapists?service=...` which redirects to `/`
    // and drops the query string; the service filter was always lost.
    // Land on home directly; deep-link the service via state so a future
    // home-page enhancement can pre-filter the practitioner grid.
    void navigate("/", { state: { selectedServiceId: id } });
  };

  return (
    <Box
      sx={{
        // Round 28b10 — Clean v3 cool-neutral phone shell
        maxWidth: 430,
        margin: "0 auto",
        minHeight: "100vh",
        background: "#F4F6F5",
        borderRadius: "28px",
        overflow: "hidden",
        boxShadow: "0 20px 60px rgba(15, 23, 42, 0.08)",
        position: "relative",
        pb: 10,
        fontFamily: SANS,
      }}
    >
      <Box sx={{ width: "100%", pb: 12 }}>
        {/* ─── Header — logo + verified + tagline ─── */}
        <Box sx={{ height: 50 }} />

        {/* 🆕 Round 28s95 — centered profile header on a soft warm
            backdrop, premium "link-in-bio" register. */}
        <Box
          sx={{
            position: "relative",
            px: 2,
            pt: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
          }}
        >
          <Box
            aria-hidden
            sx={{
              position: "absolute",
              top: -50,
              left: 0,
              right: 0,
              height: 260,
              background:
                "radial-gradient(110% 80% at 50% 0%, rgba(214,40,40,0.13) 0%, rgba(180,0,10,0.05) 38%, transparent 72%)",
              pointerEvents: "none",
            }}
          />
          {/* Logo — spring entry + one-time halo flash + warm hover glow. */}
          <Box
            component={motion.div}
            initial={{ opacity: 0, scale: 0.86 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              type: "spring",
              stiffness: 200,
              damping: 18,
              mass: 0.9,
            }}
            whileHover={{
              scale: 1.03,
              transition: { type: "spring", stiffness: 300, damping: 22 },
            }}
            sx={{
              position: "relative",
              display: "inline-block",
              cursor: "default",
              "& img": {
                transition: "box-shadow 0.32s ease",
              },
              "&:hover img": {
                boxShadow:
                  "0 1px 2px rgba(15, 23, 42, 0.04), 0 14px 36px rgba(15, 23, 42, 0.22)",
              },
            }}
          >
            {/* One-time halo — soft red ring radiates outward on mount */}
            <Box
              component={motion.span}
              aria-hidden
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: [0.94, 1.18, 1.32], opacity: [0, 0.55, 0] }}
              transition={{
                duration: 1.1,
                ease: "easeOut",
                delay: 0.15,
                times: [0, 0.45, 1],
              }}
              sx={{
                position: "absolute",
                inset: -6,
                borderRadius: "50%",
                background:
                  "radial-gradient(circle, rgba(15, 23, 42, 0.32) 0%, rgba(214, 40, 40, 0.18) 55%, rgba(214, 40, 40, 0) 78%)",
                pointerEvents: "none",
                zIndex: 0,
              }}
            />
            <Box
              component="img"
              src="/images/icon/sunred-logo.png"
              alt="SunRed"
              sx={{
                position: "relative",
                width: 118,
                height: 118,
                borderRadius: "50%",
                border: "3px solid #FFFFFF",
                boxShadow:
                  "0 1px 2px rgba(15, 23, 42, 0.04), 0 8px 24px rgba(15, 23, 42, 0.10)",
                objectFit: "cover",
                background: "#fff",
                display: "block",
                zIndex: 1,
              }}
            />
          </Box>

          {/* Verified · location chip */}
          <Box
            component={motion.div}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            sx={{
              mt: 1.75,
              display: "inline-flex",
              alignItems: "center",
              gap: 0.5,
              px: 1.25,
              py: 0.4,
              borderRadius: 999,
              background: "rgba(29, 155, 240, 0.10)",
              border: "1px solid rgba(29, 155, 240, 0.22)",
              fontFamily: SANS,
              fontSize: 10.5,
              fontWeight: 800,
              letterSpacing: "0.06em",
              color: "#1d83c0",
              textTransform: "uppercase",
            }}
          >
            <VerifiedRoundedIcon sx={{ fontSize: 14 }} />
            Verified · Central Bangkok
          </Box>

          {/* 🆕 Round 28s94/95 — brand name + tagline (centered) ABOVE the
              social row. */}
          <Typography
            component={motion.h1}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4, ease: "easeOut" }}
            sx={{
              fontFamily: SERIF,
              fontSize: 27,
              fontWeight: 600,
              color: "#1A2B2E",
              letterSpacing: "-0.015em",
              lineHeight: 1.1,
              mt: 1,
            }}
          >
            SunRed Wellness
          </Typography>

          <Typography
            component={motion.p}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5, ease: "easeOut" }}
            sx={{
              fontFamily: SERIF,
              fontSize: 16,
              fontWeight: 500,
              color: "rgba(15, 23, 42,0.7)",
              mt: 0.75,
              letterSpacing: "-0.01em",
              lineHeight: 1.4,
              maxWidth: "30ch",
              mx: "auto",
              textAlign: "center",
            }}
          >
            Bangkok&apos;s most discreet outcall massage,{" "}
            <Box
              component={motion.em}
              initial={{ color: "rgba(15, 23, 42,0.7)" }}
              animate={{ color: "#B4000A" }}
              transition={{ duration: 0.9, delay: 1.15, ease: "easeOut" }}
              sx={{ fontStyle: "italic" }}
            >
              delivered to you.
            </Box>
          </Typography>

          {/* Social icons — frosted white chips below the tagline. */}
          <Box
            sx={{
              display: "flex",
              gap: 1,
              mt: 2.25,
              flexWrap: "wrap",
              justifyContent: "center",
            }}
          >
            {[
              {
                href: "https://lin.ee/uqvdwWt",
                src: "/images/profli/line.png",
                alt: "Line",
                glow: "rgba(6, 199, 85, 0.42)",
                external: true,
              },
              {
                href: "/wechat-scan",
                src: "/images/profli/wechat_2626283.png",
                alt: "WeChat",
                glow: "rgba(7, 193, 96, 0.42)",
                external: true,
              },
              {
                // 🆕 Round 28s126 — route through FAQ bot first
                href: "https://t.me/SunRedGreeterBot",
                src: "/images/profli/telegram.png",
                alt: "Telegram",
                glow: "rgba(34, 158, 217, 0.45)",
                external: true,
              },
              {
                href: "https://wa.me/66634350987",
                src: "/images/profli/whatsapp.png",
                alt: "WhatsApp",
                glow: "rgba(37, 211, 102, 0.45)",
                external: true,
              },
              {
                href: "https://x.com/SunredBangkok",
                src: "/images/profli/twitter.png",
                alt: "X (Twitter)",
                glow: "rgba(15, 23, 42, 0.45)",
                external: true,
              },
            ].map(({ href, src, alt, glow, external }, i) => (
              <Box
                key={alt}
                component={motion.div}
                initial={{ opacity: 0, y: -10, scale: 0.7 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{
                  type: "spring",
                  stiffness: 240,
                  damping: 18,
                  delay: 0.3 + i * 0.07,
                }}
                whileHover={{
                  y: -4,
                  scale: 1.12,
                  rotate: i % 2 === 0 ? -5 : 5,
                  transition: {
                    type: "spring",
                    stiffness: 320,
                    damping: 14,
                  },
                }}
                whileTap={{
                  scale: 0.88,
                  rotate: 0,
                  transition: { type: "spring", stiffness: 500, damping: 16 },
                }}
                sx={{
                  display: "inline-flex",
                  "& .MuiIconButton-root": {
                    transition:
                      "box-shadow 0.32s ease, background 0.32s ease",
                  },
                  "&:hover .MuiIconButton-root": {
                    boxShadow: `0 6px 22px ${glow}`,
                  },
                }}
              >
                <IconButton
                  component="a"
                  href={href}
                  aria-label={alt}
                  sx={{
                    p: 0.85,
                    background: "#fff",
                    border: "1px solid rgba(15, 23, 42, 0.08)",
                    boxShadow: "0 3px 10px rgba(15, 23, 42, 0.10)",
                    "&:hover": { background: "#fff" },
                  }}
                  {...(external
                    ? { target: "_blank", rel: "noopener noreferrer" }
                    : {})}
                >
                  <Box
                    component="img"
                    src={src}
                    alt={alt}
                    sx={{ width: 30, height: 30 }}
                  />
                </IconButton>
              </Box>
            ))}
          </Box>
        </Box>

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
                  fontFamily: SERIF,
                  fontSize: 12.5,
                  fontWeight: isActive ? 700 : 600,
                  letterSpacing: "0.01em",
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
              px: 2,
            }}
          >
            {/* Action row — Help me choose · Compare all */}
            <Box sx={{ display: "flex", gap: 1 }}>
              <Box
                component="button"
                onClick={() => {
                  if (quizOpen) resetQuiz();
                  setQuizOpen(!quizOpen);
                  setCompareOpen(false);
                }}
                sx={{
                  flex: 1,
                  border: "1px solid rgba(15, 23, 42, 0.06)",
                  borderColor: quizOpen
                    ? "rgba(15, 23, 42, 0.32)"
                    : "rgba(15, 23, 42, 0.06)",
                  background: quizOpen
                    ? "#F4F6F5"
                    : "#FFFFFF",
                  borderRadius: "12px",
                  px: 1.5,
                  py: 1.1,
                  display: "flex",
                  alignItems: "center",
                  gap: 0.75,
                  cursor: "pointer",
                  fontFamily: SANS,
                  fontSize: 12.5,
                  fontWeight: 600,
                  color: quizOpen ? "#B4000A" : "#1A2B2E",
                  letterSpacing: "0.01em",
                  transition:
                    "border-color 0.22s ease, background 0.22s ease, color 0.22s ease",
                }}
              >
                <AutoAwesomeRoundedIcon sx={{ fontSize: 16 }} />
                Help me choose
              </Box>
              <Box
                component="button"
                onClick={() => {
                  setCompareOpen(!compareOpen);
                  setQuizOpen(false);
                }}
                sx={{
                  flex: 1,
                  border: "1px solid rgba(15, 23, 42, 0.06)",
                  borderColor: compareOpen
                    ? "rgba(15, 23, 42, 0.32)"
                    : "rgba(15, 23, 42, 0.06)",
                  background: compareOpen
                    ? "#F4F6F5"
                    : "#FFFFFF",
                  borderRadius: "12px",
                  px: 1.5,
                  py: 1.1,
                  display: "flex",
                  alignItems: "center",
                  gap: 0.75,
                  cursor: "pointer",
                  fontFamily: SANS,
                  fontSize: 12.5,
                  fontWeight: 600,
                  color: compareOpen ? "#B4000A" : "#1A2B2E",
                  letterSpacing: "0.01em",
                  transition:
                    "border-color 0.22s ease, background 0.22s ease, color 0.22s ease",
                }}
              >
                <CompareArrowsRoundedIcon sx={{ fontSize: 16 }} />
                Compare all
              </Box>
            </Box>

            {/* Quiz + Compare popups rendered at page level — see below */}

            {sortedServices.map((svc, index) => {
              // Round 28c16 — position-1 card gets flagship treatment:
              //   taller, brand-red ring, warm glow, deeper hover lift.
              //   Other cards stay neutral so the flagship really pops.
              const isFlagship = index === 0;
              const fromPrice = startingPrice(svc);
              const tiers = durationsFor(svc);
              return (
              <motion.div
                key={svc.name}
                initial={{ opacity: 0, y: 16, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{
                  delay: index * 0.06,
                  duration: 0.4,
                  ease: "easeOut",
                }}
                whileHover={{ scale: isFlagship ? 1.015 : 1.01 }}
              >
                <Box
                  onClick={() => handleSelectService(svc.id)}
                  sx={{
                    position: "relative",
                    height: isFlagship ? 200 : 178,
                    borderRadius: "18px",
                    overflow: "hidden",
                    backgroundImage: `url(${svc.image})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "flex-end",
                    cursor: "pointer",
                    border: isFlagship
                      ? "1.5px solid rgba(15, 23, 42, 0.36)"
                      : "1px solid rgba(15, 23, 42, 0.06)",
                    boxShadow: isFlagship
                      ? "0 1px 2px rgba(180, 0, 10, 0.08), 0 14px 36px rgba(15, 23, 42, 0.20), 0 4px 14px rgba(214, 40, 40, 0.10)"
                      : "0 1px 2px rgba(15, 23, 42, 0.04), 0 10px 28px rgba(15, 23, 42, 0.10)",
                    "&::before": {
                      content: '""',
                      position: "absolute",
                      inset: 0,
                      background:
                        "linear-gradient(180deg, rgba(0,0,0,0) 35%, rgba(0,0,0,0.72) 100%)",
                      pointerEvents: "none",
                    },
                  }}
                >
                  {/* 🆕 Round 28s93 — flagship card shows a "• TRENDING"
                      pill (pulse dot); the rest show their data badge. */}
                  <Box
                    sx={{
                      position: "absolute",
                      top: 12,
                      left: 12,
                      px: 1.2,
                      py: 0.4,
                      fontSize: 10.5,
                      fontWeight: 700,
                      color: "#fff",
                      background:
                        "#B4000A",
                      borderRadius: 1.2,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      boxShadow: "0 4px 10px rgba(15, 23, 42, 0.35)",
                      zIndex: 1,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: isFlagship ? 0.6 : 0,
                    }}
                  >
                    {isFlagship && (
                      <Box
                        component="span"
                        aria-hidden
                        sx={{
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          background: "#fff",
                          boxShadow: "0 0 0 3px rgba(255,255,255,0.30)",
                          animation:
                            "sunredTrendingPulse 1.6s ease-in-out infinite",
                          "@keyframes sunredTrendingPulse": {
                            "0%, 100%": { opacity: 1 },
                            "50%": { opacity: 0.45 },
                          },
                        }}
                      />
                    )}
                    {isFlagship ? "Trending" : svc.badge.replace(/_/g, " ")}
                  </Box>

                  {/* 🆕 Round 28s91 (founder "รายละเอียด เหลือแค่นี้พอ
                      อันเก่ารกไป") — trimmed to name + description +
                      From·duration. Dropped the DELIVERED-sessions chip,
                      avatar stack, "N available", and Book-now button. */}
                  <Box
                    sx={{
                      position: "absolute",
                      left: 16,
                      right: 16,
                      bottom: 14,
                      zIndex: 1,
                    }}
                  >
                    <Typography
                      sx={{
                        fontFamily: SERIF,
                        fontSize: 20,
                        fontWeight: 600,
                        color: "#fff",
                        lineHeight: 1.13,
                        letterSpacing: "-0.01em",
                        textShadow: "0 1px 8px rgba(0,0,0,0.4)",
                        mb: 0.5,
                      }}
                    >
                      {svc.name}
                    </Typography>
                    <Typography
                      sx={{
                        fontFamily: SANS,
                        fontSize: 12.5,
                        color: "rgba(255,255,255,0.88)",
                        lineHeight: 1.4,
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                        textShadow: "0 1px 6px rgba(0,0,0,0.35)",
                        mb: 1,
                      }}
                    >
                      {svc.desc}
                    </Typography>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "baseline",
                        gap: 0.75,
                        flexWrap: "wrap",
                      }}
                    >
                      <Typography
                        component="span"
                        sx={{
                          fontFamily: SANS,
                          fontSize: 9.5,
                          fontWeight: 700,
                          color: "rgba(255,255,255,0.72)",
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                        }}
                      >
                        From
                      </Typography>
                      <Typography
                        component="span"
                        sx={{
                          fontFamily: SERIF,
                          fontSize: 18,
                          fontWeight: 700,
                          color: "#fff",
                          letterSpacing: "-0.02em",
                          textShadow: "0 1px 8px rgba(0,0,0,0.4)",
                        }}
                      >
                        {formatTHB(fromPrice)}
                      </Typography>
                      <Typography
                        component="span"
                        sx={{
                          fontFamily: SANS,
                          fontSize: 11.5,
                          color: "rgba(255,255,255,0.74)",
                          fontWeight: 500,
                        }}
                      >
                        · {tiers.join("/")} min
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              </motion.div>
              );
            })}


            <Typography
              sx={{
                textAlign: "center",
                mt: 1.5,
                fontSize: 12.5,
                color: "rgba(15, 23, 42, 0.6)",
                lineHeight: 1.65,
                fontFamily: SANS,
                fontStyle: "italic",
                maxWidth: "32ch",
                mx: "auto",
                whiteSpace: "pre-line",
              }}
            >
              {"Seeking something specific?\nOur concierge will tailor an arrangement."}
            </Typography>
          </Box>
        )}

        {/* ─── About Us tab ─── */}
        {section === "about" && (
          <Box sx={{ px: 2, mt: 3, display: "flex", flexDirection: "column", gap: 2 }}>
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
              <Typography
                sx={{
                  fontFamily: SERIF,
                  fontSize: 17,
                  fontWeight: 500,
                  color: "#1A2B2E",
                  letterSpacing: "-0.01em",
                  lineHeight: 1.35,
                  mb: 1,
                  "& em": { color: "#B4000A", fontStyle: "italic" },
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

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 1.25,
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
                    {title}
                  </Typography>
                  <Typography
                    sx={{
                      fontFamily: SANS,
                      fontSize: 11.5,
                      lineHeight: 1.5,
                      color: "rgba(15, 23, 42,0.7)",
                    }}
                  >
                    {body}
                  </Typography>
                </Box>
              ))}
            </Box>

            <Box
              sx={{
                p: 2,
                borderRadius: "16px",
                background: "#FFFFFF",
                border: "1px solid rgba(15, 23, 42, 0.06)",
                boxShadow: "0 1px 2px rgba(15, 23, 42, 0.03)",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                <LocationOnRoundedIcon sx={{ color: "#B4000A", fontSize: 18 }} />
                <Typography
                  sx={{
                    fontFamily: SERIF,
                    fontSize: 14.5,
                    fontWeight: 600,
                    color: "#1A2B2E",
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
                  color: "rgba(15, 23, 42,0.72)",
                }}
              >
                Sukhumvit · Silom · Asok · Thonglor · Sathorn · Phrom Phong ·
                Ari · Chidlom · Ploenchit. For destinations beyond the central
                districts, our concierge is pleased to provide a private
                quotation.
              </Typography>
            </Box>

            <Box
              sx={{
                p: 2,
                borderRadius: "16px",
                background: "#FFFFFF",
                border: "1px solid rgba(15, 23, 42, 0.06)",
                boxShadow: "0 1px 2px rgba(15, 23, 42, 0.03)",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                <LanguageRoundedIcon sx={{ color: "#0284C7", fontSize: 18 }} />
                <Typography
                  sx={{
                    fontFamily: SERIF,
                    fontSize: 14.5,
                    fontWeight: 600,
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

      {/* Quiz popup — narrow & tall, portrait-optimized */}
      <Dialog
        open={quizOpen}
        onClose={() => {
          setQuizOpen(false);
          resetQuiz();
        }}
        PaperProps={{
          sx: {
            position: "relative",
            borderRadius: "22px",
            background:
              "#FFFFFF",
            border: "1.5px solid rgba(15, 23, 42, 0.18)",
            m: 2.5,
            width: "calc(100% - 40px)",
            maxWidth: 340,
            maxHeight: "calc(100vh - 64px)",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            boxShadow:
              "0 1px 2px rgba(180, 0, 10, 0.06), 0 24px 56px rgba(15, 23, 42, 0.22), inset 0 1px 0 rgba(255, 255, 255, 0.7)",
            // Top-right warm radial glow — same brand gesture as Bundle card
            "&::before": {
              content: '""',
              position: "absolute",
              top: -60,
              right: -60,
              width: 200,
              height: 200,
              borderRadius: "50%",
              background:
                "radial-gradient(circle, rgba(15, 23, 42, 0.16) 0%, rgba(214, 40, 40, 0.05) 55%, transparent 78%)",
              pointerEvents: "none",
              zIndex: 0,
            },
            // Bottom-left soft clay echo
            "&::after": {
              content: '""',
              position: "absolute",
              bottom: -80,
              left: -60,
              width: 220,
              height: 220,
              borderRadius: "50%",
              background:
                "radial-gradient(circle, rgba(184, 92, 60, 0.10) 0%, transparent 65%)",
              pointerEvents: "none",
              zIndex: 0,
            },
          },
        }}
        BackdropProps={{
          sx: {
            background: "rgba(15, 23, 42, 0.5)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
          },
        }}
      >
        <Box
          sx={{
            position: "relative",
            p: 0,
            zIndex: 1,
            overflowY: "auto",
            maxHeight: "calc(100vh - 64px)",
            "&::-webkit-scrollbar": { display: "none" },
            scrollbarWidth: "none",
          }}
        >
          <IconButton
            aria-label="Close quiz"
            onClick={() => {
              setQuizOpen(false);
              resetQuiz();
            }}
            size="small"
            sx={{
              position: "absolute",
              top: 8,
              right: 8,
              zIndex: 1,
              color: "rgba(15, 23, 42, 0.5)",
              "&:hover": { color: "#B4000A" },
            }}
          >
            <CloseRoundedIcon sx={{ fontSize: 20 }} />
          </IconButton>
          <ServiceQuiz
            step={quizStep}
            setStep={setQuizStep}
            answers={quizAnswers}
            setAnswers={setQuizAnswers}
            services={sortedServices}
            onPick={(serviceId) => {
              setQuizOpen(false);
              resetQuiz();
              void navigate(`/services/${encodeURIComponent(serviceId)}`);
            }}
            onReset={resetQuiz}
          />
        </Box>
      </Dialog>

      {/* Compare popup — portrait-friendly vertical card stack */}
      <Dialog
        open={compareOpen}
        onClose={() => setCompareOpen(false)}
        PaperProps={{
          sx: {
            position: "relative",
            borderRadius: "22px",
            background:
              "#FFFFFF",
            border: "1.5px solid rgba(15, 23, 42, 0.18)",
            m: 2.5,
            width: "calc(100% - 40px)",
            maxWidth: 380,
            maxHeight: "calc(100vh - 64px)",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            boxShadow:
              "0 1px 2px rgba(180, 0, 10, 0.06), 0 24px 56px rgba(15, 23, 42, 0.22), inset 0 1px 0 rgba(255, 255, 255, 0.7)",
            "&::before": {
              content: '""',
              position: "absolute",
              top: -60,
              right: -60,
              width: 200,
              height: 200,
              borderRadius: "50%",
              background:
                "radial-gradient(circle, rgba(15, 23, 42, 0.14) 0%, rgba(214, 40, 40, 0.05) 55%, transparent 78%)",
              pointerEvents: "none",
              zIndex: 0,
            },
            "&::after": {
              content: '""',
              position: "absolute",
              bottom: -80,
              left: -60,
              width: 220,
              height: 220,
              borderRadius: "50%",
              background:
                "radial-gradient(circle, rgba(184, 92, 60, 0.10) 0%, transparent 65%)",
              pointerEvents: "none",
              zIndex: 0,
            },
          },
        }}
        BackdropProps={{
          sx: {
            background: "rgba(15, 23, 42, 0.5)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
          },
        }}
      >
        <Box
          sx={{
            position: "relative",
            zIndex: 1,
            overflowY: "auto",
            maxHeight: "calc(100vh - 64px)",
            "&::-webkit-scrollbar": { display: "none" },
            scrollbarWidth: "none",
          }}
        >
          <IconButton
            aria-label="Close compare"
            onClick={() => setCompareOpen(false)}
            size="small"
            sx={{
              position: "absolute",
              top: 8,
              right: 8,
              zIndex: 1,
              color: "rgba(15, 23, 42, 0.5)",
              "&:hover": { color: "#B4000A" },
            }}
          >
            <CloseRoundedIcon sx={{ fontSize: 20 }} />
          </IconButton>
          <ServiceCompare
            services={sortedServices}
            onPick={(serviceId) => {
              setCompareOpen(false);
              void navigate(`/services/${encodeURIComponent(serviceId)}`);
            }}
          />
        </Box>
      </Dialog>
    </Box>
  );
};

// ─── ServiceQuiz — inline 3-step recommender ─────────────────────────
//   Three short questions → one recommended service, scored from
//   mapped tags. No external state, fits inside ServicesPage as a
//   collapsible panel below the action buttons.
type QuizAnswers = {
  intent?: string;
  intensity?: string;
  budget?: string;
};

const QUIZ_STEPS: Array<{
  key: keyof QuizAnswers;
  question: string;
  options: Array<{ value: string; label: string }>;
}> = [
  {
    key: "intent",
    question: "What brings you here today?",
    options: [
      { value: "stress", label: "Unwind from stress" },
      { value: "muscles", label: "Release tight muscles" },
      { value: "ritual", label: "A premium ritual" },
      { value: "energy", label: "Restore my energy" },
    ],
  },
  {
    key: "intensity",
    question: "Preferred intensity?",
    options: [
      { value: "gentle", label: "Gentle & soothing" },
      { value: "balanced", label: "Balanced" },
      { value: "deep", label: "Deep & firm" },
    ],
  },
  {
    key: "budget",
    question: "Comfortable budget?",
    options: [
      { value: "value", label: "Best value" },
      { value: "mid", label: "Mid-range" },
      { value: "premium", label: "Top-tier" },
    ],
  },
];

function recommendService(
  answers: QuizAnswers,
  services: ReadonlyArray<{ id: string; name: string }>
): string {
  // Simple scoring: each service gets points for matching tags.
  const scores: Record<string, number> = {
    "xSR-Thai": 0,
    "SR-Aroma": 0,
    "SR-HJ2200": 0,
    "SR-B2B3200": 0,
  };

  if (answers.intent === "stress") scores["SR-Aroma"] += 3;
  if (answers.intent === "muscles") scores["SR-HJ2200"] += 3;
  if (answers.intent === "ritual") scores["SR-B2B3200"] += 3;
  if (answers.intent === "energy") scores["xSR-Thai"] += 3;

  if (answers.intensity === "gentle") scores["SR-Aroma"] += 2;
  if (answers.intensity === "balanced") scores["xSR-Thai"] += 2;
  if (answers.intensity === "deep") {
    scores["SR-HJ2200"] += 2;
    scores["SR-B2B3200"] += 1;
  }

  if (answers.budget === "value") scores["xSR-Thai"] += 2;
  if (answers.budget === "mid") {
    scores["SR-Aroma"] += 2;
    scores["SR-HJ2200"] += 1;
  }
  if (answers.budget === "premium") scores["SR-B2B3200"] += 3;

  // Pick highest-scoring service that exists in the provided list.
  const ranked = Object.entries(scores)
    .sort(([, a], [, b]) => b - a)
    .map(([id]) => id);
  for (const id of ranked) {
    if (services.some((s) => s.id === id)) return id;
  }
  return services[0]?.id ?? "";
}

const ServiceQuiz: React.FC<{
  step: number;
  setStep: (n: number) => void;
  answers: QuizAnswers;
  setAnswers: React.Dispatch<React.SetStateAction<QuizAnswers>>;
  services: typeof import("../data/services").default;
  onPick: (serviceId: string) => void;
  onReset: () => void;
}> = ({ step, setStep, answers, setAnswers, services, onPick, onReset }) => {
  const isComplete = step >= QUIZ_STEPS.length;
  const recommendedId = isComplete
    ? recommendService(answers, services)
    : null;
  const recommended = recommendedId
    ? services.find((s) => s.id === recommendedId)
    : null;

  if (isComplete && recommended) {
    return (
      <Box
        component={motion.div}
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.32, ease: "easeOut" }}
        sx={{
          p: 2,
          borderRadius: "16px",
          background: "#FFFFFF",
          border: "1px solid rgba(15, 23, 42, 0.18)",
          boxShadow:
            "0 1px 2px rgba(180, 0, 10, 0.05), 0 8px 22px rgba(180, 0, 10, 0.06)",
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            fontSize: 9.5,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: "#b85c3c",
            fontWeight: 700,
            mb: 0.75,
            fontFamily: SANS,
            "&::before": {
              content: '""',
              width: "18px",
              height: "1px",
              background: "rgba(184, 92, 60, 0.55)",
            },
          }}
        >
          We recommend
        </Box>
        <Typography
          sx={{
            fontFamily: SERIF,
            fontSize: 20,
            fontWeight: 500,
            color: "#1A2B2E",
            letterSpacing: "-0.01em",
            lineHeight: 1.25,
            mb: 0.5,
            "& em": { fontStyle: "italic", color: "#B4000A" },
          }}
        >
          {recommended.name}
        </Typography>
        <Typography
          sx={{
            fontFamily: SANS,
            fontSize: 12.5,
            color: "rgba(15, 23, 42, 0.7)",
            lineHeight: 1.55,
            mb: 1.5,
            fontStyle: "italic",
          }}
        >
          {recommended.desc}
        </Typography>
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button
            variant="contained"
            onClick={() => onPick(recommended.id)}
            sx={{
              flex: 1,
              height: 36,
              borderRadius: 999,
              background: "#B4000A",
              color: "#fff",
              fontFamily: SANS,
              fontSize: 12.5,
              fontWeight: 700,
              textTransform: "none",
              letterSpacing: "0.01em",
              boxShadow: "0 4px 12px rgba(15, 23, 42, 0.32)",
              "&:hover": {
                background: "#B4000A",
              },
            }}
          >
            View this therapy
          </Button>
          <Button
            variant="outlined"
            onClick={onReset}
            sx={{
              height: 36,
              borderRadius: 999,
              borderColor: "rgba(15, 23, 42, 0.12)",
              color: "#1A2B2E",
              fontFamily: SANS,
              fontSize: 12.5,
              fontWeight: 600,
              textTransform: "none",
              "&:hover": {
                borderColor: "rgba(15, 23, 42, 0.30)",
                background: "rgba(180, 0, 10, 0.03)",
              },
            }}
          >
            Try again
          </Button>
        </Box>
      </Box>
    );
  }

  const current = QUIZ_STEPS[step];
  if (!current) return null;
  return (
    <Box
      component={motion.div}
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
      sx={{
        p: 2,
        borderRadius: "16px",
        background: "#FFFFFF",
        border: "1px solid rgba(15, 23, 42, 0.06)",
        boxShadow: "0 1px 2px rgba(15, 23, 42, 0.03)",
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mb: 1,
        }}
      >
        <Box
          sx={{
            fontSize: 9.5,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: "#b85c3c",
            fontWeight: 700,
            fontFamily: SANS,
          }}
        >
          Step {step + 1} of {QUIZ_STEPS.length}
        </Box>
        <Box sx={{ display: "flex", gap: 0.5 }}>
          {QUIZ_STEPS.map((_, i) => (
            <Box
              key={i}
              sx={{
                width: 18,
                height: 3,
                borderRadius: 999,
                background:
                  i < step
                    ? "#B4000A"
                    : i === step
                      ? "#B4000A"
                      : "rgba(15, 23, 42, 0.08)",
              }}
            />
          ))}
        </Box>
      </Box>
      <Typography
        sx={{
          fontFamily: SERIF,
          fontSize: 17,
          fontWeight: 500,
          color: "#1A2B2E",
          letterSpacing: "-0.01em",
          lineHeight: 1.3,
          mb: 1.25,
        }}
      >
        {current.question}
      </Typography>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
        {current.options.map((opt) => (
          <Box
            key={opt.value}
            component="button"
            onClick={() => {
              setAnswers((prev) => ({ ...prev, [current.key]: opt.value }));
              setStep(step + 1);
            }}
            sx={{
              border: "1px solid rgba(15, 23, 42, 0.08)",
              background: "#FFFFFF",
              borderRadius: "12px",
              px: 1.5,
              py: 1.1,
              fontFamily: SANS,
              fontSize: 13,
              fontWeight: 500,
              color: "#1A2B2E",
              textAlign: "left",
              cursor: "pointer",
              letterSpacing: "0.005em",
              transition:
                "border-color 0.2s ease, background 0.2s ease, transform 0.18s ease, color 0.2s ease",
              "&:hover": {
                borderColor: "rgba(15, 23, 42, 0.32)",
                background: "rgba(180, 0, 10, 0.03)",
                color: "#B4000A",
                transform: "translateY(-1px)",
              },
              "&:active": { transform: "scale(0.985)" },
            }}
          >
            {opt.label}
          </Box>
        ))}
      </Box>
    </Box>
  );
};

// ─── ServiceCompare — Round 28c22 portrait-friendly vertical stack.
//   Replaces the horizontal table that required side-scroll on mobile.
//   Each service is now its own compact card with a name+price header
//   and a 3-row attribute list. Tap-to-view in one tap — no scrolling
//   sideways to read.
const ServiceCompare: React.FC<{
  services: typeof import("../data/services").default;
  onPick: (serviceId: string) => void;
}> = ({ services, onPick }) => {
  const ATTRIBUTES: Array<{
    label: string;
    fn: (s: (typeof services)[number]) => string;
  }> = [
    {
      label: "Best for",
      fn: (s) => s.desc.split(".")[0].replace(/\.$/, ""),
    },
    {
      label: "Tier",
      fn: (s) => s.badge.replace(/_/g, " "),
    },
    {
      label: "Duration",
      fn: (s) =>
        s.availableDurations && s.availableDurations.length > 0
          ? `${s.availableDurations[0]}–${
              s.availableDurations[s.availableDurations.length - 1]
            } min`
          : `${s.duration} min`,
    },
  ];

  return (
    <Box
      component={motion.div}
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
      sx={{ p: 2, pb: 2.5 }}
    >
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          fontSize: 10,
          letterSpacing: "0.24em",
          textTransform: "uppercase",
          color: "#b85c3c",
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
        Compare
      </Box>
      <Typography
        sx={{
          fontFamily: SERIF,
          fontSize: 22,
          fontWeight: 400,
          color: "#1A2B2E",
          letterSpacing: "-0.02em",
          lineHeight: 1.2,
          mb: 0.5,
          "& em": { fontStyle: "italic", color: "#B4000A" },
        }}
      >
        At a <em>glance</em>
      </Typography>
      <Typography
        sx={{
          fontFamily: SANS,
          fontSize: 12.5,
          color: "rgba(15, 23, 42, 0.65)",
          lineHeight: 1.5,
          mb: 2,
        }}
      >
        Tap any therapy to see full details and reserve.
      </Typography>

      {/* Vertical service cards */}
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
        {services.map((s) => (
          <Box
            key={s.id}
            component="button"
            onClick={() => onPick(s.id)}
            sx={{
              p: 1.75,
              borderRadius: "14px",
              background: "#FFFFFF",
              border: "1px solid rgba(15, 23, 42, 0.06)",
              boxShadow: "0 1px 2px rgba(15, 23, 42, 0.03)",
              cursor: "pointer",
              textAlign: "left",
              fontFamily: SANS,
              transition:
                "transform 0.22s ease, border-color 0.22s ease, box-shadow 0.22s ease",
              "&:hover": {
                transform: "translateY(-1px)",
                borderColor: "rgba(15, 23, 42, 0.22)",
                boxShadow:
                  "0 1px 2px rgba(180, 0, 10, 0.05), 0 8px 22px rgba(180, 0, 10, 0.06)",
              },
            }}
          >
            {/* Top row — name (left) · price (right) */}
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: 1,
                mb: 1.25,
              }}
            >
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Box
                  sx={{
                    fontSize: 9.5,
                    fontWeight: 700,
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    color: "#b85c3c",
                    lineHeight: 1.2,
                    mb: 0.25,
                  }}
                >
                  {s.badge.toLowerCase().replace(/_/g, " ")}
                </Box>
                <Typography
                  sx={{
                    fontFamily: SERIF,
                    fontSize: 16,
                    fontWeight: 600,
                    color: "#1A2B2E",
                    letterSpacing: "-0.01em",
                    lineHeight: 1.25,
                  }}
                >
                  {s.name}
                </Typography>
              </Box>
              <Box sx={{ textAlign: "right", flexShrink: 0 }}>
                <Box
                  sx={{
                    fontSize: 9.5,
                    fontWeight: 600,
                    letterSpacing: "0.16em",
                    textTransform: "uppercase",
                    color: "rgba(15, 23, 42, 0.5)",
                    lineHeight: 1.2,
                  }}
                >
                  From
                </Box>
                <Typography
                  sx={{
                    fontFamily: SERIF,
                    fontStyle: "italic",
                    fontSize: 17,
                    fontWeight: 600,
                    color: "#B4000A",
                    letterSpacing: "-0.01em",
                    lineHeight: 1.15,
                  }}
                >
                  ฿{s.price.toLocaleString()}
                </Typography>
              </Box>
            </Box>

            {/* Attribute rows */}
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                gap: 0.5,
                pt: 1,
                borderTop: "1px solid rgba(15, 23, 42, 0.06)",
              }}
            >
              {ATTRIBUTES.map((attr) => (
                <Box
                  key={attr.label}
                  sx={{
                    display: "flex",
                    alignItems: "baseline",
                    gap: 1,
                  }}
                >
                  <Box
                    sx={{
                      fontSize: 9.5,
                      fontWeight: 700,
                      letterSpacing: "0.14em",
                      textTransform: "uppercase",
                      color: "rgba(15, 23, 42, 0.5)",
                      width: 70,
                      flexShrink: 0,
                    }}
                  >
                    {attr.label}
                  </Box>
                  <Box
                    sx={{
                      fontSize: 12,
                      color: "rgba(15, 23, 42, 0.82)",
                      lineHeight: 1.45,
                      flex: 1,
                    }}
                  >
                    {attr.fn(s)}
                  </Box>
                </Box>
              ))}
            </Box>

            {/* CTA hint at bottom-right */}
            <Box
              sx={{
                display: "flex",
                justifyContent: "flex-end",
                mt: 1,
              }}
            >
              <Box
                sx={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.04em",
                  color: "#B4000A",
                }}
              >
                View →
              </Box>
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

export default ServicesPage;
