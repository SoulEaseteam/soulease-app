// src/utils/bookingAccessToken.ts
//
// 🆕 Round 28x.165 — the per-booking capability secret, in ONE place.
//
// Background: BookingFlowPage has minted an `accessToken` at checkout since
// 28x.107 so a signed-out guest can read her own reservation
// (`getBookingPublic` verifies it; `claimBookingChat` exchanges it for a chat
// credential). AdminBookingAddPage never minted one — and per CLAUDE.md most
// real volume IS admin-booked (a guest messages the concierge on Telegram and
// View keys the reservation in herself, `userId: null`).
//
// That gap didn't matter while the token only unlocked the success page a
// guest reached by redirect. It matters now: the review link (28x.165) is a
// capability URL the concierge SENDS, so a booking with no token simply
// cannot be reviewed — which would have excluded the majority of real jobs.
//
// ⚠️ This is a bearer secret. It goes in a URL handed to exactly one guest;
//    it must never be rendered into any public/SEO surface or logged.

/**
 * Mint a fresh booking access token.
 *
 * `crypto.randomUUID()` where available (every browser SunRed supports), with
 * the same time+random fallback BookingFlowPage has always used so behaviour
 * is identical on the rare engine without it.
 */
export function mintAccessToken(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

/**
 * Absolute review URL for a booking. Built from `window.location.origin` so a
 * link copied on a Vercel preview points at that preview, not production.
 *
 * Shape mirrors the success page (`/booking/success/:id?t=…`) on purpose —
 * one capability-link convention, one thing to remember.
 */
export function buildReviewLink(bookingId: string, accessToken: string): string {
  const origin =
    typeof window === "undefined" ? "https://sunred.vip" : window.location.origin;
  return `${origin}/review/b/${bookingId}?t=${encodeURIComponent(accessToken)}`;
}
