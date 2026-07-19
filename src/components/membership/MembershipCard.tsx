// src/components/membership/MembershipCard.tsx
//
// 🆕 Round 28x.83 (founder reference images: Black/Gold/Silver/Bronze "member"
//   cards, glass-metal finish, "X% OFF · EXCLUSIVE PRIVILEGES JUST FOR YOU")
//   — recreated as CSS/SVG rather than the source PNGs: the PNGs are
//   marketing renders at a fixed aspect and can't respond to the phone
//   widths this page already supports, and embedding raster art as page
//   chrome means every future palette tweak is a re-generate instead of a
//   token edit. Same layout, same four finishes, done in the vars this page
//   already themes with.
//
// 🆕 Round 28x.84 (founder: real PNG assets saved at
//   public/images/SunRedMembership/, "เอา SunRed Membership ใหม่ไปแทน") —
//   moved out of ProfilePage so every surface that needs the tier palette
//   (Booking History hero background) or the card itself (Rewards page) can
//   share ONE definition instead of three copies drifting apart. ProfilePage's
//   hero now shows the real designed artwork via TIER_IMAGE instead of this
//   CSS card — this component moved to MyCodesPage ("Rewards · My Discount
//   Codes") per the founder's instruction to keep announcing it there.
//
// ⚠️ The "% OFF" here is DISPLAY ONLY — a status/thank-you card, same spirit
//   as the reference's "Thank you for being part of SunRed". It reads NO
//   discount into checkout. Wiring an automatic tier discount into
//   BookingFlowPage/validateDiscount is a real pricing-model decision (stacks
//   with promo codes? overrides them? per the CLAUDE.md euphemism rule,
//   "discount" language needs to stay off guest-facing copy anyway) — a
//   separate round, not assumed here.

import React from "react";
import { Box, Typography } from "@mui/material";
import type { MembershipTier } from "@/utils/membership";

const SERIF = '"Playfair Display", "Fraunces", Georgia, serif';
const SANS  = '"Inter", system-ui, sans-serif';

export const TIER_META: Record<
  MembershipTier,
  { label: string; off: number; ink: string; sub: string; gradient: string; border: string; glow: string }
> = {
  Bronze: {
    label: "BRONZE",
    off: 5,
    ink: "#6E4526",
    sub: "#6E4526",
    gradient: "linear-gradient(135deg, #F6E9DE 0%, #EAD3BF 50%, #F3E2D2 100%)",
    border: "rgba(184,136,99,0.55)",
    glow: "rgba(184,136,99,0.28)",
  },
  Silver: {
    label: "SILVER",
    off: 10,
    ink: "#40474F",
    sub: "#5C636C",
    gradient: "linear-gradient(135deg, #F4F6F8 0%, #DCE1E6 50%, #EEF1F3 100%)",
    border: "rgba(140,150,162,0.55)",
    glow: "rgba(140,150,162,0.28)",
  },
  Gold: {
    label: "GOLD",
    off: 15,
    ink: "#6B5013",
    sub: "#6B5013",
    gradient: "linear-gradient(135deg, #FBEFCB 0%, #F0D287 50%, #FAEFCE 100%)",
    border: "rgba(197,155,54,0.55)",
    glow: "rgba(197,155,54,0.32)",
  },
  BlackVIP: {
    label: "BLACK",
    off: 20,
    ink: "#E8C77A",
    sub: "#C7A868",
    gradient: "linear-gradient(135deg, #1C1C1E 0%, #0B0B0C 55%, #1A1A1C 100%)",
    border: "rgba(232,199,122,0.45)",
    glow: "rgba(232,199,122,0.22)",
  },
};

// 🆕 28x.84 — the founder's final designed artwork (1536×1024 PNG per tier).
//   TIER_META's gradient/ink stays the shared PALETTE for surfaces that need
//   tier-matched COLOR (Booking History's hero background); this map is for
//   surfaces that show the finished renders themselves.
export const TIER_IMAGE: Record<MembershipTier, string> = {
  Bronze: "/images/SunRedMembership/Bronze.png",
  Silver: "/images/SunRedMembership/Silver.png",
  Gold: "/images/SunRedMembership/Gold.png",
  BlackVIP: "/images/SunRedMembership/Black.png",
};

export const MembershipCard: React.FC<{ tier: MembershipTier }> = ({ tier }) => {
  const m = TIER_META[tier];
  return (
    <Box
      sx={{
        borderRadius: "18px",
        p: "18px 20px",
        background: m.gradient,
        border: `1px solid ${m.border}`,
        boxShadow: `0 10px 30px ${m.glow}`,
        display: "flex",
        alignItems: "center",
        gap: 2,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontFamily: SANS, fontSize: 9.5, fontWeight: 700, letterSpacing: "0.22em", color: m.sub }}>
          SUNRED · OUTCALL MASSAGE
        </Typography>
        <Typography sx={{ fontFamily: SERIF, fontSize: 24, fontWeight: 700, letterSpacing: "0.04em", color: m.ink, lineHeight: 1.2, mt: 0.5 }}>
          {m.label}
        </Typography>
        <Typography sx={{ fontFamily: SANS, fontSize: 10, fontWeight: 700, letterSpacing: "0.3em", color: m.sub, mt: -0.3 }}>
          MEMBER
        </Typography>
        <Typography sx={{ fontFamily: SANS, fontSize: 10, color: m.sub, mt: 1, lineHeight: 1.5 }}>
          Exclusive privileges, just for you.
        </Typography>
      </Box>

      <Box sx={{ width: "1px", alignSelf: "stretch", background: m.border, opacity: 0.6 }} />

      <Box sx={{ textAlign: "center", flexShrink: 0, px: 0.5 }}>
        <Typography sx={{ fontFamily: SERIF, fontSize: 30, fontWeight: 700, color: m.ink, lineHeight: 1 }}>
          {m.off}<Box component="span" sx={{ fontSize: 16 }}>%</Box>
        </Typography>
        <Typography sx={{ fontFamily: SANS, fontSize: 9, fontWeight: 700, letterSpacing: "0.2em", color: m.sub, mt: 0.5 }}>
          OFF
        </Typography>
        <Typography sx={{ fontFamily: SANS, fontSize: 8, color: m.sub, mt: 1, lineHeight: 1.4, maxWidth: 90 }}>
          Thank you for being part of SunRed
        </Typography>
      </Box>
    </Box>
  );
};
