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
exports.syncTherapistDailyCount = exports.onTherapistBonusChange = exports.onBookingCancelledStrikeTelegram = exports.onBookingWriteSyncStats = exports.onBookingDispatchChange = exports.syncTherapistBusyStatus = exports.createAdminAccount = exports.getBookingPublic = exports.backfillTherapistUids = exports.getTelegramBotCopyPreview = exports.createAdminLinkCode = exports.createReportChannelCode = exports.createJobChannelCode = exports.getJobGuestTier = exports.advanceJobStatus = exports.respondToJob = exports.resetTherapistPassword = exports.createTherapistAccount = exports.createTherapistLinkCode = exports.setMemberAdmin = exports.createCustomerAccount = exports.resetCustomerPassword = exports.telegramConciergeWebhook = exports.postToChannelManual = exports.scheduledChannelLate = exports.scheduledChannelPrime = exports.scheduledChannelEvening = exports.telegramWebhook = exports.recoverAbandonedBookings = exports.dailyAdminDigest = exports.alertOverdueSessions = exports.releaseExpiredHolds = exports.onBookingCreate = exports.notifyPayoutAccountChanged = exports.notifyGalleryRequest = exports.onTherapistUpdate = exports.syncAdminClaim = exports.setRoleOnSignup = exports.moderateText = exports.onReviewCreate = exports.notifyBooking = void 0;
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
// 🆕 Round 28x.95 — pure content lookups for getTelegramBotCopyPreview.
//   Importing the SAME functions the bots use to render outbound
//   messages (not a hand-copied mirror) so the admin-panel preview can
//   never silently drift the way the FAQ pricing block once did (28x.82).
const greetings_1 = require("./telegram-concierge-bot/greetings");
const faq_1 = require("./telegram-concierge-bot/faq");
const templates_1 = require("./telegram-post-bot/templates");
(0, app_1.initializeApp)();
// 🔑 Secrets
const TELEGRAM_BOT_TOKEN = (0, params_1.defineSecret)("TELEGRAM_BOT_TOKEN");
const OPENAI_API_KEY = (0, params_1.defineSecret)("OPENAI_API_KEY");
// 🆕 Round 28x.107 — shared secret proving a POST to telegramWebhook really
//   came from Telegram. Telegram echoes it back in the
//   X-Telegram-Bot-Api-Secret-Token header on every update, but ONLY if it
//   was registered via setWebhook({secret_token}). See scripts/setTelegramWebhook.mjs.
const TELEGRAM_WEBHOOK_SECRET = (0, params_1.defineSecret)("TELEGRAM_WEBHOOK_SECRET");
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
//
//   🆕 Round 28x.86 (founder: linked Yuri/Vivian/Nicky's Telegram tonight,
//   then asked to re-test dispatch on a real booking) — XingXing's pilot
//   proved out, so the three practitioners just onboarded join the trial.
const THERAPIST_DM_PILOT = [
    "XingXingSunRed",
    "YuriSunRed",
    "VivianSunRed",
    "NickySunRed",
];
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
/**
 * 🆕 Round 28x.132 — pull the message_id out of a Telegram sendMessage reply.
 *
 * `sendTelegram` hands back the raw response body as a string, and until now
 * nothing read it: the id was written to `telegramLogs` only as part of a
 * truncated blob. Without the id the bot cannot address a message it sent, so
 * "mark this order cancelled in the channel" was impossible — not because of
 * any Telegram limit, but because we never remembered which message it was.
 */
function extractMessageId(body) {
    try {
        const parsed = JSON.parse(body);
        return typeof parsed.result?.message_id === "number" ? parsed.result.message_id : null;
    }
    catch {
        // Defensive: a truncated / non-JSON body still usually carries the id.
        const m = /"message_id"\s*:\s*(\d+)/.exec(body);
        return m ? Number(m[1]) : null;
    }
}
/** Telegram HTML parse-mode requires exactly these three to be escaped. */
function escapeTelegramHtml(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
/**
 * 🆕 Round 28x.132 (founder: "ถ้ายกเลิก แล้วแอดมินกดยกเลิกออเดอร์ บอทจะลบ
 * ออเดอร์ที่ส่งมาด้วยได้ไหม" → chose strike-through over deletion).
 *
 * Rewrites an already-posted message in place as a cancelled one. Deliberately
 * NOT deleteMessage: the Booking channel is the shop's own record, and a
 * vanished card loses the fact that the order ever existed — worse if a
 * practitioner already read it. Telegram also refuses to delete messages past a
 * certain age, so "cancel three days later" would fail silently, which is the
 * one failure mode an operator must never be handed.
 *
 * Sent messages are plain text, so this switches the message to HTML mode and
 * escapes the body before wrapping it in <s>.
 */
async function markTelegramMessageCancelled(token, chatId, messageId, originalText) {
    const text = "❌ ยกเลิกแล้ว · CANCELLED\n" +
        `<s>${escapeTelegramHtml(originalText).slice(0, 3800)}</s>`;
    try {
        const res = await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                chat_id: chatId,
                message_id: messageId,
                text,
                parse_mode: "HTML",
                disable_web_page_preview: true,
            }),
        });
        const body = await res.text().catch(() => "");
        if (!res.ok) {
            v2_1.logger.warn("[markTelegramMessageCancelled] edit rejected", { messageId, body: body.slice(0, 300) });
            return false;
        }
        return true;
    }
    catch (err) {
        v2_1.logger.error("[markTelegramMessageCancelled] fetch failed", { messageId, err });
        return false;
    }
}
// 🆕 Round 28x.124 (founder: "ถึงแล้ว — ให้พนักงานถ่ายรูปจุดที่รอลูกค้า ... บอท
//   จะแจ้งเจ้าของว่าพนักงานถึงแล้ว พร้อมรูปจุดรอพบ") — sendPhoto, so the
//   arrival proof lands in the Report channel as an actual image with the
//   status line as its caption, instead of a bare link View has to tap.
//   `photoUrl` is a Firebase Storage download URL: its token grants Telegram's
//   servers access without the object being publicly listable (see
//   storage.rules' jobArrivals path). Falls back to a plain text message with
//   the link if sendPhoto fails, so a photo problem can never swallow the
//   "she has arrived" notice itself.
async function sendTelegramPhotoIfEnabled(token, chatId, photoUrl, caption) {
    if (!(await isTelegramEnabled())) {
        v2_1.logger.info("[sendTelegramPhotoIfEnabled] skipped — telegramEnabled=false");
        return;
    }
    try {
        const res = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                chat_id: chatId,
                photo: photoUrl,
                caption: caption.slice(0, 1024),
            }),
        });
        if (res.ok)
            return;
        v2_1.logger.warn("[sendTelegramPhotoIfEnabled] sendPhoto failed, falling back", {
            status: res.status,
            body: (await res.text()).slice(0, 300),
        });
    }
    catch (err) {
        v2_1.logger.warn("[sendTelegramPhotoIfEnabled] sendPhoto threw, falling back", { err });
    }
    await sendTelegram(token, chatId, `${caption}\n${photoUrl}`);
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
    const { ok, body } = await sendTelegramIfEnabled(token, await getReportChatId(), message);
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
        // 🆕 Round 28x.107 — the claim now carries `tid` (the therapist DOC id)
        //   alongside `role`. storage.rules can't do a cross-service Firestore
        //   read (28s281 proved that path silently denies), so the ONLY way a
        //   Storage rule can tell "this practitioner owns therapists/{id}/" is
        //   for the id to travel inside the token itself.
        await auth.setCustomUserClaims(uid, {
            role,
            ...(linkedTherapistId ? { tid: linkedTherapistId } : {}),
        });
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
// ─────────────────────────────────────────────────────────────
// 🆕 Round 28x.107 (founder security audit: "เว็บเรา มีการป้องกันอะไรบ้าง
//   หากถูกเจาะ หรือโจมตี") — keep the `role` custom claim in lockstep with
//   the /admins collection.
//
//   WHY THIS EXISTS: setRoleOnSignup above only fires ONCE, at account
//   creation. Every other path that grants or revokes admin — setMemberAdmin,
//   createAdminAccount, a hand edit in the Firebase console — wrote the
//   /admins doc and stopped there, leaving the token stuck on whatever role
//   the account was born with. That was survivable while nothing READ the
//   claim. It stops being survivable in this round, because storage.rules now
//   gates every write on it: a founder whose token still says "customer"
//   would be locked out of her own photo uploads.
//
//   A trigger on the doc (not a call inside each writer) is the point — it
//   can't be bypassed by a future code path that forgets to call it, and it
//   covers manual console edits, which no callable ever will.
//
//   Demotion is careful: losing admin must NOT clobber a practitioner's
//   therapist role, so we re-derive from the therapists collection instead of
//   blindly stamping "customer".
exports.syncAdminClaim = (0, firestore_1.onDocumentWritten)({ document: "admins/{uid}", region: "asia-southeast1" }, async (event) => {
    const uid = event.params.uid;
    const isAdminNow = event.data?.after?.exists ?? false;
    const wasAdmin = event.data?.before?.exists ?? false;
    if (isAdminNow === wasAdmin)
        return; // field-only edit, role unchanged
    const auth = (0, auth_1.getAuth)();
    const db = (0, firestore_2.getFirestore)();
    const user = await auth.getUser(uid).catch(() => null);
    if (!user) {
        v2_1.logger.warn("[syncAdminClaim] no auth user for uid", { uid });
        return;
    }
    const existing = (user.customClaims ?? {});
    let role;
    let tid = existing.tid;
    if (isAdminNow) {
        role = "admin";
    }
    else {
        // Demoted — is this account still a practitioner login?
        const asTherapist = await db
            .collection("therapists")
            .where("uid", "==", uid)
            .limit(1)
            .get();
        if (!asTherapist.empty) {
            role = "therapist";
            tid = asTherapist.docs[0].id;
        }
        else {
            role = "customer";
            tid = undefined;
        }
    }
    await auth.setCustomUserClaims(uid, {
        ...existing,
        role,
        ...(tid ? { tid } : { tid: null }),
    });
    // The client holds a cached ID token for up to an hour. Bump a marker the
    // app watches so it can force a refresh immediately instead of the admin
    // wondering why uploads still fail for the next 59 minutes.
    await db.collection("users").doc(uid).set({ role: role === "customer" ? "user" : role, claimsUpdatedAt: firestore_2.FieldValue.serverTimestamp() }, { merge: true });
    v2_1.logger.info("[syncAdminClaim] claim synced", { uid, role, tid: tid ?? null });
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
    // 🆕 28x.122 — StaffLayout's presence heartbeat. Must stay ignored or every
    //   therapist with the app open would emit an audit row (and, since 28x.122,
    //   a Telegram staff-activity message) every few minutes.
    "lastSeenAt",
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
    // 🆕 28x.133 — written by recomputeTherapistSessionStats on every booking
    //   write; derived, not a human edit, so they must not spawn audit rows or
    //   staff-activity notices.
    "rebookRate",
    "rebookRateReal",
    "statsUpdatedAt",
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
// 🆕 Round 28x.122 (founder: "Telegram bot แจ้งเตือนทุกการกระทำของพนักงาน
//   เข้าหน้ารีพอต") — human-readable Thai labels for the therapist-doc fields
//   a practitioner can change herself. Only these are announced: a key with no
//   entry here is either admin-only (so not a "staff action") or already in
//   AUDIT_IGNORE_KEYS. Keep in sync with therapistEditableKeys() in
//   firestore.rules — if a new self-editable field is whitelisted there and
//   not added here, its edits go unannounced.
const STAFF_FIELD_LABELS = {
    statusOverride: "สถานะการทำงาน",
    isHoliday: "โหมดวันหยุด",
    startTime: "เวลาเริ่มงาน",
    endTime: "เวลาเลิกงาน",
    homeLocation: "ตำแหน่งที่ยืน",
    image: "รูปโปรไฟล์",
    gallery: "แกลเลอรี",
    features: "ลักษณะเฉพาะตัว",
    specialty: "ความถนัด",
    servicesAvailable: "บริการที่ทำได้",
    services: "บริการ",
    bios: "ประวัติแนะนำ",
    languageSkills: "ภาษา",
    telegramChatId: "การเชื่อม Telegram",
};
/** 🆕 Round 28x.127 (founder: "ให้แจ้ง 2 อันนี้ด้วย") — the gallery line used
 *  to render as the generic "แกลเลอรี: 9 รายการ", which tells View the count
 *  but not whether a photo was ADDED or DELETED. Removal is the case she
 *  actually wants to see (an upload already announces itself separately via
 *  notifyGalleryRequest, since new photos go through the approval queue and
 *  never touch this array directly — so in practice a `gallery` change here
 *  is almost always a deletion). */
function galleryChangeLine(before, after) {
    const b = Array.isArray(before) ? before.length : 0;
    const a = Array.isArray(after) ? after.length : 0;
    if (a < b)
        return `ลบรูป ${b - a} รูป · เหลือ ${a} รูป`;
    if (a > b)
        return `เพิ่มรูป ${a - b} รูป · รวม ${a} รูป`;
    return `${a} รูป (สลับลำดับ)`;
}
/** Compact, readable rendering of a changed value for the Telegram line. */
function staffChangeValue(v) {
    if (v === null || v === undefined || v === "")
        return "—";
    if (typeof v === "boolean")
        return v ? "เปิด" : "ปิด";
    if (Array.isArray(v))
        return `${v.length} รายการ`;
    if (typeof v === "object")
        return "อัปเดตแล้ว";
    const s = String(v);
    return s.length > 40 ? `${s.slice(0, 40)}…` : s;
}
exports.onTherapistUpdate = (0, firestore_1.onDocumentUpdated)({
    document: "therapists/{therapistId}",
    region: "asia-southeast1",
    secrets: [TELEGRAM_BOT_TOKEN],
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
    // 🆕 Round 28x.122 — mirror SELF-edits to the admin Report channel.
    //   Scoped to self-edits on purpose: `updatedBy` is the acting uid and
    //   the doc's own `uid` is the practitioner's, so admin edits (made from
    //   the Control Room, where View already sees what she did) never echo
    //   back at her. Fields with no STAFF_FIELD_LABELS entry are skipped, so
    //   admin-only columns changed in the same write stay quiet too.
    try {
        const isSelfEdit = typeof updatedBy === "string" &&
            typeof after.uid === "string" &&
            updatedBy === after.uid;
        if (!isSelfEdit)
            return;
        const token = TELEGRAM_BOT_TOKEN.value();
        if (!token)
            return;
        const who = typeof after.name === "string" && after.name ? after.name : therapistId;
        // 🆕 Round 28x.127 (founder: "ให้แจ้ง 2 อันนี้ด้วย" — login + gallery
        //   deletion) — a sign-in is its own event, not a profile edit, so it
        //   gets its own message rather than being listed as a changed field.
        //   Written by LoginPage on a successful therapist sign-in. Note this is
        //   deliberately NOT the `lastSeenAt` heartbeat (which stays in
        //   AUDIT_IGNORE_KEYS): that fires every 5 minutes while the app is
        //   open, whereas this fires once, when she actually enters her password.
        if ("lastLoginAt" in changes) {
            await sendTelegramIfEnabled(token, await getReportChatId(), `🔓 ${who} เข้าสู่ระบบแอปพนักงานแล้ว`);
        }
        const announced = Object.keys(changes).filter((k) => k in STAFF_FIELD_LABELS);
        if (announced.length === 0)
            return;
        const lines = announced.map((k) => {
            const label = STAFF_FIELD_LABELS[k];
            const to = k === "gallery"
                ? galleryChangeLine(before.gallery, after.gallery)
                : staffChangeValue(changes[k].after);
            return `• ${label}: ${to}`;
        });
        await sendTelegramIfEnabled(token, await getReportChatId(), `👩‍⚕️ ${who} แก้ไขข้อมูลตัวเอง (จากแอปพนักงาน)\n${lines.join("\n")}`);
    }
    catch (err) {
        // Never let the notifier break the audit write above.
        v2_1.logger.error("[onTherapistUpdate] staff-activity notify failed", { therapistId, err });
    }
});
// 🆕 Round 28x.122 (founder: "Telegram bot แจ้งเตือนทุกการกระทำของพนักงาน") —
//   a gallery upload never touches the therapist doc (28x.96 routed new photos
//   through the galleryRequests moderation queue instead), so it would be
//   invisible to onTherapistUpdate's staff-activity feed. This is that gap:
//   announce the request the moment she files it, so View knows there's
//   something waiting at /admin/staff-requests without opening the panel.
exports.notifyGalleryRequest = (0, firestore_1.onDocumentCreated)({
    document: "galleryRequests/{requestId}",
    region: "asia-southeast1",
    secrets: [TELEGRAM_BOT_TOKEN],
}, async (event) => {
    const d = event.data?.data();
    if (!d || d.status !== "pending")
        return;
    const token = TELEGRAM_BOT_TOKEN.value();
    if (!token)
        return;
    const who = d.therapistName ?? d.therapistDocId ?? "หมอนวด";
    try {
        await sendTelegramIfEnabled(token, await getReportChatId(), `🖼 ${who} ส่งรูปใหม่เข้าแกลเลอรี (รออนุมัติ)\nตรวจได้ที่ /admin/staff-requests`);
    }
    catch (err) {
        v2_1.logger.error("[notifyGalleryRequest] failed", { err });
    }
});
function maskBankAccount(acc) {
    if (!acc)
        return "—";
    return acc.length > 4 ? `••••${acc.slice(-4)}` : acc;
}
exports.notifyPayoutAccountChanged = (0, firestore_1.onDocumentWritten)({
    document: "payoutAccounts/{therapistId}",
    region: "asia-southeast1",
    secrets: [TELEGRAM_BOT_TOKEN],
}, async (event) => {
    const before = event.data?.before?.exists ? event.data.before.data() : null;
    const after = event.data?.after?.exists ? event.data.after.data() : null;
    if (!after)
        return; // deletion — admin-only per firestore.rules, no alert needed
    if (before &&
        before.bankName === after.bankName &&
        before.bankAccount === after.bankAccount &&
        before.bankAccountName === after.bankAccountName) {
        return; // only bookkeeping fields (updatedAt/updatedBy) changed
    }
    const token = TELEGRAM_BOT_TOKEN.value();
    if (!token) {
        v2_1.logger.error("[notifyPayoutAccountChanged] missing token");
        return;
    }
    const therapistId = event.params.therapistId;
    let therapistName = therapistId;
    try {
        const tSnap = await (0, firestore_2.getFirestore)().collection("therapists").doc(therapistId).get();
        if (tSnap.exists)
            therapistName = tSnap.data()?.name || therapistId;
    }
    catch {
        // best-effort — fall back to the raw id
    }
    const text = [
        `🏦 บัญชีธนาคารเปลี่ยน · ${therapistName}`,
        "",
        `${before ? "แก้ไขเป็น" : "ตั้งค่าใหม่"}: ${after.bankName ?? "—"} · ${maskBankAccount(after.bankAccount)}`,
        `ชื่อบัญชี: ${after.bankAccountName ?? "—"}`,
        before ? `เดิม: ${before.bankName ?? "—"} · ${maskBankAccount(before.bankAccount)}` : null,
        "",
        "ถ้าไม่ใช่คุณสั่งเอง ให้ตรวจสอบด่วน",
    ]
        .filter((line) => line !== null)
        .join("\n");
    await sendTelegramIfEnabled(token, await getReportChatId(), text);
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
// ─────────────────────────────────────────────────────────────
// Customer history / membership line — 3rd admin follow-up message
// (Round 28x.99l, founder: "ลูกค้าคนนี้ เป็นลูกค้าใหม่หรือมีประวัติ...
// ถ้ามีประวัติหรือสมาชิก อยู่เลเวลอะไร").
//
// ⚠️ Threshold values are a DUPLICATE of MEMBERSHIP_DEFAULTS in
// src/utils/membership.ts — functions/ has its own tsconfig rootDir
// ("src") so it can't import across into the frontend's src/. If tiers
// change there, update the numbers below too (same manual-sync burden
// already documented for pricing in CLAUDE.md §2 — same class of drift
// risk, not a new one). This mirrors the SIMPLE case only (visits OR
// spend, no demotion, no live adminSettings/membership override) — good
// enough for an informational Telegram line, not a billing calculation.
// ─────────────────────────────────────────────────────────────
const HISTORY_SERVED = new Set(["completed", "done"]);
const HISTORY_NOSHOW = new Set(["no_show", "no-show", "noshow"]);
const HISTORY_TIER_THRESHOLDS = [
    { emoji: "⚫", label: "Black VIP", visits: 12, spend: 40000 },
    { emoji: "🥇", label: "Gold", visits: 6, spend: 15000 },
    { emoji: "🥈", label: "Silver", visits: 3, spend: 6000 },
    { emoji: "🥉", label: "Bronze", visits: 1, spend: 1000 },
];
/** Mirrors src/utils/phoneCountry.ts normPhone() — must stay identical. */
function normPhoneForHistory(raw) {
    const digits = raw.replace(/\D/g, "");
    if (digits.startsWith("66") && digits.length >= 11)
        return "0" + digits.slice(2);
    return digits;
}
async function customerHistoryLine(phone, excludeBookingId) {
    const target = normPhoneForHistory((phone ?? "").trim());
    if (!target)
        return null;
    // Full-collection scan, matching AdminBookingListPage's own customer-
    // stats pass exactly (same phone-format inconsistency problem — stored
    // numbers mix +66/0-prefix/raw — so a targeted `where("phone","==",…)`
    // query would silently under-count). Acceptable cost at this business's
    // scale; the admin dashboard already does this same full scan on every
    // page load, more often than "once per new booking".
    let served = 0;
    let totalSpent = 0;
    let lastVisitMs = 0;
    let noShowCount = 0;
    try {
        const snap = await (0, firestore_2.getFirestore)().collection("bookings").get();
        snap.forEach((d) => {
            if (d.id === excludeBookingId)
                return; // history BEFORE this booking
            const bk = d.data();
            if (normPhoneForHistory((bk.phone ?? "").trim()) !== target)
                return;
            const st = bk.status ?? "";
            if (HISTORY_NOSHOW.has(st))
                noShowCount++;
            if (HISTORY_SERVED.has(st)) {
                served++;
                totalSpent += bk.totalPrice ?? bk.servicePrice ?? 0;
                const t = bk.createdAt ?? bk.startAt;
                const ms = t?.toMillis ? t.toMillis() : 0;
                if (ms > lastVisitMs)
                    lastVisitMs = ms;
            }
        });
    }
    catch (err) {
        v2_1.logger.error("[customerHistoryLine] scan failed", err);
        return null;
    }
    if (served === 0) {
        return `👤 Customer history\n🆕 New customer — first booking with SunRed`;
    }
    const tier = HISTORY_TIER_THRESHOLDS.find((t) => served >= t.visits || totalSpent >= t.spend);
    const tierLine = tier ? `\n${tier.emoji} ${tier.label} member` : "";
    const noShowLine = noShowCount > 0 ? `\n⚠️ ${noShowCount} prior no-show` : "";
    return (`👤 Customer history\n` +
        `🔁 Returning · ${served} visit${served === 1 ? "" : "s"} · ฿${totalSpent.toLocaleString()} total` +
        tierLine +
        noShowLine);
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
    // Address: just the POI/place name — no more.
    // 🆕 28x.86 (founder: "Address ยาวมาก บอกหมด เกิน เอาแค่ชื่อ แต่ Map จริง") —
    //   28x.68 appended the full street address whenever it differed from the
    //   place name (to show both "Rosewood Bangkok" and the road), which for
    //   a Google-Places-picked address meant the full formatted address —
    //   soi, khwaeng, khet, postal code, country — got dumped into the chat
    //   in full ("Somerset Sukhumvit Thonglor Bangkok, No 115 Sukhumvit, 55
    //   ถ. ทองหล่อ แขวงคลองตันเหนือ เขตวัฒนา กรุงเทพมหานคร 10110, Thailand").
    //   Dropped the append entirely — the Map link below still resolves to
    //   the real, precise location regardless of how short this line is.
    const place = b.locationName?.trim() || b.address?.trim() || "—";
    const addressLine = place;
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
        b.discountAmount && b.discountAmount > 0
            ? `🎟️ Discount: -${b.discountAmount.toLocaleString()} ฿${b.discountCode ? ` (${b.discountCode})` : ""}`
            : null,
        "",
        b.distanceKm
            ? `Distance: ${b.distanceKm.toFixed(1)} km  •  ${b.isLiveRoute ? "Live route" : "Estimated"}${b.etaMinutes ? `  •  ETA: ${b.etaMinutes} min` : ""}`
            : null,
        b.taxiSave && b.taxiSave > 0 && b.taxiOriginal != null
            ? `🚖 Taxi: ${(b.taxiFee ?? 0).toLocaleString()} ฿  (was ${b.taxiOriginal.toLocaleString()} ฿ · saved ${b.taxiSave.toLocaleString()} ฿ booking online)`
            : `🚖 Taxi: ${(b.taxiFee ?? 0).toLocaleString()} ฿`,
        // Payment method kept (cash vs WeChat/Alipay changes the operation).
        `💳 Payment: ${b.payment ?? "Cash"}`,
        b.paymentFee && b.paymentFee > 0
            ? `   ↳ incl. service charge ${b.paymentFee.toLocaleString()} ฿`
            : null,
        b.originalTotalPrice
            ? `💰 Total: ${(b.totalPrice ?? 0).toLocaleString()} ฿  (was ${b.originalTotalPrice.toLocaleString()} ฿)`
            : `💰 Total: ${(b.totalPrice ?? 0).toLocaleString()} ฿`,
        "",
        `📞 Phone: ${b.phone ?? "—"}`,
        `👤 Name: ${b.contactName ?? "—"}`,
        `Note: ${b.note?.trim() ? b.note.trim() : "-"}`,
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
const MONTH_ABBR = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** "2026-07-20" → "20 Jul". Falls back to the raw string on anything unexpected. */
function shortDate(iso) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso ?? "");
    if (!m)
        return iso ?? "—";
    const month = MONTH_ABBR[parseInt(m[2], 10) - 1] ?? m[2];
    return `${parseInt(m[3], 10)} ${month}`;
}
// 🆕 Round 28x.90 (founder, drafting off her own screenshots of this exact
//   flow) — rebuilt to mirror formatBookingForAdmin's field set once she has
//   accepted (Meeting point and Note existed for admin but never reached the
//   practitioner even after taking the job), and to pack price/duration/
//   payment onto one line pre-accept, CBODY-style, instead of three.
const formatBookingForTherapist = (bookingId, b, 
// 🆕 28x.69 — masked until she accepts. Before that a practitioner needs
//   enough to decide (what, when, roughly where, how much) and nothing more.
//   The guest's exact address, map pin and phone are the shop's to hold until
//   someone has actually taken the job — and a declined job must not leave a
//   guest's address sitting in a stranger's chat history forever.
masked = false) => {
    const refCode = `SR-${bookingId.slice(0, 8).toUpperCase()}`;
    const divider = "━━━━━━━━━━";
    if (masked) {
        const priceLine = `Duration: ${(b.servicePrice ?? 0).toLocaleString()}/${b.duration ?? "?"} min | ${(b.payment ?? "cash").toLowerCase()}`;
        return [
            `🔔 งานใหม่ · ${refCode}`,
            "",
            `Therapist: ${b.therapistName ?? "—"}`,
            `📅 ${shortDate(b.date)}  ⏰ ${b.time ?? "—"}`,
            divider,
            // 🆕 28x.69 — coarse district only (see coarseArea below), NOT the road/
            //   soi — a fragment that specific is most of the way to the real address.
            `📍 โซนทำงาน  ${coarseArea(b)}`,
            "",
            `Service: ${b.serviceName ?? "—"}`,
            priceLine,
            `🚖 Taxi: ${(b.taxiFee ?? 0).toLocaleString()} ฿`,
            divider,
            `กดปุ่มด้านล่างเพื่อตอบรับงานค่ะ · ตอบภายใน 5 นาที`,
            `📍 ที่อยู่เต็ม แผนที่ และเบอร์ลูกค้า`,
            `จะแสดงหลังกดรับงานค่ะ`,
        ].join("\n");
    }
    const place = b.locationName?.trim() || b.address?.trim() || "—";
    return [
        `✅ รับงานแล้ว · ${refCode}`,
        divider,
        `Therapist: ${b.therapistName ?? "—"}`,
        `Time: ${b.time ?? "—"}`,
        divider,
        `📍 Address: ${place}`,
        b.meetingPoint?.trim() ? `Meeting: 👉🏻 ${b.meetingPoint.trim()}` : null,
        "",
        `Service: ${b.serviceName ?? "—"}`,
        `Duration: ${b.duration ?? "?"} min`,
        `Price: ${(b.servicePrice ?? 0).toLocaleString()} ฿`,
        "",
        `🚖 Taxi: ${(b.taxiFee ?? 0).toLocaleString()} ฿`,
        `💳 Payment: ${b.payment ?? "Cash"}`,
        `💰 Total: ${(b.totalPrice ?? 0).toLocaleString()} ฿`,
        "",
        `📞 Phone: ${b.phone ?? "—"}`,
        `👤 Name: ${b.contactName ?? "—"}`,
        `Note: ${b.note?.trim() ? b.note.trim() : "-"}`,
    ]
        .filter((l) => l !== null)
        .join("\n");
};
/** Resolves the same place/mapUrl formatBookingForAdmin uses, for the map button. */
function therapistMapUrl(b) {
    const place = b.locationName?.trim() || b.address?.trim() || "";
    return (b.mapUrl?.trim() ||
        (place ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place)}` : ""));
}
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
    // 🆕 Round 28x.94 (founder: "ให้บอทส่ง Booking 1 ข้อความ และลูกค้ามาจาก
    //   ประเทศอะไร 🌐 Source: อีก 1 ข้อความ") — the source/country line used
    //   to be the last line of the booking card; now a separate follow-up
    //   message, same destination.
    // 🆕 Round 28x.132 — remember which channel messages belong to this
    //   booking, WITH their text, so a later cancellation can strike each one
    //   through as itself. All three go to the SAME channel, so a cancel that
    //   only touched the card would leave the Source and History follow-ups
    //   sitting there un-struck, reading as if the job were still on. Storing
    //   the text (not just the id) means the strike re-wraps the real message
    //   with no reconstruction or drift.
    const adminMsgs = [];
    const adminMsgId = extractMessageId(adminResult.body);
    if (adminMsgId)
        adminMsgs.push({ id: adminMsgId, text: adminText });
    const sourceLine = attributionLine(data);
    if (sourceLine) {
        const r = await sendTelegramIfEnabled(token, TELEGRAM_CHAT_ID, sourceLine);
        const id = extractMessageId(r.body);
        if (id)
            adminMsgs.push({ id, text: sourceLine });
    }
    // 🆕 Round 28x.99l (founder: "ส่งข้อความที่3 ไป SunRed Booking ว่าลูกค้า
    //   คนนี้ เป็นลูกค้าใหม่หรือมีประวัติ...ถ้ามีประวัติหรือสมาชิก อยู่เลเวล
    //   อะไร") — 3rd follow-up message: new vs. returning + membership tier.
    try {
        const historyLine = await customerHistoryLine(data.phone, bookingId);
        if (historyLine) {
            const r = await sendTelegramIfEnabled(token, TELEGRAM_CHAT_ID, historyLine);
            const id = extractMessageId(r.body);
            if (id)
                adminMsgs.push({ id, text: historyLine });
        }
    }
    catch (err) {
        // Never let a history-lookup failure block the booking notification
        // flow that already succeeded above.
        v2_1.logger.error("[onBookingCreate] customerHistoryLine failed", err);
    }
    // 🆕 28x.132 — persist the messages. Fire-and-forget style error handling:
    //   a booking that notified successfully must never be failed by a
    //   bookkeeping write, it just loses the ability to be struck through
    //   later. `telegramChatId` is stored too so the strike trigger targets
    //   the same channel this ran in without hardcoding it a second time.
    if (adminMsgs.length > 0) {
        try {
            await (0, firestore_2.getFirestore)().collection("bookings").doc(bookingId).update({
                telegramAdminMsgs: adminMsgs,
                telegramChatId: TELEGRAM_CHAT_ID,
            });
        }
        catch (err) {
            v2_1.logger.error("[onBookingCreate] telegramAdminMsgs write failed", err);
        }
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
        const r = await sendTelegramIfEnabled(token, await getReportChatId(), text);
        if (r.ok) {
            await d.ref.update({ overdueAlertedAt: firestore_2.FieldValue.serverTimestamp() });
            sent += 1;
        }
    }
    v2_1.logger.info("[alertOverdueSessions] sent", { sent });
});
// 🆕 Round 28x.87 (founder: "ให้บอทส่งรายงานประจำวันได้ไหม Funnel Analytics
//   กับ Bookings") — a once-daily digest into the same admin group,
//   covering the last 24h. Funnel numbers mirror AdminAnalyticsPage's own
//   method exactly (unique SESSIONS with home_view → unique sessions with
//   booking_complete, not raw event counts) so this never disagrees with
//   what View sees in the dashboard. Fires at 10:00 Bangkok — after the
//   prime-time (22:00-04:00) business night has wrapped and settled.
//
//   Scope note: this reads analytics_events + bookings directly, NOT the
//   Dashboard's own date-bucketed query — "last 24h" here vs. "today by
//   calendar date" there can disagree by a booking or two near midnight.
//   Good enough for a pulse-check digest; go to the Dashboard for the
//   authoritative number.
exports.dailyAdminDigest = (0, scheduler_1.onSchedule)({
    schedule: "0 10 * * *",
    region: "asia-southeast1",
    timeZone: "Asia/Bangkok",
    secrets: [TELEGRAM_BOT_TOKEN],
}, async () => {
    const db = (0, firestore_2.getFirestore)();
    const token = TELEGRAM_BOT_TOKEN.value();
    if (!token) {
        v2_1.logger.error("[dailyAdminDigest] missing token");
        return;
    }
    const cutoff = firestore_2.Timestamp.fromMillis(Date.now() - 24 * 60 * 60 * 1000);
    // ── Funnel (analytics_events, last 24h) ──────────────────────
    const eventsSnap = await db
        .collection("analytics_events")
        .where("ts", ">=", cutoff)
        .get();
    const eventCounts = {};
    const sessionsWithEvent = {};
    for (const doc of eventsSnap.docs) {
        const d = doc.data();
        const ev = d.event;
        if (!ev)
            continue;
        eventCounts[ev] = (eventCounts[ev] ?? 0) + 1;
        if (d.sid) {
            (sessionsWithEvent[ev] ?? (sessionsWithEvent[ev] = new Set())).add(d.sid);
        }
    }
    const sessionsHome = sessionsWithEvent.home_view?.size ?? 0;
    const sessionsBooked = sessionsWithEvent.booking_complete?.size ?? 0;
    const conversionRate = sessionsHome > 0 ? (sessionsBooked / sessionsHome) * 100 : 0;
    // ── Bookings created in the last 24h ──────────────────────────
    const bookingsSnap = await db
        .collection("bookings")
        .where("createdAt", ">=", cutoff)
        .get();
    // Same EXCLUDED set as the booking data model rule in CLAUDE.md §4.
    const EXCLUDED_STATUSES = new Set([
        "cancelled",
        "canceled",
        "refunded",
        "failed",
        "rejected",
        "no_show",
        "pending",
    ]);
    let totalBookings = 0;
    let cancelledCount = 0;
    let grossRevenue = 0;
    for (const doc of bookingsSnap.docs) {
        const b = doc.data();
        totalBookings += 1;
        const status = (b.status ?? "").toLowerCase();
        if (status === "cancelled" || status === "canceled")
            cancelledCount += 1;
        if (!EXCLUDED_STATUSES.has(status)) {
            grossRevenue += b.totalPrice ?? 0;
        }
    }
    const dateLabel = new Intl.DateTimeFormat("th-TH", {
        timeZone: "Asia/Bangkok",
        day: "numeric",
        month: "short",
        year: "numeric",
    }).format(new Date());
    // 🆕 28x.88 (founder: "เข้าไปเปลี่ยนข้อความเองที่ไหน") — header/footer are
    //   now admin-editable from SunRed Bot → Telegram Bot → Daily Digest
    //   (adminSettings/telegramBot). The data rows themselves stay
    //   code-generated — only the bookend copy is hers to write, so a typo
    //   in Firestore can't corrupt the numbers.
    let digestHeader = "📊 รายงานประจำวัน · SunRed";
    let digestFooter = "";
    try {
        const botSettingsSnap = await db.collection("adminSettings").doc("telegramBot").get();
        const bs = botSettingsSnap.data();
        if (bs?.dailyDigestHeader)
            digestHeader = String(bs.dailyDigestHeader);
        if (bs?.dailyDigestFooter)
            digestFooter = String(bs.dailyDigestFooter);
    }
    catch (err) {
        v2_1.logger.warn("[dailyAdminDigest] failed to load custom copy, using default", err);
    }
    const text = [
        digestHeader,
        `${dateLabel} · ย้อนหลัง 24 ชม.`,
        ``,
        `🧭 Funnel`,
        `เข้าเว็บ (home_view): ${eventCounts.home_view ?? 0}`,
        `ดูบริการ (service_view): ${eventCounts.service_view ?? 0}`,
        `ดูโปรไฟล์หมอนวด (therapist_view): ${eventCounts.therapist_view ?? 0}`,
        `เริ่มจอง (booking_start): ${eventCounts.booking_start ?? 0}`,
        `จองสำเร็จ (booking_complete): ${eventCounts.booking_complete ?? 0}`,
        `ทักคอนเซียร์จ (concierge_chat_open): ${eventCounts.concierge_chat_open ?? 0}`,
        `Conversion (เข้าเว็บ → จองสำเร็จ): ${conversionRate.toFixed(1)}%`,
        ``,
        `📅 Bookings`,
        `จองทั้งหมด: ${totalBookings}`,
        `ยกเลิก: ${cancelledCount}`,
        `รายได้รวม (ไม่รวมยกเลิก/คืนเงิน): ${grossRevenue.toLocaleString()} ฿`,
        digestFooter ? `` : null,
        digestFooter ? digestFooter : null,
    ].filter((l) => l !== null).join("\n");
    const res = await sendTelegramIfEnabled(token, await getReportChatId(), text);
    v2_1.logger.info("[dailyAdminDigest] sent", { ok: res.ok });
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
        const r = await sendTelegramIfEnabled(token, await getReportChatId(), text);
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
// 🆕 Round 28x.94 (founder: "ให้รายงานทุกอย่างไปไว้ SunRed Report ·
//   SunRed Booking มี แค่ Booking จากลูกค้า ก็พอ") — a second, separate
//   destination for everything that ISN'T the original new-booking
//   announcement: daily digest, low-rating review alerts, overdue-session
//   alerts, abandoned-booking recovery nudges, and dispatch status chatter
//   (accept/decline/claim/en-route/arrived/done). Same one-time-code claim
//   shape as claimJobChannel above, so setup is "post one message in the
//   group", not "find and paste a raw chat ID".
async function claimReportChannel(chatId, chatTitle, suppliedCode) {
    const db = (0, firestore_2.getFirestore)();
    const ref = db.collection("adminSettings").doc("advanced");
    const snap = await ref.get();
    const d = snap.data() ?? {};
    const want = typeof d.reportChannelCode === "string" ? d.reportChannelCode : "";
    const exp = d.reportChannelCodeExpiresAt;
    if (!want || !exp || exp.toMillis() < Date.now())
        return null;
    if (suppliedCode.toUpperCase() !== want.toUpperCase())
        return null;
    await ref.set({
        reportChatId: String(chatId),
        reportChannelTitle: chatTitle ?? null,
        reportChannelCode: firestore_2.FieldValue.delete(),
        reportChannelCodeExpiresAt: firestore_2.FieldValue.delete(),
    }, { merge: true });
    v2_1.logger.info("[claimReportChannel] report channel set", { chatId, chatTitle });
    return [
        "✅ ตั้งเป็นช่อง Report เรียบร้อยแล้ว",
        "",
        "รายงานประจำวัน / แจ้งรีวิว / สถานะรับ-ไม่รับงาน ฯลฯ",
        "จะมาโพสต์ที่นี่ แทนกลุ่ม SunRed Booking",
    ].join("\n");
}
/** Where "report" messages (digest, review alerts, dispatch status chatter)
 *  go — falls back to the booking group until a report channel is claimed,
 *  so nothing silently stops sending mid-migration. */
async function getReportChatId() {
    try {
        const snap = await (0, firestore_2.getFirestore)().collection("adminSettings").doc("advanced").get();
        const id = snap.data()?.reportChatId;
        return id || TELEGRAM_CHAT_ID;
    }
    catch {
        return TELEGRAM_CHAT_ID;
    }
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
    const claimMapUrl = therapistMapUrl(full);
    await sendTelegramIfEnabled(token, String(pressedBy), `${formatBookingForTherapist(bookingId, full, false)}\n\nแอดมินเห็นแล้วว่าคุณรับงานนี้ เดินทางได้เลยค่ะ`, [
        [{ text: "📱 เปิดหน้างานของฉัน · แจ้งสถานะที่นี่", url: "https://sunred.vip/therapist/jobs" }],
        ...(claimMapUrl ? [[{ text: "📍 เปิดแผนที่", url: claimMapUrl }]] : []),
    ]);
    await sendTelegramIfEnabled(token, await getReportChatId(), `🙋 ${who} รับงานจากช่องงานแล้ว · SR-${bookingId.slice(0, 8).toUpperCase()} · ${full.date ?? ""} ${full.time ?? ""}`);
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
        // 🆕 28x.69 — the reveal. Accepting unmasks the full card: address, map
        //   pin, the guest's phone. Declining reveals nothing — the point of
        //   masking is that a job she turned down never put a guest's address
        //   in her chat history.
        const freshBooking = snap.data();
        const fullCard = formatBookingForTherapist(bookingId, freshBooking, false);
        const acceptMapUrl = therapistMapUrl(freshBooking);
        if (msgChatId && msgId) {
            // 🆕 Round 28x.87 (founder: "ถ้ารับงาน ให้ส่งคำสั่งใบออเดอร์เต็มซ้ำไปที่
            //   ยูริ") — editing the original masked card in place is easy to scroll
            //   past; the practitioner may not notice it changed. Close out the
            //   original card with a short line, then send the full unmasked card
            //   as a NEW message below so it lands as its own notification and
            //   stays easy to find/reference while she's en route.
            await editTelegramMessage(token, msgChatId, msgId, accepted
                ? "✅ รับงานแล้ว · รายละเอียดเต็มอยู่ข้อความถัดไปค่ะ"
                : "❌ ไม่รับงาน\n\nแจ้งแอดมินเรียบร้อยแล้ว จะจ่ายงานให้คนอื่นต่อค่ะ");
        }
        if (accepted && msgChatId) {
            // 🆕 Round 28x.89 (founder: "แล้วพนักงานจะเข้าระบบยังไง ต้องกดรับแล้วพา
            //   เข้าหน้าโปรไฟล์ไหม") — accept/decline stays in Telegram (fast, zero
            //   friction), but advancing enroute/arrived/in_session/done only exists
            //   on /therapist/jobs (28x.85). Without a link there, that screen is
            //   effectively unreachable for anyone who lives in the Telegram chat.
            //   One tap here opens it — she's already signed in from her staff
            //   login, so the browser session carries over.
            await sendTelegramIfEnabled(token, String(msgChatId), `${fullCard}\n\nแอดมินเห็นแล้วว่าคุณรับงานนี้ เดินทางได้เลยค่ะ`, [
                [{ text: "📱 เปิดหน้างานของฉัน · แจ้งสถานะที่นี่", url: "https://sunred.vip/therapist/jobs" }],
                ...(acceptMapUrl ? [[{ text: "📍 เปิดแผนที่", url: acceptMapUrl }]] : []),
            ]);
        }
        // ── Tell the admin group either way. An accept is reassurance; a decline
        //    is the one that needs someone to act, so it says so loudly.
        const who = b.therapistName ?? b.therapistId ?? "หมอนวด";
        const refCode = `SR-${bookingId.slice(0, 8).toUpperCase()}`;
        await sendTelegramIfEnabled(token, await getReportChatId(), accepted
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
    secrets: [TELEGRAM_BOT_TOKEN, OPENAI_API_KEY, TELEGRAM_WEBHOOK_SECRET],
    cors: false,
}, async (req, res) => {
    if (req.method !== "POST") {
        res.status(405).send("POST only");
        return;
    }
    // 🆕 Round 28x.107 (founder security audit) — prove the caller is Telegram.
    //   This endpoint was open to the whole internet: the function URL is
    //   derived from the project id, which ships inside the public web bundle,
    //   so it is discoverable, not secret. Anyone could POST a forged update
    //   and (a) burn OPENAI_API_KEY credits — real money — on synthetic
    //   concierge questions, (b) spam guests through our own bot, or
    //   (c) impersonate a practitioner's ACCEPT/DECLINE press if they learned
    //   her Telegram user id.
    //
    //   Telegram sends this header on every update, but only once the webhook
    //   has been (re-)registered with a secret_token — run
    //   scripts/setTelegramWebhook.mjs after deploying, or real updates start
    //   getting rejected here.
    const wantSecret = TELEGRAM_WEBHOOK_SECRET.value();
    if (!wantSecret) {
        // Fail CLOSED, not open. An unset secret used to mean "no protection";
        // making that the deny case means a botched deploy takes the bot
        // offline loudly instead of silently reopening the hole.
        v2_1.logger.error("[telegramWebhook] TELEGRAM_WEBHOOK_SECRET missing — rejecting");
        res.status(500).send("server-misconfigured");
        return;
    }
    if (req.get("X-Telegram-Bot-Api-Secret-Token") !== wantSecret) {
        v2_1.logger.warn("[telegramWebhook] rejected: bad or missing secret token", {
            ip: req.ip,
        });
        res.status(401).send("unauthorized");
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
        else if (cid && /^\/setreportchannel(@\w+)?\b/i.test(t)) {
            const reply = await claimReportChannel(cid, cp.chat?.title, t.replace(/^\/setreportchannel(@\w+)?/i, "").trim());
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
    else if (/^\/setreportchannel(@\w+)?\b/i.test(text)) {
        // 🆕 Round 28x.94 (founder: "ให้รายงานทุกอย่างไปไว้ SunRed Report ·
        //   SunRed Booking มี แค่ Booking จากลูกค้า ก็พอ") — same one-time-code
        //   claim shape as /setjobchannel above, for a second group.
        const claimed = await claimReportChannel(chatId, update?.message?.chat?.title, text.replace(/^\/setreportchannel(@\w+)?/i, "").trim());
        if (!claimed) {
            res.status(200).send("ok");
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
// 🆕 Round 28x.88 (founder: "สมัคร Profile พนักงาน") — provision a real staff
//   login directly, rather than relying on a therapist to self-sign-up with
//   an email that happens to match therapists/{id}.email (setRoleOnSignup,
//   ~line 428) — a fragile precondition nobody had actually set for
//   Yuri/Vivian/Nicky, so their staffActive toggle was live but toothless:
//   no uid on file for the rule to match against. Mirrors createCustomerAccount's
//   shape: mint the Auth user directly, write uid + email onto the therapist
//   doc in the SAME call. Deliberately does NOT touch staffActive — per
//   28x.81 above, that's a separate admin decision (job sync + channel setup
//   confirmed done), not implied by an account merely existing.
exports.createTherapistAccount = (0, https_1.onCall)({ region: "asia-southeast1" }, async (request) => {
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
    const tSnap = await tRef.get();
    if (!tSnap.exists) {
        throw new https_1.HttpsError("not-found", "Therapist not found.");
    }
    const t = tSnap.data();
    if (t?.uid) {
        throw new https_1.HttpsError("already-exists", "This therapist already has a login.");
    }
    const handle = therapistId.toLowerCase();
    if (!/^[a-z][a-z0-9._-]{2,19}$/.test(handle)) {
        throw new https_1.HttpsError("internal", "Therapist doc id isn't a valid username shape.");
    }
    const authEmail = `${handle}@${USERNAME_ALIAS_DOMAIN}`;
    // Random 12-char password from the same no-ambiguous-characters alphabet
    // as link codes — easy to read aloud/relay over Telegram, long enough to
    // satisfy Firebase Auth's minimum.
    let password = "";
    for (let i = 0; i < 12; i++) {
        password += LINK_ALPHABET[Math.floor(Math.random() * LINK_ALPHABET.length)];
    }
    let uid;
    try {
        const rec = await (0, auth_1.getAuth)().createUser({
            email: authEmail,
            password,
            ...(t?.name ? { displayName: t.name } : {}),
        });
        uid = rec.uid;
    }
    catch (err) {
        const errCode = err.code;
        if (errCode === "auth/email-already-exists") {
            throw new https_1.HttpsError("already-exists", "A login already exists for this therapist id.");
        }
        throw err;
    }
    // 🆕 28x.107 — `tid` rides in the token so storage.rules can scope a
    //   practitioner's uploads to her OWN therapists/{id}/ folder.
    await (0, auth_1.getAuth)().setCustomUserClaims(uid, { role: "therapist", tid: therapistId });
    await db.collection("users").doc(uid).set({
        username: handle,
        loginKind: "username",
        role: "therapist",
        ...(t?.name ? { displayName: t.name } : {}),
        createdAt: firestore_2.FieldValue.serverTimestamp(),
    }, { merge: true });
    await tRef.set({ uid, email: authEmail, updatedAt: firestore_2.FieldValue.serverTimestamp() }, { merge: true });
    await db.collection("auditLogs").add({
        action: "therapist.create_account",
        actorId: request.auth.uid,
        byUid: request.auth.uid,
        detail: { therapistId }, // never the password itself
        at: firestore_2.FieldValue.serverTimestamp(),
    });
    return { ok: true, username: handle, password };
});
// 🆕 Round 28x.91 (founder: "ถ้ามันดูได้ครั้งเดียว แล้วลืมคัดลอกทำไง") — the
//   credential card only shows once (React state, gone on refresh/navigate),
//   and there was no way back in. Unlike resetCustomerPassword — which resets
//   to the customer's own phone number, something both sides already know —
//   a therapist's password is random with nothing memorable to fall back to,
//   so "reset" here means "generate a fresh one and show it again."
exports.resetTherapistPassword = (0, https_1.onCall)({ region: "asia-southeast1" }, async (request) => {
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
    const tSnap = await db.collection("therapists").doc(therapistId).get();
    if (!tSnap.exists) {
        throw new https_1.HttpsError("not-found", "Therapist not found.");
    }
    const t = tSnap.data();
    if (!t?.uid) {
        throw new https_1.HttpsError("failed-precondition", "This therapist has no login yet — use Create account instead.");
    }
    let password = "";
    for (let i = 0; i < 12; i++) {
        password += LINK_ALPHABET[Math.floor(Math.random() * LINK_ALPHABET.length)];
    }
    await (0, auth_1.getAuth)().updateUser(t.uid, { password });
    await db.collection("auditLogs").add({
        action: "therapist.password_reset",
        actorId: request.auth.uid,
        byUid: request.auth.uid,
        detail: { therapistId }, // never the password itself
        at: firestore_2.FieldValue.serverTimestamp(),
    });
    return { ok: true, username: therapistId.toLowerCase(), password };
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
        await sendTelegramIfEnabled(token, await getReportChatId(), accepted
            ? `✅ ${who} รับงานแล้ว (จากแอป) · ${refCode} · ${b.date ?? ""} ${b.time ?? ""}`
            : `⚠️ ${who} กดไม่รับงาน (จากแอป) · ${refCode} · ${b.date ?? ""} ${b.time ?? ""}\nต้องจ่ายงานให้คนอื่น`);
    }
    v2_1.logger.info("[respondToJob] recorded", { bookingId, action, uid });
    return { ok: true, already: false, response: accepted ? "accepted" : "declined" };
});
const DISPATCH_NEXT = {
    assigned: "enroute",
    enroute: "arrived",
    arrived: "in_session",
    in_session: "done",
    done: null,
};
const DISPATCH_LABEL = {
    assigned: "รับงานแล้ว",
    enroute: "กำลังเดินทาง",
    arrived: "ถึงที่หมายแล้ว",
    in_session: "เริ่มบริการแล้ว",
    done: "จบงานแล้ว",
};
exports.advanceJobStatus = (0, https_1.onCall)({ region: "asia-southeast1", secrets: [TELEGRAM_BOT_TOKEN] }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "Sign in required.");
    }
    const uid = request.auth.uid;
    // 🆕 Round 28x.124 — `arrivalPhotoUrl` is the meeting-point photo the app
    //   makes her take on the "ถึงแล้ว" step. Optional in the signature so an
    //   older client (or the Telegram button path) can still advance without
    //   one; the client is what enforces "photo required to arrive".
    const data = request.data;
    const bookingId = String(data?.bookingId ?? "").trim();
    const arrivalPhotoUrl = String(data?.arrivalPhotoUrl ?? "").trim();
    if (!bookingId) {
        throw new https_1.HttpsError("invalid-argument", "bookingId required.");
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
    if (b.therapistResponse !== "accepted") {
        throw new https_1.HttpsError("failed-precondition", "Accept the job before updating status.");
    }
    if (b.status === "cancelled" || b.status === "canceled") {
        throw new https_1.HttpsError("failed-precondition", "This job was cancelled.");
    }
    const current = b.dispatchState ?? "assigned";
    const next = DISPATCH_NEXT[current];
    if (!next) {
        return { ok: true, already: true, dispatchState: current };
    }
    const patch = {
        dispatchState: next,
        [`${next}At`]: firestore_2.FieldValue.serverTimestamp(),
    };
    if (next === "in_session") {
        const mins = b.duration ?? 60;
        patch.expectedEndAt = firestore_2.Timestamp.fromMillis(Date.now() + mins * 60000);
    }
    if (next === "done") {
        patch.status = "completed";
        patch.sessionEndAt = firestore_2.FieldValue.serverTimestamp();
    }
    // Keep the proof on the booking, so it's still reviewable later from the
    // admin panel rather than only existing as a Telegram message.
    if (next === "arrived" && arrivalPhotoUrl) {
        patch.arrivalPhotoUrl = arrivalPhotoUrl;
    }
    await ref.update(patch);
    const token = TELEGRAM_BOT_TOKEN.value();
    if (token) {
        const who = b.therapistName ?? "หมอนวด";
        const refCode = `SR-${bookingId.slice(0, 8).toUpperCase()}`;
        const line = `📍 ${who} · ${DISPATCH_LABEL[next]} (จากแอป) · ${refCode} · ${b.date ?? ""} ${b.time ?? ""}`;
        const chatId = await getReportChatId();
        // 🆕 28x.124 — on arrival, the status line becomes the caption of the
        //   meeting-point photo instead of a separate message, so View sees
        //   "she's there" and "here's where" as one item in the channel.
        if (next === "arrived" && arrivalPhotoUrl) {
            await sendTelegramPhotoIfEnabled(token, chatId, arrivalPhotoUrl, `${line}\n🖼 จุดรอพบลูกค้า`);
        }
        else {
            await sendTelegramIfEnabled(token, chatId, line);
        }
    }
    v2_1.logger.info("[advanceJobStatus] recorded", { bookingId, next, uid });
    return { ok: true, already: false, dispatchState: next };
});
// 🆕 Round 28x.110 (founder: "ถ้ามีสมาชิกให้ใส่ตามเลเวล แต่ไม่บอกชื่อจริง
//   ลูกค้า") — her Jobs list should flag when a guest is an enrolled member
//   (by tier), without ever exposing the guest's real name. A therapist can
//   only read her OWN bookings (therapistUid rule) and can't read a guest's
//   /users/{uid} doc at all (owner/admin-only) — so resolving the tier has
//   to happen server-side, same reasoning as respondToJob/advanceJobStatus.
//   Returns ONLY the tier, never a name, phone, or the doc itself.
exports.getJobGuestTier = (0, https_1.onCall)({ region: "asia-southeast1" }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "Sign in required.");
    }
    const uid = request.auth.uid;
    const data = request.data;
    const bookingId = String(data?.bookingId ?? "").trim();
    if (!bookingId) {
        throw new https_1.HttpsError("invalid-argument", "bookingId required.");
    }
    const db = (0, firestore_2.getFirestore)();
    const snap = await db.collection("bookings").doc(bookingId).get();
    if (!snap.exists) {
        throw new https_1.HttpsError("not-found", "Booking not found.");
    }
    const b = snap.data();
    if (b.therapistUid !== uid) {
        throw new https_1.HttpsError("permission-denied", "This job isn't assigned to you.");
    }
    if (!b.userId) {
        return { tier: null };
    }
    const userSnap = await db.collection("users").doc(b.userId).get();
    const tier = userSnap.data()
        ?.membership?.tier ?? null;
    return { tier };
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
// 🆕 28x.94 — companion to createJobChannelCode, same code-gate pattern, but
//   claims the "SunRed Report" group instead of the job board.
exports.createReportChannelCode = (0, https_1.onCall)({ region: "asia-southeast1" }, async (request) => {
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
        .set({ reportChannelCode: code, reportChannelCodeExpiresAt: expiresAt }, { merge: true });
    await db.collection("auditLogs").add({
        action: "settings.update",
        actorId: request.auth.uid,
        detail: { what: "reportChannelCode issued" },
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
// 🆕 Round 28x.95 (founder: "ทำไมไม่เอาไปโชว์จริง ใน Telegram Bot หน้า
//   แอดมินหลังบ้าน") — surfaces the ACTUAL live copy for all 3 Telegram
//   bots inside AdminTelegramPanelPage, so View can review what to
//   add/remove without leaving the real admin she already uses. Reads
//   straight from welcomeFor/faqEntry/renderPrimeTime — the exact
//   functions the bots call to build outbound messages — so this can
//   never drift out of sync with what's actually sent.
//   Promo body previews use one fixed non-holiday week (2026-07-06 to
//   07-12) + each holiday's real calendar date; only the "prime" slot
//   is rendered per day since the header is the only thing that
//   changes across evening/prime/late (see templates.ts file header).
exports.getTelegramBotCopyPreview = (0, https_1.onCall)({ region: "asia-southeast1" }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "Sign in required.");
    }
    const db = (0, firestore_2.getFirestore)();
    if (!(await db.collection("admins").doc(request.auth.uid).get()).exists) {
        throw new https_1.HttpsError("permission-denied", "Admin only.");
    }
    // 🆕 Round 28x.99f — GREETER_LANGS (concierge bot, reactive 1:1) now
    //   carries zh-TW; PROMO_LANGS (scheduled broadcast bot) deliberately
    //   does NOT — there's no Traditional-Chinese channel to route a
    //   scheduled post to (@manguyujianniSPA is a mainland-CN sub-brand),
    //   and standing up one is a real acquisition-channel decision, not a
    //   code default. See channelForLang() in telegram-post-bot/client.ts.
    const GREETER_LANGS = ["en", "th", "zh", "zh-TW", "ja", "ko"];
    const PROMO_LANGS = ["en", "th", "zh", "ja", "ko"];
    const FAQ_KEYS = ["pricing", "services", "areas", "howto", "membership"];
    // 🆕 Round 28x.97 — byLang is now async since welcomeFor/faqEntry/
    //   renderPrimeTime all check Firestore botCopy/* first (see
    //   functions/src/botCopyStore.ts) so this preview always reflects the
    //   CURRENT EFFECTIVE content — override if one's been saved, code
    //   default otherwise — never a stale, code-only snapshot.
    // Generic over the lang-list type so the same helper serves both the
    // 6-language greeter and the 5-language promo bot without either
    // silently coercing the other's language set.
    const byLang = async (langs, fn) => {
        const entries = await Promise.all(langs.map(async (l) => [l, await fn(l)]));
        return Object.fromEntries(entries);
    };
    const faqByLang = async (key) => {
        const entries = await Promise.all(GREETER_LANGS.map(async (l) => [l, await (0, faq_1.faqEntry)(key, l)]));
        return {
            title: Object.fromEntries(entries.map(([l, e]) => [l, e.title])),
            body: Object.fromEntries(entries.map(([l, e]) => [l, e.body])),
        };
    };
    const [welcome, button, nudge, faqEntries] = await Promise.all([
        byLang(GREETER_LANGS, greetings_1.welcomeFor),
        byLang(GREETER_LANGS, greetings_1.buttonLabelFor),
        byLang(GREETER_LANGS, greetings_1.nudgeFor),
        Promise.all(FAQ_KEYS.map(async (key) => ({ key, ...(await faqByLang(key)) }))),
    ]);
    const greeter = { welcome, button, nudge, faq: faqEntries };
    // 🆕 Round 28x.97 — reads the STORED unit directly (day/holiday key →
    //   body), not a composed message built from a guessed reference date.
    //   `preview` still shows the full composed message (header+body+
    //   footer+reserve) for context, but `body` is what actually gets
    //   read/written for editing.
    const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
    const HOLIDAY_KEYS = ["valentine", "songkran", "halloween", "christmas", "newyear"];
    const promo = {
        footer: await byLang(PROMO_LANGS, templates_1.rawFooter),
        days: await Promise.all(DAY_KEYS.map(async (day) => {
            const body = await byLang(PROMO_LANGS, (l) => (0, templates_1.rawDailyBody)(day, l));
            const preview = await byLang(PROMO_LANGS, async (l) => (0, templates_1.previewPromoMessage)(body[l], l));
            return { day, body, preview };
        })),
        holidays: await Promise.all(HOLIDAY_KEYS.map(async (key) => {
            const body = await byLang(PROMO_LANGS, (l) => (0, templates_1.rawHolidayBody)(key, l));
            const preview = await byLang(PROMO_LANGS, async (l) => (0, templates_1.previewPromoMessage)(body[l], l));
            return { key, body, preview };
        })),
    };
    return { greeter, promo };
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
    // 🆕 28x.149 — this trigger now sends Telegram on a schedule change
    //   (see below), so it needs the bot token secret it never used before.
    secrets: [TELEGRAM_BOT_TOKEN],
}, async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!after)
        return;
    // Cheap guard BEFORE any read: skip ordinary edits (price / location /
    // phone / time) that can't move a practitioner's live busy status.
    const idChanged = (before?.therapistId ?? null) !== (after.therapistId ?? null);
    const stateChanged = (before?.dispatchState ?? null) !== (after.dispatchState ?? null);
    // 🆕 28x.149 (founder: "ลค จะเปลี่ยนเวลา ระบบก็ต้องลิ้งตามกันสิ") — a pure
    //   schedule edit (therapist + dispatchState both unchanged) used to hit
    //   the early-return two lines down with ZERO notification to anyone.
    //   The admin edit form only toasts the ADMIN who made the change; the
    //   assigned therapist found out only if her Jobs page happened to be
    //   open live at that exact moment (onSnapshot has no badge/push when
    //   it isn't). Detect a real startAt change here, ahead of both early
    //   returns, and fire a Telegram notice to the admin group (always —
    //   the channel already proven reliable) and the therapist's personal
    //   DM (if she's on the DISPATCH pilot list, same gate onBookingCreate
    //   uses). Fire-and-forget: a notify failure must never block the
    //   busy-status sync below, which is this function's real job.
    const beforeStartMs = before?.startAt?.toMillis?.() ?? null;
    const afterStartMs = after.startAt?.toMillis?.() ?? null;
    const scheduleChanged = beforeStartMs !== null && afterStartMs !== null && beforeStartMs !== afterStartMs;
    if (scheduleChanged) {
        try {
            const token = TELEGRAM_BOT_TOKEN.value();
            if (!token) {
                v2_1.logger.error("[onBookingDispatchChange] TELEGRAM_BOT_TOKEN missing — schedule-change notice skipped");
            }
            else {
                const bookingId = event.params.bookingId;
                const refCode = `SR-${bookingId.slice(0, 8).toUpperCase()}`;
                const oldWhen = before?.date && before?.time ? `${before.date} ${before.time}` : "—";
                const newWhen = after.date && after.time ? `${after.date} ${after.time}` : "—";
                await sendTelegramIfEnabled(token, TELEGRAM_CHAT_ID, [
                    `🕐 เปลี่ยนเวลานัด · ${refCode}`,
                    `Therapist: ${after.therapistName ?? "—"}`,
                    `${oldWhen}  →  ${newWhen}`,
                ].join("\n"));
                if (therapistDmEnabled(after.therapistId) && after.therapistId) {
                    const tSnap = await (0, firestore_2.getFirestore)()
                        .collection("therapists")
                        .doc(after.therapistId)
                        .get();
                    const chatId = tSnap.data()
                        ?.telegramChatId;
                    if (chatId) {
                        await sendTelegramIfEnabled(token, String(chatId), [
                            `🕐 งานของคุณเปลี่ยนเวลา · ${refCode}`,
                            `${oldWhen}  →  ${newWhen}`,
                        ].join("\n"));
                    }
                }
            }
        }
        catch (err) {
            v2_1.logger.error("[onBookingDispatchChange] schedule-change notice failed", err);
        }
    }
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
// ─────────────────────────────────────────────────────────────────────────────
// 🆕 Round 28x.130 (founder: "3 sessions ของพนักงาน ไม่ตรงกันสักยอด")
//
// `therapists/{id}.totalSessions` is the number every PUBLIC surface shows —
// the browse card, the profile hero, the stats chips. Until now the only thing
// that ever wrote it was an admin tapping "Sync Stats" on one practitioner's
// page. Nobody taps that after every booking, so it drifted: an audit of all 14
// live docs found 6 wrong, from -7 (Nicky) to +12 (Vivian).
//
// A denormalized counter that only a human keeps up to date is not a cache,
// it's a second source of truth — so it recomputes itself here instead, on
// every write to a booking. The manual button stays (harmless, same formula).
//
// The count is deliberately NOT just "completed". It is
//   completed/done  +  cancelled bookings the admin flagged countsAsSession
// per 28x.118: a cancelled job can still credit the practitioner publicly
// ("ถ้าไม่มียอดจองเลยพนักงานจะขายไม่ได้") while staying ฿0 in every money total.
// That intent lives only in the flag, which is exactly why a naive live count
// of the bookings collection cannot replace this field.
// ─────────────────────────────────────────────────────────────────────────────
const SERVED_STATUSES = new Set(["completed", "done"]);
async function recomputeTherapistSessionStats(therapistId) {
    const db = (0, firestore_2.getFirestore)();
    const tRef = db.collection("therapists").doc(therapistId);
    const [snap, tSnap] = await Promise.all([
        db.collection("bookings").where("therapistId", "==", therapistId).get(),
        tRef.get(),
    ]);
    // 🆕 Round 28x.133 (founder chose "โบนัสรายคน") — an admin-set display bonus
    //   that lifts ONLY the customer-facing session count, so a quieter
    //   practitioner doesn't look unbooked next to Yuri and lose the sale to
    //   cold-start ("ถ้า yuri หยุด พนักงานคนอื่นก็ยอดจองน้อย ลูกค้าไม่อยากจอง").
    //   It is added to totalSessions but NEVER to the rebook maths below —
    //   rebook rate stays a true ratio of real people, per the founder's own
    //   "rebook rate ไม่นับโหมดปั่นยอด". Staff never see it: their app reads the
    //   live computeBookingStats (completed only), not this doc field.
    const bonusRaw = tSnap.get("displaySessionBonus");
    const displayBonus = typeof bonusRaw === "number" && bonusRaw > 0 ? Math.round(bonusRaw) : 0;
    // 🆕 Round 28x.138 (founder: "โบนัสรายคน ต้องบาลานซ์กับหน้า rebook rate ด้วย
    //   เดี๋ยวไม่เนียน") — when a boosted therapist would otherwise show a high
    //   session count with a 0% / missing rebook chip, that reads as fake. An
    //   admin-set rebook override makes the pair look consistent. When set, it
    //   is what customers see; the real computed rate is still written to
    //   `rebookRateReal` so the admin can see the truth alongside it.
    const overrideRaw = tSnap.get("rebookRateOverride");
    const rebookOverride = typeof overrideRaw === "number" && overrideRaw >= 0
        ? Math.min(100, Math.round(overrideRaw))
        : null;
    let served = 0;
    const byCustomer = new Map();
    snap.forEach((d) => {
        const b = d.data();
        // 🆕 Round 28x.135 (founder: "งานเทสบอท โผล่") — QA booking-flow tests at
        //   the fixed Aspire / Soi Prompan test address are not real sessions, so
        //   they never count for the customer-facing chip either. Mirrors
        //   isTestLocationBooking in src/utils/membership.ts (functions can't
        //   import from the app). Deliberately NOT the phone/name "reserved shop"
        //   signal — those are 126 REAL bookings (CLAUDE.md).
        const loc = `${b.locationName ?? ""} ${b.address ?? ""}`.toLowerCase();
        if (loc.includes("aspire") || loc.includes("ซอย พร้อมพันธ์") || loc.includes("qh86+45p"))
            return;
        const status = (b.status ?? "").toLowerCase();
        // 🆕 Round 28x.134 (founder chose "รวมเหลืออันเดียว") — the per-booking
        //   "credit this cancellation" mode (countsAsSession, 28x.118) is retired.
        //   Old countsAsSession flags on booking docs are dead data, ignored here.
        if (!SERVED_STATUSES.has(status))
            return;
        served++;
        // Rebook rate counts PEOPLE, so guests (no uid) key on their phone —
        // same identity rule the client-side computeBookingStats uses.
        const phone = typeof b.phone === "string" ? b.phone.replace(/[^\d+]/g, "") : "";
        const key = b.userId && b.userId.length > 0 ? b.userId : phone.length >= 6 ? phone : null;
        if (!key)
            return;
        byCustomer.set(key, (byCustomer.get(key) ?? 0) + 1);
    });
    const uniqueCustomers = byCustomer.size;
    let repeatCustomers = 0;
    byCustomer.forEach((n) => { if (n >= 2)
        repeatCustomers++; });
    const rebookReal = uniqueCustomers > 0 ? Math.round((repeatCustomers / uniqueCustomers) * 100) : 0;
    await tRef.update({
        totalSessions: served + displayBonus,
        // Customers see the override when set; the true rate is preserved
        // alongside so the admin page can show "จริง X% · แสดง Y%".
        rebookRate: rebookOverride ?? rebookReal,
        rebookRateReal: rebookReal,
        statsUpdatedAt: firestore_2.FieldValue.serverTimestamp(),
    });
}
exports.onBookingWriteSyncStats = (0, firestore_1.onDocumentWritten)({
    document: "bookings/{bookingId}",
    region: "asia-southeast1",
}, async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    // Cheap guards BEFORE any read — a booking's price, address, time and phone
    // all change often and none of them can move a session count.
    const statusChanged = (before?.status ?? null) !== (after?.status ?? null);
    const creditChanged = (before?.countsAsSession ?? null) !== (after?.countsAsSession ?? null);
    const created = !before && !!after;
    const deleted = !!before && !after;
    const reassigned = (before?.therapistId ?? null) !== (after?.therapistId ?? null);
    if (!created && !deleted && !statusChanged && !creditChanged && !reassigned)
        return;
    // A reassignment moves the count off one practitioner AND onto another, so
    // both docs have to be recomputed, not just the current owner.
    const targets = new Set();
    if (before?.therapistId)
        targets.add(before.therapistId);
    if (after?.therapistId)
        targets.add(after.therapistId);
    for (const id of targets) {
        try {
            await recomputeTherapistSessionStats(id);
        }
        catch (err) {
            // A therapist doc that no longer exists must not fail the whole write.
            v2_1.logger.warn("[onBookingWriteSyncStats] recompute failed", { therapistId: id, err });
        }
    }
});
// ─────────────────────────────────────────────────────────────────────────────
// 🆕 Round 28x.132 (founder: "ถ้ายกเลิก แล้วแอดมินกดยกเลิกออเดอร์ บอทจะลบ
//   ออเดอร์ที่ส่งมาด้วยได้ไหม ในเทเลแกรม บุค" — chose strike-through, not delete)
//
// When a booking's status transitions INTO "cancelled", strike through every
// channel message onBookingCreate posted for it (card + Source + History),
// re-titled "❌ ยกเลิกแล้ว · CANCELLED". editMessageText, not deleteMessage:
// the Booking channel is the shop's record, a vanished card loses that the
// order ever existed, and Telegram refuses to delete messages past a certain
// age — so a cancel three days later would fail silently, the one outcome an
// operator must never be handed. An edit has no such age limit.
//
// Only messages captured WITH their text (telegramAdminMsgs, written by
// onBookingCreate from this round on) can be struck. A booking created before
// this shipped has no stored messages and is skipped — logged, not errored.
// ─────────────────────────────────────────────────────────────────────────────
exports.onBookingCancelledStrikeTelegram = (0, firestore_1.onDocumentUpdated)({
    document: "bookings/{bookingId}",
    region: "asia-southeast1",
    secrets: [TELEGRAM_BOT_TOKEN],
}, async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!after)
        return;
    const wasCancelled = (before?.status ?? "").toLowerCase() === "cancelled";
    const isCancelled = (after.status ?? "").toLowerCase() === "cancelled";
    // Fire only on the transition INTO cancelled, and only once: an already-
    // struck booking that gets edited again (price fix, note) must not re-edit.
    if (isCancelled === wasCancelled)
        return;
    if (!isCancelled)
        return;
    if (after.telegramCancelStruckAt)
        return;
    const msgs = Array.isArray(after.telegramAdminMsgs) ? after.telegramAdminMsgs : [];
    if (msgs.length === 0) {
        v2_1.logger.info("[onBookingCancelledStrike] no stored messages — skipping", {
            bookingId: event.params.bookingId,
        });
        return;
    }
    if (!(await isTelegramEnabled())) {
        v2_1.logger.info("[onBookingCancelledStrike] telegram disabled — skipping");
        return;
    }
    const token = TELEGRAM_BOT_TOKEN.value().trim();
    const chatId = after.telegramChatId || TELEGRAM_CHAT_ID;
    let struck = 0;
    for (const m of msgs) {
        if (typeof m?.id !== "number" || typeof m?.text !== "string")
            continue;
        const ok = await markTelegramMessageCancelled(token, chatId, m.id, m.text);
        if (ok)
            struck++;
    }
    // Stamp so this can never run twice for the same booking.
    try {
        await (0, firestore_2.getFirestore)().collection("bookings").doc(event.params.bookingId).update({
            telegramCancelStruckAt: firestore_2.FieldValue.serverTimestamp(),
        });
    }
    catch (err) {
        v2_1.logger.error("[onBookingCancelledStrike] stamp write failed", err);
    }
    v2_1.logger.info("[onBookingCancelledStrike] done", {
        bookingId: event.params.bookingId,
        struck,
        total: msgs.length,
    });
});
// ─────────────────────────────────────────────────────────────────────────────
// 🆕 Round 28x.133 — recompute the public session count when an admin changes
// a practitioner's displaySessionBonus. Booking-write recompute (above) can't
// catch this: no booking changed, only the therapist doc. Fires ONLY on a real
// bonus change, so the recompute's own write of totalSessions/rebookRate does
// not re-trigger it — no loop.
// ─────────────────────────────────────────────────────────────────────────────
exports.onTherapistBonusChange = (0, firestore_1.onDocumentUpdated)({
    document: "therapists/{therapistId}",
    region: "asia-southeast1",
}, async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!after)
        return;
    // 🆕 28x.138 — fire on EITHER the session bonus or the rebook override
    //   changing; both feed recomputeTherapistSessionStats' written values.
    const bonusChanged = (typeof before?.displaySessionBonus === "number" ? before.displaySessionBonus : 0) !==
        (typeof after.displaySessionBonus === "number" ? after.displaySessionBonus : 0);
    const overrideChanged = (before?.rebookRateOverride ?? null) !== (after.rebookRateOverride ?? null);
    if (!bonusChanged && !overrideChanged)
        return;
    try {
        await recomputeTherapistSessionStats(event.params.therapistId);
    }
    catch (err) {
        v2_1.logger.warn("[onTherapistBonusChange] recompute failed", {
            therapistId: event.params.therapistId,
            err,
        });
    }
});
// ─────────────────────────────────────────────────────────────
// 🆕 28x.100 (founder "เปลี่ยนอัตโนมัติตามยอดจองรายวัน 2 งานHOT VIP 3
//   TOP_RATED 4") — the ONLY writer of therapists.todayBookings.
//
//   The badge engine (src/utils/getTherapistBadge.ts) has read
//   todayBookings since 28s153, but nothing ever wrote it — every card
//   read 0 forever, so auto-badges never fired. This trigger recomputes
//   the affected therapist's daily count on EVERY booking write (create,
//   status change, cancel, therapist reassignment — both old and new
//   therapist are refreshed on a swap).
//
//   "วันจอง" uses the BUSINESS day, not the calendar day: the shop's
//   night runs 22:00–05:00, so the day rolls at 06:00 BKK — a 01:30
//   job counts toward the same night as the 23:00 job before it.
//   Implementation: shift epoch by (+7h BKK −6h boundary) = +1h, then
//   take the UTC date string. The client engine uses the SAME formula
//   (businessDayBKK) and ignores counts stamped with any other day, so
//   stale counts expire at 06:00 with no midnight cron needed.
//
//   Statuses counted = real accepted work (confirmed/paid/in_progress/
//   completed/done). pending (unconfirmed hold) and cancelled/no-show
//   earn nothing — a badge must never be inflatable by spam holds.
// ─────────────────────────────────────────────────────────────
const DAILY_COUNTED_STATUSES = new Set([
    "confirmed",
    "paid",
    "in_progress",
    "completed",
    "done",
]);
function businessDayBKKServer(ms) {
    return new Date(ms + 3600000).toISOString().slice(0, 10);
}
function bookingTimeMs(v) {
    if (v == null)
        return 0;
    const o = v;
    if (typeof o.toMillis === "function")
        return o.toMillis();
    if (typeof o.seconds === "number")
        return o.seconds * 1000;
    if (typeof o._seconds === "number")
        return o._seconds * 1000;
    return 0;
}
exports.syncTherapistDailyCount = (0, firestore_1.onDocumentWritten)({
    document: "bookings/{bookingId}",
    region: "asia-southeast1",
}, async (event) => {
    const before = event.data?.before?.exists ? event.data.before.data() : undefined;
    const after = event.data?.after?.exists ? event.data.after.data() : undefined;
    const tids = new Set();
    const beforeTid = before?.therapistId;
    const afterTid = after?.therapistId;
    if (typeof beforeTid === "string" && beforeTid)
        tids.add(beforeTid);
    if (typeof afterTid === "string" && afterTid)
        tids.add(afterTid);
    if (tids.size === 0)
        return;
    const db = (0, firestore_2.getFirestore)();
    const dayKey = businessDayBKKServer(Date.now());
    for (const tid of tids) {
        try {
            const snap = await db
                .collection("bookings")
                .where("therapistId", "==", tid)
                .get();
            let n = 0;
            snap.forEach((d) => {
                const b = d.data();
                if (!DAILY_COUNTED_STATUSES.has(String(b.status ?? "")))
                    return;
                const ms = bookingTimeMs(b.startAt ?? b.createdAt);
                if (!ms)
                    return;
                if (businessDayBKKServer(ms) === dayKey)
                    n++;
            });
            await db
                .collection("therapists")
                .doc(tid)
                .set({ todayBookings: n, todayBookingsDate: dayKey }, { merge: true });
            v2_1.logger.info("[syncTherapistDailyCount] updated", { tid, n, dayKey });
        }
        catch (err) {
            v2_1.logger.warn("[syncTherapistDailyCount] failed", { tid, err });
        }
    }
});
//# sourceMappingURL=index.js.map