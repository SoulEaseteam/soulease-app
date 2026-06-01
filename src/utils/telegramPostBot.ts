// src/utils/telegramPostBot.ts
//
// 🆕 Round 28s116 — Client wrapper for the postToChannelManual callable
//   (functions/src/telegram-post-bot/). Lets View fire ad-hoc Telegram
//   channel posts from the AdminTelegramPanel without dropping into the
//   terminal or Cloud Scheduler console.
//
// All language codes match the bot's SUPPORTED_LANGS server-side:
//   en · th · zh · ja · ko
//
// Auth: callable enforces role === "admin" via custom claim. Caller
// must be signed in as an admin user.

import { getFunctions, httpsCallable } from "firebase/functions";
import { app as firebaseApp } from "@/lib/firebase";

export type PostLang = "en" | "th" | "zh" | "ja" | "ko";

export type PostKind =
  | "tonight"
  | "spotlight"
  | "lineup"
  | "weekend"
  | "welcome";

export interface PostPayload {
  kind: PostKind;
  /** Required for tonight/spotlight when overriding the auto-rotation. */
  therapistId?: string;
  /** Required for lineup — at least 2 IDs. */
  therapistIds?: string[];
  /** Defaults to "en" server-side if omitted/invalid. */
  lang?: PostLang;
}

export interface PostResult {
  ok: boolean;
  messageId?: number;
  /** Which channel the post landed in (e.g., "@SunRed_BKK", "@YuNiSpaBkk"). */
  channel?: string;
}

/** Display-only mapping that mirrors the server-side channelForLang().
 *  Keep in sync with functions/src/telegram-post-bot/client.ts. */
export function channelForLang(lang: PostLang): string {
  return lang === "zh" ? "@manguyujianniSPA" : "@SunRed_BKK";
}

export async function postToChannel(payload: PostPayload): Promise<PostResult> {
  const functions = getFunctions(firebaseApp, "us-central1");
  const callable = httpsCallable<PostPayload, PostResult>(
    functions,
    "postToChannelManual",
  );
  const res = await callable(payload);
  return res.data;
}
