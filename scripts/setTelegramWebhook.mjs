// scripts/setTelegramWebhook.mjs
// ────────────────────────────────────────────────────────────────────────
// 🆕 Round 28x.107 (founder security audit) — (re-)register the Telegram
// webhook WITH a secret_token, so Telegram stamps every real update with
// an X-Telegram-Bot-Api-Secret-Token header that telegramWebhook verifies.
//
// Before this, the webhook function was open to the whole internet: its
// URL is derived from the project id, which ships in the public web bundle.
//
// ORDER MATTERS — run this BEFORE deploying the function, not after:
//   1. firebase functions:secrets:set TELEGRAM_WEBHOOK_SECRET   (the value)
//   2. node scripts/setTelegramWebhook.mjs --apply              (this file)
//      → real updates now carry the header; the OLD deployed code ignores
//        it, so the bot keeps working
//   3. firebase deploy --only functions:telegramWebhook
//      → new code starts checking the header, which is already present
// Reversing 2 and 3 takes the bot offline for the gap between them.
//
// Reads both the bot token and the webhook secret straight out of Secret
// Manager (via the firebase CLI) so neither value is ever typed into a
// shell history.
//
// Run:  node scripts/setTelegramWebhook.mjs           (show current state)
//       node scripts/setTelegramWebhook.mjs --apply   (register)
// ────────────────────────────────────────────────────────────────────────

import { execFileSync } from "node:child_process";

const APPLY = process.argv.includes("--apply");
const PROJECT = "soulease-spa"; // see .firebaserc — the Firebase project id
                                // still carries the pre-rebrand name
const WEBHOOK_URL = `https://asia-southeast1-${PROJECT}.cloudfunctions.net/telegramWebhook`;

function secret(name) {
  const out = execFileSync(
    "firebase",
    ["functions:secrets:access", name, `--project=${PROJECT}`],
    { encoding: "utf8" }
  );
  return out.trim();
}

const token = secret("TELEGRAM_BOT_TOKEN");
const webhookSecret = secret("TELEGRAM_WEBHOOK_SECRET");

const api = async (method, body) => {
  const r = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  return r.json();
};

const before = await api("getWebhookInfo");
// Never print the token — the webhook URL is safe, the query string is not.
console.log("current webhook:", {
  url: before.result?.url,
  has_custom_certificate: before.result?.has_custom_certificate,
  pending_update_count: before.result?.pending_update_count,
  last_error_message: before.result?.last_error_message ?? null,
  // Telegram does not echo the secret back; it only reports whether one is set
  // indirectly, so this is the field to watch after --apply.
  allowed_updates: before.result?.allowed_updates ?? "(default)",
});

if (!APPLY) {
  console.log("\nDRY RUN — re-run with --apply to register the secret_token.");
  process.exit(0);
}

// Preserve the EXACT allowed_updates the live webhook already had. Omitting
// the field does not keep them — Telegram resets to its default list, which
// would start delivering update types the handler has never seen. The three
// below are what the bot actually uses: message (concierge chat),
// channel_post (/setjobchannel, /setreportchannel) and callback_query
// (ACCEPT / DECLINE buttons).
const res = await api("setWebhook", {
  url: WEBHOOK_URL,
  secret_token: webhookSecret,
  allowed_updates: before.result?.allowed_updates?.length
    ? before.result.allowed_updates
    : ["message", "channel_post", "callback_query"],
  drop_pending_updates: false,
});
console.log("\nsetWebhook →", res);

const after = await api("getWebhookInfo");
console.log("after:", {
  url: after.result?.url,
  pending_update_count: after.result?.pending_update_count,
  last_error_message: after.result?.last_error_message ?? null,
});
process.exit(res.ok ? 0 : 1);
