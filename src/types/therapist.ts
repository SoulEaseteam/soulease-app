// src/types/therapist.ts

import type { Timestamp } from "firebase/firestore";

export type Avail = "available" | "bookable" | "resting" | "holiday";
export type StatusOverride = Avail | "Auto" | null;

/** ค่าวันที่ที่อาจมาจาก Firestore (Timestamp) หรือ JS หรือ ISO string */
export type FirestoreDateLike = Timestamp | Date | string | number | null;

/** ---------- Sub Types ---------- */
export interface Features {
  employmentType?: string | null;
  age: string;
  gender?: string;
  ethnicity?: string;
  height: string;
  weight: string;
  skintone?: string;
  bodyType: string;
  bustSize?: string;
  hairColor?: string;
  /** Round 28s220 — extended profile fields surfaced in the About
   *  panel "Features" card. On-brand subset of competitor inventory
   *  (descriptive · non-explicit). Optional so legacy docs stay valid. */
  hairLength?: string;
  eyeColor?: string;
  tattoos?: string;
  personality?: string;
  vaccinated?: string;
  smoker?: string;
  language: string;
}

export interface Location {
  lat: number;
  lng: number;
}

/** ---------- Main Therapist Type (SunRed v3.0) ---------- */
export interface Therapist {
  /** identity */
  id: string;          // Firestore docId หรือ custom ID
  name: string;
  image: string;

  /** Login email — used by `setRoleOnSignup` Cloud Function to
   *  auto-link a Firebase Auth user to this therapist doc.
   *  Must match the email used when creating the Auth user
   *  (lowercase, no whitespace). Onboarding flow: set email on
   *  therapist doc FIRST, then create Auth user. */
  email?: string;
  /** Auth UID — written by `setRoleOnSignup` after auto-link.
   *  Lets `firestore.rules` match doc owner without docId magic. */
  uid?: string;

  /** rating — Bayesian confidence-weighted value shown in UI (28s388) */
  rating: number;
  /** true unweighted average, for reference/admin (28s388) */
  ratingRaw?: number;
  reviews: number;     // review count

  /** experience */
  experience?: number;

  /** working hours */
  startTime: string;   // "HH:mm"
  endTime: string;     // "HH:mm"

  /** --- Availability System (Official Engine Inputs) --- */
  statusOverride?: StatusOverride;     // Admin override: "Auto" | Avail
  /** 🆕 Round 28s267 — expiry stamp for `statusOverride`. Without this an
   *  override set once (e.g. "resting" to pull someone offline for a
   *  night) stuck forever until manually reset — see calculateTherapistStatus. */
  overrideUntil?: FirestoreDateLike;
  isHoliday?: boolean;                 // force resting
  isBooked?: boolean;                  // legacy flag
  busyUntil?: FirestoreDateLike;       // Timestamp / Date / ISO / null
  activeBooking?: boolean;             // true if job ongoing

  /** computed by Engine (DO NOT STORE in Firestore) */
  nextAvailable?: string | null;       // "Now" | "10:30" | null
  available?: Avail | null;            // optional legacy field (safe)

  /** bookings counting */
  todayBookings?: number;
  /** 🆕 28x.100 — business-day stamp (rolls 06:00 BKK) written by the
   *  syncTherapistDailyCount Cloud Function next to todayBookings; the
   *  badge engine ignores counts stamped with any other day. */
  todayBookingsDate?: string | null;
  totalBookings?: number;

  /** 🆕 28x.81 (founder: "บัญชียังไม่เปิดใช้งาน") — admin-only gate on the
   *  STAFF APP (login → /staff), separate from statusOverride/isHoliday
   *  which gate PUBLIC bookability. A brand-new therapist can be linked
   *  (28x.70) and sync'd (backfillTherapistUids) while still `undefined`
   *  here — she can sign in, but StaffLayout blocks every screen behind a
   *  "contact admin" banner until an admin explicitly flips this true.
   *  NOT in firestore.rules therapistEditableKeys(), so a therapist can
   *  never self-activate. */
  staffActive?: boolean;

  /** location and distance */
  homeLocation?: Location | null;      // ค่าเริ่มต้นของ therapist
  currentLocation?: Location | null;   // real-time location
  /** Flat lat/lng (legacy alias for homeLocation.lat/lng) — used by
   *  taxi-fare estimator and BookingFlowPage. Kept here so the
   *  `[key: string]: unknown` index signature doesn't shadow them. */
  lat?: number;
  lng?: number;
  distanceKm?: number | null;          // computed client-side

  /** gallery & features */
  gallery: string[];
  features: Features;
  specialty?: string;

  /** services available */
  services?: string[];           // legacy alias
  servicesAvailable?: string[];

  /** AI-generated multi-language bios — produced by scripts/generate-bios.ts */
  bios?: Partial<{
    en: string;
    th: string;
    zh: string;
    ja: string;
    ko: string;
  }>;
  bioGeneratedAt?: FirestoreDateLike;

  /** badge system — see src/utils/getTherapistBadge.ts for precedence.
   *
   *  ⚠️ TWO separate stores, on purpose (28x.161):
   *    • `badge` + `badgeSetAt` — the MANUAL pin from the admin page's
   *      "Badge" dropdown. Wins over the automatic badges, lives 48h.
   *    • `badgeKey` + `badgeUpdatedAt` — the AUTO badge, stamped server-side
   *      by syncTherapistDailyCount when a daily-count threshold is crossed.
   *      Overwritten on every booking write, so an admin pin must never be
   *      stored here or the next job would wipe it. */
  badge?: string | null;
  badgeSetAt?: number | null;
  badgeKey?: "TOP_RATED" | "VIP" | "HOT" | "NEW" | null;
  badgeUpdatedAt?: number | null;

  /** extra fields */
  employmentType?: string | null;
  serviceCount?: string;

  /** Round 28z — richer profile data (see types defined at the bottom). */
  area?: string;
  /** Round 28at — full standby address (Thai postal). Used by admin
   *  panel + booking dispatch for therapist locating. Display layer
   *  prefers `area` chip on profile cards; full address shows in
   *  admin tools / Telegram dispatch only. */
  homeAddress?: string;
  rebookRate?: number;
  totalSessions?: number;
  /** 🆕 28s387 — anonymous profile-open counter (see utils/therapistViews). */
  viewCount?: number;
  credentials?: Credential[];
  serviceExperience?: ServiceExperience[];
  languageSkills?: LanguageSkill[];

  /** fallback for smooth upgrades — ใช้ unknown ปลอดภัยกว่า any */
  [key: string]: unknown;
}

/** Badge Configuration UI */
export interface BadgeConfig {
  key: "VIP" | "HOT" | "NEW" | null;
  image: string;
  priority: number;
  animation: "pulse" | "float" | "none";
  size: number;
  position: { top: number; left: number };
  condition: (t: Therapist) => boolean;
}

// =============================================================
// Round 28z (founder 2026-05-02) — richer profile data so the
// detail page + InfoSheet can render Mai-mockup-level depth from
// real records.
// =============================================================

/** Single credential row shown on the Profile tab. */
export interface Credential {
  /** Drives the icon/colour scheme on the row. */
  type: "license" | "diploma" | "background" | "certification";
  /** Headline label, e.g. "Thai Ministry of Public Health License". */
  label: string;
  /** Sub-line, e.g. · Verified". */
  meta: string;
}

/** Per-service experience used by the Specialties section. */
export interface ServiceExperience {
  /** Maps to a service id in `src/data/services.ts`. */
  serviceId: string;
  years: number;
  sessionCount: number;
  /** Optional badge label, e.g. "Certified". */
  label?: string;
}

/** Structured language proficiency — replaces parsing features.language. */
export interface LanguageSkill {
  /** ISO 639-1 code (lowercase): "en", "th", "zh", "ja", "ko". */
  code: string;
  level: "Native" | "Fluent" | "Conversational" | "Basic";
}

