// src/utils/dateHelpers.ts

/**
 * แปลง Firestore Timestamp / Date / string / number → JS Date
 * คืน null ถ้า invalid
 */
export function toDateLike(v: any): Date | null {
  if (!v) return null;

  // Firestore Timestamp
  if (typeof v?.toDate === "function") {
    const d = v.toDate();
    return isNaN(d.getTime()) ? null : d;
  }

  if (v instanceof Date) return isNaN(v.getTime()) ? null : v;

  // string / number
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Format Date → "HH:mm"
 */
export function formatHHMM(d: Date): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/**
 * เวลาไทย (UTC+7)
 */
export function nowThai(): Date {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utc + 7 * 3600 * 1000);
}
