// functions/src/telegram-concierge-bot/relay.ts
//
// 🆕 Round 28s123 — Refactored from a forwarding relay into a simple
//   router. Customer DMs the bot → bot auto-greets in their language
//   and offers a tap-button to the appropriate concierge personal
//   account (@YuNiSpaBkk for ZH, @SunRedvip_bkk for others). No
//   message forwarding · no admin-group reply tracking. View handles
//   actual chat in her personal Telegram account as she's already
//   doing.
//
// Why simpler: solo founder workflow is already set up around 2
// personal accounts. The bot's job is the part personal accounts
// CAN'T do — instant auto-greet in 5 languages 24/7.

import { logger } from "firebase-functions/v2";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

import { sendMessage } from "./client";
import {
  welcomeFor,
  buttonLabelFor,
  nudgeFor,
  conciergeHandleFor,
  normalizeLang,
  type Lang,
} from "./greetings";

const CHATS_COLLECTION = "conciergeChats";

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
}

// ─────────────────────────────────────────────────────────────
// Save customer metadata + count messages so View can see who's
// been engaging in the Firestore admin view.
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

// ─────────────────────────────────────────────────────────────
// Send the welcome + route button. Called on /start and on the
// customer's FIRST non-/start message (so they always see the
// route even if they skip /start).
// ─────────────────────────────────────────────────────────────
async function sendWelcomeWithRoute(
  token: string,
  chatId: number,
  lang: Lang,
): Promise<void> {
  const route = conciergeHandleFor(lang);
  await sendMessage(token, chatId, welcomeFor(lang), {
    inlineKeyboard: [
      [{ text: buttonLabelFor(lang), url: route.url }],
    ],
  });
}

// ─────────────────────────────────────────────────────────────
// Main handler — only acts on private DMs. Groups/channels are
// ignored (the bot doesn't need to do anything there for this
// router design).
// ─────────────────────────────────────────────────────────────
export async function handleUpdate(
  update: { message?: TelegramMessage },
  token: string,
): Promise<void> {
  const msg = update.message;
  if (!msg || msg.chat.type !== "private") return;
  if (!msg.from) return;

  const lang = await upsertCustomerChat(msg);

  // /start = always send the welcome
  if (msg.text?.trim() === "/start") {
    await sendWelcomeWithRoute(token, msg.chat.id, lang);
    return;
  }

  // First-ever message that isn't /start — send welcome anyway so
  // the customer sees the route. We detect "first message" by reading
  // messageCount from Firestore after the upsert.
  const snap = await getFirestore()
    .collection(CHATS_COLLECTION)
    .doc(String(msg.from.id))
    .get();
  const count = Number(snap.data()?.messageCount ?? 0);

  if (count <= 1) {
    await sendWelcomeWithRoute(token, msg.chat.id, lang);
    return;
  }

  // Subsequent messages — gentle nudge to use the button (View hasn't
  // got time to monitor the bot inbox individually; the personal
  // accounts are where conversation should happen).
  try {
    await sendMessage(token, msg.chat.id, nudgeFor(lang), {
      inlineKeyboard: [
        [
          {
            text: buttonLabelFor(lang),
            url: conciergeHandleFor(lang).url,
          },
        ],
      ],
    });
  } catch (err) {
    logger.warn("[concierge-bot] nudge failed", { err });
  }
}
