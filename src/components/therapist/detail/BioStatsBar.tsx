// src/components/therapist/detail/BioStatsBar.tsx
//
// 🆕 28s351 — Horizontal 4-column bio bar (founder ref: competitor "Wawa"
//   detail screenshot — "ให้ ไบโอโชว์แบบนี้แทน"). Replaces the retired
//   vertical Rolodex FeaturesPanel with a clean stat strip:
//
//     sex   |   height / weight   |   style   |   language
//
//   Brand-voice compliant (CLAUDE.md §3): discreet register — "style"
//   carries the vital-stats figure, no explicit anatomy labels. Rendered
//   in SunRed's WARM blush palette (in-brand pink accent family), NOT the
//   cool lavender of the reference (founder rejected cool pastel 28s329).

import React from "react";
import { Box, Typography } from "@mui/material";
import type { Features } from "@/types/therapist";

const SERIF = '"Fraunces", "Italiana", Georgia, serif';

const PLUM = "#5A2733"; // warm plum — column headers
const MAUVE = "#7A5E66"; // muted warm mauve — values
const DIVIDER = "1px solid rgba(90,39,51,0.14)";

/** Append a unit only when the stored value is a bare number
 *  ("160" → "160 cm"); leave values that already carry a unit
 *  ("154 cm", "45 kg") untouched. */
function withUnit(v: string | undefined | null, unit: string): string {
  const s = (v ?? "").trim();
  if (!s) return "";
  // Has any latin/Thai letter already? → assume the unit is present.
  return /[a-zA-Z฀-๿]/.test(s) ? s : `${s} ${unit}`;
}

interface Props {
  features: Features;
  /** Pre-formatted language string ("Thai · English"). Falls back to the
   *  free-form features.language when the caller doesn't build one. */
  languageText?: string;
}

const BioStatsBar: React.FC<Props> = ({ features, languageText }) => {
  const sex = (features.gender ?? "").trim();

  const h = withUnit(features.height, "cm");
  const w = withUnit(features.weight, "kg");
  const heightWeight = [h, w].filter(Boolean).join(" / ");

  // "style" = the vital-stats figure. Prefer a measurement-shaped
  //   bodyType ("36-26-36"); otherwise fall back to the cup/bust field
  //   ("32B", "C Cup"), then the descriptive bodyType ("Slim").
  const bt = (features.bodyType ?? "").trim();
  const bust = (features.bustSize ?? "").trim();
  const looksMeasurement = /\d\s*[-–/]\s*\d/.test(bt);
  const style = looksMeasurement ? bt : bust || bt;

  const language = (languageText || features.language || "")
    .trim()
    .replace(/\s*,\s*/g, ", ");

  const cols = [
    { label: "sex", value: sex },
    { label: "height / weight", value: heightWeight },
    { label: "style", value: style },
    { label: "language", value: language },
  ].filter((c) => c.value);

  if (cols.length === 0) return null;

  return (
    <Box
      sx={{
        background: "linear-gradient(180deg, #FCEFF2 0%, #F8E6EC 100%)",
        border: "1px solid rgba(90,39,51,0.08)",
        borderRadius: "18px",
        overflow: "hidden",
        display: "grid",
        // 2×2 on phones, single row on tablet/desktop (matches the wide
        //   reference layout without cramping a 375px column).
        gridTemplateColumns: { xs: "1fr 1fr", md: `repeat(${cols.length}, 1fr)` },
      }}
    >
      {cols.map((c, i) => (
        <Box
          key={c.label}
          sx={{
            textAlign: "center",
            paddingY: { xs: "16px", md: "20px" },
            paddingX: { xs: "12px", md: "16px" },
            // Vertical rules between columns; on the 2-wide phone grid the
            //   right column and the bottom row also pick up a hairline.
            borderLeft: {
              xs: i % 2 === 1 ? DIVIDER : "none",
              md: i > 0 ? DIVIDER : "none",
            },
            borderTop: { xs: i >= 2 ? DIVIDER : "none", md: "none" },
          }}
        >
          <Typography
            sx={{
              fontFamily: SERIF,
              fontSize: { xs: "14px", md: "16px" },
              fontWeight: 600,
              color: PLUM,
              lineHeight: 1.2,
              marginBottom: "6px",
            }}
          >
            {c.label}
          </Typography>
          <Typography
            sx={{
              fontFamily: SERIF,
              fontSize: { xs: "13px", md: "14.5px" },
              fontWeight: 500,
              color: MAUVE,
              lineHeight: 1.35,
              wordBreak: "break-word",
            }}
          >
            {c.value}
          </Typography>
        </Box>
      ))}
    </Box>
  );
};

export default BioStatsBar;
