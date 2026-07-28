// functions/src/telegram/transport.ts
//
// Telegram send-transport for the BOOKING bot (the one whose token is
// TELEGRAM_BOT_TOKEN). Plain text, no parse_mode — deliberately NOT the
// same client as telegram-post-bot/client.ts or
// telegram-concierge-bot/client.ts, which send HTML and check Telegram's
// own `data.ok` instead of the HTTP status. Do not merge them.

import "../_init";

import { logger } from "firebase-functions/v2";
import { getFirestore } from "firebase-admin/firestore";

// ─────────────────────────────────────────────────────────────
// Helper: ส่งข้อความเข้า Telegram (reuse ใน multiple functions)
// ─────────────────────────────────────────────────────────────
export async function sendTelegram(
  token: string,
  chatId: string,
  text: string
): Promise<{ ok: boolean; body: string }> {
  try {
    const res = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: text.slice(0, 4000),
          // 🆕 Round 28b56 (founder 2026-05-05) — Reverted Round 28b55.
          //   Founder feedback: "ไม่เอา" preview card. Keep message
          //   compact — URL stays clickable as plain blue link in
          //   Telegram, but no big unfurled photo+address card under it.
          disable_web_page_preview: true,
        }),
      }
    );
    const body = await res.text().catch(() => "");
    return { ok: res.ok, body };
  } catch (err) {
    logger.error("[sendTelegram] fetch failed", err);
    return { ok: false, body: String(err) };
  }
}

// 🆕 Round 28s297 (founder, asked directly: "เชื่อม Telegram ให้คุมได้จริง
//   จากหน้านี้") — AdminAdvancedSettingsPage's "Enable Telegram
//   Notifications" toggle used to save to Firestore with nothing here
//   ever reading it back. This is the real check: a wrapper around
//   `sendTelegram` used ONLY at actual notification call sites (booking
//   alerts, negative-review alerts, overdue-session nudges, abandoned-
//   cart recovery) — NOT `telegramWebhook`'s reply-to-a-command handler,
//   since a therapist typing /myid to link their chat ID isn't a
//   "notification" this toggle should be able to silently break.
//
// Default TRUE if the field is missing/undefined so a doc that's never
// been saved (or a fresh deploy) doesn't go silent. Read via the Admin
// SDK, which bypasses Firestore rules entirely — no rules change needed.
//
// A deliberate skip returns `{ ok: true }`, not `{ ok: false }` — two
// callers (alertOverdueSessions, recoverAbandonedBookings) gate retry/
// terminal state on `.ok`, and treating "paused" as "failed" would make
// them loop-retry forever or permanently mark abandoned carts
// "alert-failed" while the toggle is off.
async function isTelegramEnabled(): Promise<boolean> {
  try {
    const snap = await getFirestore()
      .collection("adminSettings")
      .doc("advanced")
      .get();
    return snap.data()?.telegramEnabled !== false;
  } catch (err) {
    logger.warn("[isTelegramEnabled] check failed, defaulting to enabled", err);
    return true; // fail open — never let a settings-read hiccup swallow a real alert
  }
}

export async function sendTelegramIfEnabled(
  token: string,
  chatId: string,
  text: string
): Promise<{ ok: boolean; body: string }> {
  if (!(await isTelegramEnabled())) {
    logger.info("[sendTelegramIfEnabled] skipped — telegramEnabled=false");
    return { ok: true, body: "skipped: telegramEnabled=false" };
  }
  return sendTelegram(token, chatId, text);
}
