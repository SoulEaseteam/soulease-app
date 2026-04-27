"use strict";
// functions/src/index.ts
//
// Cloud Functions สำหรับ SunRed
// — ที่นี่คือที่เก็บ "secret" ทั้งหมดที่ฝั่ง client ไม่ควรเห็น
//   (Telegram bot token, LINE token, ฯลฯ) เพื่อกันคนดึง token จาก JS bundle
//
// Deploy:
//   1) cd ~/sunred-vite/functions && npm install
//   2) firebase functions:secrets:set TELEGRAM_BOT_TOKEN
//      firebase functions:secrets:set TELEGRAM_CHAT_ID
//   3) firebase deploy --only functions
Object.defineProperty(exports, "__esModule", { value: true });
exports.notifyBooking = void 0;
const https_1 = require("firebase-functions/v2/https");
const v2_1 = require("firebase-functions/v2");
const params_1 = require("firebase-functions/params");
const app_1 = require("firebase-admin/app");
(0, app_1.initializeApp)();
// 🔑 Bot token = secret จริง (ใครได้ไป → ส่ง message แทน bot ได้)
//    ตั้งค่าผ่าน: firebase functions:secrets:set TELEGRAM_BOT_TOKEN
const TELEGRAM_BOT_TOKEN = (0, params_1.defineSecret)("TELEGRAM_BOT_TOKEN");
// 📬 Channel ID = ไม่ใช่ secret (แค่ ID ของห้อง — ไม่ได้ token ก็ส่งเข้าไม่ได้)
//    hardcode ตรงนี้เพื่อกัน whitespace bug จาก paste
const TELEGRAM_CHAT_ID = "-1002962073895";
/**
 * notifyBooking
 * - ต้อง login ก่อน (กัน spam จากคนสุ่ม) — รองรับ anonymous auth
 * - ส่งข้อความเข้า Telegram channel ที่ตั้งใน secrets
 * - Default = plain text (ไม่มี parse_mode) เพื่อกัน Markdown parse error
 *   จากตัวอักษรพิเศษใน address/name/emoji
 */
exports.notifyBooking = (0, https_1.onCall)({
    secrets: [TELEGRAM_BOT_TOKEN],
    region: "asia-southeast1",
    enforceAppCheck: false, // ถ้าเปิด App Check ค่อยเปลี่ยนเป็น true
}, async (request) => {
    // 🔓 อนุญาต guest call (MVP) — กัน spam ด้วย rate limit ระดับ network ของ Cloud Run
    // TODO: เปิด App Check ภายหลัง
    const data = request.data;
    const message = (data?.message || "").toString().trim();
    if (!message) {
        throw new https_1.HttpsError("invalid-argument", "message is required");
    }
    // กัน abuse: จำกัดความยาวข้อความ (Telegram limit = 4096)
    if (message.length > 4000) {
        throw new https_1.HttpsError("invalid-argument", "message too long");
    }
    // ⚠️ trim — paste ใน terminal มักมี \n หรือ space ติดมา
    const token = TELEGRAM_BOT_TOKEN.value().trim();
    const chatId = TELEGRAM_CHAT_ID; // hardcoded — ไม่ต้อง trim
    if (!token) {
        v2_1.logger.error("[notifyBooking] bot token missing");
        throw new https_1.HttpsError("failed-precondition", "TELEGRAM_BOT_TOKEN secret not configured");
    }
    v2_1.logger.info("[notifyBooking] sending", {
        uid: request.auth?.uid ?? "guest",
        isAnonymous: request.auth?.token.firebase.sign_in_provider === "anonymous",
        chatId,
        messageLen: message.length,
        format: data.format ?? "plain",
    });
    const body = {
        chat_id: chatId,
        text: message,
        disable_web_page_preview: true,
    };
    if (data.format === "markdown")
        body.parse_mode = "MarkdownV2";
    else if (data.format === "html")
        body.parse_mode = "HTML";
    // else → plain text, ไม่ใส่ parse_mode
    let res;
    try {
        res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });
    }
    catch (err) {
        v2_1.logger.error("[notifyBooking] fetch failed", err);
        throw new https_1.HttpsError("internal", "Failed to reach Telegram API");
    }
    const responseText = await res.text().catch(() => "");
    if (!res.ok) {
        v2_1.logger.error("[notifyBooking] Telegram API error", {
            status: res.status,
            body: responseText.slice(0, 500),
        });
        throw new https_1.HttpsError("internal", `Telegram API ${res.status}: ${responseText.slice(0, 200)}`);
    }
    v2_1.logger.info("[notifyBooking] OK", {
        preview: responseText.slice(0, 120),
    });
    return { ok: true };
});
//# sourceMappingURL=index.js.map