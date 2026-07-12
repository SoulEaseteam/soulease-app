// src/components/home/HomeHero.tsx
//
// 🆕 Round 28u.2 — เปลี่ยน hero เป็นรูป AI-generated banner ที่ founder ให้มา
//   (hero.png — woman in SunRed uniform, cream/pink tones, "PREMIUM OUTCALL
//   MASSAGE" headline baked into the image). ไม่มี text overlay — แสดงรูปเต็ม
//   + Book Now button ลอยอยู่ที่มุมซ้ายล่าง.
// ─────────────────────────────────────────────────────────────────────

import React from "react";
import { Box } from "@mui/material";

const HERO_IMG = "/images/hero/hero.png";

const HomeHero: React.FC = () => {

  return (
    <Box
      component="section"
      aria-label="SunRed — Bangkok outcall massage, delivered to your hotel"
      sx={{
        position: "relative",
        margin: { xs: "12px 12px 8px", md: "20px 12px 12px" },
        borderRadius: { xs: "22px", md: "26px" },
        border: "1px solid var(--sr-hero-border)",
        boxShadow: "var(--sr-card-shadow)",
        overflow: "hidden",
        // ไม่ fix height — ให้รูปกำหนด height ตาม aspect ratio เอง
        // ผล: เห็นรูปเต็มทุกขนาดหน้าจอ ไม่ถูก crop
      }}
    >
      {/* Banner image — แสดงเต็มรูป ไม่ crop, width 100%, height auto */}
      <Box
        component="img"
        src={HERO_IMG}
        alt="SunRed — Premium Outcall Massage Bangkok, บริการนวดระดับพรีเมียม ถึงโรงแรมหรือบ้านคุณ"
        sx={{
          display: "block",
          width: "100%",
          height: "auto",
        }}
      />

      {/* ไม่มี overlay — QuickNavRow ลอยคาบขอบล่างแทน */}
    </Box>
  );
};

export default HomeHero;
