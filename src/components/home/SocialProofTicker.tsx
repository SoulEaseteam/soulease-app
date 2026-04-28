// src/components/home/SocialProofTicker.tsx
//
// 🌟 Social Proof Ticker — animated booking activity
//
// แสดงรายการจองล่าสุด (mock จาก therapists ที่มี + sample names) เพื่อ:
//   - สร้าง FOMO ("คนอื่นจองอยู่นะ ฉันจะตามไปด้วย")
//   - แสดง social proof ว่าเว็บมีคนใช้จริง
//   - แสดงว่าเว็บรองรับลูกค้าต่างชาติ (flag emoji ของแต่ละชาติ)
//
// Marquee animation — slide ซ้ายไปขวาแบบ infinite

import React, { useMemo } from "react";
import { Box, Typography } from "@mui/material";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

import therapistsData from "@/data/therapists";

interface BookingActivity {
  guestName: string;
  flag: string;
  country: string;
  therapistName: string;
  minutesAgo: number;
}

// 🌍 Mock guest names + countries (Asian foreign tourist focus)
const SAMPLE_GUESTS: { name: string; flag: string; country: string }[] = [
  { name: "Sarah", flag: "🇯🇵", country: "Japan" },
  { name: "Mike", flag: "🇺🇸", country: "USA" },
  { name: "Wei", flag: "🇨🇳", country: "China" },
  { name: "Min-jun", flag: "🇰🇷", country: "Korea" },
  { name: "James", flag: "🇬🇧", country: "UK" },
  { name: "Yuki", flag: "🇯🇵", country: "Japan" },
  { name: "Liu", flag: "🇨🇳", country: "China" },
  { name: "David", flag: "🇦🇺", country: "Australia" },
  { name: "Hyun", flag: "🇰🇷", country: "Korea" },
  { name: "Marc", flag: "🇫🇷", country: "France" },
  { name: "Hassan", flag: "🇦🇪", country: "UAE" },
  { name: "Nattapong", flag: "🇹🇭", country: "Thailand" },
];

/**
 * 🎲 Deterministic pseudo-random based on minute-of-day → ทำให้ทุก user เห็น
 * activity ตรงกัน ใน "ช่วงเวลานั้น" → ดู authentic + ไม่ฟลัป re-render ทุกวินาที
 */
function pseudoRandom(seed: number, max: number): number {
  const x = Math.sin(seed * 9999) * 10000;
  return Math.floor(Math.abs(x - Math.floor(x)) * max);
}

const SocialProofTicker: React.FC = () => {
  const { t } = useTranslation();

  const activities: BookingActivity[] = useMemo(() => {
    // seed ด้วย minute-of-day → update ทุกนาที
    const minute = Math.floor(Date.now() / 60_000);
    const len = 8;
    return Array.from({ length: len }).map((_, i) => {
      const guest = SAMPLE_GUESTS[pseudoRandom(minute + i, SAMPLE_GUESTS.length)];
      const therapist =
        therapistsData[pseudoRandom(minute + i * 3, therapistsData.length)];
      return {
        guestName: guest.name,
        flag: guest.flag,
        country: guest.country,
        therapistName: therapist?.name ?? "a therapist",
        minutesAgo: 1 + pseudoRandom(minute + i * 7, 28), // 1-28 min ago
      };
    });
  }, []);

  // Duplicate items for seamless loop
  const items = [...activities, ...activities];

  return (
    <Box
      sx={{
        mt: 1.5,
        mb: 1,
        py: 0.8,
        borderRadius: 99,
        background: "rgba(255, 255, 255, 0.55)",
        backdropFilter: "blur(10px)",
        border: "1px solid rgba(255, 255, 255, 0.6)",
        overflow: "hidden",
        position: "relative",
        // mask gradient for fade-edges
        WebkitMaskImage:
          "linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)",
        maskImage:
          "linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)",
      }}
      aria-label="Recent booking activity"
    >
      <Box
        component={motion.div}
        animate={{ x: ["0%", "-50%"] }}
        transition={{
          duration: 38,
          ease: "linear",
          repeat: Infinity,
        }}
        sx={{
          display: "flex",
          gap: 3,
          whiteSpace: "nowrap",
          willChange: "transform",
        }}
      >
        {items.map((a, i) => (
          <Box
            key={`${a.guestName}-${a.therapistName}-${i}`}
            sx={{
              display: "inline-flex",
              alignItems: "center",
              gap: 0.5,
              fontSize: 11.5,
              fontWeight: 500,
              color: "rgba(60, 60, 80, 0.85)",
            }}
          >
            <span aria-hidden style={{ fontSize: 13 }}>
              {a.flag}
            </span>
            <span style={{ fontWeight: 700, color: "#7E1F4D" }}>
              {a.guestName}
            </span>
            <span style={{ opacity: 0.65 }}>
              {t("ticker.justBooked", "just booked")}
            </span>
            <span style={{ fontWeight: 700, color: "#6366F1" }}>
              {a.therapistName}
            </span>
            <span style={{ opacity: 0.55, fontSize: 10.5 }}>
              · {a.minutesAgo}m {t("ticker.ago", "ago")}
            </span>
            <span aria-hidden style={{ opacity: 0.4 }}>
              ·
            </span>
          </Box>
        ))}
      </Box>

      {/* 🟢 Live dot */}
      <Box
        component={motion.div}
        animate={{ scale: [1, 1.4, 1], opacity: [1, 0.5, 1] }}
        transition={{ duration: 1.6, repeat: Infinity }}
        sx={{
          position: "absolute",
          left: 8,
          top: "50%",
          transform: "translateY(-50%)",
          width: 8,
          height: 8,
          borderRadius: "50%",
          backgroundColor: "#22C55E",
          boxShadow: "0 0 8px rgba(34, 197, 94, 0.6)",
          zIndex: 2,
        }}
      />
    </Box>
  );
};

export default SocialProofTicker;
