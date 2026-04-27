// functions/src/index.ts
//
// Cloud Functions สำหรับ SunRed
//
// Deploy:
//   1) cd ~/sunred-vite/functions && npm install
//   2) firebase functions:secrets:set TELEGRAM_BOT_TOKEN
//      firebase functions:secrets:set OPENAI_API_KEY     (สำหรับ moderation)
//   3) firebase deploy --only functions

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { logger } from "firebase-functions/v2";
import { defineSecret } from "firebase-functions/params";
import { initializeApp } from "firebase-admin/app";

initializeApp();

// 🔑 Secrets
const TELEGRAM_BOT_TOKEN = defineSecret("TELEGRAM_BOT_TOKEN");
const OPENAI_API_KEY = defineSecret("OPENAI_API_KEY");

// 📬 Channel ID ของ Telegram — hardcode (ไม่ใช่ secret)
const TELEGRAM_CHAT_ID = "-1002962073895";

// ─────────────────────────────────────────────────────────────
// Helper: ส่งข้อความเข้า Telegram (reuse ใน multiple functions)
// ─────────────────────────────────────────────────────────────
async function sendTelegram(
  token: string,
  chatId: string,
  text: string
): Promise<{ ok: boolean; body: string }> {
  try {
    const res = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: text.slice(0, 4000),
          disable_web_page_preview: true,
        }),
      }
    );
    const body = await res.text().catch(() => "");
    return { ok: res.ok, body };
  } catch (err) {
    logger.error("[sendTelegram] fetch failed", err);
    return { ok: false, body: String(err) };
  }
}

// ═════════════════════════════════════════════════════════════
// 1️⃣  notifyBooking — callable, ส่ง booking message เข้า Telegram
// ═════════════════════════════════════════════════════════════

interface NotifyPayload {
  message?: string;
  format?: "plain" | "markdown" | "html";
}

export const notifyBooking = onCall(
  {
    secrets: [TELEGRAM_BOT_TOKEN],
    region: "asia-southeast1",
    enforceAppCheck: false,
  },
  async (request) => {
    const data = request.data as NotifyPayload;
    const message = (data?.message || "").toString().trim();
    if (!message) {
      throw new HttpsError("invalid-argument", "message is required");
    }
    if (message.length > 4000) {
      throw new HttpsError("invalid-argument", "message too long");
    }

    const token = TELEGRAM_BOT_TOKEN.value().trim();
    if (!token) {
      logger.error("[notifyBooking] bot token missing");
      throw new HttpsError(
        "failed-precondition",
        "TELEGRAM_BOT_TOKEN secret not configured"
      );
    }

    logger.info("[notifyBooking] sending", {
      uid: request.auth?.uid ?? "guest",
      messageLen: message.length,
    });

    const { ok, body } = await sendTelegram(token, TELEGRAM_CHAT_ID, message);
    if (!ok) {
      logger.error("[notifyBooking] Telegram error", { body: body.slice(0, 500) });
      throw new HttpsError("internal", `Telegram error: ${body.slice(0, 200)}`);
    }

    logger.info("[notifyBooking] OK");
    return { ok: true };
  }
);

// ═════════════════════════════════════════════════════════════
// 2️⃣  onReviewCreate — Firestore trigger
//      ถ้า rating ≤ 3 → alert admin ใน Telegram ทันที
//      เพื่อให้ admin จัดการ (ขอโทษ + ชดเชย) ก่อน user post Google review
// ═════════════════════════════════════════════════════════════

interface ReviewDoc {
  rating?: number;
  comment?: string;
  therapistId?: string;
  therapistName?: string;
  bookingId?: string;
  userId?: string;
  userName?: string;
  userEmail?: string;
}

export const onReviewCreate = onDocumentCreated(
  {
    document: "reviews/{reviewId}",
    secrets: [TELEGRAM_BOT_TOKEN],
    region: "asia-southeast1",
  },
  async (event) => {
    const review = event.data?.data() as ReviewDoc | undefined;
    if (!review) return;

    const rating = typeof review.rating === "number" ? review.rating : 5;
    const reviewId = event.params.reviewId;

    // เฉพาะรีวิวแย่ (≤3⭐) ถึงจะเตือน
    if (rating > 3) {
      logger.info("[onReviewCreate] OK rating, skip alert", { rating, reviewId });
      return;
    }

    const token = TELEGRAM_BOT_TOKEN.value().trim();
    if (!token) {
      logger.error("[onReviewCreate] bot token missing");
      return;
    }

    const stars = "⭐".repeat(rating) + "☆".repeat(5 - rating);
    const message = [
      `🚨 NEGATIVE REVIEW (${rating}/5)`,
      `${stars}`,
      "",
      `🧖 Therapist: ${review.therapistName ?? review.therapistId ?? "?"}`,
      `👤 By: ${review.userName ?? review.userEmail ?? review.userId ?? "guest"}`,
      `🧾 Booking: ${review.bookingId ?? "—"}`,
      `🆔 Review: ${reviewId}`,
      "",
      `💬 ${(review.comment ?? "").slice(0, 500)}`,
      "",
      `⚠️ จัดการก่อน user post Google review!`,
    ].join("\n");

    const { ok, body } = await sendTelegram(token, TELEGRAM_CHAT_ID, message);
    if (!ok) {
      logger.error("[onReviewCreate] Telegram error", { body: body.slice(0, 500) });
    } else {
      logger.info("[onReviewCreate] alert sent", { rating, reviewId });
    }
  }
);

// ═════════════════════════════════════════════════════════════
// 3️⃣  moderateText — callable, OpenAI Moderation
//      เรียกก่อน addDoc booking note / review comment
//      → ป้องกัน spam, harassment, sexual content
//      OpenAI Moderation API = FREE (อยู่ใน free tier)
// ═════════════════════════════════════════════════════════════

interface ModeratePayload {
  text?: string;
}

interface OpenAIModerationResult {
  flagged: boolean;
  categories: Record<string, boolean>;
  category_scores: Record<string, number>;
}

interface OpenAIModerationResponse {
  results: OpenAIModerationResult[];
}

export const moderateText = onCall(
  {
    secrets: [OPENAI_API_KEY],
    region: "asia-southeast1",
    enforceAppCheck: false,
  },
  async (request) => {
    const data = request.data as ModeratePayload;
    const text = (data?.text ?? "").toString().trim();

    // ข้อความว่าง / สั้นมาก → ผ่าน
    if (text.length < 3) return { flagged: false, reason: "" };
    if (text.length > 4000) {
      throw new HttpsError("invalid-argument", "text too long");
    }

    const apiKey = OPENAI_API_KEY.value().trim();
    if (!apiKey) {
      // ถ้าไม่ได้ตั้ง key → ไม่ block flow, แค่ log
      logger.warn("[moderateText] OPENAI_API_KEY not set — skipping moderation");
      return { flagged: false, reason: "moderation-disabled" };
    }

    try {
      const res = await fetch("https://api.openai.com/v1/moderations", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          input: text,
          model: "omni-moderation-latest",
        }),
      });

      if (!res.ok) {
        logger.error("[moderateText] OpenAI API error", { status: res.status });
        // fail-open: ถ้า OpenAI down ก็ไม่ block user
        return { flagged: false, reason: "moderation-error" };
      }

      const data = (await res.json()) as OpenAIModerationResponse;
      const result = data.results[0];

      if (result.flagged) {
        // เลือก category ที่ flag ตัวแรก
        const flaggedCategories = Object.entries(result.categories)
          .filter(([, flagged]) => flagged)
          .map(([cat]) => cat);

        logger.warn("[moderateText] FLAGGED", {
          categories: flaggedCategories,
          textPreview: text.slice(0, 100),
        });

        return {
          flagged: true,
          reason: flaggedCategories.join(", "),
          categories: flaggedCategories,
        };
      }

      return { flagged: false, reason: "" };
    } catch (err) {
      logger.error("[moderateText] error", err);
      // fail-open
      return { flagged: false, reason: "moderation-error" };
    }
  }
);
