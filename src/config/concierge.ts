// src/config/concierge.ts
//
// 🆕 Round 28r71 · Rebrand Phase 2 (2026-07-08) — single source of truth
//   for every concierge contact endpoint used across the customer site.
//
// WHY this exists (blast-radius discipline):
//   Before r71, the shared founder WhatsApp number `+66 63 435 0987`
//   was hardcoded as `https://wa.me/66634350987` in 9+ files:
//     • HomePage.tsx (desktop hero CTA)
//     • PricingPage.tsx (r70 stub CTA)
//     • ServiceDetailPage.tsx (Reserve button)
//     • ServicesPage.tsx (concierge channel grid)
//     • booking/BookingSuccessPage.tsx (post-booking confirmation CTA)
//     • components/home/HomeTherapistGrid.tsx (empty-state CTA)
//     • components/AdminFloatingChat.tsx (global concierge widget)
//     • components/common/BundleSection.tsx (bundle reserve CTA)
//     • ProfilePage.tsx (Support row)
//   LINE + Telegram had similar spread. A founder handle change (rare
//   but real — e.g. LINE OA migration) would have meant a 9-file grep +
//   replace with no compile-time safety net. This module makes it a
//   one-file edit.
//
// The `whatsappDeepLink(msg?)` helper preserves each caller's own
// pre-filled message text — do NOT centralize the prompts, they're
// intentionally per-surface (service detail includes service+duration,
// bundle CTA names the bundle, empty state asks "who's available"...).
//
// Data-logic notes:
//   • displayPhone is the human-facing format (spaces + country code)
//     used in the Services tab concierge grid `handle` label.
//   • whatsappPhone is the raw wa.me path segment (digits only,
//     country code included, no + prefix).

export const CONCIERGE = {
  /** Digits-only wa.me path segment. */
  whatsappPhone: "66634350987",
  /** Base WhatsApp URL — use whatsappDeepLink() when adding a prompt. */
  whatsappUrl: "https://wa.me/66634350987",
  /** LINE Official Account add-friend link. */
  lineUrl: "https://lin.ee/uqvdwWt",
  /** Telegram Bangkok broadcast channel handle (public). */
  telegramChannel: "@SunRed_BKK",
  /** Human-facing display phone (used as a `handle` label in nav grids). */
  displayPhone: "+66 63 435 0987",
} as const;

/**
 * Build a WhatsApp deep-link with an optional URL-encoded pre-filled
 * message. Callers keep their own message wording (service detail,
 * bundle, empty state etc. each have their own prompt).
 *
 * @example
 *   whatsappDeepLink("Hi SunRed, I'd like to reserve tonight.")
 *   whatsappDeepLink()   // → plain concierge link, no prompt
 */
export function whatsappDeepLink(prefilledMessage?: string): string {
  const base = CONCIERGE.whatsappUrl;
  return prefilledMessage
    ? `${base}?text=${encodeURIComponent(prefilledMessage)}`
    : base;
}
