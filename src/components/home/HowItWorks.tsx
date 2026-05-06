// src/components/home/HowItWorks.tsx
//
// Round 28c4 — Self-contained "How to book" component.
//
// Consolidates the entire booking flow into one component. Previously
// this file held only the 3-step ritual; the surrounding cards
// (reservation pillars, payment CTA, arrival window, concierge channel
// grid, telegram broadcast link, closing note) lived inside ServicesPage's
// "How to book" tab. They have been moved here so the booking experience
// is a single, drop-in piece.
//
// Section flow (top → bottom):
//   1. Header — eyebrow · serif title · lead
//   2. Three-movement ritual — 01 · 02 · 03 with connecting thread
//   3. Reservation pillars — 2x2 grid (one-tap · profiles · privacy · photo)
//   4. Payment & Policy CTA — links to /payment-methods (canonical source)
//   5. Typical arrival window — wide card
//   6. Concierge — 2x2 channel grid (WhatsApp · Telegram · LINE · WeChat)
//   7. Telegram broadcast — single subtle text link
//   8. Closing italic — concierge availability note

import React from "react";
import { Box, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
import { Link as RouterLink } from "react-router-dom";

import TouchAppRoundedIcon from "@mui/icons-material/TouchAppRounded";
import BadgeRoundedIcon from "@mui/icons-material/BadgeRounded";
import ShieldRoundedIcon from "@mui/icons-material/ShieldRounded";
import VerifiedUserRoundedIcon from "@mui/icons-material/VerifiedUserRounded";
import AccessTimeRoundedIcon from "@mui/icons-material/AccessTimeRounded";
import PaymentsRoundedIcon from "@mui/icons-material/PaymentsRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";

import { FaLine, FaTelegramPlane, FaWeixin, FaWhatsapp } from "react-icons/fa";

// 🆕 Round 28r12 — FAQ section appended to "How to Book". Lives in a
//   separate file so the 25+ Q&A entries are easy to maintain without
//   bloating this component.
import HowItWorksFAQ from "@/components/home/HowItWorksFAQ";

const SERIF = '"Fraunces", Georgia, "Times New Roman", serif';
const SANS = '"Inter", system-ui, -apple-system, sans-serif';

// ─── Three-movement ritual data ───────────────────────────────────────
type StepDef = {
  num: number;
  titleKey: string;
  titleFallback: string;
  bodyKey: string;
  bodyFallback: string;
  metaKey: string;
  metaFallback: string;
};

const STEPS: StepDef[] = [
  {
    num: 1,
    titleKey: "home.howItWorks.step1.title",
    titleFallback: "Select your therapist",
    bodyKey: "home.howItWorks.step1.body",
    bodyFallback:
      "Browse a curated roster of licensed practitioners. Filter by specialty, language, and same-day availability in your district.",
    metaKey: "home.howItWorks.step1.meta",
    metaFallback: "Browse · Compare · Choose",
  },
  {
    num: 2,
    titleKey: "home.howItWorks.step2.title",
    titleFallback: "Schedule the appointment",
    bodyKey: "home.howItWorks.step2.body",
    bodyFallback:
      "Hotel suite, private residence, or villa anywhere in central Bangkok. Sessions of 60 to 120 minutes, arranged with discretion.",
    metaKey: "home.howItWorks.step2.meta",
    metaFallback: "Time · Place · Discretion",
  },
  {
    num: 3,
    titleKey: "home.howItWorks.step3.title",
    titleFallback: "Restore in your sanctuary",
    bodyKey: "home.howItWorks.step3.body",
    bodyFallback:
      "Your therapist arrives fully equipped. Settle the booking securely, share a private review, and re-book your preferred practitioner with a single tap.",
    metaKey: "home.howItWorks.step3.meta",
    metaFallback: "Arrival · Service · Renewal",
  },
];

// ─── Reservation pillars ──────────────────────────────────────────────
const RESERVATION_PILLARS: Array<{
  Icon: typeof TouchAppRoundedIcon;
  title: string;
  body: string;
  tone: { bg: string; fg: string };
}> = [
  {
    Icon: TouchAppRoundedIcon,
    title: "One-tap reservation",
    body:
      "Choose a profile, complete the brief form, and our concierge confirms within minutes via WhatsApp or Telegram.",
    tone: { bg: "rgba(254, 9, 68, 0.08)", fg: "#FE0944" },
  },
  {
    Icon: BadgeRoundedIcon,
    title: "Detailed profiles",
    body:
      "Specialties, languages, today's availability, and authentic reviews from past guests — on every profile.",
    tone: { bg: "rgba(15, 23, 42, 0.08)", fg: "#475569" },
  },
  {
    Icon: ShieldRoundedIcon,
    title: "Privacy by design",
    body:
      "All correspondence is routed through our concierge — a quiet measure that protects both you and your practitioner.",
    tone: { bg: "rgba(14, 165, 233, 0.10)", fg: "#0284C7" },
  },
  {
    Icon: VerifiedUserRoundedIcon,
    title: "Photo verified",
    body:
      "Every photograph passes our verification protocol before publication, with periodic re-checks thereafter.",
    tone: { bg: "rgba(22, 163, 74, 0.10)", fg: "#16a34a" },
  },
];

// ─── Concierge channels ───────────────────────────────────────────────
const CONCIERGE_CHANNELS: Array<{
  Icon: React.ElementType;
  name: string;
  handle: string;
  href: string;
  external: boolean;
  tone: { bg: string; fg: string };
}> = [
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
];

const HowItWorks: React.FC = () => {
  const { t } = useTranslation();

  return (
    <Box>
      {/* ───────── 1. Section header ───────── */}
      <Box sx={{ padding: "36px 20px 8px", position: "relative" }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            fontSize: "10px",
            letterSpacing: "0.24em",
            textTransform: "uppercase",
            color: "#b85c3c",
            fontWeight: 700,
            marginBottom: "10px",
            fontFamily: SANS,
            "&::before": {
              content: '""',
              width: "22px",
              height: "1px",
              background: "rgba(184, 92, 60, 0.55)",
            },
          }}
        >
          {t("home.howItWorks.eyebrow", "The Experience")}
        </Box>

        <Typography
          component="h2"
          sx={{
            fontFamily: SERIF,
            fontWeight: 400,
            fontSize: "28px",
            lineHeight: 1.15,
            letterSpacing: "-0.02em",
            color: "#2a1a14",
            marginBottom: "10px",
            "& em": { fontStyle: "italic", color: "#FE0944" },
          }}
        >
          {t("home.howItWorks.title.pre", "A ritual in three ")}
          <em>{t("home.howItWorks.title.em", "movements")}</em>
        </Typography>

        <Box
          component="p"
          sx={{
            fontFamily: SANS,
            fontSize: "13.5px",
            color: "rgba(60, 30, 20, 0.72)",
            lineHeight: 1.6,
            marginBottom: "22px",
            maxWidth: "36ch",
          }}
        >
          {t(
            "home.howItWorks.lead",
            "Reserve in under a minute. Your practitioner arrives within the hour, prepared and discreet."
          )}
        </Box>
      </Box>

      {/* ───────── 2. Three-movement ritual (with thread) ───────── */}
      <Box sx={{ padding: "0 20px 8px", position: "relative" }}>
        <Box
          aria-hidden
          sx={{
            position: "absolute",
            left: "calc(20px + 22px)",
            top: "44px",
            bottom: "70px",
            width: "1px",
            background:
              "linear-gradient(180deg, rgba(254, 9, 68, 0.32) 0%, rgba(254, 122, 82, 0.22) 55%, rgba(254, 122, 82, 0.05) 100%)",
            pointerEvents: "none",
          }}
        />

        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            position: "relative",
          }}
        >
          {STEPS.map((step) => (
            <Box
              key={step.num}
              sx={{
                display: "flex",
                gap: "16px",
                alignItems: "flex-start",
                padding: "16px 18px",
                background: "rgba(255, 255, 255, 0.68)",
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
                border: "1px solid rgba(255, 255, 255, 0.7)",
                borderRadius: "18px",
                boxShadow:
                  "0 1px 2px rgba(254, 9, 68, 0.04), 0 8px 24px rgba(254, 9, 68, 0.06)",
                transition:
                  "transform 220ms ease, box-shadow 220ms ease, background 220ms ease",
                "&:hover": {
                  transform: "translateY(-1px)",
                  background: "rgba(255, 255, 255, 0.82)",
                  boxShadow:
                    "0 2px 4px rgba(254, 9, 68, 0.06), 0 14px 32px rgba(254, 9, 68, 0.08)",
                },
              }}
            >
              <Box
                sx={{
                  position: "relative",
                  width: "44px",
                  height: "44px",
                  flexShrink: 0,
                  borderRadius: "50%",
                  background:
                    "linear-gradient(135deg, #FE0944 0%, #FE7A52 100%)",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: SERIF,
                  fontWeight: 500,
                  fontSize: "15px",
                  letterSpacing: "0.04em",
                  boxShadow:
                    "0 4px 14px rgba(254, 9, 68, 0.32), inset 0 1px 0 rgba(255,255,255,0.22)",
                  "&::before": {
                    content: '""',
                    position: "absolute",
                    inset: "-4px",
                    borderRadius: "50%",
                    background:
                      "radial-gradient(circle, rgba(255,255,255,0.9) 30%, rgba(255,255,255,0) 70%)",
                    zIndex: -1,
                  },
                }}
              >
                {step.num.toString().padStart(2, "0")}
              </Box>

              <Box sx={{ flex: 1, pt: "2px" }}>
                <Typography
                  component="h3"
                  sx={{
                    fontFamily: SERIF,
                    fontWeight: 500,
                    fontSize: "16px",
                    color: "#2a1a14",
                    marginBottom: "4px",
                    letterSpacing: "-0.01em",
                  }}
                >
                  {t(step.titleKey, step.titleFallback)}
                </Typography>

                <Box
                  component="p"
                  sx={{
                    fontFamily: SANS,
                    fontSize: "12.5px",
                    color: "rgba(60, 30, 20, 0.72)",
                    lineHeight: 1.55,
                    margin: 0,
                  }}
                >
                  {t(step.bodyKey, step.bodyFallback)}
                </Box>

                <Box
                  sx={{
                    mt: "10px",
                    fontFamily: SANS,
                    fontSize: "9.5px",
                    fontWeight: 700,
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                    color: "rgba(184, 92, 60, 0.85)",
                  }}
                >
                  {t(step.metaKey, step.metaFallback)}
                </Box>
              </Box>
            </Box>
          ))}
        </Box>
      </Box>

      {/* ───────── 3+. Supporting cards (pillars · payment · arrival · concierge · close) ───────── */}
      <Box
        sx={{
          padding: "20px 20px 28px",
          display: "flex",
          flexDirection: "column",
          gap: 2,
        }}
      >
        {/* Reservation pillars — 2x2 grid */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 1.25,
          }}
        >
          {RESERVATION_PILLARS.map(({ Icon, title, body, tone }) => (
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
                  borderColor: "rgba(254, 9, 68, 0.14)",
                  boxShadow:
                    "0 1px 2px rgba(254, 9, 68, 0.05), 0 8px 22px rgba(254, 9, 68, 0.05)",
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
                  color: "#3c1e14",
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
                  color: "rgba(60,30,20,0.7)",
                }}
              >
                {body}
              </Typography>
            </Box>
          ))}
        </Box>

        {/* Payment & Policy CTA → /payment-methods (canonical source) */}
        <Box
          component={RouterLink}
          to="/payment-methods"
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            p: 1.75,
            borderRadius: "14px",
            background: "#FFFFFF",
            border: "1px solid rgba(15, 23, 42, 0.06)",
            boxShadow: "0 1px 2px rgba(15, 23, 42, 0.03)",
            textDecoration: "none",
            color: "inherit",
            transition:
              "transform 200ms ease, border-color 200ms ease, box-shadow 200ms ease",
            "&:hover": {
              transform: "translateY(-1px)",
              borderColor: "rgba(254, 9, 68, 0.18)",
              boxShadow:
                "0 1px 2px rgba(254, 9, 68, 0.05), 0 8px 22px rgba(254, 9, 68, 0.06)",
            },
          }}
        >
          <Box
            sx={{
              width: 38,
              height: 38,
              flexShrink: 0,
              borderRadius: "12px",
              background: "rgba(20, 184, 166, 0.10)",
              color: "#0d9488",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              "& svg": { fontSize: 20 },
            }}
          >
            <PaymentsRoundedIcon />
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              sx={{
                fontFamily: SANS,
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "#b85c3c",
                lineHeight: 1.2,
                mb: 0.25,
              }}
            >
              Payment & Policy
            </Typography>
            <Typography
              sx={{
                fontFamily: SERIF,
                fontSize: 14,
                fontWeight: 500,
                color: "#2a1a14",
                letterSpacing: "-0.005em",
                lineHeight: 1.3,
              }}
            >
              Pricing, deposits & cancellation
            </Typography>
          </Box>
          <ChevronRightRoundedIcon
            sx={{ color: "rgba(60,30,20,0.4)", fontSize: 22 }}
          />
        </Box>

        {/* Typical arrival window */}
        <Box
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
              gap: 1,
              mb: 1,
            }}
          >
            <AccessTimeRoundedIcon
              sx={{ color: "#FE0944", fontSize: 18 }}
            />
            <Typography
              sx={{
                fontFamily: SERIF,
                fontSize: 14.5,
                fontWeight: 600,
                color: "#3c1e14",
              }}
            >
              Typical arrival window
            </Typography>
          </Box>
          <Typography
            sx={{
              fontFamily: SANS,
              fontSize: 12.5,
              lineHeight: 1.6,
              color: "rgba(60,30,20,0.72)",
            }}
          >
            <Box component="span" sx={{ fontWeight: 600, color: "#3c1e14" }}>
              Central Bangkok:
            </Box>{" "}
            30 to 60 minutes.{" "}
            <Box component="span" sx={{ fontWeight: 600, color: "#3c1e14" }}>
              Outside the centre or peak hours:
            </Box>{" "}
            60 to 90 minutes. The booking screen displays a precise arrival
            window before you confirm.
          </Typography>
        </Box>

        {/* Concierge — 2x2 channel grid (matches About-us pillar pattern) */}
        <Box
          sx={{
            p: 2.25,
            borderRadius: "18px",
            background: "#FFFFFF",
            border: "1px solid rgba(15, 23, 42, 0.06)",
            boxShadow:
              "0 1px 2px rgba(15, 23, 42, 0.03), 0 8px 24px rgba(15, 23, 42, 0.05)",
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
            Concierge
          </Box>
          <Typography
            sx={{
              fontFamily: SERIF,
              fontSize: 17,
              fontWeight: 500,
              color: "#2a1a14",
              letterSpacing: "-0.01em",
              lineHeight: 1.3,
              mb: 0.5,
              "& em": { fontStyle: "italic", color: "#FE0944" },
            }}
          >
            At your <em>service</em>
          </Typography>
          <Typography
            sx={{
              fontFamily: SANS,
              fontSize: 12.5,
              color: "rgba(60,30,20,0.65)",
              lineHeight: 1.55,
              mb: 1.75,
            }}
          >
            Around the clock, in your preferred language. Reach us through
            any of the channels below.
          </Typography>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 1.25,
            }}
          >
            {CONCIERGE_CHANNELS.map(
              ({ Icon, name, handle, href, external, tone }) => (
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
                      borderColor: "rgba(254, 9, 68, 0.14)",
                      boxShadow:
                        "0 1px 2px rgba(254, 9, 68, 0.05), 0 8px 22px rgba(254, 9, 68, 0.05)",
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
                    }}
                  >
                    <Icon size={18} />
                  </Box>
                  <Typography
                    sx={{
                      fontFamily: SERIF,
                      fontSize: 13.5,
                      fontWeight: 600,
                      color: "#3c1e14",
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
                      color: "rgba(60,30,20,0.7)",
                      wordBreak: "break-word",
                    }}
                  >
                    {handle}
                  </Typography>
                </Box>
              )
            )}
          </Box>
        </Box>

        {/* Telegram broadcast — single subtle text link for updates */}
        <Box sx={{ display: "flex", justifyContent: "center" }}>
          <Box
            component="a"
            href="https://t.me/SunRed_BKK"
            target="_blank"
            rel="noopener noreferrer"
            sx={{
              fontFamily: SANS,
              fontSize: 12,
              fontWeight: 600,
              color: "rgba(60,30,20,0.7)",
              textDecoration: "none",
              letterSpacing: "0.02em",
              display: "inline-flex",
              alignItems: "center",
              gap: 0.5,
              py: 0.5,
              transition: "color 200ms ease",
              "&:hover": {
                color: "#FE0944",
                "& .arrow": { transform: "translateX(2px)" },
              },
            }}
          >
            Subscribe to our Telegram channel for updates
            <Box
              component="span"
              className="arrow"
              sx={{
                transition: "transform 200ms ease",
                display: "inline-block",
              }}
            >
              →
            </Box>
          </Box>
        </Box>

        {/* 🆕 Round 28r12 (founder 2026-05-06) — FAQ section.
            Six categories × 4–5 Q&A each (booking / practitioners /
            services & pricing / areas / payment & discretion / common
            questions). Each answer reframes the question through the
            four strategic battles: discretion as a feature, total-
            experience pricing, value > price-tag, and supply honesty.
            Self-contained component — see HowItWorksFAQ.tsx. */}
        <HowItWorksFAQ />

        {/* Closing italic note */}
        <Typography
          sx={{
            textAlign: "center",
            fontFamily: SANS,
            fontSize: 12,
            color: "rgba(60,30,20,0.55)",
            lineHeight: 1.55,
            fontStyle: "italic",
            marginTop: "24px",
          }}
        >
          Should you require further assistance, our concierge is at your
          service — twenty-four hours a day.
        </Typography>
      </Box>
    </Box>
  );
};

export default HowItWorks;
