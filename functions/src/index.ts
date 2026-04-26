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
//
// เรียกจาก client (BookingPage.tsx) ผ่าน httpsCallable:
//   import { getFunctions, httpsCallable } from "firebase/functions";
//   const fn = httpsCallable(getFunctions(), "notifyBooking");
//   await fn({ message: "..." });

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { initializeApp } from "firebase-admin/app";

initializeApp();

// Secrets — ตั้งค่าผ่าน `firebase functions:secrets:set <NAME>`
const TELEGRAM_BOT_TOKEN = defineSecret("TELEGRAM_BOT_TOKEN");
const TELEGRAM_CHAT_ID = defineSecret("TELEGRAM_CHAT_ID");

interface NotifyPayload {
  message?: string;
}

/**
 * notifyBooking
 * - ต้อง login ก่อน (กัน spam จากคนสุ่ม)
 * - ส่งข้อความเข้า Telegram channel ที่ตั้งใน secrets
 */
export const notifyBooking = onCall(
  {
    secrets: [TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID],
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

    // กัน abuse: จำกัดความยาวข้อความ
    if (message.length > 4000) {
      throw new HttpsError("invalid-argument", "message too long");
    }

    const token = TELEGRAM_BOT_TOKEN.value();
    const chatId = TELEGRAM_CHAT_ID.value();
    if (!token || !chatId) {
      throw new HttpsError("failed-precondition", "Telegram secrets not configured");
    }

    const res = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: "Markdown",
        }),
      }
    );

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new HttpsError("internal", `Telegram API error: ${res.status} ${txt}`);
    }

    return { ok: true };
  }
);
