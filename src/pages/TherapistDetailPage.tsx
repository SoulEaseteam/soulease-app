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
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

import DetailHero from "@/components/therapist/detail/DetailHero";
import StatsCard from "@/components/therapist/detail/StatsCard";
import { About } from "@/components/therapist/detail/DetailSections";
import TherapistInfoSheet from "@/components/therapist/detail/TherapistInfoSheet";
import StatusPill from "@/components/therapist/detail/StatusPill";
import StickyBookCTA from "@/components/therapist/detail/StickyBookCTA";

// 🆕 Phase 4 — Pricing + Calendar legacy sections REPLACED by the booking
//   flow's own pickers, surfaced here on the detail page so the user can
//   pick service+duration+date+time inline. Booking flow then opens at
//   "Where should we go?" (Step 3) instead of restarting from Step 1.
import StepService from "@/components/booking/StepService";
import DateTimePickerCell from "@/components/booking/DateTimePickerCell";
import DateTimeSheet from "@/components/booking/DateTimeSheet";
import {
  startingPrice,
  priceForDuration,
  formatTHB,
} from "@/utils/servicePricing";
import {
  bayesianRatingFromAggregate,
  formatRating,
} from "@/utils/rating";
import services from "@/data/services";

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
  rebookRate: string;
  about: string;
  creds: { icon: string; label: string; meta: string }[];
  specs: { icon: string; name: string; yrs: string }[];
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

const MAI: DemoTherapist = {
  id: "mai",
  name: "Mai",
  age: 28,
  area: "Sukhumvit",
  distance: "1.2 km",
  online: true,
  photoBg: "linear-gradient(135deg, #d4a574, #8b6f47)",

  rating: "4.9",
  reviewCount: 203,
  yearsExp: 8,
  rebookRate: "98%",

  about:
    "Eight years specializing in traditional Thai and oil massage. Licensed by the Thai Ministry of Public Health, trained at Wat Pho. Speaks Mandarin natively, English fluently. Travels with full equipment to hotels across Bangkok.",

  creds: [
    {
      icon: "✓",
      label: "Thai Ministry of Public Health License",
      meta: "ผ.พ. 67-12-3456-7890 · Verified",
    },
    {
      icon: "🎓",
      label: "Wat Pho Traditional Massage Diploma",
      meta: "2017 · 800 hours certified",
    },
    {
      icon: "🛡",
      label: "Background-checked",
      meta: "Last verified: Apr 2026",
    },
  ],

  specs: [
    { icon: "🌿", name: "Thai Traditional", yrs: "8 yrs · 1,400+ sessions" },
    { icon: "💆", name: "Oil Relaxation", yrs: "6 yrs · 900+ sessions" },
    { icon: "🌸", name: "Aromatherapy", yrs: "4 yrs · 320+ sessions" },
    { icon: "🤰", name: "Pre-natal", yrs: "Certified · 2 yrs" },
  ],

  langs: [
    { flag: "🇨🇳", name: "Mandarin", level: "Native" },
    { flag: "🇬🇧", name: "English", level: "Fluent" },
    { flag: "🇹🇭", name: "Thai", level: "Native" },
  ],

  pricing: [
    { name: "Thai Traditional", duration: "60 min", price: "฿1,800" },
    { name: "Thai Traditional", duration: "90 min", price: "฿2,500" },
    { name: "Oil Relaxation", duration: "60 min", price: "฿2,000" },
    { name: "Aromatherapy", duration: "90 min", price: "฿2,500" },
  ],

  days: [
    { dow: "Today", num: "30" },
    { dow: "Fri", num: "01" },
    { dow: "Sat", num: "02" },
    { dow: "Sun", num: "03", unavailable: true },
    { dow: "Mon", num: "04" },
    { dow: "Tue", num: "05" },
    { dow: "Wed", num: "06" },
  ],

  slots: [
    { time: "14:00", taken: true },
    { time: "15:00", taken: true },
    { time: "16:00" },
    { time: "17:00" },
    { time: "18:00" },
    { time: "19:00" },
    { time: "20:00" },
    { time: "21:00" },
  ],

  reviewBuckets: [
    { num: 5, count: 173, pct: 85 },
    { num: 4, count: 24, pct: 12 },
    { num: 3, count: 4, pct: 2 },
    { num: 2, count: 1, pct: 1 },
    { num: 1, count: 1, pct: 0.5 },
  ],

  reviews: [
    {
      initial: "L",
      name: "Li Wen",
      flag: "🇨🇳",
      meta: "2 weeks ago · Thai 90min · Anantara",
      quote:
        "Mai是非常专业的按摩师。我中文交流毫无障碍，按摩技术非常好。下次来曼谷一定再预约。",
    },
    {
      initial: "D",
      name: "David R.",
      flag: "🇬🇧",
      meta: "1 month ago · Oil 60min · St. Regis",
      quote:
        "Punctual, professional, exactly what I needed after a 14-hour flight. Will book again on next trip.",
    },
    {
      initial: "A",
      name: "Amelia C.",
      flag: "🇸🇬",
      meta: "2 months ago · Thai 60min · Park Hyatt",
      quote:
        "Absolutely professional. Mai brought all her own equipment and oils. The session was deeply restorative.",
    },
  ],
};

// Other therapists — overrides on top of MAI's structure so we don't
// duplicate the whole shape. Matches `TherapistsBrowsePage` DEMO list.
const DEMO_BY_ID: Record<string, DemoTherapist> = {
  mai: MAI,
  ploy: {
    ...MAI,
    id: "ploy",
    name: "Ploy",
    age: 26,
    distance: "2.4 km",
    photoBg: "linear-gradient(135deg, #e8c4a0, #c89968)",
    rating: "5.0",
    reviewCount: 167,
    yearsExp: 6,
    rebookRate: "96%",
    about:
      "Six years specializing in aromatherapy and pre-natal massage. Licensed by the Thai Ministry of Public Health. Speaks Japanese and English. Trained in essential oil therapy at the Bangkok School of Aromatherapy.",
    specs: [
      { icon: "🌸", name: "Aromatherapy", yrs: "6 yrs · 1,100+ sessions" },
      { icon: "🤰", name: "Pre-natal", yrs: "Certified · 3 yrs" },
      { icon: "💆", name: "Oil Relaxation", yrs: "5 yrs · 700+ sessions" },
    ],
    langs: [
      { flag: "🇯🇵", name: "Japanese", level: "Fluent" },
      { flag: "🇬🇧", name: "English", level: "Fluent" },
      { flag: "🇹🇭", name: "Thai", level: "Native" },
    ],
  },
  nan: {
    ...MAI,
    id: "nan",
    name: "Nan",
    age: 31,
    distance: "3.1 km",
    online: false,
    photoBg: "linear-gradient(135deg, #c89c7a, #6b4a2f)",
    rating: "4.8",
    reviewCount: 412,
    yearsExp: 10,
    rebookRate: "99%",
    about:
      "Ten years specializing in sport recovery and deep-tissue massage. Licensed by the Thai Ministry of Public Health. Speaks Korean and English. Trained in athletic therapy at Mahidol University.",
    specs: [
      { icon: "🔥", name: "Sport Recovery", yrs: "10 yrs · 2,400+ sessions" },
      { icon: "💪", name: "Deep Tissue", yrs: "8 yrs · 1,800+ sessions" },
      { icon: "🌿", name: "Thai Traditional", yrs: "10 yrs · 1,900+ sessions" },
    ],
    langs: [
      { flag: "🇰🇷", name: "Korean", level: "Fluent" },
      { flag: "🇬🇧", name: "English", level: "Fluent" },
      { flag: "🇹🇭", name: "Thai", level: "Native" },
    ],
  },
  fern: {
    ...MAI,
    id: "fern",
    name: "Fern",
    age: 24,
    distance: "2.8 km",
    photoBg: "linear-gradient(135deg, #f4d4b4, #d4a574)",
    rating: "4.9",
    reviewCount: 89,
    yearsExp: 5,
    rebookRate: "94%",
    about:
      "Five years specializing in Thai traditional and aromatherapy. Licensed by the Thai Ministry of Public Health. Speaks Mandarin and English. Trained at Wat Pho.",
    specs: [
      { icon: "🌿", name: "Thai Traditional", yrs: "5 yrs · 800+ sessions" },
      { icon: "🌸", name: "Aromatherapy", yrs: "3 yrs · 320+ sessions" },
    ],
  },
  wan: {
    ...MAI,
    id: "wan",
    name: "Wan",
    age: 29,
    distance: "3.8 km",
    online: false,
    photoBg: "linear-gradient(135deg, #d8b89c, #a08060)",
    rating: "4.9",
    reviewCount: 276,
    yearsExp: 7,
    rebookRate: "97%",
    about:
      "Seven years specializing in oil relaxation and aromatherapy. Licensed by the Thai Ministry of Public Health. Speaks Japanese, Mandarin, and English.",
    specs: [
      { icon: "💆", name: "Oil Relaxation", yrs: "7 yrs · 1,500+ sessions" },
      { icon: "🌸", name: "Aromatherapy", yrs: "5 yrs · 800+ sessions" },
    ],
    langs: [
      { flag: "🇯🇵", name: "Japanese", level: "Fluent" },
      { flag: "🇨🇳", name: "Mandarin", level: "Fluent" },
      { flag: "🇬🇧", name: "English", level: "Fluent" },
      { flag: "🇹🇭", name: "Thai", level: "Native" },
    ],
  },
  aom: {
    ...MAI,
    id: "aom",
    name: "Aom",
    age: 27,
    distance: "1.8 km",
    photoBg: "linear-gradient(135deg, #e8d0b4, #b89878)",
    rating: "5.0",
    reviewCount: 134,
    yearsExp: 6,
    rebookRate: "98%",
    about:
      "Six years specializing in Thai traditional and sport recovery. Licensed by the Thai Ministry of Public Health. Speaks Mandarin and English.",
    specs: [
      { icon: "🌿", name: "Thai Traditional", yrs: "6 yrs · 1,000+ sessions" },
      { icon: "🔥", name: "Sport Recovery", yrs: "4 yrs · 540+ sessions" },
    ],
  },
};

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

// Build a DemoTherapist shape from a real Therapist record. Mockup-only
// fields (about / creds / specs / langs / reviews / etc) reuse Mai's
// content as a placeholder until Task 7 wires real data per therapist.
function buildFromReal(real: Therapist): DemoTherapist {
  const ageStr = real.features.age ?? "";
  const ageNum = ageStr ? parseInt(ageStr, 10) || 28 : 28;

  // 🖼 Cloudinary-enhanced gallery — cover (`real.image`) first, then
  //    `real.gallery` deduped. Falls back to gradient if no images.
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

  return {
    ...MAI, // mockup placeholder content for sections we don't have data for
    id: real.id,
    name: real.name,
    age: ageNum,
    photoBg,
    images,
    rating: real.rating.toFixed(1),
    reviewCount: real.reviews ?? 0,
    yearsExp: typeof real.experience === "number" ? real.experience : MAI.yearsExp,
  };
}

const TherapistDetailPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { id } = useParams();

  // 🔌 3-tier lookup chain:
  //   1. `therapistsData[id]` (real Yuri/Jimmy/Hami/...) — wire real name/
  //      age/rating/photo on top of Mai's mockup content for the sections
  //      we don't have data for yet (about/creds/specs/langs/reviews).
  //   2. `DEMO_BY_ID[id]` (mai/ploy/nan/fern/wan/aom from Browse page DEMO).
  //   3. MAI as last-resort fallback.
  const therapist: DemoTherapist = (() => {
    if (id) {
      const real = therapistsData.find((t) => t.id === id);
      if (real) return buildFromReal(real);
      if (DEMO_BY_ID[id]) return DEMO_BY_ID[id];
    }
    return MAI;
  })();

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

  // 🆕 Phase 4 — Date+Time picker now lives in a bottom sheet so the
  //    detail page surfaces a compact cell instead of an always-expanded
  //    grid that ate ~700px of vertical space.
  const [dateTimeSheetOpen, setDateTimeSheetOpen] = useState(false);

  // Resolve the picked service object (if any) for header/sticky CTA copy.
  const selectedService =
    services.find((s) => s.id === selection.serviceId) ?? null;

  return (
    <Box
      sx={{
        // .phone — verbatim
        maxWidth: "430px",
        margin: "0 auto",
        background: "linear-gradient(180deg, #FFF8F0 0%, #FCEBDC 100%)",
        borderRadius: "28px",
        overflow: "hidden",
        boxShadow: "0 20px 60px rgba(126, 30, 46, 0.15)",
        position: "relative",
        minHeight: "100vh",
      }}
    >
      <DetailHero
        name={therapist.name}
        age={therapist.age}
        area={therapist.area}
        distance={therapist.distance}
        online={therapist.online}
        photoBg={therapist.photoBg}
        images={therapist.images}
      />

      <StatsCard
        // ⭐ Bayesian rating — same algorithm used in the Reviews tab so
        //    the headline + tab agree. Uses the demo aggregate fields
        //    (sumOfRatings ≈ rating × reviewCount when reviews stored
        //    only as count + average — Firestore wiring in Task 7 will
        //    pass the actual review list for exact computation).
        rating={formatRating(
          bayesianRatingFromAggregate(
            parseFloat(therapist.rating) * therapist.reviewCount,
            therapist.reviewCount
          )
        )}
        reviewCount={therapist.reviewCount}
        yearsExp={therapist.yearsExp}
        rebookRate={therapist.rebookRate}
        // Tap-to-open info sheet — saves vertical space on the detail page
        onTapRating={() => setInfoSheet("reviews")}
        onTapProfile={() => setInfoSheet("profile")}
        onTapLoyalty={() => setInfoSheet("loyalty")}
      />

      {/* 🆕 Phase 4 — Live availability pill (pattern 3 from Aine reference,
          adapted into our brand). Surfaces estimated-arrival copy when
          the therapist is online; offers a 'Wait or switch?' nudge when
          busy. Status comes from the same online/busy/offline taxonomy
          used by TherapistCard + DetailHero. */}
      <StatusPill
        status={therapist.online ? "online" : "offline"}
        nextAvailable={null}
      />

      <About name={therapist.name} body={therapist.about} />

      {/* 🆕 Phase 4 — TherapistProfileTabs lives inside <TherapistInfoSheet/>
          now (rendered at the bottom of the page). It opens when the user
          taps a stat-card cell. Removes ~600px of always-visible vertical
          space so the booking picker lands one screen earlier. */}

      {/* 🆕 Phase 4 — Inline picker (replaces legacy Pricing + Calendar)
          Service tap → bottom sheet picks 60/90/120 → date pills + time
          slot grid → user lands on /booking/:id?service=…&date=… and
          jumps straight to "Where should we go?". */}
      {/* 🆕 Phase 4 — Service + DateTime pickers stay on DetailPage; the
          single-page Reservation Order at /booking/:id picks up where
          these left off (location + customer details + payment).
          Service heading + helper copy follow sunred-booking3 mockup. */}
      <PickerSection
        title={
          <>
            What kind of <em>session</em>?
          </>
        }
        subtitle={t(
          "detail.picker.serviceSubtitle",
          "Select your service and preferred duration."
        )}
      >
        {/* Sub-header above the cards (mockup: 'Service') */}
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
          therapistId={therapist.id}
          onChange={(serviceId, duration) =>
            setSelection((p) => ({
              ...p,
              serviceId,
              duration,
              // changing service may change min slot in booking flow
              time: null,
            }))
          }
        />

        {/* Helper copy under the cards — chat fallback for edge requests */}
        <Typography
          sx={{
            fontFamily: SANS,
            fontSize: "12px",
            color: "rgba(60, 30, 20, 0.5)",
            textAlign: "center",
            marginTop: "14px",
            lineHeight: 1.5,
          }}
        >
          {t(
            "detail.picker.serviceHint",
            "Can't find what you're looking for? Chat with us for more options."
          )}
        </Typography>
      </PickerSection>

      {/* 🆕 Phase 4 — Date+Time is a compact cell now. Tap → opens the
          full date pills + time grid in a bottom sheet. Cell summarizes
          'Today · 17:00 · 1h 30m' inline so the detail page stays short. */}
      <PickerSection
        title={
          <>
            When works <em>for you</em>?
          </>
        }
        subtitle={
          selectedService
            ? t(
                "detail.picker.timeSubtitle",
                "{{name}} · {{duration}} min · {{price}}",
                {
                  name: selectedService.name,
                  duration: selection.duration ?? selectedService.duration,
                  price: formatTHB(
                    selection.duration
                      ? priceForDuration(selectedService, selection.duration)
                      : startingPrice(selectedService)
                  ),
                }
              )
            : t(
                "detail.picker.timeHint",
                "Pick a service above to unlock time slots."
              )
        }
        muted={!selectedService}
      >
        <DateTimePickerCell
          date={selection.date}
          time={selection.time}
          durationMin={selection.duration}
          enabled={!!selectedService}
          onClick={() => setDateTimeSheetOpen(true)}
        />
      </PickerSection>

      {/* (Reviews moved into TherapistProfileTabs as Tab 2.) */}

      <StickyBookCTA
        therapistId={therapist.id}
        therapistName={therapist.name}
        fromPrice={
          selectedService
            ? formatTHB(
                selection.duration
                  ? priceForDuration(selectedService, selection.duration)
                  : startingPrice(selectedService)
              )
            : therapist.pricing[0].price
        }
        duration={selection.duration ? `${selection.duration}min` : "—"}
        selectedSlot={selection.time ?? ""}
        serviceId={selection.serviceId}
        durationMin={selection.duration}
        date={selection.date}
        time={selection.time}
      />

      {/* 🆕 Phase 4 — Date+Time bottom sheet. Opens from the cell. */}
      <DateTimeSheet
        open={dateTimeSheetOpen}
        onClose={() => setDateTimeSheetOpen(false)}
        date={selection.date}
        time={selection.time}
        durationMin={selection.duration}
        therapistId={therapist.id}
        onConfirm={(date, time) => {
          setSelection((p) => ({ ...p, date, time }));
          setDateTimeSheetOpen(false);
        }}
      />

      {/* 🆕 Phase 4 — Therapist info sheet (Verified Profile / Reviews).
          Opened from StatsCard's tappable cells; closed by backdrop tap,
          drag, or the × button in the sheet header. */}
      <TherapistInfoSheet
        open={infoSheet !== null}
        onClose={() => setInfoSheet(null)}
        initialTab={infoSheet ?? "profile"}
        data={{
          yearsExp: therapist.yearsExp,
          totalSessions: therapist.specs.reduce((sum, s) => {
            const m = /(\d[\d,]*)/.exec(s.yrs);
            return sum + (m ? parseInt(m[1].replace(/,/g, ""), 10) : 0);
          }, 0),
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
          reviewBuckets: therapist.reviewBuckets.map((b) => ({
            stars: b.num,
            pct: b.pct,
            count: b.count,
          })),
          reviews: therapist.reviews.map((r, i) => ({
            bookingId: `DEMO${String(i + 1).padStart(4, "0")}${(
              r.initial + therapist.id
            )
              .replace(/[^A-Z0-9]/gi, "")
              .slice(0, 4)
              .toUpperCase()}`,
            rating: 5,
            service: r.meta.split("·")[1]?.trim() ?? "Service",
            body: r.quote,
            ago: r.meta.split("·")[0]?.trim() ?? "",
            verified: true,
          })),
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
