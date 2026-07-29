// src/components/home/HowItWorksFAQ.tsx
//
// 🆕 Round 28r12 (founder 2026-05-06) — FAQ section appended to the
//   "How to Book" tab. Direct response to the founder's customer-
//   psychology brief — every answer is shaped to fight one of four
//   strategic battles instead of just answering the literal question:
//
//   1. Discretion-as-feature — guests are paying for "no haggling,
//      no surprises, hotel-security-friendly" not for explicit extras.
//   2. Total-experience framing — reframe per-session price as a
//      bundle (oil + delivery + verified + finishing ritual) so we
//      don't lose to budget shops on a face-value comparison.
//   3. Value > price-tag — list inclusions that other places charge
//      separately so the gap reads as content not premium.
//   4. Supply honesty — guide guests toward "available now" or a
//      Notify-Me path rather than chasing an unavailable favorite.
//
//   Phrasing follows CLAUDE.md euphemism table (HJ → personalised
//   finishing ritual; B2B/nuru → continuous-contact technique). No
//   explicit terms; no fabricated stats.

import React, { useState } from "react";
import { Box, Typography, Collapse } from "@mui/material";
import { useTranslation } from "react-i18next";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
// 🆕 Round 28r107 — per-category icons dropped along with the category
//   chip row + per-category cards.  Single flat accordion now.

const SERIF = '"Playfair Display", "Fraunces", Georgia, "Times New Roman", serif';
const SANS = '"Inter", system-ui, -apple-system, sans-serif';

interface QA {
  id: string;
  q: string;
  a: string;
}

// 🆕 Round 28r107 — Founder audit: "หน้านี้ เขียนซ้ำ เขียน มั่ว
//   เขียน งง". Trimmed 13 → 6 essential Q&A, dropped the category
//   chip row + per-category card wrapper. Now a single flat accordion.
//   Dropped items (still in git):
//   · "Difference between 4 services" — Services tab already lists them
//   · "Are photos real" — trust signal, belongs on About / therapist page
//   · "Are there add-ons" — booking flow surfaces this at reserve time
//   · "Where do you deliver" — Services tab Areas & Timing has it
//   · "How is travel fee calculated" — booking flow handles it
//   · "Payment methods" — /payment-methods CTA above owns this
//   · Merged 2 discretion Qs (charge + arrival) into one
const FAQ_ITEMS: QA[] = [
  // 🆕 28r108 — "How do I book?" removed. Founder: "มีแล้ว 123 ไง" —
  //   the 3-step ritual (01/02/03) above already answers this.
  {
    id: "arrive",
    q: "How quickly can she arrive?",
    a: "Most reservations land within 30–60 minutes of concierge confirmation. Express slots are flagged on the practitioner's card when she's already on standby in your district.",
  },
  {
    id: "cancel",
    q: "What's the cancellation policy?",
    a: "Complimentary up until dispatch. Once she's en route, a travel reimbursement applies. The concierge tells you transparently before anything is charged.",
  },
  {
    id: "female",
    q: "Are all practitioners female?",
    a: "Yes, 100% Thai, cisgender female. Verified roster only.",
  },
  {
    id: "value",
    q: "Why are SunRed prices higher than other Bangkok options?",
    a: "Each price includes premium oil, in-suite delivery, a verified practitioner, an unhurried 60–120 minute ritual, and a fixed concierge-confirmed total. No haggling, no surprise add-ons.",
  },
  {
    id: "discreet",
    q: "How discreet is the visit?",
    a: "Practitioners arrive in everyday attire. Nothing signals 'massage service'. PromptPay transfers show only the neutral receiving account; cash leaves no record. No branded receipts unless you ask.",
  },
];

interface FAQRowProps {
  qa: QA;
  open: boolean;
  onToggle: () => void;
}

const FAQRow: React.FC<FAQRowProps> = ({ qa, open, onToggle }) => (
  <Box
    sx={{
      borderBottom: "1px solid var(--sr-hairline)",
      "&:last-child": { borderBottom: "none" },
    }}
  >
    <Box
      component="button"
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      sx={{
        width: "100%",
        background: "transparent",
        border: "none",
        padding: "13px 0",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: "12px",
        cursor: "pointer",
        textAlign: "left",
        "&:focus-visible": {
          outline: "2px solid #FF9999",
          outlineOffset: 2,
          borderRadius: 4,
        },
      }}
    >
      {/* 🆕 Round 28s202 — Questions switched to sans-serif (Inter
          600) for legibility. The previous serif at 14px wasn't
          easy to scan on mobile. */}
      <Typography
        component="span"
        sx={{
          fontFamily: SANS,
          fontSize: "13.5px",
          fontWeight: 600,
          color: "var(--sr-ink)",
          lineHeight: 1.45,
          flex: 1,
          letterSpacing: "-0.005em",
        }}
      >
        {qa.q}
      </Typography>
      <ExpandMoreRoundedIcon
        sx={{
          fontSize: 20,
          color: open ? "var(--sr-ink)" : "var(--sr-muted)",
          transform: open ? "rotate(180deg)" : "rotate(0deg)",
          transition: "transform 0.25s ease, color 0.2s ease",
          marginTop: "1px",
          flexShrink: 0,
        }}
      />
    </Box>
    <Collapse in={open}>
      <Typography
        sx={{
          fontFamily: SANS,
          fontSize: "12.5px",
          color: "var(--sr-body)",
          lineHeight: 1.65,
          paddingBottom: "14px",
          paddingRight: "8px",
        }}
      >
        {qa.a}
      </Typography>
    </Collapse>
  </Box>
);

export const HowItWorksFAQ: React.FC = () => {
  const { t } = useTranslation();
  const [openKey, setOpenKey] = useState<string | null>(null);

  return (
    <Box
      component="section"
      aria-label="Frequently asked questions"
      sx={{
        marginTop: "32px",
        display: "flex",
        flexDirection: "column",
        gap: "18px",
      }}
    >
      {/* Eyebrow + title */}
      <Box>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            fontSize: 10,
            letterSpacing: "0.24em",
            textTransform: "uppercase",
            color: "var(--sr-muted)",
            fontWeight: 700,
            mb: 1,
            fontFamily: SANS,
            "&::before": {
              content: '""',
              width: "22px",
              height: "1px",
              background: "rgba(217, 124, 149, 0.65)",
            },
          }}
        >
          {t("home.faq2.eyebrow", "Frequently asked")}
        </Box>
        {/* 🆕 Round 28s202 — FAQ title sans-serif for legibility,
            serif italic kept only on the "ask" accent. */}
        <Typography
          sx={{
            fontFamily: SANS,
            fontSize: "20px",
            fontWeight: 700,
            color: "var(--sr-ink)",
            letterSpacing: "-0.015em",
            lineHeight: 1.25,
            "& em": {
              fontFamily: SERIF,
              fontStyle: "italic",
              fontWeight: 500,
              color: "#FF9999",
            },
          }}
          dangerouslySetInnerHTML={{
            __html: t(
              "home.faq2.titleHtml",
              "What guests usually <em>ask</em> first"
            ),
          }}
        />
        <Typography
          sx={{
            fontFamily: SANS,
            fontSize: 12.5,
            color: "var(--sr-muted)",
            lineHeight: 1.55,
            marginTop: "8px",
            fontStyle: "italic",
          }}
        >
          {t(
            "home.faq2.lead",
            "Concise answers to the questions our concierge fields most often. For anything not covered, our concierge is on chat 24/7."
          )}
        </Typography>
      </Box>

      {/* 🆕 28r107 — single flat accordion (was 5 category cards +
          horizontal jump-pill row). 6 essential Q&A only. */}
      <Box
        sx={{
          borderRadius: "16px",
          background: "var(--sr-panel)",
          border: "1px solid var(--sr-hairline)",
          boxShadow: "var(--sr-card-shadow)",
          padding: "6px 18px",
        }}
      >
        {FAQ_ITEMS.map((qa) => {
          const localised = {
            id: qa.id,
            q: t(`home.faq2.${qa.id}.q`, qa.q),
            a: t(`home.faq2.${qa.id}.a`, qa.a),
          };
          return (
            <FAQRow
              key={qa.id}
              qa={localised}
              open={openKey === qa.id}
              onToggle={() => setOpenKey(openKey === qa.id ? null : qa.id)}
            />
          );
        })}
      </Box>
    </Box>
  );
};

export default HowItWorksFAQ;
