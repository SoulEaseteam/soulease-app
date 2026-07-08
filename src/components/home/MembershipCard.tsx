// src/components/home/MembershipCard.tsx
//
// 🆕 Round 28r74 · Nordic sections build (2026-07-08)
// ─────────────────────────────────────────────────────────────────────
// Membership Benefits — cream card with 3 perks + sage-tinted "SUNRED
// MEMBER" mock card graphic. Matches mockup phone-2 "member-card"
// (outputs/sunred-nordic-gray-mockup.html:370-460).
//
// Responsive: mobile stacks 1-column (perks over card graphic);
// tablet+/desktop shows 2-column (perks left, card graphic right).
//
// CTA "สมัครสมาชิก" → /pricing (Phase 2 pricing page is the canonical
// membership-tier surface; sending would-be members there beats opening
// concierge chat cold).
// ─────────────────────────────────────────────────────────────────────

import React from "react";
import { Box } from "@mui/material";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { CheckCircle } from "phosphor-react";
import { fonts } from "@/theme";

const MembershipCard: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const perks = [
    "ส่วนลดสูงสุด 20%",
    "จองก่อนใคร",
    "สะสมแต้ม แลกรางวัล",
  ];

  return (
    <Box
      component="section"
      aria-label="Membership benefits"
      sx={{
        margin: { xs: "24px 12px 0", md: "28px 12px 0" },
        padding: { xs: "20px", md: "26px 28px" },
        background: "#ECEBE8", // NEUTRAL_100 cream
        border: "1px solid #E2E0DD", // NEUTRAL_200
        borderRadius: "20px",
        display: "grid",
        gridTemplateColumns: { xs: "1fr", sm: "1fr 110px", md: "1fr 130px" },
        gap: { xs: "18px", md: "22px" },
        alignItems: "center",
        boxShadow: "0 1px 3px rgba(45,45,43,0.04), 0 6px 20px rgba(45,45,43,0.05)",
      }}
    >
      {/* Left column — copy + perks + CTA */}
      <Box>
        <Box
          component="h3"
          sx={{
            fontFamily: fonts.heading,
            fontSize: { xs: 20, md: 22 },
            fontWeight: 500,
            color: "#2D2D2B", // GRAY_900
            letterSpacing: "-0.01em",
            margin: 0,
            lineHeight: 1.15,
          }}
        >
          {t("home.membership.title", "Membership Benefits")}
        </Box>
        <Box
          sx={{
            fontFamily: fonts.body,
            fontSize: 11.5,
            color: "#6E6E6A", // GRAY_600
            marginTop: "4px",
            lineHeight: 1.5,
          }}
        >
          รับสิทธิพิเศษมากมาย สำหรับสมาชิก SunRed
        </Box>

        <Box
          component="ul"
          sx={{
            listStyle: "none",
            padding: 0,
            margin: "14px 0 16px",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          }}
        >
          {perks.map((perk) => (
            <Box
              key={perk}
              component="li"
              sx={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontFamily: fonts.body,
                fontSize: 12,
                fontWeight: 400,
                color: "#4B4B48", // GRAY_800
                lineHeight: 1.5,
              }}
            >
              <CheckCircle
                size={16}
                weight="fill"
                color="#A2BF7A" // SAGE_400
                style={{ flexShrink: 0 }}
              />
              {perk}
            </Box>
          ))}
        </Box>

        <Box
          component="button"
          type="button"
          onClick={() => navigate("/pricing")}
          sx={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "10px 22px",
            background: "#2D2D2B", // GRAY_900
            color: "#FFFFFF",
            border: "none",
            borderRadius: 999,
            fontFamily: fonts.body,
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: "0.01em",
            cursor: "pointer",
            minHeight: 40,
            transition: "background 0.18s ease, transform 0.18s ease",
            "&:hover": {
              background: "#4B4B48", // GRAY_800
              transform: "translateY(-1px)",
            },
            "&:focus-visible": {
              outline: "2px solid #2D2D2B",
              outlineOffset: 3,
            },
          }}
        >
          สมัครสมาชิก
        </Box>
      </Box>

      {/* Right column — sage-tinted mock card graphic */}
      <Box
        aria-hidden
        sx={{
          aspectRatio: "5 / 8",
          borderRadius: "12px",
          background: "linear-gradient(135deg, #C4CDBF 0%, #949E8B 100%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "14px 10px",
          textAlign: "center",
          position: "relative",
          overflow: "hidden",
          boxShadow: "0 6px 18px rgba(148,158,139,0.35)",
          // Subtle radial highlight for a soft "card" gleam
          "&::before": {
            content: '""',
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.22), transparent 60%)",
          },
        }}
      >
        <Box
          sx={{
            width: 26,
            height: 26,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.42)",
            marginBottom: "8px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#FFFFFF",
            fontSize: 14,
            lineHeight: 1,
            zIndex: 1,
          }}
        >
          ✦
        </Box>
        <Box
          sx={{
            fontFamily: fonts.heading,
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "#FFFFFF",
            zIndex: 1,
          }}
        >
          SUNRED
        </Box>
        <Box
          sx={{
            fontFamily: fonts.body,
            fontSize: 8,
            fontWeight: 600,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.78)",
            marginTop: "3px",
            zIndex: 1,
          }}
        >
          MEMBER
        </Box>
      </Box>
    </Box>
  );
};

export default MembershipCard;
