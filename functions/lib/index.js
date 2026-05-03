"use strict";
// functions/src/index.ts
//
// Cloud Functions สำหรับ SunRed
//
// Deploy:
//   1) cd ~/sunred-vite/functions && npm install
//   2) firebase functions:secrets:set TELEGRAM_BOT_TOKEN
//      firebase functions:secrets:set OPENAI_API_KEY     (สำหรับ moderation)
//   3) firebase deploy --only functions
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.onTherapistUpdate = exports.setRoleOnSignup = exports.moderateText = exports.onReviewCreate = exports.notifyBooking = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-functions/v2/firestore");
const v2_1 = require("firebase-functions/v2");
const params_1 = require("firebase-functions/params");
const functionsV1 = __importStar(require("firebase-functions/v1"));
const app_1 = require("firebase-admin/app");
const auth_1 = require("firebase-admin/auth");
const firestore_2 = require("firebase-admin/firestore");
(0, app_1.initializeApp)();
// 🔑 Secrets
const TELEGRAM_BOT_TOKEN = (0, params_1.defineSecret)("TELEGRAM_BOT_TOKEN");
const OPENAI_API_KEY = (0, params_1.defineSecret)("OPENAI_API_KEY");
// 📬 Channel ID ของ Telegram — hardcode (ไม่ใช่ secret)
const TELEGRAM_CHAT_ID = "-1002962073895";
// ─────────────────────────────────────────────────────────────
// Helper: ส่งข้อความเข้า Telegram (reuse ใน multiple functions)
// ─────────────────────────────────────────────────────────────
async function sendTelegram(token, chatId, text) {
    try {
        const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                chat_id: chatId,
                text: text.slice(0, 4000),
                disable_web_page_preview: true,
            }),
        });
        const body = await res.text().catch(() => "");
        return { ok: res.ok, body };
    }
    catch (err) {
        v2_1.logger.error("[sendTelegram] fetch failed", err);
        return { ok: false, body: String(err) };
    }
}
exports.notifyBooking = (0, https_1.onCall)({
    secrets: [TELEGRAM_BOT_TOKEN],
    region: "asia-southeast1",
    enforceAppCheck: false,
}, async (request) => {
    const data = request.data;
    const message = (data?.message || "").toString().trim();
    if (!message) {
        throw new https_1.HttpsError("invalid-argument", "message is required");
    }
    if (message.length > 4000) {
        throw new https_1.HttpsError("invalid-argument", "message too long");
    }
    const token = TELEGRAM_BOT_TOKEN.value().trim();
    if (!token) {
        v2_1.logger.error("[notifyBooking] bot token missing");
        throw new https_1.HttpsError("failed-precondition", "TELEGRAM_BOT_TOKEN secret not configured");
    }
    v2_1.logger.info("[notifyBooking] sending", {
        uid: request.auth?.uid ?? "guest",
        messageLen: message.length,
    });
    const { ok, body } = await sendTelegram(token, TELEGRAM_CHAT_ID, message);
    if (!ok) {
        v2_1.logger.error("[notifyBooking] Telegram error", { body: body.slice(0, 500) });
        throw new https_1.HttpsError("internal", `Telegram error: ${body.slice(0, 200)}`);
    }
    v2_1.logger.info("[notifyBooking] OK");
    return { ok: true };
});
exports.onReviewCreate = (0, firestore_1.onDocumentCreated)({
    document: "reviews/{reviewId}",
    secrets: [TELEGRAM_BOT_TOKEN],
    region: "asia-southeast1",
}, async (event) => {
    const review = event.data?.data();
    if (!review)
        return;
    const rating = typeof review.rating === "number" ? review.rating : 5;
    const reviewId = event.params.reviewId;
    // เฉพาะรีวิวแย่ (≤3⭐) ถึงจะเตือน
    if (rating > 3) {
        v2_1.logger.info("[onReviewCreate] OK rating, skip alert", { rating, reviewId });
        return;
    }
    const token = TELEGRAM_BOT_TOKEN.value().trim();
    if (!token) {
        v2_1.logger.error("[onReviewCreate] bot token missing");
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
        v2_1.logger.error("[onReviewCreate] Telegram error", { body: body.slice(0, 500) });
    }
    else {
        v2_1.logger.info("[onReviewCreate] alert sent", { rating, reviewId });
    }
});
exports.moderateText = (0, https_1.onCall)({
    secrets: [OPENAI_API_KEY],
    region: "asia-southeast1",
    enforceAppCheck: false,
}, async (request) => {
    const data = request.data;
    const text = (data?.text ?? "").toString().trim();
    // ข้อความว่าง / สั้นมาก → ผ่าน
    if (text.length < 3)
        return { flagged: false, reason: "" };
    if (text.length > 4000) {
        throw new https_1.HttpsError("invalid-argument", "text too long");
    }
    const apiKey = OPENAI_API_KEY.value().trim();
    if (!apiKey) {
        // ถ้าไม่ได้ตั้ง key → ไม่ block flow, แค่ log
        v2_1.logger.warn("[moderateText] OPENAI_API_KEY not set — skipping moderation");
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
            v2_1.logger.error("[moderateText] OpenAI API error", { status: res.status });
            // fail-open: ถ้า OpenAI down ก็ไม่ block user
            return { flagged: false, reason: "moderation-error" };
        }
        const data = (await res.json());
        const result = data.results[0];
        if (result.flagged) {
            // เลือก category ที่ flag ตัวแรก
            const flaggedCategories = Object.entries(result.categories)
                .filter(([, flagged]) => flagged)
                .map(([cat]) => cat);
            v2_1.logger.warn("[moderateText] FLAGGED", {
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
    }
    catch (err) {
        v2_1.logger.error("[moderateText] error", err);
        // fail-open
        return { flagged: false, reason: "moderation-error" };
    }
});
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
exports.setRoleOnSignup = functionsV1
    .region("asia-southeast1")
    .auth.user()
    .onCreate(async (user) => {
    const db = (0, firestore_2.getFirestore)();
    const auth = (0, auth_1.getAuth)();
    const uid = user.uid;
    const email = (user.email ?? "").toLowerCase().trim();
    let role = "customer";
    let linkedTherapistId = null;
    try {
        // 1) admin?
        const adminSnap = await db.collection("admins").doc(uid).get();
        if (adminSnap.exists) {
            role = "admin";
        }
        else if (email) {
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
                    updatedAt: firestore_2.FieldValue.serverTimestamp(),
                });
            }
        }
        await auth.setCustomUserClaims(uid, { role });
        // Mirror role into /users/{uid} so the client UI can read it
        // without forcing an ID-token refresh.
        await db.collection("users").doc(uid).set({
            uid,
            email,
            role,
            therapistId: linkedTherapistId,
            createdAt: firestore_2.FieldValue.serverTimestamp(),
        }, { merge: true });
        v2_1.logger.info("[setRoleOnSignup] OK", { uid, email, role, linkedTherapistId });
    }
    catch (err) {
        v2_1.logger.error("[setRoleOnSignup] failed", { uid, email, err });
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
function truncateValue(v) {
    if (v === null || v === undefined)
        return v;
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
        }
        catch {
            return "[unserializable]";
        }
    }
    return v;
}
exports.onTherapistUpdate = (0, firestore_1.onDocumentUpdated)({
    document: "therapists/{therapistId}",
    region: "asia-southeast1",
}, async (event) => {
    const before = (event.data?.before.data() ?? {});
    const after = (event.data?.after.data() ?? {});
    const therapistId = event.params.therapistId;
    // Compute changed keys (skip ignored)
    const allKeys = new Set([
        ...Object.keys(before),
        ...Object.keys(after),
    ]);
    const changes = {};
    for (const key of allKeys) {
        if (AUDIT_IGNORE_KEYS.has(key))
            continue;
        const b = before[key];
        const a = after[key];
        if (JSON.stringify(b) === JSON.stringify(a))
            continue;
        changes[key] = {
            before: truncateValue(b),
            after: truncateValue(a),
        };
    }
    if (Object.keys(changes).length === 0) {
        v2_1.logger.info("[onTherapistUpdate] no meaningful change, skip", {
            therapistId,
        });
        return;
    }
    // updatedBy is best-effort — client should write it on self-edits.
    const updatedBy = typeof after.updatedBy === "string" ? after.updatedBy : null;
    try {
        await (0, firestore_2.getFirestore)()
            .collection("auditLogs")
            .add({
            collection: "therapists",
            docId: therapistId,
            updatedBy,
            changedKeys: Object.keys(changes),
            changes,
            at: firestore_2.FieldValue.serverTimestamp(),
        });
        v2_1.logger.info("[onTherapistUpdate] logged", {
            therapistId,
            keys: Object.keys(changes),
        });
    }
    catch (err) {
        v2_1.logger.error("[onTherapistUpdate] write failed", { therapistId, err });
    }
});
//# sourceMappingURL=index.js.map