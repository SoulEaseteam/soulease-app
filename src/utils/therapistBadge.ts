// src/utils/therapistBadge.ts
import { Therapist } from '@/types/therapist';

export type BadgeType = 'VIP' | 'HOT' | 'NEW';

interface BadgeConfig {
  key: BadgeType;
  image: string;
  priority: number; // 1 = สำคัญสุด
  animation: 'pulse' | 'float' | 'none';
  size: number;
  position: { top: number; right: number };
  condition: (therapist: Therapist) => boolean;
}

// 🔥 Badge Rules
export const badgeConfig: BadgeConfig[] = [
  {
    key: 'VIP',
    image: '/badges/Star.gif',
    priority: 1,
    animation: 'pulse',
    size: 32,
    position: { top: 10, right: 10 },
    condition: (t) => (t.todayBookings || 0) >= 5 && t.available !== 'holiday',
  },
  {
    key: 'HOT',
    image: '/badges/hot.gif',
    priority: 2,
    animation: 'float',
    size: 30,
    position: { top: 10, right: 10 },
    condition: (t) => (t.todayBookings || 0) >= 3 && (t.todayBookings || 0) < 5 && t.available !== 'holiday',
  },
  {
    key: 'NEW',
    image: '/badges/New.gif',
    priority: 3,
    animation: 'none',
    size: 80,
    position: { top: -30, right: -20 },
    condition: (t) => (t.totalBookings || 0) < 100 && t.available !== 'holiday',
  },
];

// ✅ Return highest-priority badge
export function getTherapistBadge(therapist: Therapist): BadgeConfig | null {
  return (
    badgeConfig
      .filter((b) => b.condition(therapist))
      .sort((a, b) => a.priority - b.priority)[0] || null
  );
}

// ✅ Return all matched badges (ถ้าอยากแสดงหลายอันพร้อมกัน)
export function getAllTherapistBadges(therapist: Therapist): BadgeConfig[] {
  return badgeConfig.filter((b) => b.condition(therapist));
}