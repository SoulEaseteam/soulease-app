// src/utils/moderate.ts
//
// 🛡️ Client-side wrapper เรียก Cloud Function `moderateText`
// ใช้ก่อน addDoc booking note / review comment
//
// ปลอดภัย fail-open: ถ้า function down → return false (ไม่ block flow)
// Moderation logic ทั้งหมดอยู่ฝั่ง server (ใช้ OpenAI Moderation API ฟรี)

import { getFunctions, httpsCallable } from "firebase/functions";
import { app as firebaseApp } from "@/lib/firebase";

interface ModerateResult {
  flagged: boolean;
  reason: string;
  categories?: string[];
}

/**
 * ตรวจข้อความว่าเหมาะสมไหม (spam / harassment / sexual content)
 *
 * @returns false = ปลอดภัยให้ส่ง / true = ควรปฏิเสธ
 *
 * @example
 *   if (await isInappropriate(note)) {
 *     toast.error("Note contains inappropriate content");
 *     return;
 *   }
 *   await addDoc(...);
 */
export async function isInappropriate(text: string): Promise<boolean> {
  if (!text || text.trim().length < 3) return false;

  try {
    const functions = getFunctions(firebaseApp, "asia-southeast1");
    const moderate = httpsCallable<{ text: string }, ModerateResult>(
      functions,
      "moderateText"
    );
    const result = await moderate({ text });
    return result.data.flagged;
  } catch (err) {
    // fail-open: ถ้า Cloud Function ขัดข้อง → ไม่ block user
    console.warn("[moderate] check failed, allowing:", err);
    return false;
  }
}
