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

import React, { useState, useMemo } from "react";
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
// Round 28s34 — Legacy-slug icons (Whatshot / SelfImprovement /
// DirectionsRun / PregnantWoman / EmojiNature / Psychology /
// Landscape) dropped along with the legacy entries in SERVICE_DISPLAY.
import SpaRoundedIcon from "@mui/icons-material/SpaRounded";
import LocalFloristRoundedIcon from "@mui/icons-material/LocalFloristRounded";
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
  useTherapistBookingFeed,
  findActiveBooking,
  findNextBooking,
  nextAvailableHHMM,
} from "@/utils/useTherapistBookings";
// 🆕 Round 28b9 — BKK formatter for upcoming booking hint.
import { fmtBKK, prettyHHMM } from "@/utils/time";
// 🆕 Round 28aq — drive StatusPill from the engine instead of the
//   unset `therapist.online` field on the EMPTY shell.
import { calculateTherapistStatus } from "@/utils/calculateTherapistStatus";
// 🆕 Round 28b35 (founder 2026-05-04) — Live Firestore overlay so the
//   status engine sees admin's Holiday toggle / busyUntil edits in
//   real time, not just whatever was baked into data/therapists.ts.
import { useTherapistLiveStatus } from "@/hooks/useTherapistLiveStatus";

// 🆕 Round 28ae — live therapist reviews from bookings collection.
import { useTherapistReviews } from "@/hooks/useTherapistReviews";
// Round 28s55 — loyalty stats now come from useTherapistBookingFeed
// (shared bookings listener); the standalone useTherapistBookingStats
// hook is no longer imported here.

import { useDocumentMeta, langToLocale } from "@/utils/useDocumentMeta";
import therapistsData from "@/data/therapists";
import type { Therapist } from "@/types/therapist";
import { enhanceImage } from "@/utils/cloudinary";
// Round 28s53 — real GPS distance. The DetailHero "Allow location"
// prompt now triggers an actual geolocation request and the
// resolved coordinates produce a haversine distance to the
// practitioner's standby point.
import { useUserLocation } from "@/hooks/useUserLocation";
import { haversineKm } from "@/utils/taxiFare";
import { formatDistanceEta } from "@/utils/formatDistanceEta";

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


// Round 28s34 — EMPTY_THERAPIST + DEMO_BY_ID + MAI alias removed.
// The demo lookup chain hasn't carried real data since Round 28r;
// unknown :id values now render the explicit 404 below instead of
// silently masking as a placeholder profile.

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


// Round 28s34 — SERVICE_DISPLAY trimmed to the 4 current SKUs.
// Legacy slug aliases (`thai-massage`, `aromatherapy`, `oil-massage`,
// etc.) covered Round-28b18-and-earlier bookings that hadn't been
// migrated; historical bookings now resolve through
// `resolveServiceId` in `utils/serviceCatalog`, so this dictionary
// only needs the live SKUs. Saves ~8 unused icon imports.
const SERVICE_DISPLAY: Record<
  string,
  { icon: React.ReactNode; short: string }
> = {
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
    ((real.servicesAvailable ?? real.services ?? [])) || [];
  const realSpecs: DemoTherapist["specs"] = serviceIds
    .map((sid) => {
      // Round 28s54 — SERVICE_DISPLAY was trimmed to 4 SKUs in 28s34;
      // a therapist carrying a legacy slug or unknown id would have
      // crashed here (`display.icon` on undefined). Optional-chain +
      // fallback so unmapped ids render a generic icon + the raw id.
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
      // Round 28s54 — optional-chain: unmapped language codes
      // (e.g. a new ISO code) no longer crash on `d.flag`.
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

  // Round 28s51 (founder "ข้อมูล จริง ของ พนักงานทั้งหมด") —
  // Every SunRed practitioner passes the same two onboarding
  // checks before being listed (CLAUDE.md §3: "100% Thai female
  // practitioners ... verified"). Those two universal credentials
  // now render by default so every profile shows the same trust
  // baseline; admin-verified `real.credentials` entries override
  // the defaults when present.
  const universalCreds: DemoTherapist["creds"] = [
    {
      icon: <ShieldRoundedIcon />,
      label: "Background-checked by SunRed",
      meta: "ID + clearance verified at onboarding",
    },
    {
      icon: <AutoAwesomeRoundedIcon />,
      label: "SunRed onboarded therapist",
      meta: "Code of conduct + service standards trained",
    },
  ];
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
      : universalCreds;

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
            // Round 28s54 — optional-chain so an unmapped code can't
            // crash the whole detail page on render.
            (l) =>
              LANG_DISPLAY[l.code.toLowerCase()]?.name ??
              l.code.toUpperCase(),
          )
          .join(" · ")
      : (f.language ?? "");

  // 🆕 Round 28b39 — wrap with prettyHHMM so the About row shows
  //   "19:00 PM – 05:00 AM" instead of ambiguous "19:00 – 05:00".
  const hoursText =
    real.startTime && real.endTime
      ? `${prettyHHMM(real.startTime)} – ${prettyHHMM(real.endTime)}`
      : "";

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

  // Round 28s34 — inline empty shell (was `...MAI` referencing the
  // removed EMPTY_THERAPIST). Same effect: any DemoTherapist field
  // the `real` source doesn't override defaults to a zero/empty
  // value so downstream renderers never see `undefined`.
  const SHELL: DemoTherapist = {
    id: real.id,
    name: real.name,
    age: 0,
    area: "",
    distance: "",
    online: false,
    photoBg,
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

  return {
    ...SHELL,
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

  // Round 28s55 — Single shared bookings listener. Returns BOTH the
  // active-booking list (for the availability engine) and the loyalty
  // stats (for the Loyalty tab) from one subscription. Was two
  // identical `bookings where therapistId == X` listeners
  // (useTherapistBookings + useTherapistBookingStats).
  const { active: liveBookings, stats: loyaltyStats } =
    useTherapistBookingFeed(id ?? null);

  // Round 28s34 — Single-source lookup. The 3-tier (real / demo /
  // MAI) chain was a hangover from Round 28r demo data; with the
  // demo map empty, the only real path was `therapistsData`. An
  // unknown :id now returns null → explicit 404 below.
  const realRow = id ? therapistsData.find((tt) => tt.id === id) : null;
  const therapistFromReal = realRow ? buildFromReal(realRow) : null;

  // Round 28s34 — Memoised overlay so the spread runs only when
  // loyalty / review payloads change, not on every parent render.
  // Returns null when the lookup didn't find a real therapist —
  // the 404 branch in the JSX below short-circuits the render.
  const therapist = useMemo(() => {
    if (!therapistFromReal) return null;
    let t = therapistFromReal;
    if (loyaltyStats.totalCompleted > 0) {
      t = {
        ...t,
        totalSessions: loyaltyStats.totalCompleted,
        rebookRate:
          loyaltyStats.uniqueCustomers >= 1
            ? `${loyaltyStats.repeatPct}%`
            : t.rebookRate,
      };
    }
    if (liveReviews.reviewCount > 0) {
      t = {
        ...t,
        reviewCount: liveReviews.reviewCount,
        reviewBuckets: liveReviews.buckets.map((b) => ({
          num: b.stars,
          count: b.count,
          pct: b.pct,
        })),
        reviews: liveReviews.reviews.map((r) => ({
          initial: "•",
          name: `Booking #${r.bookingId.slice(0, 8).toUpperCase()}`,
          flag: "",
          meta: `${r.ago} · ${r.service}`,
          quote: r.body,
        })),
      };
    }
    return t;
  }, [
    therapistFromReal,
    loyaltyStats.totalCompleted,
    loyaltyStats.uniqueCustomers,
    loyaltyStats.repeatPct,
    liveReviews.reviewCount,
    liveReviews.buckets,
    liveReviews.reviews,
  ]);

  // Round 28s34 — null-safe useDocumentMeta. Hook must be called
  // unconditionally; we fall back to a generic title when the id
  // didn't resolve to a real therapist (404 branch renders below).
  useDocumentMeta({
    title: t("meta.detail.title", "{{name}} · SUNRED Bangkok", {
      name: therapist?.name ?? "Practitioner",
    }),
    description: therapist
      ? t(
          "meta.detail.description",
          "{{name}} — verified massage therapist in Bangkok. {{rating}}★ ({{count}} reviews). Book in seconds.",
          {
            name: therapist.name,
            rating: therapist.rating,
            count: therapist.reviewCount,
          },
        )
      : undefined,
    locale: langToLocale(i18n.language),
    url: `https://sunred.vip/therapists/${id ?? therapist?.id ?? ""}`,
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

  // Round 28s42 — Underline-tab state (founder ref: a hotel
  // overview screen with "ภาพรวม / นโยบายและเงื่อนไข" tabs).
  // Defaults to Services since the page's whole point is converting
  // browsing → booking; About sits one tap away.
  const [detailTab, setDetailTab] = useState<"services" | "about">(
    "services",
  );

  // Round 28s55 — `liveBookings` now comes from the shared
  // useTherapistBookingFeed above (one listener for bookings + stats).
  // Only the therapists-doc live-status listener remains separate.
  const liveStatus = useTherapistLiveStatus(therapist?.id ?? null);

  const activeBooking = useMemo(
    () => findActiveBooking(liveBookings),
    [liveBookings],
  );
  const upcomingBooking = useMemo(
    () => findNextBooking(liveBookings),
    [liveBookings],
  );
  const nextBookingAt = useMemo(
    () =>
      upcomingBooking
        ? fmtBKK(upcomingBooking.startAt, "HH:mm A", "")
        : null,
    [upcomingBooking],
  );

  const realRecord = useMemo(
    () =>
      therapist?.id
        ? therapistsData.find((tt) => tt.id === therapist.id) ?? null
        : null,
    [therapist?.id],
  );

  // Round 28s53 — Real GPS distance. autoStart:false so we never
  // prompt without a user gesture; the DetailHero "Allow location"
  // chip calls `requestLocation()` on tap. Once a position resolves,
  // haversine to the practitioner's standby coordinates produces the
  // distance label (privacy: distance only, never the area name).
  const {
    location: userLocation,
    request: requestLocation,
    status: geoStatus,
  } = useUserLocation({ autoStart: false });

  const distanceLabel = useMemo(() => {
    if (!userLocation || !realRecord) return null;
    const lat =
      realRecord.lat ?? realRecord.homeLocation?.lat ?? null;
    const lng =
      realRecord.lng ?? realRecord.homeLocation?.lng ?? null;
    if (lat == null || lng == null) return null;
    const km = haversineKm(
      userLocation.lat,
      userLocation.lng,
      lat,
      lng,
    );
    // ETA estimate: city driving ~1.45× haversine at ~22 km/h.
    const etaMin = Math.round((km * 1.45) / 22 * 60);
    return formatDistanceEta(km, etaMin);
  }, [userLocation, realRecord]);

  // Merge data file + live status + live-derived activeBooking.
  // Memoised so calculateTherapistStatus runs once per change.
  const mergedRecord = useMemo(() => {
    if (!realRecord) return null;
    return {
      ...realRecord,
      ...(liveStatus.exists
        ? {
            isHoliday: liveStatus.isHoliday ?? realRecord.isHoliday,
            statusOverride:
              liveStatus.statusOverride ?? realRecord.statusOverride,
            startTime: liveStatus.startTime ?? realRecord.startTime,
            endTime: liveStatus.endTime ?? realRecord.endTime,
          }
        : {}),
      // Round 28b49 — derive activeBooking/busyUntil from live
      // bookings so admin "Cancel" self-heals without a Cloud
      // Function. The persisted therapist doc fields are ignored.
      activeBooking: !!activeBooking,
      busyUntil: activeBooking?.endAt ?? null,
    };
  }, [realRecord, liveStatus, activeBooking]);

  const engineResult = useMemo(
    () =>
      mergedRecord ? calculateTherapistStatus(mergedRecord) : null,
    [mergedRecord],
  );
  const engineStatus = engineResult?.status ?? "resting";

  const livePillStatus: "online" | "busy" | "offline" =
    engineStatus === "resting" || engineStatus === "holiday"
      ? "offline"
      : engineStatus === "bookable" || activeBooking
        ? "busy"
        : "online";

  const liveNextAvailable = useMemo(() => {
    const engineNext = engineResult?.nextAvailable ?? null;
    if (livePillStatus === "busy") {
      return activeBooking ? nextAvailableHHMM(liveBookings) : engineNext;
    }
    if (livePillStatus === "offline") {
      return engineNext ?? realRecord?.startTime ?? null;
    }
    return null;
  }, [
    livePillStatus,
    activeBooking,
    liveBookings,
    engineResult,
    realRecord?.startTime,
  ]);

  // Round 28s41 — Auto-navigate restored. The 28s34/s39 sticky +
  // inline Reserve CTAs are gone; the merged ServiceDurationSheet's
  // Confirm tap now flows straight to /booking/:id (Phase 5
  // founder behaviour: "เลือกเสร็จ ก็ไปหน้า Confirm Order").
  const goConfirmOrder = (
    serviceId: string,
    duration: number,
    date: string,
    time: string,
  ) => {
    if (!therapist) return;
    // Round 28s54 — `setSelection` removed here; the StepService
    // onConfirm callback already sets it before calling this, so
    // the second write was a redundant render. This fn just
    // navigates now.
    const params = new URLSearchParams();
    params.set("service", serviceId);
    params.set("duration", String(duration));
    params.set("date", date);
    params.set("time", time);
    void navigate(`/booking/${therapist.id}?${params.toString()}`);
  };

  // Round 28s34 — Memoised Bayesian rating. Previously recomputed
  // on every parent render, even when reviews didn't change.
  const displayRating = useMemo(
    () =>
      liveReviews.reviewCount > 0
        ? formatRating(bayesianRating(liveReviews.reviews))
        : therapist?.rating ?? "0.0",
    [liveReviews.reviewCount, liveReviews.reviews, therapist?.rating],
  );

  // ── 404 — explicit not-found branch (was previously masked by
  // the EMPTY_THERAPIST shell, which silently rendered a blank
  // profile with 0 reviews for any stale /therapists/:id link). */
  if (!therapist) {
    return (
      <Box
        sx={{
          maxWidth: 430,
          margin: "0 auto",
          minHeight: "100vh",
          padding: "60px 24px",
          textAlign: "center",
          fontFamily: SANS,
        }}
      >
        <Typography
          sx={{
            fontFamily: SERIF,
            fontSize: "22px",
            fontWeight: 600,
            color: "#2a1a14",
            marginBottom: "8px",
          }}
        >
          {t("detail.notFound.title", "Practitioner not found")}
        </Typography>
        <Typography
          sx={{
            fontSize: "13.5px",
            color: "rgba(60, 30, 20, 0.65)",
            marginBottom: "20px",
          }}
        >
          {t(
            "detail.notFound.body",
            "The profile you were looking for is unavailable. Browse our current practitioners on the home screen.",
          )}
        </Typography>
        <Box
          component="button"
          type="button"
          onClick={() => navigate("/")}
          sx={{
            padding: "10px 22px",
            border: "1px solid rgba(184, 92, 60, 0.20)",
            borderRadius: 999,
            background: "#fff",
            color: "#2a1a14",
            fontFamily: SANS,
            fontSize: "13px",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          {t("detail.notFound.cta", "Back to home")}
        </Box>
      </Box>
    );
  }

  // Round 28s54 — `selectionReady` removed: its only consumers were
  // the sticky + inline Reserve CTAs, both deleted in 28s41. The
  // ServiceDurationSheet now auto-navigates on Confirm so no
  // page-level "is the selection complete?" gate is needed.

  return (
    <Box
      sx={{
        // Round 28s34 — Phone-shell wrapper (maxWidth + borderRadius +
        // boxShadow) dropped on the detail page so it reads as a real
        // web app rather than a mockup on desktop. The 430px constraint
        // moves to inner sections; outer page fills the viewport.
        // Round 28s39 — paddingBottom removed; the sticky bottom
        // CTA moved inline after the About card.
        minHeight: "100vh",
        background: "linear-gradient(180deg, #FAFBFC 0%, #F1F3F5 100%)",
        position: "relative",
      }}
    >
      {/* Round 28s40 — Sticky top app bar removed (founder request).
          DetailHero's own back button (top-left over the photo grid)
          remains the only back affordance. */}

      <Box
        sx={{
          maxWidth: 430,
          margin: "0 auto",
          background: "transparent",
          position: "relative",
        }}
      >
      <DetailHero
        name={therapist.name}
        age={therapist.age}
        area={therapist.area}
        // Round 28s53 — real GPS distance label (null until the
        // guest grants location). Tapping the "Allow location"
        // chip fires requestLocation; geoStatus drives the
        // pending/denied prompt copy inside DetailHero.
        distanceLabel={distanceLabel}
        onRequestLocation={requestLocation}
        geoStatus={geoStatus}
        // 🆕 Round 28aq — pass full 3-state status from the real engine
        //   so the hero dot/label reads "Online" (green) / "Busy" (orange)
        //   / "Offline" (gray) consistently with the StatusPill below.
        online={livePillStatus}
        photoBg={therapist.photoBg}
        images={therapist.images}
        // Round 28s52 — Working hours surface in the info overlay
        // (next to Allow location + status) instead of the About
        // tab section.
        workingHours={
          realRecord?.startTime && realRecord?.endTime
            ? `${realRecord.startTime}–${realRecord.endTime}${
                realRecord.startTime > realRecord.endTime
                  ? " (overnight)"
                  : ""
              }`
            : null
        }
      />

      {/* Round 28s36 — StatsCard restored (founder "StatsCard เอา
          กลับมา"). The inline stat row from 28s35 reverted; the
          4-cell card carries the tap-to-info-sheet affordance the
          guests rely on. */}
      <StatsCard
        rating={displayRating}
        reviewCount={therapist.reviewCount}
        yearsExp={therapist.yearsExp}
        totalSessions={therapist.totalSessions}
        rebookRate={therapist.rebookRate}
        onTapRating={() => setInfoSheet("reviews")}
        onTapProfile={() => setInfoSheet("profile")}
        onTapLoyalty={() => setInfoSheet("loyalty")}
      />

      {/* Round 28s57 — Working hours moved here (founder
          "ย้ายลงมาข้างล่าง") — below the StatsCard, out of the photo
          overlay. Single quiet clay-tinted line with a clock icon. */}
      {realRecord?.startTime && realRecord?.endTime && (
        <Box
          sx={{
            maxWidth: 430,
            margin: "0 auto",
            padding: "10px 18px 0",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <ScheduleRoundedIcon
            sx={{ fontSize: 16, color: "#b85c3c", flexShrink: 0 }}
          />
          <Typography
            component="span"
            sx={{
              fontFamily: SANS,
              fontSize: "13px",
              fontWeight: 600,
              color: "#2a1a14",
            }}
          >
            {realRecord.startTime}–{realRecord.endTime}
            {realRecord.startTime > realRecord.endTime && (
              <Box
                component="span"
                sx={{
                  fontWeight: 500,
                  color: "rgba(60, 30, 20, 0.55)",
                  marginLeft: "6px",
                }}
              >
                (overnight)
              </Box>
            )}
          </Typography>
        </Box>
      )}

      {/* Round 28s42 — StatusPill rendered ABOVE the tabs so the
          status signal stays visible whichever panel is active.
          About + Services panels themselves move inside the tabs
          below. */}
      <Box sx={{ marginTop: "4px" }}>
        <StatusPill
          nextBookingAt={
            livePillStatus === "online" ? nextBookingAt : null
          }
          status={livePillStatus}
          nextAvailable={liveNextAvailable}
        />
      </Box>

      {/* Round 28s42 — Underline tabs (Services / About {name}).
          Modelled on the founder-supplied hotel "ภาพรวม /
          นโยบายและเงื่อนไข" reference. Defaults to Services since
          that's the conversion surface; About is one tap away. */}
      <Box
        role="tablist"
        aria-label={t(
          "detail.tabsAria",
          "Practitioner overview tabs",
        )}
        sx={{
          maxWidth: 430,
          margin: "12px auto 0",
          padding: "0 18px",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          borderBottom: "1px solid rgba(184, 92, 60, 0.18)",
        }}
      >
        {(
          [
            {
              id: "services" as const,
              label: t("detail.tabs.services", "Services"),
            },
            {
              id: "about" as const,
              label: t("detail.tabs.about", "About {{name}}", {
                name: therapist.name,
              }),
            },
          ]
        ).map((tab) => {
          const isActive = detailTab === tab.id;
          return (
            <Box
              key={tab.id}
              component="button"
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setDetailTab(tab.id)}
              sx={{
                position: "relative",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                padding: "14px 8px",
                fontFamily: SANS,
                fontSize: "13.5px",
                fontWeight: 700,
                letterSpacing: "0.005em",
                color: isActive
                  ? "#FE0944"
                  : "rgba(60, 30, 20, 0.55)",
                textAlign: "center",
                transition: "color 0.18s ease",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                "&:hover": {
                  color: isActive ? "#FE0944" : "#2a1a14",
                },
                "&:focus-visible": {
                  outline: "2px solid #FE0944",
                  outlineOffset: 2,
                  borderRadius: "6px",
                },
                "&::after": {
                  content: '""',
                  position: "absolute",
                  left: 12,
                  right: 12,
                  bottom: -1,
                  height: 3,
                  borderRadius: 3,
                  background: isActive
                    ? "linear-gradient(135deg, #FE0944, #FE7A52)"
                    : "transparent",
                  transition: "background 0.18s ease",
                },
              }}
            >
              {tab.label}
            </Box>
          );
        })}
      </Box>

      {/* ── About panel ─────────────────────────────────────────── */}
      {detailTab === "about" && (
        <Box role="tabpanel" sx={{ paddingTop: "12px" }}>
          <About
            name={therapist.name}
            rows={therapist.aboutRows}
            facts={therapist.aboutFacts}
            body={therapist.about}
            gender={therapist.gender}
            images={therapist.images}
            galleryAltBase={`${therapist.name} photo`}
            enhance={(url, mode) =>
              enhanceImage(url, {
                variant: mode === "thumb" ? "card" : "hero",
              })
            }
          />

          {/* Round 28s50 — Inline profile detail sections under the
              About card so guests don't have to dig into the
              centred InfoSheet to see Credentials / Specialties /
              Languages. Each section is hidden when its source
              array is empty. */}
          <Box
            sx={{
              maxWidth: 430,
              margin: "0 auto",
              padding: "10px 20px 24px",
              display: "flex",
              flexDirection: "column",
              gap: "22px",
            }}
          >
            {therapist.creds.length > 0 && (
              <Box>
                <Typography
                  component="p"
                  sx={{
                    fontFamily: SANS,
                    fontSize: "11px",
                    fontWeight: 800,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    color: "#b85c3c",
                    marginBottom: "10px",
                  }}
                >
                  {t("detail.about.credentials", "Credentials")}
                </Typography>
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                  }}
                >
                  {therapist.creds.map((c) => (
                    <Box
                      key={c.label}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                      }}
                    >
                      <Box sx={{ fontSize: "20px", color: "#2a1a14" }}>
                        {c.icon}
                      </Box>
                      <Box>
                        <Typography
                          sx={{
                            fontFamily: SANS,
                            fontSize: "13px",
                            fontWeight: 700,
                            color: "#2a1a14",
                            lineHeight: 1.2,
                          }}
                        >
                          {c.label}
                        </Typography>
                        <Typography
                          sx={{
                            fontFamily: SANS,
                            fontSize: "11.5px",
                            color: "rgba(60, 30, 20, 0.6)",
                            marginTop: "2px",
                          }}
                        >
                          {c.meta}
                        </Typography>
                      </Box>
                    </Box>
                  ))}
                </Box>
              </Box>
            )}

            {therapist.specs.length > 0 && (
              <Box>
                <Typography
                  component="p"
                  sx={{
                    fontFamily: SANS,
                    fontSize: "11px",
                    fontWeight: 800,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    color: "#b85c3c",
                    marginBottom: "10px",
                  }}
                >
                  {t("detail.about.specialties", "Specialties")}
                </Typography>
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "10px",
                  }}
                >
                  {therapist.specs.map((s) => (
                    <Box
                      key={s.name}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                      }}
                    >
                      <Box sx={{ fontSize: "20px", flexShrink: 0 }}>
                        {s.icon}
                      </Box>
                      <Box>
                        <Typography
                          sx={{
                            fontFamily: SERIF,
                            fontSize: "14px",
                            fontWeight: 600,
                            color: "#2a1a14",
                            lineHeight: 1.15,
                          }}
                        >
                          {s.name}
                        </Typography>
                        {s.yrs && (
                          <Typography
                            sx={{
                              fontFamily: SANS,
                              fontSize: "11px",
                              color: "rgba(60, 30, 20, 0.55)",
                              marginTop: "1px",
                            }}
                          >
                            {s.yrs}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  ))}
                </Box>
              </Box>
            )}

            {therapist.langs.length > 0 && (
              <Box>
                <Typography
                  component="p"
                  sx={{
                    fontFamily: SANS,
                    fontSize: "11px",
                    fontWeight: 800,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    color: "#b85c3c",
                    marginBottom: "10px",
                  }}
                >
                  {t("detail.about.languages", "Languages")}
                </Typography>
                <Box
                  sx={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "6px 18px",
                  }}
                >
                  {therapist.langs.map((l) => {
                    const isNative = l.level
                      .toUpperCase()
                      .includes("NATIVE");
                    return (
                      <Box
                        key={l.name}
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                        }}
                      >
                        <Box sx={{ fontSize: "14px" }}>{l.flag}</Box>
                        <Typography
                          component="span"
                          sx={{
                            fontFamily: SANS,
                            fontSize: "13px",
                            fontWeight: 600,
                            color: "#2a1a14",
                          }}
                        >
                          {l.name}
                        </Typography>
                        <Typography
                          component="span"
                          sx={{
                            fontFamily: SANS,
                            fontSize: "9.5px",
                            fontWeight: 800,
                            letterSpacing: "0.08em",
                            color: isNative
                              ? "#FE0944"
                              : "rgba(60, 30, 20, 0.55)",
                            textTransform: "uppercase",
                          }}
                        >
                          {l.level}
                        </Typography>
                      </Box>
                    );
                  })}
                </Box>
              </Box>
            )}

            {/* Round 28s52 — Working hours moved to the DetailHero
                info overlay (next to Allow location + status pill)
                per founder ask. No longer rendered as an About-tab
                section. */}
          </Box>
        </Box>
      )}

      {/* ── Services panel ─────────────────────────────────────── */}
      {detailTab === "services" && (
      <Box
        id="tdp-service-picker"
        role="tabpanel"
        sx={{
          padding: "20px",
          maxWidth: 430,
          margin: "0 auto",
        }}
      >
        <Typography
          component="p"
          sx={{
            fontFamily: SANS,
            fontSize: "11px",
            fontWeight: 800,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "#b85c3c",
            marginBottom: "6px",
          }}
        >
          {t("detail.picker.eyebrow", "Choose your ritual")}
        </Typography>
        <Typography
          component="h2"
          sx={{
            fontFamily: SERIF,
            fontSize: "22px",
            fontWeight: 600,
            color: "#2a1a14",
            letterSpacing: "-0.015em",
            lineHeight: 1.1,
            marginBottom: "6px",
          }}
        >
          {t("detail.picker.title", "Services")}
        </Typography>
        {/* Round 28s48 — Subtitle "Tap a ritual to pick duration,
            date, and time — all in one step." removed (founder
            request). The cards do the explaining; the eyebrow +
            title already announce the section. */}

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
            whiteSpace: "pre-line",
          }}
        >
          {t(
            "detail.picker.serviceHint",
            "Didn't find your preferred service? \n Contact us for more personalized options.",
          )}
        </Typography>
      </Box>
      )}

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

      {/* Round 28s39 — Fixed-bottom sticky CTA removed. Now lives
          inline after the About card so it sits next to the
          practitioner's identity, with their name on the button. */}
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
