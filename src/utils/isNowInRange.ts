// utils/isNowInRange.ts
/** Parse "HH:mm" safely → minutes since start of day (0..1440) */
function parseHM(hm: string): number | null {
  if (!hm) return null;
  const [hStr = "", mStr = ""] = hm.trim().split(":");
  const h = Number(hStr);
  const m = Number(mStr);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  if (h < 0 || h > 24) return null;
  if (m < 0 || m > 59) return null;
  // 24:00 is allowed and equals 1440 minutes; any 24:MM where MM>0 is invalid
  if (h === 24 && m !== 0) return null;
  return h * 60 + m;
}

/** Minutes since start of the day (local time) */
function nowMinutes(): number {
  const n = new Date();
  return n.getHours() * 60 + n.getMinutes();
}

/**
 * ตรวจว่า "ตอนนี้" อยู่ในช่วงเวลา start..end (รวมปลายทั้งคู่)
 * - รองรับช่วงข้ามวัน เช่น 22:00–05:00
 * - รองรับ "24:00" เป็นปลายวัน
 */
export function isNowInRange(start: string, end: string): boolean {
  const s = parseHM(start);
  const e = parseHM(end);
  if (s === null || e === null) {
    console.warn("[isNowInRange] invalid input:", { start, end });
    return false;
  }

  const now = nowMinutes();

  if (e === s) {
    // ช่วงศูนย์ความยาว: อนุโลมว่า “ทั้งวัน” ถ้าเป็น 00:00–00:00 หรือ 24:00–24:00
    // ถ้าต้องการตีความเป็น “ไม่มีช่วง” ให้ return false แทน
    return true;
  }

  if (e > s) {
    // ช่วงปกติในวันเดียว เช่น 09:00–18:00
    return now >= s && now <= e;
  } else {
    // ช่วงข้ามวัน เช่น 22:00–05:00
    return now >= s || now <= e;
  }
}

/** เวอร์ชันเลือกเวลาเอง ไม่ยึด “ตอนนี้” */
export function isTimeInRange(start: string, end: string, when: Date): boolean {
  const s = parseHM(start);
  const e = parseHM(end);
  if (s === null || e === null) return false;

  const t = when.getHours() * 60 + when.getMinutes();

  if (e === s) return true;
  if (e > s) return t >= s && t <= e;
  return t >= s || t <= e;
}