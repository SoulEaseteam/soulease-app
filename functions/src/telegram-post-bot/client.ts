// functions/src/telegram-post-bot/client.ts
//
// 🆕 Round 28s115 — Dedicated Telegram channel-posting bot
//   (@SunRedPostBot) separate from the booking-notification bot.
//   This client wraps the small surface of the Bot API we actually
//   use: sendMessage to the public channel, edit, delete.
//
// Token comes from the TELEGRAM_POST_BOT_TOKEN secret, NOT the
// existing TELEGRAM_BOT_TOKEN (which still drives booking alerts to
// the admin group). Keeping the bots separate so one set of
// credentials can be rotated or revoked without affecting the other.

import { logger } from "firebase-functions/v2";

/**
 * Canonical channel targets. We run two parallel channels:
 *   • @SunRed_BKK         — main English/Thai/JA/KO audience (~453 subs)
 *   • @manguyujianniSPA   — 曼谷遇你SPA, dedicated Chinese-language
 *                            channel (Round 28s118 · sub-brand for
 *                            mainland CN tourists)
 *
 * Telegram resolves @-prefixed usernames to numeric chat IDs internally
 * — using usernames keeps deploys stable if SunRed ever migrates.
 */
export const CHANNELS = {
  EN: "@SunRed_BKK",
  ZH: "@manguyujianniSPA",
} as const;

/** Backward-compat alias for code that hasn't migrated to CHANNELS.EN yet. */
export const TELEGRAM_CHANNEL = CHANNELS.EN;

/**
 * Pick the channel that matches the post's language. zh routes to the
 * 曼谷遇你SPA channel; everything else uses the main SunRed channel.
 * This lets a single scheduled post fan-out into the right audiences.
 */
export function channelForLang(lang: string): string {
  return lang === "zh" ? CHANNELS.ZH : CHANNELS.EN;
}

interface SendResult {
  ok: boolean;
  message_id?: number;
  error?: string;
}

/**
 * Send a fresh message to the SunRed channel. Returns the new
 * message_id so the caller can log/edit later.
 *
 * @param token   The bot HTTP API token (do NOT log).
 * @param text    Message body. HTML parse_mode is on, so <b>/<i>/<a>
 *                tags work; bare angle brackets must be escaped.
 * @param target  Optional override of the default channel.
 */
export async function sendChannelMessage(
  token: string,
  text: string,
  target: string = TELEGRAM_CHANNEL,
): Promise<SendResult> {
  if (!token) {
    return { ok: false, error: "TOKEN_MISSING" };
  }
  try {
    const res = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: target,
          text: text.slice(0, 4000),
          parse_mode: "HTML",
          disable_web_page_preview: true,
        }),
      },
    );
    const data = (await res.json()) as {
      ok: boolean;
      result?: { message_id: number };
      description?: string;
    };
    if (!data.ok) {
      logger.error("[telegram-post-bot] sendMessage failed", {
        description: data.description,
        target,
      });
      return { ok: false, error: data.description || "UNKNOWN" };
    }
    return { ok: true, message_id: data.result?.message_id };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error("[telegram-post-bot] sendMessage threw", { message });
    return { ok: false, error: message };
  }
}

/**
 * Edit an existing channel post — used to update Tonight-Special
 * posts in place when availability changes, without spamming the
 * subscriber list with new notifications.
 */
export async function editChannelMessage(
  token: string,
  messageId: number,
  newText: string,
  target: string = TELEGRAM_CHANNEL,
): Promise<SendResult> {
  if (!token) {
    return { ok: false, error: "TOKEN_MISSING" };
  }
  try {
    const res = await fetch(
      `https://api.telegram.org/bot${token}/editMessageText`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: target,
          message_id: messageId,
          text: newText.slice(0, 4000),
          parse_mode: "HTML",
          disable_web_page_preview: true,
        }),
      },
    );
    const data = (await res.json()) as {
      ok: boolean;
      description?: string;
    };
    if (!data.ok) {
      logger.warn("[telegram-post-bot] editMessage failed", {
        description: data.description,
        messageId,
      });
      return { ok: false, error: data.description || "UNKNOWN" };
    }
    return { ok: true, message_id: messageId };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: message };
  }
}
