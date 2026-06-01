// functions/src/telegram-post-bot/index.ts
//
// 🆕 Round 28s115 — Cloud Function bindings for @SunRedPostBot.
//
// Two scheduled functions (Monday spotlight + Friday weekend) and one
// admin-only callable for manual posts. All read the bot token from
// the TELEGRAM_POST_BOT_TOKEN secret — see telegram-post-bot/client.ts
// for the rationale on bot separation.
//
// Posting cadence (3 posts/week minimum, per docs/telegram-templates.md):
//   Mon 20:00 BKK  →  Practitioner Spotlight (rotates 11 non-Yuri)
//   Fri 18:00 BKK  →  Weekend Forecast (static)
//   Manual         →  Tonight Special / Lineup / Yuri / Welcome Back
//
// Logs: every successful post writes to `telegramPosts` Firestore
// collection with kind + therapistId + message_id so View can audit
// what went out without scrolling the channel.

import { onSchedule } from "firebase-functions/v2/scheduler";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { logger } from "firebase-functions/v2";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

import { sendChannelMessage, channelForLang, CHANNELS } from "./client";
import {
  renderSpotlight,
  renderTonightSpecial,
  renderTonightLineup,
  renderWeekendForecast,
  renderWelcomeBack,
} from "./templates";
import {
  pickNextSpotlight,
  findInRoster,
  POST_ROSTER,
  type TherapistRecord,
  type Lang,
} from "./rotation";
import { fetchAvailableTherapists } from "./availability";

const SUPPORTED_LANGS: Lang[] = ["en", "th", "zh", "ja", "ko"];

function normalizeLang(input: unknown): Lang {
  if (typeof input !== "string") return "en";
  const v = input.toLowerCase().slice(0, 2) as Lang;
  return SUPPORTED_LANGS.includes(v) ? v : "en";
}

const TELEGRAM_POST_BOT_TOKEN = defineSecret("TELEGRAM_POST_BOT_TOKEN");

const POSTS_COLLECTION = "telegramPosts";

// ─────────────────────────────────────────────────────────────
// Helper: log every send to Firestore for audit + future analytics.
// ─────────────────────────────────────────────────────────────
async function recordPost(payload: {
  kind: string;
  messageId?: number;
  therapistId?: string;
  therapistName?: string;
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
// Scheduled: Monday 20:00 BKK — Practitioner Spotlight rotation
//   Cron in UTC: 0 13 * * 1  (BKK = UTC+7)
// ─────────────────────────────────────────────────────────────
export const scheduledChannelSpotlight = onSchedule(
  {
    schedule: "0 13 * * 1",
    timeZone: "UTC",
    secrets: [TELEGRAM_POST_BOT_TOKEN],
  },
  async () => {
    const token = TELEGRAM_POST_BOT_TOKEN.value().trim();
    if (!token) {
      logger.error(
        "[scheduledChannelSpotlight] TELEGRAM_POST_BOT_TOKEN missing",
      );
      return;
    }
    // 🆕 Round 28s118 — Fan-out to BOTH channels in their primary
    //   languages: EN to @SunRed_BKK, ZH to @YuNiSpaBkk. One rotation
    //   pick · two parallel posts. Each is logged separately to
    //   telegramPosts so audits/metrics stay per-channel.
    const therapist = await pickNextSpotlight();
    const targets: { lang: Lang; channel: string }[] = [
      { lang: "en", channel: CHANNELS.EN },
      { lang: "zh", channel: CHANNELS.ZH },
    ];
    for (const target of targets) {
      const text = renderSpotlight(therapist, target.lang);
      const res = await sendChannelMessage(token, text, target.channel);
      if (res.ok) {
        logger.info("[scheduledChannelSpotlight] posted", {
          name: therapist.name,
          lang: target.lang,
          channel: target.channel,
          message_id: res.message_id,
        });
      } else {
        logger.error("[scheduledChannelSpotlight] failed", {
          lang: target.lang,
          channel: target.channel,
          error: res.error,
        });
      }
      await recordPost({
        kind: "spotlight",
        messageId: res.message_id,
        therapistId: therapist.id,
        therapistName: therapist.name,
        lang: target.lang,
        channel: target.channel,
        ok: res.ok,
        error: res.error,
      });
    }
  },
);

// ─────────────────────────────────────────────────────────────
// Scheduled: Friday 18:00 BKK — Weekend Forecast
//   Cron in UTC: 0 11 * * 5
// ─────────────────────────────────────────────────────────────
export const scheduledChannelWeekend = onSchedule(
  {
    schedule: "0 11 * * 5",
    timeZone: "UTC",
    secrets: [TELEGRAM_POST_BOT_TOKEN],
  },
  async () => {
    const token = TELEGRAM_POST_BOT_TOKEN.value().trim();
    if (!token) {
      logger.error(
        "[scheduledChannelWeekend] TELEGRAM_POST_BOT_TOKEN missing",
      );
      return;
    }
    // 🆕 Round 28s118 — Fan-out (see scheduledChannelSpotlight comment).
    const targets: { lang: Lang; channel: string }[] = [
      { lang: "en", channel: CHANNELS.EN },
      { lang: "zh", channel: CHANNELS.ZH },
    ];
    for (const target of targets) {
      const text = renderWeekendForecast(target.lang);
      const res = await sendChannelMessage(token, text, target.channel);
      if (res.ok) {
        logger.info("[scheduledChannelWeekend] posted", {
          lang: target.lang,
          channel: target.channel,
          message_id: res.message_id,
        });
      } else {
        logger.error("[scheduledChannelWeekend] failed", {
          lang: target.lang,
          channel: target.channel,
          error: res.error,
        });
      }
      await recordPost({
        kind: "weekend",
        messageId: res.message_id,
        lang: target.lang,
        channel: target.channel,
        ok: res.ok,
        error: res.error,
      });
    }
  },
);

// ─────────────────────────────────────────────────────────────
// Callable: postToChannelManual — admin-only ad-hoc post.
//
// Payload:
//   { kind: "tonight" | "spotlight" | "lineup" | "weekend" | "welcome",
//     therapistId?: string,      // for tonight/spotlight; if omitted,
//                                // rotation auto-picks
//     therapistIds?: string[],   // for lineup
//   }
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

    const { kind, therapistId, therapistIds, lang: langRaw } =
      (req.data ?? {}) as {
        kind?: string;
        therapistId?: string;
        therapistIds?: string[];
        lang?: string;
      };
    const lang = normalizeLang(langRaw);

    let text: string;
    let pickedTherapist: TherapistRecord | undefined;

    switch (kind) {
      case "tonight": {
        // 🆕 Round 28s119 — when no therapistId is provided, pick the
        //   FIRST currently-available therapist from live Firestore
        //   status (admin dashboard data) instead of the rotation. The
        //   channel says "TONIGHT" — should reflect actual standby.
        if (therapistId) {
          pickedTherapist = findInRoster(therapistId);
        } else {
          const available = await fetchAvailableTherapists();
          pickedTherapist = available[0];
        }
        if (!pickedTherapist) {
          throw new HttpsError(
            "not-found",
            therapistId
              ? `Therapist ${therapistId} not in posting roster`
              : "No therapist is currently available · check admin dashboard",
          );
        }
        text = renderTonightSpecial(pickedTherapist, lang);
        break;
      }
      case "spotlight": {
        pickedTherapist = therapistId
          ? findInRoster(therapistId)
          : await pickNextSpotlight();
        if (!pickedTherapist) {
          throw new HttpsError(
            "not-found",
            `Therapist ${therapistId} not in posting roster`,
          );
        }
        text = renderSpotlight(pickedTherapist, lang);
        break;
      }
      case "lineup": {
        const ids = therapistIds ?? [];
        let picks: TherapistRecord[];
        // 🆕 Round 28s119 — when no IDs provided, auto-fetch the live
        //   standby list from Firestore (admin dashboard data). Caps at
        //   4 entries since the template only renders the first 4.
        if (ids.length === 0) {
          picks = await fetchAvailableTherapists();
          if (picks.length < 2) {
            throw new HttpsError(
              "not-found",
              "Need at least 2 standby therapists for a lineup · check admin dashboard",
            );
          }
          picks = picks.slice(0, 4);
        } else if (ids.length < 2) {
          throw new HttpsError(
            "invalid-argument",
            "lineup requires therapistIds with at least 2 entries (or omit to use live availability)",
          );
        } else {
          picks = ids
            .map((id) => findInRoster(id))
            .filter((t): t is TherapistRecord => Boolean(t));
          if (picks.length === 0) {
            throw new HttpsError(
              "not-found",
              "None of the therapistIds matched the roster",
            );
          }
        }
        text = renderTonightLineup(picks, lang);
        break;
      }
      case "weekend": {
        text = renderWeekendForecast(lang);
        break;
      }
      case "welcome": {
        text = renderWelcomeBack(lang);
        break;
      }
      default:
        throw new HttpsError("invalid-argument", `Unknown kind: ${kind}`);
    }

    // 🆕 Round 28s118 — Manual posts route by lang: zh → @YuNiSpaBkk,
    //   others → @SunRed_BKK. View can pick lang in the AdminTelegram
    //   panel and the target channel follows automatically.
    const channel = channelForLang(lang);
    const res = await sendChannelMessage(token, text, channel);
    await recordPost({
      kind: kind || "unknown",
      messageId: res.message_id,
      therapistId: pickedTherapist?.id,
      therapistName: pickedTherapist?.name,
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

// Re-export for direct callers (e.g., a future onTherapistUpdate trigger
// that wants to fire a manual Tonight Special when a roster availability
// flips green during prime hours).
export { POST_ROSTER };
