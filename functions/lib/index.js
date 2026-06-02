"use strict";
// functions/src/index.ts
//
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
exports.telegramConciergeWebhook = exports.postToChannelManual = exports.scheduledChannelLate = exports.scheduledChannelPrime = exports.scheduledChannelEvening = exports.telegramWebhook = exports.recoverAbandonedBookings = exports.releaseExpiredHolds = exports.onBookingCreate = exports.onTherapistUpdate = exports.setRoleOnSignup = exports.moderateText = exports.onReviewCreate = exports.notifyBooking = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-functions/v2/firestore");
// 🆕 Round 28b21 — scheduled functions for Phases 2 + 4 (releaseExpiredHolds,
//   recoverAbandonedBookings).
const scheduler_1 = require("firebase-functions/v2/scheduler");
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
// 🆕 Round 28s82 (founder 2026-05-31: "เอาแค่ส่งหาฉันคนเดียวก่อน") —
//   master kill-switch for the therapist DM on a new booking. While
//   OFF, only the admin group gets the alert and View dispatches
//   manually. Flip to `true` once practitioners have linked their
//   Telegram (via /start) and View is ready to auto-DM them.
const DISPATCH_THERAPIST_DM = false;
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
                // 🆕 Round 28b56 (founder 2026-05-05) — Reverted Round 28b55.
                //   Founder feedback: "ไม่เอา" preview card. Keep message
                //   compact — URL stays clickable as plain blue link in
                //   Telegram, but no big unfurled photo+address card under it.
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
    // 🆕 Round 28s81 (audit) — DEPRECATED. The app no longer calls this;
    //   booking alerts now come from the onBookingCreate trigger (server-
    //   side, can't be spoofed). This callable used to be open to anyone
    //   (no auth → spam vector into the admin group). Gated to signed-in
    //   callers only as a stop-gap; safe to delete on the next deploy.
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "Sign-in required.");
    }
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
const formatBookingForAdmin = (bookingId, b) => {
    const refCode = `SR-${bookingId.slice(0, 8).toUpperCase()}`;
    const lines = [
        `🆕 NEW BOOKING · ${refCode}`,
        "",
        `👤 ${b.contactName ?? "—"}  📞 ${b.phone ?? "—"}`,
        `🧖 ${b.therapistName ?? "—"} · ${b.serviceName ?? "—"} · ${b.duration ?? "?"} min`,
        `📅 ${b.date ?? "—"}  🕐 ${b.time ?? "—"}`,
        `📍 ${b.address ?? "—"}`,
        // 🆕 Round 28s81 — map deep-link (was only in the old client
        //   message; the trigger is now the single source so port it here).
        ...(b.mapUrl ? [`🗺️ ${b.mapUrl}`] : []),
        `💴 ฿${(b.totalPrice ?? 0).toLocaleString()}  💳 ${b.payment ?? "Cash"}`,
        // 🆕 Round 28s81 — itemize the WeChat/Alipay service charge so the
        //   total above is explainable at a glance (total already includes it).
        ...(b.paymentFee && b.paymentFee > 0
            ? [`   ↳ incl. service charge ฿${b.paymentFee.toLocaleString()}`]
            : []),
        `🌐 lang: ${b.language ?? "—"}`,
        "",
        `⏳ Customer hold: 10 min — confirm before it expires.`,
    ];
    return lines.join("\n");
};
const formatBookingForTherapist = (bookingId, b) => {
    const refCode = `SR-${bookingId.slice(0, 8).toUpperCase()}`;
    const mapLink = b.mapUrl
        ? `🗺 Map: ${b.mapUrl}`
        : b.address
            ? `🗺 Map: https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(b.address)}`
            : "";
    const lines = [
        `🔔 NEW JOB · ${refCode}`,
        "",
        `🧖 ${b.serviceName ?? "—"} · ${b.duration ?? "?"} min`,
        `📅 ${b.date ?? "—"}  🕐 ${b.time ?? "—"}`,
        `📍 ${b.address ?? "—"}`,
        mapLink,
        `📞 Customer: ${b.phone ?? "—"}`,
        `🌐 Lang: ${b.language ?? "—"}`,
        "",
        `Reply ACCEPT or DECLINE within 5 min.`,
        `Or call admin if you can't read this message.`,
    ].filter((l) => l.length > 0);
    return lines.join("\n");
};
exports.onBookingCreate = (0, firestore_1.onDocumentCreated)({
    document: "bookings/{bookingId}",
    region: "asia-southeast1",
    secrets: [TELEGRAM_BOT_TOKEN],
}, async (event) => {
    const bookingId = event.params.bookingId;
    const data = event.data?.data();
    if (!data) {
        v2_1.logger.warn("[onBookingCreate] no data", { bookingId });
        return;
    }
    const token = TELEGRAM_BOT_TOKEN.value();
    if (!token) {
        v2_1.logger.error("[onBookingCreate] TELEGRAM_BOT_TOKEN missing");
        return;
    }
    let therapistBookable = true;
    let rejectReason = "";
    if (data.therapistId) {
        try {
            const tSnap = await (0, firestore_2.getFirestore)()
                .collection("therapists")
                .doc(data.therapistId)
                .get();
            const t = tSnap.data();
            if (t?.isHoliday) {
                therapistBookable = false;
                rejectReason = "Holiday";
            }
            else if (t?.statusOverride === "resting") {
                therapistBookable = false;
                rejectReason = "StatusOverride=resting";
            }
        }
        catch (err) {
            v2_1.logger.error("[onBookingCreate] therapist lookup failed", err);
            // Fail-OPEN — if Firestore is down, let the booking go through;
            // admin can manually reject. We don't want a single bad request
            // to block legitimate bookings.
        }
    }
    if (!therapistBookable) {
        v2_1.logger.warn("[onBookingCreate] flagging booking for review", {
            bookingId,
            therapistId: data.therapistId,
            reason: rejectReason,
        });
        try {
            await event.data?.ref.update({
                needsAdminReview: true,
                reviewReason: rejectReason,
                flaggedAt: firestore_2.FieldValue.serverTimestamp(),
            });
        }
        catch (err) {
            v2_1.logger.error("[onBookingCreate] flag write failed", err);
        }
        const refCode = `SR-${bookingId.slice(0, 8).toUpperCase()}`;
        await sendTelegram(token, TELEGRAM_CHAT_ID, [
            `⚠️ NEEDS REVIEW · ${refCode}`,
            ``,
            `Reason: therapist unavailable (${rejectReason})`,
            `Therapist: ${data.therapistName ?? data.therapistId ?? "—"}`,
            `Customer: ${data.contactName ?? "—"} · ${data.phone ?? "—"}`,
            `🧖 ${data.serviceName ?? "—"} · ${data.duration ?? "?"} min`,
            `📅 ${data.date ?? "—"}  🕐 ${data.time ?? "—"}`,
            `📍 ${data.address ?? "—"}`,
            `💴 ฿${(data.totalPrice ?? 0).toLocaleString()}`,
            ``,
            `👉 Please CALL the customer to decide:`,
            `  · Re-assign to another therapist`,
            `  · Reschedule with this one`,
            `  · Cancel & refund`,
            ``,
            `Therapist DM was skipped to prevent wrong dispatch.`,
        ].join("\n"));
        return; // Skip therapist DM — admin handles from here.
    }
    // ── 1. Send to ADMIN group (existing behavior) ────────────────
    const adminText = formatBookingForAdmin(bookingId, data);
    const adminResult = await sendTelegram(token, TELEGRAM_CHAT_ID, adminText);
    try {
        await (0, firestore_2.getFirestore)()
            .collection("telegramLogs")
            .add({
            bookingId,
            ok: adminResult.ok,
            response: adminResult.body.slice(0, 500),
            source: "onBookingCreate.admin",
            at: firestore_2.FieldValue.serverTimestamp(),
        });
    }
    catch (err) {
        v2_1.logger.error("[onBookingCreate] admin log write failed", err);
    }
    // ── 2. Send to THERAPIST personal chat (Round 28b27) ──────────
    //   Each therapist may have a `telegramChatId` field set on their
    //   doc. If present, we DM them the job notification too. The
    //   admin group still receives the master copy — therapist DM is
    //   purely a convenience channel ("Hey, you got a job").
    //   🆕 Round 28s82 — gated OFF (DISPATCH_THERAPIST_DM). For now the
    //   bot sends to View only; she dispatches manually.
    if (DISPATCH_THERAPIST_DM && data.therapistId) {
        try {
            const therapistSnap = await (0, firestore_2.getFirestore)()
                .collection("therapists")
                .doc(data.therapistId)
                .get();
            const therapist = therapistSnap.data();
            const chatId = therapist?.telegramChatId;
            if (chatId) {
                const therapistText = formatBookingForTherapist(bookingId, data);
                const therapistResult = await sendTelegram(token, String(chatId), therapistText);
                await (0, firestore_2.getFirestore)()
                    .collection("telegramLogs")
                    .add({
                    bookingId,
                    therapistId: data.therapistId,
                    ok: therapistResult.ok,
                    response: therapistResult.body.slice(0, 500),
                    source: "onBookingCreate.therapist",
                    at: firestore_2.FieldValue.serverTimestamp(),
                });
            }
            else {
                v2_1.logger.info("[onBookingCreate] therapist has no telegramChatId", {
                    therapistId: data.therapistId,
                });
            }
        }
        catch (err) {
            // Fail-open — therapist notification is optional. Admin group
            // already got the master copy.
            v2_1.logger.error("[onBookingCreate] therapist notify failed", err);
        }
    }
});
exports.releaseExpiredHolds = (0, scheduler_1.onSchedule)({
    schedule: "every 5 minutes",
    region: "asia-southeast1",
    timeZone: "Asia/Bangkok",
}, async () => {
    const db = (0, firestore_2.getFirestore)();
    const now = firestore_2.Timestamp.now();
    const snap = await db
        .collection("bookings")
        .where("holdState", "==", "active")
        .where("holdExpiresAt", "<", now)
        .limit(500) // safety cap
        .get();
    if (snap.empty) {
        v2_1.logger.info("[releaseExpiredHolds] no expired holds");
        return;
    }
    const batch = db.batch();
    let count = 0;
    snap.forEach((d) => {
        batch.update(d.ref, {
            holdState: "expired",
            holdExpiredAt: firestore_2.FieldValue.serverTimestamp(),
        });
        count += 1;
    });
    await batch.commit();
    v2_1.logger.info("[releaseExpiredHolds] released", { count });
});
exports.recoverAbandonedBookings = (0, scheduler_1.onSchedule)({
    schedule: "every 5 minutes",
    region: "asia-southeast1",
    timeZone: "Asia/Bangkok",
    secrets: [TELEGRAM_BOT_TOKEN],
}, async () => {
    const db = (0, firestore_2.getFirestore)();
    const now = Date.now();
    const cutoff = firestore_2.Timestamp.fromMillis(now - 15 * 60000);
    const snap = await db
        .collection("abandoned_bookings")
        .where("status", "==", "open")
        .where("lastActivityAt", "<", cutoff)
        .limit(50)
        .get();
    if (snap.empty) {
        v2_1.logger.info("[recoverAbandonedBookings] no carts to recover");
        return;
    }
    const token = TELEGRAM_BOT_TOKEN.value();
    if (!token) {
        v2_1.logger.error("[recoverAbandonedBookings] missing token");
        return;
    }
    let alerted = 0;
    for (const d of snap.docs) {
        const data = d.data();
        if (!data.phone) {
            // No way to chase, just close it.
            await d.ref.update({ status: "abandoned-no-contact" });
            continue;
        }
        const text = [
            `🛒 CART ABANDONED`,
            ``,
            `👤 ${data.contactName ?? "—"}  📞 ${data.phone}`,
            `🧖 ${data.therapistName ?? "—"} · ${data.serviceName ?? "—"}`,
            `📅 ${data.date ?? "—"}  🕐 ${data.time ?? "—"}`,
            ``,
            `Customer started checkout 15+ min ago and never confirmed.`,
            `Consider sending a gentle LINE/WhatsApp follow-up.`,
        ].join("\n");
        const r = await sendTelegram(token, TELEGRAM_CHAT_ID, text);
        await d.ref.update({
            status: r.ok ? "alerted" : "alert-failed",
            alertedAt: firestore_2.FieldValue.serverTimestamp(),
        });
        alerted += 1;
    }
    v2_1.logger.info("[recoverAbandonedBookings] alerted", { alerted });
});
exports.telegramWebhook = (0, https_1.onRequest)({
    region: "asia-southeast1",
    secrets: [TELEGRAM_BOT_TOKEN],
    cors: false,
}, async (req, res) => {
    if (req.method !== "POST") {
        res.status(405).send("POST only");
        return;
    }
    const token = TELEGRAM_BOT_TOKEN.value();
    if (!token) {
        v2_1.logger.error("[telegramWebhook] TELEGRAM_BOT_TOKEN missing");
        res.status(500).send("server-misconfigured");
        return;
    }
    const update = req.body;
    const chatId = update?.message?.chat?.id;
    const text = (update?.message?.text ?? "").trim();
    const fromName = update?.message?.from?.first_name ??
        update?.message?.from?.username ??
        "there";
    if (!chatId) {
        res.status(200).send("ok"); // ack but ignore
        return;
    }
    let reply;
    if (text === "/start") {
        reply = [
            `Hi ${fromName}! 👋`,
            "",
            "I'm the SunRed booking bot.",
            "Send /myid to get your chat ID — you'll need to give it",
            "to the admin so they can route bookings to you.",
        ].join("\n");
    }
    else if (text === "/myid" || text === "/id") {
        reply = [
            `Your chat ID is:`,
            ``,
            `${chatId}`,
            ``,
            `Copy this number and send it to the SunRed admin.`,
            `Once linked, you'll get a DM from this bot every time`,
            `a customer books your service.`,
        ].join("\n");
    }
    else if (text.startsWith("/")) {
        reply = "Unknown command. Try /myid to get your chat ID.";
    }
    else {
        // Free-form messages — ignore silently to avoid being a chatty
        // bot. Therapist might be replying ACCEPT/DECLINE in future.
        res.status(200).send("ok");
        return;
    }
    await sendTelegram(token, String(chatId), reply);
    res.status(200).send("ok");
});
// ─────────────────────────────────────────────────────────────
// 🆕 Round 28s115 — Telegram channel-posting bot (@SunRedPostBot).
//   Lives in src/telegram-post-bot/ to keep its surface separate
//   from the booking-notification bot above. Re-exports 2 scheduled
//   Functions (Mon spotlight + Fri weekend) and 1 admin-only
//   callable (postToChannelManual).
//
//   Required setup BEFORE first deploy:
//     1. firebase functions:secrets:set TELEGRAM_POST_BOT_TOKEN
//        (paste the token directly into the prompt; never commit it).
//     2. Add @SunRedPostBot as admin in @SunRed_BKK with "Post
//        Messages" + "Edit Messages of Others" permissions.
//     3. Verify the channel handle constant in
//        src/telegram-post-bot/client.ts matches the live channel.
//
//   Deploy: firebase deploy --only functions:scheduledChannelSpotlight,
//   functions:scheduledChannelWeekend,functions:postToChannelManual
// ─────────────────────────────────────────────────────────────
// 🆕 Round 28s224 — replaced Spotlight/Weekend with 3 brand promo
//   cron jobs (evening 18:00 · prime 22:00 · late 01:00 BKK).
var telegram_post_bot_1 = require("./telegram-post-bot");
Object.defineProperty(exports, "scheduledChannelEvening", { enumerable: true, get: function () { return telegram_post_bot_1.scheduledChannelEvening; } });
Object.defineProperty(exports, "scheduledChannelPrime", { enumerable: true, get: function () { return telegram_post_bot_1.scheduledChannelPrime; } });
Object.defineProperty(exports, "scheduledChannelLate", { enumerable: true, get: function () { return telegram_post_bot_1.scheduledChannelLate; } });
Object.defineProperty(exports, "postToChannelManual", { enumerable: true, get: function () { return telegram_post_bot_1.postToChannelManual; } });
// ─────────────────────────────────────────────────────────────
// 🆕 Round 28s117 — Customer-facing Telegram Concierge Bot.
//   Lives in src/telegram-concierge-bot/. Exposes one webhook receiver
//   that handles inbound customer DMs and admin reply relays from the
//   admin group.
//
//   🆕 Round 28s123 — Re-enabled. Refactored from forwarding relay
//   into a 24/7 multilingual ROUTER. Customer DMs bot → bot greets
//   in their language + offers tap-button to the right concierge
//   personal account (@YuNiSpaBkk for ZH, @SunRedvip_bkk for others).
//   No admin-group monitoring needed — View keeps her existing 2-
//   personal-account workflow; the bot fills the "instant 24/7
//   acknowledgement" gap that personal accounts can't provide.
// ─────────────────────────────────────────────────────────────
var telegram_concierge_bot_1 = require("./telegram-concierge-bot");
Object.defineProperty(exports, "telegramConciergeWebhook", { enumerable: true, get: function () { return telegram_concierge_bot_1.telegramConciergeWebhook; } });
//# sourceMappingURL=index.js.map