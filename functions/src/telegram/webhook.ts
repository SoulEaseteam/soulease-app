// functions/src/telegram/webhook.ts
//
// Inbound webhook for the BOOKING bot — handles /start and /myid so a
// practitioner can self-serve her Telegram chat ID.

import "../_init";

import { onRequest } from "firebase-functions/v2/https";
import { logger } from "firebase-functions/v2";

import { TELEGRAM_BOT_TOKEN } from "../config";
import { sendTelegram } from "./transport";

interface TelegramUpdate {
  message?: {
    chat?: { id?: number };
    text?: string;
    from?: { username?: string; first_name?: string };
  };
}

export const telegramWebhook = onRequest(
  {
    region: "asia-southeast1",
    secrets: [TELEGRAM_BOT_TOKEN],
    cors: false,
  },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).send("POST only");
      return;
    }
    const token = TELEGRAM_BOT_TOKEN.value();
    if (!token) {
      logger.error("[telegramWebhook] TELEGRAM_BOT_TOKEN missing");
      res.status(500).send("server-misconfigured");
      return;
    }
    const update = req.body as TelegramUpdate;
    const chatId = update?.message?.chat?.id;
    const text = (update?.message?.text ?? "").trim();
    const fromName =
      update?.message?.from?.first_name ??
      update?.message?.from?.username ??
      "there";

    if (!chatId) {
      res.status(200).send("ok"); // ack but ignore
      return;
    }

    let reply: string;
    if (text === "/start") {
      reply = [
        `Hi ${fromName}! 👋`,
        "",
        "I'm the SunRed booking bot.",
        "Send /myid to get your chat ID — you'll need to give it",
        "to the admin so they can route bookings to you.",
      ].join("\n");
    } else if (text === "/myid" || text === "/id") {
      reply = [
        `Your chat ID is:`,
        ``,
        `${chatId}`,
        ``,
        `Copy this number and send it to the SunRed admin.`,
        `Once linked, you'll get a DM from this bot every time`,
        `a customer books your service.`,
      ].join("\n");
    } else if (text.startsWith("/")) {
      reply = "Unknown command. Try /myid to get your chat ID.";
    } else {
      // Free-form messages — ignore silently to avoid being a chatty
      // bot. Therapist might be replying ACCEPT/DECLINE in future.
      res.status(200).send("ok");
      return;
    }

    await sendTelegram(token, String(chatId), reply);
    res.status(200).send("ok");
  }
);
