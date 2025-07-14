import { Therapist, BadgeConfig } from '@/types/therapist';

export const badgeConfig: BadgeConfig[] = [
  {
    key: 'VIP',
    image: '/badges/Star.gif',
    priority: 1,
    animation: 'pulse',
    size: 32,
    position: { top: 10, left: 10 },
    // แสดงเฉพาะพนักงานที่จองวันนี้ >= 5 และสถานะ available หรือ bookable เท่านั้น
    condition: (t) => (t.todayBookings ?? 0) >= 5 && (t.available === 'available' || t.available === 'bookable'),
  },
  {
    key: 'HOT',
    image: '/badges/hot.gif',
    priority: 2,
    animation: 'float',
    size: 30,
    position: { top: 10, left: 10 },
    // แสดงสำหรับจองวันนี้ 3-4 ครั้ง และสถานะ available หรือ bookable
    condition: (t) => {
      const today = t.todayBookings ?? 0;
      return today >= 3 && today < 5 && (t.available === 'available' || t.available === 'bookable');
    },
  },
  {
    key: 'NEW',
    image: '/badges/New.gif',
    priority: 3,
    animation: 'none',
    size: 80,
    position: { top: -30, left: -20 },
    // แสดงสำหรับพนักงานที่มีจำนวนจองสะสมต่ำกว่า 100 และสถานะ available หรือ bookable
    condition: (t) => (t.totalBookings ?? 0) < 100 && (t.available === 'available' || t.available === 'bookable'),
  },
];

export function getTherapistBadge(therapist: Therapist): BadgeConfig | null {
  const matchedBadges = badgeConfig.filter((b) => b.condition(therapist));
  if (matchedBadges.length === 0) return null;
  matchedBadges.sort((a, b) => a.priority - b.priority);
  return matchedBadges[0];
}