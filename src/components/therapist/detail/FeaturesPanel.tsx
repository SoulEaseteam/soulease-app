// src/components/therapist/detail/FeaturesPanel.tsx
//
// 🆕 Round 28s220 — Rolodex-style features list (founder ref: ROLADEX
//   competitor screenshot). Premium info-table rendering of physical
//   + personality descriptors. Brand-voice compliant (CLAUDE.md §3):
//   no explicit grooming/anatomy fields, only descriptive aesthetics.
//
// Fields chosen (sensible for SunRed quiet-luxury positioning):
//   ✅ Age · Gender · Ethnicity
//   ✅ Height · Body Type · Bust size
//   ✅ Hair colour · Hair length · Eye colour · Skin tone
//   ✅ Tattoos · Personality · Languages
//   ❌ Pronouns (Western-centric, not relevant here)
//   ❌ Dress / shoe size (irrelevant for outcall massage)
//   ❌ Personal grooming (too explicit for our brand voice)

import React from "react";
import { Box, Typography, Stack } from "@mui/material";
import CakeRoundedIcon from "@mui/icons-material/CakeRounded";
import WcRoundedIcon from "@mui/icons-material/WcRounded";
import PublicRoundedIcon from "@mui/icons-material/PublicRounded";
import StraightenRoundedIcon from "@mui/icons-material/StraightenRounded";
import FitnessCenterRoundedIcon from "@mui/icons-material/FitnessCenterRounded";
import ColorLensRoundedIcon from "@mui/icons-material/ColorLensRounded";
import ContentCutRoundedIcon from "@mui/icons-material/ContentCutRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import PaletteRoundedIcon from "@mui/icons-material/PaletteRounded";
import BrushRoundedIcon from "@mui/icons-material/BrushRounded";
import EmojiObjectsRoundedIcon from "@mui/icons-material/EmojiObjectsRounded";
import TranslateRoundedIcon from "@mui/icons-material/TranslateRounded";
import type { Features } from "@/types/therapist";

const SANS = '"Inter", system-ui, -apple-system, sans-serif';

type Row = {
  icon: React.ReactNode;
  label: string;
  value: string | string[];
};

interface Props {
  features: Features;
  /** Optional pre-formatted language string ("English · Thai · 中文") — if
   *  caller already builds one from `languageSkills`, pass it in.
   *  Falls back to features.language. */
  languageText?: string;
}

const FeaturesPanel: React.FC<Props> = ({ features, languageText }) => {
  const rows: Row[] = [];

  if (features.age) {
    rows.push({
      icon: <CakeRoundedIcon />,
      label: "Age",
      value: features.age,
    });
  }
  if (features.gender) {
    rows.push({
      icon: <WcRoundedIcon />,
      label: "Gender",
      value: features.gender,
    });
  }
  if (features.ethnicity) {
    rows.push({
      icon: <PublicRoundedIcon />,
      label: "Ethnicity",
      value: features.ethnicity,
    });
  }
  if (features.height) {
    rows.push({
      icon: <StraightenRoundedIcon />,
      label: "Height",
      value: features.height,
    });
  }
  if (features.bodyType) {
    rows.push({
      icon: <FitnessCenterRoundedIcon />,
      label: "Body type",
      value: features.bodyType,
    });
  }
  if (features.bustSize) {
    rows.push({
      icon: <BrushRoundedIcon />,
      label: "Bust",
      value: features.bustSize,
    });
  }
  if (features.skintone) {
    rows.push({
      icon: <PaletteRoundedIcon />,
      label: "Skin tone",
      value: features.skintone,
    });
  }
  if (features.hairColor) {
    rows.push({
      icon: <ColorLensRoundedIcon />,
      label: "Hair colour",
      value: features.hairColor,
    });
  }
  if (features.hairLength) {
    rows.push({
      icon: <ContentCutRoundedIcon />,
      label: "Hair length",
      value: features.hairLength,
    });
  }
  if (features.eyeColor) {
    rows.push({
      icon: <VisibilityRoundedIcon />,
      label: "Eye colour",
      value: features.eyeColor,
    });
  }
  if (features.tattoos) {
    rows.push({
      icon: <BrushRoundedIcon />,
      label: "Tattoos",
      value: features.tattoos,
    });
  }
  if (features.personality) {
    rows.push({
      icon: <EmojiObjectsRoundedIcon />,
      label: "Personality",
      value: features.personality.split(/[·,]/).map((s) => s.trim()).filter(Boolean),
    });
  }
  const lang = languageText ?? features.language;
  if (lang) {
    rows.push({
      icon: <TranslateRoundedIcon />,
      label: "Speaks",
      value: lang,
    });
  }

  if (rows.length === 0) return null;

  return (
    <Box
      sx={{
        background: "var(--sr-panel)",
        borderRadius: "14px",
        border: "1px solid var(--sr-hairline)",
        overflow: "hidden",
      }}
    >
      {/* Section eyebrow header — matches Services / How-to-book audits */}
      <Box
        sx={{
          padding: "12px 16px",
          background: "var(--sr-ink)",
          color: "var(--sr-panel)",
        }}
      >
        <Typography
          sx={{
            fontFamily: SANS,
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
          }}
        >
          Features
        </Typography>
      </Box>

      {/* Rolodex rows */}
      <Stack divider={<Box sx={{ height: "1px", background: "var(--sr-line)" }} />}>
        {rows.map((r) => (
          <Box
            key={r.label}
            sx={{
              display: "flex",
              alignItems: "flex-start",
              gap: 1.5,
              padding: "12px 16px",
              minHeight: 44,
            }}
          >
            <Box
              sx={{
                color: "var(--sr-body)",
                display: "flex",
                alignItems: "center",
                "& svg": { fontSize: 18 },
                paddingTop: "1px",
              }}
            >
              {r.icon}
            </Box>
            <Typography
              sx={{
                fontFamily: SANS,
                fontSize: 13,
                fontWeight: 600,
                color: "var(--sr-ink)",
                flex: 1,
                paddingTop: "1px",
              }}
            >
              {r.label}
            </Typography>
            <Box sx={{ textAlign: "right" }}>
              {Array.isArray(r.value) ? (
                r.value.map((v, i) => (
                  <Typography
                    key={i}
                    sx={{
                      fontFamily: SANS,
                      fontSize: 13,
                      fontWeight: 500,
                      color: "var(--sr-ink)",
                      lineHeight: 1.5,
                    }}
                  >
                    {v}
                  </Typography>
                ))
              ) : (
                <Typography
                  sx={{
                    fontFamily: SANS,
                    fontSize: 13,
                    fontWeight: 500,
                    color: "var(--sr-ink)",
                    lineHeight: 1.5,
                  }}
                >
                  {r.value}
                </Typography>
              )}
            </Box>
          </Box>
        ))}
      </Stack>
    </Box>
  );
};

export default FeaturesPanel;
