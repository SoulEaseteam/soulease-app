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
//   5. Typical arrival window — moved to Services tab (28s189)
//
// 🆕 Round 28s188-189 — Concierge channels + Telegram subscribe link
//   + Typical arrival window all moved to ServicesPage Services tab
//   (founder: "ย้ายมาคอลั้ม services").

import React from "react";
import { Box, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
import { Link as RouterLink } from "react-router-dom";

// 🆕 Round 28s201 — TouchApp / Badge / Shield / VerifiedUser icons
//   dropped along with the reservation pillars (audit cleanup).
import PaymentsRoundedIcon from "@mui/icons-material/PaymentsRounded";
// 🆕 Round 28s204 — Typical arrival window restored to this tab.
import AccessTimeRoundedIcon from "@mui/icons-material/AccessTimeRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";

// 🆕 Round 28r12 — FAQ section appended to "How to Book". Lives in a
//   separate file so the 25+ Q&A entries are easy to maintain without
//   bloating this component.
import HowItWorksFAQ from "@/components/home/HowItWorksFAQ";

const SERIF = '"Federo", "Italiana", "Cinzel", "Fraunces", Georgia, "Times New Roman", serif';
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
    titleFallback: "Select your practitioner",
    bodyKey: "home.howItWorks.step1.body",
    bodyFallback:
      "Browse a curated roster of licensed practitioners. Filter by specialty, language, and who's available tonight.",
    metaKey: "home.howItWorks.step1.meta",
    metaFallback: "Browse · Choose · Confirm",
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
      "Your practitioner arrives fully equipped. Settle the booking securely, share a private review, and request her again anytime through the concierge.",
    metaKey: "home.howItWorks.step3.meta",
    metaFallback: "Arrival · Service · Renewal",
  },
];

// 🆕 Round 28s201 — RESERVATION_PILLARS array removed along with
//   the 2×2 grid that consumed it. Keep on disk via `git revert`
//   if a future round wants to bring them back.

// ─── Concierge channels ───────────────────────────────────────────────
// 🆕 Round 28s189 — CONCIERGE_CHANNELS array removed along with the
//   panel that consumed it (moved to ServicesPage).

const HowItWorks: React.FC = () => {
  const { t } = useTranslation();

  return (
    <Box>
      {/* ───────── 1. Section header ───────── */}
      <Box sx={{ padding: "18px 20px 8px", position: "relative" }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            fontSize: "10px",
            letterSpacing: "0.24em",
            textTransform: "uppercase",
            color: "#4A5568",
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

        {/* 🆕 Round 28s202 — Title sans-serif (was Federo display
            serif) for legibility. Keeps the italic "movements"
            accent in brand red so the editorial flavour survives. */}
        <Typography
          component="h2"
          sx={{
            fontFamily: SANS,
            fontWeight: 700,
            fontSize: "24px",
            lineHeight: 1.2,
            letterSpacing: "-0.015em",
            color: "#1A2B2E",
            marginBottom: "10px",
            "& em": {
              fontFamily: SERIF,
              fontStyle: "italic",
              fontWeight: 500,
              color: "#B4000A",
            },
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
            color: "rgba(15, 23, 42, 0.72)",
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
              "linear-gradient(180deg, rgba(15, 23, 42, 0.32) 0%, rgba(214, 40, 40, 0.22) 55%, rgba(214, 40, 40, 0.05) 100%)",
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
                  "0 1px 2px rgba(180, 0, 10, 0.04), 0 8px 24px rgba(180, 0, 10, 0.06)",
                transition:
                  "transform 220ms ease, box-shadow 220ms ease, background 220ms ease",
                "&:hover": {
                  transform: "translateY(-1px)",
                  background: "rgba(255, 255, 255, 0.82)",
                  boxShadow:
                    "0 2px 4px rgba(180, 0, 10, 0.06), 0 14px 32px rgba(180, 0, 10, 0.08)",
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
                    "#B4000A",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: SERIF,
                  fontWeight: 500,
                  fontSize: "15px",
                  letterSpacing: "0.04em",
                  boxShadow:
                    "0 4px 14px rgba(15, 23, 42, 0.32), inset 0 1px 0 rgba(255,255,255,0.22)",
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
                {/* 🆕 Round 28s202 — Founder: "เปลี่ยนฟ้อนหน่อย
                    อ่านยากมาก". Step titles switched from serif
                    (Federo display) → sans-serif (Inter 700) for
                    better legibility at small sizes. */}
                <Typography
                  component="h3"
                  sx={{
                    fontFamily: SANS,
                    fontWeight: 700,
                    fontSize: "15px",
                    color: "#1A2B2E",
                    marginBottom: "4px",
                    letterSpacing: "-0.005em",
                  }}
                >
                  {t(step.titleKey, step.titleFallback)}
                </Typography>

                <Box
                  component="p"
                  sx={{
                    fontFamily: SANS,
                    fontSize: "13px",
                    color: "rgba(15, 23, 42, 0.75)",
                    lineHeight: 1.6,
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
                    color: "#4A5568",
                  }}
                >
                  {t(step.metaKey, step.metaFallback)}
                </Box>
              </Box>
            </Box>
          ))}
        </Box>
      </Box>

      {/* ───────── 3. Payment & Policy CTA + FAQ ───────── */}
      <Box
        sx={{
          padding: "20px 20px 28px",
          display: "flex",
          flexDirection: "column",
          gap: 2,
        }}
      >
        {/* 🆕 Round 28s201 — Reservation pillars (2×2 grid) removed.
            Founder audit: "One-tap" + "Detailed profiles" duplicated
            Services/Therapist cards; "Privacy by design" + "Photo
            verified" are brand-trust signals that belong in About us.
            How-to-book now stays focused on the 3-step ritual + FAQ. */}

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
              borderColor: "rgba(15, 23, 42, 0.18)",
              boxShadow:
                "0 1px 2px rgba(180, 0, 10, 0.05), 0 8px 22px rgba(180, 0, 10, 0.06)",
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
                color: "#4A5568",
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
                color: "#1A2B2E",
                letterSpacing: "-0.005em",
                lineHeight: 1.3,
              }}
            >
              Pricing, deposits & cancellation
            </Typography>
          </Box>
          <ChevronRightRoundedIcon
            sx={{ color: "rgba(15, 23, 42,0.4)", fontSize: 22 }}
          />
        </Box>

        {/* 🆕 Round 28s205 — Founder: "ดึงกลับมาที่เดิม · ลูกค้า
            ขี้เกียจอ่านหลายหน้า". Typical arrival window moved back
            to Services tab where guests already are — no tab-switch
            required to learn the timing. */}

        {/* 🆕 Round 28r12 (founder 2026-05-06) — FAQ section.
            Six categories × 4–5 Q&A each (booking / practitioners /
            services & pricing / areas / payment & discretion / common
            questions). Each answer reframes the question through the
            four strategic battles: discretion as a feature, total-
            experience pricing, value > price-tag, and supply honesty.
            Self-contained component — see HowItWorksFAQ.tsx. */}
        <HowItWorksFAQ />

        {/* 🆕 Round 28s201 — Closing italic note removed (founder
            audit: concierge channels now live on the Services tab,
            so this dangling reassurance was redundant). */}
      </Box>
    </Box>
  );
};

export default HowItWorks;
