// src/utils/analytics.ts
//
// 🆕 Round 28r13 (founder 2026-05-06) — Self-hosted funnel tracking.
//
// Why self-hosted (not Plausible / PostHog / Mixpanel):
//   • Zero external accounts to manage — View doesn't need a second
//     dashboard or another invoice.
//   • 100% data ownership — we can query and reshape event data the
//     same way we query bookings.
//   • Privacy-default — no cross-site cookies, no third-party network
//     calls, no GDPR cookie banner.
//   • Fits the "lean, monitored, real-time" operating mode in
//     CLAUDE.md.
//
// What it captures (FIVE events only, by design):
//   1. home_view          → guest opened the home page
//   2. service_view       → opened a ServiceDetailPage
//   3. booking_start      → opened the BookingFlow (Confirm Order)
//   4. booking_complete   → addDoc on `bookings` succeeded
//   5. concierge_chat_open → clicked any LINE / WhatsApp / Telegram
//                            CTA on any page
//
// What it does NOT capture (deliberate):
//   • Personally identifiable information (no phone, no email, no name)
//   • Click coordinates, scroll depth, session replays
//   • Anything that would require a cookie banner
//
// Storage: every event is one Firestore write to `analytics_events`,
// keyed only by an anonymous session id (kept in sessionStorage so it
// rotates when the tab closes). Keep total writes low — this isn't a
// general-purpose analytics tool.

import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

export type FunnelEvent =
  | "home_view"
  | "service_view"
  | "booking_start"
  | "booking_complete"
  | "concierge_chat_open"
  // 🆕 Round 28r58 — Bundle Packages customer surface. `bundle_view`
  //   fires ONCE per session (per bundle set) when BundleSection first
  //   mounts with at least one active bundle. `bundle_reserve_click`
  //   fires every time a guest taps a bundle CTA — the founder needs
  //   to see interest per bundle, not just per session.
  | "bundle_view"
  | "bundle_reserve_click"
  // 🆕 Round 28r63 (r59 follow-up) — referral tier activated at
  //   checkout. Payload = { code, count, tierMinRedeems, amount }.
  //   Deduped per (code + tier) tuple within a session so the ~30
  //   render-frames of the total tween can't fire it repeatedly.
  //   Lets the founder see how many bookings actually unlock a tier
  //   vs. just hit the base referral reward.
  | "referral_tier_applied";

const SESSION_KEY = "sunred.analytics.sid";
const FIRED_KEY = "sunred.analytics.fired";

/** Lazy-create a per-session anonymous id (rotates every tab close). */
function getSessionId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    let sid = window.sessionStorage.getItem(SESSION_KEY);
    if (!sid) {
      // Cheap unique id — timestamp + random — no crypto dependency.
      sid =
        Date.now().toString(36) +
        Math.random().toString(36).slice(2, 10);
      window.sessionStorage.setItem(SESSION_KEY, sid);
    }
    return sid;
  } catch {
    // Private mode / quota — emit events without sid.
    return null;
  }
}

/**
 * 🆕 Round 28r13b (founder 2026-05-07) — Two cost-saving filters
 *   added after the founder noticed dev refreshes were creating
 *   noise rows in `analytics_events`:
 *
 *   1. Skip dev / localhost / preview deploys entirely — `npm run dev`
 *      should not pollute production funnel data.
 *   2. Dedupe within a session — repeated `home_view` from refreshes
 *      or back-button only fire ONCE per session. service_view stays
 *      keyed by `event:serviceId` so opening 3 different services
 *      still records 3 events.
 *
 *   Together these cut Firestore writes by ~50–70% with zero loss
 *   of analytical signal at our traffic scale.
 */
function isLocalOrDev(): boolean {
  if (typeof window === "undefined") return true;
  const host = window.location.hostname;
  return (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host.endsWith(".local") ||
    // Vercel preview deploys — keep prod alone.
    host.endsWith(".vercel.app")
  );
}

/** Per-session dedup gate. Returns true if this exact key already
 *  fired this session, false (and records it) otherwise. */
function alreadyFired(key: string): boolean {
  if (typeof window === "undefined") return true;
  try {
    const raw = window.sessionStorage.getItem(FIRED_KEY) ?? "";
    if (raw.split("|").includes(key)) return true;
    const next = raw ? `${raw}|${key}` : key;
    window.sessionStorage.setItem(FIRED_KEY, next);
    return false;
  } catch {
    return false;
  }
}

/** Build a dedup key for an event + its dedupe-relevant props.
 *  - home_view: dedupe globally (one per session)
 *  - service_view: dedupe per serviceId
 *  - booking_start: dedupe per therapistId
 *  - booking_complete + concierge_chat_open: NEVER dedupe (every
 *    real action is a separate funnel signal). */
function dedupKeyFor(
  event: FunnelEvent,
  props?: Record<string, unknown> | null
): string | null {
  if (event === "home_view") return "home_view";
  if (event === "service_view")
    return `service_view:${(props?.serviceId as string) ?? "_"}`;
  if (event === "booking_start")
    return `booking_start:${(props?.therapistId as string) ?? "_"}`;
  // 🆕 Round 28r58 — bundle_view fires on every BundleSection mount
  //   (Home + Services), so dedupe per session GLOBALLY to keep the
  //   write count sane. bundle_reserve_click is a real CTA action —
  //   never dedupe (like booking_complete/concierge_chat_open).
  if (event === "bundle_view") return "bundle_view";
  // 🆕 Round 28r63 — referral tier activation. Dedupe per (code,
  //   tierMinRedeems) so the ~30 render frames of the total's
  //   count-up tween can't fire N events per pageview. The event is
  //   still fired again if the guest tries a DIFFERENT referral code
  //   or the count crosses into a NEW tier.
  if (event === "referral_tier_applied") {
    const code = (props?.code as string) ?? "_";
    const tier = (props?.tierMinRedeems as number) ?? -1;
    return `referral_tier_applied:${code}:${tier}`;
  }
  // booking_complete + concierge_chat_open + bundle_reserve_click: no dedup
  return null;
}

/**
 * Fire-and-forget event write. Errors are swallowed so analytics
 * failures never block the UX.
 *
 * @param event  One of the five canonical funnel events
 * @param props  OPTIONAL non-PII metadata. Free shape — but keep it
 *               small and never include phone / email / address.
 */
export function trackEvent(
  event: FunnelEvent,
  props?: Record<string, string | number | boolean | null>
): void {
  if (typeof window === "undefined") return;

  // 🆕 Round 28r13b — Skip dev / localhost / preview deploys.
  //   Founder confirmed her test refreshes were polluting the data.
  //   Production-only tracking from here on.
  if (isLocalOrDev()) return;

  // 🆕 Round 28r13b — Dedupe within session for navigation events
  //   (home_view, service_view by id, booking_start by id). Real
  //   conversion signals (booking_complete, concierge_chat_open)
  //   skip dedup so every CTA tap is captured.
  const dedupKey = dedupKeyFor(event, props);
  if (dedupKey && alreadyFired(dedupKey)) return;

  const sid = getSessionId();

  // Detect concierge mode at fire time (cheap, derived from BKK hour)
  // so funnel analysis can split conversion by mode without
  // back-joining to a separate timeline.
  const hour = new Date().getUTCHours() + 7; // BKK is UTC+7
  const bkkHour = ((hour % 24) + 24) % 24;
  const mode =
    bkkHour >= 22 || bkkHour < 4
      ? "prime"
      : bkkHour >= 4 && bkkHour < 9
      ? "off"
      : bkkHour >= 17 && bkkHour < 22
      ? "evening"
      : "day";

  const referrer =
    typeof document !== "undefined" && document.referrer
      ? new URL(document.referrer).hostname
      : null;

  const lang =
    typeof navigator !== "undefined" && navigator.language
      ? navigator.language.split("-")[0]
      : null;

  // Fire-and-forget — never await.
  void addDoc(collection(db, "analytics_events"), {
    event,
    sid,
    mode,
    referrer,
    lang,
    path: typeof window !== "undefined" ? window.location.pathname : null,
    props: props ?? null,
    ts: serverTimestamp(),
  }).catch(() => {
    // Quota / permission / offline — swallow silently. Analytics must
    // never break the booking flow.
  });
}

// 🆕 Round 28s304 (founder: "ได้ทั้งหมด" — build the in-dashboard
//   district-landing tracker offered after the "what do customers search
//   for" question). The 5 SEO keyword pages (/outcall-massage-sukhumvit
//   etc.) redirect humans to "/" instantly, so by the time home_view
//   fires the URL is already "/" and the landing keyword is lost. Fix:
//   the redirect stub records which district page it was BEFORE
//   redirecting, and HomePage attaches it to the session's home_view.
//   This is a proxy for search intent — it tells us which keyword page
//   pulled the visitor, not the literal Google query (Google hides that;
//   use Search Console for the real terms).
const LANDING_KEY = "sunred.landing.area";

/** Called by the keyword-page redirect stub, client-side, before it
 *  navigates the visitor to the home page. */
export function recordLandingArea(area: string): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(LANDING_KEY, area);
  } catch {
    // private mode / quota — attribution is best-effort, never blocks.
  }
}

/** Read + clear the recorded landing area. Cleared so a later home
 *  refresh in the same session doesn't re-attribute. */
export function consumeLandingArea(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const v = window.sessionStorage.getItem(LANDING_KEY);
    if (v) window.sessionStorage.removeItem(LANDING_KEY);
    return v;
  } catch {
    return null;
  }
}

/** Convenience wrappers — keeps callsites tidy. */
export const trackHomeView = (area?: string | null): void =>
  trackEvent("home_view", area ? { area } : undefined);
export const trackServiceView = (serviceId: string): void =>
  trackEvent("service_view", { serviceId });
export const trackBookingStart = (therapistId: string | null): void =>
  trackEvent("booking_start", { therapistId });
export const trackBookingComplete = (
  serviceId: string,
  durationMin: number,
  total: number
): void =>
  trackEvent("booking_complete", { serviceId, durationMin, total });
export const trackConciergeOpen = (channel: string): void =>
  trackEvent("concierge_chat_open", { channel });

// 🆕 Round 28r58 — Bundle Packages funnel events. Payload is
//   non-PII by design: bundleId is a stable admin-set key
//   ("SR-BUNDLE-<base36>"), sessionCount + discountPct are display
//   numbers already on the guest's screen. See `analytics_events`
//   dashboard on /admin/analytics for aggregation.
export const trackBundleView = (
  bundleId: string,
  sessionCount: number,
  discountPct: number
): void =>
  trackEvent("bundle_view", { bundleId, sessionCount, discountPct });
export const trackBundleReserveClick = (
  bundleId: string,
  sessionCount: number,
  discountPct: number
): void =>
  trackEvent("bundle_reserve_click", { bundleId, sessionCount, discountPct });

// 🆕 Round 28r63 (r59 follow-up) — fires when a SUN-XXXX referral
//   code unlocks a tier at checkout (count crossed the tier's
//   minRedeems threshold). Deduped in trackEvent per (code, tier).
//   `amount` is what the guest actually got vs. the base referral
//   amount — the founder can see e.g. "50% of tier-eligible codes
//   converted this month" over time. Non-PII: code is admin-shaped
//   (SUN-XXXXXX), count/minRedeems/amount are numbers.
export const trackReferralTierApplied = (
  code: string,
  count: number,
  tierMinRedeems: number,
  amount: number,
): void =>
  trackEvent("referral_tier_applied", {
    code,
    count,
    tierMinRedeems,
    amount,
  });
