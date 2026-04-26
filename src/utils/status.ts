// src/utils/status.ts
export type StatusType = "available" | "bookable" | "resting";
export type ModeType = "auto" | "manual";

/**
 * คืนสถานะตามเวลางานและการจอง
 */
export function getScheduledStatus(
  startTime: string,
  endTime: string,
  now: Date,
  hasBooking: boolean = false
): StatusType {
  if (!startTime || !endTime) return "resting";

  const [startHour, startMinute] = startTime.split(":").map(Number);
  const [endHour, endMinute] = endTime.split(":").map(Number);

  const start = new Date(now);
  start.setHours(startHour, startMinute, 0, 0);

  const end = new Date(now);
  end.setHours(endHour, endMinute, 0, 0);

  const inWorkHours =
    start < end
      ? now >= start && now <= end
      : now >= start || now <= end; // กรณีข้ามวัน

  if (inWorkHours) {
    return hasBooking ? "bookable" : "available";
  }
  return "resting";
}

/**
 * หา boundary ถัดไป (เวลาที่สถานะจะเปลี่ยนครั้งต่อไป)
 */
export function getNextBoundary(
  startTime: string,
  endTime: string,
  now: Date
): Date {
  const [startHour, startMinute] = startTime.split(":").map(Number);
  const [endHour, endMinute] = endTime.split(":").map(Number);

  const start = new Date(now);
  start.setHours(startHour, startMinute, 0, 0);

  const end = new Date(now);
  end.setHours(endHour, endMinute, 0, 0);

  const inWorkHours =
    start < end
      ? now >= start && now <= end
      : now >= start || now <= end;

  if (inWorkHours) {
    // ตอนนี้อยู่ในเวลางาน → boundary ถัดไปคือเวลาเลิกงาน
    if (now > end) {
      // ถ้าเวลาทำงานข้ามวัน ต้องเลื่อนไปวันถัดไป
      end.setDate(end.getDate() + 1);
    }
    return end;
  } else {
    // ตอนนี้อยู่นอกเวลางาน → boundary ถัดไปคือเวลาเริ่มงาน
    if (now > start) {
      start.setDate(start.getDate() + 1);
    }
    return start;
  }
}