// src/pages/TherapistDetailPage.tsx
//
// 🎨 Phase 2 — Therapist Detail (route `/therapists/:id`).
// Pixel-perfect composition of `01-mockups/sunred-therapists.html` Phone B
// (canonical mockup `sunred-therapists2.html`).
//
// Section flow (verbatim mockup):
//   DetailHero → StatsCard → About → Credentials → Specialties →
//   Languages → Pricing → Calendar → Reviews → StickyBookCTA
//
// NOTE: previous TherapistDetailPage.tsx (Tabs/Cloudinary/ImageList) replaced
// to match Phase 2 design. Real data integration via `therapistsData` lookup
// + Firestore live status in Task 7 (i18n sweep / data wiring).

import React, { useState } from "react";
import { Box, Typography } from "@mui/material";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import DetailHero from "@/components/therapist/detail/DetailHero";
import StatsCard from "@/components/therapist/detail/StatsCard";
import {
  About,
  type AboutFact,
  type AboutRow,
} from "@/components/therapist/detail/DetailSections";
// 🆕 Round 28ak — replace emoji icons with proper Material UI icons.
import WorkOutlineRoundedIcon from "@mui/icons-material/WorkOutlineRounded";
import PublicRoundedIcon from "@mui/icons-material/PublicRounded";
import StraightenRoundedIcon from "@mui/icons-material/StraightenRounded";
import TranslateRoundedIcon from "@mui/icons-material/TranslateRounded";
import ScheduleRoundedIcon from "@mui/icons-material/ScheduleRounded";
// 🆕 Round 28b3 — Gender icon for the new About 3-row layout.
import WcRoundedIcon from "@mui/icons-material/WcRounded";
// 🆕 Round 28am — selective Specialty icons (Phase 2.5)
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import FitnessCenterRoundedIcon from "@mui/icons-material/FitnessCenterRounded";
import WhatshotRoundedIcon from "@mui/icons-material/WhatshotRounded";
// 🆕 Round 28b3 — emoji → MUI icons across SERVICE_DISPLAY + Credentials
//   so the no-emoji rule covers the detail page too.
import SpaRoundedIcon from "@mui/icons-material/SpaRounded";
import LocalFloristRoundedIcon from "@mui/icons-material/LocalFloristRounded";
import SelfImprovementRoundedIcon from "@mui/icons-material/SelfImprovementRounded";
import DirectionsRunRoundedIcon from "@mui/icons-material/DirectionsRunRounded";
import PregnantWomanRoundedIcon from "@mui/icons-material/PregnantWomanRounded";
import EmojiNatureRoundedIcon from "@mui/icons-material/EmojiNatureRounded";
import PsychologyRoundedIcon from "@mui/icons-material/PsychologyRounded";
import LandscapeRoundedIcon from "@mui/icons-material/LandscapeRounded";
import VerifiedRoundedIcon from "@mui/icons-material/VerifiedRounded";
import SchoolRoundedIcon from "@mui/icons-material/SchoolRounded";
import ShieldRoundedIcon from "@mui/icons-material/ShieldRounded";
import TherapistInfoSheet from "@/components/therapist/detail/TherapistInfoSheet";
import StatusPill from "@/components/therapist/detail/StatusPill";
// StickyBookCTA — kept on disk but no longer mounted (Phase 5 auto-nav).

// 🆕 Phase 5 — Service + Duration + Date + Time picker now lives in ONE
//   merged bottom sheet (founder feedback 2026-05-01 'ในsheet เดียวกัน').
//   The detail page just renders the service cards; tapping a card opens
//   the merged sheet, and Confirm auto-navigates to /booking/:id.
import StepService from "@/components/booking/StepService";
import {
  bayesianRating,
  formatRating,
} from "@/utils/rating";
// 🆕 Live-bookings (founder 2026-05-01): StatusPill flips to 'busy' with
//    a 'Available from HH:mm' subtitle whenever there's an ongoing
//    booking; updates real-time via Firestore onSnapshot.
import {
  useTherapistBookings,
  findActiveBooking,
  findNextBooking,
  nextAvailableHHMM,
} from "@/utils/useTherapistBookings";
// 🆕 Round 28b9 — BKK formatter for upcoming booking hint.
import { fmtBKK } from "@/utils/time";
// 🆕 Round 28aq — drive StatusPill from the engine instead of the
//   unset `therapist.online` field on the EMPTY shell.
import { calculateTherapistStatus } from "@/utils/calculateTherapistStatus";
// 🆕 Round 28b35 (founder 2026-05-04) — Live Firestore overlay so the
//   status engine sees admin's Holiday toggle / busyUntil edits in
//   real time, not just whatever was baked into data/therapists.ts.
import { useTherapistLiveStatus } from "@/hooks/useTherapistLiveStatus";

// 🆕 Round 28ae — live therapist reviews from bookings collection.
import { useTherapistReviews } from "@/hooks/useTherapistReviews";
// 🆕 Round 28af — live booking aggregates for the Loyalty tab.
import { useTherapistBookingStats } from "@/hooks/useTherapistBookingStats";

import { useDocumentMeta, langToLocale } from "@/utils/useDocumentMeta";
import therapistsData from "@/data/therapists";
import type { Therapist } from "@/types/therapist";
import { enhanceImage } from "@/utils/cloudinary";

const SERIF = '"Fraunces", Georgia, "Times New Roman", serif';
const SANS = '"Inter", system-ui, -apple-system, sans-serif';

// Demo data shaped exactly to mockup Phone B. Keyed by `:id` so each card
// in the Browse grid lands on its own profile. Unknown ids fall back to Mai.
// TODO (Task 7 / data wiring): replace with `therapistsData` lookup +
// Firestore live status overrides.
type DemoTherapist = {
  id: string;
  name: string;
  age: number;
  area: string;
  distance: string;
  online: boolean;
  photoBg: string;
  /** Cloudinary-enhanced gallery URLs. First entry = cover photo. */
  images?: string[];
  rating: string;
  reviewCount: number;
  yearsExp: number;
  /** Lifetime completed sessions across all services — drives StatsCard /
   *  InfoSheet "💆 Sessions" cell. Round 28ad: real value from data, not
   *  a hacky regex-parsed sum from spec strings. */
  totalSessions: number;
  rebookRate: string;
  about: string;
  /** Round 28ak — structured facts for the About chip grid. */
  aboutFacts: AboutFact[];
  /** Round 28b3 — row-grouped facts (3 rows: work / body / origin). */
  aboutRows: AboutRow[];
  /** Round 28b4 — drives gender icon next to the About title. */
  gender?: string;
  creds: { icon: React.ReactNode; label: string; meta: string }[];
  specs: { icon: React.ReactNode; name: string; yrs: string }[];
  langs: { flag: string; name: string; level: string }[];
  pricing: { name: string; duration: string; price: string }[];
  days: { dow: string; num: string; unavailable?: boolean }[];
  slots: { time: string; taken?: boolean }[];
  reviewBuckets: { num: number; count: number; pct: number }[];
  reviews: {
    initial: string;
    name: string;
    flag: string;
    meta: string;
    quote: string;
  }[];
};

// 🆕 Round 28ai — neutral fallback shell. Replaces the old MAI mock
// that injected fake credentials, sessions, ratings, and reviews into
// every render path. This shell only carries STRUCTURAL defaults
// (gradient, working hours placeholder) — zero numerical claims.
//
// Fields are deliberately blank/0:
//   • rating "0.0" + reviewCount 0  → UI shows "New" badge instead
//   • totalSessions 0, rebookRate "—"
//   • creds [] / specs [] / reviews [] / reviewBuckets []
//   • langs [] (real ones come from data.languageSkills)
//
// Only used when the URL therapist id matches NEITHER a record in
// data/therapists.ts NOR an Auth uid in Firestore. In that case the
// page renders a clean "Therapist not found" experience downstream.
const EMPTY_THERAPIST: DemoTherapist = {
  id: "_empty",
  name: "—",
  age: 0,
  area: "",
  distance: "",
  online: false,
  photoBg: "linear-gradient(135deg, #d4a574, #8b6f47)",

  rating: "0.0",
  reviewCount: 0,
  yearsExp: 0,
  totalSessions: 0,
  rebookRate: "—",

  about: "",
  aboutFacts: [],
  aboutRows: [],

  creds: [],
  specs: [],
  langs: [],
  pricing: [],

  days: [],
  slots: [],

  reviewBuckets: [],
  reviews: [],
};

// Legacy demo URLs (/therapists/mai etc.) — keep an empty map so the
// 3-tier lookup chain still type-checks, but tap-throughs from any
// stale link will resolve to EMPTY_THERAPIST. Real therapists live in
// data/therapists.ts.
const DEMO_BY_ID: Record<string, DemoTherapist> = {};

// Backwards-compatible alias — buildFromReal still references "MAI" as
// the structural fallback. Pointing at the empty shell ensures no fake
// stats leak through any spread.
const MAI = EMPTY_THERAPIST;

// stable per-id gradient (mirrors useTherapists.gradientForId)
function gradientForId(id: string): string {
  const palette: [string, string][] = [
    ["#d4a574", "#8b6f47"],
    ["#e8c4a0", "#c89968"],
    ["#c89c7a", "#6b4a2f"],
    ["#f4d4b4", "#d4a574"],
    ["#d8b89c", "#a08060"],
    ["#e8d0b4", "#b89878"],
    ["#dabd9a", "#aa8866"],
    ["#e0c8a0", "#b08858"],
  ];
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  const [a, b] = palette[Math.abs(hash) % palette.length];
  return `linear-gradient(135deg, ${a}, ${b})`;
}

// Service id => punchy display label for the Specialties section.
// Falls back to the static service's `name` when the id isn't mapped.
//
// Round 28am — icon mixes warm emoji (cultural / friendly services)
// with sharp MUI icons for premium offerings:
//   • Premium hero: ✨ → AutoAwesome (sparkle, gold tone)
//   • Masculine: 💪 → FitnessCenter (clean, gym-like)
//   • Deep tissue: 🔥 → Whatshot (avoid clash with "Today 🔥" badge)
// 🆕 Round 28b3 — every emoji icon replaced with a proper MUI icon
//   (founder rule: no emoji site-wide). Specialty cards now render
//   tinted MUI icons rather than mixed emoji/icons.
// 🆕 Round 28b18 — keyed by NEW SKU codes. Legacy slug keys kept as
//   aliases so any historical booking that still carries the old id
//   continues to render its specialty icon.
const SERVICE_DISPLAY: Record<
  string,
  { icon: React.ReactNode; short: string }
> = {
  // ── Current SKU codes ──
  "xSR-Thai": {
    icon: <SpaRoundedIcon sx={{ fontSize: 18, color: "#16a34a" }} />,
    short: "Thai Traditional",
  },
  "SR-Aroma": {
    icon: <LocalFloristRoundedIcon sx={{ fontSize: 18, color: "#FE7A52" }} />,
    short: "Aromatherapy",
  },
  "SR-HJ2200": {
    icon: <FitnessCenterRoundedIcon sx={{ fontSize: 18, color: "#3c1e14" }} />,
    short: "Gentleman's Signature",
  },
  "SR-B2B3200": {
    icon: <AutoAwesomeRoundedIcon sx={{ fontSize: 18, color: "#FE0944" }} />,
    short: "SunRed Therapeutic",
  },

  // ── Legacy slug aliases (for historical bookings) ──
  "thai-massage": {
    icon: <SpaRoundedIcon sx={{ fontSize: 18, color: "#16a34a" }} />,
    short: "Thai Traditional",
  },
  aromatherapy: {
    icon: <LocalFloristRoundedIcon sx={{ fontSize: 18, color: "#FE7A52" }} />,
    short: "Aromatherapy",
  },
  "oil-massage": {
    icon: <SelfImprovementRoundedIcon sx={{ fontSize: 18, color: "#0284C7" }} />,
    short: "Oil Relaxation",
  },
  "gentlemans-recovery": {
    icon: <FitnessCenterRoundedIcon sx={{ fontSize: 18, color: "#3c1e14" }} />,
    short: "Gentleman's Signature",
  },
  "sunred-signature": {
    icon: <AutoAwesomeRoundedIcon sx={{ fontSize: 18, color: "#FE0944" }} />,
    short: "SunRed Therapeutic",
  },
  "sport-massage": {
    icon: <DirectionsRunRoundedIcon sx={{ fontSize: 18, color: "#16a34a" }} />,
    short: "Sport Recovery",
  },
  "deep-tissue": {
    icon: <WhatshotRoundedIcon sx={{ fontSize: 18, color: "#FE7A52" }} />,
    short: "Deep Tissue",
  },
  "prenatal-massage": {
    icon: <PregnantWomanRoundedIcon sx={{ fontSize: 18, color: "#FE7A52" }} />,
    short: "Pre-natal",
  },
  "foot-massage": {
    icon: <EmojiNatureRoundedIcon sx={{ fontSize: 18, color: "#16a34a" }} />,
    short: "Foot Massage",
  },
  "head-massage": {
    icon: <PsychologyRoundedIcon sx={{ fontSize: 18, color: "#0284C7" }} />,
    short: "Head Massage",
  },
  "hot-stone": {
    icon: <LandscapeRoundedIcon sx={{ fontSize: 18, color: "#B45309" }} />,
    short: "Hot Stone",
  },
};

// Parse "Thai / English, Mandarin" => language pills.
// Position-based level: first=Native, second=Fluent, rest=Conversational.
function parseLanguages(
  raw: string
): { flag: string; name: string; level: string }[] {
  const map: Record<string, { flag: string; name: string }> = {
    english: { flag: "🇬🇧", name: "English" },
    en: { flag: "🇬🇧", name: "English" },
    thai: { flag: "🇹🇭", name: "Thai" },
    th: { flag: "🇹🇭", name: "Thai" },
    chinese: { flag: "🇨🇳", name: "Mandarin" },
    mandarin: { flag: "🇨🇳", name: "Mandarin" },
    cantonese: { flag: "🇨🇳", name: "Cantonese" },
    zh: { flag: "🇨🇳", name: "Mandarin" },
    japanese: { flag: "🇯🇵", name: "Japanese" },
    ja: { flag: "🇯🇵", name: "Japanese" },
    korean: { flag: "🇰🇷", name: "Korean" },
    ko: { flag: "🇰🇷", name: "Korean" },
  };
  const tokens = raw
    .split(/[,/\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const seen = new Set<string>();
  const out: { flag: string; name: string; level: string }[] = [];
  tokens.forEach((tok, idx) => {
    const k = tok.toLowerCase();
    const hit = map[k] ?? { flag: "🌐", name: tok };
    if (seen.has(hit.name)) return;
    seen.add(hit.name);
    const level =
      idx === 0 ? "Native" : idx === 1 ? "Fluent" : "Conversational";
    out.push({ ...hit, level });
  });
  return out.slice(0, 5);
}

// Helper: ISO 639-1 code -> display flag + name.
const LANG_DISPLAY: Record<string, { flag: string; name: string }> = {
  en: { flag: "🇬🇧", name: "English" },
  th: { flag: "🇹🇭", name: "Thai" },
  zh: { flag: "🇨🇳", name: "Mandarin" },
  ja: { flag: "🇯🇵", name: "Japanese" },
  ko: { flag: "🇰🇷", name: "Korean" },
};

// Build a DemoTherapist shape from a real Therapist record.
// Round 28z: prefers the new structured fields (credentials, serviceExperience,
// languageSkills, area, rebookRate, totalSessions) added to data/therapists.ts.
// Falls back to derivation from features.* for older records.
function buildFromReal(real: Therapist): DemoTherapist {
  const ageStr = real.features.age ?? "";
  const ageNum = ageStr ? parseInt(ageStr, 10) || 28 : 28;

  // Cloudinary-enhanced gallery: cover first, then dedup gallery.
  const rawImages: string[] = [];
  if (real.image) rawImages.push(real.image);
  if (real.gallery.length > 0) {
    for (const g of real.gallery) {
      if (g && !rawImages.includes(g)) rawImages.push(g);
    }
  }
  const images = rawImages.map((url) =>
    enhanceImage(url, { variant: "hero" })
  );
  const photoBg = images.length > 0
    ? `center / cover no-repeat url("${images[0]}")`
    : gradientForId(real.id);

  // 🆕 Round 28ai — Specialties: list service icons + names ONLY.
  //    No "X yrs · Y+ sessions" subtext (those were fake hardcoded
  //    counts removed in Strategy B). When `serviceExperience` is set
  //    by admin in the future (with verified counts), we'll opt back
  //    in. For now, just render the service catalog.
  const serviceIds =
    ((real.servicesAvailable ?? real.services ?? []) as string[]) || [];
  const realSpecs: DemoTherapist["specs"] = serviceIds
    .map((sid) => {
      const display = SERVICE_DISPLAY[sid];
      return {
        icon: display?.icon ?? (
          <AutoAwesomeRoundedIcon sx={{ fontSize: 18, color: "#FE0944" }} />
        ),
        name: display?.short ?? sid,
        yrs: "", // empty → UI hides subtext line
      };
    })
    .filter((s, i, arr) => arr.findIndex((x) => x.name === s.name) === i);

  // Languages — prefer structured `languageSkills`; fall back to parsing
  // the free-form `features.language` string for legacy records.
  let realLangs: DemoTherapist["langs"];
  if (real.languageSkills && real.languageSkills.length > 0) {
    realLangs = real.languageSkills.map((l) => {
      const d = LANG_DISPLAY[l.code.toLowerCase()];
      return {
        flag: d?.flag ?? "🌐",
        name: d?.name ?? l.code.toUpperCase(),
        level: l.level,
      };
    });
  } else {
    realLangs = parseLanguages(real.features.language ?? "");
  }

  // 🆕 Round 28ai — Credentials: ONLY render when admin has verified
  //    them (structured `credentials` array on the therapist record).
  //    No MAI mock fallback — empty array → UI hides the section.
  //    Strategy B: trust badges only when real.
  // 🆕 Round 28b3 — emoji glyphs replaced with proper MUI icons.
  const realCreds: DemoTherapist["creds"] =
    real.credentials && real.credentials.length > 0
      ? real.credentials.map((c) => ({
          icon:
            c.type === "license" ? (
              <VerifiedRoundedIcon />
            ) : c.type === "diploma" ? (
              <SchoolRoundedIcon />
            ) : c.type === "background" ? (
              <ShieldRoundedIcon />
            ) : (
              <AutoAwesomeRoundedIcon />
            ),
          label: c.label,
          meta: c.meta,
        }))
      : [];

  // 🆕 Round 28b3 (founder 2026-05-03) — About card moved from
  //   chip-per-fact to ROW-PER-CATEGORY. Three semantic rows:
  //     1. Work — employment type · working hours
  //     2. Body — gender · height · body type · bust · skin tone
  //     3. Origin — ethnicity · languages
  //   `aboutFacts` (legacy) kept in sync for the InfoSheet/Tabs tab
  //   that still consumes the chip API; can be removed after that
  //   surface migrates too.
  const aboutBits: string[] = [];
  const aboutFacts: AboutFact[] = [];
  const f = real.features;

  // Languages text — prefer structured codes, fall back to free-form
  const langText =
    real.languageSkills && real.languageSkills.length > 0
      ? real.languageSkills
          .map(
            (l) => LANG_DISPLAY[l.code.toLowerCase()]?.name ?? l.code.toUpperCase()
          )
          .join(" · ")
      : (f.language ?? "");

  const hoursText =
    real.startTime && real.endTime ? `${real.startTime} – ${real.endTime}` : "";

  // Build new row structure
  const aboutRows: AboutRow[] = [
    {
      icon: <WorkOutlineRoundedIcon />,
      tone: "work",
      parts: [f.employmentType ?? null, hoursText || null],
    },
    {
      icon: <WcRoundedIcon />,
      tone: "body",
      parts: [
        f.gender ?? null,
        f.height ?? null,
        f.bodyType ? `${f.bodyType} build` : null,
        f.bustSize ? `Bust ${f.bustSize}` : null,
        f.skintone ?? null,
      ],
    },
    {
      icon: <PublicRoundedIcon />,
      tone: "ethnicity",
      parts: [f.ethnicity ? `${f.ethnicity} therapist` : null, langText || null],
    },
  ];

  // Legacy chip + bits sync — keeps InfoSheet/Tabs working unchanged.
  if (f.employmentType) {
    aboutBits.push(f.employmentType);
    aboutFacts.push({
      icon: <WorkOutlineRoundedIcon />,
      text: f.employmentType,
      tone: "work",
    });
  }
  if (f.ethnicity) {
    aboutBits.push(`${f.ethnicity} therapist`);
    aboutFacts.push({
      icon: <PublicRoundedIcon />,
      text: `${f.ethnicity} therapist`,
      tone: "ethnicity",
    });
  }
  const bodyChipParts: string[] = [];
  if (f.height) bodyChipParts.push(f.height);
  if (f.bodyType) bodyChipParts.push(`${f.bodyType} build`);
  if (bodyChipParts.length > 0) {
    aboutBits.push(...bodyChipParts);
    aboutFacts.push({
      icon: <StraightenRoundedIcon />,
      text: bodyChipParts.join(" · "),
      tone: "body",
    });
  }
  if (langText) {
    aboutBits.push(`Speaks ${langText}`);
    aboutFacts.push({
      icon: <TranslateRoundedIcon />,
      text: langText,
      tone: "language",
    });
  }
  if (hoursText) {
    aboutBits.push(`Working hours ${hoursText}`);
    aboutFacts.push({
      icon: <ScheduleRoundedIcon />,
      text: hoursText,
      tone: "hours",
    });
  }
  const aboutDerived = aboutBits.join(" · ");

  // 🆕 Round 28ai — review aggregates start at 0/[]; live data layer
  //    (useTherapistReviews) overlays real values on top of this shape.
  const realReviewCount = real.reviews ?? 0;

  return {
    ...MAI, // pure structural shell — no fake numbers leak through
    id: real.id,
    name: real.name,
    age: ageNum,
    photoBg,
    images,
    // Rating: 0 by default; StatsCard will Bayesian-recompute from
    // live reviews when present, else show "New" badge.
    rating: (Number(real.rating) || 0).toFixed(1),
    reviewCount: realReviewCount,
    yearsExp: typeof real.experience === "number" ? real.experience : 0,
    area: real.area ?? "",
    rebookRate:
      typeof real.rebookRate === "number" ? `${real.rebookRate}%` : "—",
    totalSessions:
      typeof real.totalSessions === "number" ? real.totalSessions : 0,
    specs: realSpecs,
    langs: realLangs,
    creds: realCreds,
    reviewBuckets: [],
    reviews: [],
    about: aboutDerived,
    aboutFacts,
    aboutRows,
    gender: real.features.gender,
  };
}

const TherapistDetailPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();

  // 🆕 Round 28ae — live reviews from bookings/{id} where reviewText != "".
  //   Same source as ReviewListPage — keeps detail-page sheet and the
  //   full review list in lock-step. Subscribes when id is present.
  const liveReviews = useTherapistReviews(id ?? null);

  // 🆕 Round 28af — live booking aggregates for the Loyalty tab.
  const loyaltyStats = useTherapistBookingStats(id ?? null);

  // 🔌 3-tier lookup chain:
  //   1. therapistsData[id] (real Yuri/Jimmy/Hami/...)
  //   2. DEMO_BY_ID[id] (mai/ploy/nan/fern/wan/aom)
  //   3. MAI as last-resort fallback.
  let therapist: DemoTherapist = MAI;
  if (id) {
    const real = therapistsData.find((tt) => tt.id === id);
    if (real) {
      therapist = buildFromReal(real);
    } else if (DEMO_BY_ID[id]) {
      therapist = DEMO_BY_ID[id];
    }
  }

  // 🆕 Round 28ae — overlay live Firestore reviews on top of the static
  //   shape so the InfoSheet always reads the source-of-truth. When zero
  //   reviews exist live, fall back to whatever buildFromReal produced
  //   (which is empty arrays for fresh therapists, MAI demo for the
  //   placeholder demo path).
  // 🆕 Round 28aj — overlay live loyalty aggregates onto totalSessions
  //   and rebookRate so StatsCard + TrustHero show real numbers.
  if (loyaltyStats.totalCompleted > 0) {
    therapist = {
      ...therapist,
      totalSessions: loyaltyStats.totalCompleted,
      rebookRate:
        loyaltyStats.uniqueCustomers >= 1
          ? `${loyaltyStats.repeatPct}%`
          : therapist.rebookRate,
    };
  }

  if (liveReviews.reviewCount > 0) {
    therapist = {
      ...therapist,
      reviewCount: liveReviews.reviewCount,
      reviewBuckets: liveReviews.buckets.map((b) => ({
        num: b.stars,
        count: b.count,
        pct: b.pct,
      })),
      reviews: liveReviews.reviews.map((r) => ({
        // Keep DemoTherapist shape so existing renderers don't break.
        // InfoSheet's ReviewsTab gets the privacy-safe shape via the
        // separate `reviews` prop wired below.
        initial: "•",
        name: `Booking #${r.bookingId.slice(0, 8).toUpperCase()}`,
        flag: "",
        meta: `${r.ago} · ${r.service}`,
        quote: r.body,
      })),
    };
  }

  useDocumentMeta({
    title: t("meta.detail.title", "{{name}} · SUNRED Bangkok", {
      name: therapist.name,
    }),
    description: t(
      "meta.detail.description",
      "{{name}} — verified massage therapist in Bangkok. {{rating}}★ ({{count}} reviews). Book in seconds.",
      { name: therapist.name, rating: therapist.rating, count: therapist.reviewCount }
    ),
    locale: langToLocale(i18n.language),
    url: `https://sunred.vip/therapists/${id ?? therapist.id}`,
    type: "profile",
  });

  // 🆕 Phase 4 — Inline picker state. The user picks service+duration+
  //    date+time on this page; StickyBookCTA forwards everything to
  //    /booking/:id via URL params and the booking flow opens directly
  //    at "Where should we go?".
  const [selection, setSelection] = useState<{
    serviceId: string | null;
    duration: number | null;
    date: string | null;
    time: string | null;
  }>({
    serviceId: null,
    duration: null,
    date: null,
    time: null,
  });

  // 🆕 Phase 4 — Stats cells now open this sheet (Reviews tab from the
  //    rating cell, Profile tab from years/rebook cells). Lets us drop
  //    the always-visible TherapistProfileTabs section to save space.
  const [infoSheet, setInfoSheet] = useState<
    "profile" | "reviews" | "loyalty" | null
  >(null);

  // 🆕 Round 28aq — drive StatusPill from the REAL availability engine
  //   (calculateTherapistStatus) instead of the unset `therapist.online`
  //   field. The previous logic always read `online: false` from the
  //   EMPTY_THERAPIST shell, so every therapist appeared "Off duty"
  //   regardless of their actual shift / live booking state.
  const liveBookings = useTherapistBookings(therapist.id);
  const activeBooking = findActiveBooking(liveBookings);
  // 🆕 Round 28b9 — when therapist is currently free but has a future
  //   session on the schedule, surface the next start time so the
  //   StatusPill / DetailHero / cards all read consistently with the
  //   booking time picker (which already shows "TAKEN" slots).
  const upcomingBooking = findNextBooking(liveBookings);
  const nextBookingAt = upcomingBooking
    ? fmtBKK(upcomingBooking.startAt, "HH:mm A", "")
    : null;

  // 🆕 Round 28b35 — Live Firestore overlay. Admin's Holiday toggle +
  //   manual override + busyUntil edits stream in real-time and merge
  //   on top of the static record. Without this overlay, the engine
  //   was reading ONLY data/therapists.ts which is build-time and
  //   never reflects admin actions → customers booked therapists who
  //   were marked Holiday in the admin panel.
  const liveStatus = useTherapistLiveStatus(therapist.id);
  // Resolve the underlying real Therapist record so the engine can
  // read shift / override / busy fields straight from data file.
  const realRecord = therapistsData.find((tt) => tt.id === therapist.id);
  const mergedRecord = realRecord
    ? {
        ...realRecord,
        // Overlay live status fields. Spread `liveStatus` LAST so live
        // values win over stale static defaults.
        ...(liveStatus.exists
          ? {
              isHoliday: liveStatus.isHoliday ?? realRecord.isHoliday,
              statusOverride:
                liveStatus.statusOverride ?? realRecord.statusOverride,
              activeBooking:
                liveStatus.activeBooking ?? realRecord.activeBooking,
              busyUntil: liveStatus.busyUntil ?? realRecord.busyUntil,
              startTime: liveStatus.startTime ?? realRecord.startTime,
              endTime: liveStatus.endTime ?? realRecord.endTime,
            }
          : {}),
      }
    : null;
  const engineStatus = mergedRecord
    ? calculateTherapistStatus(mergedRecord).status
    : "resting";

  const livePillStatus: "online" | "busy" | "offline" =
    engineStatus === "resting"
      ? "offline"
      : engineStatus === "bookable" || activeBooking
        ? "busy"
        : "online";

  // 🆕 Round 28ap — surface the next-available HH:mm for ALL states:
  //   • busy   → end of current booking (from live data)
  //              fallback to engine's nextAvailable (e.g. busyUntil)
  //   • offline→ start of therapist's next shift
  //   • online → null (already available)
  const engineNext = mergedRecord
    ? calculateTherapistStatus(mergedRecord).nextAvailable
    : null;
  const liveNextAvailable =
    livePillStatus === "busy"
      ? (activeBooking ? nextAvailableHHMM(liveBookings) : engineNext)
      : livePillStatus === "offline"
        ? (engineNext ?? realRecord?.startTime ?? null)
        : null;

  // 🆕 Phase 5 — Auto-navigate to /booking/:id once all four prerequisites
  //    (service, duration, date, time) are confirmed. Founder request
  //    'เลือกเสร็จ ก็ไปหน้า Confirm Order' — skips the manual sticky CTA tap.
  //    Phase 5B: triggered once from the merged ServiceDurationSheet's
  //    Confirm button (which guarantees all four are set).
  const goConfirmOrder = (
    serviceId: string,
    duration: number,
    date: string,
    time: string
  ) => {
    const params = new URLSearchParams();
    params.set("service", serviceId);
    params.set("duration", String(duration));
    params.set("date", date);
    params.set("time", time);
    void navigate(`/booking/${therapist.id}?${params.toString()}`);
  };

  return (
    <Box
      sx={{
        // .phone — Round 28b1 Clean v3 cool-neutral
        maxWidth: "430px",
        margin: "0 auto",
        background: "linear-gradient(180deg, #FAFBFC 0%, #F1F3F5 100%)",
        borderRadius: "28px",
        overflow: "hidden",
        boxShadow: "0 20px 60px rgba(15, 23, 42, 0.08)",
        position: "relative",
        minHeight: "100vh",
      }}
    >
      <DetailHero
        name={therapist.name}
        age={therapist.age}
        area={therapist.area}
        distance={therapist.distance}
        // 🆕 Round 28aq — pass full 3-state status from the real engine
        //   so the hero dot/label reads "Online" (green) / "Busy" (orange)
        //   / "Offline" (gray) consistently with the StatusPill below.
        online={livePillStatus}
        photoBg={therapist.photoBg}
        images={therapist.images}
      />

      <StatsCard
        // ⭐ Round 28ak — Bayesian-adjusted rating from REAL review list.
        //    Previous implementation used `therapist.rating × count` as
        //    "sum" — but therapist.rating is the SEED (0 for fresh
        //    records), so a therapist with 30 real reviews would show
        //    1.1★ instead of their actual average. Now we feed the live
        //    review list straight into bayesianRating() which sums the
        //    real per-review ratings.
        rating={
          liveReviews.reviewCount > 0
            ? formatRating(bayesianRating(liveReviews.reviews))
            : therapist.rating
        }
        reviewCount={therapist.reviewCount}
        yearsExp={therapist.yearsExp}
        totalSessions={therapist.totalSessions}
        rebookRate={therapist.rebookRate}
        // Tap-to-open info sheet — saves vertical space on the detail page
        onTapRating={() => setInfoSheet("reviews")}
        onTapProfile={() => setInfoSheet("profile")}
        onTapLoyalty={() => setInfoSheet("loyalty")}
      />

      {/* 🆕 Round 28b5 — Gallery is now embedded INSIDE the About
          card (founder spec: "เอา Gallery ไปไว้ใน sheet เดียวกันกับ
          About card collapsible"). Tapping About expands Row 2 +
          Row 3 + 3-col gallery grid all at once. The standalone
          GalleryTile section is no longer rendered. */}
      <About
        name={therapist.name}
        rows={therapist.aboutRows}
        facts={therapist.aboutFacts}
        body={therapist.about}
        gender={therapist.gender}
        images={therapist.images}
        galleryAltBase={`${therapist.name} photo`}
        enhance={(url, mode) =>
          enhanceImage(url, { variant: mode === "thumb" ? "card" : "hero" })
        }
      />

      {/* Phase 5 — Live availability pill driven by Firestore bookings.
          offline = therapist marked off-shift in profile data
          busy    = there's a booking covering 'now' (show end time)
          online  = otherwise (free right now)
          The 'Next available' time is the active booking's endAt, so as
          soon as someone confirms a booking the label updates everywhere
          via the onSnapshot subscription. */}
      <Box sx={{ marginTop: "4px" }}>
        <StatusPill
          nextBookingAt={
            livePillStatus === "online" ? nextBookingAt : null
          }
          status={livePillStatus}
          nextAvailable={liveNextAvailable}
        />
      </Box>

      <PickerSection
        title={
          <>
            What kind of <em>session</em>?
          </>
        }
        subtitle={t(
          "detail.picker.serviceSubtitle",
          "Select your service, duration, date and time — all in one step."
        )}
      >
        <Typography
          sx={{
            fontFamily: SERIF,
            fontSize: "16px",
            fontWeight: 600,
            color: "#3c1e14",
            marginBottom: "10px",
          }}
        >
          {t("detail.picker.serviceLabel", "Service")}
        </Typography>

        <StepService
          value={selection.serviceId}
          selectedDuration={selection.duration}
          selectedDate={selection.date}
          selectedTime={selection.time}
          therapistId={therapist.id}
          onConfirm={(serviceId, duration, date, time) => {
            // Persist locally so the detail card reflects the picked tier
            // (the radio shows '90m', etc.), then navigate to confirm order.
            setSelection({ serviceId, duration, date, time });
            goConfirmOrder(serviceId, duration, date, time);
          }}
        />

        <Typography
  sx={{
    fontFamily: SANS,
    fontSize: "12px",
    color: "rgba(60, 30, 20, 0.5)",
    textAlign: "center",
    marginTop: "14px",
    lineHeight: 1.5,
    whiteSpace: "pre-line", // รองรับการขึ้นบรรทัดใหม่
  }}
>
  {t(
    "detail.picker.serviceHint",
    "Didn't find your preferred service? \n Contact us for more personalized options."
  )}
</Typography>
      </PickerSection>

      {/* (Reviews moved into TherapistProfileTabs as Tab 2.) */}

      {/* Phase 5 — StickyBookCTA removed (founder feedback 2026-05-01).
          Auto-navigate in goConfirmOrder() forwards the user to
          /booking/:id as soon as the merged sheet's Confirm fires, so the
          manual sticky 'Continue with X' bar was redundant. The
          component file is kept around in case we need a manual confirm
          fallback later. */}

      {/* Phase 4 — Therapist info sheet (Verified Profile / Reviews).
          Opened from StatsCard's tappable cells; closed by backdrop tap,
          drag, or the close button in the sheet header. */}
      <TherapistInfoSheet
        open={infoSheet !== null}
        onClose={() => setInfoSheet(null)}
        // Round 28ah — 'loyalty' is now a real tab. Forward whichever
        // cell the user tapped on; default to 'profile' on null/unknown.
        initialTab={
          infoSheet === "reviews"
            ? "reviews"
            : infoSheet === "loyalty"
            ? "loyalty"
            : "profile"
        }
        data={{
          yearsExp: therapist.yearsExp,
          totalSessions: therapist.totalSessions,
          // 🆕 Round 28aj — live "today" count surfaces as a momentum
          //   signal in the InfoSheet TrustHero strip.
          todayBookings: loyaltyStats.todayBookings,
          rebookRate: therapist.rebookRate,
          hasLicense: therapist.creds.some((c) =>
            /licen[cs]e|ผ\.พ\./i.test(c.label)
          ),
          creds: therapist.creds.map((c) => ({
            icon: c.icon,
            title: c.label,
            sub: c.meta,
          })),
          specs: therapist.specs.map((s) => ({
            icon: s.icon,
            name: s.name,
            sub: s.yrs,
          })),
          langs: therapist.langs,
          rating: therapist.rating,
          reviewCount: therapist.reviewCount,
          // 🆕 Round 28ae — when live reviews exist, ship those directly
          //   so we never invent a fake rating/booking id. Otherwise pass
          //   empty arrays — InfoSheet renders the "No reviews yet" state.
          reviewBuckets:
            liveReviews.reviewCount > 0
              ? liveReviews.buckets.map((b) => ({
                  stars: b.stars,
                  pct: b.pct,
                  count: b.count,
                }))
              : [],
          reviews:
            liveReviews.reviewCount > 0
              ? liveReviews.reviews.map((r) => ({
                  bookingId: r.bookingId,
                  rating: r.rating,
                  service: r.service,
                  body: r.body,
                  ago: r.ago,
                  verified: r.verified,
                }))
              : [],
          // 🆕 Round 28af — pipe live booking aggregates through. The
          //   Loyalty tab uses real values when uniqueCustomers ≥ 3,
          //   otherwise falls back to synthetic estimates from rebookRate.
          loyaltyStats: {
            totalCompleted: loyaltyStats.totalCompleted,
            uniqueCustomers: loyaltyStats.uniqueCustomers,
            repeatCustomers: loyaltyStats.repeatCustomers,
            repeatPct: loyaltyStats.repeatPct,
            avgSessions: loyaltyStats.avgSessions,
            timingBuckets: loyaltyStats.timingBuckets,
          },
        }}
      />
    </Box>
  );
};

// ─── Picker section wrapper — matches dSection style of legacy sections ───
const PickerSection: React.FC<{
  title: React.ReactNode;
  subtitle?: string;
  muted?: boolean;
  children: React.ReactNode;
}> = ({ title, subtitle, muted, children }) => (
  <Box
    sx={{
      padding: "20px",
      borderTop: "1px solid rgba(184, 92, 60, 0.12)",
      opacity: muted ? 0.55 : 1,
      transition: "opacity 0.2s ease",
    }}
  >
    <Typography
      component="h3"
      sx={{
        fontFamily: SERIF,
        fontSize: "22px",
        fontWeight: 500,
        color: "#2a1a14",
        letterSpacing: "-0.02em",
        marginBottom: subtitle ? "4px" : "16px",
        "& em": {
          fontStyle: "italic",
          color: "#FE0944",
          fontWeight: 500,
        },
      }}
    >
      {title}
    </Typography>
    {subtitle && (
      <Typography
        sx={{
          fontFamily: SANS,
          fontSize: "12px",
          color: "rgba(60, 30, 20, 0.6)",
          marginBottom: "16px",
        }}
      >
        {subtitle}
      </Typography>
    )}
    {children}
  </Box>
);

export default TherapistDetailPage;
