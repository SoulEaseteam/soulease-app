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
//   introduced icons ImageRounded / GridViewRounded / StarRounded.
// 🆕 Round 28r88 — Tab bar removed; StatsCard (below hero) now
//   carries scroll-nav duty from the r85/r87 icon tabs. Icon imports
//   dropped along with the tab bar block.

import DetailHero from "@/components/therapist/detail/DetailHero";
// StatsCard removed Round 28s362 — replaced by inline chip row
// 🆕 28s344 — reuse the rich rebook/loyalty panel (benchmark · customer mix ·
//   rebook timing) inside the Reviews tab.
import { LoyaltyTab } from "@/components/therapist/detail/TherapistProfileTabs";
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
// 🆕 28s338 — icons for the restored Photos · Services · Reviews tab bar.
import ImageRoundedIcon from "@mui/icons-material/ImageRounded";
import GridViewRoundedIcon from "@mui/icons-material/GridViewRounded";
import StarRoundedIcon from "@mui/icons-material/StarRounded";
import FitnessCenterRoundedIcon from "@mui/icons-material/FitnessCenterRounded";
// Round 28s34 — Legacy-slug icons (Whatshot / SelfImprovement /
// DirectionsRun / PregnantWoman / EmojiNature / Psychology /
// Landscape) dropped along with the legacy entries in SERVICE_DISPLAY.
import SpaRoundedIcon from "@mui/icons-material/SpaRounded";
import LocalFloristRoundedIcon from "@mui/icons-material/LocalFloristRounded";
import VerifiedRoundedIcon from "@mui/icons-material/VerifiedRounded";
import SchoolRoundedIcon from "@mui/icons-material/SchoolRounded";
import ShieldRoundedIcon from "@mui/icons-material/ShieldRounded";
// 🆕 Round 28r88 — TherapistInfoSheet mount dropped. Founder
//   "ไม่ต้องป๊อปอัพ": the stats-cell tap now smooth-scrolls to a
//   section (Services / About / Photos) instead of opening the info
//   sheet popup. Component file stays on disk in case we ever
//   need to reintroduce a deep-dive tab.
import StatusPill from "@/components/therapist/detail/StatusPill";
// 🗑️ 28s350 — FeaturesPanel (Rolodex physical-descriptor table) retired
//   per founder ("Features ไม่ใช้แล้ว ลบ"). Component file kept on disk.
// 🗑️ 28s375 — BioStatsBar (28s351 pink strip) removed: 28s364 moved the
//   sex/height/weight/style data into StatsCard's bioCells prop, so the
//   standalone import was dead. StatsCard is the single bio surface now.
// 🆕 Round 28s364 — StatsCard renders bio data via bioCells prop
import StatsCard from "@/components/therapist/detail/StatsCard";
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
import { recordTherapistView } from "@/utils/therapistViews";
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
    icon: <LocalFloristRoundedIcon sx={{ fontSize: 18, color: "var(--sr-body)" }} />,
    short: "Aromatherapy",
  },
  "SR-HJ2200": {
    icon: <FitnessCenterRoundedIcon sx={{ fontSize: 18, color: "var(--sr-ink)" }} />,
    short: "Gentleman's Signature",
  },
  "SR-B2B3200": {
    icon: <AutoAwesomeRoundedIcon sx={{ fontSize: 18, color: "var(--sr-body)" }} />,
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
          <AutoAwesomeRoundedIcon sx={{ fontSize: 18, color: "var(--sr-body)" }} />
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
    // 🆕 28s351 — physical stats (height · build) now live in the
    //   BioStatsBar, so keep them OUT of the About prose fallback to avoid
    //   a duplicated facts line. aboutFacts (legacy InfoSheet API) keeps
    //   the full detail so that surface is unchanged.
    aboutFacts.push({
      icon: <StraightenRoundedIcon />,
      text: bodyChipParts.join(" · "),
      tone: "body",
    });
  }
  if (langText) {
    // 🆕 28s351 — language also lives in the BioStatsBar now; omit from the
    //   About prose fallback (kept in aboutFacts for InfoSheet).
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

  // 🆕 28s338 (founder 2026-07-08) — real tab bar restored (r85 style),
  //   replacing the r88 StatsCard scroll-nav ("แยกแถบหน้าใครหน้ามัน ไม่ต้อง
  //   กดแล้วเลื่อนลงมา"). Three tabs:
  //     • photos   — About (bio + features) then the gallery grid
  //     • services — the services picker
  //     • reviews  — StatsCard (Sessions · Rebook · rating) + review list
  //   Default = photos (its panel leads with About: "เอา about ขึ้นก่อน").
  const [detailTab, setDetailTab] = useState<
    "photos" | "services" | "reviews"
  >(() => {
    // 🆕 28s377 — initialise straight from the deep-link hash so a
    //   #services / #reviews link lands on the right tab WITHOUT an effect
    //   that re-runs on every render. That effect (dep: therapistFromReal,
    //   which is rebuilt fresh each render) was re-firing on every live-data
    //   tick and reverting the user's tab taps back to the hash's tab —
    //   founder "แท็บ บางทีกดได้บางทีกดไม่ได้". #photos/#gallery/#about + no
    //   hash all default to photos.
    if (typeof window !== "undefined") {
      const h = window.location.hash;
      if (h === "#services") return "services";
      if (h === "#reviews") return "reviews";
    }
    return "photos";
  });

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

  // 🆕 28s387 — record an anonymous profile view (deduped per browser).
  //   Best-effort; never blocks render. Fires once per id.
  useEffect(() => {
    recordTherapistView(id);
  }, [id]);

  useEffect(() => {
    // Only reach Firestore when hardcoded missed. Fast-path exit
    //   for the 12 originals means zero extra read on the paths
    //   customers hit today.
    // 🆕 28s347 — always load the LIVE Firestore row (even for therapists in
    //   the static @/data file) so the detail photo can match the home card,
    //   which always uses the Firestore image ("ยูริใช้คนละโปรไฟล์").
    if (!id) {
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

  // 🆕 28s348 (founder "ใช้อันใหม่ · ลบข้อมูลเก่าที่สร้าง") — prefer the LIVE
  //   Firestore record over the legacy static @/data/therapists data so every
  //   profile renders from ONE admin-managed source: consistent format, live
  //   photo, and whatever the admin edits. The static file is now only a
  //   fallback for a therapist not yet in Firestore. (All 14 current
  //   therapists carry features + bios in Firestore, so nothing is lost.)
  const realRow = firestoreRow ?? hardcodedRow;
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
      // 🆕 28s344 — rebook rate = repeatPct (repeat customers ÷ unique
      //   customers), matching the loyalty panel headline ("14 of 90
      //   customers booked again → 16%"). Reverts the 28s340 total-bookings
      //   formula so the top StatsCard and the Reviews-tab panel agree.
      t = {
        ...t,
        totalSessions: loyaltyStats.totalCompleted,
        rebookRate:
          loyaltyStats.uniqueCustomers > 0
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

  // 🆕 Round 28s221 — Show/Hide details toggle removed (founder
  //   "ปรับ แก้ ทั้ง tab About"). FEATURES + Credentials + Specialties
  //   + Languages now render always-visible under the About card.

  // 🆕 Round 28r88 — `detailTab` state + `infoSheet` state both
  //   deleted. The r85/r87 icon tab bar is gone (replaced by the
  //   scroll-nav stats bar below the hero) so nothing needs to track
  //   which section is "active"; the r87 IntersectionObserver
  //   underline is likewise obsolete. Stats-cell taps smooth-scroll
  //   to the target section directly — no popup, no active-tab
  //   marker to maintain.

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

  // 🆕 28s350 (founder "ดึงจาก Firestore แบบ Milo") — realRecord now mirrors
  //   realRow (Firestore-preferred) instead of reading the static
  //   @/data/therapists file, so distance / hours / live-status resolve from
  //   the SAME live doc that drives the rest of the profile. Firestore-only
  //   practitioners (Milo, Pare) now populate here too; the 12 static ones
  //   still fall back to @/data only if they're missing from Firestore.
  const realRecord = realRow ?? null;

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

  // 🆕 Round 28r84 → 28r87 → 28r88 — Hash-scroll into the target
  //   section on mount. r84 handled only `#gallery` (the card's
  //   PHOTOS pill); r87 extended coverage to every section id and
  //   treats `#gallery` as a legacy alias for `#photos`; r88 drops
  //   the `setDetailTab` call (state deleted along with the icon
  //   tab bar) but keeps the smooth-scroll unchanged so deep-links
  //   from external channels (TG, share sheet, etc.) still land
  //   inside the correct section. 220ms settle covers the Firestore
  //   fallback profile flash — see r66 hotfix note.
  // 🆕 28s343 — URL hash opens a TAB (was: scroll to a section). #services
  //   → Services tab (Book Now deep-links here), #photos/#gallery/#about →
  //   Photos tab (About lives there), #reviews → Reviews tab.
  // 🆕 28s377 — after mount, react ONLY to real hashchange events (browser
  //   back/forward to a #tab), never to render churn. Tapping a tab doesn't
  //   change the URL hash, so this can never fight the user's taps. The
  //   initial deep-link hash is handled by the useState initializer above.
  useEffect(() => {
    const applyHash = () => {
      const h = window.location.hash;
      const target: "photos" | "services" | "reviews" | null =
        h === "#services"
          ? "services"
          : h === "#reviews"
            ? "reviews"
            : h === "#gallery" || h === "#photos" || h === "#about"
              ? "photos"
              : null;
      if (target) setDetailTab(target);
    };
    window.addEventListener("hashchange", applyHash);
    return () => window.removeEventListener("hashchange", applyHash);
  }, []);

  // 🆕 Round 28r88 — IntersectionObserver useEffect (r87) removed.
  //   The observer's only job was syncing the icon tab bar's active
  //   underline to the section currently in the viewport. With the
  //   tab bar deleted, there's no consumer for that signal — the
  //   stats-cell scroll-nav is one-way (tap → scroll) and doesn't
  //   need a return trip.

  // Round 28s34 — Memoised Bayesian rating. Previously recomputed
  // on every parent render, even when reviews didn't change.
  // Round 28s371 — only show a real Bayesian rating; hide chip when
  // no Firestore reviews exist (was falling back to static "0.0").
  const displayRating = useMemo(
    () =>
      liveReviews.reviewCount > 0
        ? formatRating(bayesianRating(liveReviews.reviews))
        : "—",
    [liveReviews.reviewCount, liveReviews.reviews],
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
        <CircularProgress size={28} sx={{ color: "var(--sr-body)" }} />
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
            color: "var(--sr-ink)",
            marginBottom: "8px",
          }}
        >
          {t("detail.notFound.title", "Practitioner not found")}
        </Typography>
        <Typography
          sx={{
            fontSize: "13.5px",
            color: "var(--sr-body)",
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
            border: "1px solid var(--sr-hairline)",
            borderRadius: 999,
            background: "var(--sr-panel)",
            color: "var(--sr-ink)",
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
        background: "var(--sr-bg)",
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
          // 🆕 28s375 — mobile clearance so the floating chat button + the
          //   fixed bottom nav don't cover the last content row (audit #3).
          paddingBottom: { xs: "88px", md: "48px" },
        }}
      >
      {/* 🆕 Round 28r55 (Phase 3.4) — 2-column grid at md+.
          Mobile: flex-column stack in the r87 scroll-anchor order
          (DetailHero → StatusPill → sticky TabBar → Photos → Services
          → About). Uses CSS `order` on children so we can decouple
          mobile source-order concerns from the desktop grid layout.
          Desktop: left rail (DetailHero row 1 · Services picker row 2,
          sticky top) · right column (StatusPill row 1 · About row 2,
          scrolls independently) · Photos row 3 spans both columns.
          Tab bar hidden on md+ since all sections render
          simultaneously in the grid. */}
      <Box
        sx={{
          // 🆕 28s338 — single-column tabbed layout (was a 2-col md grid
          //   that showed every section at once). With real tabs only one
          //   panel shows, so the grid is dropped; children keep their
          //   `order` props → Hero → StatusPill+tabs → active panel.
          display: "flex",
          flexDirection: "column",
          maxWidth: { md: 760 },
          marginInline: { md: "auto" },
          padding: { xs: 0, md: "0 18px" },
        }}
      >
      {/* ── GRID CHILD 1 — DetailHero (col 1 row 1 on md+) ─────── */}
      <Box
        sx={{
          gridColumn: { md: "1" },
          gridRow: { md: "1" },
          order: { xs: 1 },
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
          // 🆕 Round 28s365 — rating chip next to name in hero
          rating={displayRating !== "—" ? displayRating : undefined}
          reviewCount={therapist.reviewCount > 0 ? therapist.reviewCount : undefined}
          // 🆕 Round 28s366 — stat chips under name
          totalSessions={therapist.totalSessions > 0 ? therapist.totalSessions : undefined}
          rebookRate={therapist.rebookRate || undefined}
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

      {/* ── GRID CHILD 2 — StatusPill + StatsCard (col 2 row 1 on md+;
             mobile order 2 · immediately below hero)
             🆕 Round 28r85 — StatsCard was moved INTO the About tab.
             🆕 Round 28r87 — StatsCard stayed in About tab; a separate
                Grid Child 2b hosted a sticky icon tab bar for scroll-nav.
             🆕 Round 28r88 — StatsCard moved BACK to its previous
                position (below the hero photo, above the section
                stack) per founder direction (2026-07-08 reference
                screenshot). Cells now trigger smooth-scroll to a
                target section — no InfoSheet popup ("ไม่ต้องป๊อปอัพ").
                The r85/r87 icon tab bar (Grid Child 2b) was deleted;
                its scroll-nav role transfers to the three stats cells:
                Sessions (leftmost) → Services · Rebook (middle) →
                About · Reviews (rightmost) → Photos. ── */}
      <Box
        sx={{
          gridColumn: { md: "2" },
          gridRow: { md: "1" },
          order: { xs: 2 },
        }}
      >
        {/* 🆕 Round 28s364 — StatsCard with bioCells (bio mode).
            White floating card (negative top overlap) with bio data:
            sex · height/weight · style · language.
            Replaces the pink BioStatsBar strip (28s363) at founder request:
            "กลับไปใช้ StatsCard เดิม เอา 238/16%/★4.5 ออก ใส่ sex/height/style/language แทน" */}
        {(() => {
          if (!realRecord?.features) return null;
          const f = realRecord.features;

          /** Append unit only when stored value is a bare number */
          const withUnit = (v: string | undefined | null, unit: string) => {
            const s = (v ?? "").trim();
            if (!s) return "";
            return /[a-zA-Z฀-๿]/.test(s) ? s : `${s} ${unit}`;
          };

          const sex = (f.gender ?? "").trim();
          const h = withUnit(f.height, "cm");
          const w = withUnit(f.weight, "kg");
          const heightWeight = [h, w].filter(Boolean).join(" / ");
          const bt = (f.bodyType ?? "").trim();
          const bust = (f.bustSize ?? "").trim();
          const looksMeasurement = /\d\s*[-–/]\s*\d/.test(bt);
          const style = looksMeasurement ? bt : bust || bt;
          // 🆕 Round 28s366 — 3 cols only; language moved below trust badges
          const bioCells = [
            { value: sex, label: "sex" },
            { value: heightWeight, label: "height / weight" },
            { value: style, label: "style" },
          ].filter((c) => c.value);

          if (bioCells.length === 0) return null;
          return (
            <StatsCard
              rating={displayRating}
              reviewCount={therapist.reviewCount}
              yearsExp={therapist.yearsExp}
              totalSessions={therapist.totalSessions}
              rebookRate={therapist.rebookRate ?? ""}
              bioCells={bioCells}
            />
          );
        })()}

        {/* 🆕 Round 28s365 — Trust badges row.
            Small frosted pill chips: ✓ Verified (always) ·
            ✓ Vaccinated (if features.vaccinated = Yes) ·
            ● Available (if online).
            Inspired by competitor reference (Ayla card trust signals). */}
        <Box
          sx={{
            display: "flex",
            gap: "6px",
            flexWrap: "wrap",
            margin: "10px 14px 0",
          }}
        >
          {/* 🕯️ 28t.8 — both trust chips share ONE calm treatment (was a
              mismatched blue + green pair that read cluttered). Subtle green
              "verified" tint · green ✓ · navy-grey text. */}
          {/* Always: Verified */}
          <Box
            sx={{
              display: "inline-flex",
              alignItems: "center",
              gap: "5px",
              background: "rgba(87,184,139,0.10)",
              border: "1px solid rgba(87,184,139,0.24)",
              borderRadius: "999px",
              padding: "4px 11px",
              fontFamily: '"Inter", system-ui, sans-serif',
              fontSize: "11px",
              fontWeight: 600,
              color: "var(--sr-body)",
              letterSpacing: "0.01em",
            }}
          >
            <Box component="span" sx={{ fontSize: "12px", lineHeight: 1, color: "#3EA575" }}>✓</Box>
            Data verified
          </Box>
          {/* Vaccinated — from features */}
          {realRecord?.features?.vaccinated === "Yes" && (
            <Box
              sx={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                background: "rgba(87,184,139,0.10)",
                border: "1px solid rgba(87,184,139,0.24)",
                borderRadius: "999px",
                padding: "4px 11px",
                fontFamily: '"Inter", system-ui, sans-serif',
                fontSize: "11px",
                fontWeight: 600,
                color: "var(--sr-body)",
                letterSpacing: "0.01em",
              }}
            >
              <Box component="span" sx={{ fontSize: "12px", lineHeight: 1, color: "#3EA575" }}>✓</Box>
              Vaccinated
            </Box>
          )}
          {/* 🗑️ 28s375 — "Available Now" trust badge removed. Live
              availability is already shown twice below (the green
              "พร้อมให้บริการ" status card WITH an arrival ETA, plus the
              hero status dot). Three indicators for one state violated the
              founder's own "don't show status twice" guardrail; the status
              card wins because it carries the arrival window. Trust badges
              now read Data verified · Vaccinated — matching the reference. */}
        </Box>

        {/* 🆕 28t.10 — Credentials moved back INTO the Photos tab, below the
            gallery (founder "ย้ายไป ด้านล่างรูป แถบ Photos"). See the About
            panel in GRID CHILD 4. */}

        {/* 🆕 Round 28s366 — About bio + Languages moved here (above tab bar).
            Replaces the same content previously shown inside the Photos tab. */}
        <Box sx={{ margin: "14px 14px 0" }}>
          <About
            name={therapist.name}
            rows={[]}
            facts={[]}
            body={therapist.about}
            gender={therapist.gender}
          />
        </Box>

        {/* Languages row — flag · name · level pills */}
        {therapist.langs.length > 0 && (
          <Box sx={{ margin: "10px 14px 0" }}>
            <Typography
              component="p"
              sx={{
                fontFamily: SANS,
                fontSize: "10px",
                fontWeight: 800,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: "var(--sr-muted)",
                marginBottom: "8px",
              }}
            >
              Languages
            </Typography>
            {/* 🆕 28t.9 — each language as a cute white pill card: flag ·
                name · colour-coded level badge (green NATIVE / grey else). */}
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {therapist.langs.map((l) => {
                const isNative = l.level.toUpperCase().includes("NATIVE");
                return (
                  <Box
                    key={l.name}
                    sx={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "7px",
                      padding: "6px 11px 6px 10px",
                      borderRadius: "999px",
                      background: "var(--sr-panel)",
                      border: "1px solid var(--sr-hairline)",
                      boxShadow: "0 2px 8px rgba(35,43,54,0.05)",
                    }}
                  >
                    <Box sx={{ fontSize: "15px", lineHeight: 1 }}>{l.flag}</Box>
                    <Typography
                      component="span"
                      sx={{
                        fontFamily: SANS,
                        fontSize: "13px",
                        fontWeight: 700,
                        color: "var(--sr-ink)",
                        lineHeight: 1,
                      }}
                    >
                      {l.name}
                    </Typography>
                    <Box
                      component="span"
                      sx={{
                        fontFamily: SANS,
                        fontSize: "8.5px",
                        fontWeight: 800,
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                        color: isNative ? "#2E7D57" : "var(--sr-muted)",
                        background: isNative
                          ? "rgba(87,184,139,0.14)"
                          : "rgba(139,147,160,0.14)",
                        borderRadius: "999px",
                        padding: "2px 7px",
                        lineHeight: 1.3,
                      }}
                    >
                      {l.level}
                    </Box>
                  </Box>
                );
              })}
            </Box>
          </Box>
        )}

        <Box sx={{ marginTop: "10px" }}>
          <StatusPill
            nextBookingAt={
              livePillStatus === "online" ? nextBookingAt : null
            }
            status={livePillStatus}
            nextAvailable={liveNextAvailable}
            // 🆕 28t.9 — tapping the pill jumps to the Services tab (book flow).
            onClick={() => {
              setDetailTab("services");
              requestAnimationFrame(() => {
                document
                  .getElementById("services")
                  ?.scrollIntoView({ behavior: "smooth", block: "start" });
              });
            }}
          />
        </Box>

        {/* 🆕 28s338 — real tab bar (Photos · Services · Reviews). Clicking
            switches the panel below (no scroll-nav). Shown on every
            viewport now that the layout is single-column. */}
        <Box
          role="tablist"
          aria-label={t("detail.tabsAria", "Practitioner overview tabs")}
          sx={{
            marginTop: "12px",
            padding: "0 18px",
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            borderBottom: "1px solid var(--sr-hairline)",
            // 🆕 28s345 — sit above the StatsCard (zIndex 5) so nothing can
            //   ever intercept tab taps ("แท็บ กดไม่ได้ทั้ง 3").
            position: "relative",
            zIndex: 10,
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
                id: "reviews" as const,
                icon: <StarRoundedIcon sx={{ fontSize: 22 }} />,
                label: t("detail.tabs.reviews", "Reviews"),
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
                  // 🆕 28s345 — immediate taps on mobile (no double-tap-zoom
                  //   delay / gesture ambiguity that can eat the first tap).
                  touchAction: "manipulation",
                  WebkitTapHighlightColor: "transparent",
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
                  color: isActive ? "var(--sr-ink)" : "var(--sr-body)",
                  "& .tab-icon": {
                    color: isActive ? "#2EC4B0" : "#8F8474",
                    transition: "color 0.18s ease",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  },
                  "&:hover .tab-icon": {
                    color: isActive ? "#2EC4B0" : "var(--sr-body)",
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

        {/* 🆕 28s341 — Reviews panel = the review list only. StatsCard moved
            up to the hero region (always visible). */}
        <Box sx={{ display: detailTab === "reviews" ? "block" : "none" }}>
          <Box sx={{ ...responsiveShell, padding: "16px 20px 24px" }}>
            {/* 🆕 28s344 (founder ref image) — the rich rebook/loyalty panel
                at the top of the Reviews tab: "16% · 14 of 90 …" headline,
                Bangkok-avg benchmark, customer mix, and rebook-timing bars.
                Reused from TherapistProfileTabs (LoyaltyTab) wired to the
                live loyaltyStats. */}
            <Box sx={{ marginBottom: "20px" }}>
              {/* 🆕 28s375 — feed the DENORMALIZED doc stats (same source as
                  the hero "238 sessions · 16% rebook" chips) so the panel
                  stays consistent for anonymous guests, who can read the
                  world-readable therapists doc but NOT the PII-gated raw
                  bookings (audit #1). Live loyaltyStats still overrides with
                  the rich breakdown once an authenticated read succeeds. */}
              <LoyaltyTab
                rebookPct={
                  parseFloat(String(therapist.rebookRate).replace("%", "")) || 0
                }
                totalSessions={therapist.totalSessions}
                loyaltyStats={loyaltyStats}
              />
            </Box>

            {/* 🆕 28s339 — Reviews render DIRECTLY from the live hook
                (useTherapistReviews → rated bookings), founder "ดึงข้อมูลจริง".
                Shows a loading spinner, a real empty state, or the real
                review list with per-review star rating + service·time +
                verified badge. No mock fallback. */}
            {liveReviews.loading ? (
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  padding: "24px 0",
                }}
              >
                <CircularProgress size={22} />
              </Box>
            ) : liveReviews.reviewCount === 0 ? (
              <Typography
                sx={{
                  fontFamily: SANS,
                  fontSize: 13,
                  color: "var(--sr-muted)",
                  textAlign: "center",
                  padding: "24px 0",
                }}
              >
                {t("detail.reviews.empty", "No reviews yet.")}
              </Typography>
            ) : (
              <Box
                sx={{ display: "flex", flexDirection: "column", gap: "12px" }}
              >
                {/* Rating summary — real average + count */}
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    marginBottom: "4px",
                  }}
                >
                  <Typography
                    sx={{
                      fontFamily: SERIF,
                      fontSize: 30,
                      fontWeight: 600,
                      color: "var(--sr-ink)",
                      lineHeight: 1,
                    }}
                  >
                    {liveReviews.avgRating.toFixed(1)}
                  </Typography>
                  <Box sx={{ display: "flex" }} aria-hidden="true">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <StarRoundedIcon
                        key={n}
                        sx={{
                          fontSize: 17,
                          color:
                            n <= Math.round(liveReviews.avgRating)
                              ? "#E0A82E"
                              : "var(--sr-dim)",
                        }}
                      />
                    ))}
                  </Box>
                  <Typography
                    sx={{
                      fontFamily: SANS,
                      fontSize: 12,
                      color: "var(--sr-muted)",
                    }}
                  >
                    {t("detail.reviews.count", "{{n}} reviews", {
                      n: liveReviews.reviewCount,
                    })}
                  </Typography>
                </Box>

                {/* Real review cards */}
                {liveReviews.reviews.map((r) => (
                  <Box
                    key={r.bookingId}
                    sx={{
                      padding: "14px 16px",
                      background: "var(--sr-panel)",
                      border: "1px solid var(--sr-hairline)",
                      borderRadius: "14px",
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "8px",
                        marginBottom: "6px",
                      }}
                    >
                      <Box sx={{ display: "flex" }} aria-hidden="true">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <StarRoundedIcon
                            key={n}
                            sx={{
                              fontSize: 14,
                              color:
                                n <= Math.round(r.rating)
                                  ? "#E0A82E"
                                  : "var(--sr-dim)",
                            }}
                          />
                        ))}
                      </Box>
                      {r.verified && (
                        <Typography
                          sx={{
                            fontFamily: SANS,
                            fontSize: 9.5,
                            fontWeight: 800,
                            letterSpacing: "0.08em",
                            textTransform: "uppercase",
                            color: "#2E7D5B",
                          }}
                        >
                          {t("detail.reviews.verified", "Verified")}
                        </Typography>
                      )}
                    </Box>
                    <Typography
                      sx={{
                        fontFamily: SERIF,
                        fontSize: 13.5,
                        lineHeight: 1.5,
                        color: "var(--sr-body)",
                      }}
                    >
                      {r.body}
                    </Typography>
                    {(r.service || r.ago) && (
                      <Typography
                        sx={{
                          fontFamily: SANS,
                          fontSize: 10.5,
                          letterSpacing: "0.04em",
                          textTransform: "uppercase",
                          color: "var(--sr-dim)",
                          marginTop: "8px",
                        }}
                      >
                        {[r.service, r.ago].filter(Boolean).join(" · ")}
                      </Typography>
                    )}
                  </Box>
                ))}
              </Box>
            )}
          </Box>
        </Box>
      </Box>
      {/* ── END GRID CHILD 2 ────────────────────────────────────── */}

      {/* ── GRID CHILD 4 — About section (col 2 row 2 on md+)
             🆕 Round 28r55 (Phase 3.4) — was `{detailTab === "about"
             && (...)}`. Now rendered unconditionally with display
             toggled by breakpoint + tab state.
             🆕 Round 28r87 — display-conditional dropped: sections
             now render stacked simultaneously on mobile and the
             sticky tab bar smooth-scrolls between them. `id="about"`
             is the IntersectionObserver + hash-scroll anchor;
             `scrollMarginTop: 90px` lands the section BELOW the
             sticky tab bar when scrolled to. Same panel content,
             same handlers. ── */}
      <Box
        id="about"
        role="tabpanel"
        sx={{
          // 🆕 28s338 — About lives in the Photos tab (shown above the
          //   gallery). Hidden on other tabs.
          display: detailTab === "photos" ? "block" : "none",
          gridColumn: { md: "2" },
          gridRow: { md: "2" },
          // 🆕 Round 28r88 — Mobile stack reordered per founder
          //   direction (2026-07-08): About → Services → Photos
          //   ("เอา about ขึ้นก่อน เลื่อน เจอ Photos"). Was `order: 6`
          //   (bottom of stack) in r87.
          order: { xs: 3 },
          paddingTop: { xs: "24px", md: "16px" },
          scrollMarginTop: { xs: "24px", md: "24px" },
        }}
      >
          {/* 🆕 Round 28r88 — StatsCard removed from here; moved back
              above the section stack (below hero) per founder direction
              2026-07-08 ("เอาแถบนี้ ไปยุที่เดิม ซ้อนอยู่ใต้รูป"). Cell
              taps now scroll-nav instead of opening InfoSheet. */}

          {/* 🆕 Round 28s366 — About moved above tab bar (below trust badges).
              Not rendered here anymore. */}

          {/* 🆕 28t.10 — Discovery Reservation callout removed (founder "เอาออก"). */}

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
            {/* BioStatsBar moved to always-visible section (Round 28s361)
                above the tab bar — no longer rendered here. */}

            {/* 🆕 28t.9 — Credentials moved OUT of the Photos tab up to the
                info column right below the hero photo (founder "Credentials
                ย้ายไปด้านล่างรูป"). See GRID CHILD 2. */}

            {/* Round 28s366 — Specialties + Languages removed from Photos tab.
                Languages moved to below trust badges (above tab bar).
                Specialties removed per founder request. */}

            {/* Round 28s52 — Working hours moved to the DetailHero
                info overlay (next to Allow location + status pill)
                per founder ask. No longer rendered as an About-tab
                section. */}
          </Box>
        </Box>
      {/* ── END GRID CHILD 4 (About panel) ──────────────────────── */}

      {/* ── GRID CHILD 3 — Services picker / Reserve rail
             (col 1 row 2 on md+; mobile: order 5, always visible)
             🆕 Round 28r55 (Phase 3.4) — was `{detailTab === "services"
             && (...)}`. Now a permanent grid child. On desktop this
             sits under the DetailHero in the left rail and is
             `position: sticky` so the Reserve action stays anchored
             while the About column scrolls independently on the right.
             🆕 Round 28r87 — display-conditional dropped: sections
             now render stacked simultaneously on mobile and the sticky
             tab bar smooth-scrolls between them. `id` renamed from the
             internal `tdp-service-picker` to `services` to match the
             tab bar's scroll-anchor id and the URL hash `#services`.
             `scrollMarginTop: 90px` on mobile drops the section BELOW
             the sticky tab bar when smooth-scrolled to. ── */}
      {/* 🆕 Round 28s222 — Services tab redesign (founder "tab service
          ปรับแก้"): SERIF title → SANS 700 for legibility consistency
          (matches Services / How-to-book / About / Admin audits).
          Eyebrow + title redundancy collapsed into one eyebrow header
          (the cards already announce "Services" visually). Hint text
          tightened from a chatty two-line nudge to a single concierge
          line. */}
      <Box
        id="services"
        role="tabpanel"
        sx={{
          // 🆕 28s338 — Services tab.
          display: detailTab === "services" ? "block" : "none",
          gridColumn: { md: "1" },
          gridRow: { md: "2" },
          // 🆕 Round 28r88 — Mobile stack reordered: About(3) →
          //   Services(4) → Photos(5). Was `order: 5` under r87.
          order: { xs: 4 },
          position: { md: "sticky" },
          top: { md: 24 },
          padding: { xs: "24px 20px 20px", md: "20px 0 24px" },
          scrollMarginTop: { xs: "24px", md: "24px" },
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
            color: "var(--sr-body)",
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
            color: "var(--sr-muted)",
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
            color: "var(--sr-body)",
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

      {/* ── GRID CHILD 4 — Photos section (col span-all row 3 on
             md+; mobile order 4: FIRST of the stacked scroll-anchor
             sections)
             🆕 Round 28r84 — Card PHOTOS pill routes here. Responsive
             grid (2 col mobile · 3 col tablet · 4 col desktop) of the
             practitioner's Cloudinary-enhanced gallery. Tapping any
             tile opens the full-screen lightbox below. Empty state
             renders a Nordic neutral card so guests understand there
             just isn't more content yet (no broken link).
             🆕 Round 28r85 — Was the Photos TAB content (hide/show).
             🆕 Round 28r87 — MOVED into the responsive grid as a
             proper grid child (previously sat below the grid, outside
             the mobile flex reorder). Same content, same lightbox.
             `id` renamed from `gallery` → `photos` to match the sticky
             tab bar's scroll-anchor id and the URL hash `#photos`;
             legacy `#gallery` still works because the hash-scroll
             useEffect above aliases it to the `photos` element. ── */}
      <Box
        id="photos"
        role="tabpanel"
        sx={{
          // 🆕 28s338 — gallery lives in the Photos tab, below About.
          display: detailTab === "photos" ? "block" : "none",
          gridColumn: { md: "1 / -1" },
          gridRow: { md: "3" },
          // 🆕 Round 28r88 — Mobile stack reordered: About(3) →
          //   Services(4) → Photos(5). Photos now bottom of the mobile
          //   stack per founder: "reviews= Photos · about (เอา about
          //   ขึ้นก่อน เลื่อน เจอ Photos)". Was `order: 4` under r87
          //   (top of stack).
          order: { xs: 5 },
          padding: {
            xs: "24px 20px 8px",
            md: "32px 18px 12px",
          },
          scrollMarginTop: { xs: "24px", md: "24px" },
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
            color: "var(--sr-body)",
            marginBottom: "14px",
          }}
        >
          {t("detail.gallery.title", "Photos")}
        </Typography>

        {(therapist.images ?? []).length === 0 ? (
          <Box
            sx={{
              padding: "40px 20px",
              background: "var(--sr-panel-2)",
              borderRadius: "16px",
              textAlign: "center",
            }}
          >
            <Typography
              sx={{
                fontFamily: SANS,
                fontSize: "13px",
                fontWeight: 500,
                color: "var(--sr-body)",
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
                  background: "var(--sr-panel-2)",
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

        {/* 🆕 28t.10 — Credentials below the gallery in the Photos tab
            (founder "Credentials ย้ายไป ด้านล่างรูป แถบ Photos"). Rose
            rounded icon chip + label. */}
        {therapist.creds.length > 0 && (
          <Box sx={{ marginTop: "26px" }}>
            <Typography
              component="p"
              sx={{
                fontFamily: SANS,
                fontSize: "11px",
                fontWeight: 800,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "var(--sr-body)",
                marginBottom: "14px",
              }}
            >
              {t("detail.about.credentials", "Credentials")}
            </Typography>
            <Box sx={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {therapist.creds.map((c) => (
                <Box
                  key={c.label}
                  sx={{ display: "flex", alignItems: "center", gap: "12px" }}
                >
                  <Box
                    sx={{
                      width: 36,
                      height: 36,
                      borderRadius: "11px",
                      flexShrink: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "rgba(217,124,149,0.12)",
                      color: "#D97C95",
                      "& svg": { fontSize: 19 },
                    }}
                  >
                    {c.icon}
                  </Box>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography
                      sx={{
                        fontFamily: SANS,
                        fontSize: "13.5px",
                        fontWeight: 700,
                        color: "var(--sr-ink)",
                        lineHeight: 1.25,
                      }}
                    >
                      {c.label}
                    </Typography>
                    <Typography
                      sx={{
                        fontFamily: SANS,
                        fontSize: "11.5px",
                        color: "var(--sr-muted)",
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
      </Box>
      {/* ── END GRID CHILD 4 (Photos) ──────────────────────────── */}
      </Box>
      {/* ── END responsive 2-col grid wrapper ───────────────────── */}

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

      {/* 🆕 Round 28r88 — TherapistInfoSheet mount dropped along with
          the InfoSheet state. Founder "ไม่ต้องป๊อปอัพ": stats-cell
          taps now smooth-scroll to Services / About / Photos sections
          directly instead of opening the sheet. Component file stays
          on disk in case we ever want to reintroduce a deep-dive tab
          from another entry point. */}

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
      borderTop: "1px solid var(--sr-hairline)",
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
        color: "var(--sr-ink)",
        letterSpacing: "-0.02em",
        marginBottom: subtitle ? "4px" : "16px",
        "& em": {
          fontStyle: "italic",
          color: "var(--sr-body)",
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
          color: "var(--sr-muted)",
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
