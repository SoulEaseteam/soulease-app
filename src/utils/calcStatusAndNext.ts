// src/utils/calcStatusAndNext.ts

export type AvailableStatus = "available" | "bookable" | "resting";
export type StatusOverride = AvailableStatus | "Auto" | null;

export type BookingLike = {
  startAt: string | Date;
  endAt: string | Date;
  status?: string;
};

function nowThai(): Date {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utc + 7 * 60 * 60000);
}

function toMs(v: string | Date) {
  return v instanceof Date ? v.getTime() : new Date(v).getTime();
}

/** แปลง HH:MM → milliseconds ของ “วันนี้” แต่รองรับข้ามวัน */
function parseWorkRange(now: Date, startHHMM?: string, endHHMM?: string) {
  const [sh = 0, sm = 0] = (startHHMM ?? "00:00").split(":").map(Number);
  const [eh = 0, em = 0] = (endHHMM ?? "00:00").split(":").map(Number);

  const start = new Date(now);
  const end = new Date(now);

  start.setHours(sh, sm, 0, 0);
  end.setHours(eh, em, 0, 0);

  let s = start.getTime();
  let e = end.getTime();
  let n = now.getTime();

  // ⏱ ข้ามวัน เช่น 19:00–05:00
  if (e <= s) {
    e += 86400_000; // +1 วัน
    if (n < s) n += 86400_000;
  }

  return { startMs: s, endMs: e, nowMs: n, inWork: n >= s && n <= e };
}

export function calcStatusAndNext(
  _now: Date,
  bookings: BookingLike[],
  opts: { startHHMM?: string; endHHMM?: string; override?: StatusOverride }
): { status: AvailableStatus; nextAvailable: string | null } {
  const now = nowThai();
  const { startHHMM, endHHMM, override } = opts;

  // 1) Manual override
  if (override && override !== "Auto") {
    return { status: override, nextAvailable: null };
  }

  // 2) Check working hours
  const { startMs, endMs, nowMs, inWork } = parseWorkRange(now, startHHMM, endHHMM);

  if (!inWork) {
    // นอกเวลางาน
    let s = startMs;
    if (nowMs > startMs) {
      s += 86400_000; // วันถัดไป
    }
    const next = new Date(s);
    return {
      status: "resting",
      nextAvailable: `${next.getHours().toString().padStart(2, "0")}:${next
        .getMinutes()
        .toString()
        .padStart(2, "0")}`,
    };
  }

  // 3) อยู่ในเวลางาน → ดูงานที่ทับ
  let nextAvailable: number | null = null;

  for (const b of bookings) {
    const s = toMs(b.startAt);
    const e = toMs(b.endAt);

    // งานกำลังทำอยู่
    if (nowMs >= s && nowMs < e) {
      nextAvailable = e;
      return {
        status: "bookable",
        nextAvailable: new Date(e).toTimeString().slice(0, 5),
      };
    }

    // จองอนาคต → หาที่ใกล้ที่สุด
    if (s > nowMs) {
      if (!nextAvailable || s < nextAvailable) nextAvailable = s;
    }
  }

  // 4) ไม่มีงานตอนนี้ → available
  if (nextAvailable) {
    return {
      status: "available",
      nextAvailable: new Date(nextAvailable).toTimeString().slice(0, 5),
    };
  }

  return { status: "available", nextAvailable: "Now" };
}