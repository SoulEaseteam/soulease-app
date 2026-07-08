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
import EventNoteRoundedIcon from "@mui/icons-material/EventNoteRounded";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import LocalOfferRoundedIcon from "@mui/icons-material/LocalOfferRounded";
import LocationOnRoundedIcon from "@mui/icons-material/LocationOnRounded";
import LockRoundedIcon from "@mui/icons-material/LockRounded";
// 🆕 Round 28s202 — HelpOutlineRoundedIcon dropped along with the
//   trimmed "Common questions" FAQ section.

const SERIF = '"Federo", "Italiana", "Cinzel", "Fraunces", Georgia, "Times New Roman", serif';
const SANS = '"Inter", system-ui, -apple-system, sans-serif';

interface QA {
  q: string;
  a: string;
}
interface FAQSection {
  id: string;
  icon: React.ReactNode;
  title: string;
  items: QA[];
}

// 🆕 Round 28s202 — Founder audit: "ลดจำนวนลงหน่อย มีบางอย่าง
//   เยอะไป". FAQ trimmed from 28 → 13 Q&As (roughly the top 2-3
//   per category that the concierge actually answers most often).
//   Full archive preserved in git history if a future round needs it.
const FAQ_SECTIONS: FAQSection[] = [
  {
    id: "booking",
    icon: <EventNoteRoundedIcon />,
    title: "Booking",
    items: [
      {
        q: "How do I make a reservation?",
        a: "Open the Therapists tab, tap a practitioner, choose your service and time, then confirm. The concierge confirms within minutes via your preferred channel (LINE, WhatsApp, Telegram). No phone calls required.",
      },
      {
        q: "How quickly can a practitioner arrive?",
        a: "Most reservations land between 30–60 minutes after concierge confirmation. Express slots within the hour are flagged on each practitioner's card when she's already on standby in your district.",
      },
      {
        q: "What's the cancellation policy?",
        a: "Cancellation is complimentary up until the practitioner has been dispatched. Once she's en route, a travel reimbursement applies. The concierge will tell you transparently before charging anything.",
      },
    ],
  },
  {
    id: "practitioners",
    icon: <GroupsRoundedIcon />,
    title: "Practitioners",
    items: [
      {
        q: "Are all practitioners female?",
        a: "Yes — 100% Thai, cisgender female. Verified roster only. If you require otherwise, Bangkok has many other options outside our service.",
      },
      {
        q: "Are the photos real?",
        a: "Every photo is taken in-house — no AI-generated images, no stock, no filtered-beyond-recognition retouching. The roster is small enough that we vet every photograph manually.",
      },
    ],
  },
  {
    id: "services",
    icon: <LocalOfferRoundedIcon />,
    title: "Services & Pricing",
    items: [
      {
        q: "What's the difference between the four services?",
        a: "Thai Massage is traditional dry-compression, fully clothed. Aromatherapy is oil-based whole-body relaxation. Gentleman's Signature is aromatherapy with a personalised finishing ritual. SunRed Therapeutic is our most refined ritual — a whole-body oil ceremony reserved for specialised practitioners. Tap any service for the full inclusions list.",
      },
      {
        q: "Why are SunRed prices higher than other Bangkok options?",
        a: "Each session price includes premium aromatic oil, in-suite delivery, a verified-roster practitioner, an unhurried 60–120 minute ritual, and a fixed concierge-confirmed total — no haggling, no surprise add-ons. Other places typically charge those separately.",
      },
      {
        q: "Are there any add-ons or extras?",
        a: "Premium aromatic oil upgrades, beyond-central-zone travel, session extension (60→90→120 min), and duo experiences are the formal enhancements. Anything outside the listed ritual is not part of our service.",
      },
    ],
  },
  {
    id: "areas",
    icon: <LocationOnRoundedIcon />,
    title: "Areas served",
    items: [
      {
        q: "Where do you deliver?",
        a: "Bangkok metro only — Sukhumvit, Silom, Asok, Thonglor, Riverside, Sathorn, and surrounding districts. We do not currently serve Phuket, Pattaya, Chiang Mai, or other provinces.",
      },
      {
        q: "How is the travel fee calculated?",
        a: "Travel within central Bangkok is included for most reservations. For locations beyond the dense central zone (typically beyond ~10km), a transparent surcharge is added at booking time — no hidden fees on arrival.",
      },
    ],
  },
  {
    id: "payment",
    icon: <LockRoundedIcon />,
    title: "Payment & Discretion",
    items: [
      {
        q: "Which payment methods do you accept?",
        a: "PromptPay (instant Thai bank transfer) and cash on arrival are the canonical methods. Credit-card payment is available via the concierge for trusted repeat guests.",
      },
      {
        q: "Will the charge appear discreetly?",
        a: "PromptPay transfers show only the receiving account name (a neutral entity). Cash payments leave no record at all. We don't issue branded receipts unless you specifically request one.",
      },
      {
        q: "Is the practitioner's arrival hotel-discrete?",
        a: "Yes. Practitioners arrive in everyday attire — nothing on their person signals 'massage service'. Hotel reception sees a guest visitor; nothing more.",
      },
    ],
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
      borderBottom: "1px solid rgba(184, 92, 60, 0.10)",
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
          outline: "2px solid #2D2D2B",
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
          color: "#1A2B2E",
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
          color: open ? "#2D2D2B" : "rgba(15, 23, 42, 0.45)",
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
          color: "rgba(15, 23, 42, 0.78)",
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
            color: "#4A5568",
            fontWeight: 700,
            mb: 1,
            fontFamily: SANS,
            "&::before": {
              content: '""',
              width: "22px",
              height: "1px",
              background: "rgba(184, 92, 60, 0.55)",
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
            color: "#1A2B2E",
            letterSpacing: "-0.015em",
            lineHeight: 1.25,
            "& em": {
              fontFamily: SERIF,
              fontStyle: "italic",
              fontWeight: 500,
              color: "#2D2D2B",
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
            color: "rgba(15, 23, 42, 0.65)",
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

      {/* 🆕 Round 28s201 — Category jump pills. Founder audit:
          28 Q&A is a long scroll — guests should be able to skip to
          the section they need. Horizontal snap row mirrors the
          Services rate-card row's interaction model. */}
      <Box
        sx={{
          display: "flex",
          gap: 1,
          padding: "4px 4px 6px",
          margin: "-4px -4px 0",
          overflowX: "auto",
          scrollSnapType: "x proximity",
          scrollbarWidth: "none",
          "&::-webkit-scrollbar": { display: "none" },
        }}
      >
        {FAQ_SECTIONS.map((section) => (
          <Box
            key={section.id}
            component="button"
            type="button"
            onClick={() => {
              const el = document.getElementById(`faq-${section.id}`);
              if (el) {
                el.scrollIntoView({ behavior: "smooth", block: "start" });
              }
            }}
            sx={{
              flexShrink: 0,
              padding: "7px 14px",
              borderRadius: 999,
              border: "1px solid rgba(15, 23, 42, 0.12)",
              background: "#FFFFFF",
              fontFamily: SANS,
              fontSize: 11.5,
              fontWeight: 700,
              letterSpacing: "0.02em",
              color: "#1A2B2E",
              cursor: "pointer",
              scrollSnapAlign: "start",
              display: "inline-flex",
              alignItems: "center",
              gap: 0.75,
              transition:
                "transform 0.15s ease, border-color 0.15s ease, background 0.15s ease",
              "& svg": { fontSize: 14, color: "#2D2D2B" },
              "&:hover": {
                transform: "translateY(-1px)",
                borderColor: "#2D2D2B",
                background: "rgba(45, 45, 43, 0.04)",
              },
              "&:focus-visible": {
                outline: "2px solid #2D2D2B",
                outlineOffset: 2,
              },
            }}
          >
            {section.icon}
            {section.title}
          </Box>
        ))}
      </Box>

      {FAQ_SECTIONS.map((section) => (
        <Box
          key={section.id}
          id={`faq-${section.id}`}
          sx={{
            scrollMarginTop: "80px",
            borderRadius: "16px",
            background: "rgba(255, 255, 255, 0.7)",
            border: "1px solid rgba(255, 255, 255, 0.6)",
            boxShadow: "0 4px 14px rgba(15, 23, 42, 0.06)",
            padding: "16px 18px 6px",
          }}
        >
          {/* Section header */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              marginBottom: "8px",
            }}
          >
            <Box
              aria-hidden
              sx={{
                width: 30,
                height: 30,
                flexShrink: 0,
                borderRadius: "9px",
                background: "rgba(15, 23, 42, 0.10)",
                color: "#2D2D2B",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                "& svg": { fontSize: 18 },
              }}
            >
              {section.icon}
            </Box>
            <Typography
              sx={{
                fontFamily: SERIF,
                fontSize: "16px",
                fontWeight: 600,
                color: "#1A2B2E",
                letterSpacing: "-0.01em",
              }}
            >
              {/* 🆕 Round 28r16 — i18n keys. English defaults stay
                  inline; non-English locales (starting with ZH) resolve
                  via translation files. */}
              {t(`home.faq2.${section.id}.title`, section.title)}
            </Typography>
          </Box>

          {section.items.map((qa, idx) => {
            const key = `${section.id}-${idx}`;
            const localised = {
              q: t(`home.faq2.${section.id}.${idx}.q`, qa.q),
              a: t(`home.faq2.${section.id}.${idx}.a`, qa.a),
            };
            return (
              <FAQRow
                key={key}
                qa={localised}
                open={openKey === key}
                onToggle={() => setOpenKey(openKey === key ? null : key)}
              />
            );
          })}
        </Box>
      ))}
    </Box>
  );
};

export default HowItWorksFAQ;
