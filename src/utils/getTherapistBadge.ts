// src/utils/getTherapistBadge.ts

export interface BadgeConfig {
  key: "VIP" | "HOT" | "NEW" | null;
  label: string;
  priority: number;
  expiresAt?: number;
  shouldUpdateFirestore?: boolean; 
}

const BADGE_TTL = 24 * 60 * 60 * 1000; // 24 ชั่วโมง

export function getBadgeForTherapist(t: {
  todayBookings?: number;
  totalBookings?: number;
  badgeKey?: string | null;
  badgeUpdatedAt?: number | null;
}): BadgeConfig {
  const today = t.todayBookings ?? 0;
  const total = t.totalBookings ?? 0;

  const storedKey = t.badgeKey || null;
  const storedAt = t.badgeUpdatedAt || null;
  const now = Date.now();

  // -------------------------------
  // 1) ถ้ามี badge เดิม + ยังไม่หมดอายุ → ใช้อันเดิมก่อน
  // -------------------------------
  if (storedKey && storedAt && now - storedAt < BADGE_TTL) {
    return {
      key: storedKey as any,
      label:
        storedKey === "VIP"
          ? "VIP Therapist"
          : storedKey === "HOT"
          ? "Hot Therapist"
          : storedKey === "NEW"
          ? "New Therapist"
          : "",
      priority:
        storedKey === "VIP" ? 1 : storedKey === "HOT" ? 2 : storedKey === "NEW" ? 3 : 999,
      expiresAt: storedAt + BADGE_TTL,
      shouldUpdateFirestore: false, // ❗ไม่ต้องเซฟซ้ำ
    };
  }

  // -------------------------------
  // 2) คำนวณ badge ใหม่ตามเงื่อนไขสด
  // -------------------------------
  let newKey: "VIP" | "HOT" | "NEW" | null = null;

  if (today >= 5) newKey = "VIP";
  else if (today >= 3) newKey = "HOT";
  else if (total < 50) newKey = "NEW";

  // -------------------------------
  // 3) ตรวจว่าต้องอัปเดต Firestore ไหม?
  // -------------------------------
  const shouldUpdate = newKey !== storedKey;

  return {
    key: newKey,
    label:
      newKey === "VIP"
        ? "VIP Therapist"
        : newKey === "HOT"
        ? "Hot Therapist"
        : newKey === "NEW"
        ? "New Therapist"
        : "",
    priority: newKey === "VIP" ? 1 : newKey === "HOT" ? 2 : newKey === "NEW" ? 3 : 999,
    expiresAt: now + BADGE_TTL,
    shouldUpdateFirestore: shouldUpdate,
  };
}