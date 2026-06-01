// src/components/home/PromiseStrip.tsx
//
// 🆕 Round 28r30 (founder 2026-05-07) — Restored after the Round 28r1
//   removal. Founder direction: "เอากลับมาด้วยในหน้าหลัก" — the
//   strip earns its slot now that it carries three concrete trust
//   signals + an entry-price anchor that didn't exist before.
//
// Layout (matches founder reference):
//   ── WHY SUNRED ──
//   Quiet luxury, *on your schedule.*       ← italic accent in brand red
//   [ Starting from ฿1,800 · No hidden fees ]   ← red pill anchor
//
//   ┌──────────┐  ┌──────────┐  ┌──────────┐
//   │  ✓ icon  │  │  🛏 icon │  │  🌐 icon │
//   │ Licensed │  │ Outcall  │  │ 5 Lang.  │
//   │ Min-veri │  │ Hotel·hr │  │ EN·中·日 │
//   └──────────┘  └──────────┘  └──────────┘
//
// Data principles per CLAUDE.md:
//   • No fabricated stats. Each card states a factual business
//     attribute, not a metric we can't back up.
//   • Entry price ฿1,800 = real (Aroma 60-min base in services.ts).

import React from "react";
import { Box, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
import VerifiedRoundedIcon from "@mui/icons-material/VerifiedRounded";
import HotelRoundedIcon from "@mui/icons-material/HotelRounded";
import LanguageRoundedIcon from "@mui/icons-material/LanguageRounded";

import { brand, fonts } from "@/theme";

interface Pillar {
  Icon: typeof VerifiedRoundedIcon;
  titleKey: string;
  defaultTitle: string;
  subKey: string;
  defaultSub: string;
}

const PILLARS: Pillar[] = [
  {
    Icon: VerifiedRoundedIcon,
    titleKey: "promise.licensed.title",
    defaultTitle: "Licensed",
    subKey: "promise.licensed.sub",
    defaultSub: "Ministry-verified",
  },
  {
    Icon: HotelRoundedIcon,
    titleKey: "promise.outcall.title",
    defaultTitle: "Outcall",
    subKey: "promise.outcall.sub",
    defaultSub: "Your hotel, your hour",
  },
  {
    Icon: LanguageRoundedIcon,
    titleKey: "promise.languages.title",
    defaultTitle: "5 Languages",
    subKey: "promise.languages.sub",
    defaultSub: "EN · 中 · 日 · 한 · TH",
  },
];

const PromiseStrip: React.FC = () => {
  const { t } = useTranslation();

  return (
    <Box
      component="section"
      aria-label="Why SunRed"
      sx={{
        margin: "16px 14px",
        padding: "20px 18px 22px",
        borderRadius: "20px",
        background:
          "#F4F6F5",
        border: "1px solid rgba(255, 255, 255, 0.7)",
        boxShadow: "0 8px 24px rgba(15, 23, 42, 0.06)",
      }}
    >
      {/* Eyebrow with side lines — same editorial pattern as the
          ServiceDetailPage callouts */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "10px",
          marginBottom: "10px",
        }}
      >
        <Box
          aria-hidden
          sx={{
            width: 28,
            height: 1,
            background: "rgba(184, 92, 60, 0.45)",
          }}
        />
        <Typography
          sx={{
            fontFamily: fonts.body,
            fontSize: 10.5,
            fontWeight: 800,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: brand.accent,
          }}
        >
          {t("promise.eyebrow", "Why SunRed")}
        </Typography>
        <Box
          aria-hidden
          sx={{
            width: 28,
            height: 1,
            background: "rgba(184, 92, 60, 0.45)",
          }}
        />
      </Box>

      {/* Title — italic accent in brand red */}
      <Typography
        component="h2"
        sx={{
          fontFamily: fonts.heading,
          fontSize: { xs: 20, sm: 22 },
          fontWeight: 600,
          color: brand.text,
          letterSpacing: "-0.02em",
          lineHeight: 1.2,
          textAlign: "center",
          marginBottom: "10px",
          "& em": {
            fontStyle: "italic",
            fontWeight: 600,
            color: brand.red,
          },
        }}
        dangerouslySetInnerHTML={{
          __html: t(
            "promise.titleHtml",
            "Quiet luxury, <em>on your schedule.</em>"
          ),
        }}
      />

      {/* Entry-price anchor pill */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          marginBottom: "16px",
        }}
      >
        <Box
          sx={{
            display: "inline-flex",
            alignItems: "center",
            padding: "7px 14px",
            borderRadius: 999,
            background: "rgba(180, 0, 10, 0.08)",
            border: "1px solid rgba(15, 23, 42, 0.18)",
            fontFamily: fonts.body,
            fontSize: 12,
            fontWeight: 700,
            color: brand.red,
            letterSpacing: "-0.005em",
          }}
        >
          {t(
            "promise.priceAnchor",
            "Starting from ฿1,800 · No hidden fees"
          )}
        </Box>
      </Box>

      {/* 3 pillar cards */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "8px",
        }}
      >
        {PILLARS.map(({ Icon, titleKey, defaultTitle, subKey, defaultSub }) => (
          <Box
            key={titleKey}
            sx={{
              padding: "14px 8px 12px",
              borderRadius: "14px",
              background: "#FFFFFF",
              border: "1px solid rgba(255, 255, 255, 0.7)",
              boxShadow: "0 2px 8px rgba(15, 23, 42, 0.06)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "8px",
              textAlign: "center",
            }}
          >
            <Box
              aria-hidden
              sx={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                background: `#B4000A`,
                color: "#fff",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 12px rgba(15, 23, 42, 0.30)",
              }}
            >
              <Icon sx={{ fontSize: 20 }} />
            </Box>
            <Box>
              <Typography
                sx={{
                  fontFamily: fonts.heading,
                  fontSize: 13.5,
                  fontWeight: 700,
                  color: brand.text,
                  letterSpacing: "-0.01em",
                  lineHeight: 1.1,
                }}
              >
                {t(titleKey, defaultTitle)}
              </Typography>
              <Typography
                sx={{
                  fontFamily: fonts.body,
                  fontSize: 10.5,
                  fontWeight: 500,
                  color: brand.textMuted,
                  marginTop: "2px",
                  lineHeight: 1.25,
                }}
              >
                {t(subKey, defaultSub)}
              </Typography>
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

export default PromiseStrip;
