// src/utils/therapistBadge.ts
import { Therapist } from '@/types/therapist';

export type BadgeType = 'VIP' | 'HOT' | 'NEW';

interface BadgeConfig {
  key: BadgeType;
  image: string;
  priority: number;
  animation: 'pulse' | 'float' | 'none';
  size: number;
  position: { top: number; right: number };
  condition: (therapist: Therapist) => boolean;
}

// ✅ Badge Configuration
export const badgeConfig: BadgeConfig[] = [
  {
    key: 'VIP',
    image: '/badges/Star.gif',
    priority: 1,
    animation: 'pulse',
    size: 32,
    position: { top: 10, right: 10 }, // ✅ ต้องใส่ comma
    condition: (t) => (t.todayBookings || 0) >= 5,
  },
  {
    key: 'HOT',
    image: '/badges/hot.gif',
    priority: 2,
    animation: 'float',
    size: 30,
    position: { top: 10, right: 10 },
    condition: (t) => (t.todayBookings || 0) >= 3,
  },
  {
    key: 'NEW',
    image: '/badges/New.gif',
    priority: 3,
    animation: 'none',
    size: 80,
    position: { top: -30, right: -20 },
    condition: (t) => (t.totalBookings || 0) < 100,
  },
];

// ✅ คืนค่า badge ตัวเดียว (ลำดับความสำคัญสูงสุด)
export function getTherapistBadge(therapist: Therapist) {
  return badgeConfig
    .filter((b) => b.condition(therapist))
    .sort((a, b) => a.priority - b.priority)[0] || null;
}

// ✅ คืนค่า badge ทั้งหมดที่เข้าเงื่อนไข
export function getAllTherapistBadges(therapist: Therapist) {
  return badgeConfig.filter((b) => b.condition(therapist));
}