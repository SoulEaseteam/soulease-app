// src/components/home/WhySunRedSection.tsx
//
// 🆕 Round 28r74 · Nordic sections build (2026-07-08)
// ─────────────────────────────────────────────────────────────────────
// "Why SunRed" — 4 features in ONE row on every screen (28w.85, founder:
// "แก้ให้เรียง 1 สวยงามทุกจอ"). Each feature is an outlined icon circle with a
// short, centred label beneath. Was a 2×2 mobile / 4-col desktop grid with
// left-aligned descriptive sentences, which came out ragged.
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
import { fonts, accents } from "@/theme";

type Feature = {
  key: string;
  Icon: typeof UserCircle;
  /**
   * 🆕 28w.85 — SHORT label. The four features now sit in one row on every
   * screen (founder), which on a 375px phone leaves each cell ~85px wide. The
   * old descriptive sentences ("Hand-picked professional practitioners") would
   * wrap to four ragged lines in that space. These are the row labels; the full
   * sentences are gone rather than kept unused.
   * (28w.83 note: this replaced `textTh`, which rendered hardcoded Thai to every
   * guest regardless of their language.)
   */
  shortKey: string;
  shortEn: string;
};

const WhySunRedSection: React.FC = () => {
  const { t } = useTranslation();

  const features: Feature[] = [
    {
      key: "professional",
      Icon: UserCircle,
      shortKey: "home.why.short.professional",
      shortEn: "Professional",
    },
    {
      key: "private",
      Icon: ShieldCheck,
      shortKey: "home.why.short.private",
      shortEn: "Private",
    },
    {
      key: "always-on",
      Icon: Clock,
      shortKey: "home.why.short.alwaysOn",
      shortEn: "24 hours",
    },
    {
      key: "support",
      Icon: Headphones,
      shortKey: "home.why.short.concierge",
      shortEn: "Concierge",
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
          color: "var(--sr-ink)", // IVORY heading (was GRAY_900 #4B4B48)
          margin: 0,
          letterSpacing: "-0.005em",
          lineHeight: 1.15,
        }}
      >
        {t("home.why.title", "Why SunRed")}
      </Box>
      {/* 🆕 Round 28w.84 — a second line under the heading used to hold the THAI
          version of that same heading (an English/Thai pair). Now that the
          heading itself translates per device locale, that line was rendering
          the title twice. Removed — the pair has no job left to do.
          🆕 28w.85 — removing it also took the gap under the heading with it, so
          the title ended up sitting flush on the grid. The spacing lives here now. */}

      {/* 🆕 Round 28w.85 (founder: "แก้ให้เรียง 1 สวยงามทุกจอ" → one row of four)
          — was 2×2 on mobile / 4-across on desktop, left-aligned, with each cell
          free to be a different height, so the labels came out ragged. Now it is
          ONE row of four on EVERY screen: equal columns, centred icon over
          centred label, cells stretched to a common height so the four icons sit
          on one line no matter how the labels wrap. */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          alignItems: "start",
          gap: { xs: "10px 6px", sm: "12px", md: "24px" },
          marginTop: { xs: "18px", md: "22px" },
        }}
      >
        {features.map(({ key, Icon, shortKey, shortEn }) => (
          <Box
            key={key}
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
              gap: { xs: "8px", md: "10px" },
            }}
          >
            {/* 🆕 Round 28r81 — icon glyphs tinted to the teal-mint
                accent (accents.teal = #2EC4B0) for a bit of Nordic
                energy on an otherwise all-gray section. Circle border
                stays neutral so the accent is subtle, not shouty. */}
            {/* 🆕 28w.85b (founder: "ขยาย ไอคอนอีกนิด") — 38/42 → 48/56. Capped
                there deliberately: at 320px the section's four columns are only
                ~59px wide, so a bigger circle would burst the single row. */}
            <Box
              sx={{
                width: { xs: 48, sm: 52, md: 56 },
                height: { xs: 48, sm: 52, md: 56 },
                borderRadius: "50%",
                background: "transparent",
                border: "1px solid var(--sr-hairline)", // GOLD hairline embroidery (was NEUTRAL_300 #CFCFCB)
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: accents.teal,
                flexShrink: 0,
              }}
            >
              <Icon size={26} weight="regular" />
            </Box>
            <Box
              sx={{
                fontFamily: fonts.body,
                // 11px on a 375px phone, where a quarter-width cell is ~85px.
                fontSize: { xs: 11, sm: 12, md: 12.5 },
                fontWeight: 400,
                color: "var(--sr-body)", // CREAM body (was GRAY_800 #4B4B48)
                lineHeight: 1.35,
                letterSpacing: 0,
                // Long words (e.g. ja "コンシェルジュ") must break rather than
                // push the cell wider and knock the row out of alignment.
                overflowWrap: "anywhere",
              }}
            >
              {t(shortKey, shortEn)}
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

export default WhySunRedSection;
