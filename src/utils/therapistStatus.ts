// src/utils/therapistStatus.ts
import dayjs from "dayjs";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export type TherapistStatus =
  | "available"
  | "bookable"
  | "resting"
  | "holiday";

export type TherapistStatusOverride =
  | "Auto"
  | "available"
  | "bookable"
  | "resting"
  | null;

// === Helpers ===
function toHM(d: dayjs.Dayjs) {
  return d.format("HH:mm");
}

function parseHM(hm?: string) {
  const [h = "0", m = "0"] = String(hm || "00:00").split(":");
  return { h: Number(h), m: Number(m) };
}

function getWorkingWindow(startTime?: string, endTime?: string) {
  const now = dayjs();
  const { h: sh, m: sm } = parseHM(startTime);
  const { h: eh, m: em } = parseHM(endTime);

  let start = now.hour(sh).minute(sm).second(0).millisecond(0);
  let end = now.hour(eh).minute(em).second(0).millisecond(0);

  const crossesMidnight = end.isSame(start) || end.isBefore(start);

  if (crossesMidnight) {
    // เช่น 20:00 - 04:00
    if (now.isBefore(end) || now.isSame(end)) {
      start = start.subtract(1, "day");
    } else {
      end = end.add(1, "day");
    }
  }

  return { now, start, end };
}

/**
 * คำนวณ nextAvailable (HH:mm)
 */
export function calculateNextAvailable(
  serviceDurationMinutes: number,
  startTime: string,
  endTime: string
): string {
  const { now, start, end } = getWorkingWindow(startTime, endTime);
  const proposed = now.add(serviceDurationMinutes, "minute");

  if (proposed.isAfter(end)) {
    return toHM(start.add(1, "day"));
  }

  return toHM(proposed);
}

/**
 * สถานะกลางของทั้งระบบ
 * ลำดับความสำคัญ:
 * 1) statusOverride ถ้าไม่ใช่ Auto
 * 2) isHoliday
 * 3) เวลาเข้างาน
 * 4) isBooked
 */
export function computeStatus(options: {
  startTime?: string;
  endTime?: string;
  isBooked?: boolean;
  isHoliday?: boolean;
  statusOverride?: TherapistStatusOverride;
}): TherapistStatus {
  const {
    startTime,
    endTime,
    isBooked = false,
    isHoliday = false,
    statusOverride = null,
  } = options;

  // 1) Manual override มาก่อนเสมอ
  if (
    statusOverride &&
    statusOverride !== "Auto" &&
    ["available", "bookable", "resting"].includes(statusOverride)
  ) {
    return statusOverride as TherapistStatus;
  }

  // 2) Holiday
  if (isHoliday) return "holiday";

  // 3) ไม่มีเวลางาน
  if (!startTime || !endTime) return "resting";

  const { now, start, end } = getWorkingWindow(startTime, endTime);

  const inWorkingHours =
    (now.isAfter(start) || now.isSame(start)) &&
    (now.isBefore(end) || now.isSame(end));

  if (!inWorkingHours) return "resting";

  // 4) อยู่ในเวลางาน
  return isBooked ? "bookable" : "available";
}

/**
 * อัปเดต nextAvailable และสถานะลง Firestore
 */
export async function updateNextAvailableInFirestore(params: {
  therapistId: string;
  serviceDurationMinutes: number;
  startTime: string;
  endTime: string;
  alsoUpdateStatus?: boolean;
  isBooked?: boolean;
  isHoliday?: boolean;
  statusOverride?: TherapistStatusOverride;
}) {
  const {
    therapistId,
    serviceDurationMinutes,
    startTime,
    endTime,
    alsoUpdateStatus = false,
    isBooked = false,
    isHoliday = false,
    statusOverride = null,
  } = params;

  const nextAvailable = calculateNextAvailable(
    serviceDurationMinutes,
    startTime,
    endTime
  );

  const payload: Record<string, any> = { nextAvailable };

  if (alsoUpdateStatus) {
    const status = computeStatus({
      startTime,
      endTime,
      isBooked,
      isHoliday,
      statusOverride,
    });

    // เก็บทั้งสอง field เผื่อหน้าระบบเก่ายังอ่าน available อยู่
    payload.computedStatus = status;
    payload.available = status;
  }

  try {
    await updateDoc(doc(db, "therapists", therapistId), payload);
    if (import.meta.env.DEV) console.log(`[therapistStatus] updated for ${therapistId}:`, payload);
  } catch (error) {
    console.error("[therapistStatus] Failed to update:", error);
  }
}