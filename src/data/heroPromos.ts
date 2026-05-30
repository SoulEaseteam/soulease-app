// src/data/heroPromos.ts
//
// 🎁 Round 28s11 — Rotating promo bank for the hero banner (founder
// 2026-05-30). Founder direction: "ลองให้ promo ออกมาแบบสุ่ม
// เวลาตลอด 24 ชม" — show a different promo throughout the day so
// the page never looks stale and the brand has 24 distinct shots
// at the impression.
//
// Pick strategy: deterministic hour-of-day rotation, filtered to
// promos whose `modes` include the current concierge window. This
// gives:
//   • Same hour → same promo (no flicker on refresh within an hour)
//   • Hour-to-hour rotation (returning visitor sees something fresh)
//   • Time-appropriate content (jet-lag pitch in evening, late-
//     express in prime hours, pre-book in off-hours)
//
// All promos route to WhatsApp with a pre-filled message so the
// concierge can quote without asking "which offer did you mean?".
// IDs flow through `trackConciergeOpen("promo_<id>")` so View can
// see which angle converts best in the funnel analytics.
//
// To add or remove promos: edit the PROMOS array below. The picker
// auto-handles rotation length.

import type { ConciergeMode } from "@/utils/conciergeMode";
import type { SvgIconComponent } from "@mui/icons-material";

import CardGiftcardRoundedIcon from "@mui/icons-material/CardGiftcardRounded";
import StarRoundedIcon from "@mui/icons-material/StarRounded";
import FlashOnRoundedIcon from "@mui/icons-material/FlashOnRounded";
import FlightTakeoffRoundedIcon from "@mui/icons-material/FlightTakeoffRounded";
import WbSunnyRoundedIcon from "@mui/icons-material/WbSunnyRounded";
import EventRoundedIcon from "@mui/icons-material/EventRounded";
import SpaRoundedIcon from "@mui/icons-material/SpaRounded";
import TimerRoundedIcon from "@mui/icons-material/TimerRounded";
import PeopleAltRoundedIcon from "@mui/icons-material/PeopleAltRounded";
import PlaceRoundedIcon from "@mui/icons-material/PlaceRounded";
import LocalTaxiRoundedIcon from "@mui/icons-material/LocalTaxiRounded";
import TranslateRoundedIcon from "@mui/icons-material/TranslateRounded";

export interface HeroPromo {
  /** Stable ID — used in analytics tracking. */
  id: string;
  /** Small uppercase label above the title. */
  eyebrow: string;
  /** Main one-line promise (Fraunces serif). */
  title: string;
  /** Body copy underneath the title. */
  sub: string;
  /** Pre-filled WhatsApp message — admin gets context for free. */
  waMsg: string;
  /** Decorative icon rendered at low opacity behind the copy. */
  icon: SvgIconComponent;
  /** Restrict to specific concierge windows. Omit = always eligible. */
  modes?: ConciergeMode[];
}

export const PROMOS: HeroPromo[] = [
  // ── Discount codes — universal eligibility ──────────────────────────
  {
    id: "first10",
    eyebrow: "WELCOME OFFER",
    title: "10% off your first booking",
    sub: "Code FIRST10 · applied at checkout",
    waMsg:
      "Hi, I'd like to book using FIRST10 (10% off first booking). When can I reserve?",
    icon: CardGiftcardRoundedIcon,
  },
  {
    id: "welcome20",
    eyebrow: "GUEST WELCOME",
    title: "20% off your first session",
    sub: "Code WELCOME20 · for new guests",
    waMsg:
      "Hi, I'd like to use WELCOME20 (20% off first session). Available tonight?",
    icon: StarRoundedIcon,
  },

  // ── Time-window specific ────────────────────────────────────────────
  {
    id: "late-express",
    eyebrow: "TONIGHT",
    title: "Practitioner dispatched in under 40 min",
    sub: "Late-hour rituals · 22:00–04:00",
    waMsg:
      "Hi, I need an express dispatch tonight. Who's available now?",
    icon: FlashOnRoundedIcon,
    modes: ["prime"],
  },
  {
    id: "hotel-checkin",
    eyebrow: "JUST CHECKED IN",
    title: "Recover from your flight, in-suite",
    sub: "Aromatherapy or Thai · 60-min reset",
    waMsg:
      "Hi, just checked into my hotel — looking to book a recovery session tonight.",
    icon: FlightTakeoffRoundedIcon,
    modes: ["evening"],
  },
  {
    id: "day-ritual",
    eyebrow: "DAYTIME WINDOW",
    title: "Quiet hours in-suite",
    sub: "09:00–17:00 · same-day reservation",
    waMsg: "Hi, I'd like a daytime ritual today.",
    icon: WbSunnyRoundedIcon,
    modes: ["day"],
  },
  {
    id: "pre-book",
    eyebrow: "PRE-BOOK",
    title: "Reserve tonight before slots fill",
    sub: "Concierge replies within minutes",
    waMsg:
      "Hi, I'd like to pre-book for tonight. Who do you recommend?",
    icon: EventRoundedIcon,
    modes: ["off"],
  },

  // ── Service / ritual upgrades ───────────────────────────────────────
  {
    id: "premium-oil",
    eyebrow: "COMPLIMENTARY",
    title: "Premium aromatic oil — on us",
    sub: "+฿0 with any Aromatherapy session",
    waMsg:
      "Hi, I'd like Aromatherapy with the premium oil upgrade.",
    icon: SpaRoundedIcon,
  },
  {
    id: "90-ritual",
    eyebrow: "EXTENDED RITUAL",
    title: "90-minute deep session",
    sub: "1.5× duration · Thai from ฿1,800",
    waMsg: "Hi, I'd like a 90-min session. What's available?",
    icon: TimerRoundedIcon,
  },

  // ── Network / referral ──────────────────────────────────────────────
  {
    id: "referral",
    eyebrow: "REFER A FRIEND",
    title: "Friend gets ฿500 off · you save back",
    sub: "Share your SUN-XXXX referral code",
    waMsg: "Hi, I'd like to refer a friend. How does it work?",
    icon: PeopleAltRoundedIcon,
  },

  // ── Practical concerns ──────────────────────────────────────────────
  {
    id: "sukhumvit-quick",
    eyebrow: "SUKHUMVIT GUESTS",
    title: "Practitioner in under 20 minutes",
    sub: "Within Sukhumvit / Asok / Thonglor zone",
    waMsg: "Hi, I'm staying in Sukhumvit — who's closest?",
    icon: PlaceRoundedIcon,
  },
  {
    id: "free-taxi",
    eyebrow: "TONIGHT",
    title: "Taxi fare waived for guests within 5 km",
    sub: "Express ≤5km · arrives in under 40 min",
    waMsg:
      "Hi, I'd like to use the FREETAXI option for tonight.",
    icon: LocalTaxiRoundedIcon,
    modes: ["prime", "evening"],
  },
  {
    id: "bilingual",
    eyebrow: "CONCIERGE",
    title: "EN · 中文 · 日本語 · 한국어",
    sub: "Concierge replies in your language",
    waMsg:
      "Hi, do you have a practitioner who speaks my language?",
    icon: TranslateRoundedIcon,
  },
];

/** Deterministic hour-of-day picker. Same hour → same promo across
 *  refreshes; rotates as the BKK clock advances. Filters to promos
 *  whose `modes` array includes the current concierge mode (or has
 *  no `modes` field — universal). */
export function pickHeroPromo(
  hourBKK: number,
  mode: ConciergeMode,
): HeroPromo {
  const eligible = PROMOS.filter(
    (p) => !p.modes || p.modes.includes(mode),
  );
  // Defensive fallback — eligible should never be empty given the
  // universal promos above, but guard so the hero never crashes.
  if (eligible.length === 0) return PROMOS[0];
  return eligible[hourBKK % eligible.length];
}
