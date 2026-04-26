// src/utils/therapists/sortTherapists.ts
import dayjs from "dayjs";
import type { Avail } from "./computeTherapistStatus";

export function makeTherapistSorter() {
  const rank: Record<Avail, number> = { available: 0, bookable: 1, resting: 2 };

  return (a: any, b: any) => {
    // 1) สถานะ
    const rs = (rank[a.available as Avail] ?? 2) - (rank[b.available as Avail] ?? 2);
    if (rs !== 0) return rs;

    // 2) ออนไลน์ (true มาก่อน)
    if (a._online !== b._online) return (b._online ? 1 : 0) - (a._online ? 1 : 0);

    // 3) ระยะทาง (น้อยมาก่อน; undefined ไปท้าย)
    const da = typeof a.distance === "number" ? a.distance : Number.POSITIVE_INFINITY;
    const db = typeof b.distance === "number" ? b.distance : Number.POSITIVE_INFINITY;
    if (da !== db) return da - db;

    // 4) เวลาว่างถัดไป (Now มาก่อน, จากนั้นเวลาเร็วกว่า)
    const aSort = a.nextAvailable === "Now"
      ? -1
      : (a._nextSort ?? Number.POSITIVE_INFINITY);
    const bSort = b.nextAvailable === "Now"
      ? -1
      : (b._nextSort ?? Number.POSITIVE_INFINITY);
    if (aSort !== bSort) return aSort - bSort;

    // 5) rating (มากก่อน)
    const ra = Number(a.rating ?? 0);
    const rb = Number(b.rating ?? 0);
    if (ra !== rb) return rb - ra;

    // 6) ชื่อ ก-ฮ
    return String(a.name ?? "").localeCompare(String(b.name ?? ""));
  };
}

export function toNextSortValue(hhmm?: string | null) {
  if (!hhmm || !/^\d{2}:\d{2}$/.test(hhmm)) return undefined;
  return dayjs().hour(+hhmm.slice(0, 2)).minute(+hhmm.slice(3, 5)).second(0).millisecond(0).valueOf();
}