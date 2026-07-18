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
exports.onBookingDispatchChange = exports.syncTherapistBusyStatus = exports.setMemberAdmin = exports.createCustomerAccount = exports.resetCustomerPassword = exports.telegramConciergeWebhook = exports.postToChannelManual = exports.scheduledChannelLate = exports.scheduledChannelPrime = exports.scheduledChannelEvening = exports.telegramWebhook = exports.recoverAbandonedBookings = exports.alertOverdueSessions = exports.releaseExpiredHolds = exports.onBookingCreate = exports.onTherapistUpdate = exports.setRoleOnSignup = exports.moderateText = exports.onReviewCreate = exports.notifyBooking = void 0;
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
// 🆕 Round 28s297 (founder, asked directly: "เชื่อม Telegram ให้คุมได้จริง
//   จากหน้านี้") — AdminAdvancedSettingsPage's "Enable Telegram
//   Notifications" toggle used to save to Firestore with nothing here
//   ever reading it back. This is the real check: a wrapper around
//   `sendTelegram` used ONLY at actual notification call sites (booking
//   alerts, negative-review alerts, overdue-session nudges, abandoned-
//   cart recovery) — NOT `telegramWebhook`'s reply-to-a-command handler,
//   since a therapist typing /myid to link their chat ID isn't a
//   "notification" this toggle should be able to silently break.
//
// Default TRUE if the field is missing/undefined so a doc that's never
// been saved (or a fresh deploy) doesn't go silent. Read via the Admin
// SDK, which bypasses Firestore rules entirely — no rules change needed.
//
// A deliberate skip returns `{ ok: true }`, not `{ ok: false }` — two
// callers (alertOverdueSessions, recoverAbandonedBookings) gate retry/
// terminal state on `.ok`, and treating "paused" as "failed" would make
// them loop-retry forever or permanently mark abandoned carts
// "alert-failed" while the toggle is off.
async function isTelegramEnabled() {
    try {
        const snap = await (0, firestore_2.getFirestore)()
            .collection("adminSettings")
            .doc("advanced")
            .get();
        return snap.data()?.telegramEnabled !== false;
    }
    catch (err) {
        v2_1.logger.warn("[isTelegramEnabled] check failed, defaulting to enabled", err);
        return true; // fail open — never let a settings-read hiccup swallow a real alert
    }
}
async function sendTelegramIfEnabled(token, chatId, text) {
    if (!(await isTelegramEnabled())) {
        v2_1.logger.info("[sendTelegramIfEnabled] skipped — telegramEnabled=false");
        return { ok: true, body: "skipped: telegramEnabled=false" };
    }
    return sendTelegram(token, chatId, text);
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
    const { ok, body } = await sendTelegramIfEnabled(token, TELEGRAM_CHAT_ID, message);
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
    const { ok, body } = await sendTelegramIfEnabled(token, TELEGRAM_CHAT_ID, message);
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
// 🆕 Round 28w.78 (founder: "audit-log มันอัปเดตตลอดเวลาเกินไป ให้เก็บเฉพาะ
//   การกระทำจริงก็พอ") — this trigger logged an audit row for ANY therapist
//   field change, so it was recording machine churn, not decisions:
//
//     • `viewCount` is bumped by EVERY public profile view (firestore.rules
//       lets an anonymous visitor do viewCount + 1). That single key was
//       generating ~all of the ~100 rows/day the founder was seeing.
//     • GPS / presence / booking-state fields are written continuously by the
//       therapist app and the booking flow — nobody "did" them.
//     • Derived aggregates (rating, counts) are recomputed, not decided.
//
//   Keep only fields a human deliberately changes.
const AUDIT_IGNORE_KEYS = new Set([
    // bookkeeping
    "updatedAt",
    "createdAt",
    "bioGeneratedAt",
    "badgeUpdatedAt",
    "updatedBy",
    // pure telemetry — THE spammer: one row per profile view
    "viewCount",
    "views",
    // live presence / GPS churn (therapist app writes these constantly)
    "currentLocation",
    "lat",
    "lng",
    "area",
    "lastSeen",
    "lastActiveAt",
    "online",
    // auto-maintained by the booking flow, not a human action
    "activeBooking",
    "busyUntil",
    // derived aggregates — recomputed, never "decided"
    "rating",
    "reviewCount",
    "reviews",
    "totalSessions",
    "sessions",
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
            // 🆕 28w.78 — this write had NO `action` field, so every one of these
            //   rows rendered as "ไม่ทราบประเภท" in /admin/audit-log (the page
            //   falls back to that label only when `action` isn't a string).
            //   Stamp the same action the admin UI uses, and put the actor where
            //   the page expects it.
            action: "therapist.update",
            actorId: updatedBy,
            actorEmail: null,
            collection: "therapists",
            docId: therapistId,
            updatedBy,
            changedKeys: Object.keys(changes),
            changes,
            detail: { therapistId, changedKeys: Object.keys(changes) },
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
// 🆕 Round 28s229 — country from E.164 phone dial code (the markets that
//   matter for SunRed). Longest code wins. Returns null when the number has
//   no "+" prefix (can't tell) so we never show a wrong flag.
const DIAL_TO_COUNTRY = [
    ["+852", "HK", "🇭🇰"], ["+853", "MO", "🇲🇴"], ["+886", "TW", "🇹🇼"],
    ["+971", "AE", "🇦🇪"], ["+972", "IL", "🇮🇱"], ["+855", "KH", "🇰🇭"],
    ["+856", "LA", "🇱🇦"],
    ["+66", "TH", "🇹🇭"], ["+86", "CN", "🇨🇳"], ["+82", "KR", "🇰🇷"],
    ["+81", "JP", "🇯🇵"], ["+65", "SG", "🇸🇬"], ["+60", "MY", "🇲🇾"],
    ["+91", "IN", "🇮🇳"], ["+61", "AU", "🇦🇺"], ["+44", "GB", "🇬🇧"],
    ["+49", "DE", "🇩🇪"], ["+33", "FR", "🇫🇷"], ["+84", "VN", "🇻🇳"],
    ["+62", "ID", "🇮🇩"], ["+63", "PH", "🇵🇭"], ["+95", "MM", "🇲🇲"],
    ["+1", "US/CA", "🇺🇸"], ["+7", "RU/KZ", "🇷🇺"],
];
function countryFromPhone(phone) {
    if (!phone)
        return null;
    const norm = phone.replace(/[^\d+]/g, "");
    if (!norm.startsWith("+"))
        return null;
    for (const [dial, code, flag] of DIAL_TO_COUNTRY) {
        if (norm.startsWith(dial))
            return { code, flag };
    }
    return null;
}
// Build the "🌐 Source: …" line — channel · country · landing page.
function attributionLine(b) {
    const parts = [];
    const src = b.attributionSource?.trim();
    if (src && src !== "direct") {
        parts.push(b.utmCampaign?.trim() ? `${src} (${b.utmCampaign.trim()})` : src);
    }
    else if (src === "direct") {
        parts.push("direct");
    }
    const country = countryFromPhone(b.phone);
    if (country)
        parts.push(`${country.flag} ${country.code}`);
    if (b.landingPath?.trim())
        parts.push(b.landingPath.trim());
    return parts.length ? `🌐 Source: ${parts.join(" · ")}` : null;
}
// 🆕 Round 28s228 (founder: "ให้บอทส่งแบบนี้") — clean, structured admin
//   booking message. Plain text (sendTelegram has no parse_mode, so NO
//   markdown escaping — backslashes would show literally). Dropped the
//   confusing "Customer hold — confirm before it expires" line: orders now
//   surface in the dashboard's Needs-Confirmation tab (Round 28s227), so the
//   Telegram message is a clean notification, not an action prompt.
const formatBookingForAdmin = (bookingId, b) => {
    const refCode = `SR-${bookingId.slice(0, 8).toUpperCase()}`;
    const divider = "────────────────────";
    // Address: prefer the POI/place name, append the street address if it
    //   differs (so the operator sees both "Rosewood Bangkok" and the road).
    const norm = (s) => (s ?? "").replace(/\s+/g, " ").trim().toLowerCase();
    const place = b.locationName?.trim() || b.address?.trim() || "—";
    const extra = b.address?.trim() && norm(b.address) !== norm(b.locationName)
        ? b.address.trim()
        : "";
    const addressLine = [place, extra].filter(Boolean).join(", ");
    // Map link: explicit mapUrl, else a Places search on name/address.
    const mapUrl = b.mapUrl?.trim() ||
        (place && place !== "—"
            ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place)}`
            : "");
    const lines = [
        `${b.date ?? "—"} ${b.time ?? "—"}`,
        `🧾 Booking ID: ${refCode}`,
        "",
        `Therapist: ${b.therapistName ?? "—"}`,
        `Time: ${b.time ?? "—"}`,
        divider,
        `📍 Address: ${addressLine}`,
        b.meetingPoint?.trim() ? `Meeting: 👉🏻 ${b.meetingPoint.trim()}` : null,
        "",
        `Service: ${b.serviceName ?? "—"}`,
        `Duration: ${b.duration ?? "?"} min`,
        `Price: ${(b.servicePrice ?? 0).toLocaleString()} ฿`,
        "",
        `🚖 Taxi: ${(b.taxiFee ?? 0).toLocaleString()} ฿`,
        // Payment method kept (cash vs WeChat/Alipay changes the operation).
        `💳 Payment: ${b.payment ?? "Cash"}`,
        b.paymentFee && b.paymentFee > 0
            ? `   ↳ incl. service charge ${b.paymentFee.toLocaleString()} ฿`
            : null,
        `💰 Total: ${(b.totalPrice ?? 0).toLocaleString()} ฿`,
        "",
        `📞 Phone: ${b.phone ?? "—"}`,
        `👤 Name: ${b.contactName ?? "—"}`,
        `Note: ${b.note?.trim() ? b.note.trim() : "-"}`,
        attributionLine(b),
        divider,
        `🗺️ Map: ${mapUrl || "—"}`,
    ];
    return lines.filter((l) => l !== null).join("\n");
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
        await sendTelegramIfEnabled(token, TELEGRAM_CHAT_ID, [
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
    const adminResult = await sendTelegramIfEnabled(token, TELEGRAM_CHAT_ID, adminText);
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
                const therapistResult = await sendTelegramIfEnabled(token, String(chatId), therapistText);
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
// 🆕 Round 28s232 (Phase 3 — therapist safety) — alert the operator when an
//   in-session outcall job runs past its expected end time. The Tonight ops
//   board stamps `expectedEndAt` when "เริ่มนวด" is tapped and `dispatchState`
//   = "in_session"; if 20+ min pass without "จบงาน", the therapist is alone in
//   a guest's room past schedule — View gets a Telegram nudge to call and
//   check safety. One alert per job (overdueAlertedAt guard).
//   Single-field query (dispatchState ==) → no composite index needed.
exports.alertOverdueSessions = (0, scheduler_1.onSchedule)({
    schedule: "every 10 minutes",
    region: "asia-southeast1",
    timeZone: "Asia/Bangkok",
    secrets: [TELEGRAM_BOT_TOKEN],
}, async () => {
    const db = (0, firestore_2.getFirestore)();
    const graceMs = 20 * 60000;
    const cutoffMs = Date.now() - graceMs;
    const snap = await db
        .collection("bookings")
        .where("dispatchState", "==", "in_session")
        .limit(100)
        .get();
    if (snap.empty) {
        v2_1.logger.info("[alertOverdueSessions] no in-session jobs");
        return;
    }
    const token = TELEGRAM_BOT_TOKEN.value();
    if (!token) {
        v2_1.logger.error("[alertOverdueSessions] missing token");
        return;
    }
    let sent = 0;
    for (const d of snap.docs) {
        const b = d.data();
        if (b.overdueAlertedAt)
            continue; // already nudged
        const exp = b.expectedEndAt;
        if (!exp || exp.toMillis() > cutoffMs)
            continue; // not overdue yet
        const refCode = `SR-${d.id.slice(0, 8).toUpperCase()}`;
        const text = [
            `🚨 OVERDUE SESSION · ${refCode}`,
            ``,
            `🧖 ${b.therapistName ?? "—"} · ${b.serviceName ?? "—"}`,
            `👤 ${b.contactName ?? b.customerName ?? "—"}  📞 ${b.phone ?? "—"}`,
            `📍 ${b.address ?? "—"}`,
            ``,
            `เริ่มนวดแล้วและเลยเวลาคาดจบเกิน 20 นาที — ยังไม่กด "จบงาน".`,
            `โทรเช็กความปลอดภัยหมอนวด 🙏`,
        ].join("\n");
        const r = await sendTelegramIfEnabled(token, TELEGRAM_CHAT_ID, text);
        if (r.ok) {
            await d.ref.update({ overdueAlertedAt: firestore_2.FieldValue.serverTimestamp() });
            sent += 1;
        }
    }
    v2_1.logger.info("[alertOverdueSessions] sent", { sent });
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
        const r = await sendTelegramIfEnabled(token, TELEGRAM_CHAT_ID, text);
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
// ─────────────────────────────────────────────────────────────
// 🆕 Round 28x.29 (founder) — Admin: reset a customer's login password
//   to their own phone number.
//
//   Customers sign in via Firebase Auth on a synthetic alias email
//   (0812345678@phone.sunred.vip). Phone/username guests have no real
//   mailbox, so the standard reset-link email is undeliverable and they
//   had no recovery path. Founder flow: guest forgets → tells us their
//   phone → admin taps "reset" → password becomes that phone → they log
//   in with their username (or phone) + phone-as-password.
//
//   Security: admin-only (verified against the authoritative admins/{uid}
//   doc). Phone is low-entropy on purpose — usability for low-value guest
//   logins. Every reset is written to auditLogs.
// ─────────────────────────────────────────────────────────────
exports.resetCustomerPassword = (0, https_1.onCall)({ region: "asia-southeast1" }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "Sign in required.");
    }
    const db = (0, firestore_2.getFirestore)();
    const adminDoc = await db.collection("admins").doc(request.auth.uid).get();
    if (!adminDoc.exists) {
        throw new https_1.HttpsError("permission-denied", "Admin only.");
    }
    const uid = String(request.data?.uid ?? "").trim();
    if (!uid) {
        throw new https_1.HttpsError("invalid-argument", "uid is required.");
    }
    const userSnap = await db.collection("users").doc(uid).get();
    if (!userSnap.exists) {
        throw new https_1.HttpsError("not-found", "User not found.");
    }
    const u = userSnap.data();
    // Strip to digits; Firebase requires a password of at least 6 chars.
    const phone = String(u.phone ?? "").replace(/\D/g, "");
    if (phone.length < 6) {
        throw new https_1.HttpsError("failed-precondition", "This customer has no valid phone number on file, so it can't be used as the new password.");
    }
    await (0, auth_1.getAuth)().updateUser(uid, { password: phone });
    await db.collection("auditLogs").add({
        action: "user.password_reset",
        byUid: request.auth.uid,
        targetUid: uid,
        at: firestore_2.FieldValue.serverTimestamp(),
    });
    v2_1.logger.info("[resetCustomerPassword] reset to phone", {
        targetUid: uid,
        byUid: request.auth.uid,
    });
    return {
        ok: true,
        newPassword: phone,
        username: u.username ?? null,
        phone,
    };
});
// ─────────────────────────────────────────────────────────────
// 🆕 Round 28x.55 (founder: "ยูสเซอร์ลูกค้า SRD-V9PN4H รหัส 0641185367
//   ให้เข้าตามนี้") — the concierge enrols a member (SRD- code) but that only
//   wrote a record; the guest still had to go register themselves, so most
//   issued memberships were never used. This creates the login FOR them:
//     username = their SRD- code   ·   password = their phone digits
//   The synthetic auth address mirrors the client's resolveLoginId() username
//   branch (`<handle>@user.sunred.vip`), so the guest can sign in by typing the
//   SRD code on the normal login page. `users.phone` is stored in the SAME
//   normalised form as the membership key, which is what links their tier /
//   points / history to the account.
// ─────────────────────────────────────────────────────────────
const USERNAME_ALIAS_DOMAIN = "user.sunred.vip";
/** Mirror of the client's normPhone() so the stored phone matches the member key. */
function normPhoneServer(raw) {
    const digits = String(raw ?? "").replace(/\D/g, "");
    if (digits.startsWith("66") && digits.length >= 11)
        return "0" + digits.slice(2);
    return digits;
}
exports.createCustomerAccount = (0, https_1.onCall)({ region: "asia-southeast1" }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "Sign in required.");
    }
    const db = (0, firestore_2.getFirestore)();
    const adminDoc = await db.collection("admins").doc(request.auth.uid).get();
    if (!adminDoc.exists) {
        throw new https_1.HttpsError("permission-denied", "Admin only.");
    }
    const data = request.data;
    const phone = normPhoneServer(data?.phone ?? "");
    const code = String(data?.code ?? "").trim().toUpperCase();
    const name = String(data?.name ?? "").trim();
    // Password = phone digits; Firebase needs ≥ 6 characters.
    if (phone.length < 6) {
        throw new https_1.HttpsError("invalid-argument", "A valid phone number is required — it becomes the password.");
    }
    // The code doubles as the username, so it must satisfy the client's
    // USERNAME_RE (/^[a-z][a-z0-9._-]{2,19}$/) once lower-cased.
    const handle = code.toLowerCase();
    if (!/^[a-z][a-z0-9._-]{2,19}$/.test(handle)) {
        throw new https_1.HttpsError("invalid-argument", "A valid member code (SRD-…) is required.");
    }
    // Don't mint a second account for someone who already has one on this phone.
    const existing = await db
        .collection("users")
        .where("phone", "==", phone)
        .limit(1)
        .get();
    if (!existing.empty) {
        throw new https_1.HttpsError("already-exists", "This phone already has an account. Use Reset password instead.");
    }
    const authEmail = `${handle}@${USERNAME_ALIAS_DOMAIN}`;
    let uid;
    try {
        const rec = await (0, auth_1.getAuth)().createUser({
            email: authEmail,
            password: phone,
            ...(name ? { displayName: name } : {}),
        });
        uid = rec.uid;
    }
    catch (err) {
        const errCode = err.code;
        if (errCode === "auth/email-already-exists") {
            throw new https_1.HttpsError("already-exists", "This member code already has a login.");
        }
        throw err;
    }
    await db.collection("users").doc(uid).set({
        // Real identifiers under their real names (never the synthetic alias).
        username: handle,
        phone,
        loginKind: "username",
        role: "user",
        ...(name ? { displayName: name } : {}),
        createdAt: firestore_2.FieldValue.serverTimestamp(),
    }, { merge: true });
    await db.collection("auditLogs").add({
        action: "user.account_created",
        byUid: request.auth.uid,
        targetUid: uid,
        detail: { code, phone },
        at: firestore_2.FieldValue.serverTimestamp(),
    });
    v2_1.logger.info("[createCustomerAccount] created", {
        targetUid: uid,
        code,
        byUid: request.auth.uid,
    });
    // Return the exact credentials the concierge should hand to the guest.
    return { ok: true, uid, username: code, password: phone };
});
// ─────────────────────────────────────────────────────────────
// 🆕 Round 28x.58 (founder: "ตั้ง SUNRED 0634350987 เป็นแอดมิน") —
//   promote/demote an existing member account to admin.
//
//   Admin identity lives in TWO places and both must move together:
//     • /admins/{uid}      — the authoritative check (firestore.rules
//                            isAdmin() and every callable here read this)
//     • users/{uid}.role   — what the client AuthProvider reads for UI
//   Writing only `role` would give an admin-looking UI whose every write
//   is then denied by the rules, so this does both in one place.
//
//   Guarded: admin-only, and an admin cannot demote themselves (that would
//   lock the last concierge out of /admin with no way back in).
exports.setMemberAdmin = (0, https_1.onCall)({ region: "asia-southeast1" }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "Sign in required.");
    }
    const db = (0, firestore_2.getFirestore)();
    const callerUid = request.auth.uid;
    const adminDoc = await db.collection("admins").doc(callerUid).get();
    if (!adminDoc.exists) {
        throw new https_1.HttpsError("permission-denied", "Admin only.");
    }
    const data = request.data;
    const phone = normPhoneServer(data?.phone ?? "");
    const makeAdmin = data?.makeAdmin !== false; // default: promote
    if (!phone) {
        throw new https_1.HttpsError("invalid-argument", "A phone number is required.");
    }
    // The member must already hold a login — admin rights attach to an
    // account, so "สร้างบัญชี" has to happen first.
    const found = await db
        .collection("users")
        .where("phone", "==", phone)
        .limit(1)
        .get();
    if (found.empty) {
        throw new https_1.HttpsError("not-found", "This member has no account yet — create one first.");
    }
    const targetUid = found.docs[0].id;
    if (!makeAdmin && targetUid === callerUid) {
        throw new https_1.HttpsError("failed-precondition", "You cannot remove your own admin rights.");
    }
    if (makeAdmin) {
        await db.collection("admins").doc(targetUid).set({ grantedBy: callerUid, grantedAt: firestore_2.FieldValue.serverTimestamp(), phone }, { merge: true });
        await db.collection("users").doc(targetUid).set({ role: "admin" }, { merge: true });
    }
    else {
        await db.collection("admins").doc(targetUid).delete();
        await db.collection("users").doc(targetUid).set({ role: "user" }, { merge: true });
    }
    await db.collection("auditLogs").add({
        action: makeAdmin ? "user.admin_granted" : "user.admin_revoked",
        byUid: callerUid,
        targetUid,
        detail: { phone },
        at: firestore_2.FieldValue.serverTimestamp(),
    });
    v2_1.logger.info("[setMemberAdmin] done", { targetUid, makeAdmin, byUid: callerUid });
    return { ok: true, uid: targetUid, isAdmin: makeAdmin };
});
// ─────────────────────────────────────────────────────────────
// 🆕 Round 28x.31 (founder: "สถานะบนหน้าเว็บไม่เปลี่ยน") — sync a
//   therapist's live BUSY status from her active jobs onto her doc.
//
//   Problem: customer-facing cards read the therapist doc via
//   calculateTherapistStatus (busyUntil / activeBooking), but NOTHING ever
//   wrote those from bookings — so a practitioner who is mid-session still
//   showed a green "Available" card. The admin Tonight board knew (it reads
//   dispatchState off the bookings), but the guest didn't.
//
//   This reconciler runs every 2 minutes: any therapist with a booking in
//   an active dispatch state (assigned / arrived / in_session) is marked
//   activeBooking:true + busyUntil:expectedEndAt, so the engine returns
//   "bookable" (orange, not green) on her card. When the job finishes
//   (completed / done / cancelled → drops out of the active set) she's
//   cleared back to available. Conditional writes only — no churn.
//   (busyUntil also self-expires in the engine once its time passes.)
// ─────────────────────────────────────────────────────────────
exports.syncTherapistBusyStatus = (0, scheduler_1.onSchedule)({
    schedule: "every 2 minutes",
    region: "asia-southeast1",
    timeZone: "Asia/Bangkok",
}, async () => {
    const db = (0, firestore_2.getFirestore)();
    const ACTIVE_STATES = ["assigned", "arrived", "in_session"];
    const snap = await db
        .collection("bookings")
        .where("dispatchState", "in", ACTIVE_STATES)
        .limit(300)
        .get();
    // therapistId → latest session end (Timestamp | null)
    const busy = new Map();
    for (const d of snap.docs) {
        const b = d.data();
        const tid = b.therapistId;
        if (!tid)
            continue;
        const end = b.expectedEndAt ?? b.endAt ?? null;
        if (!busy.has(tid)) {
            busy.set(tid, end);
        }
        else {
            const prev = busy.get(tid) ?? null;
            if (end && (!prev || end.toMillis() > prev.toMillis())) {
                busy.set(tid, end);
            }
        }
    }
    const tSnap = await db.collection("therapists").get();
    const batch = db.batch();
    let changes = 0;
    for (const t of tSnap.docs) {
        const data = t.data();
        // bookings store therapistId as the doc id, but match the mutable
        // `id` field too, defensively.
        const key = busy.has(t.id)
            ? t.id
            : data.id && busy.has(data.id)
                ? data.id
                : null;
        if (key != null) {
            if (data.activeBooking !== true) {
                batch.update(t.ref, {
                    activeBooking: true,
                    busyUntil: busy.get(key) ?? null,
                });
                changes += 1;
            }
        }
        else if (data.activeBooking === true) {
            batch.update(t.ref, { activeBooking: false, busyUntil: null });
            changes += 1;
        }
    }
    if (changes > 0)
        await batch.commit();
    v2_1.logger.info("[syncTherapistBusyStatus]", {
        activeBookings: snap.size,
        busyTherapists: busy.size,
        changes,
    });
});
// 🆕 Round 28x.37 (founder: "ทำเลย" — เปลี่ยนตัวหมอนวดในบุ๊กกิ้งแล้วสถานะบนเว็บ
//   ต้องขยับทันที ไม่รอรอบ 2 นาที) — instant busy re-sync at the exact moment a
//   booking's therapist assignment OR dispatch state changes.
//
//   syncTherapistBusyStatus (every 2 min) stays as the safety-net reconciler.
//   This trigger runs the SAME recompute immediately, but only for the
//   practitioner(s) the change touched — so a reassignment flips the "busy → free"
//   chip on BOTH the old and the new practitioner within ~1s, then the public
//   cards get it live via onSnapshot (useTherapistLiveStatus). No new index: it
//   reuses the reconciler's bounded, single-field `dispatchState in (…)` query.
//
//   Loop-safe: it writes only `activeBooking` / `busyUntil` on therapist docs,
//   both of which are in AUDIT_IGNORE_KEYS, so onTherapistUpdate treats the
//   write as "no meaningful change" and does nothing — no cascade.
exports.onBookingDispatchChange = (0, firestore_1.onDocumentUpdated)({
    document: "bookings/{bookingId}",
    region: "asia-southeast1",
}, async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!after)
        return;
    // Cheap guard BEFORE any read: skip ordinary edits (price / location /
    // phone / time) that can't move a practitioner's live busy status.
    const idChanged = (before?.therapistId ?? null) !== (after.therapistId ?? null);
    const stateChanged = (before?.dispatchState ?? null) !== (after.dispatchState ?? null);
    if (!idChanged && !stateChanged)
        return;
    // Practitioners whose busy status may have moved: the one just assigned,
    // plus the one just un-assigned (reassignment touches both).
    const affected = new Set();
    if (before?.therapistId)
        affected.add(before.therapistId);
    if (after.therapistId)
        affected.add(after.therapistId);
    if (affected.size === 0)
        return;
    const db = (0, firestore_2.getFirestore)();
    const ACTIVE_STATES = ["assigned", "arrived", "in_session"];
    // Same bounded, index-free query the 2-min reconciler uses.
    const snap = await db
        .collection("bookings")
        .where("dispatchState", "in", ACTIVE_STATES)
        .limit(300)
        .get();
    const busy = new Map();
    for (const d of snap.docs) {
        const b = d.data();
        const tid = b.therapistId;
        if (!tid)
            continue;
        const end = b.expectedEndAt ?? b.endAt ?? null;
        const prev = busy.get(tid) ?? null;
        if (!busy.has(tid) || (end && (!prev || end.toMillis() > prev.toMillis()))) {
            busy.set(tid, end);
        }
    }
    const batch = db.batch();
    let changes = 0;
    for (const tid of affected) {
        // therapistId on a booking is the therapist DOC id; fall back to the
        // mutable `id` field the same defensive way the reconciler does.
        let ref = db.collection("therapists").doc(tid);
        let docSnap = await ref.get();
        if (!docSnap.exists) {
            const q = await db
                .collection("therapists")
                .where("id", "==", tid)
                .limit(1)
                .get();
            if (q.empty)
                continue;
            docSnap = q.docs[0];
            ref = q.docs[0].ref;
        }
        const data = docSnap.data();
        if (busy.has(tid)) {
            const newUntil = busy.get(tid) ?? null;
            const curUntil = data?.busyUntil ?? null;
            const untilDiff = (newUntil?.toMillis?.() ?? null) !== (curUntil?.toMillis?.() ?? null);
            if (data?.activeBooking !== true || untilDiff) {
                batch.update(ref, { activeBooking: true, busyUntil: newUntil });
                changes += 1;
            }
        }
        else if (data?.activeBooking === true) {
            batch.update(ref, { activeBooking: false, busyUntil: null });
            changes += 1;
        }
    }
    if (changes > 0)
        await batch.commit();
    v2_1.logger.info("[onBookingDispatchChange]", {
        bookingId: event.params.bookingId,
        idChanged,
        stateChanged,
        affected: [...affected],
        changes,
    });
});
//# sourceMappingURL=index.js.map