// functions/src/telegram-post-bot/index.ts
//
// 🆕 Round 28s224 — Pivot from per-therapist posts to brand-level promo
//   posts that fan out at 3 fixed BKK prime times. Privacy-first: no
//   individual practitioner name ever appears on the public channel.
//
// Posting cadence (3 posts/day, every day, both channels):
//   Daily 18:00 BKK  →  Evening Opening (warm-up / planning)
//   Daily 22:00 BKK  →  Prime Time (peak open / CTA)
//   Daily 01:00 BKK  →  Late Night (still-open / last-call)
//
// Each cron posts to both channels in parallel:
//   @SunRed_BKK        →  EN
//   @manguyujianniSPA  →  ZH
//
// Logs: every send writes to `telegramPosts` Firestore collection with
// kind + lang + channel + message_id for audit + future analytics.

import { onSchedule } from "firebase-functions/v2/scheduler";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { logger } from "firebase-functions/v2";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

import { sendChannelMessage, channelForLang, CHANNELS } from "./client";
import {
  renderEveningOpen,
  renderPrimeTime,
  renderLateNight,
} from "./templates";
import type { Lang } from "./rotation";

const SUPPORTED_LANGS: Lang[] = ["en", "th", "zh", "ja", "ko"];

function normalizeLang(input: unknown): Lang {
  if (typeof input !== "string") return "en";
  const v = input.toLowerCase().slice(0, 2) as Lang;
  return SUPPORTED_LANGS.includes(v) ? v : "en";
}

const TELEGRAM_POST_BOT_TOKEN = defineSecret("TELEGRAM_POST_BOT_TOKEN");

const POSTS_COLLECTION = "telegramPosts";

// ─────────────────────────────────────────────────────────────
// Helper: log every send to Firestore for audit.
// ─────────────────────────────────────────────────────────────
async function recordPost(payload: {
  kind: string;
  messageId?: number;
  manual?: boolean;
  adminUid?: string;
  lang?: Lang;
  channel?: string;
  ok: boolean;
  error?: string;
}): Promise<void> {
  try {
    await getFirestore()
      .collection(POSTS_COLLECTION)
      .add({
        ...payload,
        postedAt: FieldValue.serverTimestamp(),
      });
  } catch (err) {
    logger.warn("[telegram-post-bot] recordPost failed", { err });
  }
}

// ─────────────────────────────────────────────────────────────
// Promo kinds — single source of truth for routing.
// ─────────────────────────────────────────────────────────────
type PromoKind = "evening" | "prime" | "late";

function renderByKind(kind: PromoKind, lang: Lang): string {
  switch (kind) {
    case "evening":
      return renderEveningOpen(lang);
    case "prime":
      return renderPrimeTime(lang);
    case "late":
      return renderLateNight(lang);
  }
}

// Shared fan-out logic for scheduled posts.
async function broadcastPromo(kind: PromoKind, token: string): Promise<void> {
  const targets: { lang: Lang; channel: string }[] = [
    { lang: "en", channel: CHANNELS.EN },
    { lang: "zh", channel: CHANNELS.ZH },
  ];
  for (const target of targets) {
    const text = renderByKind(kind, target.lang);
    const res = await sendChannelMessage(token, text, target.channel);
    if (res.ok) {
      logger.info(`[promo:${kind}] posted`, {
        lang: target.lang,
        channel: target.channel,
        message_id: res.message_id,
      });
    } else {
      logger.error(`[promo:${kind}] failed`, {
        lang: target.lang,
        channel: target.channel,
        error: res.error,
      });
    }
    await recordPost({
      kind,
      messageId: res.message_id,
      lang: target.lang,
      channel: target.channel,
      ok: res.ok,
      error: res.error,
    });
  }
}

// ─────────────────────────────────────────────────────────────
// Scheduled · Daily 18:00 BKK — Evening Opening
//   Cron in UTC: 0 11 * * *  (BKK = UTC+7)
// ─────────────────────────────────────────────────────────────
export const scheduledChannelEvening = onSchedule(
  {
    schedule: "0 11 * * *",
    timeZone: "UTC",
    secrets: [TELEGRAM_POST_BOT_TOKEN],
  },
  async () => {
    const token = TELEGRAM_POST_BOT_TOKEN.value().trim();
    if (!token) {
      logger.error("[scheduledChannelEvening] TELEGRAM_POST_BOT_TOKEN missing");
      return;
    }
    await broadcastPromo("evening", token);
  },
);

// ─────────────────────────────────────────────────────────────
// Scheduled · Daily 22:00 BKK — Prime Time
//   Cron in UTC: 0 15 * * *  (BKK = UTC+7)
// ─────────────────────────────────────────────────────────────
export const scheduledChannelPrime = onSchedule(
  {
    schedule: "0 15 * * *",
    timeZone: "UTC",
    secrets: [TELEGRAM_POST_BOT_TOKEN],
  },
  async () => {
    const token = TELEGRAM_POST_BOT_TOKEN.value().trim();
    if (!token) {
      logger.error("[scheduledChannelPrime] TELEGRAM_POST_BOT_TOKEN missing");
      return;
    }
    await broadcastPromo("prime", token);
  },
);

// ─────────────────────────────────────────────────────────────
// Scheduled · Daily 01:00 BKK (next day) — Late Night
//   Cron in UTC: 0 18 * * *  (previous calendar day in UTC)
// ─────────────────────────────────────────────────────────────
export const scheduledChannelLate = onSchedule(
  {
    schedule: "0 18 * * *",
    timeZone: "UTC",
    secrets: [TELEGRAM_POST_BOT_TOKEN],
  },
  async () => {
    const token = TELEGRAM_POST_BOT_TOKEN.value().trim();
    if (!token) {
      logger.error("[scheduledChannelLate] TELEGRAM_POST_BOT_TOKEN missing");
      return;
    }
    await broadcastPromo("late", token);
  },
);

// ─────────────────────────────────────────────────────────────
// Callable · postToChannelManual — admin-only ad-hoc promo post.
//
// Payload:
//   { kind: "evening" | "prime" | "late",
//     lang?: "en" | "th" | "zh" | "ja" | "ko"   // defaults to en
//   }
//
// Routes by lang: zh → @YuNiSpaBkk · others → @SunRed_BKK.
// ─────────────────────────────────────────────────────────────
export const postToChannelManual = onCall(
  {
    secrets: [TELEGRAM_POST_BOT_TOKEN],
  },
  async (req) => {
    // Auth gate — admin only.
    const role = (req.auth?.token as { role?: string } | undefined)?.role;
    if (role !== "admin") {
      throw new HttpsError("permission-denied", "Admin role required");
    }

    const token = TELEGRAM_POST_BOT_TOKEN.value().trim();
    if (!token) {
      throw new HttpsError(
        "failed-precondition",
        "TELEGRAM_POST_BOT_TOKEN secret not configured",
      );
    }

    const { kind, lang: langRaw } = (req.data ?? {}) as {
      kind?: string;
      lang?: string;
    };
    const lang = normalizeLang(langRaw);

    if (kind !== "evening" && kind !== "prime" && kind !== "late") {
      throw new HttpsError(
        "invalid-argument",
        `Unknown kind: ${kind} (expected evening | prime | late)`,
      );
    }

    const text = renderByKind(kind, lang);
    const channel = channelForLang(lang);
    const res = await sendChannelMessage(token, text, channel);
    await recordPost({
      kind,
      messageId: res.message_id,
      manual: true,
      adminUid: req.auth?.uid,
      lang,
      channel,
      ok: res.ok,
      error: res.error,
    });

    if (!res.ok) {
      throw new HttpsError("internal", res.error || "Send failed");
    }
    return { ok: true, messageId: res.message_id, channel };
  },
);
