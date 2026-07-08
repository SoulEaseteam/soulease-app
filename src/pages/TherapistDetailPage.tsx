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

import React, { useState, useMemo, useEffect } from "react";
import { Box, Typography, CircularProgress } from "@mui/material";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
// 🆕 Round 28r84 — Icons for the #gallery section lightbox controls
//   (fullscreen photo viewer with prev/next/close). Warm-taupe glyphs
//   over the dim backdrop so they stay legible without adding a
//   fourth accent colour to the palette.
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import ChevronLeftRoundedIcon from "@mui/icons-material/ChevronLeftRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
// 🆕 Round 28r85 — Icon-first tab bar (Photos · Services · About)
//   per founder reference screenshot. Photo = ImageRounded, Grid =
//   GridViewRounded, Star = StarRounded. Active tab underlines in
//   teal #2EC4B0 (accents.teal from r81); inactive icons in warm
//   taupe #8F8474 (matches Reserve rail).
import ImageRoundedIcon from "@mui/icons-material/ImageRounded";
import GridViewRoundedIcon from "@mui/icons-material/GridViewRounded";
import StarRoundedIcon from "@mui/icons-material/StarRounded";

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
// 🆕 Round 28s220 — Rolodex-style profile features card (ref: founder
//   ROLADEX competitor screenshot).
import FeaturesPanel from "@/components/therapist/detail/FeaturesPanel";
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
// 🚨 Round 28r66 HOTFIX — Firestore fallback for admin-added
//   therapists that never got hardcoded into src/data/therapists.ts.
//   See the merged-lookup block inside the component below.
import { db } from "@/lib/firebase";
import { doc as fsDoc, getDoc as fsGetDoc } from "firebase/firestore";
import { enhanceImage } from "@/utils/cloudinary";
// Round 28s53 — real GPS distance. The DetailHero "Allow location"
// prompt now triggers an actual geolocation request and the
// resolved coordinates produce a haversine distance to the
// practitioner's standby point.
import { useUserLocation } from "@/hooks/useUserLocation";
import { haversineKm } from "@/utils/taxiFare";
import { formatDistanceEta } from "@/utils/formatDistanceEta";
// 🆕 Round 28r52 — Phase 3.1 responsive shell replaces the internal
//   maxWidth: 430 caps used across this page's inner sections so the
//   detail widens on tablet/desktop.
// 🆕 Round 28r55 (Phase 3.4) — responsiveType scales the 404 title +
//   About/Discovery body text through xs/sm/md so desktop breathes.
import { responsiveShell, responsiveType } from "@/theme/breakpoints";

const SERIF = '"Playfair Display", "Fraunces", Georgia, "Times New Roman", serif';
const SANS = '"Inter", system-ui, -apple-system, sans-serif';

// 🆕 Round 28s207 (audit #6) — 24h "HH:mm" → "h AM/PM" so the working
//   hours read naturally everywhere (matches TherapistMinimalCard).
function toAmPm(hhmm: string): string {
  if (!hhmm) return "";
  const [hStr, mStr] = hhmm.split(":");
  const h = Number(hStr);
  const m = Number(mStr);
  if (Number.isNaN(h) || Number.isNaN(m)) return hhmm;
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return m === 0
    ? `${hour12} ${period}`
    : `${hour12}:${m.toString().padStart(2, "0")} ${period}`;
}

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
  return a;
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
    icon: <LocalFloristRoundedIcon sx={{ fontSize: 18, color: "#4B4B48" }} />,
    short: "Aromatherapy",
  },
  "SR-HJ2200": {
    icon: <FitnessCenterRoundedIcon sx={{ fontSize: 18, color: "#1A2B2E" }} />,
    short: "Gentleman's Signature",
  },
  "SR-B2B3200": {
    icon: <AutoAwesomeRoundedIcon sx={{ fontSize: 18, color: "#4B4B48" }} />,
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
//
// 🆕 Round 28s113 — `lang` parameter prioritizes the curated multi-locale
//   `bios` block on the Therapist record over the auto-derived chip-style
//   `aboutDerived` string. Falls back to EN bio, then auto-derived, in that
//   order. This is what lets WeChat/LINE/SEO visitors arriving on a
//   /therapists/:id route see a real prose introduction in their language
//   instead of a stat list. Source content lives in docs/therapist-profiles.md
//   + docs/therapist-profiles-i18n.md and is wired into src/data/therapists.ts
//   `bios` fields.
function buildFromReal(real: Therapist, lang?: string): DemoTherapist {
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
          <AutoAwesomeRoundedIcon sx={{ fontSize: 18, color: "#4B4B48" }} />
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
    // 🆕 Round 28s113 — prefer curated multi-locale bio; fall back to EN;
    //   final fallback is the auto-assembled fact-chip string.
    about:
      (lang && real.bios?.[lang as keyof typeof real.bios]) ||
      real.bios?.en ||
      aboutDerived,
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
  // 🚨 Round 28r66 HOTFIX — added Firestore fallback. Founder:
  //   "พนักงานใหม่ที่เพิ่มโปรไฟล์ผ่านแอดมิน โชว์ได้แค่หน้าเว็บ
  //   แต่ไม่มีหน้าดีเทลแกด้วย". HomeTherapistGrid already subscribes
  //   to the Firestore `therapists` collection, so admin-added
  //   practitioners appear on home — but the detail page only ever
  //   consulted the hardcoded array, so tapping their card 404'd.
  //   Merge: hardcoded wins fast for the 12 originals (rich static
  //   bios + gallery paths + fixed language keys, zero perf hit,
  //   zero regression risk); Firestore falls through only when the
  //   hardcoded lookup MISSES. All 12 hardcoded profiles behave
  //   exactly as before this round.
  const hardcodedRow = id ? therapistsData.find((tt) => tt.id === id) : null;
  const [firestoreRow, setFirestoreRow] = useState<Therapist | null>(null);
  const [firestoreLoading, setFirestoreLoading] = useState(false);

  useEffect(() => {
    // Only reach Firestore when hardcoded missed. Fast-path exit
    //   for the 12 originals means zero extra read on the paths
    //   customers hit today.
    if (!id || hardcodedRow) {
      setFirestoreRow(null);
      setFirestoreLoading(false);
      return;
    }
    let cancelled = false;
    setFirestoreLoading(true);
    (async () => {
      try {
        const snap = await fsGetDoc(fsDoc(db, "therapists", id));
        if (cancelled) return;
        if (snap.exists()) {
          const data = snap.data() as Partial<Therapist> & Record<string, unknown>;
          // Coerce Firestore doc into the shape `buildFromReal`
          //   consumes. Firestore therapist docs (written by
          //   AdminTherapistDetailPage / AddTherapistPage /
          //   therapistFormKit) already carry name/image/gallery/
          //   features/bios/languageSkills/servicesAvailable, so
          //   we just spread the doc and defensively fill the
          //   required-but-possibly-missing fields with safe
          //   defaults. `buildFromReal` handles the rest.
          // Safe defaults for required Therapist fields. Spread the
          //   Firestore payload OVER defaults so anything the doc
          //   actually has wins; then force `id` back to the URL
          //   param at the end since `data.id` may be stale/missing.
          const defaults: Omit<Therapist, "id"> = {
            name: id,
            image: "",
            rating: 0,
            reviews: 0,
            startTime: "10:00",
            endTime: "22:00",
            gallery: [],
            features: {
              age: "",
              height: "",
              weight: "",
              bodyType: "",
              language: "",
            },
          };
          // `Partial<Therapist>` has string|undefined shapes, so a
          //   spread would let `undefined` fields blow away the
          //   defaults. Cast to Therapist — at runtime the JS spread
          //   only overwrites keys that are present on `data`, so
          //   defaults survive for any field the Firestore doc
          //   simply doesn't have.
          const rec = {
            ...defaults,
            ...data,
            id,
          } as Therapist;
          setFirestoreRow(rec);
        } else {
          setFirestoreRow(null);
        }
      } catch (err) {
        // Fail closed → treat as not-found rather than crash. Rules
        //   allow `read: if true` on therapists so the only way this
        //   throws in production is a network hiccup.
        console.warn("[TherapistDetailPage] Firestore fallback failed:", err);
        if (!cancelled) setFirestoreRow(null);
      } finally {
        if (!cancelled) setFirestoreLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, hardcodedRow]);

  const realRow = hardcodedRow ?? firestoreRow;
  // 🆕 Round 28s113 — pass the active i18n locale so buildFromReal can
  //   surface the matching `bios[lang]` translation as the About body.
  //   Slice to 2 chars so "en-US" / "zh-CN" both resolve to "en" / "zh".
  const therapistFromReal = realRow
    ? buildFromReal(realRow, i18n.language?.slice(0, 2))
    : null;

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
  // 🆕 Round 28s210 — Restored after founder feedback "กดดูไม่ได้":
  //   StatsCard cells are tappable again and open the InfoSheet
  //   modal (reviews / profile / loyalty deep dives).
  const [infoSheet, setInfoSheet] = useState<
    "profile" | "reviews" | "loyalty" | null
  >(null);

  // 🆕 Round 28s221 — Show/Hide details toggle removed (founder
  //   "ปรับ แก้ ทั้ง tab About"). FEATURES + Credentials + Specialties
  //   + Languages now render always-visible under the About card.

  // Round 28s42 — Underline-tab state (founder ref: a hotel
  // overview screen with "ภาพรวม / นโยบายและเงื่อนไข" tabs).
  // Round 28r85 — expanded to 3 tabs (Photos / Services / About)
  // per founder reference screenshot. Photos is default when the
  // guest lands via `#gallery` (card PHOTOS pill); otherwise Services
  // stays default since the page's whole point is converting browsing
  // → booking.
  const [detailTab, setDetailTab] = useState<"photos" | "services" | "about">(
    typeof window !== "undefined" && window.location.hash === "#gallery"
      ? "photos"
      : "services",
  );

  // 🆕 Round 28r84 — Gallery lightbox index (null = closed).
  //   The #gallery section renders a responsive photo grid; tapping
  //   any tile opens the fullscreen viewer with prev/next/close.
  const [galleryIdx, setGalleryIdx] = useState<number | null>(null);

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
    // 🆕 Round 28s141 — Holiday gate. Founder: "หน้าดีเทล ก็จองไม่ได้".
    //   If admin toggled this practitioner to HOLIDAY in the
    //   Therapist Manager, block the booking flow entry here too —
    //   not just the home card. Guest sees an inline alert + the
    //   concierge handle so they can request a future date.
    if (engineStatus === "holiday") {
      alert(
        `${therapist.name} is on holiday today.\nPlease pick another practitioner or contact concierge for a future date.`,
      );
      return;
    }
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

  // 🆕 Round 28r84 — Hash-scroll into the #gallery section. Card's
  //   PHOTOS pill routes to `/therapists/:id#gallery`; smooth-scroll
  //   here so the guest lands directly on the photo grid instead of
  //   at the top of the page. Runs once when the therapist resolves
  //   (id change or Firestore fallback lands).
  // 🆕 Round 28r85 — also switch to the Photos tab so the guest sees
  //   the full gallery immediately on mobile (previously an anchor
  //   section; now a proper tab panel).
  useEffect(() => {
    if (!therapistFromReal) return;
    if (typeof window === "undefined") return;
    if (window.location.hash !== "#gallery") return;
    setDetailTab("photos");
    const timer = window.setTimeout(() => {
      const el = document.getElementById("gallery");
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 220);
    return () => window.clearTimeout(timer);
  }, [therapistFromReal]);

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
  // 🚨 Round 28r66 HOTFIX — hold the 404 while the Firestore
  //   fallback is still in flight; otherwise an admin-added
  //   practitioner would flash "not found" for a beat before the
  //   real doc lands (jarring, and looks broken to the founder).
  if (!therapist && firestoreLoading) {
    return (
      <Box
        sx={{
          ...responsiveShell,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "60px 24px",
        }}
      >
        <CircularProgress size={28} sx={{ color: "#4B4B48" }} />
      </Box>
    );
  }
  if (!therapist) {
    return (
      <Box
        sx={{
          // 🆕 Round 28r52 — responsiveShell replaces the fixed 430
          //   phone-shell cap.
          ...responsiveShell,
          minHeight: "100vh",
          padding: "60px 24px",
          textAlign: "center",
          fontFamily: SANS,
        }}
      >
        <Typography
          sx={{
            ...responsiveType.h3,
            fontFamily: SERIF,
            fontWeight: 600,
            color: "#1A2B2E",
            marginBottom: "8px",
          }}
        >
          {t("detail.notFound.title", "Practitioner not found")}
        </Typography>
        <Typography
          sx={{
            fontSize: "13.5px",
            color: "rgba(15, 23, 42, 0.65)",
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
            color: "#1A2B2E",
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
        background: "#F4F6F5",
        position: "relative",
      }}
    >
      {/* Round 28s40 — Sticky top app bar removed (founder request).
          DetailHero's own back button (top-left over the photo grid)
          remains the only back affordance. */}

      <Box
        sx={{
          // 🆕 Round 28r52 — responsiveShell replaces the 430 inner
          //   column so DetailHero + StatsCard + tabs widen with the
          //   viewport instead of clumping in the middle of desktop.
          ...responsiveShell,
          background: "transparent",
          position: "relative",
          // 🆕 Round 28r55 (Phase 3.4) — desktop needs breathing room
          //   at the bottom since the mobile sticky CTA doesn't apply.
          paddingBottom: { xs: 0, md: "48px" },
        }}
      >
      {/* 🆕 Round 28r55 (Phase 3.4) — 2-column grid at md+.
          Mobile: flex-block stack in original source order
          (DetailHero → StatsCard → StatusPill → Tabs → Panel).
          Desktop: left rail (DetailHero row 1 · Services picker row 2,
          sticky top) · right column (StatsCard + StatusPill row 1 ·
          About content row 2, scrolls independently). Tabs bar is
          hidden on md+ since both panels render simultaneously.
          Grid children below use explicit gridColumn/gridRow so the
          mobile source order and desktop 2-col layout can diverge
          without duplicating any component. */}
      <Box
        sx={{
          display: { xs: "block", md: "grid" },
          gridTemplateColumns: { md: "5fr 7fr" },
          columnGap: { md: 4 },
          alignItems: { md: "start" },
          padding: { xs: 0, md: "0 18px" },
        }}
      >
      {/* ── GRID CHILD 1 — DetailHero (col 1 row 1 on md+) ─────── */}
      <Box
        sx={{
          gridColumn: { md: "1" },
          gridRow: { md: "1" },
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
          // 🆕 Round 28s207 (audit #6) — Working hours formatted as
          //   12-hour AM/PM (was 24h "19:00–05:00"). Matches the
          //   TherapistMinimalCard format on the home page so guests
          //   see one register everywhere ("7 PM – 5 AM (overnight)").
          workingHours={
            realRecord?.startTime && realRecord?.endTime
              ? `${toAmPm(realRecord.startTime)} – ${toAmPm(
                  realRecord.endTime,
                )}${
                  realRecord.startTime > realRecord.endTime
                    ? " (overnight)"
                    : ""
                }`
              : null
          }
        />
      </Box>

      {/* ── GRID CHILD 2 — StatsCard + StatusPill + Tabs
             (col 2 row 1 on md+; mobile: immediately below hero) ── */}
      <Box
        sx={{
          gridColumn: { md: "2" },
          gridRow: { md: "1" },
        }}
      >
      {/* 🆕 Round 28r85 — StatsCard MOVED into the About tab (below).
          Founder direction (2026-07-08 · reference screenshot): the
          standalone stats bar (★ rating · sessions · rebook rate)
          consolidates INSIDE the About tab so the tabs sit closer
          to the hero and the stats live next to the practitioner's
          identity content. Same three tappable cells / same
          InfoSheet handlers — just relocated. */}

      {/* 🆕 Round 28s207 (audit #1) — Working hours line removed.
          The same hours render inside DetailHero's overlay already
          (workingHours prop on the hero); a second copy here was
          redundant and added vertical drift before the StatusPill. */}

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

      {/* Round 28s42 — Underline tabs.
          🆕 Round 28r85 — expanded from 2 tabs (Services · About) to
          3 tabs (Photos · Services · About) per founder reference
          screenshot. Icon-first layout: Image / GridView / Star
          glyphs stacked above small labels. Active tab underlines in
          teal #2EC4B0 (accents.teal from r81) with GRAY_900 label;
          inactive icons in warm taupe #8F8474, labels #4B4B48.
          Hidden on md+ since the grid shows the panels simultaneously
          on desktop; mobile keeps the tab flow. */}
      <Box
        role="tablist"
        aria-label={t(
          "detail.tabsAria",
          "Practitioner overview tabs",
        )}
        sx={{
          marginTop: "12px",
          padding: "0 18px",
          display: { xs: "grid", md: "none" },
          gridTemplateColumns: "1fr 1fr 1fr",
          borderBottom: "1px solid rgba(184, 92, 60, 0.18)",
        }}
      >
        {(
          [
            {
              id: "photos" as const,
              icon: <ImageRoundedIcon sx={{ fontSize: 22 }} />,
              label: t("detail.tabs.photos", "Photos"),
            },
            {
              id: "services" as const,
              icon: <GridViewRoundedIcon sx={{ fontSize: 22 }} />,
              label: t("detail.tabs.services", "Services"),
            },
            {
              id: "about" as const,
              icon: <StarRoundedIcon sx={{ fontSize: 22 }} />,
              // 🆕 Round 28s207 (audit #5) — Was "About {name}".
              //   Trimmed to just "About" so the label doesn't go
              //   awkward when the name is long.
              label: t("detail.tabs.about", "About"),
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
                padding: "10px 6px 12px",
                fontFamily: SANS,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "4px",
                textAlign: "center",
                transition: "color 0.18s ease",
                color: isActive ? "#1A2B2E" : "#4B4B48",
                "& .tab-icon": {
                  color: isActive ? "#2EC4B0" : "#8F8474",
                  transition: "color 0.18s ease",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                },
                "&:hover": {
                  color: isActive ? "#1A2B2E" : "#1A2B2E",
                  "& .tab-icon": {
                    color: isActive ? "#2EC4B0" : "#4B4B48",
                  },
                },
                "&:focus-visible": {
                  outline: "2px solid #2EC4B0",
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
                  background: isActive ? "#2EC4B0" : "transparent",
                  transition: "background 0.18s ease",
                },
              }}
            >
              <Box className="tab-icon" aria-hidden="true">
                {tab.icon}
              </Box>
              <Box
                component="span"
                sx={{
                  fontSize: "11.5px",
                  fontWeight: 700,
                  letterSpacing: "0.02em",
                  whiteSpace: "nowrap",
                }}
              >
                {tab.label}
              </Box>
            </Box>
          );
        })}
      </Box>
      </Box>
      {/* ── END GRID CHILD 2 ────────────────────────────────────── */}

      {/* ── GRID CHILD 4 — About panel content
             (col 2 row 2 on md+; mobile: tab-controlled visibility)
             🆕 Round 28r55 (Phase 3.4) — was `{detailTab === "about"
             && (...)}`. Now rendered unconditionally with display
             toggled by breakpoint + tab state so the desktop grid can
             always show About in the right column while mobile keeps
             the tab flow. Same panel content, same handlers. ── */}
      <Box
        role="tabpanel"
        sx={{
          gridColumn: { md: "2" },
          gridRow: { md: "2" },
          display: {
            xs: detailTab === "about" ? "block" : "none",
            md: "block",
          },
          paddingTop: { xs: "12px", md: "16px" },
        }}
      >
          {/* 🆕 Round 28r85 — StatsCard relocated here from above the
              tabs. Founder direction (2026-07-08 reference screenshot):
              rating · sessions · rebook rate consolidate INSIDE the
              About tab instead of sitting as a standalone bar above
              the tabs. Same three tappable cells → same InfoSheet
              deep-dive (reviews · profile · loyalty). */}
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

          {/* 🆕 Round 28s221 — Drop the 3 fact-chip rows (info now lives
              in FeaturesPanel below) + drop the embedded gallery (hero
              handles photos). About card now renders only header + bio
              quote — clean intro, no duplicate facts. */}
          <About
            name={therapist.name}
            rows={[]}
            facts={[]}
            body={therapist.about}
            gender={therapist.gender}
          />

          {/* 🆕 Round 28s114 — Discovery Reservation callout (Phase 2 of
              docs/discovery-offer.md). Shown for every non-star therapist
              as a soft signal that trying a new practitioner carries an
              extra welcome ritual. Concierge confirms eligibility at chat
              time (lifetime 1× per returning guest × practitioner per the
              policy doc). Excludes the star therapist by design to
              protect her premium positioning. */}
          {therapist.id !== "YuriSunRed" && (
            <Box
              sx={{
                // 🆕 Round 28r52 — responsiveShell + top margin.
                ...responsiveShell,
                marginTop: "10px",
                padding: "14px 18px",
                borderRadius: "16px",
                background:
                  "#F4F6F5",
                border: "1px solid rgba(184, 92, 60, 0.18)",
                display: "flex",
                gap: "12px",
                alignItems: "flex-start",
              }}
            >
              <Box
                aria-hidden="true"
                sx={{
                  fontSize: 22,
                  lineHeight: 1,
                  color: "#4B4B48",
                  marginTop: "1px",
                }}
              >
                ✦
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                  component="p"
                  sx={{
                    fontFamily: SANS,
                    fontSize: "10px",
                    fontWeight: 800,
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    color: "#4A5568",
                    marginBottom: "4px",
                  }}
                >
                  {t(
                    "detail.discovery.eyebrow",
                    "Discovery Reservation"
                  )}
                </Typography>
                <Typography
                  component="p"
                  sx={{
                    // 🆕 Round 28r55 (Phase 3.4) — responsiveType.body
                    //   scales the Discovery blurb from 13.5px (xs) up
                    //   to 15/16px on tablet/desktop so it reads
                    //   comfortably in the wider right column.
                    ...responsiveType.body,
                    fontFamily: SERIF,
                    fontWeight: 500,
                    color: "#1A2B2E",
                  }}
                >
                  {t(
                    "detail.discovery.body",
                    "First reservation with {{name}}? Ask the concierge — we may have a complimentary welcome gesture for you.",
                    { name: therapist.name }
                  )}
                </Typography>
              </Box>
            </Box>
          )}

          {/* 🆕 Round 28s221 — Drop the "Show more details" toggle and
              the embedded sub-sections. FEATURES + Credentials +
              Specialties + Languages now always render below the About
              card. Founder: "ปรับ แก้ ทั้ง tab About" — flatter, less
              progressive disclosure. */}
          <Box
            sx={{
              // 🆕 Round 28r52 — responsiveShell for the About sub-
              //   sections (features, credentials, langs, specialties).
              ...responsiveShell,
              padding: "16px 20px 24px",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
            }}
          >
            {/* 🆕 Round 28s220 — Rolodex-style features panel (founder
                ref: ROLADEX competitor). Shows physical + personality
                descriptors in a clean info-table. Brand-voice compliant. */}
            {realRecord?.features && (
              <FeaturesPanel features={realRecord.features} />
            )}

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
                    color: "#4A5568",
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
                      <Box sx={{ fontSize: "20px", color: "#1A2B2E" }}>
                        {c.icon}
                      </Box>
                      <Box>
                        <Typography
                          sx={{
                            fontFamily: SANS,
                            fontSize: "13px",
                            fontWeight: 700,
                            color: "#1A2B2E",
                            lineHeight: 1.2,
                          }}
                        >
                          {c.label}
                        </Typography>
                        <Typography
                          sx={{
                            fontFamily: SANS,
                            fontSize: "11.5px",
                            color: "rgba(15, 23, 42, 0.6)",
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
                    color: "#4A5568",
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
                            color: "#1A2B2E",
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
                              color: "rgba(15, 23, 42, 0.55)",
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
                    color: "#4A5568",
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
                            color: "#1A2B2E",
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
                              ? "#2D2D2B"
                              : "rgba(15, 23, 42, 0.55)",
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
      {/* ── END GRID CHILD 4 (About panel) ──────────────────────── */}

      {/* ── GRID CHILD 3 — Services picker / Reserve rail
             (col 1 row 2 on md+; mobile: tab-controlled visibility)
             🆕 Round 28r55 (Phase 3.4) — was `{detailTab === "services"
             && (...)}`. Now a permanent grid child with display toggled
             by breakpoint + tab state. On desktop this sits under the
             DetailHero in the left rail and is `position: sticky` so
             the Reserve action stays anchored while the About column
             scrolls independently on the right. ── */}
      {/* 🆕 Round 28s222 — Services tab redesign (founder "tab service
          ปรับแก้"): SERIF title → SANS 700 for legibility consistency
          (matches Services / How-to-book / About / Admin audits).
          Eyebrow + title redundancy collapsed into one eyebrow header
          (the cards already announce "Services" visually). Hint text
          tightened from a chatty two-line nudge to a single concierge
          line. */}
      <Box
        id="tdp-service-picker"
        role="tabpanel"
        sx={{
          gridColumn: { md: "1" },
          gridRow: { md: "2" },
          display: {
            xs: detailTab === "services" ? "block" : "none",
            md: "block",
          },
          position: { md: "sticky" },
          top: { md: 24 },
          padding: { xs: "16px 20px 20px", md: "20px 0 24px" },
        }}
      >
        <Typography
          component="h2"
          sx={{
            fontFamily: SANS,
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "#4B4B48",
            marginBottom: "2px",
          }}
        >
          {t("detail.picker.eyebrow", "Reserve a ritual")}
        </Typography>
        {/* 🆕 Round 28r61 — bilingual pass: tiny Thai subtitle. */}
        <Typography
          sx={{
            fontFamily: SANS,
            fontSize: 10,
            fontWeight: 500,
            color: "rgba(15, 23, 42, 0.55)",
            letterSpacing: "0.02em",
            marginBottom: "10px",
          }}
        >
          จองบริการ
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
            fontSize: 12,
            color: "#4A5568",
            textAlign: "center",
            marginTop: "14px",
            lineHeight: 1.5,
          }}
        >
          {t(
            "detail.picker.serviceHint",
            "Need something bespoke? The concierge tailors it on chat.",
          )}
        </Typography>
      </Box>
      {/* ── END GRID CHILD 3 (Services picker) ──────────────────── */}
      </Box>
      {/* ── END responsive 2-col grid wrapper ───────────────────── */}

      {/* (Reviews moved into TherapistProfileTabs as Tab 2.) */}

      {/* 🆕 Round 28r84 — #gallery anchor section. Founder direction
          (2026-07-08 reference screenshots): the card's PHOTOS pill
          routes here (`/therapists/:id#gallery`). Responsive grid —
          2 col mobile · 3 col tablet · 4 col desktop — of the
          therapist's Cloudinary-enhanced gallery photos (see
          buildFromReal → `images`, which sources `therapist.gallery`
          on the underlying data record). Tapping any tile opens the
          full-screen lightbox below. Empty state renders a Nordic
          neutral card so guests understand there simply isn't more
          content yet (no bug / no broken link).
          🆕 Round 28r85 — this is now the Photos TAB content on
          mobile (tab id `photos`). Visibility toggles with
          `detailTab === "photos"` on xs; always visible on md+ since
          the desktop grid shows all sections simultaneously. */}
      <Box
        id="gallery"
        role="tabpanel"
        sx={{
          display: {
            xs: detailTab === "photos" ? "block" : "none",
            md: "block",
          },
          padding: {
            xs: "24px 20px 8px",
            md: "32px 18px 12px",
          },
          scrollMarginTop: "18px",
        }}
      >
        <Typography
          component="h2"
          sx={{
            fontFamily: SANS,
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "#4B4B48",
            marginBottom: "14px",
          }}
        >
          {t("detail.gallery.title", "Photos")}
        </Typography>

        {(therapist.images ?? []).length === 0 ? (
          <Box
            sx={{
              padding: "40px 20px",
              background: "#F7F7F6",
              borderRadius: "16px",
              textAlign: "center",
            }}
          >
            <Typography
              sx={{
                fontFamily: SANS,
                fontSize: "13px",
                fontWeight: 500,
                color: "#4B4B48",
              }}
            >
              {t(
                "detail.gallery.empty",
                "No additional photos yet"
              )}
            </Typography>
          </Box>
        ) : (
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "repeat(2, 1fr)",
                sm: "repeat(3, 1fr)",
                md: "repeat(4, 1fr)",
              },
              gap: { xs: "8px", md: "12px" },
            }}
          >
            {(therapist.images ?? []).map((src, idx) => (
              <Box
                key={`${src}-${idx}`}
                component="button"
                type="button"
                onClick={() => setGalleryIdx(idx)}
                aria-label={t(
                  "detail.gallery.tileAria",
                  "Open photo {{n}} of {{total}}",
                  {
                    n: idx + 1,
                    total: (therapist.images ?? []).length,
                  }
                )}
                sx={{
                  width: "100%",
                  aspectRatio: "1 / 1",
                  border: "none",
                  padding: 0,
                  cursor: "zoom-in",
                  borderRadius: "12px",
                  overflow: "hidden",
                  background: "#F7F7F6",
                  transition:
                    "transform 0.15s ease, box-shadow 0.15s ease",
                  "&:hover": {
                    transform: "translateY(-1px)",
                    boxShadow:
                      "0 6px 14px rgba(15, 23, 42, 0.10)",
                  },
                  "&:focus-visible": {
                    outline: "2px solid #8F8474",
                    outlineOffset: 2,
                  },
                }}
              >
                <Box
                  component="img"
                  src={src}
                  alt={`${therapist.name} photo ${idx + 1}`}
                  loading="lazy"
                  sx={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    display: "block",
                  }}
                />
              </Box>
            ))}
          </Box>
        )}
      </Box>

      {/* Lightbox — fullscreen photo viewer with prev/next/close.
          Backdrop dim + tap-to-close · warm-taupe glyphs · fixed z 9999
          so it floats above every other page chrome (sticky nav,
          detail hero, InfoSheet). Only mounted while `galleryIdx`
          is a number. */}
      {galleryIdx !== null &&
        (therapist.images ?? []).length > 0 && (
          <Box
            role="dialog"
            aria-modal="true"
            aria-label={t(
              "detail.gallery.lightboxAria",
              "Photo viewer"
            )}
            onClick={() => setGalleryIdx(null)}
            sx={{
              position: "fixed",
              inset: 0,
              zIndex: 9999,
              background: "rgba(0, 0, 0, 0.90)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "20px",
            }}
          >
            <Box
              component="button"
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setGalleryIdx(null);
              }}
              aria-label={t("detail.gallery.close", "Close")}
              sx={{
                position: "absolute",
                top: 20,
                right: 20,
                background: "rgba(255,255,255,0.10)",
                border: "none",
                borderRadius: "999px",
                width: 44,
                height: 44,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                transition: "background 0.15s ease",
                "&:hover": {
                  background: "rgba(255,255,255,0.20)",
                },
              }}
            >
              <CloseRoundedIcon
                sx={{ color: "#8F8474", fontSize: 26 }}
              />
            </Box>

            {(therapist.images ?? []).length > 1 && (
              <Box
                component="button"
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  const total = (therapist.images ?? []).length;
                  setGalleryIdx(
                    (galleryIdx - 1 + total) % total
                  );
                }}
                aria-label={t(
                  "detail.gallery.prev",
                  "Previous photo"
                )}
                sx={{
                  position: "absolute",
                  left: { xs: 12, md: 32 },
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "rgba(255,255,255,0.10)",
                  border: "none",
                  borderRadius: "999px",
                  width: 44,
                  height: 44,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  transition: "background 0.15s ease",
                  "&:hover": {
                    background: "rgba(255,255,255,0.20)",
                  },
                }}
              >
                <ChevronLeftRoundedIcon
                  sx={{ color: "#8F8474", fontSize: 28 }}
                />
              </Box>
            )}

            <Box
              component="img"
              src={(therapist.images ?? [])[galleryIdx]}
              alt={`${therapist.name} photo ${galleryIdx + 1}`}
              onClick={(e) => e.stopPropagation()}
              sx={{
                maxWidth: "92vw",
                maxHeight: "86vh",
                objectFit: "contain",
                borderRadius: "10px",
                boxShadow: "0 20px 60px rgba(0,0,0,0.50)",
              }}
            />

            {(therapist.images ?? []).length > 1 && (
              <Box
                component="button"
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  const total = (therapist.images ?? []).length;
                  setGalleryIdx((galleryIdx + 1) % total);
                }}
                aria-label={t(
                  "detail.gallery.next",
                  "Next photo"
                )}
                sx={{
                  position: "absolute",
                  right: { xs: 12, md: 32 },
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "rgba(255,255,255,0.10)",
                  border: "none",
                  borderRadius: "999px",
                  width: 44,
                  height: 44,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  transition: "background 0.15s ease",
                  "&:hover": {
                    background: "rgba(255,255,255,0.20)",
                  },
                }}
              >
                <ChevronRightRoundedIcon
                  sx={{ color: "#8F8474", fontSize: 28 }}
                />
              </Box>
            )}

            {/* Photo counter — bottom-center hairline. */}
            {(therapist.images ?? []).length > 1 && (
              <Typography
                sx={{
                  position: "absolute",
                  bottom: 24,
                  left: "50%",
                  transform: "translateX(-50%)",
                  fontFamily: SANS,
                  fontSize: "11px",
                  fontWeight: 700,
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  color: "rgba(255,255,255,0.75)",
                  background: "rgba(0,0,0,0.32)",
                  padding: "4px 10px",
                  borderRadius: "999px",
                }}
              >
                {galleryIdx + 1} / {(therapist.images ?? []).length}
              </Typography>
            )}
          </Box>
        )}

      {/* Phase 5 — StickyBookCTA removed (founder feedback 2026-05-01).
          Auto-navigate in goConfirmOrder() forwards the user to
          /booking/:id as soon as the merged sheet's Confirm fires, so the
          manual sticky 'Continue with X' bar was redundant. The
          component file is kept around in case we need a manual confirm
          fallback later. */}

      {/* 🆕 Round 28s210 — TherapistInfoSheet restored after founder
          feedback "กดดูไม่ได้". StatsCard cells reopen this sheet
          for the per-tab deep dive (reviews · profile · loyalty). */}
      <TherapistInfoSheet
        open={infoSheet !== null}
        onClose={() => setInfoSheet(null)}
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
          rating: displayRating,
          reviewCount: liveReviews.reviewCount,
          // Live reviews → mapped to the InfoSheet Review type
          //   { bookingId, rating, service, body, ago, verified }.
          // Round 28s212 — restored from e9480f6 after the 28s210
          //   "restore" passed wrong shape and crashed the page.
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
        color: "#1A2B2E",
        letterSpacing: "-0.02em",
        marginBottom: subtitle ? "4px" : "16px",
        "& em": {
          fontStyle: "italic",
          color: "#4B4B48",
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
          color: "rgba(15, 23, 42, 0.6)",
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
