// src/components/home/MembershipCard.tsx
//
// 🆕 Round 28r74 · Nordic sections build (2026-07-08)
// 🆕 Round 28s336 (founder 2026-07-08) — "Membership Benefits ใช้พื้นหลัง
//   รูปนี้": swapped the flat cream card + CSS mock-card graphic for the
//   founder-supplied member-card photo (public/images/hero/member.png — a
//   "SUNRED MEMBER" card on cream with olive branches, card on the RIGHT,
//   empty cream on the LEFT). The photo is now the section's full-bleed
//   background; the copy + perks + CTA sit over the empty left third with a
//   soft cream scrim for legibility — same pattern as the home hero.
//
// CTA "สมัครสมาชิก" → /pricing (canonical membership-tier surface).
// ─────────────────────────────────────────────────────────────────────

import React from "react";
import { Box } from "@mui/material";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { CheckCircle } from "phosphor-react";
import { fonts } from "@/theme";

const MEMBER_IMG = "/images/hero/member.png";

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
        position: "relative",
        overflow: "hidden",
        margin: { xs: "24px 12px 0", md: "28px 12px 0" },
        borderRadius: "20px",
        border: "1px solid #E7E0D5",
        boxShadow:
          "0 1px 3px rgba(45,45,43,0.04), 0 6px 20px rgba(45,45,43,0.05)",
        minHeight: { xs: 300, md: 300 },
        display: "flex",
      }}
    >
      {/* Full-bleed member-card photo — card kept on the right. */}
      <Box
        aria-hidden="true"
        sx={{
          position: "absolute",
          inset: 0,
          backgroundImage: `url("${MEMBER_IMG}")`,
          backgroundSize: "cover",
          backgroundRepeat: "no-repeat",
          backgroundPosition: { xs: "80% center", md: "right center" },
        }}
      />
      {/* Cream scrim so the overlaid copy always reads; the photo is cream
          so this blends seamlessly. */}
      <Box
        aria-hidden="true"
        sx={{
          position: "absolute",
          inset: 0,
          background: {
            xs: "linear-gradient(90deg, rgba(244,241,236,0.96) 0%, rgba(244,241,236,0.9) 46%, rgba(244,241,236,0.5) 68%, rgba(244,241,236,0) 92%)",
            md: "linear-gradient(90deg, rgba(244,241,236,0.94) 0%, rgba(244,241,236,0.72) 32%, rgba(244,241,236,0.25) 54%, rgba(244,241,236,0) 70%)",
          },
        }}
      />

      {/* Content — copy + perks + CTA over the empty left. */}
      <Box
        sx={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: { xs: "22px 18px", md: "28px 34px" },
          maxWidth: { xs: "84%", sm: "72%", md: "60%" },
        }}
      >
        <Box
          component="h3"
          sx={{
            fontFamily: fonts.heading,
            fontSize: { xs: 21, md: 24 },
            fontWeight: 500,
            color: "#2B2620",
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
            fontSize: 12,
            color: "#6E6459",
            marginTop: "5px",
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
            margin: "14px 0 18px",
            display: "flex",
            flexDirection: "column",
            gap: "9px",
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
                fontSize: 12.5,
                fontWeight: 400,
                color: "#4B443C",
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
            alignSelf: "flex-start",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "11px 24px",
            background: "#2B2620",
            color: "#FFFFFF",
            border: "none",
            borderRadius: 999,
            fontFamily: fonts.body,
            fontSize: 12.5,
            fontWeight: 600,
            letterSpacing: "0.01em",
            cursor: "pointer",
            minHeight: 42,
            boxShadow: "0 6px 16px rgba(43,38,32,0.18)",
            transition: "background 0.18s ease, transform 0.18s ease",
            "&:hover": {
              background: "#453E36",
              transform: "translateY(-1px)",
            },
            "&:focus-visible": {
              outline: "2px solid #2B2620",
              outlineOffset: 3,
            },
          }}
        >
          สมัครสมาชิก
        </Box>
      </Box>
    </Box>
  );
};

export default MembershipCard;
