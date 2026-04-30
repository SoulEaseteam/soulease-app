// src/components/home/Testimonials.tsx
//
// 🎨 Phase 1 Home — Testimonials (pixel-perfect port of `.testimonials-scroll`).
// Horizontal scroll of 4 multilingual testimonials (JA / ZH / KO / EN).
// Quotes preserved in original language — DO NOT translate them.

import React from "react";
import { Box, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";

const SERIF = '"Fraunces", Georgia, "Times New Roman", serif';
const SANS = '"Inter", system-ui, -apple-system, sans-serif';

type Testimonial = {
  id: string;
  initial: string;
  flag: string;
  quote: string; // original language — kept as-is
  name: string;
  meta: string;
};

const TESTIMONIALS: Testimonial[] = [
  {
    id: "ja",
    initial: "K",
    flag: "🇯🇵",
    quote:
      "Booked Mai for a 90-minute Thai session at our hotel. She was punctual, professional, and the massage was exactly what I needed after a long flight from Tokyo.",
    name: "Kenji T.",
    meta: "Tokyo · Mandarin Oriental",
  },
  {
    id: "zh",
    initial: "L",
    flag: "🇨🇳",
    quote:
      "我在曼谷待了一周，每天都预约SunRed。Ploy的香薰按摩是我体验过最好的。",
    name: "Li Wen",
    meta: "Shanghai · Anantara Riverside",
  },
  {
    id: "ko",
    initial: "J",
    flag: "🇰🇷",
    quote:
      "호텔에서 한국어 가능한 마사지사를 찾기 정말 어려웠는데, SunRed에서 Nan을 만났어요. 진짜 프로페셔널했어요.",
    name: "Jiwoo K.",
    meta: "Seoul · Park Hyatt",
  },
  {
    id: "en",
    initial: "D",
    flag: "🇬🇧",
    quote:
      "Best outcall service in Bangkok. Booking took 30 seconds. Therapist arrived in 45 min with full equipment.",
    name: "David R.",
    meta: "London · St. Regis",
  },
];

const Testimonials: React.FC = () => {
  const { t } = useTranslation();

  return (
    <Box>
      {/* .section */}
      <Box sx={{ padding: "36px 20px 8px", position: "relative" }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            fontSize: "10px",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: "#b85c3c",
            fontWeight: 700,
            marginBottom: "6px",
            fontFamily: SANS,
            "&::before": {
              content: '""',
              width: "16px",
              height: "1px",
              background: "rgba(184, 92, 60, 0.5)",
            },
          }}
        >
          {t("home.testimonials.eyebrow", "Voices")}
        </Box>

        <Typography
          component="h2"
          sx={{
            fontFamily: SERIF,
            fontWeight: 400,
            fontSize: "28px",
            lineHeight: 1.1,
            letterSpacing: "-0.02em",
            color: "#2a1a14",
            marginBottom: "8px",
            "& em": { fontStyle: "italic", color: "#FE0944" },
          }}
        >
          {t("home.testimonials.title.pre", "What our ")}
          <em>{t("home.testimonials.title.em", "guests")}</em>
          {t("home.testimonials.title.tail", " say.")}
        </Typography>

        <Box
          component="p"
          sx={{
            fontFamily: SANS,
            fontSize: "13.5px",
            color: "rgba(60, 30, 20, 0.72)",
            lineHeight: 1.55,
            marginBottom: "20px",
          }}
        >
          {t(
            "home.testimonials.lead",
            "From travelers across Asia and beyond."
          )}
        </Box>
      </Box>

      {/* .testimonials-scroll — verbatim */}
      <Box
        sx={{
          display: "flex",
          gap: "12px",
          overflowX: "auto",
          padding: "0 20px 28px",
          scrollbarWidth: "none",
          scrollSnapType: "x mandatory",
          "&::-webkit-scrollbar": { display: "none" },
        }}
      >
        {TESTIMONIALS.map((tm) => (
          <Box
            key={tm.id}
            sx={{
              // .testimonial — verbatim
              flex: "0 0 280px",
              background: "rgba(255, 255, 255, 0.65)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              border: "1px solid rgba(255, 255, 255, 0.7)",
              borderRadius: "18px",
              padding: "18px 16px",
              scrollSnapAlign: "start",
              boxShadow: "0 4px 16px rgba(254, 9, 68, 0.05)",
            }}
          >
            {/* .stars */}
            <Box
              sx={{
                color: "#FBBF24",
                fontSize: "13px",
                marginBottom: "8px",
                letterSpacing: "1px",
                fontFamily: SANS,
              }}
            >
              ★★★★★
            </Box>

            {/* .quote */}
            <Box
              sx={{
                fontFamily: SERIF,
                fontSize: "14px",
                lineHeight: 1.45,
                color: "#2a1a14",
                marginBottom: "12px",
                fontStyle: "italic",
              }}
            >
              &ldquo;{tm.quote}&rdquo;
            </Box>

            {/* .author-row */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
              }}
            >
              {/* .avatar */}
              <Box
                sx={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #FE7A52, #FFB088)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: "12px",
                  fontFamily: SANS,
                }}
              >
                {tm.initial}
              </Box>
              {/* .author */}
              <Box sx={{ flex: 1 }}>
                {/* .name-row */}
                <Box
                  sx={{
                    fontSize: "12px",
                    fontWeight: 700,
                    color: "#2a1a14",
                    display: "flex",
                    alignItems: "center",
                    gap: "5px",
                    fontFamily: SANS,
                  }}
                >
                  {tm.name}{" "}
                  <Box component="span" sx={{ fontSize: "13px" }}>
                    {tm.flag}
                  </Box>
                </Box>
                {/* .meta */}
                <Box
                  sx={{
                    fontSize: "10px",
                    color: "rgba(60, 30, 20, 0.72)",
                    fontFamily: SANS,
                  }}
                >
                  {tm.meta}
                </Box>
              </Box>
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

export default Testimonials;
