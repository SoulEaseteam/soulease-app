// src/utils/telegramPostBot.ts
//
// 🆕 Round 28s224 — Client wrapper for the simplified postToChannelManual
//   callable. Drops therapist-specific kinds (tonight/spotlight/lineup)
//   and the broadcast / welcome posts. Now only 3 brand promo kinds
//   matching the auto-scheduled fan-out.
//
// All language codes match the bot's SUPPORTED_LANGS server-side:
//   en · th · zh · ja · ko
//
// Auth: callable enforces role === "admin" via custom claim. Caller
// must be signed in as an admin user.

import { getFunctions, httpsCallable } from "firebase/functions";
import { app as firebaseApp } from "@/lib/firebase";

export type PostLang = "en" | "th" | "zh" | "zh-TW" | "ja" | "ko";

export type PostKind = "evening" | "prime" | "late";

export interface PostPayload {
  kind: PostKind;
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
 *  Keep in sync with functions/src/telegram-post-bot/client.ts.
 *  🆕 Round 28x.99f — zh-TW intentionally routes to the EN channel, NOT
 *  @manguyujianniSPA — that channel is a dedicated mainland-CN sub-brand
 *  (曼谷遇你SPA), and its existing subscriber base didn't sign up for
 *  Traditional-Chinese posts. A Taiwan/HK channel would be a real new
 *  acquisition-channel decision, not a code default — see CLAUDE.md. */
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
