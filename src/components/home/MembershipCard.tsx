// src/components/home/MembershipCard.tsx
//
// 🆕 Round 28r74 · Nordic sections build (2026-07-08)
// 🆕 Round 28s336 (founder 2026-07-08) — full-bleed member-card photo bg.
// 🆕 Round 28s337 (founder 2026-07-08) — mobile mockup tune: shift the
//   section to the warm taupe monochrome of the card (heading, tick chips
//   and CTA all taupe instead of the old espresso ink + sage-green ticks).
//   Bigger heading + roomier rhythm to match "ตัวอย่าง จอมือถือ".
//
// The founder-supplied member-card photo (public/images/hero/member.png —
// "SUNRED MEMBER" card on cream with olive branches) is the section's
// full-bleed background; copy + perks + CTA sit over the scrimmed left.
//
// CTA "สมัครสมาชิก" → /pricing (canonical membership-tier surface).
// ─────────────────────────────────────────────────────────────────────

import React from "react";
import { Box } from "@mui/material";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Check } from "phosphor-react";
import { fonts } from "@/theme";

const MEMBER_IMG = "/images/hero/member.png";

// Warm taupe monochrome — matched to the card's engraved tone (mockup).
const TAUPE_HEAD = "#6F6556"; // heading
const TAUPE_SUB = "#776D5F"; // subtitle
const TAUPE_PERK = "#6B6153"; // perk text
const TAUPE_CHIP = "#A79D8D"; // tick circle
const BTN_BG = "#8F8474"; // CTA fill
const BTN_BG_HOVER = "#7A7060";

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
        minHeight: { xs: 320, md: 320 },
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
          padding: { xs: "24px 20px", md: "30px 36px" },
          maxWidth: { xs: "84%", sm: "72%", md: "60%" },
        }}
      >
        <Box
          component="h3"
          sx={{
            fontFamily: fonts.heading,
            fontSize: { xs: 25, md: 29 },
            fontWeight: 500,
            color: TAUPE_HEAD,
            letterSpacing: "-0.01em",
            margin: 0,
            lineHeight: 1.12,
          }}
        >
          {t("home.membership.title", "Membership Benefits")}
        </Box>
        <Box
          sx={{
            fontFamily: fonts.body,
            fontSize: { xs: 13, md: 14 },
            color: TAUPE_SUB,
            marginTop: "7px",
            lineHeight: 1.5,
            maxWidth: 240,
          }}
        >
          รับสิทธิพิเศษมากมาย สำหรับสมาชิก SunRed
        </Box>

        <Box
          component="ul"
          sx={{
            listStyle: "none",
            padding: 0,
            margin: "18px 0 20px",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}
        >
          {perks.map((perk) => (
            <Box
              key={perk}
              component="li"
              sx={{
                display: "flex",
                alignItems: "center",
                gap: "11px",
                fontFamily: fonts.body,
                fontSize: 13.5,
                fontWeight: 400,
                color: TAUPE_PERK,
                lineHeight: 1.4,
              }}
            >
              {/* Taupe tick chip (mockup): filled circle + white check. */}
              <Box
                aria-hidden="true"
                sx={{
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  background: TAUPE_CHIP,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Check size={13} weight="bold" color="#FFFFFF" />
              </Box>
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
            padding: "12px 30px",
            background: BTN_BG,
            color: "#FFFFFF",
            border: "none",
            borderRadius: 999,
            fontFamily: fonts.body,
            fontSize: 14,
            fontWeight: 700,
            letterSpacing: "0.01em",
            cursor: "pointer",
            minHeight: 44,
            boxShadow: "0 6px 16px rgba(111,101,86,0.22)",
            transition: "background 0.18s ease, transform 0.18s ease",
            "&:hover": {
              background: BTN_BG_HOVER,
              transform: "translateY(-1px)",
            },
            "&:focus-visible": {
              outline: `2px solid ${TAUPE_HEAD}`,
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
