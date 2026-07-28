// functions/src/index.ts
//
// Deploy manifest ONLY — every exported symbol here is a live Cloud
// Function name. Implementations live in the per-domain modules below;
// each of those starts with `import "./_init"` so the Admin SDK is
// initialised by the dependency graph, not by statement order here.
//
// ⚠️ Renaming or dropping an export from this file DELETES the deployed
//   function of that name. 17 exports, all listed below.

export {
  notifyBooking,
  onBookingCreate,
  releaseExpiredHolds,
  alertOverdueSessions,
  recoverAbandonedBookings,
  syncTherapistBusyStatus,
} from "./booking/handlers";

export { onReviewCreate, moderateText } from "./reviews";

export { setRoleOnSignup, resetCustomerPassword } from "./accounts";

export { onTherapistUpdate } from "./therapists";

export { telegramWebhook } from "./telegram/webhook";

// ─────────────────────────────────────────────────────────────
// 🆕 Round 28s115 — Telegram channel-posting bot (@SunRedPostBot).
//   Lives in src/telegram-post-bot/ to keep its surface separate
//   from the booking-notification bot above. Re-exports 3 scheduled
//   Functions — brand promo cron jobs at evening/prime/late BKK time
//   (28s224 replaced the original Mon-spotlight/Fri-weekend design
//   with these) — and 1 admin-only callable (postToChannelManual).
//
//   Required setup BEFORE first deploy:
//     1. firebase functions:secrets:set TELEGRAM_POST_BOT_TOKEN
//        (paste the token directly into the prompt; never commit it).
//     2. Add @SunRedPostBot as admin in @SunRed_BKK with "Post
//        Messages" + "Edit Messages of Others" permissions.
//     3. Verify the channel handle constant in
//        src/telegram-post-bot/client.ts matches the live channel.
//
//   Deploy: firebase deploy --only functions:scheduledChannelEvening,
//   functions:scheduledChannelPrime,functions:scheduledChannelLate,
//   functions:postToChannelManual
// ─────────────────────────────────────────────────────────────
export {
  scheduledChannelEvening,
  scheduledChannelPrime,
  scheduledChannelLate,
  postToChannelManual,
} from "./telegram-post-bot";

// ─────────────────────────────────────────────────────────────
// 🆕 Round 28s117 — Customer-facing Telegram Concierge Bot.
//   Lives in src/telegram-concierge-bot/. Exposes one webhook receiver
//   that handles inbound customer DMs and admin reply relays from the
//   admin group.
//
//   🆕 Round 28s123 — Re-enabled. Refactored from forwarding relay
//   into a 24/7 multilingual ROUTER. Customer DMs bot → bot greets
//   in their language + offers tap-button to the right concierge
//   personal account (@YuNiSpaBkk for ZH, @SunRedvip_bkk for others).
//   No admin-group monitoring needed — View keeps her existing 2-
//   personal-account workflow; the bot fills the "instant 24/7
//   acknowledgement" gap that personal accounts can't provide.
// ─────────────────────────────────────────────────────────────
export { telegramConciergeWebhook } from "./telegram-concierge-bot";
