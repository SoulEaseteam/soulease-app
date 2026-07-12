// src/components/home/HomeFooterV2.tsx
//
// 🆕 Round 28r74 · Nordic sections build (2026-07-08)
// ─────────────────────────────────────────────────────────────────────
// SunRed website-style footer — replaces the original HomeFooter that
// was dropped in 28s20 (founder wanted an app-shell home). This round
// reverses that call: founder wants richer content back per the Nordic
// Gray mockup she approved ("มีแค่นี้ หรอ").
//
// Layout:
//   • SunRed ✦ lockup + Playfair "SUNRED" + Inter caps
//     "WELLNESS & MASSAGE"
//   • Sarabun tagline (max ~260px on desktop)
//   • Hairline divider
//   • 3-column link grid (mobile stacks to 1 column):
//       - เมนู       — internal nav
//       - ช่วยเหลือ  — help/policy links
//       - ติดต่อเรา   — LINE / phone / email (from CONCIERGE config)
//
// Matches mockup phone-2 "footer" block
// (outputs/sunred-nordic-gray-mockup.html:567-631).
//
// Concierge phone/LINE URL sourced from src/config/concierge.ts so a
// number change never needs to touch this file.
// ─────────────────────────────────────────────────────────────────────

import React from "react";
import { Box } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { fonts } from "@/theme";
import { CONCIERGE } from "@/config/concierge";

type FooterLink = {
  label: string;
  onClick?: () => void;
  href?: string;
};

const HomeFooterV2: React.FC = () => {
  const navigate = useNavigate();

  const menuLinks: FooterLink[] = [
    { label: "หน้าแรก", onClick: () => navigate("/") },
    { label: "บริการ", onClick: () => navigate("/services") },
    { label: "หมอนวด", onClick: () => navigate("/") }, // grid is on home
    { label: "สถานที่", onClick: () => navigate("/services?tab=how") },
    { label: "ราคา", onClick: () => navigate("/pricing") },
  ];

  const helpLinks: FooterLink[] = [
    { label: "วิธีการจอง", onClick: () => navigate("/services?tab=how") },
    { label: "การชำระเงิน", onClick: () => navigate("/services?tab=how") },
    { label: "คำถามที่พบบ่อย", onClick: () => navigate("/services?tab=how") },
    {
      label: "ติดต่อเรา",
      href: CONCIERGE.whatsappUrl,
    },
  ];

  const contactLinks: FooterLink[] = [
    {
      label: "LINE Official",
      href: CONCIERGE.lineUrl,
    },
    {
      label: `โทร: ${CONCIERGE.displayPhone}`,
      href: `tel:+${CONCIERGE.whatsappPhone}`,
    },
    {
      label: `Telegram: ${CONCIERGE.telegramChannel}`,
      href: `https://t.me/${CONCIERGE.telegramChannel.replace(/^@/, "")}`,
    },
  ];

  const columns: { title: string; links: FooterLink[] }[] = [
    { title: "เมนู", links: menuLinks },
    { title: "ช่วยเหลือ", links: helpLinks },
    { title: "ติดต่อเรา", links: contactLinks },
  ];

  return (
    <Box
      component="footer"
      aria-label="SunRed footer"
      sx={{
        marginTop: { xs: "36px", md: "48px" },
        marginX: { xs: "12px", md: "12px" },
        padding: { xs: "28px 20px 32px", md: "36px 32px 40px" },
        background: "var(--sr-panel-deep)", // PANEL_DEEP — deepest ground, just above ESPRESSO bg
        borderRadius: "20px",
        borderTop: "1px solid var(--sr-hairline)", // GOLD hairline — embroidery
      }}
    >
      {/* Brand lockup */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          marginBottom: "14px",
        }}
      >
        <Box
          aria-hidden
          sx={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            background: "var(--sr-panel-2)", // WALNUT — inner chip
            border: "1px solid var(--sr-hairline)", // GOLD hairline
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--sr-gold-text)", // GOLD — logo star
            fontSize: 15,
            lineHeight: 1,
          }}
        >
          ✦
        </Box>
        <Box>
          <Box
            sx={{
              fontFamily: fonts.heading,
              fontSize: 17,
              fontWeight: 500,
              color: "var(--sr-ink)", // IVORY — brand heading
              letterSpacing: "0.02em",
              lineHeight: 1,
            }}
          >
            SUNRED
          </Box>
          <Box
            sx={{
              fontFamily: fonts.body,
              fontSize: 8.5,
              fontWeight: 600,
              letterSpacing: "0.28em",
              textTransform: "uppercase",
              color: "var(--sr-muted)", // CHAMPAGNE — muted eyebrow
              marginTop: "2px",
            }}
          >
            Wellness &amp; Massage
          </Box>
        </Box>
      </Box>

      {/* Tagline */}
      <Box
        sx={{
          fontFamily: fonts.body,
          fontSize: 12,
          color: "var(--sr-muted)", // CHAMPAGNE — muted tagline
          lineHeight: 1.6,
          marginBottom: "22px",
          maxWidth: 320,
        }}
      >
        เราดูแลคุณเหมือนคนสำคัญ ในทุกช่วงเวลาของชีวิต
      </Box>

      {/* 3-column link grid */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr 1fr", sm: "repeat(3, 1fr)" },
          gap: { xs: "18px 16px", md: "20px" },
          paddingTop: "20px",
          borderTop: "1px solid var(--sr-line)", // subtle divider on dark
        }}
      >
        {columns.map((col) => (
          <Box key={col.title}>
            <Box
              sx={{
                fontFamily: fonts.body,
                fontSize: 11.5,
                fontWeight: 600,
                color: "var(--sr-ink)", // IVORY — column heading
                marginBottom: "10px",
              }}
            >
              {col.title}
            </Box>
            <Box
              component="ul"
              sx={{
                listStyle: "none",
                padding: 0,
                margin: 0,
                display: "flex",
                flexDirection: "column",
                gap: "6px",
              }}
            >
              {col.links.map((link) => (
                <Box
                  component="li"
                  key={link.label}
                  sx={{
                    fontFamily: fonts.body,
                    fontSize: 11,
                    fontWeight: 400,
                    color: "var(--sr-body)", // CREAM — links
                    lineHeight: 1.5,
                  }}
                >
                  {link.href ? (
                    <Box
                      component="a"
                      href={link.href}
                      target={
                        link.href.startsWith("http") ? "_blank" : undefined
                      }
                      rel={
                        link.href.startsWith("http")
                          ? "noopener noreferrer"
                          : undefined
                      }
                      sx={{
                        color: "inherit",
                        textDecoration: "none",
                        transition: "color 0.16s ease",
                        "&:hover": { color: "#D97C95" }, // ROSE — link hover
                        "&:focus-visible": {
                          outline: "2px solid #D97C95", // ROSE focus ring
                          outlineOffset: 2,
                          borderRadius: "3px",
                        },
                      }}
                    >
                      {link.label}
                    </Box>
                  ) : (
                    <Box
                      component="button"
                      type="button"
                      onClick={link.onClick}
                      sx={{
                        all: "unset",
                        cursor: "pointer",
                        color: "inherit",
                        transition: "color 0.16s ease",
                        "&:hover": { color: "#D97C95" }, // ROSE — link hover
                        "&:focus-visible": {
                          outline: "2px solid #D97C95", // ROSE focus ring
                          outlineOffset: 2,
                          borderRadius: "3px",
                        },
                      }}
                    >
                      {link.label}
                    </Box>
                  )}
                </Box>
              ))}
            </Box>
          </Box>
        ))}
      </Box>

      {/* © line */}
      <Box
        sx={{
          marginTop: "22px",
          paddingTop: "16px",
          borderTop: "1px solid var(--sr-line)", // subtle divider on dark
          fontFamily: fonts.body,
          fontSize: 10.5,
          color: "var(--sr-dim)", // DIM — legal caption
          textAlign: "center",
          letterSpacing: "0.02em",
        }}
      >
        © {new Date().getFullYear()} SunRed Wellness &amp; Massage · Bangkok
      </Box>
    </Box>
  );
};

export default HomeFooterV2;
