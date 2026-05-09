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
import HelpOutlineRoundedIcon from "@mui/icons-material/HelpOutlineRounded";

const SERIF = '"Fraunces", Georgia, "Times New Roman", serif';
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
        a: "Most reservations land between 30 — 45 minutes after concierge confirmation. Express slots within the hour are noted on each practitioner's card when they're already on standby in your district.",
      },
      {
        q: "Can I extend the session once it's started?",
        a: "Yes — extension is at the practitioner's discretion based on her schedule. Mention it during the ritual; she'll confirm with the concierge. Extension is billed at the per-minute rate of your booked tier.",
      },
      {
        q: "What's the cancellation policy?",
        a: "Cancellation is complimentary up until the practitioner has been dispatched. Once she's en route, a travel reimbursement applies. The concierge will tell you transparently before charging anything.",
      },
      {
        q: "How does the 10-minute hold work?",
        a: "After you place a reservation, the slot is held for 10 minutes while the concierge confirms. If you don't hear back within that window, the slot is released — tap re-book on the success page to retry.",
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
        a: "Yes — 100% Thai, cisgender female. Verified roster only. We do not include trans or male practitioners on this platform. If you require otherwise, BKK has many other options outside our service.",
      },
      {
        q: "Are the photos real?",
        a: "Every photo on a practitioner profile is taken in-house — no AI-generated images, no stock, no filtered-beyond-recognition retouching. The roster is small enough that we vet every photograph manually.",
      },
      {
        q: "My favorite practitioner isn't available — what now?",
        a: "Tap any other practitioner on the Therapists tab and the concierge will recommend the closest match (specialty, area, language). Or message the concierge directly with your preferences and we'll suggest who's on tonight.",
      },
      {
        q: "Which languages do practitioners speak?",
        a: "Each profile lists language proficiency. English, Thai, and basic Mandarin are common across the roster. A handful are conversational in Japanese or Korean — the concierge can match you to a language preference at booking.",
      },
      {
        q: "Why do you not list age?",
        a: "We list practitioner status (specialised, certified, etc.) instead of age. All practitioners are verified adults; precise age is omitted to protect their privacy on a public platform.",
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
        a: "Thai Massage is traditional dry-compression, fully clothed. Aromatherapy is oil-based whole-body relaxation. Gentleman's Signature is aromatherapy with a personalised finishing ritual. SunRed Therapeutic is our most refined ritual — a whole-body oil ceremony with continuous-contact technique, reserved for specialised practitioners only. Tap any service for the full inclusions list.",
      },
      {
        q: "Why are SunRed prices higher than other Bangkok options?",
        a: "Each session price includes premium aromatic oil, in-suite delivery (no commute, no taxi negotiation), a verified-roster practitioner, an unhurried 60–120 minute ritual, and a fixed concierge-confirmed total — no haggling, no surprise add-ons, no bait-and-switch. Other places typically charge those separately.",
      },
      {
        q: "Can I upgrade to SunRed Therapeutic on the night?",
        a: "Yes — message the concierge with your booking code and we'll see whether your practitioner is qualified for the SunRed Therapeutic ritual (it's reserved for specialised practitioners only). The price difference is settled by your existing payment method.",
      },
      {
        q: "Are there any add-ons or extras?",
        a: "Premium aromatic oil upgrades, beyond-central-zone travel, session extension (60→90→120 min), and duo experiences are the formal enhancements. Anything outside the listed ritual is not part of our service — guests seeking something else are politely directed elsewhere.",
      },
      {
        q: "Do you offer discounts or promo codes?",
        a: "First-time guests have a 10% welcome credit (capped at 200฿ — mention 'first booking' to the concierge), valid on Thai & Aromatherapy menu. The Refer & earn program gives 200฿ back to both referrer and friend after the friend's first completed session, also entry-tier. For our Gentleman's Signature and Therapeutic Experience guests, ask about the VIP100 (฿100 off) or FREETAXI (travel comped) tokens. Outside-source promo codes are honoured on a case-by-case basis — share the code at booking.",
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
        a: "Travel within central Bangkok is included for most reservations. For locations outside the dense central zone (typically beyond ~10km), a transparent surcharge is added at booking time — no hidden fees on arrival.",
      },
      {
        q: "What if I'm in a far district?",
        a: "Distances beyond 25km require admin-quoted travel and a small refundable hold to confirm. The concierge will quote the exact figure before you commit.",
      },
      {
        q: "Outcall only — no shop visits?",
        a: "Correct. SunRed is exclusively outcall — your hotel suite or residence. We do not maintain a public-facing shop. This protects guest privacy and keeps the experience consistent across every booking.",
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
        a: "PromptPay (instant Thai bank transfer) and cash on arrival are the canonical methods. Credit-card payment is available via the concierge for trusted repeat guests. Cryptocurrency is not currently supported.",
      },
      {
        q: "Will the charge appear discreetly?",
        a: "PromptPay transfers show only the receiving account name (a neutral entity). Cash payments leave no record at all. We don't issue branded receipts unless you specifically request one.",
      },
      {
        q: "Is the practitioner's arrival hotel-discrete?",
        a: "Yes. Practitioners arrive in everyday attire — there's nothing on their person that signals 'massage service'. Hotel reception sees a guest visitor; nothing more. We've operated across every major Bangkok hotel without incident.",
      },
      {
        q: "Do you keep my personal information?",
        a: "We retain only the minimum needed to deliver the service — name, contact phone, address. We don't sell, share, or surface guest data publicly. Booking history is visible only to the guest and the concierge.",
      },
    ],
  },
  {
    id: "common",
    icon: <HelpOutlineRoundedIcon />,
    title: "Common questions",
    items: [
      {
        q: "Is the ritual performed unclothed?",
        a: "Each service has its own protocol — Thai is fully clothed, Aromatherapy and beyond are oil-based and follow the practitioner's standard draping etiquette. Specifics vary by practitioner; the concierge can clarify before booking.",
      },
      {
        q: "Do you offer overnight bookings?",
        a: "No. The longest session tier is 120 minutes. We don't offer overnight or multi-hour engagements — that's a different service category we don't operate in.",
      },
      {
        q: "Are practitioners available during the daytime?",
        a: "Yes — daytime reservations from 09:00 onward are welcome. Prime hours (22:00 — 04:00) tend to fill faster, so early booking is encouraged for late-night slots.",
      },
      {
        q: "Can the booking be made by a third party (concierge, friend)?",
        a: "Yes. As long as we have a confirmed contact phone for the actual guest, the booking can be placed by anyone. The practitioner liaises with the on-site phone number, not the booker.",
      },
      {
        q: "I have a preference you didn't list — can I ask?",
        a: "Reach out to the concierge. We can answer most preference questions discreetly via private chat — anything within the listed services is fair to discuss; anything outside isn't on offer, and we'll be clear about that.",
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
          outline: "2px solid #FE0944",
          outlineOffset: 2,
          borderRadius: 4,
        },
      }}
    >
      <Typography
        component="span"
        sx={{
          fontFamily: SERIF,
          fontSize: "14px",
          fontWeight: 500,
          color: "#3c1e14",
          lineHeight: 1.4,
          flex: 1,
          letterSpacing: "-0.01em",
        }}
      >
        {qa.q}
      </Typography>
      <ExpandMoreRoundedIcon
        sx={{
          fontSize: 20,
          color: open ? "#FE0944" : "rgba(60, 30, 20, 0.45)",
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
          color: "rgba(60, 30, 20, 0.78)",
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
            color: "#b85c3c",
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
        <Typography
          sx={{
            fontFamily: SERIF,
            fontSize: "22px",
            fontWeight: 500,
            color: "#2a1a14",
            letterSpacing: "-0.02em",
            lineHeight: 1.2,
            "& em": { fontStyle: "italic", color: "#FE0944" },
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
            color: "rgba(60, 30, 20, 0.65)",
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

      {FAQ_SECTIONS.map((section) => (
        <Box
          key={section.id}
          sx={{
            borderRadius: "16px",
            background: "rgba(255, 255, 255, 0.7)",
            border: "1px solid rgba(255, 255, 255, 0.6)",
            boxShadow: "0 4px 14px rgba(126, 30, 46, 0.06)",
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
                background: "rgba(254, 9, 68, 0.10)",
                color: "#FE0944",
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
                color: "#3c1e14",
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
