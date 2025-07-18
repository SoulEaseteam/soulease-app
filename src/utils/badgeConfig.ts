// src/utils/badgeConfig.ts
import { BadgeConfig } from '@/types/therapist';

export const badgeConfig: BadgeConfig[] = [
  {
    key: 'VIP',
    image: '/badges/vip.gif',
    priority: 1,
    animation: 'pulse',
    size: 50,
    position: { top: -10, left: -10 },
    condition: (t) => t.todayBookings >= 5,
  },
  {
    key: 'HOT',
    image: '/badges/hot.gif',
    priority: 2,
    animation: 'float',
    size: 45,
    position: { top: -5, left: -5 },
    condition: (t) => t.todayBookings >= 3 && t.todayBookings < 5,
  },
  {
    key: 'NEW',
    image: '/badges/new.gif',
    priority: 3,
    animation: 'none',
    size: 40,
    position: { top: 0, left: 0 },
    condition: (t) => t.totalBookings < 100,
  },
];