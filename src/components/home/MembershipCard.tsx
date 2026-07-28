// src/components/home/MembershipCard.tsx
//
// 🆕 Round 28r74 · Nordic sections build (2026-07-08)
// 🆕 Round 28s336 (founder 2026-07-08) — full-bleed member-card photo bg.
// 🆕 Round 28s337 (founder 2026-07-08) — mobile mockup tune: shift the
//   section to the warm taupe monochrome of the card (heading, tick chips
//   and CTA all taupe instead of the old espresso ink + sage-green ticks).
//   Bigger heading + roomier rhythm to match "ตัวอย่าง จอมือถือ".
//
// 🆕 Round 28w.84 (founder: "ไม่เอา สีมาเกลี่ยทับ · ปุ่มพาไป สมัครกับแอดมิน")
//   — the photo no longer bleeds under the copy behind an espresso scrim; it
//   sits on the right half only, unwashed. And the CTA now opens the concierge
//   chat (membership is enrolled by admin — there is no self-serve signup).
//
// The founder-supplied member-card photo (public/images/hero/member.png —
// "SUNRED MEMBER" card on cream with olive branches) fills the RIGHT side.
// ─────────────────────────────────────────────────────────────────────

import React from "react";
import { Box } from "@mui/material";
import { useTranslation } from "react-i18next";
import { Check } from "phosphor-react";
import { fonts } from "@/theme/theme";
import { whatsappDeepLink } from "@/config/concierge";

const MEMBER_IMG = "/images/hero/member.png";

// Dark-luxury palette — IVORY/CREAM text on a rich chocolate panel with
// gold "embroidery" accents and a rose-gradient CTA.
const IVORY_HEAD = "var(--sr-ink)"; // heading
const CHAMPAGNE_SUB = "var(--sr-muted)"; // subtitle (muted)
const CREAM_PERK = "var(--sr-body)"; // perk text
const GOLD_CHIP = "#57B88B"; // tick circle — green "included" (gold retired)
const BTN_BG = "linear-gradient(135deg,#D97C95 0%,#C96F89 100%)"; // ROSE CTA fill
const BTN_BG_HOVER = "linear-gradient(135deg,#C96F89 0%,#B36079 100%)";

const MembershipCard: React.FC = () => {
  const { t } = useTranslation();

  const perks = [
    t("home.member.perk1", "Up to 20% off"),
    t("home.member.perk2", "Priority booking"),
    t("home.member.perk3", "Earn points, redeem rewards"),
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
        backgroundColor: "var(--sr-panel)",
        border: "1px solid var(--sr-hairline)",
        boxShadow: "var(--sr-card-shadow)",
        minHeight: { xs: 320, md: 320 },
        display: "flex",
      }}
    >
      {/* 🆕 Round 28w.84 (founder: "ไม่เอา สีมาเกลี่ยทับ") — the photo used to be
          full-bleed with a heavy espresso scrim painted across it (96% opaque on
          the left) purely so the light copy could sit ON the photo. That wash
          muddied the whole card. The scrim is GONE: the photo now occupies only
          the right side, the copy sits on the clean panel, and nothing is
          painted over the image. The left edge is feathered with a mask — that
          fades the IMAGE itself into the panel, it does not lay any colour on
          top of it. */}
      <Box
        aria-hidden="true"
        sx={{
          position: "absolute",
          top: 0,
          bottom: 0,
          right: 0,
          width: { xs: "42%", sm: "44%", md: "50%" },
          backgroundImage: `url("${MEMBER_IMG}")`,
          backgroundSize: "cover",
          backgroundRepeat: "no-repeat",
          // The SUNRED card sits right-of-centre in the source photo; a plain
          // "center" crop on this narrow box sliced it in half.
          backgroundPosition: "78% center",
          // 🆕 Round 28w.84b (founder: "เอาแค่รูปกับข้อความ ไม่เอาพื้นหลังมาทับรูป")
          //   — the mask fade was the panel background eating into the photo's
          //   left edge. Gone. The photo is now shown whole and untouched: just
          //   image + text, nothing laid over the picture.
        }}
      />

      {/* Content — copy + perks + CTA on the clean panel, clear of the photo. */}
      <Box
        sx={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          // 🆕 28w.84b — with no scrim and no fade, text can no longer sit ON the
          //   photo: the two must not overlap at all. Content width is capped to
          //   the panel left of the image (photo 42/44/50% → text 58/56/50%).
          padding: { xs: "22px 16px", md: "30px 36px" },
          maxWidth: { xs: "58%", sm: "56%", md: "50%" },
        }}
      >
        <Box
          component="h3"
          sx={{
            fontFamily: fonts.heading,
            fontSize: { xs: 25, md: 29 },
            fontWeight: 500,
            color: IVORY_HEAD,
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
            color: CHAMPAGNE_SUB,
            marginTop: "7px",
            lineHeight: 1.5,
          }}
        >
          {t("home.member.subtitle", "Exclusive privileges for SunRed members")}
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
                color: CREAM_PERK,
                lineHeight: 1.4,
              }}
            >
              {/* Gold tick chip: filled circle + dark check for contrast. */}
              <Box
                aria-hidden="true"
                sx={{
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  background: GOLD_CHIP,
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

        {/* 🆕 Round 28w.84 (founder: "ปุ่มพาไป สมัครกับแอดมิน") — was
            navigate("/pricing"), which just showed rates and left the guest with
            no way to actually join. There IS no self-serve membership signup:
            the concierge enrols members by phone from /admin/members. So the CTA
            now opens the concierge chat with the request pre-written. */}
        <Box
          component="a"
          href={whatsappDeepLink(
            "Hi SunRed concierge, I'd like to sign up for SunRed membership. Could you enrol me?"
          )}
          target="_blank"
          rel="noopener noreferrer"
          sx={{
            textDecoration: "none",
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
            boxShadow: "0 6px 16px rgba(217,124,149,0.30)",
            transition: "background 0.18s ease, transform 0.18s ease",
            "&:hover": {
              background: BTN_BG_HOVER,
              transform: "translateY(-1px)",
            },
            "&:focus-visible": {
              outline: "2px solid #D97C95",
              outlineOffset: 3,
            },
          }}
        >
          {t("home.member.cta", "Become a member")}
        </Box>
      </Box>
    </Box>
  );
};

export default MembershipCard;
