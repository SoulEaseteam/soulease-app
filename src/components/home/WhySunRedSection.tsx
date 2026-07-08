// src/components/home/WhySunRedSection.tsx
//
// 🆕 Round 28r74 · Nordic sections build (2026-07-08)
// ─────────────────────────────────────────────────────────────────────
// "Why SunRed" — 4 features in a 2×2 grid (mobile) or 4-column row
// (desktop). Each feature is an outlined 40px icon circle + a Sarabun
// Thai line. Matches mockup phone-2 "why-section"
// (outputs/sunred-nordic-gray-mockup.html:462-505).
//
// Icon choices (phosphor-react, matching the mockup's line-icon vibe):
//   1. Practitioner curation → UserCircle
//   2. Safe & private       → ShieldCheck
//   3. 24-hour service      → Clock
//   4. Concierge support    → Headphones
// ─────────────────────────────────────────────────────────────────────

import React from "react";
import { Box } from "@mui/material";
import { useTranslation } from "react-i18next";
import {
  UserCircle,
  ShieldCheck,
  Clock,
  Headphones,
} from "phosphor-react";
import { fonts } from "@/theme";

type Feature = {
  key: string;
  Icon: typeof UserCircle;
  textTh: string;
};

const WhySunRedSection: React.FC = () => {
  const { t } = useTranslation();

  const features: Feature[] = [
    {
      key: "professional",
      Icon: UserCircle,
      textTh: "คัดสรรหมอนวด มืออาชีพ",
    },
    {
      key: "private",
      Icon: ShieldCheck,
      textTh: "ปลอดภัย เป็นส่วนตัว",
    },
    {
      key: "always-on",
      Icon: Clock,
      textTh: "บริการ 24 ชม. พร้อมดูแล",
    },
    {
      key: "support",
      Icon: Headphones,
      textTh: "แอดมินคอย ตลอดการจอง",
    },
  ];

  return (
    <Box
      component="section"
      aria-label="Why SunRed"
      sx={{
        margin: { xs: "28px 12px 0", md: "36px 12px 0" },
        padding: { xs: "22px 20px 24px", md: "28px 28px 30px" },
      }}
    >
      <Box
        component="h2"
        sx={{
          fontFamily: fonts.heading,
          fontSize: { xs: 22, md: 26 },
          fontWeight: 500,
          color: "#4B4B48", // GRAY_900
          margin: 0,
          letterSpacing: "-0.005em",
          lineHeight: 1.15,
        }}
      >
        {t("home.why.title", "Why SunRed")}
      </Box>
      <Box
        sx={{
          fontFamily: fonts.body,
          fontSize: 11.5,
          color: "#6E6E6A", // GRAY_600
          marginTop: "4px",
          marginBottom: { xs: "20px", md: "24px" },
        }}
      >
        ทำไมต้อง SunRed
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "repeat(2, 1fr)",
            md: "repeat(4, 1fr)",
          },
          gap: { xs: "24px 16px", md: "24px" },
        }}
      >
        {features.map(({ key, Icon, textTh }) => (
          <Box
            key={key}
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              gap: "10px",
            }}
          >
            <Box
              sx={{
                width: 42,
                height: 42,
                borderRadius: "50%",
                background: "transparent",
                border: "1px solid #CFCFCB", // NEUTRAL_300
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#4B4B48", // GRAY_800
              }}
            >
              <Icon size={20} weight="regular" />
            </Box>
            <Box
              sx={{
                fontFamily: fonts.body,
                fontSize: 12,
                fontWeight: 400,
                color: "#4B4B48", // GRAY_800
                lineHeight: 1.5,
                letterSpacing: 0,
              }}
            >
              {textTh}
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

export default WhySunRedSection;
