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
exports.onBookingDispatchChange = exports.syncTherapistBusyStatus = exports.createAdminAccount = exports.getBookingPublic = exports.backfillTherapistUids = exports.createAdminLinkCode = exports.createJobChannelCode = exports.respondToJob = exports.createTherapistLinkCode = exports.setMemberAdmin = exports.createCustomerAccount = exports.resetCustomerPassword = exports.telegramConciergeWebhook = exports.postToChannelManual = exports.scheduledChannelLate = exports.scheduledChannelPrime = exports.scheduledChannelEvening = exports.telegramWebhook = exports.recoverAbandonedBookings = exports.alertOverdueSessions = exports.releaseExpiredHolds = exports.onBookingCreate = exports.onTherapistUpdate = exports.setRoleOnSignup = exports.moderateText = exports.onReviewCreate = exports.notifyBooking = void 0;
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
// 🆕 Round 28x.61 (founder: "ทดลองกับ XingXing ดูก่อน ถ้าเวิร์ค ค่อยขยับขยาย
//   กับคนอื่น") — a PILOT allowlist that overrides the master switch above for
//   named practitioners only.
//
//   Why not just flip DISPATCH_THERAPIST_DM: that switch is all-or-nothing, so
//   turning it on to test one person would start DMing every practitioner who
//   already has a telegramChatId on file — the opposite of a controlled trial.
//
//   Entries are therapist DOC IDs (src/data/therapists.ts `id`), not display
//   names — a name can be edited in the admin panel, and a renamed therapist
//   silently dropping out of the pilot is a bug nobody would notice.
//
//   To expand: add doc IDs here and redeploy onBookingCreate. To go fully
//   live: set DISPATCH_THERAPIST_DM = true (the allowlist then stops mattering).
const THERAPIST_DM_PILOT = ["XingXingSunRed"];
/** True if this practitioner should receive job DMs right now. */
function therapistDmEnabled(therapistId) {
    if (DISPATCH_THERAPIST_DM)
        return true; // everyone, once flipped
    if (!therapistId)
        return false;
    return THERAPIST_DM_PILOT.includes(therapistId); // pilot only
}
// ─────────────────────────────────────────────────────────────
// Helper: ส่งข้อความเข้า Telegram (reuse ใน multiple functions)
// ─────────────────────────────────────────────────────────────
async function sendTelegram(token, chatId, text, 
// 🆕 28x.64 — optional ACCEPT/DECLINE buttons on the dispatch DM.
keyboard) {
    try {
        const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                chat_id: chatId,
                text: text.slice(0, 4000),
                ...(keyboard ? { reply_markup: { inline_keyboard: keyboard } } : {}),
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
async function sendTelegramIfEnabled(token, chatId, text, keyboard) {
    if (!(await isTelegramEnabled())) {
        v2_1.logger.info("[sendTelegramIfEnabled] skipped — telegramEnabled=false");
        return { ok: true, body: "skipped: telegramEnabled=false" };
    }
    return sendTelegram(token, chatId, text, keyboard);
}
/** Dismiss the button's loading spinner, optionally with a toast. */
async function answerCallback(token, callbackQueryId, text) {
    try {
        await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                callback_query_id: callbackQueryId,
                ...(text ? { text: text.slice(0, 200), show_alert: false } : {}),
            }),
        });
    }
    catch (err) {
        v2_1.logger.warn("[answerCallback] failed", err);
    }
}
/** Replace a sent message in place — used to swap the buttons for an outcome. */
async function editTelegramMessage(token, chatId, messageId, text) {
    try {
        await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                chat_id: chatId,
                message_id: messageId,
                text: text.slice(0, 4000),
                disable_web_page_preview: true,
                // No reply_markup → the buttons disappear, so a job can't be
                // double-answered from an old message still on screen.
            }),
        });
    }
    catch (err) {
        v2_1.logger.warn("[editTelegramMessage] failed", err);
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
    // 🆕 28x.68 — compare against `place`, not `locationName`. When a booking has
    //   no locationName (most guest bookings — the field is only set when a POI
    //   is picked), `place` already fell back to the address, but this check
    //   compared the address to an EMPTY locationName, decided they differed, and
    //   appended it again: "Asok, Asok" on every such dispatch card.
    const extra = b.address?.trim() && norm(b.address) !== norm(place) ? b.address.trim() : "";
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
// ─────────────────────────────────────────────────────────────
// 🆕 Round 28x.69 (founder, on the CBODY model: "โดยที่ไม่ต้องเข้าถึงความเป็น
//   ส่วนตัวของอีกฝ่าย") — coarse area instead of a guest's exact address.
//
//   Mirrors the AREAS list on the near-me page. Anything unrecognised falls
//   back to "กรุงเทพฯ" — deliberately NOT a truncated address, because a
//   fragment like "Marriott Sukhumvit ห้อง" leaks the very thing being hidden.
const BKK_AREAS = [
    ["sukhumvit", "สุขุมวิท"],
    ["silom", "สีลม"],
    ["sathorn", "สาทร"],
    ["asok", "อโศก"],
    ["asoke", "อโศก"],
    ["nana", "นานา"],
    ["thonglor", "ทองหล่อ"],
    ["thong lo", "ทองหล่อ"],
    ["phrom phong", "พร้อมพงษ์"],
    ["phromphong", "พร้อมพงษ์"],
    ["ploenchit", "เพลินจิต"],
    ["chidlom", "ชิดลม"],
    ["ari", "อารีย์"],
    ["riverside", "ริมแม่น้ำ"],
    ["ratchada", "รัชดา"],
    ["siam", "สยาม"],
    ["ekkamai", "เอกมัย"],
    ["on nut", "อ่อนนุช"],
    ["onnut", "อ่อนนุช"],
    ["bangna", "บางนา"],
    ["rama", "พระราม"],
    ["pratunam", "ประตูน้ำ"],
    ["victory", "อนุสาวรีย์"],
    ["ratchaprasong", "ราชประสงค์"],
];
function coarseArea(b) {
    const hay = `${b.locationName ?? ""} ${b.address ?? ""}`.toLowerCase();
    for (const [needle, thai] of BKK_AREAS) {
        if (hay.includes(needle))
            return thai;
    }
    return "กรุงเทพฯ";
}
const formatBookingForTherapist = (bookingId, b, 
// 🆕 28x.69 — masked until she accepts. Before that a practitioner needs
//   enough to decide (what, when, roughly where, how much) and nothing more.
//   The guest's exact address, map pin and phone are the shop's to hold until
//   someone has actually taken the job — and a declined job must not leave a
//   guest's address sitting in a stranger's chat history forever.
masked = false) => {
    const refCode = `SR-${bookingId.slice(0, 8).toUpperCase()}`;
    const mapLink = b.mapUrl
        ? `🗺 Map: ${b.mapUrl}`
        : b.address
            ? `🗺 Map: https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(b.address)}`
            : "";
    // 🆕 Round 28x.63 (founder: "ขอภาษาไทยได้ไหม พนักงานบางคนอ่านไม่ออก") — the
    //   practitioners are Thai, and this is the message they read at 2am on the
    //   way to a stranger's hotel. English was the wrong default for the one
    //   message where misreading the address or the time actually costs something.
    //
    //   Also removed here: "Reply ACCEPT or DECLINE within 5 min." The webhook
    //   ignores all free-form text (it only handles /commands), so a practitioner
    //   who replied ACCEPT got silence — while reasonably believing she had taken
    //   the job. Promising an action the system doesn't implement is worse than
    //   not offering it. The real workflow is View dispatching by hand, so the
    //   message now says that. If ACCEPT/DECLINE is wanted for real it needs the
    //   webhook to handle replies and write dispatchState — a separate round.
    const money = typeof b.totalPrice === "number"
        ? `💰 รวม ${Math.round(b.totalPrice).toLocaleString()} ฿`
        : "";
    const lines = masked
        ? [
            `🔔 งานใหม่ · ${refCode}`,
            "",
            `🧖 ${b.serviceName ?? "—"} · ${b.duration ?? "?"} นาที`,
            `📅 ${b.date ?? "—"}  🕐 ${b.time ?? "—"}`,
            `📍 โซน: ${coarseArea(b)}`,
            money,
            `🌐 ภาษาลูกค้า: ${(b.language ?? "—").toUpperCase()}`,
            "",
            `กดปุ่มด้านล่างเพื่อตอบรับงานค่ะ · ตอบภายใน 5 นาที`,
            `📍 ที่อยู่เต็ม แผนที่ และเบอร์ลูกค้า`,
            `จะแสดงหลังกดรับงานค่ะ`,
        ].filter((l) => l.length > 0)
        : [
            `🔔 งานใหม่ · ${refCode}`,
            "",
            `🧖 ${b.serviceName ?? "—"} · ${b.duration ?? "?"} นาที`,
            `📅 ${b.date ?? "—"}  🕐 ${b.time ?? "—"}`,
            `📍 ${b.address ?? "—"}`,
            mapLink ? mapLink.replace("🗺 Map:", "🗺 แผนที่:") : "",
            `📞 เบอร์ลูกค้า: ${b.phone ?? "—"}`,
            `🌐 ภาษาลูกค้า: ${(b.language ?? "—").toUpperCase()}`,
            money,
            "",
            // 🆕 28x.64 — replaces the 28x.63 line saying the bot can't be replied to.
            //   That was true then and is false now; leaving it would tell her to
            //   ignore the very buttons below it.
            `กดปุ่มด้านล่างเพื่อตอบรับงานค่ะ · ตอบภายใน 5 นาที`,
            `ถ้ากดไม่ได้ ติดต่อแอดมินตามปกติ`,
        ].filter((l) => l.length > 0);
    return lines.join("\n");
};
/** 🆕 28x.64 — the ACCEPT/DECLINE keyboard for a specific job. */
const jobKeyboard = (bookingId) => [
    [
        { text: "✅ รับงาน", callback_data: `job:accept:${bookingId}` },
        { text: "❌ ไม่รับ", callback_data: `job:decline:${bookingId}` },
    ],
];
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
    // 🆕 28x.66 — stamp therapistUid first, before any Telegram work, so a
    //   practitioner can read the job the moment she is notified about it.
    //   Runs ahead of the token check on purpose: a missing bot token must not
    //   also cost her access to her own booking.
    await stampTherapistUid(bookingId, data.therapistId);
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
    //   🆕 Round 28x.61 — except for the pilot allowlist above. The admin group
    //   still gets the master copy either way, so a pilot DM adds a channel
    //   rather than replacing View's manual dispatch.
    if (therapistDmEnabled(data.therapistId) && data.therapistId) {
        try {
            const therapistSnap = await (0, firestore_2.getFirestore)()
                .collection("therapists")
                .doc(data.therapistId)
                .get();
            const therapist = therapistSnap.data();
            const chatId = therapist?.telegramChatId;
            if (chatId) {
                // 🆕 28x.69 — masked: the address, map and phone are withheld until she
                //   presses ✅. See formatBookingForTherapist.
                const therapistText = formatBookingForTherapist(bookingId, data, true);
                const therapistResult = await sendTelegramIfEnabled(token, String(chatId), therapistText, jobKeyboard(bookingId));
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
                // 🆕 28x.64 — stamp the booking so the Tonight board can tell
                //   "waiting for her answer" apart from "she was never asked".
                //   Without this the board would show ⏳ on every assigned job,
                //   including the majority that get no DM at all because their
                //   practitioner isn't on the pilot — i.e. it would claim we're
                //   waiting on an answer that can never arrive.
                if (therapistResult.ok) {
                    await (0, firestore_2.getFirestore)()
                        .collection("bookings")
                        .doc(bookingId)
                        .update({ dispatchDmSentAt: firestore_2.FieldValue.serverTimestamp() });
                }
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
    // ── 3. Unassigned job → post it to the practitioner channel (28x.71) ──
    //   A booking with nobody assigned previously sat in the admin group until
    //   View phoned around. Masked card, first press takes it.
    if (!data.therapistId) {
        try {
            const chan = await jobChannelId();
            if (chan) {
                const posted = await sendTelegramIfEnabled(token, chan, formatOpenJob(bookingId, data), openJobKeyboard(bookingId));
                await (0, firestore_2.getFirestore)().collection("telegramLogs").add({
                    bookingId,
                    ok: posted.ok,
                    response: posted.body.slice(0, 500),
                    source: "onBookingCreate.openChannel",
                    at: firestore_2.FieldValue.serverTimestamp(),
                });
            }
            else {
                v2_1.logger.info("[onBookingCreate] no job channel configured");
            }
        }
        catch (err) {
            // Same fail-open rule: the admin group already has the master copy.
            v2_1.logger.error("[onBookingCreate] open-job post failed", err);
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
// ─────────────────────────────────────────────────────────────
// 🆕 Round 28x.64 (founder: "ทำ ACCEPT/DECLINE เลย") — the practitioner
//   answers a job from the DM, and View sees it on the Tonight board without
//   phoning anyone.
//
// Design note — this does NOT touch `dispatchState`. That field drives
// syncTherapistBusyStatus, onBookingDispatchChange, alertOverdueSessions and
// the Tonight FLOW table, and its ACTIVE_STATES list is duplicated in two
// places that already disagree (neither includes "enroute"). Adding members to
// that enum to record an answer would risk a practitioner silently dropping out
// of the busy calculation. `therapistResponse` is a parallel field: it records
// who answered what, and changes nothing about the existing lifecycle.
//
// A decline sets `needsAdminReview` + `reviewReason`, which the Tonight board
// already renders as a red banner — so the warning path is reused, not rebuilt.
// 🆕 Round 28x.70 — redeem a one-time link code from the practitioner's side.
//   Returns the exact text to reply with. Deliberately vague on failure: a
//   distinguishable "expired" vs "wrong" vs "already used" would let someone
//   brute-force the 5-character space and hijack a practitioner's dispatch.
async function linkTherapistByCode(code, chatId, greetName) {
    const bad = [
        "รหัสเชื่อมไม่ถูกต้องหรือหมดอายุแล้วค่ะ",
        "ขอรหัสใหม่จากแอดมินได้เลย",
        "",
        "— Invalid or expired code. Ask the admin for a new one.",
    ].join("\n");
    if (!/^[A-Z0-9]{4,8}$/.test(code))
        return bad;
    const db = (0, firestore_2.getFirestore)();
    try {
        const found = await db
            .collection("therapists")
            .where("linkCode", "==", code)
            .limit(1)
            .get();
        if (found.empty)
            return bad;
        const tDoc = found.docs[0];
        const t = tDoc.data();
        const exp = t.linkCodeExpiresAt;
        if (!exp || exp.toMillis() < Date.now())
            return bad;
        await tDoc.ref.set({
            telegramChatId: String(chatId),
            // Burn the code — single use, so a forwarded message can't be redeemed
            // twice and quietly move dispatch to someone else's phone.
            linkCode: firestore_2.FieldValue.delete(),
            linkCodeExpiresAt: firestore_2.FieldValue.delete(),
        }, { merge: true });
        await db.collection("auditLogs").add({
            action: "therapist.linked",
            byUid: null,
            detail: { therapistId: tDoc.id, chatId: String(chatId) },
            at: firestore_2.FieldValue.serverTimestamp(),
        });
        v2_1.logger.info("[linkTherapistByCode] linked", {
            therapistId: tDoc.id,
            chatId,
        });
        const who = t.name ?? greetName;
        return [
            `✅ เชื่อมต่อแล้ว · ${who}`,
            "",
            "ระบบพร้อมส่งงานแล้ว มีลูกค้าจองเมื่อไหร่",
            "จะแจ้งมาที่แชทนี้ ไม่ต้องทำอะไรเพิ่ม",
            "",
            `— Linked as ${who}. Dispatch is set up.`,
        ].join("\n");
    }
    catch (err) {
        v2_1.logger.error("[linkTherapistByCode] failed", err);
        return bad;
    }
}
// ─────────────────────────────────────────────────────────────
// 🆕 Round 28x.71 — open jobs posted to the practitioner channel.
//
//   A booking with no practitioner assigned used to sit in the admin group
//   waiting for View to phone around. Now it also goes to the channel, masked,
//   and whoever presses first takes it.
//
//   Channel, not group, on purpose: Telegram group members can see each other's
//   personal accounts, so a roster of 13 would learn each other's real Telegram
//   identities. Channel subscribers can't see each other at all, and inline
//   buttons still work.
/**
 * Claim this chat as the job board. Returns the reply to send, or null to stay
 * silent (wrong/absent code — a silent bot tells a prober nothing).
 */
async function claimJobChannel(chatId, chatTitle, suppliedCode) {
    const db = (0, firestore_2.getFirestore)();
    const ref = db.collection("adminSettings").doc("advanced");
    const snap = await ref.get();
    const d = snap.data() ?? {};
    const want = typeof d.jobChannelCode === "string" ? d.jobChannelCode : "";
    const exp = d.jobChannelCodeExpiresAt;
    if (!want || !exp || exp.toMillis() < Date.now())
        return null;
    if (suppliedCode.toUpperCase() !== want.toUpperCase())
        return null;
    await ref.set({
        jobChannelId: String(chatId),
        jobChannelTitle: chatTitle ?? null,
        // Burn the code so a forwarded setup message can't move the board again.
        jobChannelCode: firestore_2.FieldValue.delete(),
        jobChannelCodeExpiresAt: firestore_2.FieldValue.delete(),
    }, { merge: true });
    v2_1.logger.info("[claimJobChannel] job board set", { chatId, chatTitle });
    return [
        "✅ ตั้งเป็นช่องงานเรียบร้อยแล้ว",
        "",
        "งานที่ยังไม่ได้จ่ายให้ใคร จะมาโพสต์ที่นี่",
        "ใครกดรับก่อนได้ก่อน · รายละเอียดเต็มส่งเข้าแชทส่วนตัว",
    ].join("\n");
}
// ─────────────────────────────────────────────────────────────
// 🆕 Round 28x.81 (founder: pasted a real customer-chat snippet and asked
//   "เราสามารถโยนออเดอร์จากแชทลูกค้า ... ให้บอทช่วยทำออเดอร์ได้ไหม") — she
//   copy-pastes what a customer typed (plus her own shorthand, e.g. "yuri
//   book 12.00 am") into @SunRed24hBot and the bot turns it into a real
//   booking. OpenAI extracts the fields; the bot ALWAYS shows a draft with
//   a single confirm tap before anything is written — free text is parsed
//   wrong often enough (ambiguous "12.00 am", a misspelled nickname, the
//   wrong hotel branch) that auto-creating straight from a guess is worse
//   than one extra tap, and a bad auto-created booking would dispatch a
//   real practitioner to a real address.
//
//   Deliberately v1-scoped:
//     • No geocoding — locationText is stored as-is (mapUrl falls back to
//       a Google "search by name" link, the same fallback buildMapUrl()
//       already uses client-side when lat/lng is unset). She can still
//       open the booking in AdminBookingAddPage-adjacent admin screens to
//       add precise coordinates if a booking needs route-based taxi fare.
//     • taxiFee/paymentFee default to 0 · payment defaults to "cash" — add
//       taxi fee manually afterward if the trip needs one.
//     • Price/commission-split tables below are duplicated (small, rarely
//       edited) from src/data/services.ts + src/utils/servicePricing.ts +
//       src/utils/commission.ts. They do NOT read the live admin-editable
//       overrides (adminSettings/publicRules, adminSettings/earnings) —
//       the draft always prints the price in plain Thai so a stale number
//       gets caught before the confirm tap, not after.
/** Which chat IDs are allowed to paste orders / are recognised as admin. */
async function isAdminChatId(chatId) {
    try {
        const snap = await (0, firestore_2.getFirestore)()
            .collection("adminSettings")
            .doc("advanced")
            .get();
        const ids = snap.data()?.adminTelegramChatIds ?? [];
        return ids.includes(String(chatId));
    }
    catch (err) {
        v2_1.logger.warn("[isAdminChatId] lookup failed", err);
        return false;
    }
}
/**
 * Link this chat as an admin order-intake chat. Mirrors claimJobChannel's
 * code-gate: silent on a wrong/absent/expired code (this elevates to admin
 * order-creation, a higher-stakes grant than the job-channel claim — a
 * distinguishable "wrong code" reply would help a prober narrow it down).
 */
async function linkAdminByCode(code, chatId) {
    const db = (0, firestore_2.getFirestore)();
    const ref = db.collection("adminSettings").doc("advanced");
    const snap = await ref.get();
    const d = snap.data() ?? {};
    const want = typeof d.adminLinkCode === "string" ? d.adminLinkCode : "";
    const exp = d.adminLinkCodeExpiresAt;
    if (!want || !exp || exp.toMillis() < Date.now())
        return null;
    if (code.toUpperCase() !== want.toUpperCase())
        return null;
    await ref.set({
        adminTelegramChatIds: firestore_2.FieldValue.arrayUnion(String(chatId)),
        adminLinkCode: firestore_2.FieldValue.delete(),
        adminLinkCodeExpiresAt: firestore_2.FieldValue.delete(),
    }, { merge: true });
    v2_1.logger.info("[linkAdminByCode] linked", { chatId });
    return [
        "✅ เชื่อมบัญชีแอดมินแล้วค่ะ",
        "",
        "วางข้อความออเดอร์ลูกค้าที่นี่ได้เลย ระบบจะช่วยแกะข้อมูลให้",
        "แล้วส่งร่างมาให้กดยืนยันอีกทีก่อนสร้างจริง",
    ].join("\n");
}
function bkkTodayISO() {
    return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(new Date());
}
// Duplicated (deliberately small, rarely-edited) from src/data/services.ts +
// src/utils/servicePricing.ts DURATION_PRICE_OVERRIDES. Update both places
// together if a price or duration tier changes.
const ADMIN_ORDER_SERVICES = [
    {
        id: "xSR-Thai",
        name: "Thai Massage",
        keywords: ["thai", "ไทย"],
        baseDuration: 60,
        durations: { 60: 1200, 90: 1600, 120: 2000 },
    },
    {
        id: "SR-Aroma",
        name: "Aromatherapy Massage",
        keywords: ["aroma", "oil", "อโรม่า", "อโรมา", "น้ำมัน"],
        baseDuration: 60,
        durations: { 60: 1400, 90: 1800, 120: 2400 },
    },
    {
        id: "SR-HJ2200",
        name: "Gentleman's Signature Therapy",
        keywords: ["gentleman", "signature", "hj"],
        baseDuration: 70,
        durations: { 70: 2200, 120: 3000 },
    },
    {
        id: "SR-B2B3200",
        name: "SunRed Therapeutic Experience",
        keywords: ["b2b", "therapeutic", "nuru"],
        baseDuration: 70,
        durations: { 70: 3200, 120: 4000 },
    },
];
function resolveServiceGuess(guess) {
    if (!guess)
        return null;
    const g = guess.toLowerCase();
    const match = ADMIN_ORDER_SERVICES.find((s) => s.keywords.some((k) => g.includes(k)));
    return match ? { id: match.id, name: match.name } : null;
}
/** Price for a (serviceId, duration), snapping to the nearest offered tier
 *  when the requested duration isn't sold. */
function priceForServiceDuration(serviceId, duration) {
    const svc = ADMIN_ORDER_SERVICES.find((s) => s.id === serviceId);
    if (!svc)
        return { price: 0, duration };
    if (svc.durations[duration] != null) {
        return { price: svc.durations[duration], duration };
    }
    const tiers = Object.keys(svc.durations).map(Number);
    const nearest = tiers.reduce((a, b) => Math.abs(b - duration) < Math.abs(a - duration) ? b : a);
    return { price: svc.durations[nearest], duration: nearest };
}
// Mirrors src/utils/commission.ts stampSplit()'s fixed per-(service,duration)
// table + flat 60% fallback. Does NOT read the live adminSettings/earnings
// override — keep in sync with commission.ts if the split table changes.
const SERVICE_SPLIT_DEFAULTS_SERVER = {
    "xSR-Thai": { 60: 700, 90: 900, 120: 1200 },
    "SR-Aroma": { 60: 800, 90: 1100, 120: 1500 },
    "SR-HJ2200": { 70: 1300, 120: 1800 },
    "SR-B2B3200": { 70: 2000, 120: 2500 },
};
function stampSplitServer(serviceId, servicePrice, duration) {
    const fixed = serviceId
        ? SERVICE_SPLIT_DEFAULTS_SERVER[serviceId]?.[duration]
        : undefined;
    const therapistShare = fixed ?? Math.round(servicePrice * 0.6);
    const shopShare = Math.max(0, servicePrice - therapistShare);
    return { therapistShare, shopShare };
}
async function resolveTherapistByName(nameGuess) {
    if (!nameGuess)
        return null;
    const g = nameGuess.trim().toLowerCase();
    if (!g)
        return null;
    const snap = await (0, firestore_2.getFirestore)().collection("therapists").get();
    let substringHit = null;
    for (const doc of snap.docs) {
        const name = doc.data().name;
        if (!name)
            continue;
        const n = name.trim().toLowerCase();
        if (n === g)
            return { id: doc.id, name };
        if (!substringHit && (n.includes(g) || g.includes(n))) {
            substringHit = { id: doc.id, name };
        }
    }
    return substringHit;
}
async function parseOrderText(apiKey, text) {
    try {
        const res = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: "gpt-4o-mini",
                temperature: 0,
                response_format: { type: "json_object" },
                messages: [
                    {
                        role: "system",
                        content: [
                            "You extract structured booking info from a raw chat snippet pasted by",
                            "an admin at SunRed, a Bangkok outcall massage service. The snippet is",
                            "usually what a CUSTOMER typed to request a booking, sometimes followed",
                            "by the admin's own shorthand assigning a therapist and time (e.g.",
                            "'yuri book 12.00 am' means therapist Yuri, booked for 12:00 AM).",
                            "",
                            "Return ONLY a JSON object with these exact keys:",
                            "looksLikeOrder (boolean — true only if this text contains an actual",
                            "booking request), customerName (string|null), hotelText (string|null —",
                            "hotel/address exactly as given), serviceGuess (string|null — the",
                            "massage/service type as given, e.g. 'thai massage'), durationMinutes",
                            "(number|null), timeHHmm (string|null — 24h HH:mm best guess; '12.00 am'",
                            "= '00:00', '12.00 pm' = '12:00'), phone (string|null — as given, keep +",
                            "and digits), therapistNameGuess (string|null — a therapist name or",
                            "nickname if one is mentioned), notes (string|null — anything else worth",
                            "keeping, e.g. special requests).",
                        ].join(" "),
                    },
                    { role: "user", content: text },
                ],
            }),
        });
        if (!res.ok) {
            const body = await res.text().catch(() => "");
            v2_1.logger.error("[parseOrderText] OpenAI request failed", {
                status: res.status,
                body: body.slice(0, 500),
            });
            return { parsed: null, error: `OpenAI HTTP ${res.status}: ${body.slice(0, 200)}` };
        }
        const json = (await res.json());
        const content = json.choices?.[0]?.message?.content;
        if (!content) {
            return { parsed: null, error: "OpenAI returned no content" };
        }
        const parsed = JSON.parse(content);
        return {
            parsed: {
                looksLikeOrder: Boolean(parsed.looksLikeOrder),
                customerName: parsed.customerName ?? null,
                hotelText: parsed.hotelText ?? null,
                serviceGuess: parsed.serviceGuess ?? null,
                durationMinutes: typeof parsed.durationMinutes === "number" ? parsed.durationMinutes : null,
                timeHHmm: typeof parsed.timeHHmm === "string" && /^\d{2}:\d{2}$/.test(parsed.timeHHmm)
                    ? parsed.timeHHmm
                    : null,
                phone: typeof parsed.phone === "string" ? parsed.phone : null,
                therapistNameGuess: typeof parsed.therapistNameGuess === "string" ? parsed.therapistNameGuess : null,
                notes: typeof parsed.notes === "string" ? parsed.notes : null,
            },
            error: null,
        };
    }
    catch (err) {
        v2_1.logger.error("[parseOrderText] failed", err);
        return { parsed: null, error: err instanceof Error ? err.message : String(err) };
    }
}
async function handleOrderPaste(text, chatId, token, apiKey) {
    const { parsed, error } = await parseOrderText(apiKey, text);
    if (error) {
        // 🆕 28x.81b — surface the real reason instead of a generic "not found".
        //   An OpenAI/config failure looks nothing like "your text was unclear",
        //   and conflating them made this impossible to debug from the chat alone.
        await sendTelegram(token, String(chatId), [`ระบบแกะข้อความไม่สำเร็จค่ะ (AI parsing error)`, error.slice(0, 300)].join("\n"));
        return;
    }
    if (!parsed || !parsed.looksLikeOrder) {
        await sendTelegram(token, String(chatId), [
            "ไม่เจอข้อมูลออเดอร์ในข้อความนี้ค่ะ",
            "ลองวางข้อความลูกค้าใหม่ ให้มีชื่อ/โรงแรม/บริการ/เวลา/เบอร์โทร",
        ].join("\n"));
        return;
    }
    const service = resolveServiceGuess(parsed.serviceGuess);
    const resolvedPrice = service
        ? priceForServiceDuration(service.id, parsed.durationMinutes ?? 0)
        : null;
    const therapist = await resolveTherapistByName(parsed.therapistNameGuess);
    const customerName = (parsed.customerName ?? "").trim();
    const phone = (parsed.phone ?? "").trim();
    const locationText = (parsed.hotelText ?? "").trim();
    const time = parsed.timeHHmm;
    const date = bkkTodayISO(); // v1 — always today in Bangkok time
    const missing = [];
    if (!customerName)
        missing.push("ชื่อลูกค้า");
    if (!/^[0-9+\s-]{6,15}$/.test(phone))
        missing.push("เบอร์โทร");
    if (!locationText)
        missing.push("สถานที่/โรงแรม");
    if (!service)
        missing.push("บริการ (พิมพ์ชื่อบริการให้ชัดเจนกว่านี้)");
    if (!time)
        missing.push("เวลา");
    const db = (0, firestore_2.getFirestore)();
    const draftRef = db.collection("orderDrafts").doc();
    const draft = {
        rawText: text,
        chatId: String(chatId),
        customerName,
        phone,
        locationText,
        serviceId: service?.id ?? null,
        serviceName: service?.name ?? null,
        servicePrice: resolvedPrice?.price ?? 0,
        duration: resolvedPrice?.duration ?? 60,
        date,
        time: time ?? "",
        therapistId: therapist?.id ?? null,
        therapistName: therapist?.name ?? null,
        note: parsed.notes ?? null,
        status: missing.length > 0 ? "cancelled" : "pending",
        expiresAt: firestore_2.Timestamp.fromMillis(Date.now() + 30 * 60 * 1000),
    };
    await draftRef.set(draft);
    const lines = [
        "📝 ร่างออเดอร์จากข้อความที่วาง",
        "",
        `ลูกค้า: ${customerName || "⚠️ ไม่พบ"}`,
        `โทร: ${phone || "⚠️ ไม่พบ"}`,
        `สถานที่: ${locationText || "⚠️ ไม่พบ"}`,
        `บริการ: ${service
            ? `${service.name} · ${resolvedPrice?.duration} นาที · ฿${(resolvedPrice?.price ?? 0).toLocaleString()}`
            : "⚠️ ไม่พบ"}`,
        `เวลา: ${time ?? "⚠️ ไม่พบ"} · วันที่ ${date}`,
        therapist
            ? `พนักงาน: ${therapist.name}`
            : parsed.therapistNameGuess
                ? `พนักงาน: ⚠️ ไม่พบ "${parsed.therapistNameGuess}" — จะปล่อยเป็นงานเปิดให้ทีมแย่งรับแทน`
                : `พนักงาน: (ไม่ระบุ — จะปล่อยเป็นงานเปิด)`,
        parsed.notes ? `หมายเหตุ: ${parsed.notes}` : "",
        "",
        "⚠️ ราคาอ้างอิงตารางในระบบ ไม่รวมค่าแท็กซี่ — ใส่เพิ่มทีหลังได้ที่หน้ารายการจอง",
    ].filter((l) => l.length > 0);
    if (missing.length > 0) {
        lines.push("", `❌ ข้อมูลไม่ครบ: ${missing.join(", ")}`, "พิมพ์ข้อความใหม่พร้อมข้อมูลที่ขาด แล้วส่งอีกครั้งค่ะ");
        await sendTelegram(token, String(chatId), lines.join("\n"));
        return;
    }
    lines.push("", "กดยืนยันเพื่อสร้างออเดอร์จริงค่ะ");
    await sendTelegram(token, String(chatId), lines.join("\n"), [
        [
            { text: "✅ ยืนยันสร้างออเดอร์", callback_data: `order:confirm:${draftRef.id}` },
            { text: "❌ ยกเลิก", callback_data: `order:cancel:${draftRef.id}` },
        ],
    ]);
}
async function handleOrderCallback(q, action, draftId, token) {
    const db = (0, firestore_2.getFirestore)();
    const pressedBy = q.from?.id;
    const msgChatId = q.message?.chat?.id;
    const msgId = q.message?.message_id;
    if (!pressedBy || !(await isAdminChatId(pressedBy))) {
        await answerCallback(token, q.id, "ไม่ได้รับสิทธิ์ค่ะ");
        return;
    }
    const ref = db.collection("orderDrafts").doc(draftId);
    const snap = await ref.get();
    if (!snap.exists) {
        await answerCallback(token, q.id, "ร่างนี้หมดอายุหรือถูกใช้ไปแล้วค่ะ");
        return;
    }
    const draft = snap.data();
    if (action === "cancel") {
        if (draft.status === "pending")
            await ref.update({ status: "cancelled" });
        await answerCallback(token, q.id, "ยกเลิกแล้วค่ะ");
        if (msgChatId && msgId) {
            await editTelegramMessage(token, msgChatId, msgId, "❌ ยกเลิกร่างออเดอร์นี้แล้ว");
        }
        return;
    }
    if (action !== "confirm") {
        await answerCallback(token, q.id);
        return;
    }
    if (draft.status === "confirmed") {
        await answerCallback(token, q.id, `สร้างไปแล้วค่ะ · ${draft.bookingCode ?? ""}`);
        return;
    }
    if (draft.status === "cancelled" || draft.expiresAt.toMillis() < Date.now()) {
        await answerCallback(token, q.id, "ร่างนี้หมดอายุแล้วค่ะ ส่งข้อความใหม่อีกครั้ง");
        return;
    }
    try {
        const startAt = new Date(`${draft.date}T${draft.time}:00+07:00`);
        const endAt = new Date(startAt.getTime() + draft.duration * 60000);
        const mapUrl = draft.locationText
            ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(draft.locationText)}`
            : null;
        const { therapistShare, shopShare } = stampSplitServer(draft.serviceId, draft.servicePrice, draft.duration);
        const bookingRef = await db.collection("bookings").add({
            userId: null,
            customerName: draft.customerName,
            contactName: draft.customerName,
            ...(draft.therapistId
                ? { therapistId: draft.therapistId, therapistName: draft.therapistName }
                : {}),
            serviceName: draft.serviceName,
            serviceId: draft.serviceId,
            servicePrice: draft.servicePrice,
            duration: draft.duration,
            taxiFee: 0,
            paymentFee: 0,
            totalPrice: draft.servicePrice,
            date: draft.date,
            time: draft.time,
            startAt: firestore_2.Timestamp.fromDate(startAt),
            endAt: firestore_2.Timestamp.fromDate(endAt),
            locationName: draft.locationText,
            address: draft.locationText,
            lat: null,
            lng: null,
            mapUrl,
            phone: draft.phone,
            note: draft.note ?? "",
            status: "confirmed",
            therapistShare,
            shopShare,
            payment: "cash",
            createdAt: firestore_2.Timestamp.now(),
            createdBy: "admin",
            createdByUid: null,
            createdByEmail: null,
            createdByPhone: null,
            createdByName: "แอดมิน (Telegram)",
            sourceChannel: "telegram-order-paste",
        });
        const bookingCode = `SR-${bookingRef.id.slice(0, 8).toUpperCase()}`;
        await bookingRef.update({ bookingCode });
        await ref.update({ status: "confirmed", bookingId: bookingRef.id, bookingCode });
        await answerCallback(token, q.id, `สร้างออเดอร์แล้วค่ะ · ${bookingCode}`);
        if (msgChatId && msgId) {
            await editTelegramMessage(token, msgChatId, msgId, `✅ สร้างออเดอร์แล้ว · ${bookingCode}\n${draft.customerName} · ${draft.serviceName} · ${draft.time}`);
        }
    }
    catch (err) {
        v2_1.logger.error("[handleOrderCallback] confirm failed", err);
        await answerCallback(token, q.id, "สร้างออเดอร์ไม่สำเร็จ ลองใหม่อีกครั้งค่ะ");
    }
}
async function jobChannelId() {
    try {
        const snap = await (0, firestore_2.getFirestore)()
            .collection("adminSettings")
            .doc("advanced")
            .get();
        const v = snap.data()?.jobChannelId;
        return typeof v === "string" && v ? v : null;
    }
    catch {
        return null;
    }
}
/** The masked card the channel sees — no guest, no address, no phone. */
function formatOpenJob(bookingId, b) {
    const refCode = `SR-${bookingId.slice(0, 8).toUpperCase()}`;
    return [
        `🆕 งานว่าง · ${refCode}`,
        "",
        `🧖 ${b.serviceName ?? "—"} · ${b.duration ?? "?"} นาที`,
        `📅 ${b.date ?? "—"}  🕐 ${b.time ?? "—"}`,
        `📍 โซน: ${coarseArea(b)}`,
        typeof b.totalPrice === "number"
            ? `💰 รวม ${Math.round(b.totalPrice).toLocaleString()} ฿`
            : "",
        "",
        "กดรับงานก่อนได้ก่อนค่ะ",
        "รายละเอียดเต็มจะส่งเข้าแชทส่วนตัวของคนที่รับ",
    ]
        .filter((l) => l.length > 0)
        .join("\n");
}
const openJobKeyboard = (bookingId) => [
    [{ text: "🙋 รับงานนี้", callback_data: `open:claim:${bookingId}` }],
];
/**
 * First-come-first-served claim from the channel.
 *
 * The whole risk here is two practitioners pressing within the same second, so
 * the assignment runs in a transaction: whoever's write lands first owns the
 * job, and the other is told it's gone rather than both being sent to the same
 * hotel room.
 */
async function handleOpenJobClaim(q, bookingId, token) {
    const db = (0, firestore_2.getFirestore)();
    const pressedBy = q.from?.id;
    if (!pressedBy) {
        await answerCallback(token, q.id);
        return;
    }
    // Only a linked practitioner may claim — the channel could later include
    // someone who isn't on the roster.
    const tSnap = await db
        .collection("therapists")
        .where("telegramChatId", "in", [String(pressedBy), pressedBy])
        .limit(1)
        .get();
    if (tSnap.empty) {
        await answerCallback(token, q.id, "บัญชีนี้ยังไม่ได้เชื่อมกับระบบค่ะ");
        return;
    }
    const therapistDoc = tSnap.docs[0];
    const therapist = therapistDoc.data();
    const ref = db.collection("bookings").doc(bookingId);
    let outcome;
    try {
        // Return the outcome out of the transaction rather than assigning to an
        // outer variable: the callback runs later, so TypeScript can't see the
        // assignment and narrows the value to its initialiser.
        outcome = await db.runTransaction(async (tx) => {
            const snap = await tx.get(ref);
            if (!snap.exists)
                return "gone";
            const b = snap.data();
            if (b.status === "cancelled" || b.status === "canceled")
                return "gone";
            if (b.therapistId)
                return "taken";
            tx.update(ref, {
                therapistId: therapistDoc.id,
                therapistName: therapist.name ?? therapistDoc.id,
                ...(therapist.uid ? { therapistUid: therapist.uid } : {}),
                therapistResponse: "accepted",
                therapistRespondedAt: firestore_2.FieldValue.serverTimestamp(),
                claimedFrom: "channel",
            });
            return "won";
        });
    }
    catch (err) {
        v2_1.logger.error("[openJobClaim] transaction failed", { bookingId, err });
        await answerCallback(token, q.id, "ระบบขัดข้อง ลองใหม่อีกครั้งค่ะ");
        return;
    }
    if (outcome === "taken") {
        await answerCallback(token, q.id, "งานนี้มีคนรับไปแล้วค่ะ");
        return;
    }
    if (outcome === "gone") {
        await answerCallback(token, q.id, "งานนี้ไม่เปิดรับแล้วค่ะ");
        return;
    }
    const who = therapist.name ?? therapistDoc.id;
    await answerCallback(token, q.id, "รับงานแล้วค่ะ ดูรายละเอียดในแชทส่วนตัว");
    // Close the channel post. No details, no winner's name — the channel is a
    // shared surface and neither the guest nor the practitioner needs publishing.
    const chanId = q.message?.chat?.id;
    const msgId = q.message?.message_id;
    if (chanId && msgId) {
        await editTelegramMessage(token, chanId, msgId, `✅ งานนี้มีคนรับแล้ว · SR-${bookingId.slice(0, 8).toUpperCase()}`);
    }
    // Full details go to the winner alone.
    const fresh = await ref.get();
    const full = fresh.data();
    await sendTelegramIfEnabled(token, String(pressedBy), `${formatBookingForTherapist(bookingId, full, false)
        .split("\n")
        .filter((l) => !l.startsWith("กดปุ่มด้านล่าง") && !l.startsWith("ถ้ากดไม่ได้"))
        .join("\n")
        .replace("🔔 งานใหม่ ·", "✅ รับงานแล้ว ·")
        .trimEnd()}\n\nแอดมินเห็นแล้วว่าคุณรับงานนี้ เดินทางได้เลยค่ะ`);
    await sendTelegramIfEnabled(token, TELEGRAM_CHAT_ID, `🙋 ${who} รับงานจากช่องงานแล้ว · SR-${bookingId.slice(0, 8).toUpperCase()} · ${full.date ?? ""} ${full.time ?? ""}`);
    await db.collection("telegramLogs").add({
        bookingId,
        therapistId: therapistDoc.id,
        ok: true,
        response: "claimed-from-channel",
        source: "openJobClaim",
        at: firestore_2.FieldValue.serverTimestamp(),
    });
    v2_1.logger.info("[openJobClaim] claimed", { bookingId, therapistId: therapistDoc.id });
}
async function handleJobCallback(q, token) {
    const data = q.data ?? "";
    const parts = data.split(":");
    // 🆕 28x.81 — "order:confirm:<draftId>" / "order:cancel:<draftId>" come from
    //   the admin order-paste draft, a different flow entirely (creates a new
    //   booking rather than answering one).
    if (parts[0] === "order" && parts.length >= 3) {
        await handleOrderCallback(q, parts[1], parts.slice(2).join(":"), token);
        return;
    }
    // 🆕 28x.71 — "open:claim:<id>" comes from the job channel, where nobody is
    //   assigned yet, so it takes a different path (first-come, transactional).
    if (parts[0] === "open" && parts[1] === "claim" && parts.length >= 3) {
        await handleOpenJobClaim(q, parts.slice(2).join(":"), token);
        return;
    }
    if (parts[0] !== "job" || parts.length < 3) {
        await answerCallback(token, q.id);
        return;
    }
    const action = parts[1]; // accept | decline
    const bookingId = parts.slice(2).join(":"); // ids don't contain ":", but be safe
    const pressedBy = q.from?.id;
    const msgChatId = q.message?.chat?.id;
    const msgId = q.message?.message_id;
    const db = (0, firestore_2.getFirestore)();
    if (action !== "accept" && action !== "decline") {
        await answerCallback(token, q.id);
        return;
    }
    try {
        const ref = db.collection("bookings").doc(bookingId);
        const snap = await ref.get();
        if (!snap.exists) {
            await answerCallback(token, q.id, "ไม่พบงานนี้ในระบบ");
            return;
        }
        const b = snap.data();
        // ── Identity check. Without this, anyone who guessed a booking id could
        //    accept another practitioner's job — the callback_data is not a secret,
        //    it travels in a message we send. Verify the presser IS the assigned
        //    practitioner, by her linked chat id.
        let assignedChatId = null;
        if (b.therapistId) {
            const tSnap = await db.collection("therapists").doc(b.therapistId).get();
            const t = tSnap.data();
            // trim(): the chat id is pasted by hand into the admin form. A stray
            // space would make this comparison fail and tell the right practitioner
            // the job isn't hers — a confusing dead end at 2am.
            assignedChatId =
                t?.telegramChatId != null ? String(t.telegramChatId).trim() : null;
        }
        if (!assignedChatId || String(pressedBy).trim() !== assignedChatId) {
            v2_1.logger.warn("[jobCallback] presser is not the assigned therapist", {
                bookingId,
                pressedBy,
                therapistId: b.therapistId,
            });
            await answerCallback(token, q.id, "งานนี้ไม่ได้จ่ายให้คุณค่ะ");
            return;
        }
        // ── Already answered → say so rather than silently overwriting. Telegram
        //    can redeliver an update, and an old message may still be on screen.
        if (b.therapistResponse) {
            const wasAccepted = b.therapistResponse === "accepted";
            await answerCallback(token, q.id, wasAccepted ? "งานนี้กดรับไปแล้วค่ะ" : "งานนี้กดไม่รับไปแล้วค่ะ");
            if (msgChatId && msgId) {
                await editTelegramMessage(token, msgChatId, msgId, `${wasAccepted ? "✅ รับงานแล้ว" : "❌ ไม่รับงาน"} · ตอบไปก่อนหน้านี้แล้ว`);
            }
            return;
        }
        // ── A cancelled job can't be accepted.
        if (b.status === "cancelled" || b.status === "canceled") {
            await answerCallback(token, q.id, "งานนี้ถูกยกเลิกไปแล้วค่ะ");
            return;
        }
        const accepted = action === "accept";
        await ref.update({
            therapistResponse: accepted ? "accepted" : "declined",
            therapistRespondedAt: firestore_2.FieldValue.serverTimestamp(),
            // A decline needs View's attention NOW — reuse the existing red banner.
            ...(accepted
                ? {}
                : {
                    needsAdminReview: true,
                    reviewReason: b.reviewReason
                        ? `${b.reviewReason} · หมอนวดกดไม่รับงาน`
                        : "หมอนวดกดไม่รับงาน",
                }),
        });
        // ── Confirm to the practitioner, in place, buttons removed.
        await answerCallback(token, q.id, accepted ? "รับงานแล้วค่ะ" : "แจ้งแอดมินแล้วค่ะ");
        if (msgChatId && msgId) {
            // 🆕 28x.69 — the reveal. Accepting swaps the masked card for the full
            //   one: address, map pin and the guest's phone, in the same message she
            //   is already looking at. Declining reveals nothing and leaves nothing
            //   behind — the point of masking is that a job she turned down never
            //   put a guest's address in her chat history.
            const fullCard = formatBookingForTherapist(bookingId, snap.data(), false)
                // Drop the two trailing prompt lines; the buttons are gone by now.
                .split("\n")
                .filter((l) => !l.startsWith("กดปุ่มด้านล่าง") && !l.startsWith("ถ้ากดไม่ได้"))
                .join("\n")
                .replace(`🔔 งานใหม่ ·`, `✅ รับงานแล้ว ·`)
                .trimEnd();
            await editTelegramMessage(token, msgChatId, msgId, accepted
                ? `${fullCard}\n\nแอดมินเห็นแล้วว่าคุณรับงานนี้ เดินทางได้เลยค่ะ`
                : `❌ ไม่รับงาน\n\nแจ้งแอดมินเรียบร้อยแล้ว จะจ่ายงานให้คนอื่นต่อค่ะ`);
        }
        // ── Tell the admin group either way. An accept is reassurance; a decline
        //    is the one that needs someone to act, so it says so loudly.
        const who = b.therapistName ?? b.therapistId ?? "หมอนวด";
        const refCode = `SR-${bookingId.slice(0, 8).toUpperCase()}`;
        await sendTelegramIfEnabled(token, TELEGRAM_CHAT_ID, accepted
            ? `✅ ${who} รับงานแล้ว · ${refCode} · ${b.date ?? ""} ${b.time ?? ""}`
            : `⚠️ ${who} กดไม่รับงาน · ${refCode} · ${b.date ?? ""} ${b.time ?? ""}\nต้องจ่ายงานให้คนอื่น`);
        await db.collection("telegramLogs").add({
            bookingId,
            therapistId: b.therapistId ?? null,
            ok: true,
            response: accepted ? "accepted" : "declined",
            source: "jobCallback",
            at: firestore_2.FieldValue.serverTimestamp(),
        });
        v2_1.logger.info("[jobCallback] recorded", { bookingId, action, pressedBy });
    }
    catch (err) {
        v2_1.logger.error("[jobCallback] failed", err);
        // Never leave the button spinning — she'd tap it again.
        await answerCallback(token, q.id, "ระบบขัดข้อง ติดต่อแอดมินค่ะ");
    }
}
exports.telegramWebhook = (0, https_1.onRequest)({
    region: "asia-southeast1",
    secrets: [TELEGRAM_BOT_TOKEN, OPENAI_API_KEY],
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
    // 🆕 Round 28x.64 — ACCEPT / DECLINE button presses.
    // 🆕 28x.71 — the bot learns its own job channel. The founder posts
    //   /setjobchannel in the channel once; nothing else in the flow needs her
    //   to find or copy an id anywhere.
    if (update?.channel_post) {
        const cp = update.channel_post;
        const cid = cp.chat?.id;
        const t = (cp.text ?? "").trim();
        if (cid && /^\/setjobchannel(@\w+)?\b/i.test(t)) {
            const reply = await claimJobChannel(cid, cp.chat?.title, t.replace(/^\/setjobchannel(@\w+)?/i, "").trim());
            if (reply)
                await sendTelegram(token, String(cid), reply);
        }
        res.status(200).send("ok");
        return;
    }
    if (update?.callback_query) {
        await handleJobCallback(update.callback_query, token);
        res.status(200).send("ok");
        return;
    }
    const chatId = update?.message?.chat?.id;
    const text = (update?.message?.text ?? "").trim();
    const fromName = update?.message?.from?.first_name ??
        update?.message?.from?.username ??
        "there";
    if (!chatId) {
        res.status(200).send("ok"); // ack but ignore
        return;
    }
    // 🆕 Round 28x.62 (founder, during the XingXing pilot: her Telegram account
    //   is named "view", her WORK name is XingXing) — look up whether this chat
    //   is already linked to a practitioner, so the bot can answer with the work
    //   name rather than whatever personal name Telegram reports.
    //
    //   The real value is verification: until now the only way to find out
    //   whether the admin pasted the right chat ID was to wait for a live
    //   booking and see if it arrived. A wrong digit failed silently — and
    //   silently means a practitioner sitting there believing she's on call.
    //   Now /myid answers "linked as X" the moment it's true.
    let linkedName = null;
    try {
        const linked = await (0, firestore_2.getFirestore)()
            .collection("therapists")
            .where("telegramChatId", "in", [String(chatId), chatId])
            .limit(1)
            .get();
        if (!linked.empty) {
            const d = linked.docs[0].data();
            linkedName = d.name ?? linked.docs[0].id;
        }
    }
    catch (err) {
        // Never let the lookup break the reply — an unlinked answer is still
        // useful, a silent bot is not.
        v2_1.logger.warn("[telegramWebhook] linked-therapist lookup failed", err);
    }
    // Greet by WORK name when we know it — the practitioner's personal
    // Telegram name is not the name she is known by here.
    const greetName = linkedName ?? fromName;
    // 🆕 Round 28x.63 — Thai first, English underneath. Thai because that's who
    //   reads these; English kept short because a practitioner who can read it
    //   shouldn't have to scroll past a wall of text to find her chat ID.
    let reply;
    if (text === "/start") {
        reply = linkedName
            ? [
                `สวัสดีค่ะ ${linkedName} 👋`,
                "",
                "บัญชีนี้เชื่อมกับระบบจ่ายงาน SunRed แล้ว",
                "มีงานเข้าเมื่อไหร่ จะแจ้งมาที่แชทนี้",
                "พิมพ์ /myid เพื่อตรวจสอบการเชื่อมต่อได้ตลอด",
                "",
                "— You're linked to SunRed dispatch. Send /myid to check.",
            ].join("\n")
            : [
                `สวัสดีค่ะ ${greetName} 👋`,
                "",
                "นี่คือบอทแจ้งงานของ SunRed",
                "พิมพ์ /myid เพื่อรับรหัสประจำตัว แล้วส่งรหัสนั้น",
                "ให้แอดมิน เพื่อให้ระบบส่งงานมาหาคุณได้",
                "",
                "— Send /myid to get your chat ID, then give it to the admin.",
            ].join("\n");
    }
    else if (/^\/setjobchannel(@\w+)?\b/i.test(text)) {
        // 🆕 28x.72 — the founder created a GROUP, not a channel, so this arrives
        //   as `message`. Telegram also appends @botname to commands in groups,
        //   hence the optional suffix in the pattern.
        const claimed = await claimJobChannel(chatId, update?.message?.chat?.title, text.replace(/^\/setjobchannel(@\w+)?/i, "").trim());
        if (!claimed) {
            res.status(200).send("ok"); // wrong/absent code → stay silent
            return;
        }
        reply = claimed;
    }
    else if (/^\/linkadmin\b/i.test(text)) {
        // 🆕 28x.81 — MUST be checked before the generic "/link" branch below,
        //   since "/linkadmin".startsWith("/link") is true and would otherwise
        //   get parsed as a (nonsense) therapist link code.
        const code = text.replace(/^\/linkadmin/i, "").trim().toUpperCase();
        const linked = await linkAdminByCode(code, chatId);
        if (!linked) {
            res.status(200).send("ok"); // wrong/absent code → stay silent
            return;
        }
        reply = linked;
    }
    else if (text.toLowerCase().startsWith("/link")) {
        // 🆕 28x.70 — self-service linking. Replaces the three-step /myid dance
        //   where a 10-digit chat id was read off one screen and retyped into
        //   another; a single wrong digit sent a guest's job to a stranger.
        const code = text.slice(5).trim().toUpperCase();
        reply = await linkTherapistByCode(code, chatId, greetName);
    }
    else if (text === "/myid" || text === "/id") {
        reply = linkedName
            ? [
                `✅ เชื่อมต่อแล้ว · ${linkedName}`,
                ``,
                `รหัสประจำตัวของคุณ:`,
                ``,
                `${chatId}`,
                ``,
                `ระบบพร้อมส่งงานแล้ว มีลูกค้าจองเมื่อไหร่`,
                `จะแจ้งมาที่แชทนี้ ไม่ต้องทำอะไรเพิ่ม`,
                "",
                `— Linked as ${linkedName}. Dispatch is set up.`,
            ].join("\n")
            : [
                `รหัสประจำตัวของคุณ:`,
                ``,
                `${chatId}`,
                ``,
                `ก๊อปเลขนี้ส่งให้แอดมิน SunRed`,
                `พอแอดมินใส่ให้แล้ว จะมีงานแจ้งมาที่แชทนี้`,
                ``,
                `พิมพ์ /myid ซ้ำอีกครั้งหลังแอดมินใส่ให้`,
                `ถ้าขึ้นว่า "เชื่อมต่อแล้ว" คือใช้งานได้จริง`,
                "",
                `— Copy this number and send it to the SunRed admin.`,
            ].join("\n");
    }
    else if (text.startsWith("/")) {
        // 🆕 28x.72 — private chats only. In the job group this fired on every
        //   mistyped command and answered into a channel practitioners read for
        //   work, which is exactly the noise a dispatch board must not have.
        if (update?.message?.chat?.type !== "private") {
            res.status(200).send("ok");
            return;
        }
        reply = [
            "ไม่รู้จักคำสั่งนี้ค่ะ",
            "พิมพ์ /myid เพื่อดูรหัสประจำตัว",
            "",
            "— Unknown command. Try /myid.",
        ].join("\n");
    }
    else if (update?.message?.chat?.type === "private" &&
        (await isAdminChatId(chatId))) {
        // 🆕 28x.81 — a linked admin's free text is treated as a pasted order,
        //   not a therapist's stray reply. Runs before the generic "use the
        //   buttons" fallback below, which is aimed at therapists.
        const apiKey = OPENAI_API_KEY.value().trim();
        if (!apiKey) {
            reply = "ระบบยังไม่ได้ตั้งค่า AI parsing ค่ะ (OPENAI_API_KEY ไม่มีค่า)";
        }
        else {
            await handleOrderPaste(text, chatId, token, apiKey);
            res.status(200).send("ok");
            return;
        }
    }
    else if (update?.message?.chat?.type === "private") {
        // 🆕 28x.63 — was silent. The old job DM told practitioners to "Reply
        //   ACCEPT or DECLINE", so some will still try; silence let them believe
        //   they had taken the job. One short line, private chats only.
        // 🆕 28x.64 — the bot now DOES take an answer, but only via the buttons
        //   on the job message. Point her there instead of at the admin.
        reply = [
            "พิมพ์ตอบตรงนี้แอดมินไม่เห็นค่ะ",
            "ถ้าจะรับงาน ให้กดปุ่ม ✅ รับงาน / ❌ ไม่รับ",
            "ที่อยู่ในข้อความแจ้งงานนะคะ",
            "",
            "— Please use the buttons on the job message.",
        ].join("\n");
    }
    else {
        // Group chats: stay silent (see the note on `type` above).
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
        // actorId (not just byUid) so this shows in the granting admin's own
        // activity feed on /admin/account, which filters on actorId.
        actorId: callerUid,
        byUid: callerUid,
        targetUid,
        detail: { phone },
        at: firestore_2.FieldValue.serverTimestamp(),
    });
    v2_1.logger.info("[setMemberAdmin] done", { targetUid, makeAdmin, byUid: callerUid });
    return { ok: true, uid: targetUid, isAdmin: makeAdmin };
});
// ─────────────────────────────────────────────────────────────
// 🆕 Round 28x.59 (founder: "หรือจะแยกหน้าแอดมิน ออกจากทางเข้าระบบผ่านเว็บ") —
//   mint a DEDICATED admin login, separate from any customer membership.
//
//   Why this and not a separate admin login page: hiding the form at a secret
//   URL buys nothing. Firebase Auth accepts signInWithEmailAndPassword at the
//   API level, so anyone holding the credentials gets in without ever loading
//   our page. What actually matters is that the credentials aren't guessable —
//   and a member account's are, by construction (username = the SRD- code,
//   password = the phone we print on taxi cards).
//
//   So the separation is of IDENTITY, not of URL:
//     • username must NOT look like a member code (srd-… is rejected)
//     • password is typed by the concierge, never derived from a phone
//
//   NB the "no role editing here" rule in AdminAccountPage's header is about
//   self-promotion (granting yourself rights you don't have). Creating a
//   second staff account is a different act, and it still requires already
//   being an admin.
// ─────────────────────────────────────────────────────────────
// 🆕 Round 28x.65 — read ONE booking for the guest success page.
//
//   Replaces the `allow get: if true` rule on bookings. That rule existed for
//   exactly one flow (an unauthenticated guest landing on /booking/success/:id
//   after checkout) and paid for it by letting anyone holding a 20-char doc id
//   read a guest's home address, phone and GPS coordinates. For a business
//   whose entire promise is discretion, that was the wrong trade.
//
//   Firestore rules can't verify a client-supplied secret on a read, so the
//   check lives here. Two ways in:
//     • the capability token minted at booking time (guests), or
//     • being signed in as the booking's owner (or an admin).
//
//   What comes back is a WHITELIST — the fields BookingSuccessPage actually
//   renders. Notably absent: phone, note, location{lat,lng}, createdBy,
//   dispatch state, therapistResponse. Even the legitimate guest doesn't need
//   those to see their own confirmation, and a whitelist can't leak a field
//   somebody adds to the doc later.
// ─────────────────────────────────────────────────────────────
// 🆕 Round 28x.67 — backfill therapistUid across existing bookings.
//
//   New bookings get stamped by onBookingCreate, but every job already in the
//   system predates the field — so without this a practitioner opening her job
//   list would see an empty screen and reasonably conclude the feature is
//   broken. Admin-only, idempotent, safe to run repeatedly.
// ─────────────────────────────────────────────────────────────
// 🆕 Round 28x.70 (founder: "รหัสเชื่อมบัญชี — DM เหมือนเดิม แต่ตั้งค่าง่าย
//   เท่ากลุ่ม") — one-time codes so a practitioner links herself.
//
//   The old flow had three steps and two people: she sends /myid, reads a
//   10-digit number off her screen, forwards it to View, View retypes it into
//   the admin panel. A single mistyped digit fails silently — the job DM goes
//   to a stranger's chat, or nowhere.
//
//   Now: View presses a button, sends her "/link XR7K2", and the bot does the
//   rest. No number ever passes through a human's hands.
//
//   Codes are single-use and expire in 24h. The alphabet omits 0/O/1/I/L so a
//   code read off a screen can't be mistyped into a different valid one.
const LINK_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
function makeLinkCode() {
    let out = "";
    for (let i = 0; i < 5; i++) {
        out += LINK_ALPHABET[Math.floor(Math.random() * LINK_ALPHABET.length)];
    }
    return out;
}
exports.createTherapistLinkCode = (0, https_1.onCall)({ region: "asia-southeast1" }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "Sign in required.");
    }
    const db = (0, firestore_2.getFirestore)();
    if (!(await db.collection("admins").doc(request.auth.uid).get()).exists) {
        throw new https_1.HttpsError("permission-denied", "Admin only.");
    }
    const therapistId = String(request.data?.therapistId ?? "").trim();
    if (!therapistId) {
        throw new https_1.HttpsError("invalid-argument", "therapistId is required.");
    }
    const tRef = db.collection("therapists").doc(therapistId);
    if (!(await tRef.get()).exists) {
        throw new https_1.HttpsError("not-found", "Therapist not found.");
    }
    // Retry on the (rare) chance of an active duplicate — two practitioners
    // sharing a live code would link the wrong person to the wrong jobs.
    let code = "";
    for (let attempt = 0; attempt < 5; attempt++) {
        const candidate = makeLinkCode();
        const clash = await db
            .collection("therapists")
            .where("linkCode", "==", candidate)
            .limit(1)
            .get();
        if (clash.empty) {
            code = candidate;
            break;
        }
    }
    if (!code) {
        throw new https_1.HttpsError("internal", "Could not allocate a code, try again.");
    }
    const expiresAt = firestore_2.Timestamp.fromMillis(Date.now() + 24 * 60 * 60 * 1000);
    await tRef.set({ linkCode: code, linkCodeExpiresAt: expiresAt }, { merge: true });
    await db.collection("auditLogs").add({
        action: "therapist.link_code",
        actorId: request.auth.uid,
        byUid: request.auth.uid,
        detail: { therapistId }, // never the code itself
        at: firestore_2.FieldValue.serverTimestamp(),
    });
    return { ok: true, code, expiresAtMs: expiresAt.toMillis() };
});
// 🆕 Round 28x.72 — a one-time code to claim the job board.
//
//   Anyone can add a public bot to their own Telegram group. Without proof of
//   authority, "/setjobchannel" there would silently redirect every unassigned
//   job — zone, time, price — to a stranger's group. Same one-time-code shape
//   as the practitioner link codes.
// ─────────────────────────────────────────────────────────────
// 🆕 Round 28x.74 (founder: "My Bookings ก็ไม่ใช่งานของตัวเอง · ต้องกดทางเข้า
//   Practitioner อีก") — accept/decline a job from the web app.
//
//   Mirrors the Telegram button. It's a callable rather than a client write
//   because therapistBookingEditableKeys() in firestore.rules doesn't include
//   therapistResponse, and widening that whitelist would let a practitioner
//   write the field on any booking the rules let her read. Here the server
//   checks she is the assigned practitioner and nobody else.
exports.respondToJob = (0, https_1.onCall)({ region: "asia-southeast1" }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "Sign in required.");
    }
    const uid = request.auth.uid;
    const data = request.data;
    const bookingId = String(data?.bookingId ?? "").trim();
    const action = String(data?.action ?? "").trim();
    if (!bookingId || (action !== "accept" && action !== "decline")) {
        throw new https_1.HttpsError("invalid-argument", "bookingId and action required.");
    }
    const db = (0, firestore_2.getFirestore)();
    const ref = db.collection("bookings").doc(bookingId);
    const snap = await ref.get();
    if (!snap.exists) {
        throw new https_1.HttpsError("not-found", "Booking not found.");
    }
    const b = snap.data();
    if (b.therapistUid !== uid) {
        throw new https_1.HttpsError("permission-denied", "This job isn't assigned to you.");
    }
    if (b.status === "cancelled" || b.status === "canceled") {
        throw new https_1.HttpsError("failed-precondition", "This job was cancelled.");
    }
    if (b.therapistResponse) {
        // Idempotent, same as the Telegram path — report, don't overwrite.
        return { ok: true, already: true, response: b.therapistResponse };
    }
    const accepted = action === "accept";
    await ref.update({
        therapistResponse: accepted ? "accepted" : "declined",
        therapistRespondedAt: firestore_2.FieldValue.serverTimestamp(),
        ...(accepted
            ? {}
            : {
                needsAdminReview: true,
                reviewReason: b.reviewReason
                    ? `${b.reviewReason} · หมอนวดกดไม่รับงาน`
                    : "หมอนวดกดไม่รับงาน",
            }),
    });
    // Same admin-group notice as the Telegram route, so View sees one stream
    // regardless of which surface the practitioner used.
    const token = TELEGRAM_BOT_TOKEN.value();
    if (token) {
        const who = b.therapistName ?? "หมอนวด";
        const refCode = `SR-${bookingId.slice(0, 8).toUpperCase()}`;
        await sendTelegramIfEnabled(token, TELEGRAM_CHAT_ID, accepted
            ? `✅ ${who} รับงานแล้ว (จากแอป) · ${refCode} · ${b.date ?? ""} ${b.time ?? ""}`
            : `⚠️ ${who} กดไม่รับงาน (จากแอป) · ${refCode} · ${b.date ?? ""} ${b.time ?? ""}\nต้องจ่ายงานให้คนอื่น`);
    }
    v2_1.logger.info("[respondToJob] recorded", { bookingId, action, uid });
    return { ok: true, already: false, response: accepted ? "accepted" : "declined" };
});
exports.createJobChannelCode = (0, https_1.onCall)({ region: "asia-southeast1" }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "Sign in required.");
    }
    const db = (0, firestore_2.getFirestore)();
    if (!(await db.collection("admins").doc(request.auth.uid).get()).exists) {
        throw new https_1.HttpsError("permission-denied", "Admin only.");
    }
    const code = makeLinkCode();
    const expiresAt = firestore_2.Timestamp.fromMillis(Date.now() + 60 * 60 * 1000); // 1h
    await db
        .collection("adminSettings")
        .doc("advanced")
        .set({ jobChannelCode: code, jobChannelCodeExpiresAt: expiresAt }, { merge: true });
    await db.collection("auditLogs").add({
        action: "settings.update",
        actorId: request.auth.uid,
        detail: { what: "jobChannelCode issued" },
        at: firestore_2.FieldValue.serverTimestamp(),
    });
    return { ok: true, code, expiresAtMs: expiresAt.toMillis() };
});
// 🆕 28x.81 — companion to createJobChannelCode, same code-gate pattern, but
//   grants admin order-paste access on @SunRed24hBot instead of claiming the
//   job board.
exports.createAdminLinkCode = (0, https_1.onCall)({ region: "asia-southeast1" }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "Sign in required.");
    }
    const db = (0, firestore_2.getFirestore)();
    if (!(await db.collection("admins").doc(request.auth.uid).get()).exists) {
        throw new https_1.HttpsError("permission-denied", "Admin only.");
    }
    const code = makeLinkCode();
    const expiresAt = firestore_2.Timestamp.fromMillis(Date.now() + 60 * 60 * 1000); // 1h
    await db
        .collection("adminSettings")
        .doc("advanced")
        .set({ adminLinkCode: code, adminLinkCodeExpiresAt: expiresAt }, { merge: true });
    await db.collection("auditLogs").add({
        action: "settings.update",
        actorId: request.auth.uid,
        detail: { what: "adminLinkCode issued" },
        at: firestore_2.FieldValue.serverTimestamp(),
    });
    return { ok: true, code, expiresAtMs: expiresAt.toMillis() };
});
exports.backfillTherapistUids = (0, https_1.onCall)({ region: "asia-southeast1", timeoutSeconds: 540 }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "Sign in required.");
    }
    const db = (0, firestore_2.getFirestore)();
    if (!(await db.collection("admins").doc(request.auth.uid).get()).exists) {
        throw new https_1.HttpsError("permission-denied", "Admin only.");
    }
    // Resolve every therapist's uid once, rather than per booking.
    const uidByTherapist = new Map();
    const therapists = await db.collection("therapists").get();
    for (const t of therapists.docs) {
        const d = t.data();
        let uid = typeof d.uid === "string" && d.uid ? d.uid : null;
        if (!uid && d.email) {
            try {
                uid = (await (0, auth_1.getAuth)().getUserByEmail(d.email.trim())).uid;
                await t.ref.set({ uid }, { merge: true }); // self-heal the doc
            }
            catch {
                uid = null; // no login for this practitioner yet
            }
        }
        if (uid)
            uidByTherapist.set(t.id, uid);
    }
    const bookings = await db.collection("bookings").get();
    let stamped = 0;
    let skipped = 0;
    let batch = db.batch();
    let inBatch = 0;
    for (const b of bookings.docs) {
        const d = b.data();
        const want = d.therapistId ? uidByTherapist.get(d.therapistId) : undefined;
        if (!want || d.therapistUid === want) {
            skipped++;
            continue;
        }
        batch.update(b.ref, { therapistUid: want });
        stamped++;
        inBatch++;
        if (inBatch >= 400) { // Firestore caps a batch at 500 writes
            await batch.commit();
            batch = db.batch();
            inBatch = 0;
        }
    }
    if (inBatch > 0)
        await batch.commit();
    v2_1.logger.info("[backfillTherapistUids] done", {
        stamped,
        skipped,
        linkedTherapists: uidByTherapist.size,
    });
    return {
        ok: true,
        stamped,
        skipped,
        therapistsWithLogin: uidByTherapist.size,
        therapistsTotal: therapists.size,
    };
});
exports.getBookingPublic = (0, https_1.onCall)({ region: "asia-southeast1" }, async (request) => {
    const data = request.data;
    const bookingId = String(data?.bookingId ?? "").trim();
    const token = String(data?.token ?? "").trim();
    if (!bookingId) {
        throw new https_1.HttpsError("invalid-argument", "bookingId is required.");
    }
    const db = (0, firestore_2.getFirestore)();
    const snap = await db.collection("bookings").doc(bookingId).get();
    if (!snap.exists) {
        // Same code AND message as a bad token below — a distinguishable
        // "not-found" would confirm which booking ids are real to anyone
        // probing, which is exactly the enumeration this round closed.
        throw new https_1.HttpsError("permission-denied", "Booking not found.");
    }
    const b = snap.data();
    const uid = request.auth?.uid ?? null;
    const storedToken = typeof b.accessToken === "string" ? b.accessToken.trim() : "";
    const tokenOk = storedToken.length > 0 && token === storedToken;
    const ownerOk = uid != null && b.userId === uid;
    let adminOk = false;
    if (!tokenOk && !ownerOk && uid) {
        adminOk = (await db.collection("admins").doc(uid).get()).exists;
    }
    if (!tokenOk && !ownerOk && !adminOk) {
        // Same error whether the id is wrong or the token is wrong — a
        // different message would let someone enumerate valid booking ids.
        throw new https_1.HttpsError("permission-denied", "Booking not found.");
    }
    return {
        ok: true,
        booking: {
            serviceId: b.serviceId ?? null,
            serviceName: b.serviceName ?? null,
            servicePrice: b.servicePrice ?? null,
            originalPrice: b.originalPrice ?? null,
            totalPrice: b.totalPrice ?? null,
            discountCode: b.discountCode ?? null,
            discountAmount: b.discountAmount ?? null,
            savingsTotal: b.savingsTotal ?? null,
            duration: b.duration ?? null,
            therapistId: b.therapistId ?? null,
            therapistName: b.therapistName ?? null,
            // The guest typed these themselves — showing them back is the point
            // of a confirmation screen.
            address: b.address ?? null,
            locationName: b.locationName ?? null,
            holdState: b.holdState ?? null,
            // Timestamps → epoch ms, so the callable's JSON survives the wire.
            startAt: b.startAt instanceof firestore_2.Timestamp
                ? b.startAt.toMillis()
                : (b.startAt ?? null),
            holdExpiresAt: b.holdExpiresAt instanceof firestore_2.Timestamp
                ? b.holdExpiresAt.toMillis()
                : (b.holdExpiresAt ?? null),
        },
    };
});
exports.createAdminAccount = (0, https_1.onCall)({ region: "asia-southeast1" }, async (request) => {
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
    const handle = String(data?.username ?? "").trim().toLowerCase();
    const password = String(data?.password ?? "");
    const name = String(data?.name ?? "").trim();
    // Same shape the client's resolveLoginId will parse back into an alias.
    if (!/^[a-z][a-z0-9._-]{2,19}$/.test(handle)) {
        throw new https_1.HttpsError("invalid-argument", "Username: 3-20 characters, must start with a letter, and may contain only letters, numbers, . _ -");
    }
    // A member-code-shaped handle would defeat the whole point of this function.
    if (handle.startsWith("srd-") || handle.startsWith("srd")) {
        throw new https_1.HttpsError("invalid-argument", "Don't use a member-code style username (SRD-…) for an admin account.");
    }
    // Reject the failure mode this round exists to prevent: a phone number, or
    // anything else a stranger could read off the website, as the password.
    if (password.length < 10) {
        throw new https_1.HttpsError("invalid-argument", "Password must be at least 10 characters.");
    }
    if (/^\d+$/.test(password)) {
        throw new https_1.HttpsError("invalid-argument", "Password must not be digits only — a phone number is guessable.");
    }
    if (password.toLowerCase().includes(handle)) {
        throw new https_1.HttpsError("invalid-argument", "Password must not contain the username.");
    }
    const authEmail = `${handle}@${USERNAME_ALIAS_DOMAIN}`;
    let uid;
    try {
        const rec = await (0, auth_1.getAuth)().createUser({
            email: authEmail,
            password,
            ...(name ? { displayName: name } : {}),
        });
        uid = rec.uid;
    }
    catch (err) {
        const errCode = err.code;
        if (errCode === "auth/email-already-exists") {
            throw new https_1.HttpsError("already-exists", "This username is already taken.");
        }
        throw err;
    }
    // Both sides of admin identity, same as setMemberAdmin.
    await db.collection("users").doc(uid).set({
        username: handle,
        loginKind: "username",
        role: "admin",
        ...(name ? { displayName: name } : {}),
        createdAt: firestore_2.FieldValue.serverTimestamp(),
    }, { merge: true });
    await db.collection("admins").doc(uid).set({ grantedBy: callerUid, grantedAt: firestore_2.FieldValue.serverTimestamp(), username: handle }, { merge: true });
    await db.collection("auditLogs").add({
        action: "user.admin_created",
        actorId: callerUid,
        byUid: callerUid,
        targetUid: uid,
        detail: { username: handle }, // never the password
        at: firestore_2.FieldValue.serverTimestamp(),
    });
    v2_1.logger.info("[createAdminAccount] created", { targetUid: uid, byUid: callerUid });
    return { ok: true, uid, username: handle };
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
// ─────────────────────────────────────────────────────────────
// 🆕 Round 28x.66 — stamp `therapistUid` onto a booking.
//
//   firestore.rules can only compare uid to uid. A booking stores the
//   therapist's DOC id ("XingXingSunRed"), so the old rule
//   `therapistId == request.auth.uid` never matched and a practitioner could
//   not read her own jobs — proven by tests/rules.test.mjs.
//
//   Resolving the doc id inside the rule would need a get() per document
//   scanned, which a list query blows past. So the uid is denormalised onto
//   the booking here, server-side, where it can't be forged: this runs on
//   create and on every reassignment.
async function stampTherapistUid(bookingId, therapistId) {
    const db = (0, firestore_2.getFirestore)();
    try {
        if (!therapistId) {
            await db.collection("bookings").doc(bookingId).update({
                therapistUid: firestore_2.FieldValue.delete(),
            });
            return;
        }
        const tSnap = await db.collection("therapists").doc(therapistId).get();
        const t = tSnap.data();
        let uid = typeof t?.uid === "string" && t.uid ? t.uid : null;
        // 🆕 28x.67 — none of the 14 therapist docs carries a `uid`, even though
        //   their logins exist: TherapistProfilePage resolves the profile by EMAIL,
        //   so nothing ever needed the field and nothing ever wrote it. The rules,
        //   however, can only compare uid to uid — so without this the whole chain
        //   dead-ends and every practitioner sees an empty job list.
        //
        //   Resolve through Auth by email and write it back, so this self-heals
        //   once per practitioner instead of needing a migration.
        if (!uid && t?.email) {
            try {
                const authUser = await (0, auth_1.getAuth)().getUserByEmail(t.email.trim());
                uid = authUser.uid;
                await db
                    .collection("therapists")
                    .doc(therapistId)
                    .set({ uid }, { merge: true });
                v2_1.logger.info("[stampTherapistUid] linked therapist to login", {
                    therapistId,
                    uid,
                });
            }
            catch {
                // No account for that email yet — she simply has no access, which is
                // the correct default. Not an error worth alerting on.
                v2_1.logger.info("[stampTherapistUid] no login for therapist", {
                    therapistId,
                });
            }
        }
        await db
            .collection("bookings")
            .doc(bookingId)
            .update({
            // A practitioner with no linked login yet simply has no uid stamped;
            // she sees nothing rather than everything.
            therapistUid: uid ?? firestore_2.FieldValue.delete(),
        });
    }
    catch (err) {
        v2_1.logger.error("[stampTherapistUid] failed", { bookingId, therapistId, err });
    }
}
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
    // 🆕 28x.66 — keep therapistUid in step with a reassignment, BEFORE the
    //   early return below. Reassigning a job must also move who can read it:
    //   the previous practitioner keeps the guest's address otherwise.
    if (idChanged) {
        await stampTherapistUid(event.params.bookingId, after.therapistId);
    }
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