// src/components/common/ReferralActiveBanner.tsx
//
// 🆕 Round 28r7 (founder 2026-05-06) — Phase 1 referral surface.
//
// Renders a quiet warm-cream chip at the top of the Hero whenever a
// referral code is present in localStorage (captured from a `?ref=`
// URL by HomePage on mount). Tapping the chip opens LINE concierge
// so the guest can mention the code — View applies the discount by
// hand for now (Phase 2 will automate this).
//
// Why a banner and not a stronger callout: Phase 1 is a tracking
// experiment, not a product feature. We want signal ("X guests
// landed via referral link this week") without committing UI real
// estate that's hard to take back if Phase 2 doesn't ship.
//
// Renders nothing when there's no captured code, so it's safe to
// drop into any page that wants to acknowledge a referral.

import React, { useEffect, useState } from "react";
import { Box, Typography } from "@mui/material";
import RedeemRoundedIcon from "@mui/icons-material/RedeemRounded";
import NorthEastRoundedIcon from "@mui/icons-material/NorthEastRounded";

import { getActiveReferralCode } from "@/utils/referral";
import { brand, fonts } from "@/theme";

const LINE_CONCIERGE_URL =
  "https://line.me/R/ti/p/@sunred.bkk?from=page&searchId=sunred.bkk";

const ReferralActiveBanner: React.FC = () => {
  const [code, setCode] = useState<string | null>(null);

  // Read once on mount — captureReferralFromURL has already run on
  // HomePage by this point if a `?ref=` was present.
  useEffect(() => {
    setCode(getActiveReferralCode());
  }, []);

  if (!code) return null;

  return (
    <Box
      component="a"
      href={LINE_CONCIERGE_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Referral ${code} active — tap to chat with concierge to claim your discount`}
      sx={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "8px 12px 8px 10px",
        borderRadius: "12px",
        background:
          "linear-gradient(135deg, rgba(255,231,213,0.85) 0%, rgba(254,201,167,0.55) 100%)",
        border: "1px solid rgba(184, 92, 60, 0.22)",
        boxShadow: "0 2px 8px rgba(184, 92, 60, 0.10)",
        textDecoration: "none",
        cursor: "pointer",
        transition: "transform 0.15s ease, box-shadow 0.2s ease",
        "&:hover": {
          transform: "translateY(-1px)",
          boxShadow: "0 4px 14px rgba(184, 92, 60, 0.18)",
        },
        "&:focus-visible": {
          outline: `2px solid ${brand.red}`,
          outlineOffset: 2,
        },
      }}
    >
      <Box
        sx={{
          width: 28,
          height: 28,
          borderRadius: "50%",
          background: "rgba(255, 255, 255, 0.85)",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <RedeemRoundedIcon sx={{ fontSize: 16, color: brand.red }} />
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          sx={{
            fontFamily: fonts.body,
            fontSize: 9,
            fontWeight: 800,
            color: brand.accent,
            letterSpacing: "0.10em",
            textTransform: "uppercase",
            lineHeight: 1,
          }}
        >
          Referral active
        </Typography>
        <Typography
          sx={{
            fontFamily: fonts.heading,
            fontStyle: "italic",
            fontSize: 12,
            fontWeight: 500,
            color: brand.text,
            letterSpacing: "-0.01em",
            lineHeight: 1.2,
            marginTop: "2px",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {code} · Mention in chat to claim 500฿ off
        </Typography>
      </Box>
      <NorthEastRoundedIcon
        sx={{ fontSize: 14, color: brand.accent, flexShrink: 0 }}
      />
    </Box>
  );
};

export default ReferralActiveBanner;
