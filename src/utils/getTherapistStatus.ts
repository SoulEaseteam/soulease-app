// src/utils/getTherapistStatus.ts

import type { Therapist } from "@/types/therapist";
import { calculateTherapistStatus } from "@/utils/calculateTherapistStatus";

export type Avail = "available" | "bookable" | "resting";

/**
 * คืนสถานะสุดท้ายของ Therapist แบบ 100% safe
 * ตอนนี้ใช้ TherapistEngine v2.0 เป็น single source of truth
 * รองรับ: override, holiday, working hours, busyUntil, activeBooking ฯลฯ
 */
export function getTherapistStatus(t: Therapist): Avail {
  const { status } = calculateTherapistStatus(t);

  // ป้องกันกรณีค่า status แปลก ๆ (เผื่ออนาคตมี type ใหม่)
  if (status === "available" || status === "bookable" || status === "resting") {
    return status;
  }

  // fallback เดิม (กันไว้เฉย ๆ)
  const override = t.statusOverride;
  if (override && override !== "Auto") {
    return override as Avail;
  }

  const auto = t.available;
  if (auto === "available") return "available";
  if (auto === "bookable") return "bookable";
  if (auto === "resting") return "resting";

  return "resting";
}