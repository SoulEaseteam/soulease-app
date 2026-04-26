// src/utils/badgeConfig.ts
import type { Therapist } from "@/types/therapist";

export interface BadgeConfig {
  key: "VIP" | "HOT" | "NEW";
  image: string;
  priority: number;
  animation?: "pulse" | "float" | "none";
  size: number;
  position: { top: number; left: number };
  condition: (t: Therapist) => boolean;
}

export const badgeConfig: BadgeConfig[] = [
  {
    key: "VIP",
    image: "/badges/Best (1).gif",
    priority: 1,
    animation: "pulse",
    size: 76,
    position: { top: -30, left: 120 },

    // ⭐ VIP = todayBookings ≥ 5
    condition: (t) => (t.todayBookings ?? 0) >= 5,
  },

  {
    key: "HOT",
    image: "/badges/Star.gif",
    priority: 2,
    animation: "float",
    size: 76,
    position: { top: -30, left: 120 },

    // 🔥 HOT = todayBookings 3–4
    condition: (t) => {
      const b = t.todayBookings ?? 0;
      return b >= 3 && b < 5;
    },
  },

  {
    key: "NEW",
    image: "/badges/New (1).gif",
    priority: 3,
    animation: "none",
    size: 76,
    position: { top: -30, left: 120 },

    // 🆕 NEW = totalBookings < 50
    condition: (t) => (t.totalBookings ?? 0) < 50,
  },
];