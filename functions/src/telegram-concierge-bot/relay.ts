// functions/src/telegram-concierge-bot/relay.ts
//
// 🆕 Round 28s125 — FAQ-menu evolution of the greeter bot. The bot now:
//   1. On /start (or first DM) → sends welcome with 6-button menu
//   2. On callback button tap → replies in-place with the FAQ entry
//   3. "Available now" button → fetches live standby from Firestore
//      (re-uses telegram-post-bot/availability.ts)
//   4. "Chat with concierge" button → URL link to @SunRedvip_bkk /
//      @YuNiSpaBkk based on lang
//
// Customer can resolve ~80% of routine inquiries themselves before
// ever pinging View's personal account.

import { logger } from "firebase-functions/v2";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

import {
  sendMessage,
  editMessageText,
  answerCallbackQuery,
  type InlineKeyboard,
} from "./client";
import {
  welcomeFor,
  buttonLabelFor,
  conciergeHandleFor,
  normalizeLang,
  type Lang,
} from "./greetings";
import {
  faqEntry,
  menuTitleFor,
  backLabel,
  websiteUrlFor,
  websiteLabel,
  availabilityHeaderFor,
  availabilityEmptyFor,
  type FaqKey,
} from "./faq";
import { fetchAvailableTherapists } from "../telegram-post-bot/availability";

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

interface TelegramCallbackQuery {
  id: string;
  from: TelegramUser;
  message?: TelegramMessage;
  data?: string;
}

// ─────────────────────────────────────────────────────────────
// Save customer metadata.
// 🆕 28x.85 (founder: "เราจะรู้ได้ไงว่ามีลูกค้าทักหาเราบ้างไหม") — this used
//   to stamp `firstSeenAt: serverTimestamp()` on EVERY message (merge
//   write with no existence check), so it silently drifted into just
//   another "last written" field — never actually "first seen". Fixed
//   as a side effect of adding the isNew check the admin notification
//   below needs anyway: only stamp firstSeenAt the first time the doc
//   is created.
// ─────────────────────────────────────────────────────────────
async function upsertCustomerChat(
  from: TelegramUser,
): Promise<{ lang: Lang; isNew: boolean }> {
  const lang = normalizeLang(from.language_code);
  const ref = getFirestore().collection(CHATS_COLLECTION).doc(String(from.id));
  const existing = await ref.get();
  const isNew = !existing.exists;
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
      ...(isNew ? { firstSeenAt: FieldValue.serverTimestamp() } : {}),
    },
    { merge: true },
  );
  return { lang, isNew };
}

// 🆕 28x.85 — ping the SAME admin group the booking bot already posts
//   to (TELEGRAM_CHAT_ID, "SunRed Booking"), using the DISPATCH bot's
//   token — @SunRedGreeterBot is not a member of that group, only
//   @SunRed24hBot is, so posting as the concierge bot would silently
//   fail. Fires once per customer (on their first-ever message), not
//   per message, so a customer working through the FAQ menu doesn't
//   spam the group.
const ADMIN_GROUP_CHAT_ID = "-1002962073895";

async function notifyAdminNewConciergeCustomer(
  adminToken: string,
  lang: Lang,
  from: TelegramUser,
): Promise<void> {
  if (!adminToken) return;
  const who = from.first_name ?? from.username ?? "ลูกค้าใหม่";
  const text = [
    `🔔 ลูกค้าใหม่ทัก concierge bot ครั้งแรก`,
    `${who} · ภาษา: ${lang.toUpperCase()}`,
  ].join("\n");
  try {
    await fetch(`https://api.telegram.org/bot${adminToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: ADMIN_GROUP_CHAT_ID,
        text,
        disable_web_page_preview: true,
      }),
    });
  } catch (err) {
    logger.error("[concierge-bot] notifyAdminNewConciergeCustomer failed", { err });
  }
}

// ─────────────────────────────────────────────────────────────
// Build the 6-button menu keyboard.
// ─────────────────────────────────────────────────────────────
function buildMenuKeyboard(lang: Lang): InlineKeyboard {
  const concierge = conciergeHandleFor(lang);
  return [
    [
      { text: menuTitleFor("pricing", lang), callback_data: "faq:pricing" },
      { text: menuTitleFor("services", lang), callback_data: "faq:services" },
    ],
    [
      { text: menuTitleFor("areas", lang), callback_data: "faq:areas" },
      { text: menuTitleFor("available", lang), callback_data: "faq:available" },
    ],
    [
      { text: menuTitleFor("howto", lang), callback_data: "faq:howto" },
      { text: menuTitleFor("membership", lang), callback_data: "faq:membership" },
    ],
    [
      { text: buttonLabelFor(lang), url: concierge.url },
    ],
  ];
}

// ─────────────────────────────────────────────────────────────
// Build a "single FAQ + website + back + concierge" keyboard.
// 🆕 28x.84 — the website link is keyed to which FAQ is showing, so
//   "Pricing" links to /pricing, "Services" to /services, etc.
// ─────────────────────────────────────────────────────────────
function buildFaqDetailKeyboard(lang: Lang, key: FaqKey | "available"): InlineKeyboard {
  const concierge = conciergeHandleFor(lang);
  return [
    [{ text: websiteLabel(lang), url: websiteUrlFor(key) }],
    [{ text: backLabel(lang), callback_data: "faq:menu" }],
    [{ text: buttonLabelFor(lang), url: concierge.url }],
  ];
}

// ─────────────────────────────────────────────────────────────
// Send the welcome + main menu.
// ─────────────────────────────────────────────────────────────
async function sendWelcomeWithMenu(
  token: string,
  chatId: number,
  lang: Lang,
): Promise<void> {
  await sendMessage(token, chatId, welcomeFor(lang), {
    inlineKeyboard: buildMenuKeyboard(lang),
  });
}

// ─────────────────────────────────────────────────────────────
// Customer message handler.
// ─────────────────────────────────────────────────────────────
export async function handleCustomerMessage(
  msg: TelegramMessage,
  token: string,
  adminToken: string,
): Promise<void> {
  if (!msg.from) return;
  const { lang, isNew } = await upsertCustomerChat(msg.from);
  if (isNew) {
    await notifyAdminNewConciergeCustomer(adminToken, lang, msg.from);
  }

  // /start → fresh welcome with menu
  if (msg.text?.trim() === "/start") {
    await sendWelcomeWithMenu(token, msg.chat.id, lang);
    return;
  }

  // First-ever message that isn't /start → still send welcome
  const snap = await getFirestore()
    .collection(CHATS_COLLECTION)
    .doc(String(msg.from.id))
    .get();
  const count = Number(snap.data()?.messageCount ?? 0);

  if (count <= 1) {
    await sendWelcomeWithMenu(token, msg.chat.id, lang);
    return;
  }

  // Subsequent free-text messages — send menu again as gentle nudge.
  // Most customers will tap a button rather than type, but if they
  // ask in natural language we still surface the menu options.
  await sendWelcomeWithMenu(token, msg.chat.id, lang);
}

// ─────────────────────────────────────────────────────────────
// Build the FAQ detail message for a topic.
// ─────────────────────────────────────────────────────────────
async function buildFaqDetailMessage(
  key: FaqKey | "available",
  lang: Lang,
): Promise<string> {
  if (key === "available") {
    const therapists = await fetchAvailableTherapists();
    if (therapists.length === 0) {
      return availabilityEmptyFor(lang);
    }
    const lines = therapists
      .slice(0, 6)
      .map((t) => {
        const bio = t.bios[lang] || t.bios.en || "";
        return `<b>${t.name}</b> · ${t.area}\n<i>${bio}</i>`;
      })
      .join("\n\n");
    return `${availabilityHeaderFor(lang)}\n\n${lines}`;
  }
  return faqEntry(key, lang).body;
}

// ─────────────────────────────────────────────────────────────
// Callback query (button tap) handler.
// ─────────────────────────────────────────────────────────────
export async function handleCallbackQuery(
  query: TelegramCallbackQuery,
  token: string,
): Promise<void> {
  if (!query.message || !query.data) {
    await answerCallbackQuery(token, query.id);
    return;
  }

  const lang = normalizeLang(query.from.language_code);
  const chatId = query.message.chat.id;
  const messageId = query.message.message_id;

  // Dismiss the spinner immediately.
  await answerCallbackQuery(token, query.id);

  // data format: "faq:pricing" | "faq:services" | "faq:areas" |
  //              "faq:available" | "faq:howto" | "faq:menu"
  const [namespace, key] = query.data.split(":");
  if (namespace !== "faq") return;

  if (key === "menu") {
    // Back to main menu — replace message with welcome + menu.
    await editMessageText(token, chatId, messageId, welcomeFor(lang), {
      inlineKeyboard: buildMenuKeyboard(lang),
    });
    return;
  }

  if (
    key === "pricing" ||
    key === "services" ||
    key === "areas" ||
    key === "howto" ||
    key === "membership" ||
    key === "available"
  ) {
    const body = await buildFaqDetailMessage(key as FaqKey | "available", lang);
    await editMessageText(token, chatId, messageId, body, {
      inlineKeyboard: buildFaqDetailKeyboard(lang, key as FaqKey | "available"),
    });
    return;
  }
}

// ─────────────────────────────────────────────────────────────
// Top-level dispatcher.
// ─────────────────────────────────────────────────────────────
export async function handleUpdate(
  update: {
    message?: TelegramMessage;
    callback_query?: TelegramCallbackQuery;
  },
  token: string,
  adminToken: string,
): Promise<void> {
  if (update.callback_query) {
    try {
      await handleCallbackQuery(update.callback_query, token);
    } catch (err) {
      logger.error("[concierge-bot] callback handler threw", { err });
    }
    return;
  }

  const msg = update.message;
  if (!msg || msg.chat.type !== "private") return;
  if (!msg.from) return;

  try {
    await handleCustomerMessage(msg, token, adminToken);
  } catch (err) {
    logger.error("[concierge-bot] message handler threw", { err });
  }
}
