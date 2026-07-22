// src/components/common/ConciergeChannels.tsx
//
// 🆕 Round 28x.124 (founder, pointing at the guide page's lone "ติดต่อแอดมิน"
//   button and the activation screen's channel row: "อันนี้ให้เปลี่ยนเป็นรูป2")
//   — the three-channel contact capsule, extracted so it has exactly one
//   definition.
//
//   It was built inline in StaffLayout's ActivationGate over 28x.97 (grouped
//   capsule instead of loose pills) and 28x.99 (Telegram added as a third
//   option). The guide page then needed the same thing; copying ~70 lines of
//   JSX for a second copy is precisely how the two would drift the next time a
//   handle changes — the same reasoning src/config/concierge.ts already exists
//   for. Only the prefilled WhatsApp message differs per caller, so that's the
//   one prop.
//
//   Channel URLs come from CONCIERGE / whatsappDeepLink, never hardcoded here.

import React from "react";
import { Box, Typography } from "@mui/material";
import { CONCIERGE, whatsappDeepLink } from "@/config/concierge";

const SANS = '"Inter", system-ui, sans-serif';

interface ChannelDef {
  key: string;
  label: string;
  icon: string;
  href: string;
  aria: string;
}

const ConciergeChannels: React.FC<{
  /** Prefilled WhatsApp text — the one thing that differs per surface. */
  message: string;
  /** Cap the capsule width (the activation screen centres it at 300px). */
  maxWidth?: number;
}> = ({ message, maxWidth = 320 }) => {
  const channels: ChannelDef[] = [
    {
      key: "whatsapp",
      label: "WhatsApp",
      icon: "/images/profli/whatsapp.png",
      href: whatsappDeepLink(message),
      aria: "ทัก WhatsApp แอดมิน",
    },
    {
      key: "telegram",
      label: "Telegram",
      icon: "/images/profli/telegram.png",
      // @SunRed24hBot — the same bot she links her account through, so this is
      // a channel she is already inside rather than a new one to add.
      href: "https://t.me/SunRed24hBot",
      aria: "ทัก Telegram แอดมิน",
    },
    {
      key: "line",
      label: "LINE",
      icon: "/images/profli/line.png",
      href: CONCIERGE.lineUrl,
      aria: "ทัก LINE แอดมิน",
    },
  ];

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "stretch",
        width: "100%",
        maxWidth,
        mx: "auto",
        borderRadius: "22px",
        background: "var(--sr-panel)",
        border: "1px solid var(--sr-hairline)",
        boxShadow: "0 10px 28px rgba(138, 58, 87, 0.12)",
        overflow: "hidden",
      }}
    >
      {channels.map((c, i) => (
        <React.Fragment key={c.key}>
          {i > 0 && <Box sx={{ width: "1px", my: 1.75, background: "var(--sr-hairline)" }} />}
          <Box
            component="a"
            href={c.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={c.aria}
            sx={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 0.7,
              py: 2,
              textDecoration: "none",
              transition: "background 0.15s ease",
              "&:active": { background: "var(--sr-panel-2)" },
            }}
          >
            <Box
              component="img"
              src={c.icon}
              alt=""
              width={28}
              height={28}
              sx={{ width: 28, height: 28, objectFit: "contain" }}
            />
            <Typography sx={{ fontFamily: SANS, fontSize: 12.5, fontWeight: 700, color: "var(--sr-ink)" }}>
              {c.label}
            </Typography>
          </Box>
        </React.Fragment>
      ))}
    </Box>
  );
};

export default ConciergeChannels;
