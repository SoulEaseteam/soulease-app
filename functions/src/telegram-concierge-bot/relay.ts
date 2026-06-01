// functions/src/telegram-concierge-bot/relay.ts
//
// 🆕 Round 28s117 — Concierge bot ↔ admin group relay.
//
// Flow:
//   1. Customer DMs the bot in private chat
//   2. Bot saves a `conciergeChats/{chatId}` doc with lang + name
//   3. Bot copies the message into the admin group with a HEADER that
//      embeds the customer's chat_id, language, and display name —
//      e.g., `[chat:123456789] [lang:zh] John Doe (@john_doe)`
//   4. Bot auto-replies to customer ("got it · concierge notified")
//   5. When View REPLIES to that forwarded message inside the admin
//      group, the bot parses the header in `reply_to_message.text` and
//      sends View's reply back to the original customer's chat.
//
// Why this design: View doesn't need a separate admin UI — she just
// uses Telegram's native swipe-to-reply UX in the existing admin group.
// One unified inbox.

import { logger } from "firebase-functions/v2";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

import { sendMessage, copyMessage } from "./client";
import {
  welcomeFor,
  autoReplyAfterForward,
  normalizeLang,
  type Lang,
} from "./greetings";

const CHATS_COLLECTION = "conciergeChats";

/** Admin group chat ID — re-uses the same group that the booking bot
 *  already alerts so View has one Telegram surface for everything.
 *  Source: TELEGRAM_CHAT_ID constant in functions/src/index.ts. */
const ADMIN_CHAT_ID = "-1002962073895";

interface TelegramUser {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

interface TelegramChat {
  id: number;
  type: "private" | "group" | "supergroup" | "channel";
}

interface TelegramMessage {
  message_id: number;
  from?: TelegramUser;
  chat: TelegramChat;
  date: number;
  text?: string;
  reply_to_message?: TelegramMessage;
}

// ─────────────────────────────────────────────────────────────
// Customer chat metadata
// ─────────────────────────────────────────────────────────────
async function upsertCustomerChat(msg: TelegramMessage): Promise<Lang> {
  const from = msg.from;
  if (!from) return "en";
  const lang = normalizeLang(from.language_code);
  const ref = getFirestore().collection(CHATS_COLLECTION).doc(String(from.id));
  await ref.set(
    {
      chatId: from.id,
      lang,
      languageCode: from.language_code ?? null,
      firstName: from.first_name ?? null,
      lastName: from.last_name ?? null,
      username: from.username ?? null,
      lastMessageAt: FieldValue.serverTimestamp(),
      messageCount: FieldValue.increment(1),
      firstSeenAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
  return lang;
}

function displayName(from: TelegramUser | undefined): string {
  if (!from) return "Unknown";
  const parts = [from.first_name, from.last_name].filter(Boolean);
  const name = parts.join(" ") || from.username || `id:${from.id}`;
  return from.username ? `${name} (@${from.username})` : name;
}

// ─────────────────────────────────────────────────────────────
// Customer → Admin forward
// ─────────────────────────────────────────────────────────────
export async function handleCustomerMessage(
  msg: TelegramMessage,
  token: string,
): Promise<void> {
  if (!msg.from) return;
  const lang = await upsertCustomerChat(msg);

  // /start → welcome only (no forward to avoid spamming admin with
  // empty pings on every fresh chat).
  if (msg.text?.trim() === "/start") {
    await sendMessage(token, msg.chat.id, welcomeFor(lang));
    return;
  }

  // Forward to admin group with embedded chat_id header.
  // The header is plain text so it survives copyMessage's caption
  // limits and is parseable on the reply side.
  const header =
    `<b>[chat:${msg.from.id}]</b> [lang:${lang}] ` +
    `<i>${displayName(msg.from)}</i>`;

  const copied = await copyMessage(
    token,
    msg.chat.id,
    msg.message_id,
    ADMIN_CHAT_ID,
    header,
  );

  if (!copied.ok) {
    logger.error("[concierge-bot] forward to admin failed", {
      error: copied.error,
      customerId: msg.from.id,
    });
    return;
  }

  // Acknowledge customer so they know we got it.
  await sendMessage(token, msg.chat.id, autoReplyAfterForward(lang));
}

// ─────────────────────────────────────────────────────────────
// Admin → Customer relay (admin replies to forwarded msg in group)
// ─────────────────────────────────────────────────────────────
/**
 * Parse the header embedded in a forwarded message's caption to
 * extract the customer's chat_id. Returns null when the message isn't
 * one of ours (e.g., admin chatter unrelated to concierge).
 */
function extractCustomerChatId(text: string | undefined): string | null {
  if (!text) return null;
  const m = text.match(/\[chat:(\d+)\]/);
  return m ? m[1] : null;
}

export async function handleAdminReply(
  msg: TelegramMessage,
  token: string,
): Promise<void> {
  const replyTarget = msg.reply_to_message;
  if (!replyTarget) return;
  if (String(msg.chat.id) !== ADMIN_CHAT_ID) return;

  const customerChatId = extractCustomerChatId(replyTarget.text);
  if (!customerChatId) return;
  if (!msg.text) return;

  const res = await sendMessage(token, customerChatId, msg.text);
  if (!res.ok) {
    logger.error("[concierge-bot] admin → customer relay failed", {
      error: res.error,
      customerChatId,
    });
    // Notify admin group so View knows the relay failed.
    await sendMessage(
      token,
      ADMIN_CHAT_ID,
      `⚠️ Reply to chat:${customerChatId} failed — ${res.error}`,
      { replyTo: msg.message_id },
    );
  }
}

// ─────────────────────────────────────────────────────────────
// Top-level dispatcher
// ─────────────────────────────────────────────────────────────
export async function handleUpdate(
  update: { message?: TelegramMessage },
  token: string,
): Promise<void> {
  const msg = update.message;
  if (!msg) return;

  // Private chat = customer DM
  if (msg.chat.type === "private") {
    await handleCustomerMessage(msg, token);
    return;
  }

  // Admin group reply
  if (
    (msg.chat.type === "group" || msg.chat.type === "supergroup") &&
    msg.reply_to_message
  ) {
    await handleAdminReply(msg, token);
    return;
  }

  // Anything else (channel, non-reply group chatter) — ignore.
}
