// src/components/home/AreaChips.tsx
//
// 🗺️ Bangkok Area Quick-Filter
// แสดงพื้นที่ยอดฮิตในกรุงเทพ — ลูกค้าต่างชาติเลือกตามชื่อโรงแรม/ย่านที่อยู่
//
// SEO bonus: sync ?area= ใน URL (sitemap.xml มี URLs เหล่านี้แล้ว) →
// Google index เป็น landing pages แยก = "massage sukhumvit" rank ขึ้น

import React from "react";
import { Box, Typography } from "@mui/material";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

import HotelIcon from "@mui/icons-material/Hotel";

export type BangkokArea =
  | "all"
  | "sukhumvit"
  | "silom"
  | "thonglor"
  | "asok"
  | "siam"
  | "pratunam";

interface AreaDef {
  key: BangkokArea;
  label: string;
  emoji: string;
}

// 6 พื้นที่หลักที่ลูกค้าต่างชาติพักโรงแรมเยอะที่สุด
const AREAS: AreaDef[] = [
  { key: "all", label: "All Bangkok", emoji: "🌆" },
  { key: "sukhumvit", label: "Sukhumvit", emoji: "🏙️" },
  { key: "silom", label: "Silom", emoji: "🏢" },
  { key: "thonglor", label: "Thonglor", emoji: "✨" },
  { key: "asok", label: "Asok", emoji: "🚇" },
  { key: "siam", label: "Siam", emoji: "🛍️" },
  { key: "pratunam", label: "Pratunam", emoji: "🏨" },
];

interface AreaChipsProps {
  active: BangkokArea;
  onChange: (a: BangkokArea) => void;
}

const AreaChips: React.FC<AreaChipsProps> = ({ active, onChange }) => {
  const { t } = useTranslation();

  return (
    <Box sx={{ mt: 0.5, mb: 1 }}>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 0.6,
          mb: 0.6,
          px: 0.5,
        }}
      >
        <HotelIcon
          sx={{ fontSize: 14, color: "rgba(120, 105, 130, 0.65)" }}
        />
        <Typography
          sx={{
            fontSize: 10.5,
            letterSpacing: 1.3,
            fontWeight: 600,
            color: "rgba(120, 105, 130, 0.7)",
            textTransform: "uppercase",
          }}
        >
          {t("area.title", "Choose your area")}
        </Typography>
      </Box>

      <Box
        sx={{
          display: "flex",
          gap: 0.7,
          overflowX: "auto",
          pb: 0.7,
          px: 0.5,
          scrollbarWidth: "none",
          "&::-webkit-scrollbar": { display: "none" },
          WebkitOverflowScrolling: "touch",
        }}
        role="tablist"
        aria-label="Bangkok area filter"
      >
        {AREAS.map((a) => {
          const isActive = active === a.key;
          return (
            <Box
              key={a.key}
              component={motion.button}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onChange(a.key)}
              whileTap={{ scale: 0.94 }}
              whileHover={{ scale: 1.04, y: -2 }}
              sx={{
                flexShrink: 0,
                display: "inline-flex",
                alignItems: "center",
                gap: 0.4,
                px: 1.3,
                py: 0.55,
                borderRadius: 99,
                fontSize: 11.5,
                fontWeight: 600,
                cursor: "pointer",
                border: "1px solid rgba(255,255,255,0.6)",
                transition: "background 0.25s, color 0.25s, box-shadow 0.25s",
                ...(isActive
                  ? {
                      background:
                        "linear-gradient(135deg, #FFE5D9 0%, #E5D0FF 100%)",
                      color: "#7E1F4D",
                      boxShadow: "0 4px 12px rgba(99, 102, 241, 0.18)",
                    }
                  : {
                      backgroundColor: "rgba(255,255,255,0.6)",
                      color: "rgba(60, 60, 80, 0.7)",
                      backdropFilter: "blur(6px)",
                    }),
              }}
            >
              <span aria-hidden>{a.emoji}</span>
              {t(`area.${a.key}`, a.label)}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};

export default AreaChips;
