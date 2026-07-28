// functions/src/config.ts
//
// Shared module-level configuration: secret bindings + hardcoded constants
// used across more than one domain module.

import { defineSecret } from "firebase-functions/params";

// 🔑 Secrets
export const TELEGRAM_BOT_TOKEN = defineSecret("TELEGRAM_BOT_TOKEN");
export const OPENAI_API_KEY = defineSecret("OPENAI_API_KEY");

// 📬 Channel ID ของ Telegram — hardcode (ไม่ใช่ secret)
export const TELEGRAM_CHAT_ID = "-1002962073895";

// 🆕 Round 28s82 (founder 2026-05-31: "เอาแค่ส่งหาฉันคนเดียวก่อน") —
//   master kill-switch for the therapist DM on a new booking. While
//   OFF, only the admin group gets the alert and View dispatches
//   manually. Flip to `true` once practitioners have linked their
//   Telegram (via /start) and View is ready to auto-DM them.
export const DISPATCH_THERAPIST_DM = false;
