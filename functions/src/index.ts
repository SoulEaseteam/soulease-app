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
import {
  onDocumentCreated,
  onDocumentUpdated,
} from "firebase-functions/v2/firestore";
import { logger } from "firebase-functions/v2";
import { defineSecret } from "firebase-functions/params";
import * as functionsV1 from "firebase-functions/v1";
import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

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

// ═════════════════════════════════════════════════════════════
// 4️⃣  setRoleOnSignup — v1 auth.user().onCreate
//      เมื่อมีคนสมัคร Firebase Auth ใหม่ → ตั้ง custom claim
//      `role: "admin" | "therapist" | "customer"` อัตโนมัติ
//
//      Logic:
//        1. ถ้าใน /admins/{uid} มี doc → role = "admin"
//        2. ถ้า email ตรงกับ therapist doc field → role = "therapist"
//           + เขียน `uid` กลับเข้า therapist doc เพื่อให้ rules
//             match owner ทันที
//        3. นอกนั้น → role = "customer"
//
//      Custom claim พร้อมใช้ทันทีใน Firestore rules ผ่าน
//      request.auth.token.role (อาจต้อง refresh ID token รอบนึง
//      ฝั่ง client หลังสมัคร)
//
//      ใช้ v1 trigger เพราะ v2 ต้องการ Identity Platform
// ═════════════════════════════════════════════════════════════

export const setRoleOnSignup = functionsV1
  .region("asia-southeast1")
  .auth.user()
  .onCreate(async (user) => {
    const db = getFirestore();
    const auth = getAuth();
    const uid = user.uid;
    const email = (user.email ?? "").toLowerCase().trim();

    let role: "admin" | "therapist" | "customer" = "customer";
    let linkedTherapistId: string | null = null;

    try {
      // 1) admin?
      const adminSnap = await db.collection("admins").doc(uid).get();
      if (adminSnap.exists) {
        role = "admin";
      } else if (email) {
        // 2) therapist by email?
        const therapistSnap = await db
          .collection("therapists")
          .where("email", "==", email)
          .limit(1)
          .get();
        if (!therapistSnap.empty) {
          role = "therapist";
          linkedTherapistId = therapistSnap.docs[0].id;
          // Link therapist doc → uid so rules can match by docId / uid field
          await therapistSnap.docs[0].ref.update({
            uid,
            updatedAt: FieldValue.serverTimestamp(),
          });
        }
      }

      await auth.setCustomUserClaims(uid, { role });

      // Mirror role into /users/{uid} so the client UI can read it
      // without forcing an ID-token refresh.
      await db.collection("users").doc(uid).set(
        {
          uid,
          email,
          role,
          therapistId: linkedTherapistId,
          createdAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      logger.info("[setRoleOnSignup] OK", { uid, email, role, linkedTherapistId });
    } catch (err) {
      logger.error("[setRoleOnSignup] failed", { uid, email, err });
      // fail-open: don't block sign-up if claim assignment fails
    }
  });

// ═════════════════════════════════════════════════════════════
// 5️⃣  onTherapistUpdate — Firestore trigger
//      เมื่อ therapist doc ถูก update → เขียน auditLogs entry
//
//      Captures:
//        • therapistId
//        • changed keys + before/after values (เฉพาะ scalar)
//        • updatedBy (ถ้า client ส่งมาใน payload)
//        • timestamp
//
//      เก็บใน /auditLogs/{auto} — admin อ่านได้, ห้ามใครเขียน
//      จาก client (rules บล็อกแล้ว — มีแต่ Functions เขียน)
// ═════════════════════════════════════════════════════════════

/** Fields ที่ไม่ต้อง log (noise — system-managed timestamps). */
const AUDIT_IGNORE_KEYS = new Set([
  "updatedAt",
  "createdAt",
  "bioGeneratedAt",
  "badgeUpdatedAt",
]);

/** Truncate large values so audit log row stays small. */
function truncateValue(v: unknown): unknown {
  if (v === null || v === undefined) return v;
  if (typeof v === "string") {
    return v.length > 200 ? v.slice(0, 200) + "…" : v;
  }
  if (Array.isArray(v)) {
    return v.length > 20 ? `[array len ${v.length}]` : v;
  }
  if (typeof v === "object") {
    try {
      const json = JSON.stringify(v);
      return json.length > 400 ? `[object ${json.length} chars]` : v;
    } catch {
      return "[unserializable]";
    }
  }
  return v;
}

interface TherapistDocLite {
  [key: string]: unknown;
  updatedBy?: string;
}

export const onTherapistUpdate = onDocumentUpdated(
  {
    document: "therapists/{therapistId}",
    region: "asia-southeast1",
  },
  async (event) => {
    const before = (event.data?.before.data() ?? {}) as TherapistDocLite;
    const after = (event.data?.after.data() ?? {}) as TherapistDocLite;
    const therapistId = event.params.therapistId;

    // Compute changed keys (skip ignored)
    const allKeys = new Set([
      ...Object.keys(before),
      ...Object.keys(after),
    ]);
    const changes: Record<string, { before: unknown; after: unknown }> = {};
    for (const key of allKeys) {
      if (AUDIT_IGNORE_KEYS.has(key)) continue;
      const b = before[key];
      const a = after[key];
      if (JSON.stringify(b) === JSON.stringify(a)) continue;
      changes[key] = {
        before: truncateValue(b),
        after: truncateValue(a),
      };
    }

    if (Object.keys(changes).length === 0) {
      logger.info("[onTherapistUpdate] no meaningful change, skip", {
        therapistId,
      });
      return;
    }

    // updatedBy is best-effort — client should write it on self-edits.
    const updatedBy =
      typeof after.updatedBy === "string" ? after.updatedBy : null;

    try {
      await getFirestore()
        .collection("auditLogs")
        .add({
          collection: "therapists",
          docId: therapistId,
          updatedBy,
          changedKeys: Object.keys(changes),
          changes,
          at: FieldValue.serverTimestamp(),
        });
      logger.info("[onTherapistUpdate] logged", {
        therapistId,
        keys: Object.keys(changes),
      });
    } catch (err) {
      logger.error("[onTherapistUpdate] write failed", { therapistId, err });
    }
  }
);
