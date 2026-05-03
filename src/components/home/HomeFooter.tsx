// src/components/home/HomeFooter.tsx
//
// 🎨 Round 28k (founder 2026-05-02) — full redesign to match the rest
// of the Home page rhythm.
//
// What changed vs. Round 25:
//   • Wordmark switched to shared `<SunRedWordmark>` (same as TopNav).
//     Gradient italic SunRed text was inconsistent with everything
//     else in the site after Rounds 28d–e.
//   • Social row uses real LINE + WhatsApp links (founder's actual
//     contact handles, also used by AdminFloatingChat / ServicesPage).
//   • Links route to real pages (`/services?tab=how`, `/payment-methods`,
//     opens DistanceDepositDialog in TopNav, etc.) instead of `href="#"`.
//   • Languages column removed — TopNav owns the language UX now
//     (Round 28j). Saved column real estate goes to a "Why SunRed"
//     trust strip + cleaner two-column layout.
//   • Typography uses theme tokens (`brand`, `fonts`) — no more hard-
//     coded hex values drifting from the rest of the app.
//   • Eyebrow uppercase tracking matches HomeTherapistGrid header so
//     the editorial rhythm is identical top → bottom.

import React from "react";
import { Box, Typography, Stack } from "@mui/material";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import EmailRoundedIcon from "@mui/icons-material/EmailRounded";
import ChatRoundedIcon from "@mui/icons-material/ChatRounded";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import RoomRoundedIcon from "@mui/icons-material/RoomRounded";

import SunRedWordmark from "@/components/common/SunRedWordmark";
import { brand, fonts } from "@/theme";

/** Real contact handles — same ones the floating chat + ServicesPage use. */
const CONTACT = {
  email: "mailto:hello@sunred.vip",
  line: "https://lin.ee/uqvdwWt",
  whatsapp: "https://wa.me/66634350987",
} as const;

interface SocialIcon {
  Icon: typeof EmailRoundedIcon;
  href: string;
  label: string;
}

// 🆕 Round 28m (founder 2026-05-02) — Phone (tel:) entry removed.
// "Phone เปลี่ยน ไปลิง WhatsApp" — voice calls aren't part of our
// concierge UX; chat-first is the brand promise. WhatsApp covers
// real-time text + voice if a guest needs it.
const SOCIALS: SocialIcon[] = [
  { Icon: EmailRoundedIcon, href: CONTACT.email, label: "Email" },
  { Icon: ChatRoundedIcon, href: CONTACT.line, label: "LINE" },
  { Icon: WhatsAppIcon, href: CONTACT.whatsapp, label: "WhatsApp" },
];

interface FooterLink {
  labelKey: string;
  defaultLabel: string;
  /** Internal route — passed to navigate(); takes precedence over `href`. */
  to?: string;
  /** External href — opened in a new tab. */
  href?: string;
}

interface FooterCol {
  titleKey: string;
  titleFallback: string;
  links: FooterLink[];
}

const COLS: FooterCol[] = [
  {
    titleKey: "footer.col.explore",
    titleFallback: "Explore",
    links: [
      {
        labelKey: "footer.therapists",
        defaultLabel: "Browse therapists",
        to: "/#therapist-grid",
      },
      { labelKey: "footer.services", defaultLabel: "Our services", to: "/services" },
      {
        labelKey: "footer.howToBook",
        defaultLabel: "How to book",
        to: "/services?tab=how",
      },
    ],
  },
  {
    titleKey: "footer.col.support",
    titleFallback: "Support",
    links: [
      { labelKey: "footer.payment", defaultLabel: "Payment", to: "/payment-methods" },
      {
        labelKey: "footer.contact",
        defaultLabel: "Concierge (LINE)",
        href: CONTACT.line,
      },
      {
        labelKey: "footer.help",
        defaultLabel: "WhatsApp",
        href: CONTACT.whatsapp,
      },
    ],
  },
];

interface TrustBadge {
  Icon: typeof RoomRoundedIcon;
  labelKey: string;
  defaultLabel: string;
}

// 🆕 Round 28m (founder 2026-05-02) — "Thai Ministry of Public Health
// licensed (ผ.พ.)" badge removed. SunRed is a neutral marketplace
// platform, not a licensing body — keeping the ผ.พ. claim implied a
// direct guarantee that doesn't fit the platform-not-employer legal
// posture spelled out in the disclaimer below.
const TRUST_BADGES: TrustBadge[] = [
  {
    Icon: RoomRoundedIcon,
    labelKey: "footer.trust.coverage",
    defaultLabel: "Sukhumvit · Silom · Asok · Thonglor & all major areas",
  },
];

const HomeFooter: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const year = new Date().getFullYear();

  const handleLinkClick = (link: FooterLink) => {
    if (link.to) {
      void navigate(link.to);
    } else if (link.href) {
      window.open(link.href, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <Box
      component="footer"
      sx={{
        position: "relative",
        margin: "24px 14px 16px",
        padding: "22px 18px 20px",
        borderRadius: "20px",
        background:
          "linear-gradient(180deg, rgba(255, 248, 240, 0.85) 0%, rgba(252, 235, 220, 0.95) 100%)",
        border: "1px solid rgba(255, 255, 255, 0.7)",
        boxShadow:
          "0 8px 24px rgba(126, 30, 46, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.7)",
        overflow: "hidden",
      }}
    >
      {/* Subtle warm blob accent — matches HeroSection rhythm */}
      <Box
        aria-hidden
        sx={{
          position: "absolute",
          bottom: -80,
          right: -60,
          width: 220,
          height: 220,
          borderRadius: "50%",
          background: brand.cream,
          opacity: 0.3,
          filter: "blur(60px)",
          pointerEvents: "none",
        }}
      />

      {/* ── Brand + tagline + socials ── */}
      <Box sx={{ position: "relative", zIndex: 1, marginBottom: "18px" }}>
        <SunRedWordmark size={22} />
        <Typography
          sx={{
            fontFamily: fonts.body,
            fontSize: 11,
            color: brand.textMuted,
            fontWeight: 500,
            letterSpacing: "-0.01em",
            marginTop: "3px",
            marginBottom: "12px",
          }}
        >
          {t("hero.tagline2", "Restore. Delivered to you.")}
        </Typography>

        {/* Socials — real contact handles, open in new tab */}
        <Stack direction="row" spacing={1}>
          {SOCIALS.map(({ Icon, href, label }) => (
            <Box
              key={label}
              component="a"
              href={href}
              target={href.startsWith("http") ? "_blank" : undefined}
              rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
              aria-label={label}
              sx={{
                width: 34,
                height: 34,
                borderRadius: "50%",
                background: "rgba(254, 9, 68, 0.08)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: brand.red,
                textDecoration: "none",
                cursor: "pointer",
                transition: "background 0.2s ease, transform 0.2s ease",
                "&:hover": {
                  background: "rgba(254, 9, 68, 0.16)",
                  transform: "translateY(-1px)",
                },
                "&:focus-visible": {
                  outline: `2px solid ${brand.red}`,
                  outlineOffset: 2,
                },
              }}
            >
              <Icon sx={{ fontSize: 16 }} />
            </Box>
          ))}
        </Stack>
      </Box>

      {/* ── Link columns ── */}
      <Box
        sx={{
          position: "relative",
          zIndex: 1,
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "16px",
          marginBottom: "18px",
        }}
      >
        {COLS.map((col) => (
          <Box key={col.titleKey}>
            <Typography
              component="h4"
              sx={{
                fontFamily: fonts.body,
                fontSize: "9.5px",
                textTransform: "uppercase",
                letterSpacing: "0.18em",
                color: brand.accent,
                fontWeight: 700,
                marginBottom: "10px",
                margin: 0,
                marginBlockEnd: "10px",
              }}
            >
              {t(col.titleKey, col.titleFallback)}
            </Typography>
            <Stack spacing={0.75} sx={{ marginTop: "10px" }}>
              {col.links.map((link) => (
                <Box
                  key={link.labelKey}
                  component="button"
                  type="button"
                  onClick={() => handleLinkClick(link)}
                  sx={{
                    background: "transparent",
                    border: "none",
                    padding: 0,
                    textAlign: "left",
                    fontFamily: fonts.body,
                    fontSize: "12.5px",
                    color: brand.textMuted,
                    cursor: "pointer",
                    transition: "color 0.2s ease",
                    "&:hover": { color: brand.red },
                    "&:focus-visible": {
                      outline: `2px solid ${brand.red}`,
                      outlineOffset: 2,
                      borderRadius: 2,
                    },
                  }}
                >
                  {t(link.labelKey, link.defaultLabel)}
                </Box>
              ))}
            </Stack>
          </Box>
        ))}
      </Box>

      {/* ── Trust strip ── */}
      <Box
        sx={{
          position: "relative",
          zIndex: 1,
          padding: "12px 14px",
          marginBottom: "14px",
          borderRadius: "12px",
          background: "rgba(255, 255, 255, 0.55)",
          border: "1px solid rgba(255, 255, 255, 0.7)",
        }}
      >
        <Stack spacing={0.75}>
          {TRUST_BADGES.map(({ Icon, labelKey, defaultLabel }) => (
            <Stack
              key={labelKey}
              direction="row"
              alignItems="flex-start"
              spacing={1}
            >
              <Icon
                sx={{
                  fontSize: 14,
                  color: brand.green,
                  marginTop: "1px",
                  flexShrink: 0,
                }}
              />
              <Typography
                sx={{
                  fontFamily: fonts.body,
                  fontSize: "11px",
                  color: brand.text,
                  fontWeight: 500,
                  lineHeight: 1.4,
                }}
              >
                {t(labelKey, defaultLabel)}
              </Typography>
            </Stack>
          ))}
        </Stack>
      </Box>

      {/* ── Legal Disclaimer (Round 28m) ──
          Required language clarifying SunRed's role as a neutral
          marketplace, not an employer of providers. Replaces the
          earlier ผ.พ. licensing claim. Both Thai and English copy
          live in the locale JSONs (footer.legal.disclaimer.*) — the
          fallback below is the English founder-approved version. */}
      <Box
        sx={{
          position: "relative",
          zIndex: 1,
          padding: "11px 13px",
          marginBottom: "14px",
          borderRadius: "10px",
          background: "rgba(184, 92, 60, 0.05)",
          borderLeft: `3px solid ${brand.red}`,
        }}
      >
        <Typography
          component="div"
          sx={{
            fontFamily: fonts.body,
            fontSize: "10px",
            fontWeight: 700,
            color: brand.text,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            marginBottom: "4px",
          }}
        >
          {t("footer.legal.disclaimer.title", "Legal Disclaimer")}
        </Typography>
        <Typography
          component="p"
          sx={{
            fontFamily: fonts.body,
            fontSize: "10.5px",
            color: brand.textMuted,
            lineHeight: 1.55,
            margin: 0,
          }}
        >
          {t(
            "footer.legal.disclaimer.body",
            "SunRed is a neutral technology platform that connects customers with verified independent wellness providers. We do not employ providers directly. All services follow local regulations and must remain within safe, lawful, non-medical wellness categories."
          )}
        </Typography>
      </Box>

      {/* ── Copyright + Terms/Privacy ── */}
      <Box
        sx={{
          position: "relative",
          zIndex: 1,
          fontFamily: fonts.body,
          fontSize: "10.5px",
          color: brand.textMuted,
          lineHeight: 1.55,
          paddingTop: "12px",
          borderTop: "1px solid rgba(184, 92, 60, 0.18)",
        }}
      >
        <Typography
          component="div"
          sx={{
            fontFamily: fonts.body,
            fontSize: "10.5px",
            fontWeight: 700,
            color: brand.text,
            marginBottom: "3px",
          }}
        >
          © {year} {t("footer.legal.org", "SunRed Wellness Co., Ltd.")}
        </Typography>
        <Typography
          component="div"
          sx={{
            fontFamily: fonts.body,
            fontSize: "10.5px",
            color: brand.textMuted,
            lineHeight: 1.55,
          }}
        >
          {t(
            "footer.legal.location",
            "Bangkok, Thailand · Licensed wellness service."
          )}
        </Typography>

        {/* Terms / Privacy / Cookies */}
        <Stack direction="row" spacing={1.5} sx={{ marginTop: "8px" }}>
          {[
            { key: "footer.terms", fallback: "Terms", to: "/terms" },
            { key: "footer.privacy", fallback: "Privacy", to: "/privacy" },
            { key: "footer.cookies", fallback: "Cookies", to: "/cookies" },
          ].map((l) => (
            <Box
              key={l.key}
              component="button"
              type="button"
              onClick={() => void navigate(l.to)}
              sx={{
                background: "transparent",
                border: "none",
                padding: 0,
                color: brand.accent,
                fontFamily: fonts.body,
                fontSize: "10.5px",
                fontWeight: 600,
                cursor: "pointer",
                transition: "color 0.2s ease",
                "&:hover": { color: brand.red },
                "&:focus-visible": {
                  outline: `2px solid ${brand.red}`,
                  outlineOffset: 2,
                  borderRadius: 2,
                },
              }}
            >
              {t(l.key, l.fallback)}
            </Box>
          ))}
        </Stack>
      </Box>
    </Box>
  );
};

export default HomeFooter;
