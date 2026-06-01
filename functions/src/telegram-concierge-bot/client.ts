// functions/src/telegram-concierge-bot/client.ts
//
// 🆕 Round 28s117 — Customer-facing Telegram Concierge Bot.
//   Separate from the booking-notification bot AND the channel-posting
//   bot · gives SunRed a customer DM surface where messages get
//   auto-greeted in the customer's language and forwarded into the
//   admin Telegram group for View to reply.
//
// This client wraps just the Bot API endpoints we actually use:
// sendMessage, copyMessage, and getMe (for webhook ID echo).

import { logger } from "firebase-functions/v2";

interface SendResult {
  ok: boolean;
  message_id?: number;
  error?: string;
}

/**
 * Send a plain text message to a chat. HTML parse mode supports
 * <b>/<i>/<a> tags. Optional inline keyboard for action buttons
 * (e.g., "Open chat" → t.me/X).
 */
export async function sendMessage(
  token: string,
  chatId: string | number,
  text: string,
  options: {
    replyTo?: number;
    parseMode?: "HTML" | "MarkdownV2";
    disablePreview?: boolean;
    inlineKeyboard?: Array<Array<{ text: string; url: string }>>;
  } = {},
): Promise<SendResult> {
  if (!token) return { ok: false, error: "TOKEN_MISSING" };
  try {
    const res = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: text.slice(0, 4000),
          parse_mode: options.parseMode ?? "HTML",
          disable_web_page_preview: options.disablePreview ?? true,
          reply_to_message_id: options.replyTo,
          reply_markup: options.inlineKeyboard
            ? { inline_keyboard: options.inlineKeyboard }
            : undefined,
        }),
      },
    );
    const data = (await res.json()) as {
      ok: boolean;
      result?: { message_id: number };
      description?: string;
    };
    if (!data.ok) {
      logger.warn("[concierge-bot] sendMessage failed", {
        description: data.description,
        chatId,
      });
      return { ok: false, error: data.description };
    }
    return { ok: true, message_id: data.result?.message_id };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: message };
  }
}

/**
 * Copy a message from one chat to another — preserves photos, voice,
 * stickers, etc. Used to forward customer DMs to the admin group
 * without revealing the bot as the "From" sender to the customer.
 */
export async function copyMessage(
  token: string,
  fromChatId: number,
  messageId: number,
  toChatId: string | number,
  caption?: string,
): Promise<SendResult> {
  if (!token) return { ok: false, error: "TOKEN_MISSING" };
  try {
    const res = await fetch(
      `https://api.telegram.org/bot${token}/copyMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: toChatId,
          from_chat_id: fromChatId,
          message_id: messageId,
          caption,
          parse_mode: caption ? "HTML" : undefined,
        }),
      },
    );
    const data = (await res.json()) as {
      ok: boolean;
      result?: { message_id: number };
      description?: string;
    };
    if (!data.ok) {
      logger.warn("[concierge-bot] copyMessage failed", {
        description: data.description,
      });
      return { ok: false, error: data.description };
    }
    return { ok: true, message_id: data.result?.message_id };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: message };
  }
}
