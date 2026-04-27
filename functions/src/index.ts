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

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { logger } from "firebase-functions/v2";
import { defineSecret } from "firebase-functions/params";
import { initializeApp } from "firebase-admin/app";

initializeApp();

// 🔑 Bot token = secret จริง (ใครได้ไป → ส่ง message แทน bot ได้)
//    ตั้งค่าผ่าน: firebase functions:secrets:set TELEGRAM_BOT_TOKEN
const TELEGRAM_BOT_TOKEN = defineSecret("TELEGRAM_BOT_TOKEN");

// 📬 Channel ID = ไม่ใช่ secret (แค่ ID ของห้อง — ไม่ได้ token ก็ส่งเข้าไม่ได้)
//    hardcode ตรงนี้เพื่อกัน whitespace bug จาก paste
const TELEGRAM_CHAT_ID = "-1002962073895";

interface NotifyPayload {
  message?: string;
  /** optional — เปิด Markdown formatting ถ้าต้องการ; default = plain text (ปลอดภัยสุด) */
  format?: "plain" | "markdown" | "html";
}

/**
 * notifyBooking
 * - ต้อง login ก่อน (กัน spam จากคนสุ่ม) — รองรับ anonymous auth
 * - ส่งข้อความเข้า Telegram channel ที่ตั้งใน secrets
 * - Default = plain text (ไม่มี parse_mode) เพื่อกัน Markdown parse error
 *   จากตัวอักษรพิเศษใน address/name/emoji
 */
export const notifyBooking = onCall(
  {
    secrets: [TELEGRAM_BOT_TOKEN],
    region: "asia-southeast1",
    enforceAppCheck: false, // ถ้าเปิด App Check ค่อยเปลี่ยนเป็น true
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Sign-in required");
    }

    const data = request.data as NotifyPayload;
    const message = (data?.message || "").toString().trim();
    if (!message) {
      throw new HttpsError("invalid-argument", "message is required");
    }

    // กัน abuse: จำกัดความยาวข้อความ (Telegram limit = 4096)
    if (message.length > 4000) {
      throw new HttpsError("invalid-argument", "message too long");
    }

    // ⚠️ trim — paste ใน terminal มักมี \n หรือ space ติดมา
    const token = TELEGRAM_BOT_TOKEN.value().trim();
    const chatId = TELEGRAM_CHAT_ID; // hardcoded — ไม่ต้อง trim
    if (!token) {
      logger.error("[notifyBooking] bot token missing");
      throw new HttpsError(
        "failed-precondition",
        "TELEGRAM_BOT_TOKEN secret not configured"
      );
    }

    logger.info("[notifyBooking] sending", {
      uid: request.auth.uid,
      isAnonymous: request.auth.token.firebase.sign_in_provider === "anonymous",
      chatId,
      messageLen: message.length,
      format: data.format ?? "plain",
    });

    // สร้าง body — default ไม่ใส่ parse_mode (plain text) เพื่อกัน parse error
    interface TelegramSendBody {
      chat_id: string;
      text: string;
      disable_web_page_preview: boolean;
      parse_mode?: "Markdown" | "MarkdownV2" | "HTML";
    }

    const body: TelegramSendBody = {
      chat_id: chatId,
      text: message,
      disable_web_page_preview: true,
    };

    if (data.format === "markdown") body.parse_mode = "MarkdownV2";
    else if (data.format === "html") body.parse_mode = "HTML";
    // else → plain text, ไม่ใส่ parse_mode

    let res: Response;
    try {
      res = await fetch(
        `https://api.telegram.org/bot${token}/sendMessage`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );
    } catch (err) {
      logger.error("[notifyBooking] fetch failed", err);
      throw new HttpsError("internal", "Failed to reach Telegram API");
    }

    const responseText = await res.text().catch(() => "");

    if (!res.ok) {
      logger.error("[notifyBooking] Telegram API error", {
        status: res.status,
        body: responseText.slice(0, 500),
      });
      throw new HttpsError(
        "internal",
        `Telegram API ${res.status}: ${responseText.slice(0, 200)}`
      );
    }

    logger.info("[notifyBooking] OK", {
      preview: responseText.slice(0, 120),
    });

    return { ok: true };
  }
);
