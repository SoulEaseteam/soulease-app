// functions/src/telegram-concierge-bot/index.ts
//
// 🆕 Round 28s117 — Cloud Function bindings for the customer concierge
//   bot. Exposes one HTTPS endpoint (`telegramConciergeWebhook`) that
//   Telegram POSTs each Bot API update to.
//
// Setup steps documented in docs/telegram-concierge-bot-setup.md:
//   1. Create new bot via @BotFather → save token
//   2. firebase functions:secrets:set TELEGRAM_CONCIERGE_BOT_TOKEN
//   3. firebase deploy --only functions:telegramConciergeWebhook
//   4. Register the deployed URL with Telegram's setWebhook endpoint
//   5. Add the new bot to the admin Telegram group so reply-relay works

import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { logger } from "firebase-functions/v2";

import { handleUpdate } from "./relay";

const TELEGRAM_CONCIERGE_BOT_TOKEN = defineSecret(
  "TELEGRAM_CONCIERGE_BOT_TOKEN",
);

/**
 * Telegram webhook receiver. Telegram POSTs an Update object per event.
 * We always reply 200 OK quickly to prevent Telegram from retrying —
 * any internal failures get logged but the inbound POST is acknowledged.
 */
export const telegramConciergeWebhook = onRequest(
  {
    secrets: [TELEGRAM_CONCIERGE_BOT_TOKEN],
    // Region matches other concierge-bot functions (us-central1) so all
    // posting/relay infra clusters in one region.
    // 🆕 Round 28s124 — allow Telegram (anonymous) to invoke. Without
    //   `invoker: "public"`, Cloud Run blocks unauthenticated POSTs and
    //   Telegram silently drops them — observed as 0 requests in the
    //   Firebase Console even though setWebhook succeeded.
    invoker: "public",
  },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).send("Method Not Allowed");
      return;
    }
    const token = TELEGRAM_CONCIERGE_BOT_TOKEN.value().trim();
    if (!token) {
      logger.error(
        "[telegramConciergeWebhook] TELEGRAM_CONCIERGE_BOT_TOKEN missing",
      );
      // Still 200 — Telegram will keep retrying otherwise.
      res.status(200).send("ok");
      return;
    }

    try {
      await handleUpdate(req.body ?? {}, token);
    } catch (err) {
      logger.error("[telegramConciergeWebhook] handleUpdate threw", {
        err,
      });
    }

    res.status(200).send("ok");
  },
);
